"use client";

/** Small studio-chrome control primitives. Deliberately plain — the canvas is the star. */

import type { ReactNode } from "react";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-hair px-4 py-4">
      <div className="mb-3 text-sm font-semibold text-white/90">{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

/**
 * A collapsible, toggleable feature block — the Figma pattern. The +/- button on the
 * right IS the enable control: `+` adds/expands the feature, `−` removes/collapses it.
 * Options only render while active.
 */
export function Feature({
  title,
  active,
  onToggle,
  children,
  nested = false,
}: {
  title: string;
  active: boolean;
  onToggle: (v: boolean) => void;
  children?: ReactNode;
  nested?: boolean;
}) {
  return (
    <div className={nested ? "" : "border-b border-hair px-4 py-4"}>
      <div className="flex items-center justify-between">
        <span
          className={`text-sm font-semibold ${
            active ? "text-white/90" : "text-white/55"
          }`}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={() => onToggle(!active)}
          aria-label={`${active ? "Remove" : "Add"} ${title}`}
          className="flex h-5 w-5 items-center justify-center rounded border border-hair text-sm leading-none text-white/55 transition-colors hover:border-white/40 hover:text-white"
        >
          {active ? "−" : "+"}
        </button>
      </div>
      {active && children && (
        <div className="mt-3 flex flex-col gap-3">{children}</div>
      )}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/70">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-white/50">
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between text-left"
    >
      <span className="text-xs text-white/70">{label}</span>
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${
          value ? "bg-white/80" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-ink transition-transform ${
            value ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-white/70">{label}</span>
      <div className="flex gap-1 rounded-md bg-white/5 p-1">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded px-2 py-1 text-[11px] transition-colors ${
              o.value === value
                ? "bg-white/85 text-ink"
                : "text-white/55 hover:text-white/80"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
