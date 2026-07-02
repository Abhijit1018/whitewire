"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Float } from "./motion";

function FloatCard({
  className,
  amplitude,
  duration,
  delay,
  children,
}: {
  className: string;
  amplitude: number;
  duration: number;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <Float
      className={cn("absolute hidden lg:block", className)}
      amplitude={amplitude}
      duration={duration}
      delay={delay}
    >
      {children}
    </Float>
  );
}

export function Hero({ signedIn }: { signedIn: boolean }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Parallax: different depths drift at different rates (disabled under reduced motion).
  const slow = useTransform(scrollY, [0, 500], [0, reduce ? 0 : -40]);
  const fast = useTransform(scrollY, [0, 500], [0, reduce ? 0 : -90]);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden bg-dotted-grid px-6 pt-24 text-center">
      {/* animated gradient blob backdrop */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[42rem] -translate-x-1/2 rounded-full bg-gradient-brand opacity-20 blur-3xl"
        animate={reduce ? undefined : { scale: [1, 1.15, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 mx-auto max-w-3xl">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
          <Lock className="size-3.5 text-brand-violet" />
          Bring Your Own AI · Your Keys · Your Freedom
        </span>
        <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] font-bold leading-[1.05] tracking-tight">
          <span className="text-gradient-brand">Think. Visualize.</span>
          <br />
          <span className="text-gradient-brand">Collaborate. Build.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          The AI-native canvas where ideas become specs, diagrams, wireframes, and docs. Any model,
          local or cloud. You stay in control.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/sign-up"}
            className={cn(buttonVariants({ size: "lg" }), "bg-gradient-brand text-white hover:opacity-90")}
          >
            {signedIn ? "Open WhiteWire" : "Get started free"}
          </Link>
          <Link href="#how" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            See how it works
          </Link>
        </div>
      </div>

      {/* Floating decorations — parallax depth, hidden on mobile */}
      <motion.div style={{ y: slow }} className="pointer-events-none absolute inset-0">
        <FloatCard className="left-[6%] top-[22%]" amplitude={12} duration={5} delay={0}>
          <div className="w-56 rounded-xl border border-border bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-muted-foreground">System architecture</p>
            <div className="mb-2 h-1.5 w-full rounded-full bg-gradient-brand" />
            <div className="flex gap-1.5">
              <div className="h-8 flex-1 rounded border border-border" />
              <div className="h-8 flex-1 rounded border border-border" />
              <div className="h-8 flex-1 rounded border border-border" />
            </div>
          </div>
        </FloatCard>
        <FloatCard className="right-[6%] top-[18%]" amplitude={14} duration={6} delay={0.4}>
          <div className="w-52 rounded-xl border border-border bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Wireframe</p>
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="mt-2 flex gap-1.5">
              <div className="h-10 flex-1 rounded border border-border" />
              <div className="h-10 flex-1 rounded border border-border" />
            </div>
          </div>
        </FloatCard>
      </motion.div>

      <motion.div style={{ y: fast }} className="pointer-events-none absolute inset-0">
        <FloatCard className="right-[10%] top-[46%]" amplitude={10} duration={4.5} delay={0.2}>
          <div className="-rotate-6 rounded-md bg-yellow-200 px-4 py-3 font-hand text-lg text-yellow-900 shadow-lg">
            Add onboarding flow ✦
          </div>
        </FloatCard>
        <FloatCard className="left-[12%] top-[52%]" amplitude={9} duration={5.5} delay={0.6}>
          <div className="flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 shadow-lg">
            <span className="grid size-6 place-items-center rounded-full bg-gradient-brand text-[10px] font-bold text-white">
              A
            </span>
            <span className="text-xs text-muted-foreground">Abhi is editing…</span>
          </div>
        </FloatCard>
        <FloatCard className="left-[18%] top-[34%]" amplitude={11} duration={5} delay={0.9}>
          <div className="grid size-11 place-items-center rounded-xl bg-gradient-brand text-white shadow-lg">
            ✓
          </div>
        </FloatCard>
      </motion.div>
    </section>
  );
}
