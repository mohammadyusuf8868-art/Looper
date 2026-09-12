import React, { useRef, useState, useCallback, useEffect } from 'react';
import { LoopSettings } from '../types';
import { Sparkles, ChevronLeft, ChevronRight, Scissors } from 'lucide-react';

interface TimelineControllerProps {
  duration: number;
  currentTime: number;
  settings: LoopSettings;
  onUpdateSettings: (updates: Partial<LoopSettings>) => void;
  onSeek: (time: number) => void;
  onAutoFindSeam?: () => void;
  isAnalyzingSeam?: boolean;
}

export const TimelineController: React.FC<TimelineControllerProps> = ({
  duration,
  currentTime,
  settings,
  onUpdateSettings,
  onSeek,
  onAutoFindSeam,
  isAnalyzingSeam = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'in' | 'out' | 'playhead' | null>(null);

  const formatTime = (seconds: number) => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, '0')}`;
  };

  const getTimeFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return pos * duration;
    },
    [duration]
  );

  const handlePointerDown = (type: 'in' | 'out' | 'playhead', e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(type);
  };

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (e: PointerEvent) => {
      if (duration <= 0) return;
      const t = getTimeFromPointer(e.clientX);

      if (dragging === 'in') {
        const newIn = Math.max(0, Math.min(settings.outPoint - 0.5, t));
        onUpdateSettings({ inPoint: newIn });
      } else if (dragging === 'out') {
        const newOut = Math.max(settings.inPoint + 0.5, Math.min(duration, t));
        onUpdateSettings({ outPoint: newOut });
      } else if (dragging === 'playhead') {
        const clamped = Math.max(settings.inPoint, Math.min(settings.outPoint, t));
        onSeek(clamped);
      }
    };

    const onPointerUp = () => {
      setDragging(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragging, duration, getTimeFromPointer, onSeek, onUpdateSettings, settings.inPoint, settings.outPoint]);

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const t = getTimeFromPointer(e.clientX);
    const clamped = Math.max(settings.inPoint, Math.min(settings.outPoint, t));
    onSeek(clamped);
    setDragging('playhead');
  };

  // Percentages along track
  const safeDuration = duration > 0 ? duration : 1;
  const inPct = (settings.inPoint / safeDuration) * 100;
  const outPct = (settings.outPoint / safeDuration) * 100;
  const playheadPct = (Math.max(0, Math.min(duration, currentTime)) / safeDuration) * 100;

  // Crossfade overlap zone at the end of the loop
  const xfade = Math.min(settings.crossfadeDuration, (settings.outPoint - settings.inPoint) * 0.45);
  const xfadeStartPct = Math.max(inPct, ((settings.outPoint - xfade) / safeDuration) * 100);
  const xfadeWidthPct = Math.max(0, outPct - xfadeStartPct);

  return (
    <div id="timeline-container" className="w-full bg-stone-900/90 border border-stone-800 rounded-xl p-4 select-none">
      {/* Top row: timecodes & quick step */}
      <div className="flex items-center justify-between text-xs text-stone-400 mb-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-stone-200 bg-stone-800 px-2 py-0.5 rounded border border-stone-700">
            {formatTime(currentTime)}
          </span>
          <span className="text-stone-500">/</span>
          <span className="font-mono text-stone-400">{formatTime(duration)}</span>
          <span className="text-stone-600">|</span>
          <span className="text-stone-400">
            Loop: <strong className="text-amber-400 font-mono">{(settings.outPoint - settings.inPoint - (settings.mode === 'crossfade' ? xfade : 0)).toFixed(2)}s</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onAutoFindSeam && (
            <button
              id="auto-find-seam-btn"
              onClick={onAutoFindSeam}
              disabled={isAnalyzingSeam}
              title="Automatically scan frames to find the smoothest loop seam"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzingSeam ? 'animate-spin' : ''}`} />
              <span>{isAnalyzingSeam ? 'Analyzing...' : 'Auto-Fit Seam'}</span>
            </button>
          )}

          <div className="flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700/60">
            <button
              id="nudge-back-btn"
              onClick={() => onSeek(Math.max(settings.inPoint, currentTime - 0.033))}
              title="Step backward 1 frame"
              className="p-1 hover:text-stone-100 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[10px] text-stone-400 font-mono">1f</span>
            <button
              id="nudge-forward-btn"
              onClick={() => onSeek(Math.min(settings.outPoint, currentTime + 0.033))}
              title="Step forward 1 frame"
              className="p-1 hover:text-stone-100 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Track Bar */}
      <div
        id="timeline-track"
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        className="relative h-14 w-full bg-stone-950 rounded-lg cursor-pointer overflow-visible border border-stone-800"
      >
        {/* Filmstrip tick marks background */}
        <div className="absolute inset-0 flex justify-between pointer-events-none px-2 opacity-20">
          {Array.from({ length: 24 }).map((_, idx) => (
            <div key={idx} className="w-[1px] h-full bg-stone-400 flex flex-col justify-between py-1">
              <span className="w-1.5 h-[1px] bg-stone-400"></span>
              <span className="w-1.5 h-[1px] bg-stone-400"></span>
            </div>
          ))}
        </div>

        {/* Dimmed out-of-bounds regions */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
          style={{ width: `${inPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 right-0 bg-black/60 backdrop-blur-[1px] pointer-events-none"
          style={{ width: `${100 - outPct}%` }}
        />

        {/* Active loop window */}
        <div
          className="absolute top-0 bottom-0 border-y border-amber-500/40 bg-amber-500/5 pointer-events-none"
          style={{ left: `${inPct}%`, width: `${outPct - inPct}%` }}
        />

        {/* Crossfade overlap zone */}
        {settings.mode === 'crossfade' && (
          <div
            className="absolute top-0 bottom-0 pointer-events-none bg-gradient-to-r from-amber-500/10 via-amber-500/25 to-amber-500/40 border-l border-dashed border-amber-400/60"
            style={{ left: `${xfadeStartPct}%`, width: `${xfadeWidthPct}%` }}
          >
            <div className="absolute top-1 right-1.5 text-[9px] font-mono font-medium text-amber-300/80 bg-stone-900/80 px-1 py-0.5 rounded">
              Blend ({xfade.toFixed(1)}s)
            </div>
          </div>
        )}

        {/* In-Point Trim Handle */}
        <div
          id="in-point-handle"
          onPointerDown={(e) => handlePointerDown('in', e)}
          className="absolute top-0 bottom-0 -ml-2 w-4 z-20 cursor-ew-resize group flex flex-col items-center justify-between"
          style={{ left: `${inPct}%` }}
        >
          <div className="w-1 h-full bg-emerald-400 group-hover:bg-emerald-300 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-950 text-emerald-300 border border-emerald-500/60 text-[10px] font-mono px-1 rounded shadow pointer-events-none whitespace-nowrap">
            IN {formatTime(settings.inPoint)}
          </div>
        </div>

        {/* Out-Point Trim Handle */}
        <div
          id="out-point-handle"
          onPointerDown={(e) => handlePointerDown('out', e)}
          className="absolute top-0 bottom-0 -ml-2 w-4 z-20 cursor-ew-resize group flex flex-col items-center justify-between"
          style={{ left: `${outPct}%` }}
        >
          <div className="w-1 h-full bg-amber-400 group-hover:bg-amber-300 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.6)]"></div>
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-amber-950 text-amber-300 border border-amber-500/60 text-[10px] font-mono px-1 rounded shadow pointer-events-none whitespace-nowrap">
            OUT {formatTime(settings.outPoint)}
          </div>
        </div>

        {/* Playhead */}
        <div
          id="playhead-indicator"
          onPointerDown={(e) => handlePointerDown('playhead', e)}
          className="absolute top-0 bottom-0 -ml-1.5 w-3 z-30 cursor-ew-resize group"
          style={{ left: `${playheadPct}%` }}
        >
          <div className="w-0.5 h-full mx-auto bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"></div>
          <div className="w-3 h-3 bg-white rotate-45 -mt-1.5 mx-auto rounded-[1px] shadow-md group-hover:scale-125 transition-transform"></div>
        </div>
      </div>

      {/* Bottom labels */}
      <div className="flex justify-between items-center mt-2 text-[11px] text-stone-500">
        <span>0:00.00</span>
        <span className="text-stone-400 font-medium">
          {settings.mode === 'crossfade' ? 'Crossfade Mode active: Head dissolves over tail' : settings.mode === 'pingpong' ? 'Ping-Pong Mode: Forward & reverse loop' : 'Standard Trim Loop'}
        </span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};
