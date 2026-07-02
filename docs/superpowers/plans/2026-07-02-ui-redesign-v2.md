# WhiteWire UI Redesign v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v2 refinements to the live WhiteWire app — a fuller/interactive landing page, provider model-picker in Settings, an Account page, marketing content pages, and route-level skeleton loading.

**Architecture:** Extends the shipped v1 design system (brand tokens, `motion/react`, `Logo`, grey/white app shell). New backend surfaces: a `listModels` service + auth-guarded `/api/models` route (WS-C) and Supabase admin/account actions (WS-D). Everything else is presentational React under the existing App Router.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind v4, base-ui, `motion` (Framer Motion successor), Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Drizzle ORM, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-02-ui-redesign-v2-design.md`

## Global Constraints

- Reuse brand system: tokens `--brand-violet`/`--brand-blue`; classes `.text-gradient-brand`, `.bg-gradient-brand`, `.bg-dotted-grid`; `font-hand` (Caveat); `Logo` at `@/components/brand/logo`; `motion/react`.
- All animation MUST no-op under `prefers-reduced-motion` — reuse `Reveal`/`Float` from `components/landing/motion.tsx` or `useReducedMotion()`.
- base-ui `Button` has NO `asChild`. CTAs = `<Link className={cn(buttonVariants({...}), "…")}>`. Import `buttonVariants` from `@/components/ui/button`, `cn` from `@/lib/utils`.
- App pages: grey `bg-surface-muted` page bg, white surfaces (`Card`/`bg-surface`), `border-border`; gradient only for accents.
- Do NOT change existing server-action field names. `addKeyAction` contract stays exactly `provider,label,baseUrl,model,apiKey`.
- Provider set is exactly: `openai-compatible`, `anthropic`, `google`.
- Section anchor targets get `scroll-mt-20` (fixed 64px nav).
- Verification per task: `pnpm build` passes; `pnpm test` stays green (baseline 96) + new tests. Whole-repo `pnpm lint` has pre-existing debt — judge only the task's own files.
- Secrets (API keys, service-role key) must never be logged or shipped to the client.

---

## Task 1: Hero — full-height, responsive, richer floats (WS-A1)

**Files:**
- Modify: `components/landing/hero.tsx`

**Interfaces:**
- Consumes: `Float` from `components/landing/motion.tsx`; `buttonVariants` from `@/components/ui/button`; `cn`; `Lock` from `lucide-react`; `useScroll`, `useTransform`, `useReducedMotion`, `motion` from `motion/react`.
- Produces: `Hero({ signedIn }: { signedIn: boolean })` (unchanged signature).

- [ ] **Step 1: Read the current file** `components/landing/hero.tsx` to preserve the BYO pill copy (`Bring Your Own AI · Your Keys · Your Freedom`), headline text (`Think. Visualize. Collaborate. Build.`), and CTA hrefs.

- [ ] **Step 2: Rewrite `hero.tsx`** keeping all copy/hrefs, changing layout to full-height + responsive + richer floats:

```tsx
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
```

- [ ] **Step 3: Build.** Run `pnpm build`. Expected: compiles, all routes generated.

- [ ] **Step 4: Commit.**

```bash
git add components/landing/hero.tsx
git commit -m "feat(landing): full-height responsive hero with parallax floats + blob"
```

---

## Task 2: Live-canvas animated demo (replace what-it-is) (WS-A2)

**Files:**
- Create: `components/landing/live-canvas-demo.tsx`
- Delete: `components/landing/what-it-is.tsx`

**Interfaces:**
- Consumes: `useInView`, `useReducedMotion`, `motion` from `motion/react`; `useRef`.
- Produces: `LiveCanvasDemo()` (default-less named export). Replaces `WhatItIs` in the page composition (Task 6).

- [ ] **Step 1: Create `components/landing/live-canvas-demo.tsx`** — a scroll-triggered SVG scene that draws itself:

```tsx
"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

