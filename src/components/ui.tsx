"use client";

/** Small studio-chrome control primitives. Deliberately plain — the canvas is the star. */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scroll container with a custom overlay scrollbar. The native scrollbar is hidden so it
 * takes no layout width (content never shifts when it appears), and a thin thumb is drawn
 * absolutely on top of the content. The thumb is draggable and tracks scroll position.
 */
export function ScrollArea({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; scroll: number } | null>(null);
  const [thumb, setThumb] = useState({ h: 0, top: 0, show: false });

  const measure = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const { clientHeight: ch, scrollHeight: sh, scrollTop: st } = el;
    if (sh <= ch + 1) {
      setThumb((t) => (t.show ? { ...t, show: false } : t));
      return;
    }
    const h = Math.max(28, (ch / sh) * ch);
    const top = ((st / (sh - ch)) * (ch - h)) || 0;
    setThumb({ h, top, show: true });
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true, attributes: true });
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const onDown = (e: React.PointerEvent) => {
    const el = viewport.current;
    if (!el) return;
    drag.current = { y: e.clientY, scroll: el.scrollTop };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const el = viewport.current;
    const d = drag.current;
    if (!el || !d) return;
    const track = el.clientHeight - thumb.h;
    if (track <= 0) return;
    el.scrollTop = d.scroll + ((e.clientY - d.y) / track) * (el.scrollHeight - el.clientHeight);
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div
        ref={viewport}
        className={`h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        {children}
      </div>
      {thumb.show && (
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="absolute right-1 z-20 w-1.5 cursor-pointer rounded-full bg-white/20 transition-colors hover:bg-white/40"
          style={{ height: thumb.h, top: thumb.top }}
        />
      )}
    </div>
  );
}

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
      {/* Clicking anywhere in the row opens a collapsed section. Only the − collapses it. */}
      <div
        className={`flex items-center justify-between ${active ? "" : "cursor-pointer"}`}
        onClick={active ? undefined : () => onToggle(true)}
      >
        <span
          className={`text-sm font-semibold ${
            active ? "text-white/90" : "text-white/55"
          }`}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(!active);
          }}
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
