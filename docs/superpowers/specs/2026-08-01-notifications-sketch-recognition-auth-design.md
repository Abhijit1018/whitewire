# Notifications, Sketch Recognition, and Auth — Design

**Date:** 2026-08-01
**Status:** Approved

Three independent workstreams, shipped together.

---

## A. Notification system

### Problem

There is no toast system. Errors render inline inside flex rows, so an error message
physically grows its container and shifts the surrounding layout:

- `components/canvas/command-bar.tsx` — `{error && <span/>}` inside `flex w-full items-center`
- `components/canvas/expand-button.tsx` — same, inside `inline-flex`
- `components/canvas/canvas-toolbar.tsx` — `setMsg` inside the floating toolbar

The message also never clears. Local `error` state is only reset at the start of the
*next* submit, so if the user does not retry, the error sits on screen until reload.

### Design

**`core/state/notify-store.ts`** — zustand store, matching the existing store pattern.

```ts
type Notice = {
  id: string;
  kind: "error" | "info" | "success" | "config";
  message: string;
  action?: { label: string; href: string };
  code?: string;   // dedupe key for config notices
};
```

`notify(notice)` returns the id; `dismiss(id)` removes it. `config` notices dedupe on
`code`, so five failed actions produce one notice, not five.

**`components/ui/toaster.tsx`** — renders through a portal to `document.body`, positioned
`fixed bottom-4 right-4 z-[100]` in a `flex-col-reverse` stack, wrapped in
`role="status" aria-live="polite"`. Because it is fixed and portalled, it cannot shift
page layout. Mounted once in `app/layout.tsx`.

Transient kinds auto-dismiss after 6s with the timer paused on hover. `config` notices
never auto-dismiss and render their CTA button.

### Routing rule

The fix for the alignment bug is deciding *where* each error belongs:

| Site | Treatment |
| --- | --- |
| Floating/toolbar (command-bar, expand-button, canvas-toolbar) | Toast. Local `error` state and inline `<span>` deleted. |
| Form/dialog (architect-panel, add-key-form, sign-in, sign-up) | Stays inline — contextual and correct there — but gets reserved `min-h` so appearing text shifts nothing. |
| Config errors (`no_key`, `no_model`) | Sticky notice with a "Add a key →" CTA to `/settings`. |

### Supporting change

`core/ai/resolve-model.ts` currently throws bare `Error` with a prose string, which forces
callers to string-match. It gains a typed `ModelConfigError` carrying a `code`
(`no_key` | `no_model`), so server actions return `{ error, code }` and the client can
route a config error to a sticky notice without parsing English.

---

## B. Sketch → design without a vision model

### Problem

`components/canvas/strokes-to-image.ts` rasterizes freehand strokes to a PNG, and
`app/p/[projectId]/sketch-actions.ts` sends that PNG to a vision model. But the strokes are
already vector data (`node.data.points`) — the pipeline discards structure it has, then
pays a vision model to recover it. Vision models are also the expensive tier and many
users' active keys (Groq Llama) cannot see images at all.

OCR alone does not replace vision here: OCR reads text and is blind to boxes, arrows, and
containment, which *is* the diagram. The answer is to recover geometry from the vectors and
use OCR only for handwritten labels.

### Design

**`core/canvas/recognize/`** — pure, dependency-free, unit-testable:

1. **`classify.ts`** — Ramer–Douglas–Peucker simplification, then closedness (endpoint gap
   vs. perimeter), vertex count, and fill ratio classify each stroke as
   `rect | ellipse | diamond | line | arrow | scribble`, with bbox and confidence.
2. **`cluster.ts`** — small, dense strokes grouped by proximity into handwriting clusters.
3. **`graph.ts`** — an arrow endpoint within tolerance of a shape bbox becomes a
   connection; bbox containment becomes nesting.
4. **`serialize.ts`** — the graph becomes compact text, e.g.
   `box#1 (120,80) 200x90 "Login" · arrow box#1->box#2`.

**`components/canvas/ocr.ts`** — client-only. Lazily `import("tesseract.js")` on first use
so it stays out of the initial bundle. Each text cluster is cropped to its own canvas at 3×
scale — far more accurate than full-page OCR — and results below ~60% confidence are
dropped, letting the LLM name those nodes from structure instead.

**Flow:** `readSketch()` → recognize → OCR → `interpretSketchGraphAction(projectId, text)` →
the existing text model via `resolveModel(projectId, "reasoning")` → `parseBlueprint`.

The old `interpretSketchAction` is retained for imported images, where there is no vector
data to recover.

### Decisions

- Recognized shapes all become `aiNode` in v1. Mapping rects to `wireframeNode` or shape
  nodes is a separate feature and is not needed to prove the pipeline.
- New dependency: `tesseract.js`, lazy-loaded.
- Modules 1–4 are pure and get vitest coverage using synthetic point fixtures.

---

## C. Auth: Google sign-in and password visibility

### Problem

Neither exists. `app/sign-in/page.tsx` and `app/sign-up/page.tsx` use a raw
`<Input type="password">` with no toggle, and `app/auth/actions.ts` only has
`signInWithPassword`. There is no `/auth/callback` route, which OAuth requires.

### Design

- **`components/ui/password-input.tsx`** — wraps `Input` with a lucide `Eye`/`EyeOff`
  toggle. The toggle is `tabIndex={-1}` so tab order stays email → password → submit, and
  carries `aria-pressed` plus a label that swaps between "Show password" and "Hide
  password". Used on both auth pages.
- **`components/auth/google-button.tsx`** — client component using the browser Supabase
  client, calling `signInWithOAuth({ provider: "google", options: { redirectTo:
  window.location.origin + "/auth/callback" } })`. Client-side because this repo has no
  `NEXT_PUBLIC_SITE_URL`, and `window.location.origin` covers localhost, preview, and
  production for free. The Google mark is an inline SVG — no external asset, per CSP habit.
- **`app/auth/callback/route.ts`** — new GET handler. Exchanges `code` for a session via
  `exchangeCodeForSession`, then redirects to `/dashboard`; on failure redirects to
  `/sign-in?error=`.
- Both auth pages gain the Google button above an "or" divider, with the email form below.

The Google Cloud OAuth client and Supabase provider configuration are already in place.

---

## Testing

- `core/canvas/recognize/*` — vitest unit tests over synthetic stroke fixtures.
- `core/state/notify-store.ts` — vitest tests for dedupe and dismiss.
- `app/auth/callback` — outcome logic extracted and unit-tested, following the existing
  `signup-outcome.ts` pattern.
