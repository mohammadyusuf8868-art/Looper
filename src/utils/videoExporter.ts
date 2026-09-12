import { ExportSettings, LoopSettings } from '../types';
import { Muxer as Mp4Muxer, ArrayBufferTarget as Mp4ArrayBufferTarget } from 'mp4-muxer';
import { Muxer as WebmMuxer, ArrayBufferTarget as WebmArrayBufferTarget } from 'webm-muxer';
import fixWebmDuration from 'fix-webm-duration';

export function computeBlendAlpha(p: number, curve: LoopSettings['crossfadeCurve']): number {
  const clamped = Math.max(0, Math.min(1, p));
  if (curve === 'cosine') {
    // S-curve smooth cosine interpolation
    return 0.5 - 0.5 * Math.cos(Math.PI * clamped);
  } else if (curve === 'ease-in-out') {
    return clamped < 0.5
      ? 2 * clamped * clamped
      : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
  }
  return clamped; // linear
}

export interface ExportProgressCallback {
  (progress: number, statusText: string): void;
}

/**
 * Calculates optimal target dimensions preserving aspect ratio with even pixel counts.
 */
export function calculateExportDimensions(
  sourceWidth: number,
  sourceHeight: number,
  resolution: ExportSettings['resolution']
): { width: number; height: number } {
  const isVertical = sourceHeight > sourceWidth;
  let targetW = sourceWidth;
  let targetH = sourceHeight;

  if (resolution === '1080p') {
    const maxDim = 1080;
    if (isVertical) {
      targetW = maxDim;
      targetH = Math.round((sourceHeight / sourceWidth) * maxDim);
    } else {
      targetH = maxDim;
      targetW = Math.round((sourceWidth / sourceHeight) * maxDim);
    }
  } else if (resolution === '720p') {
    const maxDim = 720;
    if (isVertical) {
      targetW = maxDim;
      targetH = Math.round((sourceHeight / sourceWidth) * maxDim);
    } else {
      targetH = maxDim;
      targetW = Math.round((sourceWidth / sourceHeight) * maxDim);
    }
  } else if (resolution === '540p') {
    const maxDim = 540;
    if (isVertical) {
      targetW = maxDim;
      targetH = Math.round((sourceHeight / sourceWidth) * maxDim);
    } else {
      targetH = maxDim;
      targetW = Math.round((sourceWidth / sourceHeight) * maxDim);
    }
  }

  // Never upscale past original source if smaller
  if (resolution !== 'original') {
    if (targetW > sourceWidth || targetH > sourceHeight) {
      targetW = sourceWidth;
      targetH = sourceHeight;
    }
  }

  // Codecs (H.264 & VP9) strictly require even dimensions
  const finalW = Math.max(16, targetW - (targetW % 2));
  const finalH = Math.max(16, targetH - (targetH % 2));

  return { width: finalW, height: finalH };
}

/**
 * Computes optimal bitrate based on resolution, framerate, and quality preset.
 */
export function calculateExportBitrate(
  width: number,
  height: number,
  fps: number,
  preset: ExportSettings['bitratePreset']
): number {
  const pixelCount = width * height;
  let baseBitrate = 4_000_000;

  if (pixelCount >= 3840 * 2160) {
    baseBitrate = 22_000_000; // 4K UHD
  } else if (pixelCount >= 1920 * 1080) {
    baseBitrate = 8_000_000;  // 1080p FHD
  } else if (pixelCount >= 1280 * 720) {
    baseBitrate = 4_500_000;  // 720p HD
  } else {
    baseBitrate = 2_400_000;  // 540p / SD
  }

  // FPS scaling
  if (fps === 60) {
    baseBitrate = Math.round(baseBitrate * 1.35);
  } else if (fps === 24) {
    baseBitrate = Math.round(baseBitrate * 0.9);
  }

  // Preset scaling
  if (preset === 'high') {
    return Math.round(baseBitrate * 1.5);
  } else if (preset === 'economy') {
    return Math.round(baseBitrate * 0.65);
  }
  return baseBitrate;
}

