"use client";

/**
 * The control surface. Two cost profiles, made visually distinct:
 *   - SOURCE: the placeholder library + (stubbed) Generate. Generation is the only
 *     thing that will ever cost money — explicit button, never fires on change.
 *   - Everything else: instant, free, client-side.
 *
 * Overlay features (grid lines, panel, slice, plate) use the Figma add/remove pattern:
 * a +/- button toggles the feature and only then reveals its options.
 */

import type {
  AspectRatio,
  GridPreset,
  OffsetDirection,
  PanelColor,
  Params,
  PlatePlacement,
} from "@/lib/params";
import { GRID_PRESETS, DEFAULT_GRID_FOR } from "@/lib/grid";
import { PANEL_HEX } from "@/lib/palette";
import { PLACEHOLDERS, type Placeholder } from "@/lib/placeholders";
import { Section, Feature, Segmented, Slider } from "./ui";

const ASPECT_OPTS: { value: AspectRatio; label: string }[] = [
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
  { value: "3:4", label: "3:4" },
];

const GRID_ORDER: GridPreset[] = ["5x5", "7x4", "5x3", "5x6", "4x5"];

/** Panels: slot 1 is monochrome (black/white), slot 2 is the accent colors. */
const COLOR1_OPTS: PanelColor[] = ["white", "black"];
const COLOR2_OPTS: PanelColor[] = ["blue", "green", "yellow", "magenta", "orange"];

