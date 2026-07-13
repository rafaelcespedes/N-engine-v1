/**
 * Base layer: draws the source image (already stippled, from the library) cover-fit into
 * the canvas, cropping the overflow — same behaviour as CSS `object-fit: cover`.
 *
 * When live stippling returns this becomes the stipple layer's input; for now it *is* the
 * art.
 */

export function drawBase(
  ctx: OffscreenCanvasRenderingContext2D,
  img: HTMLImageElement | ImageBitmap,
  w: number,
  h: number
): void {
  ctx.clearRect(0, 0, w, h);
  const iw = img.width;
  const ih = img.height;
  if (iw === 0 || ih === 0) return;

  const ar = iw / ih;
  const car = w / h;
  let dw: number, dh: number;
  if (ar > car) {
    dh = h;
    dw = h * ar;
  } else {
    dw = w;
    dh = w / ar;
  }
  ctx.drawImage(img as CanvasImageSource, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
