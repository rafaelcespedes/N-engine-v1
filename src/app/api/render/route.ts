/**
 * The only server-side surface in the app.
 *
 * Responsibilities:
 *   1. Hold the backend API key. It never reaches the browser.
 *   2. Patch prompt / seed / dimensions into the ComfyUI workflow JSON.
 *   3. Queue the job, wait for the result, return the image URL.
 *   4. Rate limit. This endpoint is the entire cost surface of the product —
 *      an unprotected generate route will get scraped.
 *
 * NEVER expose the ComfyUI instance directly. Stock ComfyUI has no auth: anyone with
 * the URL can queue jobs on your GPU and browse your outputs.
 */

import { NextRequest, NextResponse } from "next/server";
import { ASPECT_DIMENSIONS } from "@/lib/grid";
import type { AspectRatio } from "@/lib/params";
import workflow from "@/../workflows/stipple-base.api.json";

/**
 * Prompt bias. Stippling reduces the image to a luminance map and rebuilds it from
 * dots — texture and fine detail don't survive, value structure does. So we steer the
 * generator toward strong tonal separation. Tune this; it matters more than the model.
 */
const PROMPT_SUFFIX =
  "high contrast, strong directional lighting, clear silhouette, strong value structure";

/** Node IDs in workflows/stipple-base.api.json. Update together if the graph changes. */
const NODE = {
  positivePrompt: "6",
  latentImage: "5",
  sampler: "3",
} as const;

interface Body {
  prompt: string;
  seed: number;
  aspect: AspectRatio;
}

export async function POST(req: NextRequest) {
  // TODO: rate limit here (Upstash Redis, per-IP) before doing any work.

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  const { prompt, seed, aspect } = body;
  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Enter a prompt to generate." }, { status: 400 });
  }
  if (!(aspect in ASPECT_DIMENSIONS)) {
    return NextResponse.json({ error: "Unsupported aspect ratio." }, { status: 400 });
  }

  const { w, h } = ASPECT_DIMENSIONS[aspect];

  // Patch the workflow. This is the whole trick: export the graph from ComfyUI in
  // API format (enable dev mode in settings), then set values on node inputs by ID.
  const graph = structuredClone(workflow) as Record<string, any>;
  graph[NODE.positivePrompt].inputs.text = `${prompt.trim()}, ${PROMPT_SUFFIX}`;
  graph[NODE.latentImage].inputs.width = w;
  graph[NODE.latentImage].inputs.height = h;
  graph[NODE.sampler].inputs.seed = seed;

  // TODO: submit to the ComfyUI host and await the result.
  //
  // Self-hosted ComfyUI:
  //   POST {COMFY_URL}/prompt  { prompt: graph, client_id }
  //   then listen on ws://{COMFY_URL}/ws?clientId=... for progress + "executed",
  //   or poll GET /history/{prompt_id}.
  //   The websocket gives per-node progress — pipe it through so the UI can show
  //   honest stages instead of a spinner.
  //
  // Comfy Deploy / RunPod / fal: use their queue endpoint; each wraps the above.
  //
  // Cold starts are real (30s+ with FLUX weights). Surface that in the UI rather
  // than hiding it.

  return NextResponse.json(
    { error: "Render backend not wired up yet. See docs/roadmap.md step 4." },
    { status: 501 }
  );
}
