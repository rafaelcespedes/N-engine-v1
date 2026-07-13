# Roadmap

Build order matters here. **Get the compositor feeling right against a placeholder image
before touching any infrastructure.** The interaction is the product; the GPU is plumbing.

---

## 1. Compositor shell — no backend  ✅

- [x] Next.js app, TypeScript strict, Tailwind
- [x] Canvas layer stack composited into one visible canvas (`useCompositor`). Stipple +
      overlay offscreens exist; slice offscreen still to add in step 3
- [x] `Params` state wired to a controls panel (`Controls`, `ui.tsx`)
- [x] Load a placeholder image from `/public` as the base — done as a **placeholder
      library** (`src/lib/placeholders.ts`, `public/placeholders/`): thumbnail picker,
      default on load, and a Random button. Drop a file in the folder + add a row to use it
- [x] Layer caching: a param change only re-renders the layers `invalidatedBy()` returns

**Done when:** you can drag sliders and see instant response, with no network calls at all. ✔

> **Current direction (deviation):** stippling is **out for now** (revisit later). The
> compositor draws the base image straight in (`layers/base.ts`); placeholders are plain
> smooth SVGs again. The `src/lib/stipple` modules stay for when it returns.
> - Aspect ratio is chosen in the UI and drives canvas dims + grid. A **source image no
>   longer changes the format** — it's cropped (cover) to the current aspect.
> - Overlay features (grid lines / panel / slice / plate / plate-copy) use the Figma
>   **add/remove (+/−)** pattern: the button toggles the feature and only then reveals options.
> - Panels take **two explicit color slots** (Color 1 required, Color 2 optional/clearable).
> - Plate copy: title/body, auto-fit to the plate via container-query units.
> - Chrome: renamed **(N)engine** (no subtitle), lighter dotted canvas for contrast,
>   "Created by Rafael C." credit (→ rafaelcespedes.com). Seed lives as a dice button in the
>   header (value in its hover tooltip). A `md:hidden` gate shows "desktop only" on phones.
> - Library is now Midjourney art (`public/placeholders/*.jpg`, square, downscaled ~1440px).
> - Panels: Color 1 is mono (white/black), Color 2 is the accents.
> - Grids: 16:9 adds coarser **7×4 / 5×3**, 3:4 adds **5×6 / 4×5** — chosen to keep cells
>   near-square (see the note in `grid.ts`).

## 2. Stipple — fast mode  ◑ (bypassed — see note above)

- [x] Wire `buildLuminanceMap` + `sampleDots` into the stipple layer
- [x] Render dots to canvas (circle, square, glyph) — `src/lib/layers/stipple.ts`
- [~] Color modes: mono ✔, source ✔ (per-dot from base). **duotone** still maps to one
      color — needs a real two-ink rule (seeded, or by density band)
- [~] Verify 12k dots at 1000px < 16ms. Currently ~20–65ms because the luminance map is
      rebuilt on *every* stipple change. Next perf pass: only rebuild the map when
      gamma/clip/invert/edge move; a dot-count/size/jitter change should just re-sample

**Done when:** gamma and dot count feel like sculpting, not waiting. (Close — perf note above.)

## 3. Overlay layers  ✅

- [x] Grid lines renderer — `src/lib/layers/gridLines.ts`
- [x] Panel renderer — `src/lib/layers/panels.ts`. Distribution decided: two seeded draws
      per cell (on/off vs `coverage`, then color), stable off `deriveSeed(seed, "panels")`
- [x] Slice shift — `src/lib/layers/slice.ts`. Decided as per-line shear (columns for
      up/down, rows for left/right), each line seeded in [0, offset] cells. Sits **above**
      the stipple per the default; swap by compositing it below in `useCompositor`
- [x] Plate renderer — `src/lib/layers/plate.ts`, left / right / center, grid-snapped
- [x] Grid/aspect are coupled both ways in the controls; all overlays read `buildGrid`, so
      a preset change re-flows them automatically
- Controls surface matches the reference mockup (`Controls.tsx`): aspect, grid presets w/
  mini icons, grid-lines/panel/slice/plate toggles, swatch picker (max 2), placement icons

Fonts wired via `next/font`: **Bricolage Grotesque** (headlines) + **IBM Plex Sans** (body).

**Done when:** the screenshot's control system is fully live. ✔

Open follow-ups: plate uses a fixed black fill (no color control yet); panel `coverage` is a
constant (0.4) — expose it if it wants tuning; `duotone` stipple color mode still unbuilt.

## 4. Stipple — quality mode

- [ ] Implement `voronoiSample` (see the spec comment in `src/lib/stipple/sample.ts`)
- [ ] Move it into a Web Worker — must never block the UI thread
- [ ] "Refine" affordance: fast mode while scrubbing, quality on release

## 5. Backend

- [ ] Author the ComfyUI workflow (FLUX + aspect-driven latent dimensions)
- [ ] Export in **API format** (enable dev mode in ComfyUI settings), commit to `workflows/`
- [ ] Deploy: Comfy Deploy or ViewComfy (managed) / RunPod or Modal (container) / fal
- [ ] Wire `/api/render`: patch node inputs, queue, await result
- [ ] Pipe ComfyUI's per-node websocket progress into an honest loading state
- [ ] Rate limit (Upstash Redis, per-IP). Do this before it's public, not after
- [ ] Confirm CORS headers on the returned image — otherwise the canvas taints and export
      silently breaks

## 6. Export

- [ ] PNG at 2–4x (re-run stipple at full res, not the preview map)
- [ ] SVG: grid lines / panels / plate as vector groups; dots as `<circle>`; base as embedded
      raster or omitted for a pure-graphic variant; slice shift via `clipPath` per cell
- [ ] Presets: serialize `Params` to a URL — permalinks and shareable results come free

## 7. Optional — ComfyUI final render

- [ ] Custom Python stipple node (port `sample.ts`; numpy + scipy)
- [ ] "Refined render" path for full-res / multi-pass output the browser can't do live

---

## Open decisions — ask before assuming

**Slice shift above or below the stipple layer.** Above = dots shear at cell boundaries
(brutal, graphic). Below = dots re-flow around displaced cells (integrated). Default is above;
keep swappable.

**Panel two-color distribution rule.** Alternating? Seeded per cell? Banded? Undefined —
but it must be deterministic off the seed.

**Preview / final parity.** Making the browser stippler and the Python node produce identical
output requires the same algorithm, seeded RNG, and sampling order in both languages. That's
fiddly. The alternative is to frame the ComfyUI pass as a distinct "refined render" rather than
a 1:1 export. Start with the latter; only chase bit-parity if it actually grates.

**Working name.** Sampler, or a variant.
