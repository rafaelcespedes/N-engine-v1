/**
 * Grid-lines layer: hairlines on the interior cell boundaries only — the outer perimeter
 * is skipped so the render has no framing border. Reads geometry from `buildGrid` — never
 * recompute it here.
 *
 * Drawn in the overlay pass, above panels but below the plate, so the plate reads as one
 * clean block (matching the reference comps).
 */

import type { Grid } from "../grid";

export function drawGridLines(
  ctx: OffscreenCanvasRenderingContext2D,
  grid: Grid,
  /** 0..1 animation opacity multiplier. 1 = static. */
  alpha = 1
): void {
  if (alpha <= 0) return;
  const { spec, cellW, cellH, width, height } = grid;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.22 * alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // Interior lines only (1..n-1) — no edge lines. +0.5 keeps 1px lines crisp.
  for (let c = 1; c < spec.cols; c++) {
    const x = Math.round(c * cellW) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let r = 1; r < spec.rows; r++) {
    const y = Math.round(r * cellH) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
  ctx.restore();
}