export function LiveCanvasDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();
  // When reduced motion is on, jump straight to the final composed state.
  const show = reduce ? true : inView;

  const draw = {
    hidden: { pathLength: 0, opacity: 0 },
    show: { pathLength: 1, opacity: 1, transition: { duration: 1.1, ease: "easeInOut" } },
  } as const;
  const pop = (delay: number) => ({
    hidden: { scale: 0.6, opacity: 0 },
    show: { scale: 1, opacity: 1, transition: { delay, duration: 0.4, ease: "backOut" } },
  });

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
            initial="hidden"
            animate={show ? "show" : "hidden"}
          />
          {/* node A */}
          <motion.g variants={pop(1.0)} initial="hidden" animate={show ? "show" : "hidden"}>
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
            initial="hidden"
            animate={show ? "show" : "hidden"}
            transition={{ delay: 1.4 }}
          />
          {/* node B */}
          <motion.g variants={pop(1.7)} initial="hidden" animate={show ? "show" : "hidden"}>
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
            initial="hidden"
            animate={show ? "show" : "hidden"}
            transition={{ delay: 2.1 }}
          />
          <motion.g variants={pop(2.4)} initial="hidden" animate={show ? "show" : "hidden"}>
            <rect x="640" y="150" width="120" height="64" rx="12" fill="white" stroke="var(--brand-blue)" strokeWidth="2" />
            <text x="700" y="188" textAnchor="middle" fontSize="16" fill="#111">Postgres</text>
          </motion.g>
          {/* sticky note pops last */}
          <motion.g variants={pop(2.8)} initial="hidden" animate={show ? "show" : "hidden"}>
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
```

- [ ] **Step 2: Delete the old file.**

```bash
git rm components/landing/what-it-is.tsx
```

- [ ] **Step 3: Build.** Run `pnpm build`. (Expected FAIL here: `app/page.tsx` still imports `WhatItIs`. That import is fixed in Task 6 — if you are running tasks in order, note the failure and proceed; Task 6 makes the page compile. If your reviewer requires a green build per task, do Task 6's page edit in the same commit.) To keep this task independently green, ALSO apply the page swap now: in `app/page.tsx` replace the `WhatItIs` import with `LiveCanvasDemo` and the `<WhatItIs />` usage with `<LiveCanvasDemo />` (Task 6 will finalize full ordering). Re-run `pnpm build` — expect PASS.

- [ ] **Step 4: Commit.**

```bash
git add components/landing/live-canvas-demo.tsx app/page.tsx
git commit -m "feat(landing): self-animating canvas demo replacing static what-it-is"
```

---

## Task 3: Use-cases + integrations sections (WS-A3)

**Files:**
- Create: `components/landing/use-cases.tsx`
- Create: `components/landing/integrations.tsx`

**Interfaces:**
- Consumes: `Reveal` from `components/landing/motion.tsx`; `lucide-react` icons `Network`, `LayoutTemplate`, `FileText`, `Lightbulb`.
- Produces: `UseCases()`, `Integrations()`.

- [ ] **Step 1: Create `components/landing/use-cases.tsx`:**

```tsx
import { Network, LayoutTemplate, FileText, Lightbulb } from "lucide-react";
import { Reveal } from "./motion";

const CASES = [
  { icon: Network, title: "System design", body: "Turn a sentence into a full architecture diagram." },
  { icon: LayoutTemplate, title: "Wireframes & UI", body: "Sketch a screen, generate clean interfaces." },
  { icon: FileText, title: "Docs & specs", body: "Draft specs and documentation from your canvas." },
  { icon: Lightbulb, title: "Brainstorming", body: "Think out loud on an infinite, AI-aware canvas." },
];

