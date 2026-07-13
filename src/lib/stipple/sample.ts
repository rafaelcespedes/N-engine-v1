/**
 * Point generation. Two modes:
 *
 *   fast    — rejection sampling against the density map. Real-time; use while
 *             the user is scrubbing sliders.
 *   quality — weighted Voronoi + Lloyd's relaxation (Secord's algorithm). Dots
 *             space themselves evenly with density driven by tone. ~1-2s for 20k
 *             points, so it runs in a worker as a "refine" step.
 *
 * This module is pure and framework-free on purpose: it gets ported to Python for
 * the ComfyUI final-render node. Keep it that way.
 */

import type { StippleParams } from "../params";
import { makeRng, deriveSeed } from "../rng";
import type { LuminanceMap } from "./luminance";

export interface Dot {
  x: number;
  y: number;
  /** Radius, mapped from local density into [dotSizeMin, dotSizeMax]. */
  r: number;
  /** Populated only when colorMode is "source". */
  color?: string;
}

export function sampleDots(
  map: LuminanceMap,
  params: StippleParams,
  seed: number
): Dot[] {
  const dots =
    params.mode === "fast"
      ? rejectionSample(map, params, seed)
      : voronoiSample(map, params, seed);

  if (params.jitter > 0) applyJitter(dots, params, seed);
  return dots;
}

/** Fast mode. Keep a candidate point with probability equal to local density. */
function rejectionSample(
  map: LuminanceMap,
  params: StippleParams,
  seed: number
): Dot[] {
  const rng = makeRng(deriveSeed(seed, "stipple"));
  const dots: Dot[] = [];
  const maxAttempts = params.dotCount * 40; // guard against near-white images

  let attempts = 0;
  while (dots.length < params.dotCount && attempts < maxAttempts) {
    attempts++;
    const x = rng() * map.width;
    const y = rng() * map.height;
    const d = densityAt(map, x, y);
    if (d <= 0) continue;
    if (rng() > d) continue;

    dots.push({
      x,
      y,
      r: params.dotSizeMin + d * (params.dotSizeMax - params.dotSizeMin),
      color: params.colorMode === "source" ? colorAt(map, x, y) : undefined,
    });
  }
  return dots;
}

/**
 * Quality mode — NOT YET IMPLEMENTED.
 *
 * Algorithm (Secord 2002):
 *   1. Seed N points via rejection sampling (reuse rejectionSample above).
 *   2. Compute the Voronoi diagram of the point set.
 *   3. Move each point to the *density-weighted centroid* of its cell:
 *        centroid = Σ(p · density(p)) / Σ(density(p))  over pixels in the cell
 *   4. Repeat for params.relaxIterations. Convergence is fast — 20–50 passes.
 *   5. Radius from the local density at the final position.
 *
 * Implementation notes:
 *   - Use d3-delaunay (Delaunay/Voronoi) for the diagram — it's fast and dependency-light.
 *   - Accumulate weighted centroids by iterating pixels once per pass and using
 *     delaunay.find() with the previous point as a hint. O(pixels) per pass, not O(n·pixels).
 *   - MUST run in a worker. Never block the UI thread.
 *   - MUST stay deterministic: seed the initial sample, and don't introduce any
 *     iteration order that depends on hash ordering.
 */
function voronoiSample(
  map: LuminanceMap,
  params: StippleParams,
  seed: number
): Dot[] {
  // Falls back to fast mode until implemented, so the app is never broken.
  return rejectionSample(map, params, seed);
}

function applyJitter(dots: Dot[], params: StippleParams, seed: number): void {
  const rng = makeRng(deriveSeed(seed, "jitter"));
  const amt = params.jitter * params.dotSizeMax;
  for (const dot of dots) {
    dot.x += (rng() - 0.5) * 2 * amt;
    dot.y += (rng() - 0.5) * 2 * amt;
  }
}

function densityAt(map: LuminanceMap, x: number, y: number): number {
  const px = Math.min(map.width - 1, Math.max(0, Math.floor(x)));
  const py = Math.min(map.height - 1, Math.max(0, Math.floor(y)));
  return map.data[py * map.width + px];
}

function colorAt(map: LuminanceMap, x: number, y: number): string {
  const px = Math.min(map.width - 1, Math.max(0, Math.floor(x)));
  const py = Math.min(map.height - 1, Math.max(0, Math.floor(y)));
  const i = (py * map.width + px) * 4;
  return `rgb(${map.rgb[i]},${map.rgb[i + 1]},${map.rgb[i + 2]})`;
}
