# WhiteWire UI Redesign v2 — Design Spec

**Date:** 2026-07-02
**Status:** Approved (pending spec review)
**Builds on:** `2026-07-02-ui-redesign-design.md` (v1, shipped to production). This is a refinement round addressing user feedback after v1 went live.

---

## Goals

Address 7 pieces of post-launch feedback, grouped into 5 independent workstreams:

| WS | Theme | Feedback items |
|----|-------|----------------|
| **A** | Landing v2 — full-height responsive hero, richer floating elements, a self-animating demo replacing the dead section-2, and new interactive sections | 2, 4, 5 |
| **B** | Perceived performance — route-level skeleton loading states (currently zero `loading.tsx` exist) | 1 |
| **C** | Settings model-picker — live-fetch available models per provider so users pick from a dropdown instead of hand-typing (typos silently break generation) | 3 |
| **D** | Account page — profile, change password, preferences, delete account | 6 |
| **E** | Content pages — About, Docs, Privacy, Terms, Contact, Changelog in the scribble/doodle theme; wire footer links | 7 |

**Build order:** A → C → D → E → B (skeletons last, so new routes like `/account` also get one).

## Non-Goals

- No real embedded interactive canvas on the landing page (chose animated fake demo — lower perf risk).
- No email-change flow in Account (out of scope this round).
- No CMS/MDX docs system — Docs is a styled hand-written page for now.
- No changes to canvas/AI/autosave behavior.

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Model list | Live-fetch from provider's models API via a "Load models" button; free-text fallback kept for local/Ollama |
| Content pages | About, Docs, Privacy, Terms, Contact, Changelog — real concise copy |
| Account | Profile + password + preferences + delete account |
| Delete account | Fully built; requires `SUPABASE_SERVICE_ROLE_KEY` (user will set it); errors clearly if missing |
| Landing | Animated fake-canvas demo + new sections (use-cases, integrations, FAQ, final CTA) |
| Docs depth | Real concise copy, ship-ready |

---

## Global Constraints

- Reuse the v1 brand system: tokens `--brand-violet`/`--brand-blue`, `.text-gradient-brand`/`.bg-gradient-brand`/`.bg-dotted-grid`, `font-hand` (Caveat), `Logo`, `motion/react`.
- All animation gated behind `prefers-reduced-motion` (via existing `Reveal`/`Float` helpers or equivalent guards).
- base-ui `Button` has no `asChild` → CTAs use `buttonVariants(...)` on `<Link>`.
- App pages: grey `--surface-muted` bg, white surfaces, neutral borders; gradient only for accents.
- No changes to existing server-action field names or the `addKeyAction` contract (`provider,label,baseUrl,model,apiKey`).
- Verification: `pnpm build` passes; `pnpm test` stays green (baseline 96 tests) plus new tests for WS-C and WS-D logic.

---

## Workstream A — Landing v2

Files under `components/landing/`. Split new pieces into focused files; keep `app/page.tsx` a thin composition.

### A1. Hero (`hero.tsx` rework)
- Section becomes `min-h-[100svh]` with content vertically centered (`flex flex-col justify-center`).
- Headline uses fluid sizing (`text-[clamp(2.5rem,8vw,5.5rem)]`), subcopy and CTAs scale down cleanly on mobile.
- Floating elements: keep 4 but make them richer — add (a) a soft animated gradient **blob backdrop** (`bg-gradient-brand blur-3xl opacity-20` slowly drifting), (b) subtle **parallax** on scroll (`useScroll` → translateY per depth layer), (c) a dashed **connector arrow** SVG between two cards, (d) a **"live collaborator" avatar chip** (small circle + name in `font-hand`). Floats are `hidden md:block`; on mobile the hero is clean text + CTAs.
- Respect reduced-motion: parallax + blob drift disabled, floats become static.

### A2. Animated demo — replace `what-it-is.tsx` → `live-canvas-demo.tsx`
- New `components/landing/live-canvas-demo.tsx` (`"use client"`), section heading "Watch an idea come alive".
- A framed canvas-styled panel (dotted grid) containing an **SVG scene that animates on scroll-into-view**: (1) a hand-drawn sketch stroke draws itself (`stroke-dashoffset` 1→0), (2) two–three nodes fade+scale in staggered, (3) arrows draw between them (dashoffset), (4) a sticky note in `font-hand` pops. Uses `motion/react` timeline or CSS keyframes triggered by an in-view flag; loops subtly or plays once. Reduced-motion → shows the final composed state statically.
- Purpose is now legible: it demonstrates sketch → diagram, the product's core loop.

