# WhiteWire UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Excalidraw-style light landing page with floating animation + dark feature band, a reusable WhiteWire brand/logo system, matching light auth pages, and a grey/white deeper rework of all post-login app pages.

**Architecture:** Next 16 App Router + Tailwind v4 (CSS-first tokens in `globals.css`) + shadcn/base-ui components. Landing is a thin server `page.tsx` composing client section components under `components/landing/`. Motion via the `motion` package (`motion/react` — the current Framer Motion), centralized in one `motion.tsx` helper so animation config is DRY and `prefers-reduced-motion` is handled once. Brand color/gradient/font exposed as Tailwind tokens. App pages get a shared `Sidebar`+`Topbar` shell and are restyled to a grey/white surface system using existing neutral tokens. No backend, data, or business-logic changes.

**Tech Stack:** Next 16.2.9, React 19.2.4, Tailwind v4, `motion` (framer-motion successor), base-ui, lucide-react, Supabase auth (unchanged), Drizzle (unchanged).

## Global Constraints

- **No logic changes.** Server actions, repos, `syncCurrentUser`, `listProjects`, autosave, AI nodes stay behavior-identical. Visual/layout only.
- **Motion package:** use `motion/react` (`import { motion } from "motion/react"`), not `framer-motion`. It supports React 19.
- **Reduced motion:** every animation must no-op under `prefers-reduced-motion: reduce`. Use the shared helper — do not hand-roll per component.
- **Client vs server:** components using `motion`, hooks, or scroll state need `"use client"`. `app/page.tsx` stays a server component (reads `getUser()`).
- **Brand gradient:** violet `#7C3AED` → blue `#2563EB`, 135°. Use tokens `--brand-violet` / `--brand-blue`, never hardcode hex in components.
- **Logo:** transparent background, works on light AND dark. SVG only.
- **App-page palette:** grey page bg (`--surface-muted`), white surfaces (`--surface`/`bg-card`), neutral borders. Brand gradient only for small accents (primary buttons, active nav), not app chrome backgrounds.
- **Verification per task:** `pnpm lint` and `pnpm build` pass; `pnpm test` stays green (no logic touched). Visual checks via `pnpm dev`.
- **Commit** at the end of each task with the shown message.
- **Copy:** headline `Think. Visualize. Collaborate. Build.`; BYO pill `Bring Your Own AI · Your Keys · Your Freedom`; 6 feature names verbatim: Collaborative Canvas, AI, Your Way, Diagrams & Flow, Wireframes & UI, Chat with Context, Docs & Notes.

---

### Task 1: Install motion + brand tokens & helpers

**Files:**
- Modify: `package.json` (add `motion` dep)
- Modify: `app/globals.css` (brand tokens, surface tokens, theme exposure, helper classes)

**Interfaces:**
- Produces: CSS tokens `--brand-violet`, `--brand-blue`, `--surface`, `--surface-muted`; Tailwind utilities `text-brand-violet`, `bg-brand-blue`, `bg-surface`, `bg-surface-muted`; helper classes `.text-gradient-brand`, `.bg-gradient-brand`, `.bg-dotted-grid`.

- [ ] **Step 1: Install motion**

Run: `pnpm add motion`
Expected: adds `motion` to `dependencies`, no peer-dep errors against React 19.

- [ ] **Step 2: Verify motion resolves with React 19**

Run: `pnpm ls motion`
Expected: prints an installed `motion@…` version (12.x or later). If install errored on peer deps, re-run `pnpm add motion@latest`.

- [ ] **Step 3: Add brand + surface tokens to `:root`**

In `app/globals.css`, inside the existing `:root { … }` block (after `--radius: 0.625rem;`), add:

```css
  /* WhiteWire brand */
  --brand-violet: oklch(0.53 0.24 293);
  --brand-blue: oklch(0.55 0.22 264);
  /* app surfaces (grey/white) */
  --surface: oklch(1 0 0);
  --surface-muted: oklch(0.98 0 0);
```

- [ ] **Step 4: Expose tokens to Tailwind**

In the `@theme inline { … }` block, add these lines (anywhere among the `--color-*` entries):

```css
  --color-brand-violet: var(--brand-violet);
  --color-brand-blue: var(--brand-blue);
  --color-surface: var(--surface);
  --color-surface-muted: var(--surface-muted);
  --font-hand: var(--font-caveat);
```

- [ ] **Step 5: Add helper classes**

Append to the end of `app/globals.css`:

```css
@layer utilities {
  .bg-gradient-brand {
    background-image: linear-gradient(135deg, var(--brand-violet), var(--brand-blue));
  }
  .text-gradient-brand {
    background-image: linear-gradient(135deg, var(--brand-violet), var(--brand-blue));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .bg-dotted-grid {
    background-image: radial-gradient(oklch(0.85 0 0) 1px, transparent 1px);
    background-size: 22px 22px;
  }
}
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: build succeeds. (If Tailwind complains about an unknown utility, confirm the `@theme inline` names match.)

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml app/globals.css
git commit -m "feat(ui): add motion dep, brand tokens, surface tokens, gradient helpers"
```

---

### Task 2: Fonts (Caveat) + brand Logo + favicon

**Files:**
- Modify: `app/layout.tsx` (load Caveat, expose `--font-caveat`)
- Create: `components/brand/logo.tsx`
- Create: `app/icon.svg`

**Interfaces:**
- Consumes: `.text-gradient-brand`, `--brand-violet`/`--brand-blue` (Task 1).
- Produces: `Logo` component — `Logo({ variant = "full" | "mark", appearance = "light" | "dark", className }: { variant?: "full" | "mark"; appearance?: "light" | "dark"; className?: string })`. `full` renders mark + "WhiteWire" wordmark; `appearance` sets wordmark text color (dark on light bg, white on dark bg).

- [ ] **Step 1: Load Caveat in layout**

In `app/layout.tsx`, add the import and font next to the Geist fonts:

```tsx
import { Geist, Geist_Mono, Caveat } from "next/font/google";

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});
```

Add `caveat.variable` to the `<html>` className:

```tsx
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
    >
```

- [ ] **Step 2: Create the Logo component**

Create `components/brand/logo.tsx`:

```tsx
import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "full" | "mark";
  appearance?: "light" | "dark";
  className?: string;
};

function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ww-grad" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-violet)" />
          <stop offset="1" stopColor="var(--brand-blue)" />
        </linearGradient>
      </defs>
      {/* rounded square frame */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="12"
        stroke="currentColor"
        strokeWidth="3"
      />
      {/* gradient W */}
      <path
        d="M13 16 L18 32 L24 20 L30 32 L35 16"
        stroke="url(#ww-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* pen nib accent */}
      <path
        d="M33 13 L37 17 L31 21 Z"
        fill="url(#ww-grad)"
      />
    </svg>
  );
}

export function Logo({ variant = "full", appearance = "light", className }: LogoProps) {
  const textColor = appearance === "dark" ? "text-white" : "text-foreground";
  if (variant === "mark") {
    return <Mark className={cn(appearance === "dark" ? "text-white" : "text-foreground", className)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark className={appearance === "dark" ? "text-white" : "text-foreground"} />
      <span className={cn("text-xl font-bold tracking-tight", textColor)}>
        White<span className="text-gradient-brand">Wire</span>
      </span>
    </span>
  );
}
```

- [ ] **Step 3: Create the favicon**

Create `app/icon.svg` (mark-only, transparent — Next auto-registers it as the favicon):

```svg
<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7C3AED"/>
      <stop offset="1" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="42" height="42" rx="12" stroke="#111" stroke-width="3"/>
  <path d="M13 16 L18 32 L24 20 L30 32 L35 16" stroke="url(#g)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M33 13 L37 17 L31 21 Z" fill="url(#g)"/>
</svg>
```

- [ ] **Step 4: Verify build + visual**

Run: `pnpm build` then `pnpm dev`.
Expected: build passes. In the browser tab, the favicon shows the gradient W. (Logo used in later tasks.)

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx components/brand/logo.tsx app/icon.svg
git commit -m "feat(ui): brand Logo component, Caveat font, gradient favicon"
```

---

### Task 3: Landing motion helpers

**Files:**
- Create: `components/landing/motion.tsx`

**Interfaces:**
- Consumes: `motion/react` (Task 1).
- Produces:
  - `Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number })` — fade + slide-up on scroll into view, once, reduced-motion aware.
  - `Float({ children, className, amplitude = 10, duration = 4, delay = 0 }: { children: React.ReactNode; className?: string; amplitude?: number; duration?: number; delay?: number })` — continuous vertical float loop, disabled under reduced motion.

- [ ] **Step 1: Create the motion helper**

Create `components/landing/motion.tsx`:

```tsx
"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function Float({
  children,
  className,
  amplitude = 10,
  duration = 4,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: passes (component not yet imported; confirms `motion/react` resolves).

- [ ] **Step 3: Commit**

```bash
git add components/landing/motion.tsx
git commit -m "feat(landing): reduced-motion-aware Reveal + Float helpers"
```

---

### Task 4: Landing nav

**Files:**
- Create: `components/landing/landing-nav.tsx`

**Interfaces:**
- Consumes: `Logo` (Task 2), `Button` (`@/components/ui/button`), `motion/react`.
- Produces: `LandingNav({ signedIn }: { signedIn: boolean })` — sticky top nav; blurs on scroll; CTA is "Open WhiteWire"→`/dashboard` when `signedIn`, else "Get started"→`/sign-up`.

