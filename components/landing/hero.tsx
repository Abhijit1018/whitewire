"use client";

import Link from "next/link";
import { useRef } from "react";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HandUnderline, Scribble } from "./hand";
import { HeroBackdrop } from "./hero-backdrop";

const TRUST = ["No credit card", "Real-time collaboration", "Free forever"];

/**
 * Full-bleed hero: the copy sits centred in an empty "well" that the live
 * backdrop lays itself out around, so no card or wire ever crosses the
 * headline. The two-column version with a static product shot is gone —
 * LiveCanvasDemo immediately below carries the product proof, and the
 * backdrop shows the actual output (wireframe, schema, ERD, sticky note)
 * with two collaborators working it.
 */
export function Hero({ signedIn }: { signedIn: boolean }) {
  // measured by the backdrop, which keeps the board clear of it
  const copyRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section
      className={cn(
        "relative isolate grid place-items-center overflow-hidden",
        // svh, not vh: collapsing mobile browser chrome must not resize the
        // hero mid-scroll. Capped so a tall monitor does not stretch it into
        // emptiness.
        "min-h-[min(100svh,62rem)]",
        "px-[clamp(1.25rem,5vw,3rem)] pt-[clamp(5rem,12vh,8rem)] pb-[clamp(3rem,8vh,5rem)]"
      )}
    >
      <HeroBackdrop copyRef={copyRef} />

      <div ref={copyRef} className="relative z-[4] w-full max-w-[46rem] text-center">
        <motion.div {...rise(0)}>
          <Scribble className="justify-center">Your infinite space for ideas</Scribble>
        </motion.div>

        <motion.h1
          {...rise(0.06)}
          className="mt-3 font-display text-[clamp(2.5rem,7.6vw,5rem)] font-semibold leading-[1.02] tracking-tight text-balance text-foreground"
        >
          Think. Draw.
          <br />
          Create{" "}
          <span className="relative inline-block text-brand-accent">
            together.
            <HandUnderline className="text-brand-accent/70" />
          </span>
        </motion.h1>

        <motion.p
          {...rise(0.12)}
          className="mx-auto mt-6 max-w-[34rem] text-lg leading-relaxed text-pretty text-muted-foreground"
        >
          WhiteWire is an infinite canvas for visual thinking, planning, and building, alone or with
          your team.
        </motion.p>

        <motion.div
          {...rise(0.18)}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href={signedIn ? "/dashboard" : "/sign-up"}
            className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base shadow-sm")}
          >
            {signedIn ? "Open WhiteWire" : "Get started free"}
          </Link>
          <Link
            href="#how"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              // translucent + blurred, so it reads as glass on the board rather
              // than as a panel pasted over it
              "group h-11 gap-1.5 border-border bg-card/70 px-6 text-base backdrop-blur-sm hover:bg-card"
            )}
          >
            Try a demo
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </motion.div>

        <motion.ul
          {...rise(0.24)}
          className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
        >
          {TRUST.map((t) => (
            <li key={t} className="inline-flex items-center gap-1.5">
              <Check className="size-4 text-brand-accent" />
              {t}
            </li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