/**
 * Seeks a video element to a target timestamp cleanly and waits for the seeked event.
 * Video must be attached to the DOM so the browser hardware pipeline updates the frame texture.
 */
function seekVideoFrame(video: HTMLVideoElement, targetTime: number): Promise<void> {
  const clampedTarget = Math.max(0, Math.min((video.duration || 9999) - 0.001, targetTime));

  // If already at target within 1 millisecond and not in the middle of a seek, resolve immediately
  if (Math.abs(video.currentTime - clampedTarget) < 0.001 && !video.seeking) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let finished = false;

    const cleanup = () => {
      if (!finished) {
        finished = true;
        if (timer) clearTimeout(timer);
        video.removeEventListener('seeked', onSeeked);
        resolve();
      }
    };

    const onSeeked = () => {
      cleanup();
    };

    // 400ms safety timeout in case decoder drops seeked event
    timer = setTimeout(cleanup, 400);
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = clampedTarget;
  });
}

/**
 * Finds a verified supported codec for WebCodecs VideoEncoder.
 */
async function findSupportedCodec(wantMp4: boolean, width: number, height: number): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null;

  const mp4Candidates = ['avc1.4d002a', 'avc1.640028', 'avc1.42001f'];
  const webmCandidates = ['vp09.00.10.08', 'vp8'];
  const candidates = wantMp4 ? mp4Candidates : webmCandidates;

  for (const c of candidates) {
    try {
      const config: VideoEncoderConfig = {
        codec: c,
        width,
        height,
        ...(wantMp4 ? { avc: { format: 'avc' } } : {}),
      };
      const support = await VideoEncoder.isConfigSupported(config);
      if (support && support.supported) {
        return c;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

/**
 * Exports seamless looped video with frame-accurate presentation timestamps.
 * Uses WebCodecs (mp4-muxer / webm-muxer) for zero-stutter frame-deterministic output,
 * with fallback to MediaRecorder + fixWebmDuration.
 */
export async function exportLoopedVideo(
  videoSourceUrl: string,
  settings: LoopSettings,
  exportSettings: ExportSettings,
  onProgress: ExportProgressCallback,
  signal?: AbortSignal
): Promise<Blob> {
  // Create off-screen video elements
  const v1 = document.createElement('video');
  const v2 = document.createElement('video');
  v1.src = videoSourceUrl;
  v2.src = videoSourceUrl;
  v1.muted = true;
  v2.muted = true;
  v1.playsInline = true;
  v2.playsInline = true;
  v1.crossOrigin = 'anonymous';
  v2.crossOrigin = 'anonymous';

  // Attach to DOM in an invisible container so hardware acceleration and seeked events operate reliably
  const offscreenContainer = document.createElement('div');
  offscreenContainer.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:16px;height:16px;opacity:0.001;pointer-events:none;overflow:hidden;z-index:-9999;';
  offscreenContainer.appendChild(v1);
  offscreenContainer.appendChild(v2);
  document.body.appendChild(offscreenContainer);

  const cleanupDom = () => {
    try {
      if (offscreenContainer.parentNode) {
        offscreenContainer.parentNode.removeChild(offscreenContainer);
      }
    } catch {}
  };

  try {
    await Promise.all([
      new Promise((res) => {
        v1.onloadedmetadata = res;
      }),
      new Promise((res) => {
        v2.onloadedmetadata = res;
      }),
    ]);

    const sourceWidth = v1.videoWidth || 1280;
    const sourceHeight = v1.videoHeight || 720;

    // Calculate resolution
    const { width: exportWidth, height: exportHeight } = calculateExportDimensions(
      sourceWidth,
      sourceHeight,
      exportSettings.resolution || (exportSettings.quality === 'medium' ? '720p' : 'original')
    );

    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Could not obtain 2D canvas context');

    const inP = Math.max(0, settings.inPoint);
    const outP = Math.max(inP + 0.5, Math.min(v1.duration || 10, settings.outPoint));
    const clipDuration = outP - inP;
    const xfade = Math.min(settings.crossfadeDuration, clipDuration * 0.45);

    let singleLoopDuration = clipDuration;
    if (settings.mode === 'crossfade') {
      singleLoopDuration = Math.max(0.5, clipDuration - xfade);
    } else if (settings.mode === 'pingpong') {
      singleLoopDuration = clipDuration * 2;
    }

    // Calculate total export duration
    let totalDuration = singleLoopDuration;
    if (exportSettings.durationMode === 'repeats') {
      totalDuration = singleLoopDuration * Math.max(1, exportSettings.repeats || 3);
    } else if (exportSettings.durationMode === 'custom_time') {
      totalDuration = Math.max(1, exportSettings.targetSeconds || 10);
    }

    // Configurable FPS
    const fps = exportSettings.fps || 30;
    const totalFrames = Math.max(1, Math.round(totalDuration * fps));
    const exactDuration = totalFrames / fps;

    // Configurable Bitrate
    const bitrate = calculateExportBitrate(
      exportWidth,
      exportHeight,
      fps,
      exportSettings.bitratePreset || (exportSettings.quality === 'medium' ? 'economy' : 'auto')
    );

    const wantMp4 = exportSettings.format === 'mp4';

    onProgress(
      0,
      `Initializing ${wantMp4 ? 'MP4 (H.264 Universal)' : 'WebM (VP9)'} ${exportWidth}x${exportHeight} @ ${fps} FPS (${(bitrate / 1_000_000).toFixed(1)} Mbps)...`
    );

    // Check WebCodecs support
    const chosenCodec = await findSupportedCodec(wantMp4, exportWidth, exportHeight);

    // METHOD 1: WEBCODECS + MUXER (Deterministic, Exact Timestamps, Zero Stutter)
    if (chosenCodec) {
      let mp4Muxer: Mp4Muxer<Mp4ArrayBufferTarget> | null = null;
      let webmMuxer: WebmMuxer<WebmArrayBufferTarget> | null = null;

      if (wantMp4) {
        mp4Muxer = new Mp4Muxer({
          target: new Mp4ArrayBufferTarget(),
          video: {
            codec: 'avc',
            width: exportWidth,
            height: exportHeight,
            frameRate: fps,
          },
          fastStart: 'in-memory',
          firstTimestampBehavior: 'offset',
        });
      } else {
        webmMuxer = new WebmMuxer({
          target: new WebmArrayBufferTarget(),
          video: {
            codec: chosenCodec.startsWith('vp09') ? 'V_VP9' : 'V_VP8',
            width: exportWidth,
            height: exportHeight,
            frameRate: fps,
          },
          firstTimestampBehavior: 'offset',
        });
      }

      let encoderError: Error | null = null;
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          if (mp4Muxer) {
            mp4Muxer.addVideoChunk(chunk, meta);
          } else if (webmMuxer) {
            webmMuxer.addVideoChunk(chunk, meta);
          }
        },
        error: (e) => {
          encoderError = e;
        },
      });

      videoEncoder.configure({
        codec: chosenCodec,
        width: exportWidth,
        height: exportHeight,
        bitrate,
        framerate: fps,
        ...(wantMp4 ? { avc: { format: 'avc' } } : {}),
      });

      try {
        for (let f = 0; f < totalFrames; f++) {
          if (signal?.aborted) {
            throw new Error('Export cancelled');
          }
          if (encoderError) {
            throw encoderError;
          }

          const currentTime = f / fps;
          const progress = Math.round((f / totalFrames) * 96);

          if (f % 6 === 0 || f === totalFrames - 1) {
            onProgress(
              progress,
              `Rendering frame ${f + 1} of ${totalFrames} (${Math.round(((f + 1) / totalFrames) * 100)}%)...`
            );
          }

          // Draw composite seamless frame
          await renderCompositeFrame(
            ctx,
            canvas,
            v1,
            v2,
            currentTime,
            singleLoopDuration,
            clipDuration,
            inP,
            outP,
            xfade,
            settings
          );

          // Feed frame with exact microsecond presentation timestamp
          const timestampUs = Math.round((f / fps) * 1_000_000);
          const durationUs = Math.round((1 / fps) * 1_000_000);

          const videoFrame = new VideoFrame(canvas, {
            timestamp: timestampUs,
            duration: durationUs,
          });

          // Keyframe every 1 second (fps frames) for instant player scrubbing without stutter
          const isKeyFrame = f % fps === 0;
          videoEncoder.encode(videoFrame, { keyFrame: isKeyFrame });
          videoFrame.close();

          // Control encoder backpressure: wait until queue has space
          while (videoEncoder.encodeQueueSize > 5) {
            await new Promise((r) => setTimeout(r, 6));
          }
        }

        onProgress(97, 'Finalizing video container & indexing tracks...');
        await videoEncoder.flush();
        videoEncoder.close();

        if (mp4Muxer) {
          mp4Muxer.finalize();
          const buffer = mp4Muxer.target.buffer;
          onProgress(100, `Seamless MP4 export complete (${exactDuration.toFixed(1)}s @ ${fps} FPS)!`);
          return new Blob([buffer], { type: 'video/mp4' });
        } else if (webmMuxer) {
          webmMuxer.finalize();
          const buffer = webmMuxer.target.buffer;
          onProgress(100, `Seamless WebM export complete (${exactDuration.toFixed(1)}s @ ${fps} FPS)!`);
          return new Blob([buffer], { type: 'video/webm' });
        }
      } catch (err) {
        try {
          videoEncoder.close();
        } catch {}
        throw err;
      }
    }

    // METHOD 2: FALLBACK VIA MEDIARECORDER + DURATION INJECTION
    return renderWithMediaRecorder(
      canvas,
      ctx,
      v1,
      v2,
      totalFrames,
      fps,
      totalDuration,
      singleLoopDuration,
      clipDuration,
      inP,
      outP,
      xfade,
      settings,
      bitrate,
      onProgress,
      signal
    );
  } finally {
    cleanupDom();
  }
}

