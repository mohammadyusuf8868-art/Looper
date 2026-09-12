import { SeamAnalysisResult } from '../types';

/**
 * Captures a video frame as an ImageData object at a specified time
 */
export async function captureVideoFrame(
  video: HTMLVideoElement,
  time: number,
  targetWidth = 160,
  targetHeight = 90
): Promise<{ imageData: ImageData; dataUrl: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const prevTime = video.currentTime;
  const wasPlaying = !video.paused;
  if (wasPlaying) video.pause();

  return new Promise((resolve) => {
    const target = Math.max(0, Math.min(video.duration || 10, time));
    let resolved = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      if (wasPlaying) {
        video.currentTime = prevTime;
        video.play().catch(() => {});
      } else {
        video.currentTime = prevTime;
      }
      resolve({ imageData, dataUrl });
    };

    const onSeeked = () => finish();

    if (Math.abs(video.currentTime - target) < 0.005) {
      finish();
      return;
    }

    timer = setTimeout(finish, 350);
    video.addEventListener('seeked', onSeeked);
    video.currentTime = target;
  });
}

/**
 * Calculates pixel difference similarity between two ImageDatas
 */
export function calculateFrameSimilarity(
  img1: ImageData,
  img2: ImageData
): { similarity: number; diffCanvasUrl: string } {
  const len = img1.data.length;
  let totalDiff = 0;
  const maxPossibleDiff = (len / 4) * 255 * 3;

  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = img1.width;
  diffCanvas.height = img1.height;
  const diffCtx = diffCanvas.getContext('2d');
  const diffData = diffCtx ? diffCtx.createImageData(img1.width, img1.height) : null;

  for (let i = 0; i < len; i += 4) {
    const dr = Math.abs(img1.data[i] - img2.data[i]);
    const dg = Math.abs(img1.data[i + 1] - img2.data[i + 1]);
    const db = Math.abs(img1.data[i + 2] - img2.data[i + 2]);
    const pxDiff = dr + dg + db;
    totalDiff += pxDiff;

    if (diffData) {
      // Heatmap of difference: amber/red for changes, dark for identical
      const norm = Math.min(255, (pxDiff / 3) * 2.5);
      diffData.data[i] = norm; // R
      diffData.data[i + 1] = norm * 0.4; // G
      diffData.data[i + 2] = norm * 0.1; // B
      diffData.data[i + 3] = 255; // A
    }
  }

  if (diffCtx && diffData) {
    diffCtx.putImageData(diffData, 0, 0);
  }

  const similarity = Math.max(0, Math.min(100, (1 - totalDiff / maxPossibleDiff) * 100));
  const diffCanvasUrl = diffCanvas.toDataURL();

  return { similarity, diffCanvasUrl };
}

export function evaluateSeamScore(similarityScore: number): SeamAnalysisResult {
  if (similarityScore >= 92) {
    return {
      similarityScore: Math.round(similarityScore),
      rating: 'Perfect',
      description: 'Virtually seamless match. No perceptible jump cut or artifact.',
    };
  } else if (similarityScore >= 80) {
    return {
      similarityScore: Math.round(similarityScore),
      rating: 'Excellent',
      description: 'Very smooth transition. Minor motion blends invisibly with crossfade.',
    };
  } else if (similarityScore >= 65) {
    return {
      similarityScore: Math.round(similarityScore),
      rating: 'Good',
      description: 'Moderate frame variance. Recommended to use 1.0s - 1.5s crossfade.',
    };
  } else {
    return {
      similarityScore: Math.round(similarityScore),
      rating: 'Fair',
      description: 'Noticeable frame change. Use Crossfade mode (1.5s+) or Ping-Pong mode.',
    };
  }
}