### A3. New sections
- `use-cases.tsx` — 3–4 cards ("System design", "Wireframes & UI", "Docs & specs", "Brainstorming"), each icon + title + one line, hover-lift.
- `integrations.tsx` — "Any model, any source" row of styled name badges (OpenAI, Anthropic, Google, Ollama, LM Studio, Groq, Mistral) as pill/badges (text, no external logo assets).
- `faq.tsx` — accordion (native `<details>`/`<summary>` styled, or base-ui Accordion if present — prefer native `<details>` to avoid new deps), 5–6 Q&As (BYO keys, privacy, pricing, local models, collaboration).
- `final-cta.tsx` — light gradient-accented band before footer with a single strong CTA.
- Each new section uses `Reveal` and `scroll-mt-20` if it becomes a nav anchor.

### A4. Compose in `app/page.tsx`
- Order: Nav → Hero → LiveCanvasDemo → HowItWorks → UseCases → FeaturesBand → Integrations → ByoAi → Pricing → FAQ → FinalCTA → Footer. `signedIn` threaded to Nav/Hero/Pricing/FinalCTA.

---

## Workstream B — Skeleton loading

- New `components/ui/skeleton.tsx` — `Skeleton({ className })`: `animate-pulse rounded-md bg-muted` (reduced-motion → no pulse).
- New route loading files, each rendering the same shell as its page (Sidebar + Topbar) with skeleton placeholders:
  - `app/dashboard/loading.tsx` — topbar "Projects" + a grid of ~6 skeleton cards.
  - `app/artifacts/loading.tsx` — topbar + skeleton project sections.
  - `app/settings/loading.tsx` — topbar + two skeleton Card blocks.
  - `app/p/[projectId]/loading.tsx` — workspace-shell-shaped skeleton (header bar + canvas placeholder), no sidebar (project page is full-bleed).
  - `app/account/loading.tsx` — topbar + skeleton cards (created in WS-D, loading added here).
- These leverage Next App Router's automatic `loading.tsx` → Suspense boundary, so navigation shows the skeleton instantly while the server component resolves auth+DB.

---

## Workstream C — Settings model-picker (live-fetch)

### C1. `core/ai/list-models.ts`
- `export async function listModels(input: { provider: string; baseUrl: string | null; apiKey: string }): Promise<string[]>`.
- Per provider:
  - `openai-compatible`: `GET {baseUrl||https://api.openai.com/v1}/models` with `Authorization: Bearer {apiKey}` → parse `data[].id`.
  - `anthropic`: `GET https://api.anthropic.com/v1/models` with `x-api-key: {apiKey}` + `anthropic-version: 2023-06-01` → parse `data[].id`.
  - `google`: `GET https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}` → parse `models[].name` (strip `models/` prefix), filter to `generateContent`-capable.
- Reuse v1 baseUrl validation (http/https only, allow localhost for local models). Sort results; on non-2xx, throw an `Error` whose message is safe to surface (e.g. "Provider rejected the key (401)"). Timeout each request (~10s via `AbortSignal.timeout`).
- Unit-tested by mocking `fetch` for each provider's response shape + an error case.

### C2. `app/api/models/route.ts`
- `POST` handler: auth-guard with `syncCurrentUser()` (401 if not signed in). Body `{ provider, baseUrl, apiKey }`. Validates provider ∈ the 3 known. Calls `listModels`, returns `{ models: string[] }` or `{ error: string }` with appropriate status. Never logs the key.

### C3. `components/settings/add-key-form.tsx` (`"use client"`)
- Extracts the existing add-key `<form action={addKeyAction}>` into a client component so it can drive the model dropdown.
- Fields unchanged: `provider` (select), `label`, `baseUrl` (shown only for openai-compatible), `apiKey`, `model`.
- New **"Load models"** button: `POST`s to `/api/models` with current provider/baseUrl/apiKey; on success populates a `<select name="model">`; on error shows an inline message. A **"type manually"** toggle keeps a free-text `<input name="model">` fallback (for local/custom models not in the list).
- Submitting still calls `addKeyAction` with identical field names — repo/DB untouched.
- `app/settings/page.tsx` swaps the inline add-key markup for `<AddKeyForm />` (server component otherwise unchanged; data fetch/actions/RouteSelect intact).

---

## Workstream D — Account page

### D1. Route + nav
- `app/account/page.tsx` (server): loads Supabase user + display name from `user.user_metadata`. Uses Sidebar + Topbar (breadcrumb "Account").
- Add "Account" link to `components/app-shell/sidebar.tsx` nav (icon `UserCircle`).

### D2. Sections (white Cards on grey bg)
- **Profile**: email (read-only), display name (editable) → `updateProfileAction`.
- **Password**: new password + confirm → `changePasswordAction`. Client-side confirm-match; server enforces min length (≥6, matching sign-up).
- **Preferences**: display name lives here OR profile (implementer picks one home for it — do not duplicate). Keep minimal; no invented prefs.
- **Danger zone**: delete account button with typed-confirm ("delete my account") → `deleteAccountAction`.