/**
 * Draws the mathematically seamless blended frame to the canvas for the given time.
 * Seamless Crossfade Math:
 * - Single loop cycle duration is L - X (clipDuration - crossfadeDuration).
 * - From cycleTime 0 to (L - 2X): Stream 1 plays cleanly forward from inPoint + X to outPoint - X.
 * - From cycleTime (L - 2X) to (L - X): Stream 1 finishes to outPoint while Stream 2 dissolves in from inPoint to inPoint + X.
 * - When wrapped to cycleTime 0: Stream 1 is at inPoint + X, exactly continuing where Stream 2 dissolved in!
 * - Result: 100% zero-discontinuity, completely seamless perpetual loop in any player!
 */
async function renderCompositeFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  v1: HTMLVideoElement,
  v2: HTMLVideoElement,
  currentTime: number,
  loopDuration: number,
  clipDuration: number,
  inP: number,
  outP: number,
  xfade: number,
  settings: LoopSettings
): Promise<void> {
  const exportWidth = canvas.width;
  const exportHeight = canvas.height;

  if (settings.mode === 'crossfade') {
    const cycleTime = currentTime % loopDuration;
    const fadeTrigger = loopDuration - xfade;

    if (cycleTime < fadeTrigger) {
      // Clean non-fading section: only stream 1 needs decoding
      const time1 = inP + xfade + cycleTime;
      await seekVideoFrame(v1, time1);
      ctx.globalAlpha = 1.0;
      ctx.drawImage(v1, 0, 0, exportWidth, exportHeight);
    } else {
      // Crossfade transition section: stream 1 completes to outP while stream 2 emerges from inP
      const fadeProgress = Math.max(0, Math.min(1, (cycleTime - fadeTrigger) / Math.max(0.001, xfade)));
      const alpha2 = computeBlendAlpha(fadeProgress, settings.crossfadeCurve);

      // Tail of video reaching outPoint
      const time1 = inP + xfade + cycleTime;
      // Head of video emerging from inPoint
      const time2 = inP + (cycleTime - fadeTrigger);

      await Promise.all([seekVideoFrame(v1, time1), seekVideoFrame(v2, time2)]);

      // Draw base stream 1
      ctx.globalAlpha = 1.0;
      ctx.drawImage(v1, 0, 0, exportWidth, exportHeight);

      // Blend incoming stream 2 smoothly on top
      ctx.globalAlpha = alpha2;
      ctx.drawImage(v2, 0, 0, exportWidth, exportHeight);
      ctx.globalAlpha = 1.0;
    }
  } else if (settings.mode === 'pingpong') {
    const cycleTime = currentTime % loopDuration;
    if (cycleTime < clipDuration) {
      const time = inP + cycleTime;
      await seekVideoFrame(v1, time);
    } else {
      const time = outP - (cycleTime - clipDuration);
      await seekVideoFrame(v1, time);
    }
    ctx.globalAlpha = 1.0;
    ctx.drawImage(v1, 0, 0, exportWidth, exportHeight);
  } else {
    // Standard direct loop
    const cycleTime = currentTime % loopDuration;
    const time = inP + cycleTime;
    await seekVideoFrame(v1, time);
    ctx.globalAlpha = 1.0;
    ctx.drawImage(v1, 0, 0, exportWidth, exportHeight);
  }
}