export function UseCases() {
  return (
    <section className="bg-surface-muted px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">One canvas, many jobs</h2>
          <p className="mt-3 text-muted-foreground">However you think, WhiteWire keeps up.</p>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CASES.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-white p-6 transition-transform hover:-translate-y-1">
                <div className="mb-4 grid size-11 place-items-center rounded-xl bg-gradient-brand text-white">
                  <c.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `components/landing/integrations.tsx`:**

```tsx
import { Reveal } from "./motion";

const MODELS = ["OpenAI", "Anthropic", "Google Gemini", "Ollama", "LM Studio", "Groq", "Mistral", "OpenRouter"];

export function Integrations() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Any model, any source</h2>
          <p className="mt-3 text-muted-foreground">
            Bring your own key — cloud or local. No lock-in, no hidden fees.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {MODELS.map((m) => (
            <span
              key={m}
              className="rounded-full border border-border bg-surface-muted px-4 py-2 text-sm font-medium text-foreground"
            >
              {m}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Build.** Run `pnpm build`. Expected PASS.

- [ ] **Step 4: Commit.**

```bash
git add components/landing/use-cases.tsx components/landing/integrations.tsx
git commit -m "feat(landing): use-cases + integrations sections"
```

---

## Task 4: FAQ + final CTA sections (WS-A3)

**Files:**
- Create: `components/landing/faq.tsx`
- Create: `components/landing/final-cta.tsx`

**Interfaces:**
- Consumes: `Reveal`; `buttonVariants`, `cn`; `next/link`. FAQ uses native `<details>` (no new dep).
- Produces: `Faq()`, `FinalCta({ signedIn }: { signedIn: boolean })`.

- [ ] **Step 1: Create `components/landing/faq.tsx`:**

```tsx
import { Reveal } from "./motion";

const QA = [
  { q: "Do I need to buy credits?", a: "No. WhiteWire is bring-your-own-key — you pay your model provider directly, or run models locally for free." },
  { q: "Which models can I use?", a: "Any OpenAI-compatible endpoint, Anthropic, or Google — plus local runtimes like Ollama and LM Studio." },
  { q: "Is my data private?", a: "Your keys and canvas stay yours. Requests go straight from your account to your chosen provider." },
  { q: "Can I run models locally?", a: "Yes — point an OpenAI-compatible base URL at Ollama or LM Studio and you're set." },
  { q: "Is it collaborative?", a: "Yes — the canvas is built for real-time collaboration that scales with your team." },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-surface-muted px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions, answered</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {QA.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.05}>
              <details className="group rounded-xl border border-border bg-white p-5 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between font-medium marker:content-['']">
                  {item.q}
                  <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `components/landing/final-cta.tsx`:**

```tsx
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="bg-white px-6 py-24">
      <Reveal className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-brand px-8 py-16 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Start building your ideas</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/90">
          Your keys, your models, your canvas. Free to start.
        </p>
        <div className="mt-8">
          <Link
            href={signedIn ? "/dashboard" : "/sign-up"}
            className={cn(buttonVariants({ size: "lg" }), "bg-white text-foreground hover:opacity-90")}
          >
            {signedIn ? "Open WhiteWire" : "Get started free"}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 3: Build.** Run `pnpm build`. Expected PASS.

- [ ] **Step 4: Commit.**

```bash
git add components/landing/faq.tsx components/landing/final-cta.tsx
git commit -m "feat(landing): FAQ accordion + final CTA band"
```

---

## Task 5: Compose landing page v2 (WS-A4)

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `LandingNav`, `Hero`, `LiveCanvasDemo`, `HowItWorks`, `UseCases`, `FeaturesBand`, `Integrations`, `ByoAi`, `Pricing`, `Faq`, `FinalCta`, `LandingFooter`. Auth via `createClient` from `@/core/supabase/server`.

- [ ] **Step 1: Rewrite `app/page.tsx`** with the full v2 section order:

```tsx
import { createClient } from "@/core/supabase/server";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { LiveCanvasDemo } from "@/components/landing/live-canvas-demo";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UseCases } from "@/components/landing/use-cases";
import { FeaturesBand } from "@/components/landing/features-band";
import { Integrations } from "@/components/landing/integrations";
import { ByoAi } from "@/components/landing/byo-ai";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  return (
    <>
      <LandingNav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <LiveCanvasDemo />
        <HowItWorks />
        <UseCases />
        <FeaturesBand />
        <Integrations />
        <ByoAi />
        <Pricing signedIn={signedIn} />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <LandingFooter />
    </>
  );
}
```

- [ ] **Step 2: Build + test.** Run `pnpm build` then `pnpm test`. Expected: build PASS, tests still 96/96 (no logic changed).

- [ ] **Step 3: Commit.**

```bash
git add app/page.tsx
git commit -m "feat(landing): compose v2 sections (demo, use-cases, integrations, FAQ, final CTA)"
```

---

## Task 6: `listModels` service (WS-C1)

**Files:**
- Create: `core/ai/list-models.ts`
- Test: `tests/core/ai/list-models.test.ts`

**Interfaces:**
- Produces: `listModels(input: { provider: string; baseUrl: string | null; apiKey: string }): Promise<string[]>`. Throws `Error` with a user-safe message on failure.

- [ ] **Step 1: Write the failing test** `tests/core/ai/list-models.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { listModels } from "@/core/ai/list-models";

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("listModels", () => {
  it("parses openai-compatible /models response", async () => {
    mockFetchOnce(200, { data: [{ id: "gpt-4o" }, { id: "gpt-4o-mini" }] });
    const models = await listModels({ provider: "openai-compatible", baseUrl: null, apiKey: "k" });
    expect(models).toEqual(["gpt-4o", "gpt-4o-mini"]);
  });

  it("parses anthropic /v1/models response", async () => {
    mockFetchOnce(200, { data: [{ id: "claude-3-5-sonnet-latest" }] });
    const models = await listModels({ provider: "anthropic", baseUrl: null, apiKey: "k" });
    expect(models).toContain("claude-3-5-sonnet-latest");
  });

  it("parses google models response and strips the models/ prefix", async () => {
    mockFetchOnce(200, {
      models: [
        { name: "models/gemini-2.0-flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
      ],
    });
    const models = await listModels({ provider: "google", baseUrl: null, apiKey: "k" });
    expect(models).toEqual(["gemini-2.0-flash"]);
  });

  it("throws a safe error on a non-2xx response", async () => {
    mockFetchOnce(401, { error: "bad key" });
    await expect(
      listModels({ provider: "openai-compatible", baseUrl: null, apiKey: "bad" }),
    ).rejects.toThrow(/401/);
  });

  it("rejects an unknown provider", async () => {
    await expect(listModels({ provider: "nope", baseUrl: null, apiKey: "k" })).rejects.toThrow(
      /provider/i,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run `pnpm test -- list-models`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `core/ai/list-models.ts`:**

```ts
import "server-only";

type Input = { provider: string; baseUrl: string | null; apiKey: string };

const TIMEOUT_MS = 10_000;

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? `Provider rejected the key (${res.status}).`
        : `Could not load models (${res.status}).`,
    );
  }
  return res.json();
}

export async function listModels({ provider, baseUrl, apiKey }: Input): Promise<string[]> {
  if (provider === "openai-compatible") {
    const base = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    const json = (await getJson(`${base}/models`, { Authorization: `Bearer ${apiKey}` })) as {
      data?: { id: string }[];
    };
    return (json.data ?? []).map((m) => m.id).sort();
  }
  if (provider === "anthropic") {
    const json = (await getJson("https://api.anthropic.com/v1/models", {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    })) as { data?: { id: string }[] };
    return (json.data ?? []).map((m) => m.id).sort();
  }
  if (provider === "google") {
    const json = (await getJson(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      {},
    )) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (json.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .sort();
  }
  throw new Error(`Unknown provider: ${provider}`);
}
```

- [ ] **Step 4: Run tests.** Run `pnpm test -- list-models`. Expected: PASS (5 tests).

- [ ] **Step 5: Commit.**

```bash
git add core/ai/list-models.ts tests/core/ai/list-models.test.ts
git commit -m "feat(ai): listModels service for provider model discovery"
```

---

## Task 7: `/api/models` route (WS-C2)

**Files:**
- Create: `app/api/models/route.ts`

**Interfaces:**
- Consumes: `listModels` (Task 6); `syncCurrentUser` from `@/lib/auth`.
- Produces: `POST /api/models` — body `{ provider, baseUrl, apiKey }` → `{ models: string[] }` (200) or `{ error: string }` (400/401/500).

- [ ] **Step 1: Create `app/api/models/route.ts`:**

```ts
import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/auth";
import { listModels } from "@/core/ai/list-models";

const PROVIDERS = ["openai-compatible", "anthropic", "google"];

export async function POST(req: Request) {
  try {
    await syncCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { provider?: string; baseUrl?: string | null; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const provider = String(body.provider ?? "");
  const apiKey = String(body.apiKey ?? "").trim();
  const baseUrl = body.baseUrl ? String(body.baseUrl).trim() : null;

  if (!PROVIDERS.includes(provider))
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "API key is required" }, { status: 400 });
  if (baseUrl) {
    try {
      const u = new URL(baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:")
        return NextResponse.json({ error: "baseUrl must use http or https" }, { status: 400 });
    } catch {
      return NextResponse.json({ error: "baseUrl must be a valid URL" }, { status: 400 });
    }
  }

  try {
    const models = await listModels({ provider, baseUrl, apiKey });
    return NextResponse.json({ models });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load models";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Build.** Run `pnpm build`. Expected PASS (route compiles).

- [ ] **Step 3: Commit.**

```bash
git add app/api/models/route.ts
git commit -m "feat(api): auth-guarded /api/models route"
```

---

## Task 8: Add-key form with model-picker (WS-C3)

**Files:**
- Create: `components/settings/add-key-form.tsx`
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: `addKeyAction` from `@/app/settings/keys-actions`; `Input`, `Button` from `@/components/ui/*`; `cn`. Calls `POST /api/models`.
- Produces: `AddKeyForm()` (client component).

- [ ] **Step 1: Create `components/settings/add-key-form.tsx`:**

```tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addKeyAction } from "@/app/settings/keys-actions";

export function AddKeyForm() {
  const [provider, setProvider] = useState("openai-compatible");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadModels() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, baseUrl: baseUrl || null, apiKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load models");
      if (!json.models?.length) throw new Error("No models returned for this key.");
      setModels(json.models);
      setManual(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load models");
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={addKeyAction} className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="font-medium">Add a key</h3>
      <select
        name="provider"
        value={provider}
        onChange={(e) => {
          setProvider(e.target.value);
          setModels([]);
        }}
        className="w-full rounded border px-3 py-2"
      >
        <option value="openai-compatible">OpenAI-compatible (OpenAI, Groq, OpenRouter, Ollama…)</option>
        <option value="anthropic">Anthropic</option>
        <option value="google">Google</option>
      </select>
      <Input name="label" placeholder="Label (e.g. My OpenAI)" required />
      {provider === "openai-compatible" && (
        <Input
          name="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Base URL (default https://api.openai.com/v1)"
        />
      )}
      <Input
        name="apiKey"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="API key"
        required
      />

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={loadModels} disabled={!apiKey || loading}>
          {loading ? "Loading…" : "Load models"}
        </Button>
        {(models.length > 0 || manual) && (
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => setManual((m) => !m)}
          >
            {manual ? "Pick from list" : "Type manually"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {models.length > 0 && !manual ? (
        <select name="model" required className="w-full rounded border px-3 py-2">
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : (
        <Input name="model" placeholder="Model id (e.g. gpt-4o, claude-3-5-sonnet-latest)" required />
      )}

      <Button type="submit">Add key</Button>
    </form>
  );
}
```

- [ ] **Step 2: Wire into `app/settings/page.tsx`.** Add the import `import { AddKeyForm } from "@/components/settings/add-key-form";`, remove the imports for `Input`/`Button` if they become unused elsewhere on the page (they are still used? Check — after this change the page no longer renders `Input`/`Button`; remove those two imports and the `addKeyAction` import, which now lives in the client form). Replace the entire inline `<form action={addKeyAction}>…</form>` block (lines ~60-72) with `<AddKeyForm />`. Leave everything else (keys list, `setActiveKeyAction`, `deleteKeyAction`, routing Card, `RouteSelect`) unchanged.

- [ ] **Step 3: Build + test.** Run `pnpm build` then `pnpm test`. Expected: build PASS, 96/96 + Task 6's new tests still green.

- [ ] **Step 4: Commit.**

```bash
git add components/settings/add-key-form.tsx app/settings/page.tsx
git commit -m "feat(settings): model-picker add-key form with live provider fetch"
```

---

## Task 9: Supabase admin client + owner-data purge (WS-D)

**Files:**
- Create: `core/supabase/admin.ts`
- Create: `core/persistence/purge.repo.ts`
- Test: `tests/core/persistence/purge.repo.test.ts`

**Interfaces:**
- Produces:
  - `createAdminClient(): SupabaseClient` — throws if `SUPABASE_SERVICE_ROLE_KEY` unset.
  - `purgeOwnerData(db: Db, ownerId: string): Promise<void>` — deletes the owner's projects (cascades canvas/artifacts/attachments/versions/promptHistory) then the user row (cascades apiKeys/userSettings).

- [ ] **Step 1: Create `core/supabase/admin.ts`:**

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Service-role Supabase client for admin operations (e.g. deleting a user). Server-only. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Account deletion is not configured — set SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
```

- [ ] **Step 2: Write the failing test** `tests/core/persistence/purge.repo.test.ts` (verifies delete order + targets against a fake db):

```ts
import { describe, it, expect, vi } from "vitest";
import { purgeOwnerData } from "@/core/persistence/purge.repo";
import { projects, users } from "@/core/persistence/schema";

it("deletes projects before the user row", async () => {
  const calls: unknown[] = [];
  const fakeDb = {
    delete: (table: unknown) => ({
      where: async () => {
        calls.push(table);
      },
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await purgeOwnerData(fakeDb as any, "user-1");
  expect(calls[0]).toBe(projects);
  expect(calls[1]).toBe(users);
});
```

- [ ] **Step 3: Run test to verify it fails.** Run `pnpm test -- purge`. Expected: FAIL (module not found).

- [ ] **Step 4: Implement `core/persistence/purge.repo.ts`:**

```ts
import "server-only";
import { eq } from "drizzle-orm";
import type { Db } from "@/core/persistence/projects.repo";
import { projects, users } from "@/core/persistence/schema";

/**
 * Deletes all data owned by a user. Projects are removed first (FK cascade wipes
 * canvas_docs, artifacts, attachments, versions, prompt_history), then the user row
 * (FK cascade wipes api_keys and user_settings).
 */
export async function purgeOwnerData(db: Db, ownerId: string): Promise<void> {
  await db.delete(projects).where(eq(projects.ownerId, ownerId));
  await db.delete(users).where(eq(users.id, ownerId));
}
```

- [ ] **Step 5: Run tests.** Run `pnpm test -- purge`. Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add core/supabase/admin.ts core/persistence/purge.repo.ts tests/core/persistence/purge.repo.test.ts
git commit -m "feat(account): supabase admin client + owner-data purge repo"
```

---

## Task 10: Account server actions (WS-D3)

**Files:**
- Create: `app/account/validation.ts` (plain module — a `"use server"` file may export ONLY async actions, so the sync validator lives here)
- Create: `app/account/actions.ts`
- Test: `tests/app/account/validation.test.ts`

**Interfaces:**
- Consumes: `createClient` from `@/core/supabase/server`; `createAdminClient`, `purgeOwnerData`, `syncCurrentUser`, `db`; `validatePasswordChange` from `./validation`.
- Produces:
  - `validatePasswordChange(password, confirm): string | null` (in `validation.ts`) — error message or null.
  - `updateProfileAction(formData)` — sets `user_metadata.display_name`.
  - `changePasswordAction(formData)` — validates confirm-match + length ≥6, calls `updateUser({password})`; redirects with error on failure.
  - `deleteAccountAction(formData)` — requires typed confirmation `delete my account`; purges data; admin-deletes the auth user; signs out; redirects `/`.

- [ ] **Step 1: Write the failing test** `tests/app/account/validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validatePasswordChange } from "@/app/account/validation";

describe("validatePasswordChange", () => {
  it("rejects mismatched passwords", () => {
    expect(validatePasswordChange("abcdef", "abcdeF")).toMatch(/match/i);
  });
  it("rejects short passwords", () => {
    expect(validatePasswordChange("abc", "abc")).toMatch(/6/);
  });
  it("accepts a valid matching password", () => {
    expect(validatePasswordChange("abcdef", "abcdef")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails.** Run `pnpm test -- account`. Expected: FAIL.

- [ ] **Step 3: Implement `app/account/validation.ts`:**

```ts
export function validatePasswordChange(password: string, confirm: string): string | null {
  if (password.length < 6) return "Password must be at least 6 characters.";
  if (password !== confirm) return "Passwords do not match.";
  return null;
}
```

- [ ] **Step 4: Implement `app/account/actions.ts`:**

```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/core/supabase/server";
import { validatePasswordChange } from "./validation";

export async function updateProfileAction(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
  redirect(error ? "/account?error=" + encodeURIComponent(error.message) : "/account?ok=profile");
}

export async function changePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const invalid = validatePasswordChange(password, confirm);
  if (invalid) redirect("/account?error=" + encodeURIComponent(invalid));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  redirect(error ? "/account?error=" + encodeURIComponent(error.message) : "/account?ok=password");
}

export async function deleteAccountAction(formData: FormData) {
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "delete my account")
    redirect("/account?error=" + encodeURIComponent('Type "delete my account" to confirm.'));

  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { purgeOwnerData } = await import("@/core/persistence/purge.repo");
  const { createAdminClient } = await import("@/core/supabase/admin");

  const ownerId = await syncCurrentUser();
  await purgeOwnerData(db, ownerId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(ownerId);
  if (error) redirect("/account?error=" + encodeURIComponent(error.message));

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
```

- [ ] **Step 5: Run tests.** Run `pnpm test -- validation`. Expected: PASS (3 tests).

- [ ] **Step 6: Commit.**

```bash
git add app/account/validation.ts app/account/actions.ts tests/app/account/validation.test.ts
git commit -m "feat(account): profile/password/delete server actions + validation"
```

---

## Task 11: Account page + sidebar link (WS-D1/D2)

**Files:**
- Create: `app/account/page.tsx`
- Modify: `components/app-shell/sidebar.tsx`

**Interfaces:**
- Consumes: `Sidebar`, `Topbar`, `Card`, `Input`, `Button`; `createClient`; account actions from `./actions`.

- [ ] **Step 1: Create `app/account/page.tsx`:**

```tsx
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/core/supabase/server";
import { updateProfileAction, changePasswordAction, deleteAccountAction } from "./actions";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? "";

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Account" }]} />
        <main className="flex-1 space-y-8 p-8">
          {error && <p className="max-w-xl rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {ok && <p className="max-w-xl rounded-lg bg-green-500/10 p-3 text-sm text-green-700">Saved.</p>}

          <Card className="max-w-xl p-6">
            <h2 className="mb-3 font-medium">Profile</h2>
            <form action={updateProfileAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Email</label>
                <Input value={email} disabled readOnly />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Display name</label>
                <Input name="displayName" defaultValue={displayName} placeholder="Your name" />
              </div>
              <Button type="submit">Save profile</Button>
            </form>
          </Card>

          <Card className="max-w-xl p-6">
            <h2 className="mb-3 font-medium">Change password</h2>
            <form action={changePasswordAction} className="space-y-3">
              <Input name="password" type="password" placeholder="New password (min 6 chars)" required />
              <Input name="confirm" type="password" placeholder="Confirm new password" required />
              <Button type="submit">Update password</Button>
            </form>
          </Card>

          <Card className="max-w-xl border-destructive/40 p-6">
            <h2 className="mb-1 font-medium text-destructive">Danger zone</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Permanently delete your account and all projects, keys, and artifacts. This cannot be
              undone. Type <span className="font-mono">delete my account</span> to confirm.
            </p>
            <form action={deleteAccountAction} className="space-y-3">
              <Input name="confirm" placeholder="delete my account" required />
              <Button type="submit" className="bg-destructive text-white hover:opacity-90">
                Delete account
              </Button>
            </form>
          </Card>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add "Account" to the sidebar.** In `components/app-shell/sidebar.tsx`, import `UserCircle` from `lucide-react` and add `{ href: "/account", label: "Account", icon: UserCircle }` to the nav links array (match the existing link-object shape exactly — read the file first). Keep sign-out and everything else unchanged.

- [ ] **Step 3: Build + test.** Run `pnpm build` then `pnpm test`. Expected: build PASS, tests green.

- [ ] **Step 4: Commit.**

```bash
git add app/account/page.tsx components/app-shell/sidebar.tsx
git commit -m "feat(account): account page (profile, password, danger zone) + sidebar link"
```

---

## Task 12: Marketing shell + About & Docs (WS-E1/E2)

**Files:**
- Create: `components/marketing/marketing-shell.tsx`
- Create: `app/about/page.tsx`
- Create: `app/docs/page.tsx`

**Interfaces:**
- Consumes: `LandingNav`, `LandingFooter`; `createClient`.
- Produces: `MarketingShell({ signedIn, children })`.

- [ ] **Step 1: Create `components/marketing/marketing-shell.tsx`:**

```tsx
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/footer";

export function MarketingShell({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <LandingNav signedIn={signedIn} />
      <main className="min-h-[70vh] bg-dotted-grid px-6 pb-24 pt-32">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
      <LandingFooter />
    </>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-10">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {subtitle && <p className="mt-3 font-hand text-2xl text-brand-violet">{subtitle}</p>}
    </header>
  );
}
```

- [ ] **Step 2: Create `app/about/page.tsx`** (real concise copy):

```tsx
import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "About · WhiteWire" };

export default async function About() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
      <PageHeader title="About WhiteWire" subtitle="Think. Visualize. Collaborate. Build." />
      <div className="space-y-5 text-muted-foreground">
        <p>
          WhiteWire is an AI-native canvas where ideas become specs, diagrams, wireframes, and docs.
          Sketch a thought and watch it take shape — then refine it together in real time.
        </p>
        <p>
          We built it on one principle: <span className="font-medium text-foreground">you own your intelligence</span>.
          Bring your own model — OpenAI, Anthropic, Google, or a local runtime like Ollama. Your
          keys, your data, no lock-in and no hidden credits.
        </p>
        <p>
          One infinite canvas for the whole idea, from the first scribble to the shipped
          architecture.
        </p>
      </div>
    </MarketingShell>
  );
}
```

- [ ] **Step 3: Create `app/docs/page.tsx`** (real getting-started steps):

```tsx
import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "Docs · WhiteWire" };

const STEPS = [
  { t: "1. Create an account", d: "Sign up with email — no credit card, no credits to buy." },
  { t: "2. Add your model key", d: "In Settings, add an OpenAI-compatible, Anthropic, or Google key. Click 'Load models' and pick one from the list." },
  { t: "3. Start a project", d: "From your dashboard, create a project to open a fresh infinite canvas." },
  { t: "4. Sketch & generate", d: "Draw or drop a note, then ask WhiteWire to turn it into a diagram, wireframe, or doc." },
  { t: "5. Route models per task", d: "Optionally assign different models to reasoning, code, and docs in Settings." },
];

export default async function Docs() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
      <PageHeader title="Getting started" subtitle="From zero to your first diagram" />
      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.t} className="rounded-xl border border-border bg-white p-5">
            <h3 className="font-semibold">{s.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>
    </MarketingShell>
  );
}
```

- [ ] **Step 4: Build.** Run `pnpm build`. Expected PASS.

- [ ] **Step 5: Commit.**

```bash
git add components/marketing/marketing-shell.tsx app/about/page.tsx app/docs/page.tsx
git commit -m "feat(content): marketing shell + About and Docs pages"
```

---

## Task 13: Privacy, Terms, Contact, Changelog (WS-E2)

**Files:**
- Create: `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/contact/page.tsx`, `app/changelog/page.tsx`

**Interfaces:**
- Consumes: `MarketingShell`, `PageHeader`; `createClient`.

- [ ] **Step 1: Create `app/privacy/page.tsx`:**

```tsx
import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "Privacy · WhiteWire" };

export default async function Privacy() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
      <PageHeader title="Privacy Policy" subtitle="Your keys. Your data." />
      <div className="space-y-5 text-sm text-muted-foreground">
        <p>WhiteWire is bring-your-own-key. Your API keys are stored encrypted and are used only to make requests to the model provider you choose.</p>
        <p>Your canvases, projects, and generated artifacts are stored so you can access them across sessions. We do not sell your data or use it to train models.</p>
        <p>Model requests go from our server to your chosen provider using your key; that provider's privacy policy governs how they handle the request.</p>
        <p>You can delete your account and all associated data at any time from the Account page.</p>
        <p>Questions? See the <a className="text-brand-violet underline" href="/contact">contact page</a>.</p>
      </div>
    </MarketingShell>
  );
}
```

- [ ] **Step 2: Create `app/terms/page.tsx`:**

```tsx
import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "Terms · WhiteWire" };

export default async function Terms() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
      <PageHeader title="Terms of Service" subtitle="The short version" />
      <div className="space-y-5 text-sm text-muted-foreground">
        <p>By using WhiteWire you agree to use it lawfully and to keep your account credentials secure. You are responsible for the API keys you add and any usage or costs your model provider bills you for.</p>
        <p>WhiteWire is provided “as is” without warranties. We are not liable for outputs generated by third-party models or for provider outages.</p>
        <p>You retain ownership of the content you create. You may stop using the service and delete your account at any time.</p>
        <p>We may update these terms; continued use after changes constitutes acceptance.</p>
      </div>
    </MarketingShell>
  );
}
```

- [ ] **Step 3: Create `app/contact/page.tsx`:**

```tsx
import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Contact · WhiteWire" };

export default async function Contact() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
      <PageHeader title="Get in touch" subtitle="We'd love to hear from you" />
      <div className="space-y-5 text-muted-foreground">
        <p>Questions, feedback, or partnership ideas? Reach out and we'll get back to you.</p>
        <a
          href="mailto:hello@whitewire.app"
          className={cn(buttonVariants({ size: "lg" }), "bg-gradient-brand text-white hover:opacity-90")}
        >
          Email us
        </a>
      </div>
    </MarketingShell>
  );
}
```

- [ ] **Step 4: Create `app/changelog/page.tsx`** (real entries from project history):

```tsx
import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "Changelog · WhiteWire" };

const ENTRIES = [
  { date: "Jul 2026", title: "Landing & app redesign", body: "New single-scroll landing, grey/white app theme, transparent brand logo, and an Account page." },
  { date: "Jul 2026", title: "Model-picker in Settings", body: "Load available models straight from your provider — no more manual typos." },
  { date: "Jun 2026", title: "Artifacts", body: "Generated diagrams, specs, and docs are saved and browsable per project." },
  { date: "Jun 2026", title: "Bring Your Own LLM", body: "Add OpenAI-compatible, Anthropic, or Google keys and route models per task." },
];

export default async function Changelog() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
      <PageHeader title="Changelog" subtitle="What's new" />
      <div className="space-y-6">
        {ENTRIES.map((e) => (
          <div key={e.title} className="rounded-xl border border-border bg-white p-5">
            <p className="font-hand text-lg text-brand-violet">{e.date}</p>
            <h3 className="mt-1 font-semibold">{e.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{e.body}</p>
          </div>
        ))}
      </div>
    </MarketingShell>
  );
}
```

- [ ] **Step 5: Build.** Run `pnpm build`. Expected PASS (4 new routes).

- [ ] **Step 6: Commit.**

```bash
git add app/privacy/page.tsx app/terms/page.tsx app/contact/page.tsx app/changelog/page.tsx
git commit -m "feat(content): privacy, terms, contact, changelog pages"
```

---

## Task 14: Wire footer links (WS-E3)

**Files:**
- Modify: `components/landing/footer.tsx`

- [ ] **Step 1: Read `components/landing/footer.tsx`** to find the `COLUMNS` structure and its placeholder `#` hrefs.

- [ ] **Step 2: Update the hrefs** so real routes are linked. Keep the column/label structure; only change hrefs:
  - Product: Features → `#features`, How it works → `#how`, Pricing → `#pricing` (unchanged anchors).
  - Resources: Docs → `/docs`, Changelog → `/changelog`.
  - Company: About → `/about`, Contact → `/contact`.
  - Legal: Privacy → `/privacy`, Terms → `/terms`.
  Any labels without a real destination stay as `#`. Do not add or remove columns/labels.

- [ ] **Step 3: Build.** Run `pnpm build`. Expected PASS.

- [ ] **Step 4: Commit.**

```bash
git add components/landing/footer.tsx
git commit -m "feat(content): wire footer links to real routes"
```

---

## Task 15: Skeleton component + app-route loading states (WS-B)

**Files:**
- Create: `components/ui/skeleton.tsx`
- Create: `app/dashboard/loading.tsx`, `app/artifacts/loading.tsx`, `app/settings/loading.tsx`, `app/account/loading.tsx`, `app/p/[projectId]/loading.tsx`

**Interfaces:**
- Consumes: `Sidebar`, `Topbar`, `cn`.
- Produces: `Skeleton({ className })`.

- [ ] **Step 1: Create `components/ui/skeleton.tsx`:**

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  // motion-safe: only pulse when the user hasn't asked to reduce motion.
  return <div className={cn("motion-safe:animate-pulse rounded-md bg-muted", className)} />;
}
```

- [ ] **Step 2: Create `app/dashboard/loading.tsx`:**

```tsx
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Projects" }]} />
        <main className="flex-1 p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/artifacts/loading.tsx`** (same shell, breadcrumb "Artifacts", skeleton sections):

```tsx
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Artifacts" }]} />
        <main className="flex-1 space-y-8 p-8">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/settings/loading.tsx`** and `app/account/loading.tsx`** (same shell shape; breadcrumb "Settings" / "Account"; two skeleton card blocks):

```tsx
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Settings" }]} />
        <main className="flex-1 space-y-8 p-8">
          <Skeleton className="h-64 max-w-xl" />
          <Skeleton className="h-48 max-w-xl" />
        </main>
      </div>
    </div>
  );
}
```

  For `app/account/loading.tsx` use the identical file but change the breadcrumb label to `"Account"`.

- [ ] **Step 5: Create `app/p/[projectId]/loading.tsx`** (full-bleed workspace skeleton — the project page has no sidebar):

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-screen flex-col bg-surface-muted">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Build + test.** Run `pnpm build` then `pnpm test`. Expected: build PASS, tests green.

- [ ] **Step 7: Commit.**

```bash
git add components/ui/skeleton.tsx app/dashboard/loading.tsx app/artifacts/loading.tsx app/settings/loading.tsx app/account/loading.tsx app/p/[projectId]/loading.tsx
git commit -m "feat(perf): skeleton component + route-level loading states"
```

---

## Task 16: README env note for delete-account (WS-D4)

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add an environment-variable note.** Append (or extend an existing env section in) `README.md` documenting that `SUPABASE_SERVICE_ROLE_KEY` is required for account deletion:

```markdown
### Environment

- `SUPABASE_SERVICE_ROLE_KEY` — required for the **Delete account** action (Account page). Without it, deletion returns a clear error and no data is removed. Set it in `.env.local` and in the Vercel project's environment variables. Never expose this key to the client.
```

- [ ] **Step 2: Commit.**

```bash
git add README.md
git commit -m "docs: document SUPABASE_SERVICE_ROLE_KEY for account deletion"
```

---

## Final Verification (whole branch)

- [ ] `pnpm build` passes.
- [ ] `pnpm test` — baseline 96 + new tests (list-models 5, purge 1, account 3) all green.
- [ ] Manual (`pnpm dev`): hero full-height + responsive (mobile/tablet/desktop); animated demo plays + reduced-motion static fallback; `/api/models` loads a real list with a valid key and errors cleanly with a bad one; Account profile/password work; content pages render with nav/footer; footer links resolve; skeletons show on slow navigation.
- [ ] Whole-branch review, then deploy via `vercel --prod` and set `SUPABASE_SERVICE_ROLE_KEY` on Vercel.
