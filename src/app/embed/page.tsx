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
import type { PanelColor, Params, PlatePlacement } from "@/lib/params";
import { previewDims } from "@/lib/grid";
import { DEFAULT_PLACEHOLDER, randomPlaceholder } from "@/lib/placeholders";
import type { Placeholder } from "@/lib/placeholders";
import { randomConfig } from "@/lib/randomize";
import { useCompositor } from "@/components/useCompositor";

const PAD = 20;

/**
 * Placeholder copy the widget's randomizer cycles through — written about what the tool
 * does, so the demo reads like the system describing itself. Half the rolls are
 * title-only and pull from HEADLINE_POOL instead.
 */
const COPY_POOL = [
  { title: "The New Standard", body: "A composable grid system for generative brand art." },
  { title: "Signal, Not Noise", body: "Constraints do the composing — the system does the rest." },
  { title: "Made to Morph", body: "One identity, endless permutations." },
  { title: "Guardrails On", body: "On-brand by construction, not by review." },
  { title: "Press Play", body: "A brand system that ships its own assets." },
  { title: "Rules, Not Files", body: "The system outlives the artifact." },
  { title: "Set the Variables", body: "Fixed grid, free composition." },
  { title: "Infinite Editions", body: "Every render is new. None go off-brand." },
  { title: "Built to Repeat", body: "Consistency without the copy-paste." },
  { title: "Fewer Decisions", body: "The interesting choices, made once." },
  { title: "Narrow Inputs", body: "A small set of controls, a wide range of outputs." },
  { title: "Ships Itself", body: "Launch assets without a designer in the loop." },
  { title: "One Formula", body: "A brand that draws its own artwork." },
  { title: "Nothing Spare", body: "If it doesn't need to move, it isn't a control." },
];

/**
 * Headlines for the title-only rolls. Deliberately ~70% longer than the paired titles
 * above — with no body beneath them they carry the whole message, and the extra length
 * gives the plate something to hold.
 */
const HEADLINE_POOL = [
  "A brand that draws itself",
  "Constraints, not templates",
  "Every output, on brand",
  "Rules that keep producing",
  "One formula, endless output",
  "Set the rules, step back",
  "Fewer controls, more range",
  "Made to run without you",
  "A system that ships assets",
  "Composition by constraint",
  "Never off brand by design",
  "Built to keep on building",
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
      const titleOnly = Math.random() < 0.5;
      // Black panels disappear into the artwork, so the widget leans on them ~30%
      // less than the app's randomizer does: re-roll a black slot to white 30% of
      // the time, taking black from ~50% of rolls to ~35%.
      const panelColors: PanelColor[] =
        cfg.panelColors[0] === "black" && Math.random() < 0.3
          ? ["white", ...cfg.panelColors.slice(1)]
          : cfg.panelColors;
      return {
        ...p,
        ...cfg,
        panelColors,
        gridLines: true, // the widget always shows the grid
        plate: true,
        placement: pick(placements),
        // Half the rolls are title-only, using a longer standalone headline. The
        // content layer already lays out a title with no body (it just sits flush
        // to the bottom of the plate).
        plateTitle: titleOnly ? pick(HEADLINE_POOL) : pair.title,
        plateBody: titleOnly ? "" : pair.body,
        plateLogo: Math.random() < 0.85,
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

      {/* Below the dotted container, on the page background. The caption lives in the
          article itself (a figcaption), so the widget doesn't carry one. */}
      <button
        type="button"
        onClick={randomize}
        className="w-full rounded-md border border-hair bg-white/5 px-4 py-2.5 text-[0.9rem] text-white/80 transition-colors hover:bg-white/10"
      >
        ↻ Generate new artifact
      </button>
    </main>
  );
}
