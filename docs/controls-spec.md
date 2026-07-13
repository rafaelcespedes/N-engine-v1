# Controls spec

Two surfaces, two cost profiles. The UI must make the difference obvious.

---

## Generation inputs — hit the backend

These are the only controls that cost money and time. They sit behind an explicit
**Generate** button. Never fire on change, never debounce-and-fire.

| Control | Values | Notes |
|---|---|---|
| Prompt | text | Server appends a value-structure bias suffix (see `route.ts`) |
| Seed | int | Passed to FLUX *and* seeds every client-side RNG. One seed, whole piece |
| Aspect ratio | 1:1, 16:9, 3:4 | **Required.** Sets generation dimensions. Coupled to grid presets |

Aspect can't be a client-side crop — it has to flow down and set the latent dimensions.

---

## Overlay controls — client-side, instant, free

| Control | Values | Layer |
|---|---|---|
| Grid | 9x9 (1:1), 5x5 (1:1), 9x5 (16:9), 6x8 (3:4) | **Required.** Coordinate system for everything below |
| Grid lines | boolean | overlay |
| Panel | boolean | overlay |
| Panel color | pick 1–2 from: white, black, blue, green, yellow, magenta, orange | overlay |
| Slice shift | boolean | slice |
| Offset | 1, 2, 3 (cells) | slice |
| Offset direction | up, down, left, right | slice |
| Plate | boolean | overlay |
| Placement | left, right, center | overlay |

**Grid presets imply aspect ratio.** Picking 9x5 should auto-set 16:9. Picking 6x8 should
auto-set 3:4. Don't let the user get into an incoherent state where the grid and the canvas
disagree.

**Panel color, when 2 are picked:** distribution rule is an open decision. Whatever it ends
up being — alternating, seeded random per cell, banded — it must be deterministic off
`params.seed`, via `deriveSeed(seed, "panels")`.

---

## Stipple controls — client-side

| Control | Range | Notes |
|---|---|---|
| Mode | fast, quality | fast = rejection sampling (real-time). quality = weighted Voronoi (worker) |
| Dot count | 500–50,000 | Master density |
| Dot size min/max | px | Mapped from local density. The min/max spread controls how tonal vs graphic it reads |
| Gamma | 0.2–3.0 | Tone curve on the luminance map **before** sampling. Highest-impact control in the tool |
| White clip | 0–1 | Luminance above this yields no dots. Keeps paper clean |
| Invert | boolean | White dots on dark ground |
| Relax iterations | 0–100 | Quality mode only. 0 = noisy, 50+ = eerily even |
| Edge emphasis | 0–1 | Sobel-driven density boost on edges. Keeps silhouettes legible at low dot counts |
| Jitter | 0–1 | Post-relaxation offset. De-mechanizes the result |
| Shape | circle, square, glyph | Where it gets brand-y |
| Color mode | mono, duotone, source | "source" = each dot inherits the pixel color beneath it |

**Preview resolution is capped at ~1000px** (`PREVIEW_MAX`). Export re-runs at full res.
This is non-negotiable — sampling a 2048px map on every slider tick freezes the tab.

---

## Layer order

Top → bottom: **overlays → slice shift → stipple → base render**

Slice shift's position relative to stipple is an open creative decision:

- **Above stipple** (current default): slices the already-stippled art. Dots shear apart at
  cell boundaries. Brutal, graphic.
- **Below stipple**: slices the base image, then stipples the result. Dots re-flow around the
  displaced cells. Integrated, subtler.

Both are good. Keep the order swappable internally rather than hardcoding it.
