# WhiteWire UI Redesign — Design Spec

**Date:** 2026-07-02
**Status:** Approved (pending spec review)
**Scope:** Landing page, brand/logo system, auth pages, and grey/white theme rework of all post-login app pages. Functionality is complete; this is a UI/visual pass only — no backend, data model, or business-logic changes.

---

## Goals

1. Ship a single-scroll marketing landing page in an Excalidraw-style **light** aesthetic with a **dark feature band**, floating animated elements, and a full footer.
2. Establish a reusable WhiteWire brand system: transparent SVG logo (works on any background), favicon, brand color tokens, and an accent hand-drawn font.
3. Redesign sign-in / sign-up to visually match the landing page (light).
4. Rework all post-login pages (dashboard, artifacts, settings, project, canvas chrome) into a consistent **grey + white** theme, including layout restructuring (topbar, breadcrumbs, denser settings, artifact grid).

## Non-Goals

- No new product features or routes beyond a landing-page pricing anchor.
- No changes to canvas *functionality* (tldraw/xyflow behavior, AI nodes, autosave) — only visual chrome alignment.
- No auth/logic/data changes; server actions and repos stay as-is.
- No `/pricing` route — pricing is an on-page anchor section only.

---

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Landing theme | Light hero + auth (Excalidraw style), one dark feature band, light footer |
| Brand accent | Purple→blue gradient (violet `#7C3AED` → blue `#2563EB`, 135°) |
| Logo | Recreate as transparent SVG (W mark + pen nib + gradient); swap-able later |
| Animation | Framer Motion (new dependency) |
| Auth pages | Light, split layout, match landing |
| App pages | Grey + white theme, **deeper rework** (topbar/breadcrumbs/denser layouts) |
| Pricing | On-page anchor section in landing scroll (no route) |

---

## 1. Brand Foundation

### 1.1 Color tokens — [app/globals.css](../../../app/globals.css)
Add brand tokens alongside existing shadcn neutral tokens (app pages continue to use the neutral scale):

```css
:root {
  --brand-violet: oklch(0.53 0.24 293);  /* ~#7C3AED */
  --brand-blue:   oklch(0.55 0.22 264);  /* ~#2563EB */
  --brand-gradient: linear-gradient(135deg, var(--brand-violet), var(--brand-blue));
  /* light app surfaces */
  --surface-muted: oklch(0.98 0 0);   /* page bg grey */
  --surface:       oklch(1 0 0);      /* card white */
}
```
Expose via `@theme inline` as `--color-brand-violet` / `--color-brand-blue` so Tailwind utilities (`text-brand-violet`, `bg-brand-blue`) work. Add a `.text-gradient` / `.bg-gradient-brand` helper class for gradient text/fills.

### 1.2 Fonts — [app/layout.tsx](../../../app/layout.tsx)
- Keep **Geist** (sans) + **Geist Mono** for body/UI.
- Add **Caveat** (Google font) as `--font-hand` for hand-drawn annotations (sticky-note scribbles, arrow labels). Exposed as Tailwind `font-hand`.

### 1.3 Logo system — new `components/brand/`
- `logo.tsx` — `<Logo variant="full"|"mark" appearance="light"|"dark" className />`.
  - `mark`: rounded-square frame + gradient **W** + pen-nib, pure SVG, `fill` uses gradient `<defs>`, transparent background.
  - `full`: mark + "WhiteWire" wordmark (White in current text color, Wire in gradient) + optional tagline.
  - `appearance` controls wordmark text color (dark text on light bg, white on dark).
- `app/icon.svg` — mark-only transparent favicon, picked up by Next metadata automatically.
- Update [app/layout.tsx](../../../app/layout.tsx) `metadata` (title/description already fine).

---

## 2. Landing Page

Single scroll. [app/page.tsx](../../../app/page.tsx) becomes a thin composition of section components in new `components/landing/`. Signed-in users see "Open WhiteWire" instead of "Get started" in nav/hero CTA (existing `getUser()` check preserved).

