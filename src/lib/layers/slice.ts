/**
 * Slice-shift layer: shears the already-stippled art along grid lines.
 *
 * Per the docs' "default above the stipple" decision, this operates on the rendered
 * stipple canvas — so dots shear hard at cell boundaries (the brutal, graphic look).
 *
 * Axis follows direction: up/down shift columns vertically, left/right shift rows
 * horizontally. Each line gets its own seeded displacement in [0, offset] cells, signed
 * by direction — that variance is what makes the diced, offset-strip look in the comps.
 * Blank cells exposed by the shift are filled black.
 */

import type { Grid } from "../grid";
import type { OffsetDirection } from "../params";
import { makeRng, deriveSeed } from "../rng";

export function drawSlice(
  ctx: OffscreenCanvasRenderingContext2D,
  art: OffscreenCanvas,
  grid: Grid,
  offset: number,
  direction: OffsetDirection,
  seed: number,
  /** 0..1 animation multiplier on the displacement — 0 = aligned, 1 = fully shifted. */
  progress = 1
): void {
  const { spec, cellW, cellH, width, height } = grid;
  const vertical = direction === "up" || direction === "down";
  const sign = direction === "up" || direction === "left" ? -1 : 1;
  const rng = makeRng(deriveSeed(seed, "slice"));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  if (vertical) {
    for (let c = 0; c < spec.cols; c++) {
      const dy = Math.floor(rng() * (offset + 1)) * sign * cellH * progress;
      const sx = c * cellW;
      ctx.drawImage(art, sx, 0, cellW, height, sx, dy, cellW, height);
    }
  } else {
    for (let r = 0; r < spec.rows; r++) {
      const dx = Math.floor(rng() * (offset + 1)) * sign * cellW * progress;
      const sy = r * cellH;
      ctx.drawImage(art, 0, sy, width, cellH, dx, sy, width, cellH);
    }
  }
}
