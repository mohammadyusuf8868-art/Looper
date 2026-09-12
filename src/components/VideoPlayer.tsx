import React, { useRef, useEffect, useState, useCallback } from 'react';
import { LoopSettings, VideoSourceInfo } from '../types';
import { computeBlendAlpha } from '../utils/videoExporter';
import { Play, Pause, Maximize, Volume2, VolumeX, Sparkles, UploadCloud } from 'lucide-react';

interface VideoPlayerProps {
  source: VideoSourceInfo;
  settings: LoopSettings;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  loopCount: number;
  setLoopCount: React.Dispatch<React.SetStateAction<number>>;
  onDropVideoFile: (file: File) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  source,
  settings,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  loopCount,
  setLoopCount,
  onDropVideoFile,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const [blendProgress, setBlendProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pingPongDirection, setPingPongDirection] = useState<'forward' | 'backward'>('forward');

  // Keep references to mutable values to prevent animation loop tear-down
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;

  const pingPongDirectionRef = useRef(pingPongDirection);
  pingPongDirectionRef.current = pingPongDirection;

  const lastReportedTimeRef = useRef(0);
  const lastTimeRef = useRef<number>(performance.now());
  const animFrameRef = useRef<number | null>(null);
  const pingPongTimeRef = useRef(settings.inPoint);

  const clipDuration = Math.max(0.5, settings.outPoint - settings.inPoint);
  const xfade = Math.min(settings.crossfadeDuration, clipDuration * 0.45);
  const loopCycleDuration =
    settings.mode === 'crossfade'
      ? Math.max(0.5, clipDuration - xfade)
      : settings.mode === 'pingpong'
      ? clipDuration * 2
      : clipDuration;

