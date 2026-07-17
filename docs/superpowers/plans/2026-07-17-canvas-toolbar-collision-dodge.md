# Canvas Toolbar Collision Dodge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the floating `CanvasToolbar` detect when a header dropdown (`PluginMenu`, `CanvasMenu`, or any future one) overlaps it, and collapse into a compact right-edge rail until the dropdown closes, instead of the two silently overlapping.

**Architecture:** A small Zustand store (`core/state/floating-panels-store.ts`) holds the live screen rect of every currently-open header dropdown. Dropdowns register their rect via a shared hook (`useFloatingPanelRect`); the toolbar consumes the store via a second hook (`useCollisionDodge`) that intersects its own rest-state rect against every registered rect using a pure `rectsIntersect` helper, and flips a `collapsed` boolean the toolbar renders against.

**Tech Stack:** React 19 / Next.js 16, Zustand 5, Tailwind v4, Vitest 4 (test environment: `node`, no DOM).

## Global Constraints

- Design spec: `docs/superpowers/specs/2026-07-17-canvas-toolbar-collision-dodge-design.md` — this plan implements it exactly; deviations are called out inline where they occur.
- The rect type is the existing `Rect = { x, y, width, height }` from `core/canvas/geometry.ts` — **not** raw `DOMRect`. Convert at the DOM boundary inside the hooks. This matches the codebase's existing geometry convention and keeps the store trivially unit-testable.
- `core/` files are framework-agnostic (no `"use client"`, no React). React hooks go in `components/canvas/use-*.ts`, matching the existing `components/marketplace/use-installed-plugins.ts` convention. The Zustand store itself goes in `core/state/`, matching `core/state/workspace-store.ts` (no `"use client"` needed there either — only consumers need it).
- Vitest's `test.environment` is `"node"` (see `vitest.config.ts`) — there is no DOM in tests. Only pure logic (`rectsIntersect`, the store) gets unit tests. The two DOM-dependent hooks (`useFloatingPanelRect`, `useCollisionDodge`) are not unit-tested; verify them manually in a browser in the final task.
- Run tests with `pnpm exec vitest run <path>` for a single file, `pnpm test` for the full suite. Typecheck with `pnpm exec tsc --noEmit`.

---

### Task 1: `rectsIntersect` pure helper

**Files:**
- Modify: `core/canvas/geometry.ts`
- Test: `tests/core/canvas/geometry.test.ts`

**Interfaces:**
- Produces: `rectsIntersect(a: Rect, b: Rect): boolean` — exported from `core/canvas/geometry.ts`, using the existing `Rect` type already defined there (`{ x: number; y: number; width: number; height: number }`).

- [ ] **Step 1: Write the failing tests**

In `tests/core/canvas/geometry.test.ts`, change the existing import on line 2 from:

```ts
import { normalizeRect, rectFromDrag } from "@/core/canvas/geometry";
```

to:

```ts
import { normalizeRect, rectFromDrag, rectsIntersect } from "@/core/canvas/geometry";
```

Then append this new `describe` block at the end of the file:

```ts
describe("rectsIntersect", () => {
  it("detects a partial overlap", () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 },
    )).toBe(true);
  });

  it("returns false for disjoint rects", () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: 20, width: 10, height: 10 },
    )).toBe(false);
  });

  it("returns false for rects that only touch at an edge", () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 10, y: 0, width: 10, height: 10 },
    )).toBe(false);
  });

  it("detects one rect fully contained in another", () => {
    expect(rectsIntersect(
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 40, y: 40, width: 10, height: 10 },
    )).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run tests/core/canvas/geometry.test.ts`
Expected: FAIL — `rectsIntersect` is not exported from `core/canvas/geometry.ts`.

- [ ] **Step 3: Implement `rectsIntersect`**

Append to `core/canvas/geometry.ts`:

```ts
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run tests/core/canvas/geometry.test.ts`
Expected: PASS, all tests in the file green (including the pre-existing `normalizeRect`/`rectFromDrag` tests).

- [ ] **Step 5: Commit**

```bash
git add core/canvas/geometry.ts tests/core/canvas/geometry.test.ts
git commit -m "feat(canvas): add rectsIntersect geometry helper"
```

---

### Task 2: Floating panels store

**Files:**
- Create: `core/state/floating-panels-store.ts`
- Test: `tests/core/state/floating-panels-store.test.ts`

**Interfaces:**
- Consumes: `Rect` type from `core/canvas/geometry.ts` (Task 1).
- Produces: `useFloatingPanelsStore` — a Zustand hook exposing `{ panelRects: Record<string, Rect>; setPanelRect: (id: string, rect: Rect | null) => void }`. `setPanelRect(id, null)` removes the entry for `id`; `setPanelRect(id, rect)` sets/overwrites it.

- [ ] **Step 1: Write the failing tests**

