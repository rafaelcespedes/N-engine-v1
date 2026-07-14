/**
 * The panel palette. Shared by the swatch picker (Controls) and the panel renderer, so
 * the UI chip and the painted cell can never drift.
 */

import type { PanelColor } from "./params";

export const PANEL_HEX: Record<PanelColor, string> = {
  white: "#ffffff",
  black: "#000000",
  blue: "#74d0f8",
  green: "#8fe958",
  yellow: "#f8d648",
  magenta: "#ed72f8",
  orange: "#ef5e2c",
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
