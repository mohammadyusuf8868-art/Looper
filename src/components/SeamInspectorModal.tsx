import React, { useState } from 'react';
import { SeamAnalysisResult } from '../types';
import { X, CheckCircle, SplitSquareHorizontal, Layers, Sparkles } from 'lucide-react';

interface SeamInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  startFrameUrl: string | null;
  endFrameUrl: string | null;
  diffMapUrl: string | null;
  seamResult: SeamAnalysisResult | null;
  onApplyRecommendedCrossfade: () => void;
}

export const SeamInspectorModal: React.FC<SeamInspectorModalProps> = ({
  isOpen,
  onClose,
  startFrameUrl,
  endFrameUrl,
  diffMapUrl,
  seamResult,
  onApplyRecommendedCrossfade,
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'difference' | 'split'>('side-by-side');
  const [splitPos, setSplitPos] = useState(50);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div
        id="seam-inspector-modal"
        className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-stone-200 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <SplitSquareHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-100">Loop Seam Alignment</h2>
              <p className="text-xs text-stone-400">Comparing In-Point frame with Out-Point frame</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Side-by-Side
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                viewMode === 'split'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Interactive Split
            </button>
            <button
              onClick={() => setViewMode('difference')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                viewMode === 'difference'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Difference Heatmap
            </button>
          </div>

          {seamResult && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Match:</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {seamResult.similarityScore}% ({seamResult.rating})
              </span>
            </div>
          )}
        </div>

        {/* Visual Comparison Area */}
        <div className="relative bg-black rounded-xl border border-stone-800 p-2 overflow-hidden mb-4 min-h-[220px] flex items-center justify-center">
          {viewMode === 'side-by-side' && (
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="space-y-1 text-center">
                <span className="text-[11px] font-mono text-emerald-400">In-Point (Start Frame)</span>
                <div className="rounded-lg overflow-hidden border border-emerald-500/40 bg-stone-950 aspect-video">
                  {startFrameUrl ? (
                    <img src={startFrameUrl} alt="In-Point" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-stone-500">Loading frame...</div>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-center">
                <span className="text-[11px] font-mono text-amber-400">Out-Point (End Frame)</span>
                <div className="rounded-lg overflow-hidden border border-amber-500/40 bg-stone-950 aspect-video">
                  {endFrameUrl ? (
                    <img src={endFrameUrl} alt="Out-Point" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-stone-500">Loading frame...</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewMode === 'split' && startFrameUrl && endFrameUrl && (
            <div
              className="relative w-full aspect-video rounded-lg overflow-hidden cursor-ew-resize select-none border border-stone-700"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = ((e.clientX - rect.left) / rect.width) * 100;
                setSplitPos(Math.max(5, Math.min(95, pos)));
              }}
            >
              <img src={endFrameUrl} alt="End Frame" className="absolute inset-0 w-full h-full object-cover" />
              <div
                className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                style={{ width: `${splitPos}%` }}
              >
                <img
                  src={startFrameUrl}
                  alt="Start Frame"
                  className="absolute inset-0 w-full h-full object-cover max-w-none"
                  style={{ width: `${100 / (splitPos / 100)}%` }}
                />
              </div>
              <div className="absolute bottom-2 left-2 text-[10px] font-mono bg-emerald-950/90 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-700 pointer-events-none">
                Start Frame
              </div>
              <div className="absolute bottom-2 right-2 text-[10px] font-mono bg-amber-950/90 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700 pointer-events-none">
                End Frame
              </div>
            </div>
          )}

          {viewMode === 'difference' && (
            <div className="w-full aspect-video rounded-lg overflow-hidden flex flex-col items-center justify-center bg-stone-950 border border-stone-800">
              {diffMapUrl ? (
                <div className="relative w-full h-full">
                  <img src={diffMapUrl} alt="Difference Heatmap" className="w-full h-full object-contain" />
                  <div className="absolute bottom-2 left-2 text-[10px] font-mono bg-stone-900/90 text-stone-300 px-2 py-0.5 rounded border border-stone-700">
                    Warm pixels indicate displacement between seam endpoints
                  </div>
                </div>
              ) : (
                <span className="text-xs text-stone-500">Generating difference heatmap...</span>
              )}
            </div>
          )}
        </div>

        {/* Diagnosis & recommendation */}
        {seamResult && (
          <div className="p-3 bg-stone-950 border border-stone-800 rounded-xl mb-4 text-xs">
            <div className="font-medium text-stone-200 mb-1 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Alignment Assessment</span>
            </div>
            <p className="text-stone-400 leading-relaxed">{seamResult.description}</p>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={onApplyRecommendedCrossfade}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Apply Optimal 1.2s Dissolve</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-950 bg-stone-200 hover:bg-white rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