Create `tests/core/state/floating-panels-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useFloatingPanelsStore } from "@/core/state/floating-panels-store";

beforeEach(() => {
  useFloatingPanelsStore.setState({ panelRects: {} });
});

describe("floating-panels-store", () => {
  it("registers a rect under an id", () => {
    useFloatingPanelsStore.getState().setPanelRect("canvas-menu", { x: 0, y: 0, width: 10, height: 10 });
    expect(useFloatingPanelsStore.getState().panelRects).toEqual({
      "canvas-menu": { x: 0, y: 0, width: 10, height: 10 },
    });
  });

  it("removes the id when set to null", () => {
    useFloatingPanelsStore.getState().setPanelRect("canvas-menu", { x: 0, y: 0, width: 10, height: 10 });
    useFloatingPanelsStore.getState().setPanelRect("canvas-menu", null);
    expect(useFloatingPanelsStore.getState().panelRects).toEqual({});
  });

  it("keeps multiple ids independent", () => {
    useFloatingPanelsStore.getState().setPanelRect("plugin-menu", { x: 0, y: 0, width: 10, height: 10 });
    useFloatingPanelsStore.getState().setPanelRect("canvas-menu", { x: 20, y: 20, width: 10, height: 10 });
    useFloatingPanelsStore.getState().setPanelRect("plugin-menu", null);
    expect(useFloatingPanelsStore.getState().panelRects).toEqual({
      "canvas-menu": { x: 20, y: 20, width: 10, height: 10 },
    });
  });

  it("setPanelRect(id, null) on an id that was never set is a no-op", () => {
    useFloatingPanelsStore.getState().setPanelRect("nothing-here", null);
    expect(useFloatingPanelsStore.getState().panelRects).toEqual({});
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run tests/core/state/floating-panels-store.test.ts`
Expected: FAIL — cannot find module `@/core/state/floating-panels-store`.

- [ ] **Step 3: Implement the store**

Create `core/state/floating-panels-store.ts`:

```ts
import { create } from "zustand";
import type { Rect } from "@/core/canvas/geometry";

type FloatingPanelsState = {
  panelRects: Record<string, Rect>;
  setPanelRect: (id: string, rect: Rect | null) => void;
};

export const useFloatingPanelsStore = create<FloatingPanelsState>((set) => ({
  panelRects: {},
  setPanelRect: (id, rect) =>
    set((state) => {
      if (rect === null) {
        if (!(id in state.panelRects)) return state;
        const next = { ...state.panelRects };
        delete next[id];
        return { panelRects: next };
      }
      return { panelRects: { ...state.panelRects, [id]: rect } };
    }),
}));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run tests/core/state/floating-panels-store.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add core/state/floating-panels-store.ts tests/core/state/floating-panels-store.test.ts
git commit -m "feat(canvas): add floating-panels-store for open dropdown rects"
```

---

### Task 3: `useFloatingPanelRect` hook

**Files:**
- Create: `components/canvas/use-floating-panel-rect.ts`

**Interfaces:**
- Consumes: `useFloatingPanelsStore` (Task 2).
- Produces: `useFloatingPanelRect(id: string, isOpen: boolean): React.RefObject<HTMLDivElement | null>` — attach the returned ref to a dropdown panel's container `<div>`. While `isOpen`, keeps that panel's live rect pushed into the store under `id`; on close or unmount, removes it.

No unit test for this task — it's pure DOM wiring (`ResizeObserver`, `window`) and the test environment has no DOM (see Global Constraints). It's verified manually in Task 7.

- [ ] **Step 1: Implement the hook**

Create `components/canvas/use-floating-panel-rect.ts`:

```ts
"use client";

import { useEffect, useRef } from "react";
import { useFloatingPanelsStore } from "@/core/state/floating-panels-store";

export function useFloatingPanelRect(id: string, isOpen: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const setPanelRect = useFloatingPanelsStore((s) => s.setPanelRect);

  useEffect(() => {
    if (!isOpen) {
      setPanelRect(id, null);
      return;
    }
    const el = ref.current;
    if (!el) return;

    function measure() {
      const r = el!.getBoundingClientRect();
      setPanelRect(id, { x: r.x, y: r.y, width: r.width, height: r.height });
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      setPanelRect(id, null);
    };
  }, [id, isOpen, setPanelRect]);

  return ref;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors introduced by this file.

- [ ] **Step 3: Commit**

```bash
git add components/canvas/use-floating-panel-rect.ts
git commit -m "feat(canvas): add useFloatingPanelRect hook for dropdown panels"
```

---

### Task 4: Wire `PluginMenu` and `CanvasMenu` to the hook

**Files:**
- Modify: `components/canvas/plugin-menu.tsx`
- Modify: `components/canvas/canvas-menu.tsx`

**Interfaces:**
- Consumes: `useFloatingPanelRect` (Task 3).

- [ ] **Step 1: Wire `PluginMenu`**

In `components/canvas/plugin-menu.tsx`, add the import (after the existing `useInstalledPlugins` import at line 7):

```ts
import { useFloatingPanelRect } from "./use-floating-panel-rect";
```

Inside `export function PluginMenu()`, after the existing `const ref = useRef<HTMLDivElement>(null);` (line 23), add:

```ts
const panelRef = useFloatingPanelRect("plugin-menu", open);
```

Change the dropdown panel's opening tag (line 56-58) from:

```tsx
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-surface p-1 shadow-xl"
        >
