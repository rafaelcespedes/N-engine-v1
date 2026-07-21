/**
 * Content layer: the plate's copy (title + body) and logo, drawn INTO the canvas.
 *
 * This used to be a DOM overlay, which meant downloads (JPEG and recorded video)
 * shipped without the text. Drawing it here makes the canvas the single source of
 * truth — what you see is exactly what exports.
 *
 * Layout: 4%-of-width padding, title min(15%w, 22%h), body min(6%w, 9%h), line
 * heights and the title-to-body gap from the constants below; logo 15%w wide,
 * copy and logo at opposite ends of the plate. `plateScales` corrects extreme plate
 * proportions (wide/short and narrow/tall) exactly as before.
 */

import type { Grid } from "../grid";
import type { GridPreset, PlatePlacement, PlateTheme } from "../params";
import { plateRect, sideBlock } from "./plate";

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
  theme: PlateTheme;
}

/** Aspect of nengine-mark.svg (viewBox 915×1057). */
const LOGO_ASPECT = 1057 / 915;

/** Display-face tracking, matching the .font-display rule in globals.css. */
const TITLE_TRACKING = "-2px";

/** Left/right plates on the 16:9 grids carry their content 20% smaller. */
const WIDESCREEN_SIDE_SCALE = 0.8;

/** Title line height. */
const TITLE_LINE_HEIGHT = 0.864;
/** Body line height. */
const BODY_LINE_HEIGHT = 1.248;
/** Gap between title and body, as a fraction of plate width. */
const COPY_GAP = 0.02268;

/**
 * Plate-proportion fixups. Content is sized relative to the plate's width, so extreme
 * plates need correcting: the centered plate on 7x4 is very wide/short (logo renders
 * huge → 50%), right-half plates are narrow (content up 30%), and the 4x5 centered
 * plate is narrow too (up 20%). Combos that use an explicit side block (see SIDE_BLOCKS
 * in layers/plate.ts) are already sized deliberately and take no correction.
 */
export function plateScales(
  grid: GridPreset,
  placement: PlatePlacement
): { logo: number; text: number } {
  if (grid === "7x4" && placement === "center") return { logo: 0.5, text: 1 };

  // 16:9 side plates are the same narrow block on both sides: boosted for that
  // narrowness, then pulled back 20% because they read oversized on a wide canvas.
  if ((grid === "7x4" || grid === "5x3") && placement !== "center") {
    const s = 1.3 * WIDESCREEN_SIDE_SCALE;
    return { logo: s, text: s };
  }

  // Remaining explicit side blocks are deliberately wide — no correction.
  if (sideBlock(grid, placement)) return { logo: 1, text: 1 };

  if (grid === "4x5") return { logo: 1.2, text: 1.2 }; // centered plate only
  if (placement === "right") return { logo: 1.3, text: 1.3 };
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
  const gap = COPY_GAP * w;

  // Pure fade — the text appears on top once the plate has finished filling in.
  ctx.save();
  ctx.globalAlpha *= progress;
  ctx.textBaseline = "alphabetic";

  // Measure the copy block. The display face is tracked -2px (mirrors the .font-display
  // rule in globals.css); set it before measuring so wrapping accounts for it.
  const titleFont = `400 ${titleFS}px ${assets.headlineFamily}`;
  const bodyFont = `400 ${bodyFS}px ${assets.bodyFamily}`;
  let titleLines: string[] = [];
  let bodyLines: string[] = [];
  if (content.title) {
    ctx.font = titleFont;
    ctx.letterSpacing = TITLE_TRACKING;
    titleLines = wrap(ctx, content.title, innerW);
  }
  if (content.body) {
    ctx.font = bodyFont;
    ctx.letterSpacing = "0px";
    bodyLines = wrap(ctx, content.body, innerW);
  }
  const titleH = titleLines.length * titleFS * TITLE_LINE_HEIGHT;
  const bodyH = bodyLines.length * bodyFS * BODY_LINE_HEIGHT;
  const copyH =
    titleH + (titleLines.length && bodyLines.length ? gap : 0) + bodyH;

  const logoImg = light ? assets.logoLight : assets.logoDark;
  const logoW = 0.15 * w * scales.logo;
  const logoH = logoW * LOGO_ASPECT;
  const showLogo = content.logo && !!logoImg;

  // Logo top-left, copy bottom-left.
  const copyTop = innerBottom - copyH;

  if (titleLines.length) {
    ctx.font = titleFont;
    ctx.letterSpacing = TITLE_TRACKING;
    ctx.fillStyle = titleColor;
    drawLines(ctx, titleLines, innerX, copyTop, titleFS, TITLE_LINE_HEIGHT);
  }
  if (bodyLines.length) {
    ctx.font = bodyFont;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = bodyColor;
    drawLines(
      ctx,
      bodyLines,
      innerX,
      copyTop + titleH + (titleLines.length ? gap : 0),
      bodyFS,
      BODY_LINE_HEIGHT
    );
  }

  if (showLogo && logoImg) {
    ctx.drawImage(logoImg, innerX, innerTop, logoW, logoH);
  }

  ctx.restore();
}
