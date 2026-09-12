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
  (progress: number, statusText: string, currentFrame?: number, totalFrames?: number): void;
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
    baseBitrate = 20_000_000; // 4K UHD
  } else if (pixelCount >= 1920 * 1080) {
    baseBitrate = 8_000_000;  // 1080p FHD
  } else if (pixelCount >= 1280 * 720) {
    baseBitrate = 4_000_000;  // 720p HD
  } else {
    baseBitrate = 2_200_000;  // 540p / SD
  }

  // FPS scaling
  if (fps === 60) {
    baseBitrate = Math.round(baseBitrate * 1.35);
  } else if (fps === 24) {
    baseBitrate = Math.round(baseBitrate * 0.9);
  }

  // Preset scaling
  if (preset === 'high') {
    return Math.round(baseBitrate * 1.4);
  } else if (preset === 'economy') {
    return Math.round(baseBitrate * 0.65);
  }
  return baseBitrate;
}

/**
 * Ensures video element has decoded frame data ready before drawing.
 */
function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 3) return Promise.resolve();

  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      if (!done) {
        done = true;
        video.removeEventListener('canplay', cleanup);
        video.removeEventListener('loadeddata', cleanup);
        resolve();
      }
    };

    video.addEventListener('canplay', cleanup, { once: true });
    video.addEventListener('loadeddata', cleanup, { once: true });
    // Fallback in case of quick load
    setTimeout(cleanup, 1200);
  });
}

/**
 * Seeks a video element to a target timestamp cleanly and ensures frame texture is ready.
 * Uses requestVideoFrameCallback or double requestAnimationFrame to ensure non-blank pixels.
 */
function seekVideoFrame(video: HTMLVideoElement, targetTime: number): Promise<void> {
  const clampedTarget = Math.max(0, Math.min((video.duration || 9999) - 0.001, targetTime));

  // If already at target within 1ms and not currently seeking, return immediately
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
        // Double RAF gives GPU compositor time to commit the video texture to the element
        requestAnimationFrame(() => {
          resolve();
        });
      }
    };

    const onSeeked = () => {
      if ('requestVideoFrameCallback' in video) {
        try {
          (video as any).requestVideoFrameCallback(() => {
            cleanup();
          });
          return;
        } catch {
          // Fall through
        }
      }
      cleanup();
    };

    // 450ms safety timeout in case decoder delays seeked event
    timer = setTimeout(cleanup, 450);
    video.addEventListener('seeked', onSeeked, { once: true });
    video.currentTime = clampedTarget;
  });
}

/**
 * Finds a verified supported codec for WebCodecs VideoEncoder across maximum devices.
 * Tests universal Baseline profiles first for maximum Android/iOS/low-spec compatibility.
 */
async function findSupportedCodec(wantMp4: boolean, width: number, height: number): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null;

  // Candidates ordered from universal baseline compatibility to high profile
  const mp4Candidates = [
    'avc1.42001e', // Baseline Profile Level 3.0 (universal mobile support)
    'avc1.42001f', // Baseline Profile Level 3.1
    'avc1.4d001f', // Main Profile Level 3.1
    'avc1.4d002a', // Main Profile Level 4.2
    'avc1.640028', // High Profile Level 4.0
  ];
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
 * Uses WebCodecs for zero-stutter frame-deterministic output,
 * with graceful fallback to MediaRecorder + duration fixing.
 */