- [ ] **Step 1: Create the nav**

Create `components/landing/landing-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav({ signedIn }: { signedIn: boolean }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <motion.header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors",
        scrolled ? "border-b border-border bg-white/80 backdrop-blur-md" : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="WhiteWire home">
          <Logo variant="full" appearance="light" />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button asChild size="lg" className="bg-gradient-brand text-white hover:opacity-90">
              <Link href="/dashboard">Open WhiteWire</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="lg" className="hidden sm:inline-flex">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="lg" className="bg-gradient-brand text-white hover:opacity-90">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
```

Note: base-ui `Button` supports `asChild` via the primitive; if `asChild` errors at build, wrap the `<Link>` without it (`<Link className={buttonVariants({...})}>`). Prefer `asChild`; fall back only if the build fails.

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: passes. If `asChild` is unsupported, apply the fallback in the note and rebuild.

- [ ] **Step 3: Commit**

```bash
git add components/landing/landing-nav.tsx
git commit -m "feat(landing): sticky blur-on-scroll nav"
```

---

### Task 5: Hero with floating cards

**Files:**
- Create: `components/landing/hero.tsx`

**Interfaces:**
- Consumes: `Float`, `Reveal` (Task 3), `Button`, `Logo` not needed here.
- Produces: `Hero({ signedIn }: { signedIn: boolean })`.

- [ ] **Step 1: Create the hero**

Create `components/landing/hero.tsx`:

```tsx
"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Float } from "./motion";

function FloatCard({
  className,
  amplitude,
  duration,
  delay,
  children,
}: {
  className: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Float className={className} amplitude={amplitude} duration={duration} delay={delay}>
      <div className="rounded-xl border border-border bg-white p-3 shadow-lg">{children}</div>
    </Float>
  );
}

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden bg-dotted-grid pt-32 pb-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
          <Lock className="size-4 text-brand-violet" />
          Bring Your Own AI · Your Keys · Your Freedom
        </span>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-gradient-brand">Think. Visualize.</span>
          <br />
          <span className="text-gradient-brand">Collaborate. Build.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          The AI-native canvas where ideas become specs, diagrams, wireframes, and docs.
          Any model, local or cloud. You stay in control.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg" className="bg-gradient-brand text-white hover:opacity-90">
            <Link href={signedIn ? "/dashboard" : "/sign-up"}>
              {signedIn ? "Open WhiteWire" : "Get started free"}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#how">See how it works</a>
          </Button>
        </div>
      </div>

      {/* floating decoration — hidden on small screens */}
      <FloatCard className="absolute left-[8%] top-40 hidden w-52 lg:block" duration={5} delay={0.2}>
        <p className="text-xs font-medium text-muted-foreground">System architecture</p>
        <div className="mt-2 space-y-1">
          <div className="h-3 rounded bg-gradient-brand opacity-80" />
          <div className="flex gap-1">
            <div className="h-8 flex-1 rounded border border-border" />
            <div className="h-8 flex-1 rounded border border-border" />
            <div className="h-8 flex-1 rounded border border-border" />
          </div>
        </div>
      </FloatCard>

      <FloatCard className="absolute right-[8%] top-36 hidden w-48 lg:block" duration={4.5} delay={0.5}>
        <p className="text-xs font-medium text-muted-foreground">Wireframe</p>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <div className="col-span-2 h-4 rounded bg-muted" />
          <div className="h-10 rounded border border-dashed border-border" />
          <div className="h-10 rounded border border-dashed border-border" />
        </div>
      </FloatCard>

      <Float className="absolute right-[14%] bottom-16 hidden lg:block" amplitude={8} duration={6} delay={0.3}>
        <div className="-rotate-6 rounded-md bg-yellow-200 p-3 shadow-lg">
          <p className="font-hand text-lg leading-tight text-yellow-900">Add onboarding flow ✦</p>
        </div>
      </Float>

      <Float className="absolute left-[14%] bottom-24 hidden lg:block" amplitude={12} duration={5.5} delay={0.6}>
        <div className="flex size-12 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-lg">
          ✓
        </div>
      </Float>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: passes. Confirms `lucide-react` `Lock` import and motion usage compile.

- [ ] **Step 3: Commit**

```bash
git add components/landing/hero.tsx
git commit -m "feat(landing): hero with floating decoration cards"
```

---

### Task 6: "What it is" + "How it works" sections

**Files:**
- Create: `components/landing/what-it-is.tsx`
- Create: `components/landing/how-it-works.tsx`

**Interfaces:**
- Consumes: `Reveal` (Task 3), `lucide-react`.
- Produces: `WhatItIs()`, `HowItWorks()` (renders with `id="how"`).

- [ ] **Step 1: Create `what-it-is.tsx`**

```tsx
import { Reveal } from "./motion";

