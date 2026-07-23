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
];