/**
 * Fallback MediaRecorder renderer with fixed canvas stream and EBML duration injection.
 */
async function renderWithMediaRecorder(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  v1: HTMLVideoElement,
  v2: HTMLVideoElement,
  totalFrames: number,
  fps: number,
  totalDuration: number,
  loopDuration: number,
  clipDuration: number,
  inP: number,
  outP: number,
  xfade: number,
  settings: LoopSettings,
  bitrate: number,
  onProgress: ExportProgressCallback,
  signal?: AbortSignal
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = canvas.captureStream(fps);

      const mimeCandidates = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ];
      let selectedMime = '';
      for (const m of mimeCandidates) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime || undefined,
        videoBitsPerSecond: bitrate,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          const rawBlob = new Blob(chunks, { type: selectedMime || 'video/webm' });
          onProgress(98, 'Injecting duration metadata header...');

          const durationMs = Math.round(totalDuration * 1000);
          const fixedBlob = await fixWebmDuration(rawBlob, durationMs);
          onProgress(100, `Seamless WebM export complete (${totalDuration.toFixed(1)}s @ ${fps} FPS)!`);
          resolve(fixedBlob);
        } catch {
          resolve(new Blob(chunks, { type: selectedMime || 'video/webm' }));
        }
      };

      recorder.start();

      for (let f = 0; f < totalFrames; f++) {
        if (signal?.aborted) {
          recorder.stop();
          reject(new Error('Export cancelled'));
          return;
        }

        const currentTime = f / fps;
        const progress = Math.round((f / totalFrames) * 95);

        if (f % 5 === 0 || f === totalFrames - 1) {
          onProgress(progress, `Rendering frame ${f + 1} of ${totalFrames} (${progress}%)...`);
        }

        await renderCompositeFrame(ctx, canvas, v1, v2, currentTime, loopDuration, clipDuration, inP, outP, xfade, settings);

        // Frame interval pacing
        await new Promise((r) => setTimeout(r, Math.round(1000 / fps)));
      }

      onProgress(97, 'Finalizing video stream...');
      recorder.stop();
    } catch (err) {
      reject(err);
    }
  });
}