export function WhatItIs() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">One canvas for the whole idea</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Sketch a thought, let AI turn it into diagrams, wireframes, specs, and docs — then
          refine together in real time. Everything lives on one infinite canvas.
        </p>
      </Reveal>
      <Reveal className="mt-12" delay={0.1}>
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-white p-3 shadow-xl">
          <div className="flex h-72 items-center justify-center rounded-xl bg-dotted-grid">
            <span className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-white shadow-lg">
              Your canvas, alive
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
```

- [ ] **Step 2: Create `how-it-works.tsx`**

```tsx
import { PenLine, Sparkles, Share2 } from "lucide-react";
import { Reveal } from "./motion";

const STEPS = [
  { icon: PenLine, title: "Sketch", body: "Draw or type your idea on the canvas — rough is fine." },
  { icon: Sparkles, title: "AI generates", body: "Your model turns strokes and prompts into diagrams, wireframes, and docs." },
  { icon: Share2, title: "Collaborate & export", body: "Refine in real time, then export specs and code artifacts." },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-border bg-surface-muted py-24">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">From scribble to shipped</h2>
        </Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="relative rounded-xl border border-border bg-white p-6 shadow-sm">
                <div className="flex size-11 items-center justify-center rounded-lg bg-gradient-brand text-white">
                  <s.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                <span className="absolute right-4 top-4 font-hand text-2xl text-brand-violet/40">
                  {i + 1}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add components/landing/what-it-is.tsx components/landing/how-it-works.tsx
git commit -m "feat(landing): what-it-is and how-it-works sections"
```

---

### Task 7: Dark feature band

**Files:**
- Create: `components/landing/features-band.tsx`

**Interfaces:**
- Consumes: `Reveal` (Task 3), `lucide-react`.
- Produces: `FeaturesBand()` (renders with `id="features"`).

- [ ] **Step 1: Create `features-band.tsx`**

```tsx
import { Users, Sparkles, Workflow, LayoutTemplate, MessageSquare, FileText } from "lucide-react";
import { Reveal } from "./motion";

const FEATURES = [
  { icon: Users, title: "Collaborative Canvas", body: "Work together in real time on an infinite canvas." },
  { icon: Sparkles, title: "AI, Your Way", body: "Use any LLM — local or cloud. You're in control." },
  { icon: Workflow, title: "Diagrams & Flow", body: "From flowcharts to system designs in seconds." },
  { icon: LayoutTemplate, title: "Wireframes & UI", body: "Generate, edit, and iterate beautiful interfaces." },
  { icon: MessageSquare, title: "Chat with Context", body: "AI that understands your canvas, always." },
  { icon: FileText, title: "Docs & Notes", body: "Write, organize, and link everything in one place." },
];

export function FeaturesBand() {
  return (
    <section id="features" className="bg-neutral-950 py-24 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything, in one place</h2>
          <p className="mt-3 text-neutral-400">Think. Visualize. Collaborate. Build.</p>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <div className="h-full bg-neutral-950 p-8">
                <div className="flex size-11 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-[0_0_24px_-4px_var(--brand-violet)]">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-neutral-400">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/landing/features-band.tsx
git commit -m "feat(landing): dark feature band with 6 features"
```

---

### Task 8: Pricing anchor + privacy band

**Files:**
- Create: `components/landing/pricing.tsx`
- Create: `components/landing/byo-ai.tsx`

**Interfaces:**
- Consumes: `Reveal` (Task 3), `Button`, `lucide-react`.
- Produces: `Pricing({ signedIn })` (renders `id="pricing"`), `ByoAi()`.

- [ ] **Step 1: Create `byo-ai.tsx`**

```tsx
import { ShieldCheck, TerminalSquare, Laptop, Lock } from "lucide-react";
import { Reveal } from "./motion";

const POINTS = [
  { icon: ShieldCheck, title: "You're in control", body: "Your API keys. Your data. Always private." },
  { icon: TerminalSquare, title: "Any model, any source", body: "OpenAI, Claude, Gemini, Llama, Groq, Ollama & more." },
  { icon: Laptop, title: "Local or cloud", body: "Run locally with Ollama or connect any provider." },
  { icon: Lock, title: "Privacy first", body: "End-to-end control. No lock-in. No hidden fees." },
];

export function ByoAi() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">Your keys. Your freedom.</h2>
      </Reveal>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={(i % 4) * 0.08}>
            <p.icon className="size-7 text-brand-violet" />
            <h3 className="mt-3 font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `pricing.tsx`**

```tsx
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./motion";

const INCLUDED = [
  "Bring your own API key",
  "Infinite collaborative canvas",
  "AI diagrams, wireframes & docs",
  "No lock-in, no hidden fees",
];

export function Pricing({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="pricing" className="border-t border-border bg-surface-muted py-24">
      <div className="mx-auto max-w-md px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-3 text-muted-foreground">Pay for your own model usage. WhiteWire is free.</p>
        </Reveal>
        <Reveal className="mt-10" delay={0.1}>
          <div className="rounded-2xl border border-border bg-white p-8 shadow-xl">
            <p className="text-sm font-medium text-brand-violet">Free — bring your own key</p>
            <p className="mt-2 text-4xl font-bold">
              $0<span className="text-base font-normal text-muted-foreground">/forever</span>
            </p>
            <ul className="mt-6 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-brand-blue" /> {item}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 w-full bg-gradient-brand text-white hover:opacity-90" size="lg">
              <Link href={signedIn ? "/dashboard" : "/sign-up"}>
                {signedIn ? "Open WhiteWire" : "Get started free"}
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add components/landing/pricing.tsx components/landing/byo-ai.tsx
git commit -m "feat(landing): pricing anchor + privacy band"
```

---

### Task 9: Footer

**Files:**
- Create: `components/landing/footer.tsx`

**Interfaces:**
- Consumes: `Logo` (Task 2).
- Produces: `LandingFooter()`.

- [ ] **Step 1: Create `footer.tsx`**

```tsx
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#how" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "#" },
      { label: "Changelog", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div>
          <Logo variant="full" appearance="light" />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            Think. Visualize. Collaborate. Build. The AI-native canvas — your keys, your freedom.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} WhiteWire. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/landing/footer.tsx
git commit -m "feat(landing): footer with link columns"
```

---

### Task 10: Assemble landing page

**Files:**
- Modify: `app/page.tsx` (replace body with composed sections)

**Interfaces:**
- Consumes: all `components/landing/*` (Tasks 4–9), existing `createClient` from `@/core/supabase/server`.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import { createClient } from "@/core/supabase/server";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { WhatItIs } from "@/components/landing/what-it-is";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturesBand } from "@/components/landing/features-band";
import { Pricing } from "@/components/landing/pricing";
import { ByoAi } from "@/components/landing/byo-ai";
import { LandingFooter } from "@/components/landing/footer";

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground">
      <LandingNav signedIn={signedIn} />
      <main className="flex-1">
        <Hero signedIn={signedIn} />
        <WhatItIs />
        <HowItWorks />
        <FeaturesBand />
        <ByoAi />
        <Pricing signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Verify build + full visual pass**

Run: `pnpm build` then `pnpm dev`.
Expected: build passes. Load `/`: nav blurs on scroll, hero cards float, sections reveal on scroll, dark band renders, anchor links (`#features`, `#how`, `#pricing`) jump correctly. Toggle OS "reduce motion" → animations become static (no float, no reveal offset).

- [ ] **Step 3: Verify tests still green**

Run: `pnpm test`
Expected: all existing tests pass (no logic touched).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(landing): assemble single-scroll landing page"
```

---

### Task 11: Auth shell + sign-in + sign-up

**Files:**
- Create: `components/auth/auth-shell.tsx`
- Modify: `app/sign-in/page.tsx`
- Modify: `app/sign-up/page.tsx`

**Interfaces:**
- Consumes: `Logo` (Task 2), `Input`/`Button`, existing `signInAction` (`@/app/auth/actions`) and sign-up action.
- Produces: `AuthShell({ title, children }: { title: string; children: React.ReactNode })` — split layout: left gradient brand panel, right white form area on dotted grid.
- Note: read the current `app/sign-up/page.tsx` first to preserve its exact action import and field names (mirror the sign-in restyle).

- [ ] **Step 1: Create `auth-shell.tsx`**

```tsx
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-brand p-10 text-white md:flex">
        <Link href="/" aria-label="WhiteWire home">
          <Logo variant="full" appearance="dark" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Think. Visualize.<br />Collaborate. Build.</h2>
          <p className="mt-4 max-w-sm text-white/80">
            The AI-native canvas. Your keys, your freedom.
          </p>
        </div>
        <p className="text-sm text-white/70">Bring Your Own AI · Your Keys · Your Freedom</p>
      </div>
      <div className="flex items-center justify-center bg-dotted-grid p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 md:hidden">
            <Logo variant="full" appearance="light" />
          </div>
          <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Restyle `app/sign-in/page.tsx`**

```tsx
import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Sign in to WhiteWire">
      <form action={signInAction} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Input name="email" type="email" placeholder="Email" required className="h-10" />
        <Input name="password" type="password" placeholder="Password" required className="h-10" />
        <Button type="submit" size="lg" className="w-full bg-gradient-brand text-white hover:opacity-90">
          Sign in
        </Button>
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/sign-up" className="text-brand-violet hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
```

- [ ] **Step 3: Restyle `app/sign-up/page.tsx`**

Read the existing file first, then mirror the sign-in restyle: wrap the existing form (same action import, same field `name`s, same error handling) in `<AuthShell title="Create your WhiteWire account">`, swap raw inputs for `Input`, submit for the gradient `Button`, and cross-link to `/sign-in`. Do not change the action or field names.

- [ ] **Step 4: Verify build + visual**

Run: `pnpm build` then `pnpm dev`.
Expected: `/sign-in` and `/sign-up` show the split layout (brand panel + form), gradient submit, stack to single column on mobile. Submitting still hits the same server actions (test an invalid login → error text shows).

- [ ] **Step 5: Verify tests**

Run: `pnpm test`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add components/auth/auth-shell.tsx app/sign-in/page.tsx app/sign-up/page.tsx
git commit -m "feat(auth): landing-matched split-layout sign-in/sign-up"
```

---

### Task 12: App shell — Sidebar rework + Topbar

**Files:**
- Modify: `components/app-shell/sidebar.tsx`
- Create: `components/app-shell/topbar.tsx`

**Interfaces:**
- Consumes: `Logo` (Task 2), `lucide-react`, existing `signOutAction`.
- Produces:
  - Reworked `Sidebar()` — white bg, grey border, logo mark + wordmark, active-route highlight, lucide icons.
  - `Topbar({ breadcrumbs, actions }: { breadcrumbs: { label: string; href?: string }[]; actions?: React.ReactNode })` — sticky page header for app pages.

- [ ] **Step 1: Rework `sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, FileStack, Settings, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Projects", icon: FolderKanban },
  { href: "/artifacts", label: "Artifacts", icon: FileStack },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-surface p-4">
      <Link href="/dashboard" className="mb-6 px-1">
        <Logo variant="full" appearance="light" />
      </Link>
      <nav className="flex flex-col gap-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <l.icon className="size-4" />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <form action={signOutAction} className="mt-auto">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
          Sign out
        </button>
      </form>
    </aside>
  );
}
```

- [ ] **Step 2: Create `topbar.tsx`**

```tsx
import Link from "next/link";
import { Fragment } from "react";

