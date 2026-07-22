"use client";

/**
 * Compositor orchestration (app layer — it touches the DOM canvas, so it lives here,
 * not in the pure `src/lib`).
 *
 * Live stippling is currently bypassed: the library supplies images that are already
 * stippled, so the base image is drawn straight in. Every layer here is cheap vector /
 * blit work, so the whole stack is rebuilt on any change — no caching needed. (When live
 * stippling returns, gate its rebuild behind `invalidatedBy` again.)
 *
 * Layer order, bottom → top: base → slice (shears the base) → panels → grid lines → plate.
 * Slice gaps are transparent, so the dotted canvas behind the frame shows through.
 *
 * Animation: when `params.animate` is on, the build-in plays ONCE (rAF drives
 * `composite(t)`, phases from src/lib/animate.ts) and holds at the final state; `replay`
 * (Space) restarts it. `downloadVideo` replays and records one pass plus a short tail
 * via captureStream + MediaRecorder (mp4 where supported, else webm).
 *
 * The plate's copy + logo are drawn into the canvas (layers/content.ts), so JPEG and
 * video exports carry them — no DOM overlay.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Params } from "@/lib/params";
import { buildGrid, previewDims } from "@/lib/grid";
import { ANIM_MS, VIDEO_TAIL_MS, phasesAt } from "@/lib/animate";
import { drawBase } from "@/lib/layers/base";
import { drawSlice } from "@/lib/layers/slice";
import { drawPanels, panelFillMap } from "@/lib/layers/panels";
import { drawDiagonals } from "@/lib/layers/diagonals";
import { drawGridLines } from "@/lib/layers/gridLines";
import { drawPlate } from "@/lib/layers/plate";
import { drawContent, type ContentAssets } from "@/lib/layers/content";
import { makeStaticAssets, drawStaticNoise, type StaticAssets } from "@/lib/layers/staticNoise";

export interface CompositorState {
  loading: boolean;
  error: string | null;
  /** Current canvas dimensions (drive the on-screen frame's aspect). */
  w: number;
  h: number;
  /** ms for the last composite. */
  lastMs: number;
}

export interface Compositor extends CompositorState {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** True while a video export is being recorded. */
  recording: boolean;
  /** Restart the build-in animation (no-op when animation is off). */
  replay: () => void;
  /** Replay and record one animation pass from the canvas, then download it. */
  downloadVideo: (filenameBase: string) => Promise<void>;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/** Prefer mp4 (social-friendly) where MediaRecorder supports it; fall back to webm. */
function pickVideoMime(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    'video/mp4;codecs="avc1.640033"',
    "video/mp4",
    'video/webm;codecs="vp9"',
    "video/webm",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return { mime, ext: mime.includes("mp4") ? "mp4" : "webm" };
    }
  }
  return null;
}

