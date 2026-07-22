/**
 * Static-noise layer: a subtle analog-TV overlay drawn ABOVE everything, during the
 * animation. Reads as the composition "tuning in" from static — strong at the start of
 * the build-in, clearing as the piece resolves (intensity is `AnimPhases.staticLevel`);
 * for on-screen preview it also keeps running after the build settles (see useCompositor).
 *
 * Deliberately monochrome speckle rather than RGB TV static, so it sits with the stippled
 * source art instead of fighting it: sparse bright specks over the dark composition, a few
 * dark ones for grain in the light areas, plus faint scanlines.
 */

const TILE = 256;
const TILE_COUNT = 12; // cycle through these for per-frame flicker
const PEAK = 0.55; // scales staticLevel → grain alpha; per-pixel alpha keeps it sparse
const GRAIN_SCALE = 1.2; // speck size (1.0 = native tile pixel)
const SCANLINE_ALPHA = 0.06;

export interface StaticAssets {
  tiles: HTMLCanvasElement[];
  scanlines: HTMLCanvasElement;
}

/** Build the noise tiles + scanline tile once (reused every frame). */
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
  assets: StaticAssets
): void {
  if (level <= 0) return;
  ctx.save();

  // Grain: a random tile, scaled 1.2x and offset randomly each frame, so it reads as
  // fresh static rather than a scrolling texture.
  const tile = assets.tiles[Math.floor(Math.random() * assets.tiles.length)];
  const pat = ctx.createPattern(tile, "repeat")!;
  const m = new DOMMatrix();
  m.scaleSelf(GRAIN_SCALE);
  m.translateSelf(-Math.random() * TILE, -Math.random() * TILE);
  pat.setTransform(m);
  ctx.globalAlpha = level * PEAK;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);

  // Faint scanlines.
  const slPat = ctx.createPattern(assets.scanlines, "repeat")!;
  ctx.globalAlpha = level;
  ctx.fillStyle = slPat;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
}