export function Topbar({
  breadcrumbs,
  actions,
}: {
  breadcrumbs: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface/80 px-8 backdrop-blur">
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((b, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-muted-foreground">/</span>}
            {b.href ? (
              <Link href={b.href} className="text-muted-foreground hover:text-foreground">
                {b.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{b.label}</span>
            )}
          </Fragment>
        ))}
      </nav>
      {actions}
    </header>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: passes. (Sidebar now client — confirm `usePathname` import is correct.)

- [ ] **Step 4: Commit**

```bash
git add components/app-shell/sidebar.tsx components/app-shell/topbar.tsx
git commit -m "feat(app-shell): reworked sidebar + breadcrumb topbar"
```

---

### Task 13: Dashboard grey/white rework

**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `Sidebar`, `Topbar` (Task 12), `Card`, `NewProjectDialog`, `deleteProjectAction`, existing `listProjects`/`syncCurrentUser`, `lucide-react`.

- [ ] **Step 1: Rework `app/dashboard/page.tsx`**

```tsx
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { db } from "@/core/persistence/db";
import { listProjects } from "@/core/persistence/projects.repo";
import { syncCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { NewProjectDialog } from "./new-project-dialog";
import { deleteProjectAction } from "./actions";

export default async function Dashboard() {
  const ownerId = await syncCurrentUser();
  const projects = await listProjects(db, ownerId);

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Projects" }]} actions={<NewProjectDialog />} />
        <main className="flex-1 p-8">
          {projects.length === 0 ? (
            <div className="mt-20 flex flex-col items-center text-center">
              <p className="text-muted-foreground">No projects yet.</p>
              <p className="text-sm text-muted-foreground">Create your first one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="group/proj flex flex-row items-center justify-between p-4 transition-shadow hover:shadow-md"
                >
                  <Link href={`/p/${p.id}`} className="font-medium hover:text-brand-violet">
                    {p.name}
                  </Link>
                  <form action={deleteProjectAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover/proj:opacity-100"
                      type="submit"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + visual**

Run: `pnpm build` then `pnpm dev`.
Expected: `/dashboard` shows grey page bg, white sidebar with active "Projects" highlight, breadcrumb topbar with New Project action, project cards hover-lift and reveal a trash icon. Create + delete still work.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): grey/white rework with topbar + card grid"
```

---

### Task 14: Settings grey/white rework

**Files:**
- Modify: `app/settings/page.tsx`

**Interfaces:**
- Consumes: `Sidebar`, `Topbar` (Task 12), `Card`+`CardHeader`+`CardTitle`+`CardContent` (`@/components/ui/card`), existing key/settings actions + `RouteSelect`, `Input`/`Button`.

- [ ] **Step 1: Rework `app/settings/page.tsx`**

Keep all data fetching, `ROLES`, actions, `RouteSelect`, field `name`s, and `<select>`/`Input` names exactly as they are. Change only the layout wrapper and section chrome:

- Replace the outer `<div className="flex">` + `<main className="flex-1 p-8">` + `<h1>` with the Sidebar + Topbar shell (same pattern as Task 13), grey bg:

```tsx
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Settings" }]} />
        <main className="flex-1 p-8">
          {/* sections below */}
        </main>
      </div>
    </div>
  );
```

- Wrap each of the two `<section>` blocks in a white `Card` for surface consistency. For the "API Keys" section, use:

```tsx
<Card className="mb-8 max-w-xl p-6">
  <h2 className="mb-3 font-medium">API Keys (BYO-LLM)</h2>
  {/* existing keys list + add-key form unchanged */}
</Card>
```

  and the model-routing section:

```tsx
<Card className="max-w-xl p-6">
  <h2 className="mb-1 font-medium">Model routing</h2>
  {/* existing routing content unchanged */}
</Card>
```

- Restyle the per-key `<li>` from `rounded border p-3` to `rounded-lg border border-border p-3`, and change the raw red delete `<button>` classes to `text-sm text-destructive hover:underline` (keep it a submit inside its form). Change the inner add-key/routing `rounded border p-4` wrappers to plain content (the Card is now the surface) or `rounded-lg border border-border p-4` if a nested frame is still desired.

Add the imports at top:

```tsx
import { Topbar } from "@/components/app-shell/topbar";
import { Card } from "@/components/ui/card";
```

- [ ] **Step 2: Verify build + visual**

Run: `pnpm build` then `pnpm dev`.
Expected: `/settings` shows grey bg, white cards, breadcrumb "Settings", active sidebar item. Adding/deleting a key and changing routing still function (actions unchanged).

- [ ] **Step 3: Verify tests**

Run: `pnpm test`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat(settings): grey/white rework with topbar + card sections"
```

---

### Task 15: Artifacts grey/white rework

**Files:**
- Modify: `app/artifacts/page.tsx`

**Interfaces:**
- Consumes: `Sidebar`, `Topbar` (Task 12), `Card`, existing `listArtifactsByOwner`/`syncCurrentUser`.

- [ ] **Step 1: Rework `app/artifacts/page.tsx`**

Keep the data fetch and `byProject` grouping logic exactly. Replace the shell + list chrome:

```tsx
import Link from "next/link";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Card } from "@/components/ui/card";
import { db } from "@/core/persistence/db";
import { listArtifactsByOwner } from "@/core/persistence/artifacts.repo";
import { syncCurrentUser } from "@/lib/auth";

export default async function ArtifactsPage() {
  const ownerId = await syncCurrentUser();
  const rows = await listArtifactsByOwner(db, ownerId);

  const byProject = new Map<string, { name: string; items: typeof rows }>();
  for (const r of rows) {
    const g = byProject.get(r.projectId) ?? { name: r.projectName, items: [] as typeof rows };
    g.items.push(r);
    byProject.set(r.projectId, g);
  }

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Artifacts" }]} />
        <main className="flex-1 p-8">
          {rows.length === 0 ? (
            <p className="mt-20 text-center text-sm text-muted-foreground">
              No artifacts yet. Open a project, select an AI Node, and generate one.
            </p>
          ) : (
            <div className="space-y-8">
              {[...byProject.entries()].map(([projectId, group]) => (
                <section key={projectId}>
                  <h2 className="mb-3 font-medium">
                    <Link href={`/p/${projectId}`} className="hover:text-brand-violet">
                      {group.name}
                    </Link>
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.items.map((a) => (
                      <Card key={a.id} className="p-4">
                        <span className="text-sm font-medium capitalize">{a.type}</span>
                        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                          {a.content}
                        </pre>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + visual**

Run: `pnpm build` then `pnpm dev`.
Expected: `/artifacts` shows grey bg, white artifact cards in a 2-col grid grouped by project, breadcrumb + active sidebar item.

- [ ] **Step 3: Commit**

```bash
git add app/artifacts/page.tsx
git commit -m "feat(artifacts): grey/white rework with topbar + card grid"
```

---

### Task 16: Project page + canvas chrome restyle

**Files:**
- Modify: `app/p/[projectId]/page.tsx` (breadcrumb + grey shell where it wraps canvas chrome)
- Modify: `components/canvas/canvas-toolbar.tsx`, `components/canvas/command-bar.tsx`, `components/workspace/inspector-panel.tsx` (surface/border restyle only)

**Interfaces:**
- Consumes: existing project/workspace components. **No behavior changes** — canvas logic, autosave, AI nodes untouched.
- Note: read each file first; change only Tailwind color/border/background classes to the grey/white system (`bg-surface`/`bg-card`, `border-border`, `text-muted-foreground`). Do not alter props, state, handlers, or structure.

- [ ] **Step 1: Read the target files**

Read `app/p/[projectId]/page.tsx`, `components/canvas/canvas-toolbar.tsx`, `components/canvas/command-bar.tsx`, `components/workspace/inspector-panel.tsx`, and `components/workspace/workspace-shell.tsx` to see current chrome classes and where a breadcrumb/topbar fits without disturbing the canvas viewport.

- [ ] **Step 2: Add breadcrumb to project page (if it has a header region)**

If `app/p/[projectId]/page.tsx` renders a header/toolbar area (not the full-bleed canvas), add a breadcrumb `Projects / <project name>` using the same `Topbar` pattern, or a lightweight inline breadcrumb if a full topbar would crowd the canvas. If the page is full-bleed canvas with its own toolbar, add the breadcrumb into the existing toolbar's left slot instead. Keep the project-name source from the existing data fetch.

- [ ] **Step 3: Restyle canvas chrome surfaces**

In `canvas-toolbar.tsx`, `command-bar.tsx`, and `inspector-panel.tsx`, replace ad-hoc panel backgrounds/borders with the grey/white tokens: floating panels → `bg-surface border border-border shadow-sm rounded-xl`; muted text → `text-muted-foreground`; active/primary accents may use `bg-gradient-brand text-white`. Change classes only — leave every prop, handler, and element structure identical.

- [ ] **Step 4: Verify build + full functional pass**

Run: `pnpm build` then `pnpm dev`.
Expected: build passes. Open a project: canvas still draws, AI nodes still generate, autosave still fires, panels/toolbar now match grey/white. Breadcrumb shows project name.

- [ ] **Step 5: Verify tests**

Run: `pnpm test`
Expected: all green (canvas logic untouched).

- [ ] **Step 6: Commit**

```bash
git add app/p/ components/canvas/canvas-toolbar.tsx components/canvas/command-bar.tsx components/workspace/inspector-panel.tsx
git commit -m "feat(canvas): grey/white chrome restyle + project breadcrumb"
```

---

### Task 17: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: succeeds.

- [ ] **Step 3: Tests**

Run: `pnpm test`
Expected: all green.

- [ ] **Step 4: Manual checklist (via `pnpm dev`)**

- [ ] Landing `/`: nav blur-on-scroll, floating hero cards, scroll-reveals, dark feature band, pricing/privacy bands, footer.
- [ ] Reduced-motion OS setting → landing animations static.
- [ ] Favicon shows gradient W; logo transparent on both light nav and dark auth panel.
- [ ] `/sign-in`, `/sign-up`: split layout, gradient button, mobile stacks, actions still work.
- [ ] `/dashboard`, `/artifacts`, `/settings`: grey bg + white surfaces, active sidebar item, breadcrumb topbar, all actions functional.
- [ ] Project + canvas: grey/white chrome, canvas fully functional.
- [ ] Responsive: check mobile/tablet/desktop for hero, feature band, footer, app grids.

- [ ] **Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "chore(ui): final verification fixes for redesign"
```

---

## Self-Review Notes

- **Spec coverage:** brand tokens+font+logo+favicon (T1–2) ✓; landing sections nav/hero/what/how/features/pricing/privacy/footer (T4–10) ✓; auth split layout (T11) ✓; app shell sidebar+topbar (T12) ✓; dashboard/settings/artifacts deeper rework (T13–15) ✓; project+canvas chrome (T16) ✓; pricing as on-page anchor, no route ✓; Framer Motion via `motion/react` ✓; reduced-motion ✓.
- **Type consistency:** `Logo({ variant, appearance })`, `Reveal({ children, className, delay })`, `Float({ children, className, amplitude, duration, delay })`, `Topbar({ breadcrumbs, actions })`, `AuthShell({ title, children })`, section components take `signedIn` where they render CTAs — used consistently across tasks.
- **No-logic-change constraint** is repeated on every app-page task; settings/artifacts tasks explicitly say keep actions + field names.
- **Known risk:** base-ui `Button asChild` — Task 4 includes a verified fallback if unsupported.
