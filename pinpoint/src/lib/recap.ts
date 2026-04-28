/**
 * Animated Lane-Recap-Export.
 *
 * Renders a 6-second video of the played lane: each photo flies in as a
 * polaroid, the route line draws progressively across a stylised world,
 * and the final score lands as a rubber-stamp at the end.
 *
 * Implementation note: We avoid FFmpeg.wasm (~25 MB) and instead use a
 * Canvas + MediaRecorder pipeline — produces a clean .webm without any
 * extra dependencies and stays inside the static-export envelope.
 */

import type { Guess, Photo } from "./types";
import { formatDistance } from "./geo";

export interface RecapOptions {
  title: string;
  guesses: Guess[];
  photos: Photo[];
  totalScore: number;
  width?: number;
  height?: number;
  fps?: number;
  durationMs?: number;
  onProgress?: (pct: number) => void;
}

// Equirectangular projection (lng/lat → x/y) onto a target rectangle.
function project(lat: number, lng: number, w: number, h: number, padX: number, padY: number) {
  const x = padX + ((lng + 180) / 360) * (w - 2 * padX);
  const y = padY + ((90 - lat) / 180) * (h - 2 * padY);
  return { x, y };
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // We keep the URL alive until the image is drawn; revoke later by caller.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Pick the best supported MIME type for MediaRecorder. Safari may not
 * support webm at all — caller should handle the rejection.
 */
function pickMime(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

export async function exportLaneRecap(opts: RecapOptions): Promise<Blob> {
  const W = opts.width ?? 1280;
  const H = opts.height ?? 720;
  const fps = opts.fps ?? 30;
  const duration = opts.durationMs ?? Math.max(4500, opts.photos.length * 900 + 1500);
  const mime = pickMime();
  if (!mime) {
    throw new Error("Dein Browser unterstützt kein .webm-Recording. Versuch es in Chrome oder Firefox.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas-Kontext nicht verfügbar.");

  // Pre-load photo bitmaps (use thumbs to stay light).
  const imgs = await Promise.all(opts.photos.map((p) => loadImage(p.thumbBlob)));

  // Project route points into the lower-half map area.
  const mapPad = 80;
  const mapTop = 200;
  const mapH = H - mapTop - 60;
  const points = opts.photos.map((p) =>
    project(p.lat, p.lng, W, mapH, mapPad, 0)
  ).map((pt) => ({ x: pt.x, y: mapTop + pt.y }));

  const drawFrame = (t: number) => {
    // t in [0,1]
    // 1) Paper background
    ctx.fillStyle = "#f1e7d0";
    ctx.fillRect(0, 0, W, H);

    // Subtle grain via diagonal lines
    ctx.strokeStyle = "rgba(28,26,22,0.04)";
    ctx.lineWidth = 1;
    for (let i = -H; i < W; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + H, H);
      ctx.stroke();
    }

    // 2) Title bar
    ctx.fillStyle = "#1c1a16";
    ctx.font = "700 56px 'Fraunces', 'Georgia', serif";
    ctx.textBaseline = "top";
    ctx.fillText(opts.title, 60, 60);

    ctx.fillStyle = "#6e6552";
    ctx.font = "500 18px 'JetBrains Mono', monospace";
    ctx.fillText(`MEMORY LANE · ${opts.photos.length} STATIONEN`, 60, 130);

    // 3) Stylised world strip (just a base bar with dashed grid)
    ctx.fillStyle = "#ecdfc1";
    ctx.fillRect(40, mapTop - 10, W - 80, mapH + 20);
    ctx.strokeStyle = "#1c1a16";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, mapTop - 10, W - 80, mapH + 20);

    ctx.strokeStyle = "rgba(28,26,22,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    for (let x = 40; x <= W - 40; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, mapTop - 10);
      ctx.lineTo(x, mapTop + mapH + 10);
      ctx.stroke();
    }
    for (let y = mapTop; y <= mapTop + mapH; y += 60) {
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(W - 40, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 4) Progressive route line + pins
    const routeT = Math.min(1, Math.max(0, (t - 0.15) / 0.65));
    if (points.length > 1) {
      ctx.strokeStyle = "#c33129";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      const totalSeg = points.length - 1;
      const completedSegs = routeT * totalSeg;
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const segProgress = Math.max(0, Math.min(1, completedSegs - (i - 1)));
        if (segProgress <= 0) break;
        const px = points[i - 1].x + (points[i].x - points[i - 1].x) * segProgress;
        const py = points[i - 1].y + (points[i].y - points[i - 1].y) * segProgress;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw pin teardrops up to current segment
    const visiblePins = Math.floor(routeT * points.length) + 1;
    for (let i = 0; i < Math.min(visiblePins, points.length); i++) {
      const p = points[i];
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.fillStyle = "#c33129";
      ctx.strokeStyle = "#1c1a16";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -8, 8, Math.PI, 0);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#1c1a16";
      ctx.beginPath();
      ctx.arc(0, -8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5) Polaroid strip — slide in from left over time
    const polaroidSize = 100;
    const polaroidGap = 18;
    const polaroidY = mapTop + mapH + 20;
    const stripW = imgs.length * (polaroidSize + polaroidGap);
    const stripStartX = (W - stripW) / 2;
    for (let i = 0; i < imgs.length; i++) {
      const enterT = Math.min(1, Math.max(0, (t - 0.05 - i * 0.08) / 0.35));
      if (enterT <= 0) continue;
      const e = easeOut(enterT);
      const x = stripStartX + i * (polaroidSize + polaroidGap);
      const y = polaroidY + (1 - e) * 60;
      const rot = ((i % 2 === 0 ? -1 : 1) * (1 - e * 0.4) * 0.06);
      ctx.save();
      ctx.translate(x + polaroidSize / 2, y + polaroidSize / 2);
      ctx.rotate(rot);
      ctx.fillStyle = "#fdfaf0";
      ctx.shadowColor = "rgba(28,26,22,0.35)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.fillRect(-polaroidSize / 2, -polaroidSize / 2, polaroidSize, polaroidSize);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = "#1c1a16";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-polaroidSize / 2, -polaroidSize / 2, polaroidSize, polaroidSize);

      // Image fits inside with a small caption gutter
      const inset = 6;
      const imgH = polaroidSize - inset * 2 - 16;
      ctx.drawImage(
        imgs[i],
        -polaroidSize / 2 + inset,
        -polaroidSize / 2 + inset,
        polaroidSize - inset * 2,
        imgH
      );
      // Caption number
      ctx.fillStyle = "#1c1a16";
      ctx.font = "italic 600 14px 'Caveat', cursive";
      ctx.textAlign = "center";
      ctx.fillText(`#${i + 1}`, 0, polaroidSize / 2 - 6);
      ctx.textAlign = "start";
      ctx.restore();
    }

    // 6) Final stamp
    if (t > 0.78) {
      const stampT = Math.min(1, (t - 0.78) / 0.18);
      const e = easeOut(stampT);
      ctx.save();
      ctx.translate(W - 200, 110);
      ctx.rotate(-0.18 + (1 - e) * 0.4);
      const scale = 0.6 + e * 0.5;
      ctx.scale(scale, scale);
      ctx.globalAlpha = e;
      ctx.strokeStyle = "#c33129";
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-110, -45, 220, 90);
      ctx.setLineDash([]);
      ctx.fillStyle = "#c33129";
      ctx.font = "700 14px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("FINAL SCORE", 0, -22);
      ctx.font = "900 38px 'Fraunces', serif";
      ctx.fillStyle = "#1c1a16";
      ctx.fillText(opts.totalScore.toLocaleString("de-DE"), 0, 18);
      ctx.textAlign = "start";
      ctx.restore();
    }

    // 7) Watermark
    ctx.fillStyle = "#6e6552";
    ctx.font = "500 14px 'JetBrains Mono', monospace";
    ctx.fillText("PINPOINT · MEMORY LANE", 60, H - 30);

    // Total distance summary on bottom-right
    const totalDist = opts.guesses.reduce((s, g) => s + g.distanceKm, 0);
    ctx.textAlign = "end";
    ctx.fillText(`Σ ${formatDistance(totalDist)}`, W - 60, H - 30);
    ctx.textAlign = "start";
  };

  // Capture stream from canvas
  const stream: MediaStream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = (e) => reject(e);
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });

  recorder.start();
  const startTs = performance.now();

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - startTs;
      const t = Math.min(1, elapsed / duration);
      drawFrame(t);
      opts.onProgress?.(t);
      if (t >= 1) {
        // hold a final frame for ~0.4s so player sees the stamp
        setTimeout(() => {
          recorder.stop();
          resolve();
        }, 400);
      } else {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  });

  return done;
}
