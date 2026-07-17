# Canvas Toolbar Collision Dodge — Design

**Date:** 2026-07-17
**Status:** Approved (brainstorm) → pending spec review
**Author:** Abhijeet + Claude

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
shell layout changes:

- **Expanded (current):** horizontal pill, centered, `top-3`.
- **Collapsed:** vertical rail docked to the canvas viewport's right edge
  (`right-3`, vertically centered). This is the only edge free of other
  overlays: `StylePanel` occupies top-left, `InspectorPanel` is a separate flex
  column further right (outside the canvas section), and header dropdowns live
  top-center.
- Same icon set, stacked in a column instead of a row; transition via
  `transform`/`opacity` so it reads as one toolbar shrinking and relocating.
- The toolbar's own "Shapes" flyout (`shapeMenuOpen` in canvas-toolbar.tsx)
  currently opens *below* itself. While `collapsed`, it opens *leftward*
  instead, so it doesn't run off the canvas edge.

## Edge cases

- Multiple header panels open at once: store just holds multiple ids; toolbar
  collapses if *any* rect intersects.
- Window resize while a panel is open: resize listeners on both hooks keep
  rects fresh, so `collapsed` recomputes correctly.
- Toolbar's shapes sub-menu while collapsed: repositioned per above so it stays
  on-screen.
- Narrow/mobile viewports: out of scope for this pass — the collapsed rail
  (~44px wide) should fit, but no further mobile-specific layout work is
  planned here.

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
