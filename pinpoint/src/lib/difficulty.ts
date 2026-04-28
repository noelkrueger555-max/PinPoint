import type { Difficulty } from "./types";

/**
 * Auto-Difficulty heuristic — runs entirely in browser via Canvas.
 *
 * Signals:
 *  - skyRatio: more sky → harder (less context)
 *  - edgeDensity: lots of edges (text, signs, architecture) → easier
 *  - colorVariance: low variance (e.g. interior wall) → harder
 *
 * No ML, no server. Fast (~50ms for 256x256).
 */
export async function estimateDifficulty(blob: Blob): Promise<Difficulty> {
  const img = await blobToImage(blob);
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 3;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  let skyPixels = 0;
  let totalLuma = 0;
  const lumas: number[] = new Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // luminance
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      lumas[y * size + x] = luma;
      totalLuma += luma;
      // crude sky detector: top half + blueish + bright
      if (y < size / 2 && b > r && b > g * 0.9 && b > 120) skyPixels++;
    }
  }
  const meanLuma = totalLuma / (size * size);

  // variance
  let variance = 0;
  for (let i = 0; i < lumas.length; i++) {
    variance += (lumas[i] - meanLuma) ** 2;
  }
  variance /= lumas.length;

  // simple edge density via Sobel-ish horizontal gradient sample
  let edgeSum = 0;
  let edgeCount = 0;
  for (let y = 1; y < size - 1; y += 2) {
    for (let x = 1; x < size - 1; x += 2) {
      const c = lumas[y * size + x];
      const r = lumas[y * size + x + 1];
      const d = lumas[(y + 1) * size + x];
      edgeSum += Math.abs(c - r) + Math.abs(c - d);
      edgeCount++;
    }
  }
  const edgeDensity = edgeSum / edgeCount; // ~0..100+

  const skyRatio = skyPixels / ((size * size) / 2);

  // Score: lower score = easier
  // edgeDensity high → easier; skyRatio high → harder; variance low → harder
  let hardness = 0;
  hardness += skyRatio * 2.0;             // 0..2
  hardness += Math.max(0, 1 - edgeDensity / 25); // 0..1
  hardness += Math.max(0, 1 - variance / 3000);  // 0..1

  // Map hardness ~0..4 → difficulty 1..5
  if (hardness < 0.6) return 1;
  if (hardness < 1.2) return 2;
  if (hardness < 1.8) return 3;
  if (hardness < 2.6) return 4;
  return 5;
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
