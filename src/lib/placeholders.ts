/**
 * Placeholder base-image library — source images the compositor draws while there's no
 * backend. The current aspect ratio is applied independently; the image is cropped to fit
 * it (cover), so a placeholder never changes the format.
 *
 * Adding one is deliberately trivial (the project's north star: "dropping images in a
 * folder"): drop a file in `public/placeholders/` and add a row here. Any raster
 * (png/jpg/webp) or SVG works.
 */

export interface Placeholder {
  id: string;
  label: string;
  /** Full-res image (2000px max) — used for the render + export. Path under /public. */
  src: string;
  /** Small image (400px) — used for the picker thumbnail so the grid loads fast. */
  thumb: string;
}

function ph(id: string, label: string): Placeholder {
  return {
    id,
    label,
    src: `/placeholders/${id}.jpg`,
    thumb: `/placeholders/thumbs/${id}.jpg`,
  };
}

export const PLACEHOLDERS: Placeholder[] = [
  ph("charting", "Charting"),
  ph("solarpunk", "Solarpunk"),
  ph("organic", "Organic"),
  ph("analytics", "Analytics"),
  ph("cyberpunk", "Cyberpunk"),
  ph("data", "Data"),
  ph("eye", "Eye"),
  ph("graphs", "Graphs"),
];

/** The one loaded on first paint. */
export const DEFAULT_PLACEHOLDER: Placeholder = PLACEHOLDERS[0];

export function getPlaceholder(id: string): Placeholder | undefined {
  return PLACEHOLDERS.find((p) => p.id === id);
}

/**
 * Pick a random placeholder, never repeating the current one. Selection is a UI
 * action, not part of the deterministic render — Math.random is fine here.
 */
export function randomPlaceholder(excludeId?: string): Placeholder {
  const pool = excludeId
    ? PLACEHOLDERS.filter((p) => p.id !== excludeId)
    : PLACEHOLDERS;
  const list = pool.length > 0 ? pool : PLACEHOLDERS;
  return list[Math.floor(Math.random() * list.length)];
}
