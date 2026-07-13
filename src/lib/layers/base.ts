/**
 * Base layer: draws the source image cover-fit into the canvas, cropping the overflow —
 * same behaviour as CSS `object-fit: cover`.
 *
 * A few pixels are trimmed off every source edge (EDGE_CROP): the library's MidJourney
 * exports carry a bright ~1px fringe on their right/bottom edges, which otherwise reads as
 * a border on the render. Trimming the source removes it without touching the composition.
 *
 * When live stippling returns this becomes the stipple layer's input; for now it *is* the art.
 */

const EDGE_CROP = 3;

export function drawBase(
  ctx: OffscreenCanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  w: number,
  h: number
): void {
  ctx.clearRect(0, 0, w, h);
  const iw = img.width;
  const ih = img.height;
  if (iw <= 2 * EDGE_CROP || ih <= 2 * EDGE_CROP) return;

  // Source rect with the edge fringe trimmed off.
  const sx = EDGE_CROP;
  const sy = EDGE_CROP;
  const sw = iw - 2 * EDGE_CROP;
  const sh = ih - 2 * EDGE_CROP;

  const ar = sw / sh;
  const car = w / h;
  let dw: number, dh: number;
  if (ar > car) {
    dh = h;
    dw = h * ar;
  } else {
    dw = w;
    dh = w / ar;
  }
  ctx.drawImage(
    img as CanvasImageSource,
    sx,
    sy,
    sw,
    sh,
    (w - dw) / 2,
    (h - dh) / 2,
    dw,
    dh
  );
}
