# Layer renderers

One file per layer. Each is a pure function of `(ctx, grid, params)` writing to an offscreen
canvas. The compositor owns the stack; these own nothing but their own pixels.

To implement (see docs/roadmap.md step 3):

- `gridLines.ts` — hairlines on cell boundaries
- `panels.ts`    — cells filled from params.panelColors; distribution seeded via
                   deriveSeed(seed, "panels"). Must be deterministic
- `slice.ts`     — displace cells by params.offset in params.offsetDirection.
                   Clip per cell; the exposed gap is where the look lives
- `plate.ts`     — left / right / center block, grid-relative

All four read cell geometry from `buildGrid()`. Never recompute it locally — that's how
layers drift out of alignment.
