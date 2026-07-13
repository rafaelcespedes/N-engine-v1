# Stipple tool — project context

## What this is

A web app that generates an image from a text prompt, applies a stippling effect, and layers a system of grid-based graphic controls (panels, slice shifts, plates) on top. Built by Rafael Cespedes (RC, I.D.P.) as both a working creative tool and a portfolio-grade artifact. Related to an in-progress shader/post-processing tool (working name: Sampler) covering halftone, warp, stippling, and hatching effects.

Design philosophy for the tool itself: deterministic, reproducible, vector-first where possible. Every output should be reconstructable from a single JSON params object.

## Architecture (decided)

Three tiers. The browser is a layer compositor; the backend produces the base asset.

1. **Browser (Next.js) — layer compositor.** All interactive work happens here at zero marginal cost: stippling, slice shift, panels, plates, grid lines. Canvas/WebGL rendering; weighted Voronoi runs in a Web Worker.
2. **Vercel serverless — `/api/render`.** Thin proxy. Holds the backend API key, injects params into the ComfyUI workflow JSON, queues the job, polls or listens on websocket, returns the image URL. Rate limited via Upstash Redis.
3. **ComfyUI on serverless GPU — generation.** FLUX (Schnell for drafts, Pro/FLUX 2 for quality) plus optional LoRA, authored visually as a ComfyUI workflow and exposed via ComfyUI's native API (workflow exported in **API format**, params patched into node inputs by ID). Hosting candidates: Comfy Deploy or ViewComfy (managed, versioned endpoints), RunPod Serverless or Modal (custom container, per-second GPU), or fal (also runs ComfyUI workflows). Optionally includes a **custom stipple node** (Python, numpy/scipy) for high-res final renders.

### Data flow

- Prompt + seed + aspect ratio → `/api/render` → ComfyUI → base render PNG → browser.
- All other controls → layer stack in the browser. Never touch the backend.
- Only prompt/aspect changes cost money and time (5–20s + possible cold start). Everything else is instant.

### Decisions made along the way

- **fal + FLUX chosen over Midjourney.** Midjourney has no official public API (as of mid-2026; only survey-stage enterprise talk). Unofficial wrappers violate ToS, risk bans, and add 30–60s latency. The MJ aesthetic advantage mostly dies at the stippler anyway since only composition and value structure survive. If the MJ look is wanted: prompt-engineer FLUX (dramatic lighting, shallow DOF, painterly grade — appended server-side) or run an MJ-style LoRA from Civitai.
- **ComfyUI hybrid chosen over pure fal endpoint** because Rafael already works in ComfyUI and wants visual authorship of the pipeline. The hybrid keeps live stippling client-side so interactivity isn't sacrificed.
- **Generator stays swappable.** Single `generateImage(prompt, seed, aspect)` interface; also accepts an uploaded image (doubles the use cases). Model landscape moves fast; the stippler is the defensible asset, not the model choice.

## Browser layer stack (z-order, top → bottom)

1. **Overlays** — grid lines, colored panels, plate. Native vector shapes.
2. **Slice shift** — displaces grid cells of the art layer.
3. **Live stipple layer** — dots generated from the base image's luminance.
4. **Base render** — PNG from ComfyUI.

Layers cached as separate offscreen canvases; only the affected layer re-renders on a param change (stipple point set only regenerates when stipple params change).

## Controls spec

### Generation inputs (fire the backend)
- **Prompt** — text; server appends bias toward strong value structure ("high contrast, strong directional lighting, clear silhouette").
- **Seed** — passed to FLUX for reproducible generations.
- **Aspect ratio (required)** — 1:1, 16:9, 3:4. Sets generation dimensions in the ComfyUI workflow. Coupled to grid presets (9x5 implies 16:9; 6x8 implies 3:4) — picking a grid can auto-set the ratio.

### Overlay controls (client-side only)
- **Grid (required)** — presets: 9x9 (1:1), 5x5 (1:1), 9x5 (16:9), 6x8 (3:4). The grid model (cols, rows, cell size) is the single source of truth all overlay layers read from.
- **Grid lines** — boolean.
- **Panel** — boolean; **Panel color** — pick 1–2 from palette (white, transparent/black, blue, green, yellow, magenta, orange). Two-color distribution rule must be deterministic off the seed.
- **Slice shift** — boolean; **Offset** — 1, 2, or 3 cells; **Offset direction** — up, down, left, right.
- **Plate** — boolean; **Placement** — left half, right half, centered inset.

