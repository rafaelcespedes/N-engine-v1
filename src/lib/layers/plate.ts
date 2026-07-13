/**
 * Plate layer: one solid, grid-snapped block that anchors the composition (in the
 * references it's the dark slab that holds a logo / headline / copy).
 *
 *   left   — left half
 *   right  — right half
 *   center — centered inset (~60%)
 *
 * `plateRect` returns the block in 0–1 fractions so the canvas fill and the DOM copy
 * overlay read the exact same geometry. A faint keyline keeps the block legible even
 * when its fill matches the ground.
 */

import type { Grid } from "../grid";
import type { GridPreset, PlatePlacement } from "../params";
import { GRID_PRESETS } from "../grid";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Plate block as 0–1 fractions of the canvas, snapped to cells. */
export function plateRect(preset: GridPreset, placement: PlatePlacement): Rect {
  const { cols, rows } = GRID_PRESETS[preset];
  let c0: number, c1: number, r0: number, r1: number;
  if (placement === "left") {
    c0 = 0;
    c1 = Math.round(cols / 2);
    r0 = 0;
    r1 = rows;
  } else if (placement === "right") {
    c0 = Math.round(cols / 2);
    c1 = cols;
    r0 = 0;
    r1 = rows;
  } else {
    c0 = Math.round(cols * 0.2);
    c1 = cols - c0;
    r0 = Math.round(rows * 0.2);
    r1 = rows - r0;
  }
  return { x: c0 / cols, y: r0 / rows, w: (c1 - c0) / cols, h: (r1 - r0) / rows };
}

export function drawPlate(
  ctx: OffscreenCanvasRenderingContext2D,
  grid: Grid,
  preset: GridPreset,
  placement: PlatePlacement,
  color = "#000000"
): void {
  const rect = plateRect(preset, placement);
  // Overfill by BLEED px on every side. Panels round outward by ~1px to hide seams, so a
  // panel in the plate's edge column would otherwise poke a thin sliver past the plate.
  // The plate is drawn last, so bleeding a couple px covers it without a visible shift.
  const BLEED = 2;
  const x = rect.x * grid.width - BLEED;
  const y = rect.y * grid.height - BLEED;
  const w = rect.w * grid.width + BLEED * 2;
  const h = rect.h * grid.height + BLEED * 2;

  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
