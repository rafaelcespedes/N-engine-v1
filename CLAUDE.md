# CLAUDE.md

Operating brief for Claude Code on this repo. Read this first, every session.

## What we're building

A browser tool that generates an image from a prompt, stipples it, and layers a grid-based
graphic system on top (panels, slice shifts, plates). Output is a composed, exportable
graphic — SVG-first, plotter-friendly.

Built by Rafael Cespedes (RC, I.D.P.) — product and brand identity designer. This is both a
working creative tool and a portfolio piece. Craft standard is high: this ships under his name.

## The one architectural rule

**The browser is a layer compositor. The backend only produces the base render.**

Everything interactive — stippling, grid, panels, slice shift, plate — runs client-side on
canvas. It is free and instant. The only thing that costs money and time is generating the
base image (prompt + seed + aspect ratio → ComfyUI → PNG).

If you ever find yourself moving an interactive control to the server, stop. That is the
wrong direction and it kills the tool's feel.

Corollary: the generator is a swappable dependency behind one interface. Do not let
ComfyUI/FLUX specifics leak past `src/lib/generate.ts`.

## Layer stack (z-order, top → bottom)

1. **Overlays** — grid lines, colored panels, plate. Vector shapes.
2. **Slice shift** — displaces grid cells of the art layer.
3. **Stipple** — dots derived from the base image's luminance.
4. **Base render** — PNG from ComfyUI.

Each layer is an offscreen canvas, cached. A param change re-renders only the layers it
affects. Never regenerate the stipple point set when only an overlay param changed.

## State model

One `Params` object (`src/lib/params.ts`) is the single source of truth. The composite is a
pure function of it. A `Params` blob must fully reconstruct any output — this is what makes
presets, permalinks, and reproducibility free. Anything random is seeded.

Do not introduce state that lives outside `Params` and affects the render. If you're tempted,
add a field instead.

## Grid is the coordinate system

Cols/rows/cell-size derive from the grid preset (which is coupled to aspect ratio). Slice
offsets are in cells. Panels snap to cells. Plate placement is grid-relative. All layers read
from `src/lib/grid.ts` — never recompute cell geometry locally in a layer renderer.

## Working agreements

- **TypeScript, strict.** No `any` in `src/lib`.
- **`src/lib` is pure.** No React, no DOM globals beyond `OffscreenCanvas`/`ImageData`. It
  must be portable — the stipple algorithm gets ported to Python later, and the pure module is
  what makes that possible.
- **Heavy work goes in a Web Worker.** Voronoi relaxation must never block the UI thread.
- **Downscale before sampling.** Luminance map maxes at ~1000px for the interactive preview.
  Full resolution only on export. This is the difference between 60fps sliders and a frozen tab.
- **Seeded RNG everywhere.** Use the shared PRNG in `src/lib/rng.ts`. Never `Math.random()`
  in render code.
- **No secrets client-side.** The ComfyUI/fal key lives only in the Vercel route.
- Commit the ComfyUI workflow JSON (`workflows/`) like code. Pin custom node versions.

## Interaction model

The UI must telegraph the cost split. The prompt panel has an explicit **Generate** button
(costs money, takes 5–20s, may cold-start). Every other control responds instantly with no
button. Don't blur that line.

Loading state for generation should be honest and specific — ComfyUI's websocket gives
per-node progress, so show real stages, not a spinner.

## Build order

See `docs/roadmap.md`. Short version: get the compositor working against a placeholder image
first. Do not touch infrastructure until the interaction feels right.

## Reference

- `docs/architecture.md` — full architecture, decisions, and why alternatives were rejected
- `docs/controls-spec.md` — every control, its range, and its layer
- `docs/roadmap.md` — build order and open decisions

## Open decisions — ask before assuming

- Slice shift above or below the stipple layer (both looks are good; default above, keep swappable)
- Panel two-color distribution rule (must be deterministic off the seed)
- Whether the ComfyUI final render must match the browser preview exactly, or is framed as a
  distinct "refined render"
