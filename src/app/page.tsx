"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PARAMS } from "@/lib/params";
import type { Params } from "@/lib/params";
import { previewDims } from "@/lib/grid";
import { plateRect } from "@/lib/layers/plate";
import { DEFAULT_PLACEHOLDER, randomPlaceholder } from "@/lib/placeholders";
import type { Placeholder } from "@/lib/placeholders";
import { randomConfig } from "@/lib/randomize";
import { useCompositor } from "@/components/useCompositor";
import { Controls } from "@/components/Controls";

const PAD = 48; // stage padding in px, mirrored in the style below

/** Fit a `ratioW×ratioH` box inside the stage element, updating on resize. */
function useContainedSize(ratioW: number, ratioH: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const availW = el.clientWidth - PAD * 2;
      const availH = el.clientHeight - PAD * 2;
      if (availW <= 0 || availH <= 0) return;
      const ar = ratioW / ratioH;
      let w = availW;
      let h = w / ar;
      if (h > availH) {
        h = availH;
        w = h * ar;
      }
      setSize({ w: Math.round(w), h: Math.round(h) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ratioW, ratioH]);
  return { ref, size };
}

export default function Page() {
  const [params, setParams] = useState<Params>(() => ({ ...DEFAULT_PARAMS }));
  const [placeholder, setPlaceholder] = useState<Placeholder>(DEFAULT_PLACEHOLDER);

  const { canvasRef, loading, error, w, h, lastMs } = useCompositor(placeholder.src, params);

  const dims = previewDims(params.aspect);
  const { ref: stageRef, size } = useContainedSize(dims.w, dims.h);

  const update = useCallback(
    (patch: Partial<Params>) => setParams((p) => ({ ...p, ...patch })),
    []
  );

  const selectPlaceholder = useCallback((ph: Placeholder) => {
    // The image doesn't change the format — it's cropped (cover) to the current aspect.
    setPlaceholder(ph);
  }, []);

  // Randomize the whole composition — new image + a fresh config for every layer.
  // Plate/copy fields are preserved (randomConfig omits them), so an active plate keeps
  // its content and an inactive one stays off.
  const randomize = useCallback(() => {
    setPlaceholder(randomPlaceholder(placeholder.id));
    setParams((p) => {
      const next = { ...p, ...randomConfig() };
      // 5x3 can't pair with a centered plate — the center block is too wide/short.
      if (next.grid === "5x3" && next.placement === "center") next.placement = "left";
      return next;
    });
  }, [placeholder.id]);

  // Export the composited canvas as a JPEG (opaque, web/Twitter-safe).
  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `nengine-${placeholder.id}-${params.seed}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.92
    );
  }, [canvasRef, placeholder.id, params.seed]);

  // Copy comes with the plate — no separate toggle.
  const copyRect = params.plate ? plateRect(params.grid, params.placement) : null;

  // Boot loader — show the ripple until the first render is ready, for at least MIN_BOOT
  // so it reads as intentional rather than a flash on cached/fast loads.
  const [booted, setBooted] = useState(false);
  const mountedAt = useRef(Date.now());
  useEffect(() => {
    if (loading || booted) return;
    const MIN_BOOT = 700;
    const wait = Math.max(0, MIN_BOOT - (Date.now() - mountedAt.current));
    const t = setTimeout(() => setBooted(true), wait);
    return () => clearTimeout(t);
  }, [loading, booted]);

  // Draggable artboard that springs back to center on release.
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [springing, setSpringing] = useState(false);
  const onDragStart = (e: React.PointerEvent) => {
    dragOrigin.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    setSpringing(false);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragOrigin.current) return;
    setOffset({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y });
  };
  const onDragEnd = () => {
    if (!dragOrigin.current) return;
    dragOrigin.current = null;
    setSpringing(true);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <>
      {/* Mobile gate — the compositor needs a desktop-width canvas + rail. */}
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#131313] px-8 text-center text-white md:hidden">
        {/* App-icon (white tile + shadow baked into the PNG). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nengine-app-icon.png" alt="Nengine" className="mb-4 w-36" />
        <h1 className="max-w-[280px] font-display text-2xl font-semibold leading-tight text-white">
          Nengine is only available on desktop
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/50">
          Please open this link on a computer to view and use the application.
        </p>
        <a
          href="https://rafaelcespedes.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-hair bg-white/5 px-4 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/10"
        >
          Go To Rafaelcespedes.com →
        </a>
      </div>

      <main className="hidden h-screen w-screen overflow-hidden bg-ink text-white md:flex">
        {/* Boot loader — ripple rings around the mark until the first render is ready. */}
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-ink transition-opacity duration-500 ${
            booted ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="relative h-16 w-16">
            <span className="absolute inset-0 rounded-full border border-white/50 [animation:nengine-ripple_1.6s_ease-out_infinite_both]" />
            <span className="absolute inset-0 rounded-full border border-white/50 [animation:nengine-ripple_1.6s_ease-out_0.8s_infinite_both]" />
          </div>
        </div>

        {/* Canvas stage — dotted "canvas" surface behind the frame */}
      <section
        ref={stageRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        style={{
          padding: PAD,
          backgroundColor: "#1e1e1e",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.07) 1.1px, transparent 1.1px)",
          backgroundSize: "18px 18px",
          backgroundPosition: "center",
        }}
      >
        {/* Info — hover for an about tooltip. */}
        <div className="group absolute left-4 top-4 z-20">
          <button
            type="button"
            aria-label="About Nengine"
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
          </button>
          <div className="pointer-events-none absolute left-0 top-10 w-[300px] rounded-lg border border-hair bg-panel p-3.5 text-xs leading-relaxed text-white/70 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
            Nengine is a tool created for Nucleus by Rafael Cespedes to facilitate and
            partly automate the creation of social media assets. The tool takes the look
            and feel of Nucleus and presents controls that allow guardrailed customization
            — background image, color, text, and more.
          </div>
        </div>

        <div
          className="relative cursor-grab touch-none shadow-[0_20px_80px_rgba(0,0,0,0.55)] active:cursor-grabbing"
          style={{
            width: size.w,
            height: size.h,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transition: springing
              ? "transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "none",
          }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          {/* Fade between images/configs for a smoother swap on select/randomize. */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full transition-opacity duration-300 ease-out"
            style={{ opacity: loading ? 0 : 1 }}
          />

          {copyRect && (
            <PlateCopy rect={copyRect} title={params.plateTitle} body={params.plateBody} />
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center font-mono text-xs text-red-400/80">
              {error}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 font-mono text-[10px] text-white/45">
          {placeholder.label.toLowerCase()} · {params.grid} · {w}×{h} · {lastMs}ms
        </div>
        <a
          href="https://rafaelcespedes.com"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 font-mono text-[10px] text-white/45 transition-colors hover:text-white/80"
        >
          Created by Rafael C. ↗
        </a>
      </section>

      {/* Control rail — floating card */}
      <aside className="my-4 mr-4 w-[340px] shrink-0 overflow-hidden rounded-2xl border border-hair bg-panel shadow-2xl">
        <Controls
          params={params}
          placeholder={placeholder}
          onSelectPlaceholder={selectPlaceholder}
          onRandom={randomize}
          onDownload={download}
          update={update}
        />
      </aside>
      </main>
    </>
  );
}

/**
 * Plate copy, laid over the plate block. The box is a size container, so the copy is
 * sized in container-query units — it scales to fit whatever the plate's dimensions are.
 */
function PlateCopy({
  rect,
  title,
  body,
}: {
  rect: { x: number; y: number; w: number; h: number };
  title: string;
  body: string;
}) {
  return (
    <div
      className="pointer-events-none absolute flex flex-col justify-end overflow-hidden"
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.w * 100}%`,
        height: `${rect.h * 100}%`,
        containerType: "size",
        padding: "4%",
      }}
    >
      {title && (
        <div
          className="font-display font-semibold leading-[0.9] text-white"
          style={{ fontSize: "min(15cqw, 22cqh)" }}
        >
          {title}
        </div>
      )}
      {body && (
        <div
          className="mt-[2.52%] font-sans leading-[1.3] text-white/75"
          style={{ fontSize: "min(6cqw, 9cqh)" }}
        >
          {body}
        </div>
      )}
    </div>
  );
}
