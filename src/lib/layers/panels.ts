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
import { easeOutCubic, wipeRect, type WipeDirection } from "../animate";

const ADJACENCY_PENALTY = 0.3;

/** Portion of the reveal window each individual cell's wipe takes. */
const WIPE_DUR = 0.4;

export function drawPanels(
  ctx: OffscreenCanvasRenderingContext2D,
  grid: Grid,
  colors: PanelColor[],
  seed: number,
  density = 0.4,
  /** 0..1 animation reveal — each cell swipes in on its own seeded stagger. 1 = static. */
  reveal = 1
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

  // Per-cell animation staggers + wipe directions — own rng stream so the fill/color
  // decisions above are byte-identical whether or not the piece is animating.
  const srng = makeRng(deriveSeed(seed, "panel-anim"));
  const stagger: number[] = new Array(n);
  const dir: WipeDirection[] = new Array(n);
  for (let i = 0; i < n; i++) {
    stagger[i] = srng() * (1 - WIPE_DUR);
    dir[i] = Math.floor(srng() * 4) as WipeDirection;
  }

  // Pass 2 — draw, bleeding 1px only toward filled neighbors. Each cell wipes in from
  // its seeded direction over its slice of the reveal window; reveal=1 is static.
  for (let i = 0; i < n; i++) {
    if (!filled[i]) continue;
    const cell = grid.cells[i];
    const wipe =
      reveal >= 1
        ? 1
        : easeOutCubic(Math.min(1, Math.max(0, (reveal - stagger[i]) / WIPE_DUR)));
    if (wipe <= 0) continue;
    const rightBleed = cell.col < cols - 1 && filled[i + 1] ? 1 : 0;
    const bottomBleed = cell.row < rows - 1 && filled[i + cols] ? 1 : 0;
    const x = Math.floor(cell.x);
    const y = Math.floor(cell.y);
    const w = Math.ceil(cell.x + cell.w) - x + rightBleed;
    const h = Math.ceil(cell.y + cell.h) - y + bottomBleed;
    ctx.fillStyle = PANEL_HEX[colors[colorIdx[i]]];
    ctx.fillRect(...wipeRect(x, y, w, h, dir[i], wipe));
  }
}
