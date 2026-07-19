/**
 * Content layer: the plate's copy (title + body) and logo, drawn INTO the canvas.
 *
 * This used to be a DOM overlay, which meant downloads (JPEG and recorded video)
 * shipped without the text. Drawing it here makes the canvas the single source of
 * truth — what you see is exactly what exports.
 *
 * Layout mirrors the old CSS overlay: 4%-of-width padding, title min(15%w, 22%h),
 * body min(6%w, 9%h), title line-height 0.9, body 1.3, gap 2.52%w; logo 15%w wide,
 * copy and logo at opposite ends of the plate. `plateScales` corrects extreme plate
 * proportions (wide/short and narrow/tall) exactly as before.
 */

import type { Grid } from "../grid";
import type { GridPreset, PlateLogoPos, PlatePlacement, PlateTheme } from "../params";
import { plateRect } from "./plate";

export interface ContentAssets {
  /** The mark, pre-tinted per theme (white for dark plates, black for light). */
  logoDark: CanvasImageSource | null;
  logoLight: CanvasImageSource | null;
  /** Resolved font-family lists (from the --font-headline / --font-body CSS vars). */
  headlineFamily: string;
  bodyFamily: string;
}

export interface ContentParams {
  title: string;
  body: string;
  logo: boolean;
  logoPos: PlateLogoPos;
  theme: PlateTheme;
}

/** Aspect of nengine-mark.svg (viewBox 915×1057). */
const LOGO_ASPECT = 1057 / 915;

/**
 * Plate-proportion fixups. Content is sized relative to the plate's width, so extreme
 * plates need correcting: the centered plate on 7x4 is very wide/short (logo renders
 * huge → 50%), and right-half plates are narrow everywhere (content up 30%); 4x5 is a
 * narrow grid at every placement (up 20%).
 */
export function plateScales(
  grid: GridPreset,
  placement: PlatePlacement
): { logo: number; text: number } {
  if (grid === "7x4" && placement === "center") return { logo: 0.5, text: 1 };
  if (placement === "right") return { logo: 1.3, text: 1.3 };
  if (grid === "4x5") return { logo: 1.2, text: 1.2 };
  return { logo: 1, text: 1 };
}

/** Greedy word wrap against the current ctx.font. */
function wrap(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw wrapped lines CSS-style: glyphs centered in fs*lineHeight line boxes. */
function drawLines(
  ctx: OffscreenCanvasRenderingContext2D,
  lines: string[],
  x: number,
  top: number,
  fs: number,
  lineHeight: number
): void {
  const box = fs * lineHeight;
  for (let i = 0; i < lines.length; i++) {
    const m = ctx.measureText(lines[i]);
    const ascent = m.fontBoundingBoxAscent || fs * 0.77;
    const descent = m.fontBoundingBoxDescent || fs * 0.23;
    const baseline = top + i * box + (box - (ascent + descent)) / 2 + ascent;
    ctx.fillText(lines[i], x, baseline);
  }
}

export function drawContent(
  ctx: OffscreenCanvasRenderingContext2D,
  grid: Grid,
  preset: GridPreset,
  placement: PlatePlacement,
  content: ContentParams,
  assets: ContentAssets,
  /** 0..1 animation progress (opacity + rise). 1 = static. */
  progress = 1
): void {
  if (progress <= 0) return;
  const rect = plateRect(preset, placement);
  const x = rect.x * grid.width;
  const y = rect.y * grid.height;
  const w = rect.w * grid.width;
  const h = rect.h * grid.height;

  const scales = plateScales(preset, placement);
  const pad = 0.04 * w;
  const innerX = x + pad;
  const innerW = w - 2 * pad;
  const innerTop = y + pad;
  const innerBottom = y + h - pad;

  const light = content.theme === "light";
  const titleColor = light ? "#000000" : "#ffffff";
  const bodyColor = light ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.75)";

  const titleFS = Math.min(0.15 * w, 0.22 * h) * scales.text;
  const bodyFS = Math.min(0.06 * w, 0.09 * h) * scales.text;
  const gap = 0.0252 * w;

  // Pure fade — the text appears on top once the plate has finished filling in.
  ctx.save();
  ctx.globalAlpha *= progress;
  ctx.textBaseline = "alphabetic";

  // Measure the copy block.
  const titleFont = `400 ${titleFS}px ${assets.headlineFamily}`;
  const bodyFont = `400 ${bodyFS}px ${assets.bodyFamily}`;
  let titleLines: string[] = [];
  let bodyLines: string[] = [];
  if (content.title) {
    ctx.font = titleFont;
    titleLines = wrap(ctx, content.title, innerW);
  }
  if (content.body) {
    ctx.font = bodyFont;
    bodyLines = wrap(ctx, content.body, innerW);
  }
  const titleH = titleLines.length * titleFS * 0.9;
  const bodyH = bodyLines.length * bodyFS * 1.3;
  const copyH =
    titleH + (titleLines.length && bodyLines.length ? gap : 0) + bodyH;

  const logoImg = light ? assets.logoLight : assets.logoDark;
  const logoW = 0.15 * w * scales.logo;
  const logoH = logoW * LOGO_ASPECT;
  const showLogo = content.logo && !!logoImg;

  // Copy sits opposite the logo: logo top → copy bottom; logo bottom → copy top.
  const copyTop =
    showLogo && content.logoPos === "bottom" ? innerTop : innerBottom - copyH;

  if (titleLines.length) {
    ctx.font = titleFont;
    ctx.fillStyle = titleColor;
    drawLines(ctx, titleLines, innerX, copyTop, titleFS, 0.9);
  }
  if (bodyLines.length) {
    ctx.font = bodyFont;
    ctx.fillStyle = bodyColor;
    drawLines(
      ctx,
      bodyLines,
      innerX,
      copyTop + titleH + (titleLines.length ? gap : 0),
      bodyFS,
      1.3
    );
  }

  if (showLogo && logoImg) {
    if (content.logoPos === "top") {
      ctx.drawImage(logoImg, innerX, innerTop, logoW, logoH);
    } else {
      // Bottom-right, mirroring the old overlay's self-end alignment.
      ctx.drawImage(
        logoImg,
        x + w - pad - logoW,
        innerBottom - logoH,
        logoW,
        logoH
      );
    }
  }

  ctx.restore();
}