```

to:

```tsx
        <div
          ref={panelRef}
          role="menu"
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-surface p-1 shadow-xl"
        >
```

- [ ] **Step 2: Wire `CanvasMenu`**

In `components/canvas/canvas-menu.tsx`, add the import (after the existing `exportBoard` import at line 6):

```ts
import { useFloatingPanelRect } from "./use-floating-panel-rect";
```

Inside `export function CanvasMenu()`, after the existing `const ref = useRef<HTMLDivElement>(null);` (line 24), add:

```ts
const panelRef = useFloatingPanelRect("canvas-menu", open);
```

Change the dropdown panel's opening tag (line 59-62) from:

```tsx
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-surface p-3 shadow-xl"
        >
```

to:

```tsx
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-surface p-3 shadow-xl"
        >
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add components/canvas/plugin-menu.tsx components/canvas/canvas-menu.tsx
git commit -m "feat(canvas): register Plugins/Canvas dropdown rects for collision dodge"
```

---

### Task 5: `useCollisionDodge` hook

**Files:**
- Create: `components/canvas/use-collision-dodge.ts`

**Interfaces:**
- Consumes: `useFloatingPanelsStore` (Task 2), `rectsIntersect` and `Rect` from `core/canvas/geometry.ts` (Task 1).
- Produces: `useCollisionDodge(toolbarRef: React.RefObject<HTMLElement | null>): boolean` — returns `collapsed`, `true` whenever the toolbar's rest-state rect currently intersects any registered dropdown rect.

No unit test for this task, same rationale as Task 3 — verified manually in Task 7. Its only non-trivial logic (`rectsIntersect`) is already covered by Task 1's tests.

- [ ] **Step 1: Implement the hook**

Create `components/canvas/use-collision-dodge.ts`:

```ts
"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useFloatingPanelsStore } from "@/core/state/floating-panels-store";
import { rectsIntersect, type Rect } from "@/core/canvas/geometry";

