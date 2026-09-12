import React, { useState, useRef } from 'react';
import { ExportSettings, LoopSettings, ExportFps, ExportResolution, ExportBitrate } from '../types';
import { exportLoopedVideo, calculateExportDimensions, calculateExportBitrate } from '../utils/videoExporter';
import { useAuth } from '../context/AuthContext';
import { X, Download, Film, CheckCircle2, AlertCircle, Sparkles, ShieldCheck, Gauge, Sliders, Layers } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSourceUrl: string;
  sourceName: string;
  settings: LoopSettings;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  videoSourceUrl,
  sourceName,
  settings,
}) => {
  const { currentUser, isAdmin, deductCredit, setShowPaymentModal } = useAuth();

  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    durationMode: 'repeats',
    repeats: 3,
    targetSeconds: 15,
    format: 'mp4',
    quality: 'high',
    resolution: 'original',
    fps: 30,
    bitratePreset: 'auto',
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen || !currentUser) return null;

  const clipDuration = settings.outPoint - settings.inPoint;
  const xfade = Math.min(settings.crossfadeDuration, clipDuration * 0.45);
  const singleLoopDur =
    settings.mode === 'crossfade'
      ? Math.max(0.5, clipDuration - xfade)
      : settings.mode === 'pingpong'
      ? clipDuration * 2
      : clipDuration;

  const estimatedExportDur =
    exportSettings.durationMode === 'single'
      ? singleLoopDur
      : exportSettings.durationMode === 'repeats'
      ? singleLoopDur * exportSettings.repeats
      : exportSettings.targetSeconds;

  const totalFrames = Math.max(1, Math.round(estimatedExportDur * (exportSettings.fps || 30)));

  const handleStartExport = async () => {
    // Check and deduct credit
    const allowed = deductCredit();
    if (!allowed) {
      setErrorMessage('Out of loop credits. Please top up credits (₹1 = 1 Credit) to export.');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setStatusText('Preparing hardware video encoder...');
    setErrorMessage(null);
    setExportedUrl(null);
    setExportedBlob(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const blob = await exportLoopedVideo(
        videoSourceUrl,
        settings,
        exportSettings,
        (p, status) => {
          setProgress(p);
          setStatusText(status);
        },
        abortController.signal
      );

      const url = URL.createObjectURL(blob);
      setExportedBlob(blob);
      setExportedUrl(url);
      setIsExporting(false);
    } catch (err: any) {
      if (err.message !== 'Export cancelled') {
        setErrorMessage(err.message || 'An unexpected error occurred during export.');
      }
      setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
  };

  const handleDownload = () => {
    if (!exportedUrl || !exportedBlob) return;
    const a = document.createElement('a');
    a.href = exportedUrl;
    const cleanName = sourceName.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9_-]/gi, '_');
    const isMp4 = exportedBlob.type.includes('mp4') || exportSettings.format === 'mp4';
    const ext = isMp4 ? 'mp4' : 'webm';
    a.download = `${cleanName}_seamless_loop_${exportSettings.fps}fps.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        id="export-modal-card"
        className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-stone-200 overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-100 leading-tight">Export Seamless Loop</h2>
              <p className="text-xs text-stone-400">Configure duration, resolution, FPS, and container format</p>
            </div>
          </div>
          <button
            id="close-export-modal-btn"
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!exportedUrl ? (
          <div className="space-y-4">
            {/* Credit Status Banner */}
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                {isAdmin ? (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-stone-200">Admin Account: Unlimited Exports</span>
                  </>
                ) : currentUser.unlimitedAccess ? (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-emerald-300">VIP Access Active (Unlimited)</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4 text-amber-400" />
                    <span className="text-stone-300">
                      Balance: <strong className="font-mono text-amber-400 font-bold">{currentUser.credits}</strong>{' '}
                      Credit{currentUser.credits === 1 ? '' : 's'} remaining
                    </span>
                  </>
                )}
              </div>
              {!isAdmin && !currentUser.unlimitedAccess && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline text-[11px]"
                >
                  Buy Credits (₹1 = 1 Cr)
                </button>
              )}
            </div>

            {/* Duration Mode Selection */}
            <div>
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block mb-2">
                Output Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  id="export-mode-single-btn"
                  onClick={() => setExportSettings((s) => ({ ...s, durationMode: 'single' }))}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportSettings.durationMode === 'single'
                      ? 'bg-amber-500/15 border-amber-500/60 text-stone-100'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-medium mb-0.5">1x Loop</div>
                  <div className="text-[11px] text-stone-400 font-mono">{singleLoopDur.toFixed(1)}s (Baked)</div>
                </button>

                <button
                  type="button"
                  id="export-mode-repeats-3-btn"
                  onClick={() => setExportSettings((s) => ({ ...s, durationMode: 'repeats', repeats: 3 }))}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportSettings.durationMode === 'repeats' && exportSettings.repeats === 3
                      ? 'bg-amber-500/15 border-amber-500/60 text-stone-100'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-medium mb-0.5">3x Repeats</div>
                  <div className="text-[11px] text-stone-400 font-mono">{(singleLoopDur * 3).toFixed(1)}s (Shorts)</div>
                </button>

                <button
                  type="button"
                  id="export-mode-repeats-5-btn"
                  onClick={() => setExportSettings((s) => ({ ...s, durationMode: 'repeats', repeats: 5 }))}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportSettings.durationMode === 'repeats' && exportSettings.repeats === 5
                      ? 'bg-amber-500/15 border-amber-500/60 text-stone-100'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-medium mb-0.5">5x Repeats</div>
                  <div className="text-[11px] text-stone-400 font-mono">{(singleLoopDur * 5).toFixed(1)}s (Reels)</div>
                </button>

                <button
                  type="button"
                  id="export-mode-custom-btn"
                  onClick={() => setExportSettings((s) => ({ ...s, durationMode: 'custom_time' }))}
                  disabled={isExporting}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    exportSettings.durationMode === 'custom_time'
                      ? 'bg-amber-500/15 border-amber-500/60 text-stone-100'
                      : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-xs font-medium mb-0.5">Target Time</div>
                  <div className="text-[11px] text-stone-400 font-mono">{exportSettings.targetSeconds}s custom</div>
                </button>
              </div>

              {exportSettings.durationMode === 'custom_time' && (
                <div className="mt-2.5 flex items-center gap-3 p-2 bg-stone-950/70 border border-stone-800 rounded-lg">
                  <input
                    type="range"
                    min="3"
                    max="60"
                    step="1"
                    value={exportSettings.targetSeconds}
                    onChange={(e) =>
                      setExportSettings((s) => ({ ...s, targetSeconds: parseInt(e.target.value, 10) }))
                    }
                    className="w-full accent-amber-400 bg-stone-800 h-1.5 rounded cursor-pointer"
                  />
                  <span className="font-mono text-xs text-amber-400 w-12 text-right">
                    {exportSettings.targetSeconds}s
                  </span>
                </div>
              )}
            </div>

            {/* Frame Rate (FPS) Selection - Extra feature requested by user */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>Frame Rate (FPS)</span>
                </label>
                <span className="text-[11px] text-amber-400 font-mono font-medium">
                  {totalFrames} total frames ({exportSettings.fps} fps)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: 24, label: '24 FPS', sub: 'Cinematic / Film' },
                  { val: 30, label: '30 FPS', sub: 'Universal / Smooth' },
                  { val: 60, label: '60 FPS', sub: 'Ultra Smooth / 60p' },
                ] as const).map(({ val, label, sub }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setExportSettings((s) => ({ ...s, fps: val }))}
                    disabled={isExporting}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      exportSettings.fps === val
                        ? 'bg-amber-500/20 border-amber-500/70 text-amber-300 font-semibold'
                        : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="text-xs">{label}</div>
                    <div className="text-[10px] text-stone-400 font-normal">{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution & Bitrate Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Resolution Selector */}
              <div>
                <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Resolution</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['original', '1080p', '720p', '540p'] as ExportResolution[]).map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setExportSettings((s) => ({ ...s, resolution: res }))}
                      disabled={isExporting}
                      className={`py-1.5 px-2 text-xs rounded-lg border text-center font-medium capitalize transition-all ${
                        exportSettings.resolution === res
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {res === 'original' ? 'Source' : res}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bitrate Preset */}
              <div>
                <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bitrate Preset</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { id: 'economy', label: 'Economy' },
                    { id: 'auto', label: 'Auto' },
                    { id: 'high', label: 'Studio' },
                  ] as const).map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setExportSettings((s) => ({ ...s, bitratePreset: id as ExportBitrate }))}
                      disabled={isExporting}
                      className={`py-1.5 px-1.5 text-xs rounded-lg border text-center font-medium transition-all ${
                        (exportSettings.bitratePreset || 'auto') === id
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Container Format */}
            <div>
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block mb-1.5">
                Container Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportSettings((s) => ({ ...s, format: 'mp4' }))}
                  disabled={isExporting}
                  className={`py-2 px-3 text-xs rounded-xl border flex items-center justify-between transition-all ${
                    exportSettings.format === 'mp4'
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-left">
                    <div>MP4 (H.264)</div>
                    <div className="text-[10px] text-stone-400 font-normal">Universal (QuickTime, Windows, Web, Mobile)</div>
                  </div>
                  {exportSettings.format === 'mp4' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setExportSettings((s) => ({ ...s, format: 'webm' }))}
                  disabled={isExporting}
                  className={`py-2 px-3 text-xs rounded-xl border flex items-center justify-between transition-all ${
                    exportSettings.format === 'webm'
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <div className="text-left">
                    <div>WebM (VP9)</div>
                    <div className="text-[10px] text-stone-400 font-normal">High-efficiency open-source web format</div>
                  </div>
                  {exportSettings.format === 'webm' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Summary Pipeline Box */}
            <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800/80 flex items-center justify-between text-[11px] font-mono text-stone-400">
              <span>
                Duration: <strong className="text-amber-400">{estimatedExportDur.toFixed(1)}s</strong>
              </span>
              <span>•</span>
              <span>
                FPS: <strong className="text-amber-400">{exportSettings.fps}p</strong>
              </span>
              <span>•</span>
              <span>
                Format: <strong className="text-amber-400">{exportSettings.format.toUpperCase()}</strong>
              </span>
              <span>•</span>
              <span>
                Frames: <strong className="text-amber-400">{totalFrames}</strong>
              </span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Progress indicator during rendering */}
            {isExporting && (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-xs text-stone-300 font-mono">
                  <span className="truncate max-w-[80%]">{statusText}</span>
                  <span className="text-amber-400 font-semibold">{progress}%</span>
                </div>
                <div className="w-full bg-stone-950 h-2 rounded-full overflow-hidden border border-stone-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {isExporting ? (
                <button
                  type="button"
                  onClick={handleCancelExport}
                  className="px-4 py-2 text-xs font-medium text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    id="start-export-btn"
                    onClick={handleStartExport}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.25)] transition-all cursor-pointer"
                  >
                    <Film className="w-4 h-4" />
                    <span>Render {estimatedExportDur.toFixed(1)}s Video ({exportSettings.fps} FPS)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Rendered Success State */
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-stone-100 mb-1">Seamless Loop Ready</h3>
              <p className="text-xs text-stone-400 font-mono">
                Format: <span className="text-amber-400 font-semibold">{exportedBlob?.type.includes('mp4') ? 'MP4 (H.264 Universal)' : 'WebM (VP9)'}</span> • Duration: {estimatedExportDur.toFixed(1)}s • FPS: {exportSettings.fps} • Size: {exportedBlob ? (exportedBlob.size / 1024 / 1024).toFixed(2) : 0} MB
              </p>
            </div>

            {/* Quick Preview */}
            <div className="rounded-xl overflow-hidden border border-stone-800 max-h-56 bg-black">
              <video
                src={exportedUrl}
                autoPlay
                loop
                muted
                playsInline
                controls
                className="w-full h-full object-contain mx-auto"
              />
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setExportedUrl(null)}
                className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors"
              >
                Back to Settings
              </button>
              <button
                type="button"
                id="download-exported-video-btn"
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Looped Video</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
