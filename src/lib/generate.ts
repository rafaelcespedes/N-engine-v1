/**
 * The generator seam.
 *
 * Everything the app knows about image generation is this interface. ComfyUI, FLUX,
 * fal, node IDs, workflow JSON — none of that leaks past this file (client side) and
 * src/app/api/render/route.ts (server side).
 *
 * Why: the model landscape turns over every few months, and the stipple engine is the
 * asset here, not the model choice. Swapping providers should be a one-file change.
 *
 * It also means the tool accepts an uploaded image with zero extra plumbing — same
 * downstream pipeline, different source.
 */

import type { AspectRatio } from "./params";

export interface GenerateRequest {
  prompt: string;
  seed: number;
  aspect: AspectRatio;
}

export interface GenerateResult {
  /** Must be served with CORS headers — we read pixels via getImageData. */
  url: string;
  width: number;
  height: number;
  seed: number;
}

export type GenerateProgress = {
  stage: string; // e.g. "generating", "stippling", "saving"
  pct?: number;
};

/**
 * Generates a base render. This is the ONLY call in the app that costs money and
 * time (5–20s, plus possible cold start). It must be user-initiated — never fire it
 * on a slider change or a debounce.
 */
export async function generate(
  req: GenerateRequest,
  onProgress?: (p: GenerateProgress) => void
): Promise<GenerateResult> {
  const res = await fetch("/api/render", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Generation failed (${res.status}). ${detail}`.trim());
  }

  onProgress?.({ stage: "generating" });
  return (await res.json()) as GenerateResult;
}

/**
 * Load a generated (or uploaded) image into a bitmap we can sample.
 * crossOrigin is required or the canvas taints and export silently breaks.
 */
export async function loadBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Could not load image (${res.status}).`);
  return createImageBitmap(await res.blob());
}
