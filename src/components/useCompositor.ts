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
 */

import { useEffect, useRef, useState } from "react";
import type { Params } from "@/lib/params";
import { buildGrid, previewDims } from "@/lib/grid";
import { drawBase } from "@/lib/layers/base";
import { drawSlice } from "@/lib/layers/slice";
import { drawPanels } from "@/lib/layers/panels";
import { drawGridLines } from "@/lib/layers/gridLines";
import { drawPlate } from "@/lib/layers/plate";

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
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

export function useCompositor(src: string, params: Params): Compositor {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceRef = useRef<HTMLImageElement | null>(null);
  const baseLayer = useRef<OffscreenCanvas | null>(null);
  const sliceLayer = useRef<OffscreenCanvas | null>(null);
  const overlayLayer = useRef<OffscreenCanvas | null>(null);

  const paramsRef = useRef<Params>(params);
  paramsRef.current = params;

  const [state, setState] = useState<CompositorState>({
    loading: true,
    error: null,
    w: 0,
    h: 0,
    lastMs: 0,
  });

  const composite = useRef<() => void>(() => {});

  composite.current = () => {
    const source = sourceRef.current;
    const canvas = canvasRef.current;
    if (!source || !canvas) return;
    const p = paramsRef.current;

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
        drawSlice(slctx, baseLayer.current, grid, p.offset, p.offsetDirection, p.seed);
        art = sliceLayer.current;
      }
    }

    // --- Overlays: panels → grid lines → plate (bottom → top). ---
    const octx = overlayLayer.current!.getContext("2d");
    if (octx) {
      octx.clearRect(0, 0, w, h);
      if (p.panel) drawPanels(octx, grid, p.panelColors, p.seed, p.panelDensity);
      if (p.gridLines) drawGridLines(octx, grid);
      if (p.plate) drawPlate(octx, grid, p.grid, p.placement);
    }

    // --- Composite → visible canvas (transparent ground). ---
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(art, 0, 0);
    if (overlayLayer.current) ctx.drawImage(overlayLayer.current, 0, 0);

    setState((s) => ({ ...s, w, h, lastMs: Math.round(performance.now() - t0) }));
  };

  // Load the base source whenever it changes.
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loadImage(src)
      .then((img) => {
        if (cancelled) return;
        sourceRef.current = img;
        composite.current();
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

  // Recompose on any param change.
  useEffect(() => {
    if (sourceRef.current) composite.current();
  }, [params]);

  return { ...state, canvasRef };
}
