"use client";

/**
 * /embed — a minimal Nengine demo for embedding in articles (iframe).
 *
 * Just the dotted stage, the composited artboard, and a Randomize button. Unlike the
 * main app's randomizer, this one always rolls Content too — placeholder copy from a
 * small pool — so every roll shows the full system. Fully fluid: the artboard is
 * contained within whatever size the iframe gives us, and the outer container has
 * 16px rounded corners.
 *
 * Deliberately self-contained (small local copies of the contain/copy-overlay helpers)
 * so it only depends on the committed lib APIs.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_PARAMS } from "@/lib/params";
import type { Params, PlatePlacement } from "@/lib/params";
import { previewDims } from "@/lib/grid";
import { DEFAULT_PLACEHOLDER, randomPlaceholder } from "@/lib/placeholders";
import type { Placeholder } from "@/lib/placeholders";
import { randomConfig } from "@/lib/randomize";
import { useCompositor } from "@/components/useCompositor";

const PAD = 20;

/** Placeholder copy pairs the widget's randomizer cycles through. */
const COPY_POOL = [
  { title: "The New Standard", body: "A composable grid system for generative brand art." },
  { title: "Signal, Not Noise", body: "Constraints do the composing — the system does the rest." },
  { title: "Made to Morph", body: "One identity, endless permutations." },
  { title: "Guardrails On", body: "On-brand by construction, not by review." },
  { title: "Press Play", body: "A brand system that ships its own assets." },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}


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

export default function EmbedPage() {
  // First paint: a composed default so the widget reads instantly.
  const [params, setParams] = useState<Params>(() => ({
    ...DEFAULT_PARAMS,
    panel: true,
    plate: true,
    placement: "left",
    plateTitle: COPY_POOL[0].title,
    plateBody: COPY_POOL[0].body,
  }));
  const [placeholder, setPlaceholder] = useState<Placeholder>(DEFAULT_PLACEHOLDER);

  const { canvasRef, loading } = useCompositor(placeholder.src, params);

  const dims = previewDims(params.aspect);
  const { ref: stageRef, size } = useContainedSize(dims.w, dims.h);

  // Delayed skeleton, same behavior as the app: only shows when a load takes a moment.
  const [showSkeleton, setShowSkeleton] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowSkeleton(loading), loading ? 180 : 320);
    return () => clearTimeout(t);
  }, [loading]);

  // Randomize everything — and always roll Content with placeholder copy.
  const randomize = useCallback(() => {
    setPlaceholder(randomPlaceholder(placeholder.id));
    setParams((p) => {
      const cfg = randomConfig();
      const placements: PlatePlacement[] =
        cfg.grid === "5x3" ? ["left", "right"] : ["left", "right", "center"];
      const pair = pick(COPY_POOL);
      return {
        ...p,
        ...cfg,
        gridLines: true, // the widget always shows the grid
        plate: true,
        placement: pick(placements),
        plateTitle: pair.title,
        plateBody: pair.body,
        plateLogo: Math.random() < 0.85,
        plateLogoPos: Math.random() < 0.6 ? "top" : "bottom",
        plateTheme: (Math.random() < 0.35 ? "light" : "dark") as Params["plateTheme"],
        // Half the rolls play the build-in animation (plays once, then holds).
        animate: Math.random() < 0.5,
      };
    });
  }, [placeholder.id]);

  return (
    // #131313 matches the article page background, so the area around the dotted
    // container reads as part of the article rather than part of the widget.
    <main className="flex h-dvh w-full flex-col gap-3 bg-[#131313] text-white">
      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[16px]"
        style={{
          padding: PAD,
          backgroundColor: "#1e1e1e",
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.07) 1.1px, transparent 1.1px)",
          backgroundSize: "16px 16px",
          backgroundPosition: "center",
        }}
      >
        <div
          className="relative shadow-[0_12px_44px_rgba(0,0,0,0.5)]"
          style={{ width: size.w, height: size.h }}
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />


          <div
            className={`pointer-events-none absolute inset-0 overflow-hidden bg-[#242424] transition-opacity duration-300 ${
              showSkeleton ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent [animation:nengine-shimmer_1.6s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      {/* Below the dotted container, on the page background. */}
      <div className="flex flex-col gap-2.5 pb-1">
        <button
          type="button"
          onClick={randomize}
          className="w-full rounded-md border border-hair bg-white/5 px-4 py-2.5 text-[0.9rem] text-white/80 transition-colors hover:bg-white/10"
        >
          ↻ Generate new artifact
        </button>
        <p className="text-center text-[11px] leading-relaxed text-white/40">
          This is a lite version of the tool I created. View and test the full version{" "}
          <a
            href="https://nengine.rafaelcespedes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
          >
            here
          </a>
          .
        </p>
      </div>
    </main>
  );
}
