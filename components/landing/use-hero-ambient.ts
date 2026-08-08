"use client";

import { useEffect, useRef } from "react";
import { PERIOD, draw, setFonts, type Pointer, type Well } from "@/lib/hero-scene";

/* ------------------------------------------------------------------ *\
   The live, interactive hero backdrop. This is the PRIMARY layer, not a
   placeholder for the video.

   Why this way round: a video cannot respond to a cursor, and a video
   authored at one aspect has to be cropped into every other one. A canvas
   sized to its own container has neither problem — it lays out for the
   frame it is actually in, and it can react. The rendered loops in
   public/hero/ are kept, but demoted to a fallback for devices that cannot
   hold framerate (see hero-backdrop.tsx).

   Interaction is deliberately restrained: parallax on the wash and the
   cards, dots waking near the cursor, wires and cards lifting as you
   approach them. It should read as the surface being alive, not as a toy.
\* ------------------------------------------------------------------ */

type Options = {
  /** false while the video fallback is carrying the hero. */
  enabled: boolean;
  /** Sustained framerate below the budget — the signal to hand over. */
  onSlow?: (fps: number) => void;
  /**
   * The copy block the board has to stay clear of. Measured rather than
   * guessed: the guess was tuned on a laptop, and on a phone the real block
   * is about twice as tall, which put the stacked cards on top of the trust
   * row. Leave it out and the scene falls back to the guess.
   */
  copyRef?: React.RefObject<HTMLElement | null>;
};

/**
 * The scene names its faces literally ("Geist", "Caveat"), but next/font
 * gives them hashed families. Canvas fillText falls back silently to a
 * system face when a family does not resolve, so read the real stacks off
 * the document and hand them to the scene before the first paint.
 */
function adoptDocumentFonts() {
  const cs = getComputedStyle(document.documentElement);
  const read = (name: string) => cs.getPropertyValue(name).trim();
  const ui = read("--font-geist-sans");
  const mono = read("--font-geist-mono");
  const hand = read("--font-caveat");

  setFonts({
    ui: ui ? `${ui}, system-ui, -apple-system, sans-serif` : undefined,
    mono: mono ? `${mono}, ui-monospace, monospace` : undefined,
    hand: hand ? `${hand}, "Segoe Script", cursive` : undefined,
  });

  if (!document.fonts?.load) return Promise.resolve();
  return Promise.all([
    document.fonts.load(`600 16px ${ui || "Geist"}`),
    document.fonts.load(`600 16px ${mono || "GeistMono"}`),
    document.fonts.load(`600 16px ${hand || "Caveat"}`),
  ]).catch(() => undefined);
}

/**
 * The copy block as a radius about the canvas centre, in device pixels.
 *
 * Expanded symmetrically — `max` of the two sides on each axis — rather than
 * offset, because the hero's top and bottom padding are not equal, so the
 * block does not sit on the canvas centre. Keeping the ellipse centred means
 * the scene's own maths is unchanged; the cost is a little slack on whichever
 * side is nearer, which is free space anyway.
 */
function measureWell(canvas: HTMLCanvasElement, el: HTMLElement | null, dpr: number): Well | null {
  if (!el) return null;
  const cr = canvas.getBoundingClientRect();
  const er = el.getBoundingClientRect();
  if (!cr.width || !cr.height || !er.width) return null;

  const cx = (cr.width / 2) * dpr;
  const cy = (cr.height / 2) * dpr;
  const left = (er.left - cr.left) * dpr;
  const top = (er.top - cr.top) * dpr;
  const right = left + er.width * dpr;
  const bottom = top + er.height * dpr;

  // breathing room, so a card can sit just outside the ellipse without
  // touching the text it is meant to be clear of
  const pad = Math.min(cr.width, cr.height) * dpr * 0.035;

  return {
    rx: Math.max(Math.abs(left - cx), Math.abs(right - cx)) + pad,
    ry: Math.max(Math.abs(top - cy), Math.abs(bottom - cy)) + pad,
  };
}

