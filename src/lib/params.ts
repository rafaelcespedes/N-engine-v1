/**
 * The single source of truth for a composed piece.
 *
 * Rule: the rendered output is a pure function of Params. If something affects the
 * render, it belongs here. A Params blob must fully reconstruct any output — that's
 * what makes presets, permalinks, and reproducibility free.
 */

export type AspectRatio = "1:1" | "16:9" | "3:4";

/** Grid presets are coupled to aspect ratio — picking one implies the other. */
export type GridPreset = "5x5" | "7x4" | "5x3" | "5x6" | "4x5";

export type PanelColor =
  | "white"
  | "black"
  | "blue"
  | "green"
  | "yellow"
  | "magenta"
  | "orange"
  | "indigo";

export type OffsetDirection = "up" | "down" | "left" | "right";

export type PlatePlacement = "left" | "right" | "center";

/** Plate color scheme: dark = black plate / white content, light = the flip. */
export type PlateTheme = "dark" | "light";

export type DotShape = "circle" | "square" | "glyph";

export type ColorMode = "mono" | "duotone" | "source";

/** Fast = rejection sampling (real-time). Quality = weighted Voronoi (worker, ~1-2s). */
export type StippleMode = "fast" | "quality";

export interface StippleParams {
  mode: StippleMode;
  /** Master density control. */
  dotCount: number; // 500–50_000
  dotSizeMin: number; // px at preview scale
  dotSizeMax: number;
  /** Applied to the luminance map before sampling. The highest-impact control. */
  gamma: number; // 0.2–3.0
  /** Luminance above this contributes no dots — keeps the paper clean. */
  whiteClip: number; // 0–1
  invert: boolean;
  /** Lloyd's relaxation passes. Ignored in fast mode. 0 = noisy, 50+ = eerily even. */
  relaxIterations: number;
  /** Sobel-driven density boost along edges. Keeps silhouettes legible at low dot counts. */
  edgeEmphasis: number; // 0–1
  /** Random offset applied after relaxation, to de-mechanize the result. */
  jitter: number; // 0–1
  shape: DotShape;
  colorMode: ColorMode;
  /** Used when colorMode is "mono" or "duotone". */
  colors: string[];
}

export interface Params {
  // --- Generation inputs. These are the ONLY fields that hit the backend. ---
  prompt: string;
  /** Passed to FLUX. Also seeds every client-side RNG. One seed, whole piece. */
  seed: number;
  aspect: AspectRatio;

  // --- Overlay controls. Client-side only, zero marginal cost. ---
  grid: GridPreset;
  gridLines: boolean;

  panel: boolean;
  /** "white" plus 0–2 accents — white is the fixed base. Cell distribution is deterministic off `seed`. */
  panelColors: PanelColor[];
  /** Fraction of cells filled, 0–1. */
  panelDensity: number;

  sliceShift: boolean;
  /** In grid cells. */
  offset: 1 | 2 | 3;
  offsetDirection: OffsetDirection;

  plate: boolean;
  placement: PlatePlacement;
  /** Copy laid inside the plate, auto-fit to its size. */
  plateCopy: boolean;
  plateTitle: string;
  plateBody: string;
  /** Logo mark in the plate's top-left; copy sits bottom-left. */
  plateLogo: boolean;
  /** Black plate / white content ("dark", default) or flipped ("light"). */
  plateTheme: PlateTheme;

  /**
   * Animation: a fixed build-in/hold/release loop (see src/lib/animate.ts). No user
   * tuning — on or off. When on, Download exports a video of one loop.
   */
  animate: boolean;

  // --- Stipple layer. Client-side. Currently bypassed — the library supplies
  //     already-stippled images — but kept for when live stippling returns. ---
  stipple: StippleParams;
}

export const DEFAULT_PARAMS: Params = {
  prompt: "",
  seed: 1,
  aspect: "1:1",

  grid: "5x5",
  gridLines: true,

  panel: false,
  panelColors: ["white"],
  panelDensity: 0.4,

  sliceShift: false,
  offset: 1,
  offsetDirection: "right",

  plate: false,
  placement: "center",
  plateCopy: false,
  plateTitle: "The New Standard",
  plateBody: "A composable grid system for generative brand art.",
  plateLogo: true,
  plateTheme: "dark",

  animate: false,

  stipple: {
    mode: "fast",
    dotCount: 12_000,
    dotSizeMin: 0.5,
    dotSizeMax: 3,
    gamma: 1,
    whiteClip: 0.95,
    invert: false,
    relaxIterations: 20,
    edgeEmphasis: 0,
    jitter: 0,
    shape: "circle",
    colorMode: "mono",
    colors: ["#000000"],
  },
};

/**
 * Which layers a param change invalidates. The compositor uses this to avoid
 * regenerating the stipple point set when only an overlay param moved.
 */
export type Layer = "base" | "stipple" | "slice" | "overlay";

export function invalidatedBy(key: keyof Params): Layer[] {
  switch (key) {
    case "prompt":
    case "aspect":
      return ["base", "stipple", "slice", "overlay"];
    case "seed":
      return ["base", "stipple", "slice", "overlay"];
    case "stipple":
      return ["stipple"];
    case "sliceShift":
    case "offset":
    case "offsetDirection":
      return ["slice"];
    case "grid":
      // Grid is the shared coordinate system — slices and overlays both re-flow.
      return ["slice", "overlay"];
    default:
      return ["overlay"];
  }
}
