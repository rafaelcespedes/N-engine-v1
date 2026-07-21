/**
 * Diagonal layer: a single hairline stroke corner-to-corner across a cell — top-left to
 * bottom-right, or top-right to bottom-left, decided per cell off the seed.
 *
 * It has no control of its own. Density rides on the Panel section's density slider, and
 * strokes only land in cells the panel layer left empty (via `panelFillMap`), so the two
 * layers never overlap. Same color and opacity as the grid lines.
 *
 * Animated, each stroke draws itself from its top corner down to its bottom corner, on
 * the same reveal window and per-cell stagger the panels use — so the two build in
 * together rather than in sequence.
 */

import type { Grid } from "../grid";
import { makeRng, deriveSeed } from "../rng";
import { easeOutCubic } from "../animate";
import { WIPE_DUR } from "./panels";

export function drawDiagonals(
  ctx: OffscreenCanvasRenderingContext2D,
  grid: Grid,
  seed: number,
  density: number,
  /** Cells the panel layer filled; null when panels are off (every cell is free). */
  panelFilled: boolean[] | null,
  /** 0..1 opacity multiplier. */
  alpha = 1,
  /** 0..1 animation reveal — each stroke draws top-to-bottom. 1 = static. */
  reveal = 1
): void {
  if (alpha <= 0 || reveal <= 0 || density <= 0) return;

  const n = grid.cells.length;
  const rng = makeRng(deriveSeed(seed, "diagonals"));
  const srng = makeRng(deriveSeed(seed, "diagonal-anim"));

  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.22 * alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let i = 0; i < n; i++) {
    // Draw both streams for every cell so the sequence stays stable regardless of
    // which cells the panels happened to take.
    const on = rng();
    const flip = rng();
    const stagger = srng() * (1 - WIPE_DUR);

    if (panelFilled?.[i]) continue;
    if (on >= density) continue;

    const p =
      reveal >= 1
        ? 1
        : easeOutCubic(Math.min(1, Math.max(0, (reveal - stagger) / WIPE_DUR)));
    if (p <= 0) continue;

    const cell = grid.cells[i];
    // Both variants start at a top corner and end at the opposite bottom one, so the
    // draw-on always runs downward.
    const x0 = flip < 0.5 ? cell.x : cell.x + cell.w;
    const x1 = flip < 0.5 ? cell.x + cell.w : cell.x;
    const y0 = cell.y;
    const y1 = cell.y + cell.h;

    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + (x1 - x0) * p, y0 + (y1 - y0) * p);
  }

  ctx.stroke();
  ctx.restore();
}
