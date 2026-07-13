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
    setParams((p) => ({ ...p, ...randomConfig() }));
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

  const showCopy = params.plate && params.plateCopy;
  const copyRect = showCopy ? plateRect(params.grid, params.placement) : null;

  return (
    <>
      {/* Mobile gate — the compositor needs a desktop-width canvas + rail. */}
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-ink px-8 text-center text-white md:hidden">
        {/* App-icon (white tile + shadow baked into the PNG). */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nengine-app-icon.png" alt="Nengine" className="mb-4 w-36" />
        <h1 className="max-w-[280px] font-display text-2xl font-semibold leading-tight text-white">
          Nengine is only available on desktop
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/50">
          To view and use this application please open this link on your computer.
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
          className="relative shadow-[0_20px_80px_rgba(0,0,0,0.55)]"
          style={{ width: size.w, height: size.h }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {copyRect && (
            <PlateCopy rect={copyRect} title={params.plateTitle} body={params.plateBody} />
          )}

          {loading && (
            <div className="absolute inset-0 animate-pulse rounded-sm bg-white/[0.06]" />
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

      {/* Control rail */}
      <aside className="w-[340px] shrink-0 border-l border-hair bg-panel">
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
          className="mt-[2.8%] font-sans text-white/75"
          style={{ fontSize: "min(6cqw, 9cqh)" }}
        >
          {body}
        </div>
      )}
    </div>
  );
}
