/**
 * The panel palette. Shared by the swatch picker (Controls) and the panel renderer, so
 * the UI chip and the painted cell can never drift.
 */

import type { PanelColor } from "./params";

export const PANEL_HEX: Record<PanelColor, string> = {
  white: "#ffffff",
  black: "#000000",
  blue: "#45bef2",
  green: "#8fd14f",
  yellow: "#f2c744",
  magenta: "#e14de6",
  orange: "#e8763a",
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
