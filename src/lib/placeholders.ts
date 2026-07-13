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
  /** Path under /public. */
  src: string;
}

export const PLACEHOLDERS: Placeholder[] = [
  { id: "abstract", label: "Abstract", src: "/placeholders/abstract.jpg" },
  { id: "charting", label: "Charting", src: "/placeholders/charting.jpg" },
  { id: "solarpunk", label: "Solarpunk", src: "/placeholders/solarpunk.jpg" },
  { id: "organic", label: "Organic", src: "/placeholders/organic.jpg" },
  { id: "analytics", label: "Analytics", src: "/placeholders/analytics.jpg" },
  { id: "bauhaus", label: "Bauhaus", src: "/placeholders/bauhaus.jpg" },
  { id: "cyberpunk", label: "Cyberpunk", src: "/placeholders/cyberpunk.jpg" },
  { id: "data", label: "Data", src: "/placeholders/data.jpg" },
  { id: "eye", label: "Eye", src: "/placeholders/eye.jpg" },
  { id: "graphs", label: "Graphs", src: "/placeholders/graphs.jpg" },
  { id: "magnify", label: "Magnify", src: "/placeholders/magnify.jpg" },
  { id: "computer", label: "Computer", src: "/placeholders/computer.jpg" },
  { id: "lightbeam", label: "Light beam", src: "/placeholders/lightbeam.jpg" },
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
