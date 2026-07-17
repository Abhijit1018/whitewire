# Canvas Toolbar Collision Dodge — Design

**Date:** 2026-07-17 (revised 2026-07-17: rail → shrink-pill collapse)
**Status:** Approved (brainstorm) → pending spec review
**Author:** Abhijeet + Claude

> **Revision note:** The collapse behavior was changed from "relocate to a
> right-edge vertical rail" to "shrink in place into a compact pill" (see
> [Collapsed toolbar behavior](#collapsed-toolbar-behavior)). The detection
> architecture (store + hooks + `rectsIntersect`) is unchanged. This dodge is
> **Phase 0** of a larger canvas-freedom roadmap; Phases 1-4 (right-click
> context menu, multi-select + group/lock, smart align + snap, command palette)
> are tracked separately, each with its own spec.

## Problem

`CanvasToolbar` ([canvas-toolbar.tsx:136](../../../components/canvas/canvas-toolbar.tsx#L136))
floats top-center over the canvas, independently positioned from the header row
above it. Two header controls — `PluginMenu` ([plugin-menu.tsx:58](../../../components/canvas/plugin-menu.tsx#L58))
and `CanvasMenu` ([canvas-menu.tsx:58](../../../components/canvas/canvas-menu.tsx#L58)) —
render manually-positioned dropdown panels (`absolute ... top-full`) anchored to
their trigger buttons. Because the header's control group is horizontally
centered (`md:mx-auto` in `workspace-shell.tsx`), these dropdowns open almost
directly on top of the toolbar below them, clipping/obscuring each other.
`ArchitectPanel` and `HistoryPanel` use real modal dialogs (own backdrop), so
they aren't part of this problem.

## Goals

- The two known offenders (`PluginMenu`, `CanvasMenu`) no longer visually
  collide with `CanvasToolbar`.
- The fix generalizes: any future header dropdown gets the same dodge behavior
  by opting into one shared hook — no toolbar-side changes needed later.
- Detection is based on real DOM geometry (not a hardcoded "any panel open"
  flag), so the toolbar only dodges when there's an actual overlap.

Non-goals: redesigning `StylePanel` or `InspectorPanel` placement, changing how
`ArchitectPanel`/`HistoryPanel` dialogs behave, or a general-purpose floating-UI
library adoption.

## Architecture

### New store: `core/state/floating-panels-store.ts`

A small Zustand store (same `create()` pattern as `workspace-store.ts`) holding:

```ts
type FloatingPanelsState = {
  panelRects: Record<string, DOMRect>;
  setPanelRect: (id: string, rect: DOMRect | null) => void;
};
```

`setPanelRect(id, null)` removes the entry (used on close/unmount).

### New hook: `useFloatingPanelRect(id, isOpen)`

Lives in `core/canvas/use-floating-panel-rect.ts`. Returns a ref to attach to a
dropdown panel's container `<div>`. While `isOpen` is true, a `ResizeObserver`
on that element plus `window` resize/scroll listeners keep pushing its live
`getBoundingClientRect()` into the store under `id`. On `isOpen` going false or
unmount, it calls `setPanelRect(id, null)`.

`PluginMenu` and `CanvasMenu` adopt this: swap their local `ref` for the hook's
ref, passing their own `open` state. This is a small, mechanical change to both
files — no behavior change to the dropdowns themselves.

### New hook: `useCollisionDodge(toolbarRef)`

Lives alongside the toolbar (`core/canvas/use-collision-dodge.ts`). Used only by
`CanvasToolbar`.

- Keeps a `restRect` ref: the toolbar's natural (expanded, top-center) bounding
  rect. Captured via its own `ResizeObserver`, but **only updates while not
  currently collapsed** — so it always reflects the true expanded position even
  mid-dodge, instead of drifting once the toolbar has already moved.
- Subscribes to `floating-panels-store`. On every store change and on window
  resize, intersects `restRect` against each rect currently in the store using
  a pure helper `rectsIntersect(a: DOMRect, b: DOMRect): boolean` (in
  `core/canvas/geometry.ts`, alongside existing geometry helpers).
- Returns `collapsed: boolean` — true if any open panel rect intersects the
  toolbar's rest rect.

### Data flow

1. User clicks "Canvas" → `CanvasMenu` opens → `useFloatingPanelRect` measures
   its panel and pushes the rect into the store under `"canvas-menu"`.
2. `CanvasToolbar`'s `useCollisionDodge` reacts to the store change, detects
   intersection with its `restRect`, flips `collapsed` to `true`.
3. Toolbar re-renders in its collapsed layout (see below) and CSS-transitions
   into place.
4. User closes the dropdown → hook removes `"canvas-menu"` from the store → no
   intersecting rects remain → `collapsed` flips `false` → toolbar transitions
   back to its centered pill.

## Collapsed toolbar behavior

`CanvasToolbar` renders the same buttons/handlers in both states — only the
shell width changes. The toolbar stays anchored **top-center** (`left-1/2 top-3
-translate-x-1/2`) in both states; it does **not** relocate.

- **Expanded (current):** horizontal pill showing every tool button.
- **Collapsed:** the pill shrinks in place to a single icon. Every button
  *except the currently active tool* transitions to `max-w-0 opacity-0` inside
  an `overflow-hidden` container, so the pill smoothly narrows to one button.
  Shrinking the toolbar's rect down to a single centered icon clears both the
  left-anchored `PluginMenu` and the right-anchored `CanvasMenu`, giving the
  open dropdown its space.
- A small chevron affordance stays visible while collapsed. Clicking it sets a
  local `userExpanded` override that forces the full row back even while a
  dropdown is open, so tools remain reachable if the user wants one. Opening a
  fresh dropdown (or closing the current one) resets `userExpanded`.
- Animation is pure CSS (`transition-all`), driven by each hidden button
  transitioning its `max-width`/`opacity` — no DOM swap, no layout thrash, so it
  reads as one pill smoothly shrinking and re-growing.
- The toolbar's own "Shapes" flyout still opens *below* itself in both states
  (the toolbar never leaves the top edge), so no repositioning is needed.
- Complements the `isolate` stacking fix already applied to the canvas
  `<section>` in `workspace-shell.tsx`, which keeps the header dropdown painted
  above the toolbar throughout the shrink/grow transition.

## Edge cases

- Multiple header panels open at once: store just holds multiple ids; toolbar
  collapses if *any* rect intersects.
- Window resize while a panel is open: resize listeners on both hooks keep
  rects fresh, so `collapsed` recomputes correctly.
- User forces the row back open (`userExpanded`) while a dropdown is still open:
  the toolbar re-expands to full width and may visually overlap the dropdown
  again — this is an explicit user action, and `isolate` keeps the dropdown on
  top. `userExpanded` resets when the dropdown set changes or closes.
- Active tool while collapsed: the single visible icon is the active tool, so
  the current mode stays legible even in the compact state.
- Narrow/mobile viewports: out of scope for this pass — shrinking to a single
  centered icon only helps on narrow screens, but no further mobile-specific
  layout work is planned here.

## Testing

- **Unit tests (Vitest):**
  - `rectsIntersect` — pure function, straightforward true/false cases
    (overlapping, adjacent, disjoint, contained).
  - `floating-panels-store` — register sets the rect under an id; setting
    `null` removes it; multiple ids coexist independently.
- **Not unit-testable (jsdom has no real layout):** the actual dodge animation
  and on-screen placement. Verified manually in a browser after implementation
  — open Plugins/Canvas dropdowns and confirm the toolbar relocates and the
  shapes flyout still lands fully on-screen.
