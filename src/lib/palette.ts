/**
 * The panel palette. Shared by the swatch picker (Controls) and the panel renderer, so
 * the UI chip and the painted cell can never drift.
 */

import type { PanelColor } from "./params";

export const PANEL_HEX: Record<PanelColor, string> = {
  white: "#ffffff",
  black: "#000000",
  blue: "#65DBFF",
  green: "#00E696",
  yellow: "#F3C202",
  magenta: "#FA46F0",
  orange: "#FF5600",
  indigo: "#5142F4",
};

/** Swatch order in the picker. */
export const PANEL_ORDER: PanelColor[] = [
  "white",
  "black",
  "blue",
  "green",
  "yellow",
  "magenta",
  "orange",
  "indigo",
];

/**
 * Color 2 "Pairs": preset two-accent combinations. Selecting one fills panels with
 * color 1 plus both accents (panelColors = [c1, a, b]).
 */
export const PANEL_PAIRS: [PanelColor, PanelColor][] = [
  ["blue", "yellow"],   // 65DBFF / F3C202
  ["blue", "orange"],   // 65DBFF / FF5600
  ["yellow", "green"],  // F3C202 / 00E696
  ["magenta", "yellow"],// FA46F0 / F3C202
  ["indigo", "green"],  // 5142F4 / 00E696
];