export function Controls({
  params,
  placeholder,
  onSelectPlaceholder,
  onRandom,
  onDownload,
  update,
}: {
  params: Params;
  placeholder: Placeholder;
  onSelectPlaceholder: (p: Placeholder) => void;
  onRandom: () => void;
  onDownload: () => void;
  update: (patch: Partial<Params>) => void;
}) {
  const selectGrid = (grid: GridPreset) =>
    update({ grid, aspect: GRID_PRESETS[grid].aspect });
  const selectAspect = (aspect: AspectRatio) =>
    update({ aspect, grid: DEFAULT_GRID_FOR[aspect] });

  const gridsForAspect = GRID_ORDER.filter(
    (g) => GRID_PRESETS[g].aspect === params.aspect
  );

  // Panels: two explicit color slots. Slot 2 is optional (clear to go mono).
  const color1: PanelColor = params.panelColors[0] ?? "white";
  const color2: PanelColor | null = params.panelColors[1] ?? null;
  const setColor1 = (c: PanelColor) =>
    update({ panelColors: color2 ? [c, color2] : [c] });
  const setColor2 = (c: PanelColor | null) =>
    update({ panelColors: c ? [color1, c] : [color1] });

  return (
    <div className="scroll-clean flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-hair px-4 py-4">
        <div className="font-display text-lg font-semibold tracking-tight text-white">
          Nengine
        </div>
        <button
          type="button"
          onClick={onDownload}
          title="Download as JPG"
          aria-label="Download image"
          className="flex h-7 items-center gap-1.5 rounded-md border border-hair bg-white/5 px-2.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 2v8M4.75 6.75 8 10l3.25-3.25M3 13.25h10" />
          </svg>
          <span className="text-xs font-medium">Download</span>
        </button>
      </div>

      {/* SOURCE ------------------------------------------------------------ */}
      <Section title="Source">
        {/* Fixed height (~2 rows), scroll for the rest. items-start + content-start
            stop the grid from stretching items, so aspect-ratio can't collapse (Safari). */}
        <div className="scroll-clean grid max-h-[208px] auto-rows-max grid-cols-3 content-start items-start gap-2 overflow-y-auto">
          {PLACEHOLDERS.map((p) => {
            const active = p.id === placeholder.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPlaceholder(p)}
                title={p.label}
                className={`group relative block overflow-hidden rounded-md border transition-colors ${
                  active ? "border-white/80" : "border-hair hover:border-white/40"
                }`}
              >
                {/* Square aspect lives on the image, not the grid item. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  alt={p.label}
                  className="block aspect-square w-full object-cover"
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-left text-[9px] text-white/70">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onRandom}
          className="mt-1 rounded-md border border-hair bg-white/5 px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10"
        >
          ↻ Randomize
        </button>
      </Section>

      {/* FORMAT ------------------------------------------------------------ */}
      <Section title="Format">
        <Segmented
          label="Aspect ratio"
          value={params.aspect}
          options={ASPECT_OPTS}
          onChange={selectAspect}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-white/70">Grid</span>
          <div className="flex flex-wrap gap-1.5">
            {gridsForAspect.map((g) => (
              <GridPresetButton
                key={g}
                preset={g}
                active={params.grid === g}
                onClick={() => selectGrid(g)}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* OVERLAY FEATURES — Figma add/remove --------------------------------- */}
      <Feature
        title="Grid lines"
        active={params.gridLines}
        onToggle={(v) => update({ gridLines: v })}
      />

      <Feature title="Panel" active={params.panel} onToggle={(v) => update({ panel: v })}>
        <SwatchPicker
          label="Color 1"
          options={COLOR1_OPTS}
          value={color1}
          onChange={(c) => c && setColor1(c)}
        />
        <SwatchPicker
          label="Color 2"
          options={COLOR2_OPTS}
          value={color2}
          onChange={setColor2}
          clearable
        />
        <Slider
          label="Density"
          min={0}
          max={1}
          step={0.02}
          value={params.panelDensity}
          format={(v) => v.toFixed(2)}
          onChange={(v) => update({ panelDensity: v })}
        />
      </Feature>

      <Feature
        title="Slice shift"
        active={params.sliceShift}
        onToggle={(v) => update({ sliceShift: v })}
      >
        <Segmented
          label="Offset (cells)"
          value={params.offset}
          options={[
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3" },
          ]}
          onChange={(v) => update({ offset: v as 1 | 2 | 3 })}
        />
        <Segmented
          label="Direction"
          value={params.offsetDirection}
          options={[
            { value: "up", label: "↑" },
            { value: "down", label: "↓" },
            { value: "left", label: "←" },
            { value: "right", label: "→" },
          ]}
          onChange={(v) => update({ offsetDirection: v as OffsetDirection })}
        />
      </Feature>

      <Feature title="Plate & Copy" active={params.plate} onToggle={(v) => update({ plate: v })}>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-white/70">Placement</span>
          <div className="flex gap-1.5">
            {(["left", "right", "center"] as PlatePlacement[]).map((pl) => (
              <PlacementButton
                key={pl}
                placement={pl}
                active={params.placement === pl}
                onClick={() => update({ placement: pl })}
              />
            ))}
          </div>
        </div>

        <Feature
          title="Copy"
          nested
          active={params.plateCopy}
          onToggle={(v) => update({ plateCopy: v })}
        >
          <input
            type="text"
            value={params.plateTitle}
            onChange={(e) => update({ plateTitle: e.target.value })}
            placeholder="Title"
            className="w-full rounded-md border border-hair bg-transparent px-2 py-1.5 font-display text-sm text-white/90 placeholder:text-white/25 focus:outline-none"
          />
          <textarea
            value={params.plateBody}
            onChange={(e) => update({ plateBody: e.target.value })}
            placeholder="Body"
            rows={2}
            className="w-full resize-none rounded-md border border-hair bg-transparent px-2 py-1.5 text-xs text-white/80 placeholder:text-white/25 focus:outline-none"
          />
        </Feature>
      </Feature>
    </div>
  );
}

/** Single-select swatch row over a given palette. Clearable slots return null. */
function SwatchPicker({
  label,
  options,
  value,
  onChange,
  clearable = false,
}: {
  label: string;
  options: PanelColor[];
  value: PanelColor | null;
  onChange: (c: PanelColor | null) => void;
  clearable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-white/70">{label}</span>
      <div className="flex gap-1.5">
        {options.map((c) => {
          const sel = c === value;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(sel && clearable ? null : c)}
              title={c}
              className={`h-6 w-6 rounded transition-transform ${
                sel ? "ring-2 ring-white ring-offset-2 ring-offset-panel" : ""
              }`}
              style={{
                backgroundColor: PANEL_HEX[c],
                boxShadow:
                  c === "black" ? "inset 0 0 0 1px rgba(255,255,255,0.25)" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Mini line-drawing of a grid preset. */
function GridPresetButton({
  preset,
  active,
  onClick,
}: {
  preset: GridPreset;
  active: boolean;
  onClick: () => void;
}) {
  const { cols, rows } = GRID_PRESETS[preset];
  const W = 40;
  const H = 30;
  const lines = [];
  for (let c = 1; c < cols; c++) {
    const x = (c / cols) * W;
    lines.push(<line key={`v${c}`} x1={x} y1={0} x2={x} y2={H} />);
  }
  for (let r = 1; r < rows; r++) {
    const y = (r / rows) * H;
    lines.push(<line key={`h${r}`} x1={0} y1={y} x2={W} y2={y} />);
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={preset}
      className={`flex w-[72px] flex-col items-center gap-1 rounded-md border p-1.5 transition-colors ${
        active ? "border-white/80 bg-white/10" : "border-hair hover:border-white/40"
      }`}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" stroke="currentColor" strokeWidth={0.75}>
        <rect x={0.5} y={0.5} width={W - 1} height={H - 1} fill="none" />
        <g className={active ? "text-white/70" : "text-white/40"} stroke="currentColor">
          {lines}
        </g>
      </svg>
      <span className="font-mono text-[8px] text-white/45">{preset}</span>
    </button>
  );
}

/** Left / right / center placement glyphs. */
function PlacementButton({
  placement,
  active,
  onClick,
}: {
  placement: PlatePlacement;
  active: boolean;
  onClick: () => void;
}) {
  const rect =
    placement === "left"
      ? { x: 2, y: 2, w: 12, h: 20 }
      : placement === "right"
        ? { x: 14, y: 2, w: 12, h: 20 }
        : { x: 8, y: 6, w: 12, h: 12 };
  return (
    <button
      type="button"
      onClick={onClick}
      title={placement}
      className={`flex-1 rounded-md border p-2 transition-colors ${
        active ? "border-white/80 bg-white/10" : "border-hair hover:border-white/40"
      }`}
    >
      <svg viewBox="0 0 28 24" className="w-full">
        <rect x={0.5} y={0.5} width={27} height={23} fill="none" stroke="rgba(255,255,255,0.2)" />
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          fill={active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)"}
        />
      </svg>
    </button>
  );
}
