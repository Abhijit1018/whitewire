"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CanvasMock } from "./canvas-mock";
import { HandUnderline, Scribble } from "./hand";

const TRUST = ["No credit card", "Real-time collaboration", "Free forever"];

export function Hero({ signedIn }: { signedIn: boolean }) {
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
    <section className="relative overflow-hidden px-6 pt-28 pb-16 md:pt-32">
      {/* soft warm wash, top-left */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 -z-10 size-[38rem] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.85 0.09 55 / 0.5), transparent 70%)" }}
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_1.15fr]">
        {/* copy */}
        <div className="text-center lg:text-left">
          <motion.div {...rise(0)}>
            <Scribble className="justify-center lg:justify-start">Your infinite space for ideas</Scribble>
          </motion.div>

          <motion.h1
            {...rise(0.06)}
            className="mt-3 font-display text-[clamp(2.6rem,6.5vw,4.6rem)] font-semibold leading-[1.02] tracking-tight text-foreground"
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
            className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-muted-foreground lg:mx-0"
          >
            WhiteWire is an infinite canvas for visual thinking, planning, and building, alone or with
            your team.
          </motion.p>

          <motion.div
            {...rise(0.18)}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start"
          >
            <Link
              href={signedIn ? "/dashboard" : "/sign-up"}
              className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base shadow-sm")}
            >
              {signedIn ? "Open WhiteWire" : "Get started free"}
            </Link>
            <Link
              href="#how"
              className="group inline-flex h-11 items-center gap-1.5 px-3 text-base font-medium text-foreground"
            >
              Try a demo
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </motion.div>

          <motion.ul
            {...rise(0.24)}
            className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start"
          >
            {TRUST.map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-brand-accent" />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* product shot */}
        <motion.div
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, y: 24, rotate: -1 },
                animate: { opacity: 1, y: 0, rotate: 0 },
                transition: { duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] as const },
              })}
          className="relative"
        >
          <CanvasMock />
        </motion.div>
      </div>
    </section>
  );
}