### Structure (new files under `components/landing/`)
1. **`landing-nav.tsx`** — sticky top nav. Logo (full) left; center links `Features · How it works · Pricing` (anchor scroll to sections); right `Sign in` (ghost) + `Get started` (gradient). Background transparent at top → blurred white on scroll (framer-motion `useScroll`). Mobile: collapse to menu button.
2. **`hero.tsx`** — light section, dotted-grid background. Headline `Think. Visualize. Collaborate. Build.` with gradient applied to the verbs; subcopy; a `Bring Your Own AI · Your Keys · Your Freedom` pill (lock icon); CTA buttons (gradient primary + ghost secondary). **Floating cards** absolutely positioned around headline: (a) AI system-architecture card, (b) wireframe card, (c) yellow sticky note w/ Caveat text, (d) checkbox chip. Each floats on an independent framer-motion loop.
3. **`what-it-is.tsx`** — short value statement + a framed product/canvas mock card (static illustrative SVG/markup, no real canvas).
4. **`how-it-works.tsx`** — 3 steps: **Sketch/Draw → AI generates → Collaborate & Export**, connected by hand-drawn Excalidraw-style arrows (SVG). Each step: icon, title, one-line copy.
5. **`features-band.tsx`** — **DARK** section (near-black bg, gradient glow accents). 6 features in a responsive grid, matching brand sheet: Collaborative Canvas · AI, Your Way · Diagrams & Flow · Wireframes & UI · Chat with Context · Docs & Notes. Each: outline icon (lucide), title, one-line copy.
6. **`pricing.tsx`** — light anchor section (`id="pricing"`). Simple BYO-key messaging: one "Free — bring your own key" card (no paid tiers yet), emphasizing no lock-in / no hidden fees.
7. **`byo-ai.tsx`** — light band: "You're in control · Any model, any source · Local or cloud · Privacy first" (4 columns w/ icons, from brand sheet bottom row). *(May merge with pricing if visually redundant — implementer's call.)*
8. **`footer.tsx`** — logo + tagline; columns Product / Resources / Company / Legal (links can be `#` placeholders where no page exists); social icons; copyright.

### Motion (Framer Motion)
- Hero cards: continuous `y`/`rotate` float loops, staggered, varied durations.
- Sections: scroll-reveal (`whileInView` fade + slide-up, `once: true`, small stagger).
- Cards/buttons: hover-lift + shadow.
- **All motion gated behind `prefers-reduced-motion`** — reduced users get static layout.

---

## 3. Auth Pages — light, match landing

[app/sign-in/page.tsx](../../../app/sign-in/page.tsx) and [app/sign-up/page.tsx](../../../app/sign-up/page.tsx). Extract shared markup into `components/auth/auth-shell.tsx` (split layout) + reuse existing server actions unchanged.

- **Split layout** (stacks on mobile): left **brand panel** — gradient background, logo (full, dark appearance), tagline, subtle floating shapes (framer-motion, reduced-motion aware). Right **form card** — white on dotted-grid, styled inputs (reuse `components/ui/input.tsx`), gradient primary submit button, error text preserved, cross-link to the other auth page.
- Fields, names, `action={...}`, and error handling stay identical — visual only.

---

## 4. App Pages — grey + white, deeper rework

Consistent grey/white system: page bg `--surface-muted` (grey), cards/surfaces white, subtle grey borders, clear hover/active states. Uses existing neutral tokens (no brand gradient in app chrome except small accents like active nav / primary buttons).

### 4.1 Shared app shell
- **`components/app-shell/sidebar.tsx`** (rework) — white bg, grey right border, logo **mark** at top, nav links with active-state highlight (detect current route), sign-out pinned bottom. Icons via lucide.
- **`components/app-shell/topbar.tsx`** (new) — page title + **breadcrumbs** + right-side slot (page actions like "New project"). Sits above main content in each page.
- **`components/app-shell/app-layout.tsx`** (new, optional helper) — composes `Sidebar` + `Topbar` + grey content area so pages don't repeat the flex scaffold.

### 4.2 Pages
- **Dashboard** ([app/dashboard/page.tsx](../../../app/dashboard/page.tsx)) — topbar "Projects" + New Project action; responsive card grid with hover-lift, project name, subtle meta row, cleaner delete (icon button, not raw red text). Empty state polished.
- **Artifacts** ([app/artifacts/page.tsx](../../../app/artifacts/page.tsx)) — topbar + breadcrumb; denser artifact grid/list with consistent white cards.
- **Settings** ([app/settings/page.tsx](../../../app/settings/page.tsx)) — topbar + sectioned settings layout (grouped cards, labels, denser spacing). Keep existing `route-select.tsx` logic; restyle only.
- **Project** ([app/p/[projectId]/page.tsx](../../../app/p/%5BprojectId%5D/page.tsx)) — align workspace chrome to grey/white; breadcrumb `Projects / <name>`.
- **Canvas chrome** — `components/canvas/canvas-toolbar.tsx`, `command-bar.tsx`, panels (`architect-panel`, `history-panel`, `inspector*`): restyle surfaces/borders to grey+white, consistent with app shell. **No behavioral changes.**

### 4.3 Constraint
Restyle and restructure layout only. Do not touch data fetching (`listProjects`, `syncCurrentUser`), server actions, autosave, or AI node logic.

---

## Component / File Map (summary)

**New**
- `components/brand/logo.tsx`
- `app/icon.svg`
- `components/landing/{landing-nav,hero,what-it-is,how-it-works,features-band,pricing,byo-ai,footer}.tsx`
- `components/auth/auth-shell.tsx`
- `components/app-shell/{topbar,app-layout}.tsx`

**Modified**
- `app/globals.css` (brand tokens, helpers, surfaces)
- `app/layout.tsx` (Caveat font, favicon metadata)
- `app/page.tsx` (compose landing sections)
- `app/sign-in/page.tsx`, `app/sign-up/page.tsx` (auth shell)
- `components/app-shell/sidebar.tsx` (rework)
- `app/dashboard/page.tsx`, `app/artifacts/page.tsx`, `app/settings/page.tsx`, `app/p/[projectId]/page.tsx`
- Canvas chrome components (visual only)

**New dependency**
- `framer-motion`

---

## Testing / Verification

This is presentational; automated coverage is light by design.
- **Build/lint**: `pnpm build` + `pnpm lint` pass.
- **Existing tests**: `pnpm test` still green (no logic touched).
- **Manual/visual**: run `pnpm dev`, verify landing scroll + animations, reduced-motion fallback, auth pages, and each app page in grey/white. Confirm logo transparency on light/dark backgrounds and favicon renders.
- **Responsive**: hero, feature band, footer, and app grids checked at mobile / tablet / desktop widths.
- **Accessibility**: nav/landmarks, focus states on buttons/inputs, sufficient contrast on dark band, motion respects `prefers-reduced-motion`.

---

## Risks / Open Items

- Framer Motion + Next 16 / React 19.2 compatibility — verify the installed version supports React 19; use `motion/react` package if required.
- Recreated SVG logo is an approximation of the raster reference; user can drop exact exports into `public/` later without code changes.
- Footer/company links are placeholders (`#`) where no page exists.
