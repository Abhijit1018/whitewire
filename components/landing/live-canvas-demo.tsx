"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

export function LiveCanvasDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();
  // When reduced motion is on, jump straight to the final composed state.
  const show = reduce ? true : inView;
  // With reduced motion, initial state is already "show" so there is nothing to tween.
  const initialState = reduce ? "show" : "hidden";

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    show: { pathLength: 1, opacity: 1, transition: { duration: 1.1, ease: "easeInOut" } },
  } as const;
  const pop = (delay: number) => ({
    hidden: { scale: 0.6, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { delay, duration: 0.4, ease: "backOut" } },
  } as const);

  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Watch an idea come alive</h2>
        <p className="mt-3 text-muted-foreground">
          Sketch a thought — WhiteWire turns it into diagrams, wireframes, and docs, drawing itself
          out in real time on one infinite canvas.
        </p>
      </div>

      <div
        ref={ref}
        className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-dotted-grid p-6 shadow-sm"
      >
        <svg viewBox="0 0 800 360" className="h-auto w-full">
          {/* hand-drawn sketch stroke */}
          <motion.path
            d="M60 90 q40 -50 90 -10 t90 -5"
            fill="none"
            stroke="var(--brand-violet)"
            strokeWidth="3"
            strokeLinecap="round"
            variants={draw}
            initial={initialState}
            animate={show ? "show" : "hidden"}
          />
          {/* node A */}
          <motion.g variants={pop(1.0)} initial={initialState} animate={show ? "show" : "hidden"}>
            <rect x="80" y="150" width="150" height="64" rx="12" fill="white" stroke="var(--brand-violet)" strokeWidth="2" />
            <text x="155" y="188" textAnchor="middle" fontSize="16" fill="#111">Web App</text>
          </motion.g>
          {/* arrow A→B */}
          <motion.path
            d="M230 182 H360"
            fill="none"
            stroke="var(--brand-blue)"
            strokeWidth="2"
            strokeDasharray="6 6"
            markerEnd="url(#arrow)"
            variants={draw}
            initial={initialState}
            animate={show ? "show" : "hidden"}
            transition={{ delay: 1.4 }}
          />
          {/* node B */}
          <motion.g variants={pop(1.7)} initial={initialState} animate={show ? "show" : "hidden"}>
            <rect x="360" y="150" width="150" height="64" rx="12" fill="white" stroke="var(--brand-blue)" strokeWidth="2" />
            <text x="435" y="188" textAnchor="middle" fontSize="16" fill="#111">Auth Service</text>
          </motion.g>
          {/* node C (branch) */}
          <motion.path
            d="M510 182 H640"
            fill="none"
            stroke="var(--brand-blue)"
            strokeWidth="2"
            strokeDasharray="6 6"
            markerEnd="url(#arrow)"
            variants={draw}
            initial={initialState}
            animate={show ? "show" : "hidden"}
            transition={{ delay: 2.1 }}
          />
          <motion.g variants={pop(2.4)} initial={initialState} animate={show ? "show" : "hidden"}>
            <rect x="640" y="150" width="120" height="64" rx="12" fill="white" stroke="var(--brand-blue)" strokeWidth="2" />
            <text x="700" y="188" textAnchor="middle" fontSize="16" fill="#111">Postgres</text>
          </motion.g>
          {/* sticky note pops last */}
          <motion.g variants={pop(2.8)} initial={initialState} animate={show ? "show" : "hidden"}>
            <rect x="300" y="250" width="200" height="70" rx="6" fill="#fef08a" transform="rotate(-4 400 285)" />
            <text x="400" y="292" textAnchor="middle" fontSize="18" fill="#713f12" fontFamily="var(--font-hand), cursive" transform="rotate(-4 400 285)">
              Here's your architecture ✦
            </text>
          </motion.g>
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0 0 L6 3 L0 6 Z" fill="var(--brand-blue)" />
            </marker>
          </defs>
        </svg>
      </div>
    </section>
  );
}
