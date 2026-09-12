export type LoopMode = 'crossfade' | 'pingpong' | 'standard';

export type CrossfadeCurve = 'cosine' | 'linear' | 'ease-in-out';

export interface VideoSourceInfo {
  name: string;
  url: string;
  duration: number;
  width: number;
  height: number;
  isSample?: boolean;
}

export interface LoopSettings {
  mode: LoopMode;
  inPoint: number;
  outPoint: number;
  crossfadeDuration: number;
  crossfadeCurve: CrossfadeCurve;
  playbackRate: number;
  muted: boolean;
  volume: number;
}

export type ExportDurationMode = 'single' | 'repeats' | 'custom_time';
export type ExportResolution = 'original' | '1080p' | '720p' | '540p';
export type ExportFps = 24 | 30 | 60;
export type ExportBitrate = 'auto' | 'high' | 'economy';

export interface ExportSettings {
  durationMode: ExportDurationMode;
  repeats: number;
  targetSeconds: number;
  format: 'webm' | 'mp4';
  quality: 'high' | 'medium';
  resolution: ExportResolution;
  fps: ExportFps;
  bitratePreset: ExportBitrate;
}

export interface SeamAnalysisResult {
  similarityScore: number; // 0 to 100
  rating: 'Perfect' | 'Excellent' | 'Good' | 'Fair';
  description: string;
}
