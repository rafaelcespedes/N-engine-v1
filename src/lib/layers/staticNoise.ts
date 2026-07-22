/**
 * Static-noise layer: a subtle analog-TV overlay drawn ABOVE everything, only during the
 * animation. Reads as the composition "tuning in" from static — heavy at the start of the
 * build-in, clearing as the piece resolves (intensity is `AnimPhases.staticLevel`).
 *
 * Deliberately monochrome speckle rather than RGB TV static, so it sits with the stippled
 * source art instead of fighting it: sparse bright specks over the dark composition, a few
 * dark ones for grain in the light areas, faint scanlines, and one soft tracking band that
 * rolls down the frame. Kept low-amplitude — at full `level` the peak is still gentle.
 */

const TILE = 256;
const TILE_COUNT = 12; // cycle through these for per-frame flicker
const PEAK = 0.55; // scales staticLevel → grain alpha; per-pixel alpha keeps it sparse
const SCANLINE_ALPHA = 0.06;
const BAND_ALPHA = 0.05;

export interface StaticAssets {
  tiles: HTMLCanvasElement[];
  scanlines: HTMLCanvasElement;
}

/** Build the noise tiles + scanline tile once (they're reused every frame). */
export function makeStaticAssets(): StaticAssets {
  const tiles: HTMLCanvasElement[] = [];
  for (let n = 0; n < TILE_COUNT; n++) {
    const c = document.createElement("canvas");
    c.width = TILE;
    c.height = TILE;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(TILE, TILE);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random();
      let val = 0;
      let a = 0;
      if (v > 0.82) {
        // bright speck (the visible "static")
        val = 255;
        a = ((v - 0.82) / 0.18) * 255;
      } else if (v < 0.1) {
        // occasional dark speck for grain in light areas
        val = 0;
        a = ((0.1 - v) / 0.1) * 150;
      }
      d[i] = d[i + 1] = d[i + 2] = val;
      d[i + 3] = a;
    }
    ctx.putImageData(img, 0, 0);
    tiles.push(c);
  }

  // Scanlines: 1px dark line every 3px (a 1×3 tile, tiled by the pattern).
  const sl = document.createElement("canvas");
  sl.width = 1;
  sl.height = 3;
  const slctx = sl.getContext("2d")!;
  slctx.fillStyle = `rgba(0,0,0,${SCANLINE_ALPHA})`;
  slctx.fillRect(0, 0, 1, 1);

  return { tiles, scanlines: sl };
}

export function drawStaticNoise(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: number,
  assets: StaticAssets,
  /** Play time 0..1 — drives the rolling tracking band. */
  t: number
): void {
  if (level <= 0) return;
  ctx.save();

  // Grain: a random tile, tiled across the frame with a random offset, so it reads as
  // fresh static each frame rather than a scrolling texture.
  const tile = assets.tiles[Math.floor(Math.random() * assets.tiles.length)];
  const pat = ctx.createPattern(tile, "repeat")!;
  ctx.globalAlpha = level * PEAK;
  ctx.fillStyle = pat;
  ctx.save();
  ctx.translate(-Math.random() * TILE, -Math.random() * TILE);
  ctx.fillRect(0, 0, w + TILE, h + TILE);
  ctx.restore();

  // Faint scanlines, scaled to the render.
  const slPat = ctx.createPattern(assets.scanlines, "repeat")!;
  ctx.globalAlpha = level;
  ctx.fillStyle = slPat;
  ctx.fillRect(0, 0, w, h);

  // Soft tracking band rolling down the frame.
  const bandH = h * 0.09;
  const y = (((t * 1.7) % 1) * (h + bandH)) - bandH;
  const g = ctx.createLinearGradient(0, y, 0, y + bandH);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, `rgba(255,255,255,${BAND_ALPHA})`);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = level;
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, bandH);

  ctx.restore();
}
