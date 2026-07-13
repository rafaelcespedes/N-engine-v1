/**
 * Panel layer: fills a seeded subset of grid cells with solid color, snapping to cells.
 *
 * Two seeded draws per cell — one for on/off (against `density`), one for color. Both
 * draws happen for *every* cell so the sequence is stable regardless of density, keeping
 * it deterministic off `deriveSeed(seed, "panels")`. Reshuffle by changing the seed.
 *
 * Anti-clustering: a cell whose already-decided left or top neighbor is filled has its
 * fill chance cut (× ADJACENCY_PENALTY), so fills scatter rather than clump.
 *
 * Seams: a filled cell overlaps by 1px *only toward a filled right/bottom neighbor* — that
 * hides the seam between adjacent panels without bleeding a bright sliver into an empty
 * (dark) cell, which would otherwise show as a stray line, especially over slice gaps.
 * This needs the full fill map first, so it runs in two passes.
 */

import type { Grid } from "../grid";
import type { PanelColor } from "../params";
import { makeRng, deriveSeed } from "../rng";
import { PANEL_HEX } from "../palette";

const ADJACENCY_PENALTY = 0.3;

export function drawPanels(
  ctx: OffscreenCanvasRenderingContext2D,
  grid: Grid,
  colors: PanelColor[],
  seed: number,
  density = 0.4
): void {
  if (colors.length === 0) return;
  const rng = makeRng(deriveSeed(seed, "panels"));
  const cols = grid.spec.cols;
  const rows = grid.spec.rows;
  const n = grid.cells.length;
  const filled: boolean[] = new Array(n).fill(false);
  const colorIdx: number[] = new Array(n).fill(0);

  // Pass 1 — seeded decisions (order-stable regardless of density).
  for (let i = 0; i < n; i++) {
    const cell = grid.cells[i];
    const a = rng();
    const b = rng();
    const leftFilled = cell.col > 0 && filled[i - 1];
    const topFilled = cell.row > 0 && filled[i - cols];
    const chance = density * (leftFilled || topFilled ? ADJACENCY_PENALTY : 1);
    if (a < chance) {
      filled[i] = true;
      colorIdx[i] = Math.floor(b * colors.length);
    }
  }

  // Pass 2 — draw, bleeding 1px only toward filled neighbors.
  for (let i = 0; i < n; i++) {
    if (!filled[i]) continue;
    const cell = grid.cells[i];
    const rightBleed = cell.col < cols - 1 && filled[i + 1] ? 1 : 0;
    const bottomBleed = cell.row < rows - 1 && filled[i + cols] ? 1 : 0;
    const x = Math.floor(cell.x);
    const y = Math.floor(cell.y);
    ctx.fillStyle = PANEL_HEX[colors[colorIdx[i]]];
    ctx.fillRect(
      x,
      y,
      Math.ceil(cell.x + cell.w) - x + rightBleed,
      Math.ceil(cell.y + cell.h) - y + bottomBleed
    );
  }
}
