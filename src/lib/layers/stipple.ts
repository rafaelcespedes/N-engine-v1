/**
 * Stipple layer renderer: paints the sampled dot set onto its offscreen canvas.
 *
 * Point *generation* lives in `../stipple/sample.ts` (pure, portable to Python).
 * This file only draws — ground fill plus one mark per dot.
 */

import type { StippleParams } from "../params";
import type { Dot } from "../stipple/sample";

/** Rec.709 luma of a #rrggbb color, 0–1. */
function luma(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** The dot color for mono/duotone modes. "source" colors are carried per-dot. */
export function dotColorFor(params: StippleParams): string {
  return params.colors[0] ?? "#000000";
}

/**
 * Ground (paper) is the contrast of the ink, so a piece reads regardless of invert:
 * black ink → white paper, white ink → black paper.
 */
export function groundFor(params: StippleParams): string {
  return luma(dotColorFor(params)) > 0.5 ? "#0b0b0b" : "#f4f4f2";
}

export function drawStipple(
  ctx: OffscreenCanvasRenderingContext2D,
  dots: Dot[],
  params: StippleParams,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = groundFor(params);
  ctx.fillRect(0, 0, width, height);

  const mono = dotColorFor(params);
  const useSource = params.colorMode === "source";

  if (params.shape === "circle") {
    // Batch same-color circles into one path — far fewer state changes.
    if (!useSource) {
      ctx.fillStyle = mono;
      ctx.beginPath();
      for (const d of dots) {
        ctx.moveTo(d.x + d.r, d.y);
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      }
      ctx.fill();
    } else {
      for (const d of dots) {
        ctx.fillStyle = d.color ?? mono;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  // Square / glyph: draw centered on each point.
  ctx.fillStyle = mono;
  for (const d of dots) {
    if (useSource) ctx.fillStyle = d.color ?? mono;
    const s = d.r * 2;
    if (params.shape === "square") {
      ctx.fillRect(d.x - d.r, d.y - d.r, s, s);
    } else {
      // "glyph" — a small cross/plus. A brand hook; swap freely.
      const t = Math.max(0.6, d.r * 0.5);
      ctx.fillRect(d.x - d.r, d.y - t / 2, s, t);
      ctx.fillRect(d.x - t / 2, d.y - d.r, t, s);
    }
  }
}
