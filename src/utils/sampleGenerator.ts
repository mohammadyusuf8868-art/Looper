import fixWebmDuration from 'fix-webm-duration';

/**
 * Procedural sample video generator matching the aesthetic of the uploaded video:
 * Luxury atelier floating dark charcoal silk cloth with golden dust motes and warm rim lighting.
 */

export function drawFabricFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
) {
  // Background atelier gradient
  const bgGrad = ctx.createRadialGradient(
    width * 0.75,
    height * 0.35,
    50,
    width * 0.5,
    height * 0.5,
    Math.max(width, height)
  );
  bgGrad.addColorStop(0, '#1c1917'); // warm dark charcoal / sepia
  bgGrad.addColorStop(0.4, '#0c0a09');
  bgGrad.addColorStop(1, '#050505');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Soft warm spotlight in background
  const spotGrad = ctx.createRadialGradient(
    width * 0.8,
    height * 0.25,
    10,
    width * 0.8,
    height * 0.25,
    width * 0.4
  );
  spotGrad.addColorStop(0, 'rgba(217, 119, 6, 0.18)');
  spotGrad.addColorStop(0.5, 'rgba(180, 83, 9, 0.05)');
  spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(0, 0, width, height);

  // Atelier mannequin silhouette in the background (faint)
  ctx.save();
  ctx.fillStyle = 'rgba(28, 25, 23, 0.4)';
  ctx.beginPath();
  const mqX = width * 0.84;
  const mqY = height * 0.38;
  ctx.ellipse(mqX, mqY, width * 0.045, height * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(mqX - width * 0.05, mqY + height * 0.06, width * 0.1, height * 0.35);
  ctx.restore();

  // Floating fabric folds simulation (composed of 4 layered wave ribbons)
  const ribbonCount = 4;
  for (let r = 0; r < ribbonCount; r++) {
    ctx.save();

    const layerOffset = r * 1.4;
    const baseHeight = height * (0.42 + r * 0.12);
    const waveSpeed = 0.8;
    const t = time * waveSpeed + layerOffset;

    ctx.beginPath();
    ctx.moveTo(-50, height + 50);

    const step = 8;
    const points: { x: number; y: number; norm: number }[] = [];

    for (let x = -50; x <= width + 50; x += step) {
      const nx = x / width;
      // Multi-frequency wave for organic cloth drape
      const wave1 = Math.sin(nx * 3.2 - t) * 45;
      const wave2 = Math.cos(nx * 5.5 + t * 0.7) * 25;
      const wave3 = Math.sin(nx * 1.8 - t * 0.4) * 35;
      const taper = Math.sin(nx * Math.PI) * 0.3 + 0.7;

      const y = baseHeight + (wave1 + wave2 + wave3) * taper;
      points.push({ x, y, norm: nx });
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width + 50, height + 50);
    ctx.closePath();

    // Fabric shading gradient: Charcoal silk with specular gold highlights on crests
    const fabricGrad = ctx.createLinearGradient(0, baseHeight - 60, width, baseHeight + 120);
    if (r === 0) {
      fabricGrad.addColorStop(0, '#292524');
      fabricGrad.addColorStop(0.35, '#44403c');
      fabricGrad.addColorStop(0.5, '#78716c'); // crest highlight
      fabricGrad.addColorStop(0.7, '#1c1917');
      fabricGrad.addColorStop(1, '#0c0a09');
    } else if (r === 1) {
      fabricGrad.addColorStop(0, '#1c1917');
      fabricGrad.addColorStop(0.4, '#38322e');
      fabricGrad.addColorStop(0.65, '#57534e');
      fabricGrad.addColorStop(1, '#0a0a0a');
    } else {
      fabricGrad.addColorStop(0, '#141210');
      fabricGrad.addColorStop(0.5, '#292524');
      fabricGrad.addColorStop(1, '#050505');
    }

    ctx.fillStyle = fabricGrad;
    ctx.fill();

    // Golden specular rim along the crest of the fabric
    ctx.lineWidth = r === 0 ? 3.0 : 1.8;
    const rimGrad = ctx.createLinearGradient(0, 0, width, 0);
    rimGrad.addColorStop(0, 'rgba(251, 191, 36, 0.05)');
    rimGrad.addColorStop(0.35, 'rgba(251, 191, 36, 0.45)');
    rimGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.85)');
    rimGrad.addColorStop(0.85, 'rgba(217, 119, 6, 0.3)');
    rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.strokeStyle = rimGrad;

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) ctx.moveTo(points[i].x, points[i].y);
      else ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Subtle fine textile weave texture lines across the ribbon
    if (r <= 1) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      for (let w = 0; w < points.length; w += 4) {
        const pt = points[w];
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + 18, pt.y + 70);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  // Floating luminous gold dust motes / bokeh particles
  const particleCount = 28;
  ctx.save();
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 137.508;
    const pxNorm = (Math.sin(seed) * 0.5 + 0.5);
    const pyNorm = (Math.cos(seed * 1.3) * 0.5 + 0.5);

    // Continuous drift
    const driftX = Math.sin(time * 0.5 + seed) * 20;
    const driftY = -((time * 12 + seed * 10) % (height + 40)) + height + 20;
    const x = (pxNorm * width + driftX) % width;
    const y = driftY;

    const size = 1.2 + (Math.sin(seed * 2.1) * 0.5 + 0.5) * 2.4;
    const alpha = 0.2 + (Math.sin(time * 2 + seed) * 0.5 + 0.5) * 0.6;

    ctx.fillStyle = `rgba(252, 211, 77, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Subtle glow
    if (size > 2.0) {
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Subtle vignette
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.35,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Creates a playable video Blob from the procedural fabric generator
 * so that both native `<video>` elements and dual-buffer looper engines
 * can process it as real video data.
 */
export async function generateSampleVideoBlob(
  durationSeconds = 6,
  width = 854,
  height = 480,
  fps = 30
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const stream = canvas.captureStream(fps);
    const mimeTypes = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
    } catch {
      mediaRecorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {}
      const rawBlob = new Blob(chunks, { type: selectedMime || 'video/webm' });
      try {
        const fixed = await fixWebmDuration(rawBlob, Math.round(durationSeconds * 1000));
        resolve(fixed);
      } catch {
        resolve(rawBlob);
      }
    };

    mediaRecorder.onerror = (err) => {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {}
      reject(err);
    };

    mediaRecorder.start();

    const totalFrames = Math.round(durationSeconds * fps);
    let currentFrame = 0;

    const frameInterval = setInterval(() => {
      if (currentFrame >= totalFrames) {
        clearInterval(frameInterval);
        mediaRecorder.stop();
        return;
      }

      const t = currentFrame / fps;
      drawFabricFrame(ctx, width, height, t);
      currentFrame++;
    }, 1000 / fps);
  });
}
