/**
 * The grid is the shared coordinate system. Slice offsets are in cells, panels snap
 * to cells, plate placement is grid-relative.
 *
 * Every layer renderer reads cell geometry from here. Never recompute it locally —
 * that's how four layers drift out of alignment.
 */

import type { AspectRatio, GridPreset } from "./params";

export interface GridSpec {
  cols: number;
  rows: number;
  aspect: AspectRatio;
}

/**
 * Presets are coupled to aspect ratio: picking a grid implies the ratio. Cell counts
 * are kept low with cells as close to square as possible:
 *   1:1  — 5×5 (205×205)
 *   16:9 — 7×4 (192×192, exact square) → 5×3 (269×256)
 *   3:4  — 5×6 (179×192)               → 4×5 (224×230)
 */
export const GRID_PRESETS: Record<GridPreset, GridSpec> = {
  "5x5": { cols: 5, rows: 5, aspect: "1:1" },
  "7x4": { cols: 7, rows: 4, aspect: "16:9" },
  "5x3": { cols: 5, rows: 3, aspect: "16:9" },
  "5x6": { cols: 5, rows: 6, aspect: "3:4" },
  "4x5": { cols: 4, rows: 5, aspect: "3:4" },
};

/** The grid selected when an aspect ratio is chosen (or implied by a source image). */
export const DEFAULT_GRID_FOR: Record<AspectRatio, GridPreset> = {
  "1:1": "5x5",
  "16:9": "7x4",
  "3:4": "5x6",
};

export const ASPECT_DIMENSIONS: Record<AspectRatio, { w: number; h: number }> = {
  "1:1": { w: 1024, h: 1024 },
  "16:9": { w: 1344, h: 768 },
  "3:4": { w: 896, h: 1152 },
};

/**
 * Canvas dimensions for the interactive preview, derived from the aspect ratio and
 * capped at `max` on the long edge. The compositor sizes its canvas to this and the
 * page sizes the on-screen frame to the same ratio, so overlays and the DOM plate-copy
 * layer stay in lockstep.
 */
export function previewDims(
  aspect: AspectRatio,
  max = 1000
): { w: number; h: number } {
  const { w, h } = ASPECT_DIMENSIONS[aspect];
  const s = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

export interface Cell {
  col: number;
  row: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stable index — use this to seed per-cell randomness (panel color, etc). */
  index: number;
}

export interface Grid {
  spec: GridSpec;
  width: number;
  height: number;
  cellW: number;
  cellH: number;
  cells: Cell[];
}

export function buildGrid(
  preset: GridPreset,
  width: number,
  height: number
): Grid {
  const spec = GRID_PRESETS[preset];
  const cellW = width / spec.cols;
  const cellH = height / spec.rows;

  const cells: Cell[] = [];
  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < spec.cols; col++) {
      cells.push({
        col,
        row,
        x: col * cellW,
        y: row * cellH,
        w: cellW,
        h: cellH,
        index: row * spec.cols + col,
      });
    }
  }

  return { spec, width, height, cellW, cellH, cells };
}

export function cellAt(grid: Grid, col: number, row: number): Cell | undefined {
  if (col < 0 || row < 0 || col >= grid.spec.cols || row >= grid.spec.rows) {
    return undefined;
  }
  return grid.cells[row * grid.spec.cols + col];
}
