/**
 * Config randomizer for the "Randomize" button. Produces a fresh, coherent combination
 * of every layer the tool controls — format, grid, overlays, slice, seed.
 *
 * Plate and copy are intentionally excluded: the randomizer never turns them on and
 * never touches their content, so an active plate/copy survives a randomize untouched
 * (and an inactive one stays off). Merge the result over the current Params to preserve
 * those fields:  setParams(p => ({ ...p, ...randomConfig() })).
 */

import type {
  AspectRatio,
  GridPreset,
  OffsetDirection,
  PanelColor,
  Params,
} from "./params";
import { GRID_PRESETS } from "./grid";

const ASPECTS: AspectRatio[] = ["1:1", "16:9", "3:4"];
const DIRECTIONS: OffsetDirection[] = ["up", "down", "left", "right"];
const OFFSETS: (1 | 2 | 3)[] = [1, 2, 3];
const MONO: PanelColor[] = ["white", "black"];
const ACCENTS: PanelColor[] = ["blue", "green", "yellow", "magenta", "orange", "indigo"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** The fields the randomizer owns — everything except plate/copy. */
type RandomFields = Pick<
  Params,
  | "aspect"
  | "grid"
  | "gridLines"
  | "panel"
  | "panelColors"
  | "panelDensity"
  | "sliceShift"
  | "offset"
  | "offsetDirection"
  | "seed"
>;

export function randomConfig(): RandomFields {
  const aspect = pick(ASPECTS);
  const grid = pick(
    (Object.keys(GRID_PRESETS) as GridPreset[]).filter(
      (g) => GRID_PRESETS[g].aspect === aspect
    )
  );

  // Slot 1 is always mono; slot 2 (an accent) appears ~half the time.
  const panelColors: PanelColor[] =
    Math.random() < 0.5 ? [pick(MONO), pick(ACCENTS)] : [pick(MONO)];

  const gridLines = Math.random() < 0.65;
  let panel = Math.random() < 0.85;
  let sliceShift = Math.random() < 0.5;
  // Never serve a bare "background + format" result — guarantee a real feature (a panel
  // or a slice shift), so every roll does more than the image/aspect/grid.
  if (!panel && !sliceShift) {
    if (Math.random() < 0.6) panel = true;
    else sliceShift = true;
  }

  return {
    aspect,
    grid,
    gridLines,
    panel,
    panelColors,
    panelDensity: 0.25 + Math.random() * 0.4, // 0.25–0.65
    sliceShift,
    offset: pick(OFFSETS),
    offsetDirection: pick(DIRECTIONS),
    seed: Math.floor(Math.random() * 1e9),
  };
}