export function useCompositor(src: string, params: Params): Compositor {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const baseLayer = useRef<OffscreenCanvas | null>(null);
  const sliceLayer = useRef<OffscreenCanvas | null>(null);
  const overlayLayer = useRef<OffscreenCanvas | null>(null);

  // Content-layer assets: the mark in both tints + resolved font families.
  const contentAssets = useRef<ContentAssets>({
    logoDark: null,
    logoLight: null,
    headlineFamily: "sans-serif",
    bodyFamily: "sans-serif",
  });

  // TV-static assets (noise tiles + scanlines), built lazily on first animated frame.
  const staticAssets = useRef<StaticAssets | null>(null);

  const paramsRef = useRef<Params>(params);
  paramsRef.current = params;

  /** Wall-clock anchor of the current play; null when idle (holding the final state). */
  const playT0 = useRef<number | null>(null);
  const rafId = useRef(0);

  const [state, setState] = useState<CompositorState>({
    loading: true,
    error: null,
    w: 0,
    h: 0,
    lastMs: 0,
  });
  const [recording, setRecording] = useState(false);

  const composite = useRef<(t?: number | null) => void>(() => {});

  composite.current = (t: number | null = null) => {
    const source = sourceRef.current;
    const canvas = canvasRef.current;
    if (!source || !canvas) return;
    const p = paramsRef.current;
    const ph = t === null ? null : phasesAt(t);

    const t0 = performance.now();
    const { w, h } = previewDims(p.aspect);

    if (!baseLayer.current || baseLayer.current.width !== w || baseLayer.current.height !== h) {
      baseLayer.current = new OffscreenCanvas(w, h);
      sliceLayer.current = new OffscreenCanvas(w, h);
      overlayLayer.current = new OffscreenCanvas(w, h);
    }

    const grid = buildGrid(p.grid, w, h);

    // --- Base image (already stippled). ---
    const bctx = baseLayer.current.getContext("2d");
    if (bctx) drawBase(bctx, source, w, h);

    // --- Slice: shear the base. Transparent gaps reveal the canvas behind. ---
    let art = baseLayer.current;
    if (p.sliceShift && sliceLayer.current) {
      const slctx = sliceLayer.current.getContext("2d");
      if (slctx) {
        drawSlice(
          slctx,
          baseLayer.current,
          grid,
          p.offset,
          p.offsetDirection,
          p.seed
        );
        art = sliceLayer.current;
      }
    }

    // --- Overlays: panels → grid lines → plate (bottom → top). ---
    const octx = overlayLayer.current!.getContext("2d");
    if (octx) {
      octx.clearRect(0, 0, w, h);
      if (p.panel) {
        drawPanels(
          octx,
          grid,
          p.panelColors,
          p.seed,
          p.panelDensity,
          ph ? ph.panelsReveal : 1
        );
      }
      if (p.diagonals) {
        // Only in cells the panels didn't take; shares panelDensity and the panel
        // reveal window so the two build in together.
        drawDiagonals(
          octx,
          grid,
          p.seed,
          p.panelDensity,
          p.panel ? panelFillMap(grid, p.seed, p.panelDensity) : null,
          1,
          ph ? ph.panelsReveal : 1
        );
      }
      if (p.gridLines) drawGridLines(octx, grid, ph ? ph.gridAlpha : 1);
      if (p.plate) {
        drawPlate(
          octx,
          grid,
          p.grid,
          p.placement,
          p.plateTheme === "light" ? "#ffffff" : "#000000",
          ph ? ph.plateReveal : 1,
          p.seed
        );
        drawContent(
          octx,
          grid,
          p.grid,
          p.placement,
          {
            title: p.plateTitle,
            body: p.plateBody,
            logo: p.plateLogo,
            theme: p.plateTheme,
          },
          contentAssets.current,
          ph ? ph.contentProgress : 1
        );
      }
    }

    // --- Composite → visible canvas (transparent ground). ---
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(art, 0, 0);
    if (overlayLayer.current) ctx.drawImage(overlayLayer.current, 0, 0);

    // TV-static overlay — animation only, above everything. `t` is 0..1 loop time.
    if (ph && ph.staticLevel > 0) {
      if (!staticAssets.current) staticAssets.current = makeStaticAssets();
      drawStaticNoise(ctx, w, h, ph.staticLevel, staticAssets.current, t ?? 0);
    }

    // Avoid 60fps setState churn: during animated frames only sync dimension changes.
    setState((s) => {
      if (t !== null) return s.w === w && s.h === h ? s : { ...s, w, h };
      return { ...s, w, h, lastMs: Math.round(performance.now() - t0) };
    });
  };

  // Load the content-layer assets once: resolve font families from the next/font CSS
  // vars, load + pre-tint the logo, and recomposite when fonts are ready so canvas text
  // never sticks with a fallback face.
  useEffect(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    contentAssets.current.headlineFamily =
      rootStyle.getPropertyValue("--font-headline").trim() || "sans-serif";
    contentAssets.current.bodyFamily =
      rootStyle.getPropertyValue("--font-body").trim() || "sans-serif";

    const img = new Image();
    img.onload = () => {
      contentAssets.current.logoDark = img;
      // Black variant for light plates: draw, then keep only the glyph, filled black.
      const oc = new OffscreenCanvas(img.width, img.height);
      const octx = oc.getContext("2d");
      if (octx) {
        octx.drawImage(img, 0, 0);
        octx.globalCompositeOperation = "source-in";
        octx.fillStyle = "#000000";
        octx.fillRect(0, 0, oc.width, oc.height);
        contentAssets.current.logoLight = oc;
      }
      if (sourceRef.current && !paramsRef.current.animate) composite.current(null);
    };
    img.src = "/nengine-mark.svg";

    document.fonts.ready.then(() => {
      if (sourceRef.current && !paramsRef.current.animate) composite.current(null);
    });
  }, []);

  // Load the base source whenever it changes.
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadImage(src)
      .then((img) => {
        if (cancelled) return;
        sourceRef.current = img;
        if (paramsRef.current.animate) play();
        else composite.current(null);
        setState((s) => ({ ...s, loading: false }));
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: e.message }));
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Recompose on any param change while idle (during a play, the rAF loop picks the
  // new params up on its next tick).
  useEffect(() => {
    if (playT0.current === null && sourceRef.current) composite.current(null);
  }, [params]);

  // Play the build-in once and hold. Kicks off whenever animation is switched on.
  const play = useCallback(() => {
    if (!paramsRef.current.animate) return;
    cancelAnimationFrame(rafId.current);
    playT0.current = performance.now();
    const tick = () => {
      const t0 = playT0.current;
      if (t0 === null) return;
      const t = Math.min(1, (performance.now() - t0) / ANIM_MS);
      if (sourceRef.current) composite.current(t);
      if (t >= 1) {
        playT0.current = null; // done — hold the final (static-parity) frame
        return;
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (params.animate) play();
    else {
      cancelAnimationFrame(rafId.current);
      playT0.current = null;
      if (sourceRef.current) composite.current(null);
    }
    return () => cancelAnimationFrame(rafId.current);
  }, [params.animate, play]);

  // Record exactly one loop (aligned to the loop start) and download it.
  const downloadVideo = useCallback(async (filenameBase: string) => {
    const canvas = canvasRef.current;
    const picked = pickVideoMime();
    if (!canvas || !picked) return;

    setRecording(true);
    try {
      await new Promise<void>((resolve, reject) => {
        const stream = canvas.captureStream(60);
        const recorder = new MediaRecorder(stream, {
          mimeType: picked.mime,
          videoBitsPerSecond: 16_000_000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onerror = () => reject(new Error("Recording failed"));
        recorder.onstop = () => {
          stream.getTracks().forEach((tr) => tr.stop());
          const blob = new Blob(chunks, { type: picked.mime });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${filenameBase}.${picked.ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          resolve();
        };
        // Replay from t=0 and capture one pass + a short hold at the end.
        recorder.start();
        play();
        setTimeout(() => recorder.stop(), ANIM_MS + VIDEO_TAIL_MS);
      });
    } finally {
      setRecording(false);
    }
  }, [play]);

  return { ...state, canvasRef, recording, replay: play, downloadVideo };
}