### D3. `app/account/actions.ts`
- `updateProfileAction(formData)`: `supabase.auth.updateUser({ data: { display_name } })`.
- `changePasswordAction(formData)`: validate confirm-match + length, `supabase.auth.updateUser({ password })`.
- `deleteAccountAction(formData)`: verify typed confirmation; cascade-delete the user's rows (projects, keys, artifacts, settings) via existing repos/`db`; then `supabase.auth.admin.deleteUser(userId)` using a **service-role client** (`SUPABASE_SERVICE_ROLE_KEY`); then sign out + redirect to `/`. If the service key env is missing, throw a clear error ("Account deletion is not configured — set SUPABASE_SERVICE_ROLE_KEY").
- New `core/supabase/admin.ts` — `createAdminClient()` using the service-role key (server-only). Guard against missing env.
- Unit-test the confirm-match/length validation and the missing-service-key guard (mock supabase).

### D4. Config
- `SUPABASE_SERVICE_ROLE_KEY` documented in README/`.env.local` and required on Vercel for delete to work. User will add it.

---

## Workstream E — Content pages

### E1. Shared shell
- `components/marketing/marketing-shell.tsx` — `MarketingShell({ children })`: renders `LandingNav` (signedIn resolved by each page) + a `<main>` with the scribble/doodle theme (dotted-grid background band, `font-hand` accents, hand-drawn `<hr>`/divider SVGs) + `LandingFooter`. Keeps content pages visually consistent with the landing.
- Optionally a shared `PageHeader` (big title + Caveat subtitle) used across content pages.

### E2. Pages (server components, real concise copy)
- `app/about/page.tsx` — product story, mission ("bring your own AI"), what makes it different.
- `app/docs/page.tsx` — getting started (sign up → add a key → create project → sketch → generate), sectioned with anchors; real steps.
- `app/privacy/page.tsx` — concise privacy policy (BYO keys, data handling).
- `app/terms/page.tsx` — concise terms of service.
- `app/contact/page.tsx` — contact info + a simple `mailto:` link/button (no backend form this round).
- `app/changelog/page.tsx` — a few real entries derived from git history (v1 redesign, BYO-LLM, artifacts, canvas).

### E3. Wire footer
- Update `components/landing/footer.tsx`: point the `#` placeholders to the new routes (Product → anchors; Resources → /docs, /changelog; Company → /about, /contact; Legal → /privacy, /terms).

---

## File / Change Map (summary)

**New**
- Landing: `components/landing/{live-canvas-demo,use-cases,integrations,faq,final-cta}.tsx`
- Skeleton: `components/ui/skeleton.tsx`; `app/{dashboard,artifacts,settings,p/[projectId],account}/loading.tsx`
- Models: `core/ai/list-models.ts`; `app/api/models/route.ts`; `components/settings/add-key-form.tsx`
- Account: `app/account/page.tsx`; `app/account/actions.ts`; `core/supabase/admin.ts`
- Content: `components/marketing/marketing-shell.tsx`; `app/{about,docs,privacy,terms,contact,changelog}/page.tsx`
- Tests: `tests/**` for `list-models` + account action validation.

**Modified**
- `app/page.tsx` (new section composition), `components/landing/hero.tsx` (full-height/parallax/richer floats), `components/landing/footer.tsx` (real links)
- `app/settings/page.tsx` (use `AddKeyForm`), `components/app-shell/sidebar.tsx` (Account link)

**Removed/replaced**
- `components/landing/what-it-is.tsx` → replaced by `live-canvas-demo.tsx` (remove the old file, update the import).

**New dependency:** none expected (native `<details>` for FAQ; `motion` already present).

---

## Testing / Verification

- **Unit:** `listModels` per-provider parsing + error/timeout (mock `fetch`); account action confirm-match/length + missing-service-key guard (mock supabase). Keep baseline 96 green; add ~8–12 new tests.
- **Build/lint:** `pnpm build` passes; touched files lint-clean (whole-repo lint has pre-existing debt — not a gate).
- **Manual/visual:** `pnpm dev` — hero full-height + responsive at mobile/tablet/desktop; animated demo plays and reduced-motion fallback; model-picker loads a real list with a valid key and errors cleanly with a bad one; account password change + profile update; each content page renders with nav/footer; skeletons flash on slow nav.
- **Prod:** deploy via `vercel --prod` after merge; set `SUPABASE_SERVICE_ROLE_KEY` for delete.

## Risks / Open Items

- **Delete account** depends on `SUPABASE_SERVICE_ROLE_KEY`; without it the danger-zone action errors by design. Service-role client must be server-only (never imported into client code).
- **Provider models APIs** differ in shape and may change; parsing is defensive and unit-tested, but a provider could return an unexpected structure — surface a friendly error rather than crashing the form.
- **`/api/models`** receives the user's key in the request body — must be POST over HTTPS, auth-guarded, never logged, key not persisted unless the user submits add-key.
- **Animated demo** performance: keep the SVG scene lightweight; pause when off-screen; honor reduced-motion.