  // Sync settings like speed, volume, and mute to video elements
  useEffect(() => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    if (!v1 || !v2) return;

    v1.playbackRate = settings.playbackRate;
    v2.playbackRate = settings.playbackRate;
    v1.muted = settings.muted;
    v2.muted = settings.muted;
    v1.volume = settings.volume;
    v2.volume = settings.volume;
  }, [settings.playbackRate, settings.muted, settings.volume]);

  // Handle Play / Pause commands
  useEffect(() => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    if (!v1 || !v2) return;

    if (isPlaying) {
      if (settings.mode === 'crossfade' || settings.mode === 'standard') {
        const lead = activeSlotRef.current === 1 ? v1 : v2;
        lead.play().catch(() => {});
      } else if (settings.mode === 'pingpong') {
        if (pingPongDirectionRef.current === 'forward') {
          v1.play().catch(() => {});
        }
      }
    } else {
      v1.pause();
      v2.pause();
    }
  }, [isPlaying, settings.mode]);

  // Handle external seek (e.g. user dragged timeline playhead while paused or playing)
  const lastExternalSeekRef = useRef(currentTime);
  useEffect(() => {
    if (Math.abs(currentTime - lastExternalSeekRef.current) > 0.03) {
      lastExternalSeekRef.current = currentTime;
      const v1 = video1Ref.current;
      const v2 = video2Ref.current;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!v1 || !v2 || !canvas || !ctx) return;

      const target = Math.max(settings.inPoint, Math.min(settings.outPoint, currentTime));
      const lead = activeSlotRef.current === 1 ? v1 : v2;
      lead.currentTime = target;
      pingPongTimeRef.current = target;

      // When paused, immediately render the seeked frame onto the canvas
      if (!isPlaying) {
        const drawSeeked = () => {
          ctx.globalAlpha = 1.0;
          ctx.drawImage(lead, 0, 0, canvas.width, canvas.height);
        };
        lead.addEventListener('seeked', drawSeeked, { once: true });
        // Fallback draw in case already at target
        setTimeout(drawSeeked, 60);
      }
    }
  }, [currentTime, isPlaying, settings.inPoint, settings.outPoint]);

  // Main continuous rendering loop
  useEffect(() => {
    let isRunning = true;
    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!isRunning) return;

      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const v1 = video1Ref.current;
      const v2 = video2Ref.current;
      const curSettings = settingsRef.current;
      const playing = isPlayingRef.current;

      if (canvas && ctx && v1 && v2 && v1.readyState >= 2) {
        const width = canvas.width;
        const height = canvas.height;
        const curClipDuration = Math.max(0.5, curSettings.outPoint - curSettings.inPoint);
        const curXfade = Math.min(curSettings.crossfadeDuration, curClipDuration * 0.45);

        if (curSettings.mode === 'crossfade') {
          const slot = activeSlotRef.current;
          const leadVid = slot === 1 ? v1 : v2;
          const nextVid = slot === 1 ? v2 : v1;

          const leadCurrent = leadVid.currentTime;

          // Throttle state update to App to prevent 60fps React re-render thrashing
          if (Math.abs(leadCurrent - lastReportedTimeRef.current) >= 0.04) {
            lastReportedTimeRef.current = leadCurrent;
            lastExternalSeekRef.current = leadCurrent;
            setCurrentTime(leadCurrent);
          }

          const fadeTrigger = curSettings.outPoint - curXfade;

          if (leadCurrent >= fadeTrigger && leadCurrent <= curSettings.outPoint) {
            // In Crossfade zone
            setIsCrossfading(true);
            const rawProgress = (leadCurrent - fadeTrigger) / Math.max(0.005, curXfade);
            const progress = Math.max(0, Math.min(1, rawProgress));
            setBlendProgress(progress);

            const alphaNext = computeBlendAlpha(progress, curSettings.crossfadeCurve);

            // Prime and sync secondary video
            if (nextVid.paused && playing) {
              const nextTargetTime = curSettings.inPoint + (leadCurrent - fadeTrigger);
              if (Math.abs(nextVid.currentTime - nextTargetTime) > 0.08) {
                nextVid.currentTime = nextTargetTime;
              }
              nextVid.playbackRate = curSettings.playbackRate;
              nextVid.play().catch(() => {});
            }

            // Audio crossfade balance
            if (!curSettings.muted) {
              leadVid.volume = curSettings.volume * Math.max(0, 1 - alphaNext);
              nextVid.volume = curSettings.volume * Math.max(0, alphaNext);
            }

            // Draw primary video
            ctx.globalAlpha = 1.0;
            ctx.drawImage(leadVid, 0, 0, width, height);

            // Overlay blended video
            ctx.globalAlpha = alphaNext;
            ctx.drawImage(nextVid, 0, 0, width, height);
            ctx.globalAlpha = 1.0;

            // Reached loop seam: swap roles seamlessly
            if (leadCurrent >= curSettings.outPoint - 0.035) {
              leadVid.pause();
              leadVid.currentTime = curSettings.inPoint;
              const nextSlot = slot === 1 ? 2 : 1;
              activeSlotRef.current = nextSlot;
              setActiveSlot(nextSlot);
              setIsCrossfading(false);
              setBlendProgress(0);
              setLoopCount((c) => c + 1);

              if (!curSettings.muted) {
                nextVid.volume = curSettings.volume;
              }
            }
          } else {
            // Normal Single Video Playback
            setIsCrossfading(false);
            setBlendProgress(0);

            if (!curSettings.muted) {
              leadVid.volume = curSettings.volume;
            }

            // Boundary guard
            if (leadCurrent < curSettings.inPoint - 0.05 || leadCurrent > curSettings.outPoint) {
              leadVid.currentTime = curSettings.inPoint;
            }

            ctx.globalAlpha = 1.0;
            ctx.drawImage(leadVid, 0, 0, width, height);
          }
        } else if (curSettings.mode === 'pingpong') {
          // Ping-Pong Mode
          if (playing) {
            const step = delta * curSettings.playbackRate;
            if (pingPongDirectionRef.current === 'forward') {
              if (v1.paused) v1.play().catch(() => {});
              pingPongTimeRef.current = v1.currentTime;

              if (v1.currentTime >= curSettings.outPoint - 0.04) {
                v1.pause();
                pingPongTimeRef.current = curSettings.outPoint;
                pingPongDirectionRef.current = 'backward';
                setPingPongDirection('backward');
              }
            } else {
              // Playing backward
              v1.pause();
              pingPongTimeRef.current -= step;
              if (pingPongTimeRef.current <= curSettings.inPoint) {
                pingPongTimeRef.current = curSettings.inPoint;
                pingPongDirectionRef.current = 'forward';
                setPingPongDirection('forward');
                setLoopCount((c) => c + 1);
                v1.currentTime = curSettings.inPoint;
                v1.play().catch(() => {});
              } else {
                v1.currentTime = pingPongTimeRef.current;
              }
            }
          }

          const currentT = pingPongTimeRef.current;
          if (Math.abs(currentT - lastReportedTimeRef.current) >= 0.04) {
            lastReportedTimeRef.current = currentT;
            lastExternalSeekRef.current = currentT;
            setCurrentTime(currentT);
          }

          ctx.globalAlpha = 1.0;
          ctx.drawImage(v1, 0, 0, width, height);
          setIsCrossfading(false);
        } else {
          // Standard Loop mode
          const leadVid = v1;
          const leadCurrent = leadVid.currentTime;

          if (Math.abs(leadCurrent - lastReportedTimeRef.current) >= 0.04) {
            lastReportedTimeRef.current = leadCurrent;
            lastExternalSeekRef.current = leadCurrent;
            setCurrentTime(leadCurrent);
          }

          if (leadCurrent >= curSettings.outPoint - 0.03 || leadCurrent < curSettings.inPoint) {
            leadVid.currentTime = curSettings.inPoint;
            setLoopCount((c) => c + 1);
            if (playing && leadVid.paused) {
              leadVid.play().catch(() => {});
            }
          }

          ctx.globalAlpha = 1.0;
          ctx.drawImage(leadVid, 0, 0, width, height);
          setIsCrossfading(false);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [setCurrentTime, setLoopCount]);

  // Auto-recovery if browser video element reaches native ended state
  const handleNativeEnded = useCallback((vidSlot: 1 | 2) => {
    const curSettings = settingsRef.current;
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    const targetVid = vidSlot === 1 ? v1 : v2;

    if (targetVid) {
      targetVid.currentTime = curSettings.inPoint;
      if (isPlayingRef.current) {
        targetVid.play().catch(() => {});
      }
      setLoopCount((c) => c + 1);
    }
  }, [setLoopCount]);

  // Spacebar toggle listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsPlaying(!isPlayingRef.current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsPlaying]);

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onDropVideoFile(file);
      }
    }
  };

  return (
    <div
      id="video-stage-container"
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full aspect-video max-h-[68vh] bg-black rounded-2xl overflow-hidden shadow-2xl border transition-all flex items-center justify-center group select-none ${
        isDragOver
          ? 'border-amber-400 ring-4 ring-amber-500/20'
          : 'border-stone-800/90'
      }`}
    >
      {/* Hidden synchronized video elements */}
      <video
        ref={video1Ref}
        src={source.url}
        playsInline
        muted={settings.muted}
        crossOrigin="anonymous"
        onEnded={() => handleNativeEnded(1)}
        className="hidden"
      />
      <video
        ref={video2Ref}
        src={source.url}
        playsInline
        muted={settings.muted}
        crossOrigin="anonymous"
        onEnded={() => handleNativeEnded(2)}
        className="hidden"
      />

      {/* Main High-Performance Blended Canvas */}
      <canvas
        id="video-player-canvas"
        ref={canvasRef}
        width={source.width || 1280}
        height={source.height || 720}
        onClick={handleTogglePlay}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-sm z-40 flex flex-col items-center justify-center text-amber-300 pointer-events-none animate-fade-in">
          <UploadCloud className="w-12 h-12 mb-2 text-amber-400 animate-bounce" />
          <p className="text-base font-semibold">Drop Video to Load</p>
          <p className="text-xs text-stone-400">Supports MP4, WebM, MOV</p>
        </div>
      )}

      {/* Top Left: Loop Status Badge */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900/80 backdrop-blur-md border border-stone-700/60 shadow-lg text-[11px] font-mono text-stone-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span>LOOP #{loopCount + 1}</span>
          <span className="text-stone-500">|</span>
          <span className="text-amber-300 uppercase">{settings.mode}</span>
        </div>

        {/* Realtime Crossfade Blend Indicator */}
        {isCrossfading && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/50 shadow-lg text-[11px] font-mono text-amber-300 animate-pulse">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>DISSOLVING {Math.round(blendProgress * 100)}%</span>
          </div>
        )}
      </div>

      {/* Top Right: Resolution & Fullscreen */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        <div className="px-2 py-1 rounded-md bg-stone-900/80 backdrop-blur-md border border-stone-800 text-[10px] font-mono text-stone-400">
          {source.width}×{source.height}
        </div>
        <button
          id="fullscreen-toggle-btn"
          onClick={handleFullscreen}
          title="Fullscreen"
          className="p-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-800 backdrop-blur-md border border-stone-700/60 text-stone-300 hover:text-white transition-colors"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Center Play Button Overlay (shown when paused) */}
      {!isPlaying && (
        <button
          id="center-play-btn"
          onClick={handleTogglePlay}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-amber-500/90 hover:bg-amber-400 text-stone-950 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.4)] transition-all transform hover:scale-105 z-20"
        >
          <Play className="w-7 h-7 fill-current translate-x-0.5" />
        </button>
      )}

      {/* Bottom Floating Hover Controls */}
      <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-30 flex items-center justify-between text-stone-200">
        <div className="flex items-center gap-3">
          <button
            id="play-pause-btn"
            onClick={handleTogglePlay}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <div className="text-xs font-mono text-stone-300">
            {currentTime.toFixed(2)}s / {loopCycleDuration.toFixed(2)}s
          </div>
        </div>

        <div className="text-xs text-stone-400 font-medium">
          Press <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 text-[10px] font-mono">Space</kbd> to Play/Pause
        </div>
      </div>
    </div>
  );
};
