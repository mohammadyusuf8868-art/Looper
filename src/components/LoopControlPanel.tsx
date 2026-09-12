import React from 'react';
import { LoopMode, CrossfadeCurve, LoopSettings, SeamAnalysisResult } from '../types';
import { Layers, ArrowLeftRight, Repeat, Gauge, Volume2, VolumeX, Eye } from 'lucide-react';

interface LoopControlPanelProps {
  settings: LoopSettings;
  onUpdateSettings: (updates: Partial<LoopSettings>) => void;
  seamResult: SeamAnalysisResult | null;
  onOpenSeamInspector: () => void;
}

export const LoopControlPanel: React.FC<LoopControlPanelProps> = ({
  settings,
  onUpdateSettings,
  seamResult,
  onOpenSeamInspector,
}) => {
  const modes: { id: LoopMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'crossfade',
      label: 'Crossfade Blend',
      icon: <Layers className="w-4 h-4" />,
      desc: 'Seamless dissolve from tail to head',
    },
    {
      id: 'pingpong',
      label: 'Ping-Pong',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      desc: 'Smooth forward-reverse mirror loop',
    },
    {
      id: 'standard',
      label: 'Standard Cut',
      icon: <Repeat className="w-4 h-4" />,
      desc: 'Direct cyclic jump cut at loop bounds',
    },
  ];

  const curves: { id: CrossfadeCurve; label: string; desc: string }[] = [
    { id: 'cosine', label: 'Smooth Cosine', desc: 'Natural organic curve (Best for fabrics & AI)' },
    { id: 'ease-in-out', label: 'Ease In-Out', desc: 'Quadratic ease' },
    { id: 'linear', label: 'Linear', desc: 'Constant rate dissolve' },
  ];

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const xfadePresets = [0.5, 0.8, 1.2, 1.6, 2.2];

  return (
    <div id="loop-controls-panel" className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-stone-200">
      {/* Column 1: Mode Selector */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Looping Algorithm
            </span>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
              60 FPS Real-time
            </span>
          </div>

          <div className="space-y-2">
            {modes.map((m) => {
              const active = settings.mode === m.id;
              return (
                <button
                  key={m.id}
                  id={`loop-mode-${m.id}-btn`}
                  onClick={() => onUpdateSettings({ mode: m.id })}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    active
                      ? 'bg-amber-500/10 border-amber-500/60 text-stone-100 shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                      : 'bg-stone-950/60 border-stone-800/80 text-stone-400 hover:border-stone-700 hover:text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={active ? 'text-amber-400' : 'text-stone-500'}>
                      {m.icon}
                    </span>
                    <div>
                      <div className="text-xs font-medium leading-none mb-1">{m.label}</div>
                      <div className="text-[11px] text-stone-500 leading-tight">{m.desc}</div>
                    </div>
                  </div>
                  {active && (
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seam Match Badge */}
        {seamResult && (
          <div className="mt-3 pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Seam Score:</span>
              <span
                className={`font-semibold font-mono ${
                  seamResult.rating === 'Perfect'
                    ? 'text-emerald-400'
                    : seamResult.rating === 'Excellent'
                    ? 'text-amber-400'
                    : 'text-stone-300'
                }`}
              >
                {seamResult.similarityScore}% ({seamResult.rating})
              </span>
            </div>
            <button
              id="inspect-seam-mini-btn"
              onClick={onOpenSeamInspector}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Eye className="w-3 h-3" />
              <span>Inspect</span>
            </button>
          </div>
        )}
      </div>

      {/* Column 2: Crossfade & Blend Settings */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Crossfade Dissolve
            </span>
            <span className="text-xs font-mono text-amber-400">
              {settings.mode === 'crossfade' ? `${settings.crossfadeDuration.toFixed(2)}s` : 'Disabled'}
            </span>
          </div>

          {settings.mode === 'crossfade' ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] text-stone-400 mb-1.5">
                  <span>Overlap Duration</span>
                  <span className="font-mono">{settings.crossfadeDuration}s</span>
                </div>
                <input
                  id="crossfade-duration-slider"
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={settings.crossfadeDuration}
                  onChange={(e) => onUpdateSettings({ crossfadeDuration: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 bg-stone-950 h-1.5 rounded cursor-pointer"
                />
                <div className="flex items-center gap-1.5 mt-2">
                  {xfadePresets.map((dur) => (
                    <button
                      key={dur}
                      onClick={() => onUpdateSettings({ crossfadeDuration: dur })}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                        Math.abs(settings.crossfadeDuration - dur) < 0.05
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-stone-800/60 border-stone-700/60 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {dur}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] text-stone-400 block mb-1.5">Blend Curve</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {curves.map((c) => (
                    <button
                      key={c.id}
                      id={`curve-${c.id}-btn`}
                      onClick={() => onUpdateSettings({ crossfadeCurve: c.id })}
                      title={c.desc}
                      className={`py-1.5 px-2 text-[11px] font-medium rounded border text-center transition-colors truncate ${
                        settings.crossfadeCurve === c.id
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {c.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-stone-500">
              Crossfade duration is active when <strong className="text-stone-300">Crossfade Blend</strong> is selected.
            </div>
          )}
        </div>

        <div className="mt-2 text-[11px] text-stone-500 leading-tight">
          {settings.mode === 'crossfade'
            ? 'Smoothly mixes the incoming loop head with outgoing tail.'
            : settings.mode === 'pingpong'
            ? 'Inverts playback direction at out-point for zero seams.'
            : 'Jumps directly to in-point when out-point is reached.'}
        </div>
      </div>

      {/* Column 3: Playback Rate & Audio Controls */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Motion & Audio
            </span>
            <div className="flex items-center gap-1 text-stone-400">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-mono">{settings.playbackRate}x</span>
            </div>
          </div>

          {/* Speed Presets */}
          <div className="mb-4">
            <div className="text-[11px] text-stone-400 mb-1.5">Playback Speed</div>
            <div className="grid grid-cols-6 gap-1">
              {speeds.map((s) => (
                <button
                  key={s}
                  id={`speed-${s}x-btn`}
                  onClick={() => onUpdateSettings({ playbackRate: s })}
                  className={`py-1 text-center font-mono text-[11px] rounded border transition-colors ${
                    settings.playbackRate === s
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Audio volume */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  id="toggle-audio-mute-btn"
                  onClick={() => onUpdateSettings({ muted: !settings.muted })}
                  className="hover:text-stone-200"
                >
                  {settings.muted ? <VolumeX className="w-3.5 h-3.5 text-stone-500" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
                <span>Audio Volume</span>
              </div>
              <span className="font-mono">{settings.muted ? 'Muted' : `${Math.round(settings.volume * 100)}%`}</span>
            </div>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.muted ? 0 : settings.volume}
              onChange={(e) => {
                const vol = parseFloat(e.target.value);
                onUpdateSettings({ volume: vol, muted: vol === 0 });
              }}
              className="w-full accent-amber-400 bg-stone-950 h-1.5 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-stone-800 text-[11px] text-stone-500 flex items-center justify-between">
          <span>Looping Audio Engine</span>
          <span className="text-emerald-400 font-mono">Crossfaded</span>
        </div>
      </div>
    </div>
  );
};
