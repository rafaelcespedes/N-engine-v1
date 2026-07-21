"use client";

import { useEffect, useRef, useState } from "react";

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
  PlateTheme,
} from "@/lib/params";
import { GRID_PRESETS, DEFAULT_GRID_FOR, allowsCenterPlate } from "@/lib/grid";
import { PANEL_HEX } from "@/lib/palette";
import { PLACEHOLDERS, type Placeholder } from "@/lib/placeholders";
import { Section, Feature, Segmented, Slider, ScrollArea } from "./ui";

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
  recording = false,
  update,
}: {
  params: Params;
  placeholder: Placeholder;
  onSelectPlaceholder: (p: Placeholder) => void;
  onRandom: () => void;
  onDownload: () => void;
  recording?: boolean;
  update: (patch: Partial<Params>) => void;
}) {
  const selectGrid = (grid: GridPreset) =>
    update({
      grid,
      aspect: GRID_PRESETS[grid].aspect,
      // Some grids don't offer a centered plate — bump it to left.
      ...(!allowsCenterPlate(grid) && params.placement === "center"
        ? { placement: "left" as PlatePlacement }
        : {}),
    });
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
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ScrollArea className="flex flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hair bg-panel px-4 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nengine-mark.svg" alt="Nengine" className="h-[22px] w-auto" />
            <InfoButton />
          </div>

      {/* BACKGROUND --------------------------------------------------------- */}
      <Section title="Background">
        {/* Fixed height (~2 rows), scroll for the rest. items-start + content-start
            stop the grid from stretching items, so aspect-ratio can't collapse (Safari). */}
        <div className="scroll-clean grid max-h-[208px] auto-rows-max grid-cols-3 content-start items-start gap-2 overflow-y-auto">
          {PLACEHOLDERS.map((p) => (
            <Thumb
              key={p.id}
              placeholder={p}
              active={p.id === placeholder.id}
              onClick={() => onSelectPlaceholder(p)}
            />
          ))}
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
        <div className="flex gap-6">
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
        </div>
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
        title="Diagonals"
        active={params.diagonals}
        onToggle={(v) => update({ diagonals: v })}
      />

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

      <Feature title="Content" active={params.plate} onToggle={(v) => update({ plate: v })}>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-white/70">Placement</span>
          <div className="flex gap-1.5">
            {(["left", "right", "center"] as PlatePlacement[]).map((pl) => {
              const disabled = pl === "center" && !allowsCenterPlate(params.grid);
              return (
                <PlacementButton
                  key={pl}
                  placement={pl}
                  active={params.placement === pl}
                  disabled={disabled}
                  onClick={() => update({ placement: pl })}
                />
              );
            })}
          </div>
        </div>

        <Segmented
          label="Color"
          value={params.plateTheme}
          options={[
            { value: "dark", label: "Black / white" },
            { value: "light", label: "White / black" },
          ]}
          onChange={(v) => update({ plateTheme: v as PlateTheme })}
        />

        {/* Copy comes with the plate — no separate activation. */}
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

        <Feature
          title="Logo"
          nested
          active={params.plateLogo}
          onToggle={(v) => update({ plateLogo: v })}
        />
      </Feature>

      {/* ANIMATION — one fixed choreography, no knobs. Download exports a video. */}
      <Feature
        title="Animation"
        active={params.animate}
        onToggle={(v) => update({ animate: v })}
      >
        <p className="text-[10px] leading-relaxed text-white/30">
          Layers build in, hold, and release on a fixed loop. Download exports one loop
          as video.
        </p>
      </Feature>
        </ScrollArea>
      </div>

      {/* Sticky download footer. */}
      <div className="border-t border-hair bg-panel p-3">
        <button
          type="button"
          onClick={onDownload}
          disabled={recording}
          title={params.animate ? "Download animation as video" : "Download as JPG"}
          aria-label="Download image"
          className={`flex w-full items-center justify-center gap-2 rounded-md bg-white/10 py-2.5 text-sm font-medium text-white transition-colors ${
            recording ? "cursor-wait opacity-60" : "hover:bg-white/[0.16]"
          }`}
        >
          {recording ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
              Recording…
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 16 16"
                width="15"
                height="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 2v8M4.75 6.75 8 10l3.25-3.25M3 13.25h10" />
              </svg>
              Download
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/** Info icon with an about tooltip. Tooltip is fixed-positioned so the panel's
 *  overflow-hidden / rounded corners never clip it. */
function InfoButton() {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: Math.round(r.bottom + 8), left: Math.round(r.right - 300) });
    setOpen(true);
  };
  return (
    <button
      ref={ref}
      type="button"
      aria-label="About Nengine"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-hair bg-white/5 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
    >
      <svg
        viewBox="0 0 20 20"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <circle cx="10" cy="10" r="8" />
        <line x1="10" y1="9.5" x2="10" y2="14" />
        <circle cx="10" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
      </svg>
      {open && (
        <div
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 300 }}
          className="pointer-events-none z-50 rounded-lg border border-hair bg-panel p-3.5 text-left text-xs leading-relaxed text-white/70 shadow-xl"
        >
          Nengine is a tool created for Nucleus by Rafael Cespedes to facilitate and partly
          automate the creation of social media assets. The tool takes the look and feel of
          Nucleus and presents controls that allow guardrailed customization — background
          image, color, text, and more.
        </div>
      )}
    </button>
  );
}

/** Source thumbnail with a pulsing skeleton until its image finishes loading. */
function Thumb({
  placeholder,
  active,
  onClick,
}: {
  placeholder: Placeholder;
  active: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Cached images can finish before onLoad attaches — catch that case.
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      title={placeholder.label}
      className={`group relative block overflow-hidden rounded-md border transition-colors ${
        active ? "border-white/80" : "border-hair hover:border-white/40"
      }`}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-white/[0.07]" />}
      {/* Square aspect lives on the image, not the grid item. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={placeholder.thumb}
        alt={placeholder.label}
        onLoad={() => setLoaded(true)}
        className={`block aspect-square w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-left text-[9px] text-white/70">
        {placeholder.label}
      </span>
    </button>
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
                // Inline boxShadow would override the Tailwind ring (also a box-shadow),
                // so only draw the black swatch's outline when it isn't selected.
                boxShadow:
                  c === "black" && !sel
                    ? "inset 0 0 0 1px rgba(255,255,255,0.25)"
                    : undefined,
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
  disabled = false,
  onClick,
}: {
  placement: PlatePlacement;
  active: boolean;
  disabled?: boolean;
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
      disabled={disabled}
      title={disabled ? `${placement} (unavailable for this grid)` : placement}
      className={`flex-1 rounded-md border p-2 transition-colors ${
        disabled
          ? "cursor-not-allowed border-hair opacity-30"
          : active
            ? "border-white/80 bg-white/10"
            : "border-hair hover:border-white/40"
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