export async function exportLoopedVideo(
  videoSourceUrl: string,
  settings: LoopSettings,
  exportSettings: ExportSettings,
  onProgress: ExportProgressCallback,
  signal?: AbortSignal,
  livePreviewCanvas?: HTMLCanvasElement | null
): Promise<Blob> {
  // Create video elements for frame extraction
  const v1 = document.createElement('video');
  const v2 = document.createElement('video');
  v1.muted = true;
  v2.muted = true;
  v1.playsInline = true;
  v2.playsInline = true;
  v1.preload = 'auto';
  v2.preload = 'auto';

  // Only set crossOrigin on remote HTTP(S) URLs, NEVER on blob: or data: URLs to prevent security tainting
  const isBlobOrData = videoSourceUrl.startsWith('blob:') || videoSourceUrl.startsWith('data:');
  if (!isBlobOrData) {
    v1.crossOrigin = 'anonymous';
    v2.crossOrigin = 'anonymous';
  }

  v1.src = videoSourceUrl;
  v2.src = videoSourceUrl;

  // Attach to DOM in an active but unobtrusive position so browser hardware decoders NEVER sleep or drop frames
  const container = document.createElement('div');
  container.style.cssText =
    'position:fixed;bottom:2px;right:2px;width:8px;height:8px;opacity:0.02;pointer-events:none;overflow:hidden;z-index:99999;';
  container.appendChild(v1);
  container.appendChild(v2);
  document.body.appendChild(container);

  const cleanupDom = () => {
    try {
      v1.pause();
      v2.pause();
      v1.removeAttribute('src');
      v2.removeAttribute('src');
      v1.load();
      v2.load();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    } catch {}
  };

  try {
    // Wait for video metadata
    await Promise.all([
      new Promise((res) => {
        if (v1.readyState >= 1) return res(undefined);
        v1.onloadedmetadata = res;
      }),
      new Promise((res) => {
        if (v2.readyState >= 1) return res(undefined);
        v2.onloadedmetadata = res;
      }),
    ]);

    // Warm up decoders to ensure frame buffers are active
    await Promise.all([waitForVideoReady(v1), waitForVideoReady(v2)]);

    const sourceWidth = v1.videoWidth || 1280;
    const sourceHeight = v1.videoHeight || 720;

    // Calculate resolution with strictly even dimensions
    const { width: exportWidth, height: exportHeight } = calculateExportDimensions(
      sourceWidth,
      sourceHeight,
      exportSettings.resolution || (exportSettings.quality === 'medium' ? '720p' : 'original')
    );

    // Primary off-screen render canvas
    const canvas = document.createElement('canvas');
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) throw new Error('Could not obtain 2D canvas context');

    // Live preview canvas sync helper
    const liveCtx = livePreviewCanvas?.getContext('2d');
    if (livePreviewCanvas) {
      livePreviewCanvas.width = exportWidth;
      livePreviewCanvas.height = exportHeight;
    }

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
      `Initializing ${wantMp4 ? 'MP4 (Universal)' : 'WebM (VP9)'} ${exportWidth}×${exportHeight} @ ${fps} FPS...`,
      0,
      totalFrames
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

          if (f % 5 === 0 || f === totalFrames - 1) {
            onProgress(
              progress,
              `Rendering frame ${f + 1} of ${totalFrames} (${Math.round(((f + 1) / totalFrames) * 100)}%)...`,
              f + 1,
              totalFrames
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

          // Update live preview in UI if available
          if (liveCtx && livePreviewCanvas) {
            liveCtx.drawImage(canvas, 0, 0);
          }

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

        onProgress(97, 'Finalizing video container & indexing tracks...', totalFrames, totalFrames);
        await videoEncoder.flush();
        videoEncoder.close();

        if (mp4Muxer) {
          mp4Muxer.finalize();
          const buffer = mp4Muxer.target.buffer;
          onProgress(100, `Seamless MP4 export complete (${exactDuration.toFixed(1)}s @ ${fps} FPS)!`, totalFrames, totalFrames);
          return new Blob([buffer], { type: 'video/mp4' });
        } else if (webmMuxer) {
          webmMuxer.finalize();
          const buffer = webmMuxer.target.buffer;
          onProgress(100, `Seamless WebM export complete (${exactDuration.toFixed(1)}s @ ${fps} FPS)!`, totalFrames, totalFrames);
          return new Blob([buffer], { type: 'video/webm' });
        }
      } catch (err) {
        try {
          videoEncoder.close();
        } catch {}
        // If WebCodecs failed midway, fall through to MediaRecorder
        console.warn('WebCodecs encoding fallback triggered:', err);
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
      signal,
      livePreviewCanvas
    );
  } finally {
    cleanupDom();
  }
}

/**
 * Draws the mathematically seamless blended frame to the canvas for the given time.
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
  signal?: AbortSignal,
  livePreviewCanvas?: HTMLCanvasElement | null
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = canvas.captureStream(fps);
      const liveCtx = livePreviewCanvas?.getContext('2d');

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
          onProgress(98, 'Injecting duration metadata header...', totalFrames, totalFrames);

          const durationMs = Math.round(totalDuration * 1000);
          const fixedBlob = await fixWebmDuration(rawBlob, durationMs);
          onProgress(100, `Seamless WebM export complete (${totalDuration.toFixed(1)}s @ ${fps} FPS)!`, totalFrames, totalFrames);
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
          onProgress(progress, `Rendering frame ${f + 1} of ${totalFrames} (${progress}%)...`, f + 1, totalFrames);
        }

        await renderCompositeFrame(ctx, canvas, v1, v2, currentTime, loopDuration, clipDuration, inP, outP, xfade, settings);

        if (liveCtx && livePreviewCanvas) {
          liveCtx.drawImage(canvas, 0, 0);
        }

        // Frame interval pacing
        await new Promise((r) => setTimeout(r, Math.round(1000 / fps)));
      }

      onProgress(97, 'Finalizing video stream...', totalFrames, totalFrames);
      recorder.stop();
    } catch (err) {
      reject(err);
    }
  });
}
