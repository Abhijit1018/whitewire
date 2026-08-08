"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useHeroAmbient } from "./use-hero-ambient";

/* ------------------------------------------------------------------ *\
   The hero backdrop, in four layers:

     L0  paper + CSS wash   paints on the first frame; no network, no JS
     L1  live <canvas>      PRIMARY. Sized to its container, so it is never
                            cropped, and it responds to the cursor.
     L2  <video> loop       fallback for devices that cannot hold framerate.
                            Rendered from the same scene code, so it cannot
                            drift from L1.
     L3  scrim              settles the centre and the bottom edge

   THE CANVAS LEADS. The video only steps in when the framerate watchdog in
   use-hero-ambient says this machine cannot afford the live layer — the one
   case where a hardware-decoded video genuinely beats a 2D canvas.

   THE CROP SWAP IS DELIBERATELY NOT `<source media="...">`. Browsers
   evaluate a <video>'s <source media> once, at load, and never re-evaluate
   it on resize; rotate a phone and you would be stuck with whichever crop
   matched at first paint. So the crop is chosen from matchMedia, keyed off
   ASPECT RATIO — aspect is what decides how much `object-fit: cover` throws
   away — and applied by setting .src and calling .load().
\* ------------------------------------------------------------------ */

type Crop = "landscape" | "portrait" | "ultrawide";

const CROPS: Record<Crop, { src: string; poster: string }> = {
  // 1920×1080
  landscape: { src: "/hero/hero-loop-16x9.mp4", poster: "/hero/hero-loop-16x9.jpg" },
  // 1080×1920
  portrait: { src: "/hero/hero-loop-9x16.mp4", poster: "/hero/hero-loop-9x16.jpg" },
  // 3840×1080 — authored at 32:9, not 21:9, so the widest real monitor
  // downscales it instead of upscaling a narrower source and losing height.
  ultrawide: { src: "/hero/hero-loop-21x9.mp4", poster: "/hero/hero-loop-21x9.jpg" },
};

export function HeroBackdrop({
  /** The copy block the board must lay itself out around. */
  copyRef,
}: {
  copyRef?: React.RefObject<HTMLElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [wanted, setWanted] = useState<"canvas" | "video">("canvas");
  const [playing, setPlaying] = useState(false);
  const [crop, setCrop] = useState<Crop>("landscape");

  // Never autoplay motion at someone who asked for less of it: the canvas
  // draws one composed still and stops, and the video is not rendered at all.
  const reduce = useReducedMotion() ?? false;
  const mode = reduce ? "canvas" : wanted;

  const onSlow = useCallback(() => setWanted("video"), []);

  useHeroAmbient(canvasRef, { enabled: mode === "canvas", onSlow, copyRef });

  /* ---------------- which crop this frame wants ---------------- */
  useEffect(() => {
    const portrait = window.matchMedia("(max-aspect-ratio: 1/1)");
    const ultrawide = window.matchMedia("(min-aspect-ratio: 2/1)");
    const pick = () =>
      setCrop(ultrawide.matches ? "ultrawide" : portrait.matches ? "portrait" : "landscape");
    pick();
    portrait.addEventListener("change", pick);
    ultrawide.addEventListener("change", pick);
    window.addEventListener("orientationchange", pick);
    return () => {
      portrait.removeEventListener("change", pick);
      ultrawide.removeEventListener("change", pick);
      window.removeEventListener("orientationchange", pick);
    };
  }, []);

  /* ---------------- load and play the chosen crop ---------------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (mode !== "video") {
      // drop the source rather than leave a paused frame decoded behind the
      // canvas — it is 1.5 MB of memory for something nobody can see.
      // `emptied` fires off load() and clears `playing` for us.
      video.pause();
      video.removeAttribute("src");
      video.load();
      return;
    }

    const c = CROPS[crop];
    video.poster = c.poster;
    video.src = c.src;
    video.load();
    void video.play().catch(() => undefined);
  }, [mode, crop]);

  const onVideoError = useCallback(() => {
    // the fallback failed too — go back to the canvas rather than show nothing
    setWanted("canvas");
  }, []);

  const videoLive = mode === "video" && playing;

  return (
    <>
      {/* L0 · paper + wash. Present before any JS runs, so the hero is never
          a blank rectangle on a slow connection. */}
      <div
        aria-hidden
        className="absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 55% at 18% 22%, oklch(0.85 0.09 55 / 0.42), transparent 70%)," +
            "radial-gradient(55% 50% at 84% 74%, oklch(0.8 0.1 48 / 0.3), transparent 72%)," +
            "var(--background)",
        }}
      />

      {/* L1 · the live canvas */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 z-[1] size-full transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: videoLive ? 0 : 1 }}
      />

      {/* L2 · the rendered fallback */}
      {!reduce && (
        <video
          ref={videoRef}
          aria-hidden
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => setPlaying(true)}
          onEmptied={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onError={onVideoError}
          className="pointer-events-none absolute inset-0 z-[2] size-full object-cover object-center transition-opacity duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            // a hair of overscan hides the 1px edge seam some decoders leave
            transform: "scale(1.02)",
            opacity: videoLive ? 1 : 0,
          }}
        />
      )}

      {/* L3 · legibility scrim. Deliberately light: the backdrop clears a well
          in the middle by itself, so this only has to soften the very centre
          and settle the bottom edge into the next section. A heavier wash is
          what made an earlier version read as fog — paper, cards and scrim all
          landed inside about 5% of luminance. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[3]"
        style={{
          background:
            "radial-gradient(46% 38% at 50% 46%, oklch(0.99 0.006 75 / 0.5), transparent 72%)," +
            "linear-gradient(to bottom, oklch(0.974 0.009 74 / 0.32) 0%, transparent 20%, transparent 74%, oklch(0.974 0.009 74 / 0.88) 100%)",
        }}
      />
    </>
  );
}
