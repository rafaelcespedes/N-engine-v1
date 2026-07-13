# Stipple

Prompt → image → stipple → grid system. A browser tool that generates an image, rebuilds it
out of dots, and layers a grid-based graphic system on top: panels, slice shifts, plates.
SVG-first output, plotter-friendly.

## Shape of it

```
Browser (compositor)         Vercel            ComfyUI (serverless GPU)
─────────────────────        ──────────        ────────────────────────
 prompt, seed, aspect  ───►  /api/render  ───►  FLUX + optional LoRA
                       ◄───   (holds key)  ◄───  base render PNG
 grid, panels, slice,
 plate, stipple  ─────────► all client-side, instant, free
```

The browser does all the interactive work. The backend only produces the base image. That
split is the whole design — see `CLAUDE.md`.

## Getting started

```bash
npm install
cp .env.example .env.local   # not needed until step 5 of the roadmap
npm run dev
```

Steps 1–4 of `docs/roadmap.md` run entirely offline against a placeholder image. Don't wire
up the GPU until the compositor feels right.

## Layout

```
CLAUDE.md                    operating brief — read first
docs/
  architecture.md            full architecture + why alternatives were rejected
  controls-spec.md           every control, its range, its layer
  roadmap.md                 build order + open decisions
src/lib/
  params.ts                  the state model. single source of truth
  grid.ts                    shared coordinate system
  rng.ts                     seeded PRNG — determinism is a feature
  generate.ts                the swappable generator seam
  stipple/
    luminance.ts             downscale + tone curve
    sample.ts                fast mode (done), quality mode (spec'd, stubbed)
  layers/                    grid / panel / slice / plate renderers
src/app/api/render/route.ts  the only server surface
workflows/                   ComfyUI graph, API-format export
```
