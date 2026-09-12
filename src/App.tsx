/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LoopSettings, VideoSourceInfo, SeamAnalysisResult } from './types';
import { generateSampleVideoBlob } from './utils/sampleGenerator';
import { captureVideoFrame, calculateFrameSimilarity, evaluateSeamScore } from './utils/seamAnalyzer';
import { VideoPlayer } from './components/VideoPlayer';
import { TimelineController } from './components/TimelineController';
import { LoopControlPanel } from './components/LoopControlPanel';
import { ExportModal } from './components/ExportModal';
import { SeamInspectorModal } from './components/SeamInspectorModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { PaymentModal } from './components/PaymentModal';
import { AuthModal } from './components/AuthModal';
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from './context/AuthContext';
import {
  Film,
  Upload,
  Download,
  Sparkles,
  SplitSquareHorizontal,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldCheck,
  User,
  Zap,
  LogOut,
} from 'lucide-react';

export default function App() {
  const {
    currentUser,
    isAdmin,
    paymentConfig,
    logout,
    setShowAdminModal,
    setShowPaymentModal,
    setShowAuthModal,
  } = useAuth();

  const [videoSource, setVideoSource] = useState<VideoSourceInfo>({
    name: 'Atelier Dark Silk (Preset)',
    url: '',
    duration: 6.0,
    width: 1280,
    height: 720,
    isSample: true,
  });

  const [settings, setSettings] = useState<LoopSettings>({
    mode: 'crossfade',
    inPoint: 0,
    outPoint: 6.0,
    crossfadeDuration: 1.2,
    crossfadeCurve: 'cosine',
    playbackRate: 1.0,
    muted: true,
    volume: 0.8,
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loopCount, setLoopCount] = useState(0);

  // Seam alignment & analysis state
  const [seamResult, setSeamResult] = useState<SeamAnalysisResult | null>(null);
  const [isAnalyzingSeam, setIsAnalyzingSeam] = useState(false);
  const [startFrameUrl, setStartFrameUrl] = useState<string | null>(null);
  const [endFrameUrl, setEndFrameUrl] = useState<string | null>(null);
  const [diffMapUrl, setDiffMapUrl] = useState<string | null>(null);

  // Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSeamInspectorOpen, setIsSeamInspectorOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisVideoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize sample video matching the user's luxury floating cloth request
  useEffect(() => {
    let isCancelled = false;

    async function initSample() {
      try {
        const blob = await generateSampleVideoBlob(6.0, 1280, 720, 30);
        if (isCancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        setVideoSource({
          name: 'Atelier Dark Silk (Sample)',
          url: blobUrl,
          duration: 6.0,
          width: 1280,
          height: 720,
          isSample: true,
        });
        setSettings((s) => ({
          ...s,
          inPoint: 0,
          outPoint: 6.0,
        }));
      } catch (err) {
        console.error('Failed generating sample video', err);
      }
    }

    initSample();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Update Seam Analysis whenever video URL, inPoint, or outPoint changes
  const runSeamAnalysis = useCallback(
    async (vidUrl: string, inP: number, outP: number) => {
      if (!vidUrl) return;
      setIsAnalyzingSeam(true);

      try {
        let tempVid = analysisVideoRef.current;
        if (!tempVid) {
          tempVid = document.createElement('video');
          tempVid.crossOrigin = 'anonymous';
          tempVid.muted = true;
          tempVid.playsInline = true;
          analysisVideoRef.current = tempVid;
        }

        if (tempVid.src !== vidUrl) {
          tempVid.src = vidUrl;
          await new Promise((r) => {
            tempVid!.onloadedmetadata = r;
          });
        }

        // Capture Start frame and End frame
        const startResult = await captureVideoFrame(tempVid, inP, 240, 135);
        const endResult = await captureVideoFrame(tempVid, Math.max(inP + 0.1, outP - 0.05), 240, 135);

        const { similarity, diffCanvasUrl } = calculateFrameSimilarity(
          startResult.imageData,
          endResult.imageData
        );

        setStartFrameUrl(startResult.dataUrl);
        setEndFrameUrl(endResult.dataUrl);
        setDiffMapUrl(diffCanvasUrl);

        const evalResult = evaluateSeamScore(similarity);
        setSeamResult(evalResult);
      } catch (e) {
        console.warn('Seam analysis skipped', e);
      } finally {
        setIsAnalyzingSeam(false);
      }
    },
    []
  );

  // Trigger analysis with debouncing on trim changes
  useEffect(() => {
    if (!videoSource.url) return;
    const timer = setTimeout(() => {
      runSeamAnalysis(videoSource.url, settings.inPoint, settings.outPoint);
    }, 450);
    return () => clearTimeout(timer);
  }, [videoSource.url, settings.inPoint, settings.outPoint, runSeamAnalysis]);

  // Load a user-provided video file
  const handleLoadVideoFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const tempVid = document.createElement('video');
    tempVid.src = url;
    tempVid.preload = 'metadata';

    tempVid.onloadedmetadata = () => {
      const dur = tempVid.duration || 6.0;
      const w = tempVid.videoWidth || 1280;
      const h = tempVid.videoHeight || 720;

      setVideoSource({
        name: file.name,
        url,
        duration: dur,
        width: w,
        height: h,
        isSample: false,
      });

      setSettings((s) => ({
        ...s,
        inPoint: 0,
        outPoint: dur,
        crossfadeDuration: Math.min(1.5, Math.max(0.5, dur * 0.2)),
      }));

      setLoopCount(0);
      setCurrentTime(0);
      setIsPlaying(true);
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleLoadVideoFile(e.target.files[0]);
    }
  };

  const handleUpdateSettings = (updates: Partial<LoopSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      if (currentUser) {
        try {
          localStorage.setItem(`vlooper_settings_${currentUser.id}`, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  // Restore this specific user's saved loop settings
  useEffect(() => {
    if (!currentUser) return;
    try {
      const saved = localStorage.getItem(`vlooper_settings_${currentUser.id}`);
      if (saved) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // ignore
    }
  }, [currentUser?.id]);

  // Automated Best Seam Finder
  const handleAutoFindBestSeam = async () => {
    if (!videoSource.url) return;
    setIsAnalyzingSeam(true);

    try {
      let tempVid = analysisVideoRef.current;
      if (!tempVid) {
        tempVid = document.createElement('video');
        tempVid.src = videoSource.url;
        tempVid.crossOrigin = 'anonymous';
        tempVid.muted = true;
        analysisVideoRef.current = tempVid;
        await new Promise((r) => { tempVid!.onloadedmetadata = r; });
      }

      const inFrame = await captureVideoFrame(tempVid, settings.inPoint, 120, 68);
      const searchRadius = 1.5; // search around current outPoint
      const steps = 12;
      let bestOut = settings.outPoint;
      let highestSimilarity = -1;

      for (let i = 0; i <= steps; i++) {
        const offset = -searchRadius + (i / steps) * (searchRadius * 2);
        const candidateOut = Math.max(settings.inPoint + 0.8, Math.min(videoSource.duration, settings.outPoint + offset));
        const candidateFrame = await captureVideoFrame(tempVid, candidateOut, 120, 68);
        const { similarity } = calculateFrameSimilarity(inFrame.imageData, candidateFrame.imageData);

        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestOut = candidateOut;
        }
      }

      handleUpdateSettings({ outPoint: bestOut });
      runSeamAnalysis(videoSource.url, settings.inPoint, bestOut);
    } catch (err) {
      console.error('Error during auto-fit seam:', err);
    } finally {
      setIsAnalyzingSeam(false);
    }
  };

  const handleResetLoop = () => {
    setSettings((s) => ({
      ...s,
      inPoint: 0,
      outPoint: videoSource.duration,
      crossfadeDuration: 1.2,
      mode: 'crossfade',
      playbackRate: 1.0,
    }));
    setCurrentTime(0);
    setLoopCount(0);
  };

  // If not logged in, render the dedicated Authentication & Social Sign up screen at start
  if (!currentUser) {
    return (
      <>
        <AuthScreen />
        <AdminPanelModal />
        <PaymentModal />
        <AuthModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Studio Header */}
      <header className="border-b border-stone-800/80 bg-stone-900/60 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 shadow-[0_0_15px_rgba(245,158,11,0.35)]">
              <Film className="w-4 h-4 fill-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-stone-100">Video Looper</h1>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                  Gapless Engine
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate max-w-xs md:max-w-md">
                {videoSource.name}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Admin or Credit Status Controls */}
            {isAdmin ? (
              <button
                id="open-admin-panel-btn"
                onClick={() => setShowAdminModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 border border-amber-300 rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all"
                title="Super Admin Control Panel (@yusufadmin)"
              >
                <ShieldCheck className="w-3.5 h-3.5 fill-stone-950" />
                <span>Admin Panel</span>
                <span className="text-[10px] bg-stone-950/20 px-1 rounded font-mono">Free</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs font-mono"
                  title="Your loop render credits (1 Rs = 1 Credit)"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-stone-300 font-semibold">
                    {currentUser.unlimitedAccess ? 'Unlimited' : `${currentUser.credits} Credits`}
                  </span>
                </div>

                <button
                  id="open-payment-modal-btn"
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all"
                  title="Buy credits via UPI QR, GPay, PhonePe, Paytm (₹1 = 1 Credit)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Buy Credits</span>
                  <span className="text-[10px] text-amber-400/80 font-mono">(₹1 = 1 Cr)</span>
                </button>
              </div>
            )}

            {/* Profile / Account Switcher Button */}
            <button
              id="open-auth-modal-btn"
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800/70 hover:bg-stone-700/70 border border-stone-700/50 text-xs text-stone-300 hover:text-white transition-colors font-mono"
              title={`Logged in as @${currentUser.username} (${currentUser.email})`}
            >
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span className="max-w-[110px] truncate">@{currentUser.username}</span>
            </button>

            {/* Sign Out Button */}
            <button
              id="logout-header-btn"
              onClick={logout}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800/60 hover:bg-rose-950/40 border border-stone-700/50 hover:border-rose-700/40 text-xs text-stone-400 hover:text-rose-300 transition-colors"
              title="Sign out of your account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Sign Out</span>
            </button>

            <div className="h-4 w-px bg-stone-800 hidden sm:block" />

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              id="upload-video-header-btn"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/60 rounded-xl transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Clip</span>
            </button>

            <button
              id="inspect-seam-header-btn"
              onClick={() => setIsSeamInspectorOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-amber-300 bg-stone-800/60 hover:bg-stone-800 border border-stone-700/60 rounded-xl transition-colors"
            >
              <SplitSquareHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Seam Inspector</span>
            </button>

            <button
              id="reset-loop-btn"
              onClick={handleResetLoop}
              title="Reset loop boundaries"
              className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="export-video-header-btn"
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.3)] transition-all transform hover:scale-[1.02]"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Export Looped Video</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col gap-5">
        {/* Video Player Stage */}
        {videoSource.url ? (
          <VideoPlayer
            source={videoSource}
            settings={settings}
            currentTime={currentTime}
            setCurrentTime={setCurrentTime}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            loopCount={loopCount}
            setLoopCount={setLoopCount}
            onDropVideoFile={handleLoadVideoFile}
          />
        ) : (
          <div className="w-full aspect-video bg-stone-900/50 rounded-2xl border border-stone-800 flex items-center justify-center">
            <div className="text-center text-stone-400">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-xs">Preparing video stream...</p>
            </div>
          </div>
        )}

        {/* Timeline Trimmer & Scrubbing Controller */}
        <TimelineController
          duration={videoSource.duration}
          currentTime={currentTime}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onSeek={(time) => {
            setCurrentTime(time);
            setIsPlaying(false);
          }}
          onAutoFindSeam={handleAutoFindBestSeam}
          isAnalyzingSeam={isAnalyzingSeam}
        />

        {/* Algorithm, Speed, and Audio Settings Panel */}
        <LoopControlPanel
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          seamResult={seamResult}
          onOpenSeamInspector={() => setIsSeamInspectorOpen(true)}
        />

        {/* Informational Workflow Bar */}
        <div className="bg-stone-900/40 border border-stone-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400/80 flex-shrink-0" />
            <span>
              <strong>Crossfade Dissolve:</strong> The first {settings.crossfadeDuration.toFixed(1)}s dissolves continuously over the clip's tail for an invisible, stutter-free loop cycle.
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-stone-500 whitespace-nowrap">
            <span>DRAG & DROP ANY CLIP</span>
            <span>•</span>
            <span>SPACEBAR TO PLAY</span>
          </div>
        </div>
      </main>

      {/* Export Looped Video Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        videoSourceUrl={videoSource.url}
        sourceName={videoSource.name}
        settings={settings}
      />

      {/* Seam Alignment Inspector Modal */}
      <SeamInspectorModal
        isOpen={isSeamInspectorOpen}
        onClose={() => setIsSeamInspectorOpen(false)}
        startFrameUrl={startFrameUrl}
        endFrameUrl={endFrameUrl}
        diffMapUrl={diffMapUrl}
        seamResult={seamResult}
        onApplyRecommendedCrossfade={() => {
          handleUpdateSettings({
            mode: 'crossfade',
            crossfadeDuration: 1.2,
            crossfadeCurve: 'cosine',
          });
          setIsSeamInspectorOpen(false);
        }}
      />

      {/* Super Admin Control Panel */}
      <AdminPanelModal />

      {/* Paywall & QR Payment Modal */}
      <PaymentModal />

      {/* User Login / Switcher Modal */}
      <AuthModal />
    </div>
  );
}