### Stipple controls (client-side)
- Dot count (500–50,000)
- Dot size min/max (mapped to local luminance)
- Gamma/contrast curve on the luminance map (highest-impact slider)
- Threshold / white clip
- Invert
- Relaxation iterations (quality mode)
- Seed (deterministic RNG)
- Dot shape (circle, square, custom glyph)
- Color mode (mono, duotone, sample-from-source)
- Edge emphasis (Sobel pass boosting density along edges)
- Jitter (post-relaxation)

### Stipple algorithms
- **Fast mode:** rejection/importance sampling — real-time, used while scrubbing sliders.
- **Quality mode:** weighted Voronoi / Lloyd's relaxation (Secord's algorithm) — run as a "refine" step in a Web Worker.
- Downscale luminance map to ~800–1000px max dimension for interactive preview; full res only on export.

## State model

One params object: `{ prompt, seed, aspect, grid, gridLines, panel, panelColors, sliceShift, offset, offsetDirection, plate, placement, ...stippleParams }`. The compositor is a pure function of it. A saved preset fully reconstructs any output — shareable/permalink-able results for free.

## Export

- **SVG (primary):** grid lines, panels, plate as vector groups; stipple dots as `<circle>` elements (plotter-ready); base render as embedded raster or omitted for a pure-graphic variant. Slice shift fragments the raster into cell-sized tiles via `clipPath` per cell.
- **PNG:** 2–4x, re-run stipple at full res.
- **ComfyUI final render (optional):** locked-in params sent to the custom stipple node for full-res/multi-pass output the browser can't do in real time.

## Open decisions

- **Slice shift position in the chain.** Above the stipple (dots shear at cell boundaries — brutal, graphic) vs below (dots re-flow around displaced cells — integrated). Default above; keep order swappable internally.
- **Preview/final parity.** Browser stippler and Python node matching exactly requires identical algorithm + seeded RNG + sampling order in JS and Python. Alternative: frame the ComfyUI pass as a distinct "refined render" mode. Start with the latter; chase bit-parity only if it grates.
- **Panel two-color rule.** Alternation vs seeded cell mapping — undefined; must be deterministic.
- **Working name** — Sampler or a variant.

## Infrastructure and safety considerations

- **Cost exposure:** the generate endpoint is the only per-click cost. Aggressive per-IP rate limiting (Upstash), debounced/explicit generate button. UI should telegraph the cost split: explicit "generate" action vs instant controls.
- **Security:** stock ComfyUI has no auth — never expose the instance directly; always behind the proxy or a managed endpoint.
- **Workflow format:** export ComfyUI workflows in API format (enable dev mode). Commit workflow JSON to the repo; pin custom node versions in the container — custom nodes break on updates constantly.
- **Cold starts:** containers with FLUX weights take 30s+ from zero. Accept on first render; use ComfyUI's websocket per-node progress for an honest loading state ("generating → stippling → saving"). Keep-warm available at cost if needed.
- **CORS:** reading pixels via `getImageData` requires CORS headers on the image; fal's CDN handles it, but self-hosted storage (R2/Blob) must set `Access-Control-Allow-Origin` or the canvas taints and export silently breaks.
- **Licensing:** FLUX Schnell is Apache 2.0; FLUX Dev is non-commercial unless via an API provider; Pro is API-only. Fine through hosted APIs; verify if self-hosting.
- **Moderation:** keep fal/FLUX safety checker flags on if the tool goes public.
- **Storage (optional):** Cloudflare R2 or Vercel Blob for gallery/history; R2 has zero egress fees.
- **Scale-out path (not now):** if server-side rendering of huge exports or video is ever needed, serverless timeouts become the constraint — move heavy rendering to a small worker (Fly.io/Railway). Keep stipple logic in a pure module so it can move.

## Suggested next steps

1. Prototype the browser compositor: canvas layer stack + controls wired against a placeholder image (validate the interaction before touching infra).
2. Implement fast-mode stippler; add Voronoi quality mode in a worker.
3. Build the slice shift / panel / plate overlay renderers off the shared grid model.
4. Stand up the ComfyUI workflow (FLUX + aspect-driven dimensions), deploy behind Comfy Deploy or RunPod, wire `/api/render`.
5. Write the custom Python stipple node for final renders.
6. SVG export, presets/permalinks, rate limiting, then polish.