export function useCollisionDodge(toolbarRef: RefObject<HTMLElement | null>): boolean {
  const [collapsed, setCollapsed] = useState(false);
  const restRectRef = useRef<Rect | null>(null);
  const panelRects = useFloatingPanelsStore((s) => s.panelRects);

  // Track the toolbar's natural (expanded) rect, but only while it isn't
  // currently collapsed — so restRectRef always reflects the true expanded
  // position instead of drifting once the toolbar has already moved.
  useEffect(() => {
    if (collapsed) return;
    const el = toolbarRef.current;
    if (!el) return;

    function measure() {
      const r = el!.getBoundingClientRect();
      restRectRef.current = { x: r.x, y: r.y, width: r.width, height: r.height };
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [collapsed, toolbarRef]);

  useEffect(() => {
    const rest = restRectRef.current;
    if (!rest) return;
    const hit = Object.values(panelRects).some((r) => rectsIntersect(rest, r));
    setCollapsed(hit);
  }, [panelRects]);

  return collapsed;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/canvas/use-collision-dodge.ts
git commit -m "feat(canvas): add useCollisionDodge hook for toolbar dodge state"
```

---

### Task 6: Collapse `CanvasToolbar` into a right-edge rail on collision

**Files:**
- Modify: `components/canvas/canvas-toolbar.tsx`

**Interfaces:**
- Consumes: `useCollisionDodge` (Task 5).

- [ ] **Step 1: Add the collision-dodge hook and wrapper ref**

In `components/canvas/canvas-toolbar.tsx`, add the import (after the existing `cn` import at line 16):

```ts
import { useCollisionDodge } from "./use-collision-dodge";
```

Inside `export function CanvasToolbar()`, after the existing `const shapeMenuRef = useRef<HTMLDivElement>(null);` (line 42), add:

```ts
const wrapperRef = useRef<HTMLDivElement>(null);
const collapsed = useCollisionDodge(wrapperRef);
```

- [ ] **Step 2: Replace the returned JSX**

Replace the entire `return (...)` block (lines 135-208) with:

```tsx
  return (
    <div
      ref={wrapperRef}
      className={cn(
        "absolute z-30 transition-all duration-200",
        collapsed ? "right-3 top-1/2 -translate-y-1/2" : "left-1/2 top-3 -translate-x-1/2",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-2xl border border-border bg-card/95 p-1.5 shadow-sm backdrop-blur",
          collapsed && "flex-col",
        )}
      >
        {PHASE1_TOOLS.map((t) => {
          const Icon = ICONS[t.tool];
          const active = t.behavior === "mode" && activeTool === t.tool;
          return (
            <span key={t.tool} className="contents">
              <button
                type="button"
                title={t.shortcut ? `${t.label} (${t.shortcut.toUpperCase()})` : t.label}
                onClick={() => activate(t.tool, t.behavior)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg transition-colors active:scale-95",
                  active ? "bg-brand-accent/12 text-brand-accent" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
              </button>
              {t.tool === "pen" && (
                <div className="relative" ref={shapeMenuRef}>
                  <button
                    type="button"
                    title="Shapes"
                    onClick={() => setShapeMenuOpen((o) => !o)}
                    className={cn(
                      "flex items-center justify-center gap-0.5 rounded-lg text-muted-foreground transition-colors hover:bg-muted",
                      collapsed ? "size-9" : "h-9 px-2",
                    )}
                  >
                    <Shapes className="size-4" />
                    {!collapsed && <ChevronDown className="size-3" />}
                  </button>
                  {shapeMenuOpen && (
                    <div
                      className={cn(
                        "absolute z-40 w-56 rounded-xl border border-border bg-card p-2 shadow-lg",
                        collapsed ? "right-11 top-0" : "left-0 top-11",
                      )}
                    >
                      {(["basic", "flowchart", "decorative"] as const).map((cat) => (
                        <div key={cat} className="mb-1.5 last:mb-0">
                          <p className="px-1.5 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{cat}</p>
                          <div className="grid grid-cols-2 gap-0.5">
                            {SHAPES.filter((s) => s.category === cat).map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => insertShape(s.id)}
                                className="rounded-md px-2 py-1.5 text-left text-xs text-foreground transition-colors hover:bg-muted"
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </span>
          );
        })}
        <div className={cn("bg-border", collapsed ? "my-1 h-px w-6" : "mx-1 h-6 w-px")} />
        <button
          type="button"
          title="Read sketch"
          onClick={readSketch}
          disabled={pending}
          className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <ScanLine className="size-4" />
        </button>
      </div>
      {msg && (
        <p className="mt-1 rounded-xl border border-border bg-card/90 px-2 py-1 text-center text-[11px] text-destructive shadow-sm">
          {msg}
        </p>
      )}
    </div>
  );
}
```

Note: when `collapsed`, the Shapes button drops its `ChevronDown` and becomes a plain square icon button (`size-9`), matching the other icons in the narrow rail — the caret only makes sense in the wider horizontal layout.

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Run the full test suite**

Run: `pnpm test`
Expected: PASS — this task only changes JSX/layout in a component with no existing unit tests, so this is a regression check on everything else.

- [ ] **Step 5: Commit**

```bash
git add components/canvas/canvas-toolbar.tsx
git commit -m "feat(canvas): collapse toolbar into a right-edge rail on dropdown collision"
```

---

### Task 7: Manual verification in browser

No files change in this task — it's a verification pass confirming Tasks 1-6 work together end to end. Do not mark the plan complete until this passes.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Open a project canvas and verify baseline**

Navigate to a project's canvas view. Confirm the toolbar renders centered top-3, as before, with no dropdown open.

- [ ] **Step 3: Verify the Canvas dropdown triggers the dodge**

Click the "Canvas" button in the header to open its Grid/Export dropdown. Confirm:
- The toolbar animates from its centered pill into a vertical rail docked to the right edge of the canvas.
- The "Export board" dropdown is fully visible and unobstructed.
- Closing the dropdown (click outside or click "Canvas" again) animates the toolbar back to its centered position.

- [ ] **Step 4: Verify the Plugins dropdown triggers the dodge**

Click "Plugins" in the header. Confirm the same collapse/expand behavior as Step 3.

- [ ] **Step 5: Verify the Shapes flyout stays on-screen while collapsed**

With a header dropdown open (toolbar collapsed), click the "Shapes" icon in the rail. Confirm its flyout panel opens to the left of the rail and is fully visible, not clipped by the canvas edge.

- [ ] **Step 6: Verify no dodge when nothing overlaps**

Resize the browser window wider (or check on a wide viewport) and reopen a header dropdown if its rect doesn't reach the toolbar's position — confirm the toolbar does *not* collapse when there's no actual intersection.

- [ ] **Step 7: Verify existing toolbar functionality still works**

With the toolbar in both expanded and collapsed states, confirm: tool selection (Select/Hand/Pen), inserting Text/Note/AI-node, inserting a shape, and "Read sketch" all still work as before.
