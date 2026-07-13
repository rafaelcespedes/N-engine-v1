/**
 * Builds the luminance map the stippler samples from.
 *
 * Critical: downscale first. Sampling a 2048px image directly is the difference
 * between 60fps sliders and a frozen tab. Preview caps at PREVIEW_MAX; export
 * re-runs at full resolution.
 */

import type { StippleParams } from "../params";

export const PREVIEW_MAX = 1000;

export interface LuminanceMap {
  width: number;
  height: number;
  /** Density in [0,1]: 1 = maximum dot density. Already gamma'd, clipped, inverted. */
  data: Float32Array;
  /** Source RGB at map resolution — used by colorMode "source". */
  rgb: Uint8ClampedArray;
}

function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) };
}

/**
 * @param maxDim pass PREVIEW_MAX for interactive use, or the full width for export.
 */
export function buildLuminanceMap(
  source: ImageBitmap | HTMLImageElement,
  params: StippleParams,
  maxDim: number = PREVIEW_MAX
): LuminanceMap {
  const srcW = "width" in source ? source.width : 0;
  const srcH = "height" in source ? source.height : 0;
  const { w, h } = fitWithin(srcW, srcH, maxDim);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D context unavailable");

  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  const { data: rgba } = ctx.getImageData(0, 0, w, h);

  const data = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    // Rec. 709 luma.
    const lum = (0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2]) / 255;

    // Density is inverse luminance: dark areas want more dots.
    let d = params.invert ? lum : 1 - lum;

    // Tone curve. The single highest-impact control in the whole tool.
    d = Math.pow(d, params.gamma);

    // White clip: keep the paper clean.
    if (1 - d > params.whiteClip) d = 0;

    data[i] = d;
  }

  if (params.edgeEmphasis > 0) applyEdgeEmphasis(data, w, h, params.edgeEmphasis);

  return { width: w, height: h, data, rgb: rgba };
}

/**
 * Sobel pass boosting density along edges. This is what keeps faces and silhouettes
 * legible at low dot counts — the difference between a stipple and a smudge.
 */
function applyEdgeEmphasis(
  data: Float32Array,
  w: number,
  h: number,
  amount: number
): void {
  const edges = new Float32Array(data.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -data[i - w - 1] - 2 * data[i - 1] - data[i + w - 1] +
        data[i - w + 1] + 2 * data[i + 1] + data[i + w + 1];
      const gy =
        -data[i - w - 1] - 2 * data[i - w] - data[i - w + 1] +
        data[i + w - 1] + 2 * data[i + w] + data[i + w + 1];
      edges[i] = Math.min(1, Math.hypot(gx, gy));
    }
  }
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.min(1, data[i] + edges[i] * amount);
  }
}
