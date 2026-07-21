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
import { makeRng, deriveSeed } from "../rng";
import { easeOutCubic, wipeRect, type WipeDirection } from "../animate";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SideBlock {
  /** Size in cells. */
  w: number;
  h: number;
  /** Where the block sits vertically; horizontally it's always flush to its side. */
  vAlign: "bottom" | "center";
}

/**
 * Left/right plates that are a fixed block rather than a full-height half. Anything
 * listed here is sized deliberately, so it also opts out of the plateScales correction
 * (see `sideBlock` usage in layers/content.ts). Unlisted combos keep the default half.
 */
const SIDE_BLOCKS: Partial<
  Record<GridPreset, Partial<Record<"left" | "right", SideBlock>>>
> = {
  "5x6": { left: { w: 3, h: 4, vAlign: "bottom" }, right: { w: 3, h: 4, vAlign: "bottom" } },
  "4x5": { left: { w: 3, h: 3, vAlign: "bottom" }, right: { w: 3, h: 3, vAlign: "bottom" } },
  "5x5": { right: { w: 3, h: 3, vAlign: "center" } },
};

/** The fixed block for this combo, or undefined when it uses the default half. */
export function sideBlock(
  preset: GridPreset,
  placement: PlatePlacement
): SideBlock | undefined {
  if (placement === "center") return undefined;
  return SIDE_BLOCKS[preset]?.[placement];
}

/** Plate block in cell indices [c0,c1) × [r0,r1). */
export function plateCells(preset: GridPreset, placement: PlatePlacement) {
  const { cols, rows } = GRID_PRESETS[preset];
  const block = sideBlock(preset, placement);
  let c0: number, c1: number, r0: number, r1: number;
  if (block) {
    c0 = placement === "left" ? 0 : cols - block.w;
    c1 = c0 + block.w;
    r0 = block.vAlign === "center" ? Math.round((rows - block.h) / 2) : rows - block.h;
    r1 = r0 + block.h;
  } else if (placement === "left") {
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
  return { c0, c1, r0, r1, cols, rows };
}

/** Plate block as 0–1 fractions of the canvas, snapped to cells. */
export function plateRect(preset: GridPreset, placement: PlatePlacement): Rect {
  const { c0, c1, r0, r1, cols, rows } = plateCells(preset, placement);
  return { x: c0 / cols, y: r0 / rows, w: (c1 - c0) / cols, h: (r1 - r0) / rows };
}

/** Portion of the reveal window each plate cell's wipe takes. */
const CELL_WIPE_DUR = 0.4;

export function drawPlate(
  ctx: OffscreenCanvasRenderingContext2D,
  grid: Grid,
  preset: GridPreset,
  placement: PlatePlacement,
  color = "#000000",
  /** 0..1 animation reveal — the plate fills in cell-by-cell ("pixels loading in"). */
  reveal = 1,
  /** Seeds the per-cell stagger + wipe direction. */
  seed = 0
): void {
  if (reveal <= 0) return;
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

  if (reveal < 1) {
    // Build-in: each plate cell wipes from a seeded direction on a seeded stagger.
    const { c0, c1, r0, r1 } = plateCells(preset, placement);
    const rng = makeRng(deriveSeed(seed, "plate-anim"));
    for (let row = r0; row < r1; row++) {
      for (let col = c0; col < c1; col++) {
        const stagger = rng() * (1 - CELL_WIPE_DUR);
        const dir = Math.floor(rng() * 4) as WipeDirection;
        const p = easeOutCubic(
          Math.min(1, Math.max(0, (reveal - stagger) / CELL_WIPE_DUR))
        );
        if (p <= 0) continue;
        const cx = Math.floor((col / grid.spec.cols) * grid.width) - 1;
        const cy = Math.floor((row / grid.spec.rows) * grid.height) - 1;
        const cw = Math.ceil(grid.cellW) + 2;
        const ch = Math.ceil(grid.cellH) + 2;
        ctx.fillRect(...wipeRect(cx, cy, cw, ch, dir, p));
      }
    }
    return;
  }

  // Static: one solid block + keyline (contrasting the fill so it reads on either theme).
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle =
    color.toLowerCase() === "#ffffff" ? "rgba(0,0,0,0.16)" : "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
