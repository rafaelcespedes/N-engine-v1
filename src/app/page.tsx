"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PARAMS } from "@/lib/params";
import type { Params } from "@/lib/params";
import { previewDims } from "@/lib/grid";
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

  const { canvasRef, loading, error, w, h, lastMs, recording, replay, downloadVideo } =
    useCompositor(placeholder.src, params);

  // Space replays the build-in (ignored while typing in the copy fields).
  useEffect(() => {
    if (!params.animate) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        replay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [params.animate, replay]);

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

  // Export: video of one loop when animating, otherwise a JPEG of the canvas.
  const download = useCallback(() => {
    const base = `nengine-${placeholder.id}-${params.seed}`;
    if (params.animate) {
      void downloadVideo(base);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${base}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      0.92
    );
  }, [canvasRef, placeholder.id, params.seed, params.animate, downloadVideo]);


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

  // Delayed loading skeleton — only shows if a load actually takes a moment (so cached/
  // instant swaps don't flash it). Kept mounted through the fade-out.
  const [showSkeleton, setShowSkeleton] = useState(false);
  useEffect(() => {
    if (loading) {
      const t = setTimeout(() => setShowSkeleton(true), 180);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowSkeleton(false), 320);
    return () => clearTimeout(t);
  }, [loading]);

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
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#0A0A0A] px-8 text-center text-white md:hidden">
        {/* App-icon (white tile + shadow baked into the PNG). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nengine-app-icon.png" alt="Nengine" className="mb-[12.8px] w-36" />
        <h1 className="max-w-[280px] font-display text-2xl font-normal leading-tight text-white">
          Nengine is only available on desktop
        </h1>
        <p className="mt-[9.6px] max-w-xs text-sm leading-relaxed text-white/50">
          Please open this link on a computer to view and use the application.
        </p>
        <a
          href="https://rafaelcespedes.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-[19.2px] inline-flex items-center gap-2 rounded-lg border border-hair bg-white/5 px-4 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/10"
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
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />


          {/* Loading skeleton — gray shimmer over the art, fades out to reveal the image. */}
          <div
            className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#242424] transition-opacity duration-300 ${
              showSkeleton ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent [animation:nengine-shimmer_1.6s_ease-in-out_infinite]" />
          </div>

          {error && (
            <div className="absolute inset-0 flex items-center justify-center px-4 text-center font-mono text-xs text-red-400/80">
              {error}
            </div>
          )}
        </div>

        {/* Replay hint — only when animation is on. */}
        {params.animate && (
          <div className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-1.5 rounded-lg border border-hair bg-panel px-3 py-2 text-[11px] text-white/60">
            Press the
            <kbd className="rounded border border-hair bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
              Space
            </kbd>
            key to replay animation
          </div>
        )}

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
          recording={recording}
          update={update}
        />
      </aside>
      </main>
    </>
  );
}

