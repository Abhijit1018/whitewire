"use client";

import { useRef } from "react";
import { Sparkles } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";

const ACCENT: Record<string, string> = {
  violet: "var(--brand-violet)",
  blue: "var(--brand-blue)",
  teal: "#0d9488",
};

// Boxes of the generated architecture (mirrors a real SaaS backend).
const NODES = [
  { x: 365, y: 20, w: 150, h: 52, label: "Web App", accent: "violet", delay: 0.2 },
  { x: 70, y: 155, w: 150, h: 52, label: "Auth", accent: "blue", delay: 0.9 },
  { x: 365, y: 155, w: 150, h: 52, label: "API", accent: "blue", delay: 1.0 },
  { x: 660, y: 155, w: 150, h: 52, label: "Payments", accent: "blue", delay: 1.1 },
  { x: 210, y: 300, w: 150, h: 52, label: "Postgres", accent: "teal", delay: 1.7 },
  { x: 520, y: 300, w: 150, h: 52, label: "S3", accent: "teal", delay: 1.8 },
];

const EDGES = [
  { d: "M440 72 C 440 115, 145 112, 145 155", delay: 0.5 },
  { d: "M440 72 L 440 155", delay: 0.6 },
  { d: "M440 72 C 440 115, 735 112, 735 155", delay: 0.7 },
  { d: "M145 207 C 145 258, 285 254, 285 300", delay: 1.3 },
  { d: "M440 207 C 440 256, 285 256, 285 300", delay: 1.25 },
  { d: "M735 207 C 735 256, 595 256, 595 300", delay: 1.35 },
];

export function LiveCanvasDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();
  const show = reduce ? true : inView;
  // With reduced motion the initial state is already "show", so nothing tweens.
  const initialState = reduce ? "show" : "hidden";
  const animateState = show ? "show" : "hidden";

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    show: { pathLength: 1, opacity: 1 },
  } as const;
  const pop = (delay: number) =>
    ({
      hidden: { scale: 0.7, opacity: 0 },
      show: { scale: 1, opacity: 1, transition: { delay, duration: 0.4, ease: "backOut" } },
    }) as const;
  const fade = (delay: number) =>
    ({
      hidden: { opacity: 0, y: 8 },
      show: { opacity: 1, y: 0, transition: { delay, duration: 0.4 } },
    }) as const;

  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Watch an idea come alive</h2>
        <p className="mt-3 text-muted-foreground">
          Describe what you want — WhiteWire drafts the diagram on the canvas, node by node, in
          real time. One prompt, a full picture.
        </p>
      </div>

      <div
        ref={ref}
        className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
      >
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-4 py-2.5">
          <span className="size-3 rounded-full bg-red-400" />
          <span className="size-3 rounded-full bg-yellow-400" />
          <span className="size-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-muted-foreground">saas-architecture · WhiteWire</span>
        </div>

        <div className="bg-dotted-grid p-5 sm:p-8">
          {/* the prompt */}
          <motion.div
            variants={fade(0)}
            initial={initialState}
            animate={animateState}
            className="mb-5 inline-flex max-w-full items-center gap-2 rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-2.5 shadow-sm"
          >
            <Sparkles className="size-4 shrink-0 text-brand-violet" />
            <span className="font-hand text-lg text-foreground">
              Design the backend architecture for my SaaS app
            </span>
          </motion.div>

          {/* the generated diagram */}
          <svg viewBox="0 0 880 372" className="h-auto w-full">
            {EDGES.map((e, i) => (
              <motion.path
                key={i}
                d={e.d}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#ww-arrow)"
                variants={draw}
                initial={initialState}
                animate={animateState}
                transition={{ delay: e.delay, duration: 0.7, ease: "easeInOut" }}
              />
            ))}

            {NODES.map((n) => (
              <motion.g
                key={n.label}
                variants={pop(n.delay)}
                initial={initialState}
                animate={animateState}
                style={{ transformOrigin: `${n.x + n.w / 2}px ${n.y + n.h / 2}px` }}
              >
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.w}
                  height={n.h}
                  rx="12"
                  fill="white"
                  stroke={ACCENT[n.accent]}
                  strokeWidth="2"
                />
                <circle cx={n.x + 20} cy={n.y + n.h / 2} r="4" fill={ACCENT[n.accent]} />
                <text
                  x={n.x + n.w / 2 + 8}
                  y={n.y + n.h / 2 + 5}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="500"
                  fill="#1f2937"
                >
                  {n.label}
                </text>
              </motion.g>
            ))}

            <defs>
              <marker id="ww-arrow" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto">
                <path d="M0 0 L6 3 L0 6 Z" fill="#94a3b8" />
              </marker>
            </defs>
          </svg>

          {/* the AI response */}
          <motion.div
            variants={fade(2.1)}
            initial={initialState}
            animate={animateState}
            className="mt-5 inline-flex max-w-full items-center gap-2.5 rounded-2xl rounded-br-sm bg-gradient-brand px-4 py-2.5 text-white shadow-sm"
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="text-sm font-medium">
              Here&rsquo;s your architecture — Web App wired to Auth, API &amp; Payments, backed by
              Postgres and S3.
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