export function useHeroAmbient(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  { enabled, onSlow, copyRef }: Options
) {
  // Kept in a ref so a changed callback never restarts the loop.
  const slowRef = useRef(onSlow);
  useEffect(() => {
    slowRef.current = onSlow;
  }, [onSlow]);

  const enabledRef = useRef(enabled);
  const startRef = useRef<(() => void) | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let raf = 0;
    let running = false;
    let visible = true;
    let t0: number | null = null;
    let disposed = false;

    // damped pointer. `strength` fades the whole interaction in and out so it
    // never snaps on at the first mousemove or off the instant you leave.
    const ptr: Pointer = { x: 0, y: 0, on: false, strength: 0 };
    let tx = 0;
    let ty = 0;
    let targetStrength = 0;

    // framerate watchdog — the signal hero-backdrop uses to decide whether
    // this machine can actually afford the live layer
    let frames = 0;
    let fpsT0 = 0;
    let fps = 60;
    let slowRuns = 0;
    let slowFired = false;

    // the copy block the board lays itself out around; re-measured whenever
    // the canvas or the copy changes size (a webfont landing does both)
    let wellHint: Well | null = null;

    function render(time: number) {
      if (!W || !H) return;
      draw(ctx!, W, H, (time / PERIOD) % 1, ptr, wellHint);
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      // cap DPR: this is a soft background; 3x on a modern phone triples fill
      // cost for detail nobody can resolve
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(rect.width * dpr));
      const h = Math.max(1, Math.round(rect.height * dpr));
      const hint = measureWell(canvas!, copyRef?.current ?? null, dpr);
      const sameHint =
        (!hint && !wellHint) ||
        (!!hint &&
          !!wellHint &&
          Math.abs(hint.rx - wellHint.rx) < 1 &&
          Math.abs(hint.ry - wellHint.ry) < 1);
      if (w === W && h === H && sameHint) return;
      W = w;
      H = h;
      wellHint = hint;
      canvas!.width = W;
      canvas!.height = H;
      render(t0 == null ? 0 : (performance.now() - t0) / 1000);
    }

    function frame(now: number) {
      if (!running) return;
      if (t0 == null) {
        t0 = now;
        fpsT0 = now;
      }

      ptr.x += (tx - ptr.x) * 0.05;
      ptr.y += (ty - ptr.y) * 0.05;
      ptr.strength += (targetStrength - ptr.strength) * 0.06;
      ptr.on = ptr.strength > 0.01;

      render((now - t0) / 1000);

      frames++;
      if (now - fpsT0 >= 1000) {
        fps = (frames * 1000) / (now - fpsT0);
        frames = 0;
        fpsT0 = now;
        // Judge on SUSTAINED slowness, not one bad second. A single sample
        // catches every transient — a background tab waking, another render
        // starting — and handing the hero to a video because of a hiccup is a
        // much worse failure than a second of dropped frames.
        if (now - t0 > 2000) {
          slowRuns = fps < 40 ? slowRuns + 1 : 0;
          if (!slowFired && slowRef.current && slowRuns >= 3) {
            slowFired = true;
            slowRef.current(fps);
          }
        }
      }
      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduce || disposed || !enabledRef.current) return;
      running = true;
      fpsT0 = performance.now();
      frames = 0;
      raf = window.requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    }
    startRef.current = start;
    stopRef.current = stop;

    /* ---------------- input ---------------- */
    function setTarget(clientX: number, clientY: number) {
      const r = canvas!.getBoundingClientRect();
      tx = ((clientX - r.left) / r.width) * 2 - 1;
      ty = ((clientY - r.top) / r.height) * 2 - 1;
      targetStrength = 1;
    }
    function onPointerMove(e: PointerEvent) {
      if (reduce) return;
      setTarget(e.clientX, e.clientY);
    }
    function onPointerLeave() {
      targetStrength = 0;
    }
    function onTouch(e: TouchEvent) {
      if (reduce || !e.touches.length) return;
      setTarget(e.touches[0].clientX, e.touches[0].clientY);
    }
    function onVisibility() {
      if (document.hidden) stop();
      else if (visible) start();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    if (copyRef?.current) ro.observe(copyRef.current);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible && !document.hidden) start();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(canvas);

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    // touch drags the light around too; it fades out when the finger lifts
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onPointerLeave, { passive: true });

    resize();
    if (reduce) render(0); // one composed still, and nothing after it
    else start();

    // The cards draw real text, so wait for the faces, then repaint. The
    // running loop repaints itself; a reduced-motion still does not.
    adoptDocumentFonts().then(() => {
      if (disposed) return;
      // the copy reflows when the display face lands, so re-measure the well
      resize();
      if (reduce) render(0);
    });

    return () => {
      disposed = true;
      stop();
      startRef.current = null;
      stopRef.current = null;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onPointerLeave);
    };
  }, [canvasRef, copyRef]);

  // Handing over to the video stops the loop; coming back restarts it.
  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) startRef.current?.();
    else stopRef.current?.();
  }, [enabled]);
}
