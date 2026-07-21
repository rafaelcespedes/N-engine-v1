/**
 * The animation. One fixed, restrained build-in — no timeline, no user knobs.
 *
 * Plays ONCE (~2.4s) and holds: grid lines fade in, panels wipe in cell-by-cell from
 * seeded directions, slices slide out to their offsets, the plate fills in cell-by-cell
 * the same way ("pixels loading in"), then the copy/logo fade on top. Replay is user-
 * triggered (Space).
 *
 * `phasesAt(t)` is a pure function of play time t ∈ [0,1]. At t=1 every value is 1,
 * which reproduces the static render exactly.
 */

export const ANIM_MS = 2380;
/** Extra hold recorded at the end of a video export. */
export const VIDEO_TAIL_MS = 600;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
export const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/** Progress through the window [a,b] of the play, clamped to 0..1. */
const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

export interface AnimPhases {
  /** Grid-lines opacity. */
  gridAlpha: number;
  /** Raw 0..1 reveal driving per-cell panel wipes (stagger + direction per cell). */
  panelsReveal: number;
  /** Raw 0..1 reveal driving the plate's per-cell fill. */
  plateReveal: number;
  /** 0..1 fade of the copy/logo, after the plate has filled. */
  contentProgress: number;
}

export function phasesAt(t: number): AnimPhases {
  return {
    gridAlpha: easeOutCubic(win(t, 0.0, 0.15)),
    panelsReveal: win(t, 0.06, 0.5),
    plateReveal: win(t, 0.38, 0.74),
    contentProgress: easeOutCubic(win(t, 0.74, 0.92)),
  };
}

export type WipeDirection = 0 | 1 | 2 | 3; // left, right, top, bottom

/** A rect mid-wipe from a direction: returns [x, y, w, h] at progress p. */
export function wipeRect(
  x: number,
  y: number,
  w: number,
  h: number,
  dir: WipeDirection,
  p: number
): [number, number, number, number] {
  switch (dir) {
    case 0:
      return [x, y, w * p, h];
    case 1:
      return [x + w * (1 - p), y, w * p, h];
    case 2:
      return [x, y, w, h * p];
    default:
      return [x, y + h * (1 - p), w, h * p];
  }
}
