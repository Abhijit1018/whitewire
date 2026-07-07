# WhiteWire Canvas Overhaul — Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the tool + style state, the top-center Excalidraw-style toolbar, and the contextual style panel, without regressing any current canvas behavior.

**Architecture:** Extend the single React Flow (`@xyflow/react`) engine. Introduce an `activeTool` enum and a `toolDefaults` style object in the existing Zustand `workspace-store`, keeping `penMode` as a synced back-compat field. Replace the left `CanvasToolsRail` with a top-center `canvas-toolbar.tsx` and add a contextual left `style-panel.tsx`. All pure logic (geometry, tool metadata, style defaults) lives in new `core/canvas/*` modules and is unit-tested first; React components consume those helpers and are not render-tested (the repo has no React Testing Library).

**Tech Stack:** Next.js 16, React 19, `@xyflow/react` 12, Zustand 5, Tailwind 4, lucide-react, Vitest 4.

## Global Constraints

- Persistence snapshot stays `{ nodes, edges }` through `saveCanvasAction`; **no schema migration** in this phase.
- New style properties live inside `node.data`; old boards must load unchanged (absent `style` falls back to `DEFAULT_STYLE`).
- Import alias is `@/` (e.g. `@/core/canvas/geometry`).
- Tests are Vitest, colocated under `tests/`, pure-logic or repo-level only. Do **not** add React Testing Library or render-test components.
- Do not break existing consumers of `penMode` (`whiteboard-inner.tsx`, `pen-layer.tsx`).
- Commit after every task with the shown message.

---

### Task 1: Style defaults + geometry helpers (pure)

**Files:**
- Create: `core/canvas/style.ts`
- Create: `core/canvas/geometry.ts`
- Test: `tests/core/canvas/geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ShapeStyle = { stroke: string; fill: string; strokeWidth: number; strokeStyle: "solid" | "dashed" | "dotted"; sloppiness: 0 | 1 | 2; edges: "sharp" | "round"; opacity: number; fontSize?: number }`
  - `const DEFAULT_STYLE: ShapeStyle`
  - `type Pt = { x: number; y: number }`
  - `type Rect = { x: number; y: number; width: number; height: number }`
  - `function normalizeRect(a: Pt, b: Pt): Rect`
  - `function rectFromDrag(anchor: Pt, current: Pt, square?: boolean): Rect`

- [ ] **Step 1: Write the failing test**

Create `tests/core/canvas/geometry.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeRect, rectFromDrag } from "@/core/canvas/geometry";

describe("normalizeRect", () => {
  it("orders a top-left → bottom-right drag", () => {
    expect(normalizeRect({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual({
      x: 10, y: 20, width: 30, height: 40,
    });
  });

  it("normalizes an inverted (bottom-right → top-left) drag", () => {
    expect(normalizeRect({ x: 40, y: 60 }, { x: 10, y: 20 })).toEqual({
      x: 10, y: 20, width: 30, height: 40,
    });
  });
});

describe("rectFromDrag", () => {
  it("returns the normalized rectangle by default", () => {
    expect(rectFromDrag({ x: 0, y: 0 }, { x: 50, y: 30 })).toEqual({
      x: 0, y: 0, width: 50, height: 30,
    });
  });

  it("constrains to a square using the larger magnitude, keeping direction", () => {
    expect(rectFromDrag({ x: 0, y: 0 }, { x: 50, y: 30 }, true)).toEqual({
      x: 0, y: 0, width: 50, height: 50,
    });
  });

  it("constrains a square for an up-left drag, keeping the anchor corner", () => {
    expect(rectFromDrag({ x: 100, y: 100 }, { x: 60, y: 90 }, true)).toEqual({
      x: 60, y: 60, width: 40, height: 40,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/canvas/geometry.test.ts`
Expected: FAIL — cannot resolve `@/core/canvas/geometry`.

- [ ] **Step 3: Write minimal implementation**

Create `core/canvas/style.ts`:

```ts
export type ShapeStyle = {
  stroke: string;
  fill: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  sloppiness: 0 | 1 | 2;
  edges: "sharp" | "round";
  opacity: number;
  fontSize?: number;
};

export const DEFAULT_STYLE: ShapeStyle = {
  stroke: "#1e1e1e",
  fill: "transparent",
  strokeWidth: 2,
  strokeStyle: "solid",
  sloppiness: 1,
  edges: "round",
  opacity: 1,
};
```

Create `core/canvas/geometry.ts`:

```ts
export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

export function normalizeRect(a: Pt, b: Pt): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

export function rectFromDrag(anchor: Pt, current: Pt, square = false): Rect {
  if (!square) return normalizeRect(anchor, current);
  const dx = current.x - anchor.x;
  const dy = current.y - anchor.y;
  const size = Math.max(Math.abs(dx), Math.abs(dy));
  const corner = {
    x: anchor.x + Math.sign(dx || 1) * size,
    y: anchor.y + Math.sign(dy || 1) * size,
  };
  return normalizeRect(anchor, corner);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/canvas/geometry.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add core/canvas/style.ts core/canvas/geometry.ts tests/core/canvas/geometry.test.ts
git commit -m "feat(canvas): style defaults + drag geometry helpers"
```

---

### Task 2: Tool metadata + keyboard-shortcut resolver (pure)

**Files:**
- Create: `core/canvas/tools.ts`
- Test: `tests/core/canvas/tools.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type CanvasTool = "select" | "hand" | "rectangle" | "ellipse" | "diamond" | "arrow" | "line" | "pen" | "text" | "note" | "image" | "code" | "eraser" | "aiNode" | "frame"`
  - `type ToolMeta = { tool: CanvasTool; label: string; shortcut: string | null; behavior: "mode" | "insert" }`
  - `const PHASE1_TOOLS: ToolMeta[]` — only tools with working behavior this phase.
  - `function toolForShortcut(key: string): CanvasTool | null`

- [ ] **Step 1: Write the failing test**

Create `tests/core/canvas/tools.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PHASE1_TOOLS, toolForShortcut } from "@/core/canvas/tools";

describe("PHASE1_TOOLS", () => {
  it("includes only tools wired this phase (no arrow/line/image/code/eraser/frame yet)", () => {
    const tools = PHASE1_TOOLS.map((t) => t.tool);
    expect(tools).toEqual([
      "select", "hand", "pen", "rectangle", "ellipse", "diamond", "text", "note", "aiNode",
    ]);
  });

  it("marks select/hand/pen as modes and the rest as inserts", () => {
    const byTool = Object.fromEntries(PHASE1_TOOLS.map((t) => [t.tool, t.behavior]));
    expect(byTool.select).toBe("mode");
    expect(byTool.hand).toBe("mode");
    expect(byTool.pen).toBe("mode");
    expect(byTool.rectangle).toBe("insert");
    expect(byTool.aiNode).toBe("insert");
  });
});

describe("toolForShortcut", () => {
  it("maps single letters to tools (case-insensitive)", () => {
    expect(toolForShortcut("v")).toBe("select");
    expect(toolForShortcut("R")).toBe("rectangle");
    expect(toolForShortcut("p")).toBe("pen");
    expect(toolForShortcut("i")).toBe("aiNode");
  });

  it("returns null for unmapped keys", () => {
    expect(toolForShortcut("z")).toBeNull();
    expect(toolForShortcut("Enter")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/canvas/tools.test.ts`
Expected: FAIL — cannot resolve `@/core/canvas/tools`.

- [ ] **Step 3: Write minimal implementation**

Create `core/canvas/tools.ts`:

```ts
export type CanvasTool =
  | "select" | "hand" | "rectangle" | "ellipse" | "diamond"
  | "arrow" | "line" | "pen" | "text" | "note" | "image" | "code"
  | "eraser" | "aiNode" | "frame";

export type ToolMeta = {
  tool: CanvasTool;
  label: string;
  shortcut: string | null;
  behavior: "mode" | "insert";
};

export const PHASE1_TOOLS: ToolMeta[] = [
  { tool: "select", label: "Select", shortcut: "v", behavior: "mode" },
  { tool: "hand", label: "Hand", shortcut: "h", behavior: "mode" },
  { tool: "pen", label: "Draw", shortcut: "p", behavior: "mode" },
  { tool: "rectangle", label: "Rectangle", shortcut: "r", behavior: "insert" },
  { tool: "ellipse", label: "Ellipse", shortcut: "o", behavior: "insert" },
  { tool: "diamond", label: "Diamond", shortcut: "d", behavior: "insert" },
  { tool: "text", label: "Text", shortcut: "t", behavior: "insert" },
  { tool: "note", label: "Note", shortcut: "n", behavior: "insert" },
  { tool: "aiNode", label: "AI node", shortcut: "i", behavior: "insert" },
];

const SHORTCUTS: Record<string, CanvasTool> = Object.fromEntries(
  PHASE1_TOOLS.filter((t) => t.shortcut).map((t) => [t.shortcut, t.tool]),
) as Record<string, CanvasTool>;

export function toolForShortcut(key: string): CanvasTool | null {
  if (key.length !== 1) return null;
  return SHORTCUTS[key.toLowerCase()] ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/canvas/tools.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add core/canvas/tools.ts tests/core/canvas/tools.test.ts
git commit -m "feat(canvas): tool metadata + keyboard shortcut resolver"
```

---

### Task 3: Extend workspace-store with tool + style state

**Files:**
- Modify: `core/state/workspace-store.ts`
- Test: `tests/workspace-store.test.ts` (create)

**Interfaces:**
- Consumes: `CanvasTool` from `@/core/canvas/tools`; `ShapeStyle`, `DEFAULT_STYLE` from `@/core/canvas/style`.
- Produces (added to the store):
  - state: `activeTool: CanvasTool`, `toolDefaults: ShapeStyle`
  - `setActiveTool(t: CanvasTool): void` — also keeps `penMode` synced (`penMode = t === "pen"`)
  - `setToolDefaults(patch: Partial<ShapeStyle>): void`
  - `applyStyleToSelection(patch: Partial<ShapeStyle>): void` — merges into `data.style` (seeded from `toolDefaults`) for every node with `selected === true`, and updates `toolDefaults`.
  - `export function makeStore()` — exported for isolated tests.
  - `AiNodeData` gains `style?: ShapeStyle`.

- [ ] **Step 1: Write the failing test**

Create `tests/workspace-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { makeStore } from "@/core/state/workspace-store";
import { DEFAULT_STYLE } from "@/core/canvas/style";

let store: ReturnType<typeof makeStore>;

beforeEach(() => {
  store = makeStore();
});

describe("activeTool", () => {
  it("defaults to select with penMode false", () => {
    expect(store.getState().activeTool).toBe("select");
    expect(store.getState().penMode).toBe(false);
  });

  it("setActiveTool('pen') syncs penMode true; leaving pen resets it", () => {
    store.getState().setActiveTool("pen");
    expect(store.getState().penMode).toBe(true);
    store.getState().setActiveTool("select");
    expect(store.getState().penMode).toBe(false);
  });

  it("setPenMode delegates to setActiveTool", () => {
    store.getState().setPenMode(true);
    expect(store.getState().activeTool).toBe("pen");
  });
});

describe("toolDefaults", () => {
  it("starts at DEFAULT_STYLE", () => {
    expect(store.getState().toolDefaults).toEqual(DEFAULT_STYLE);
  });

  it("setToolDefaults merges a patch", () => {
    store.getState().setToolDefaults({ stroke: "#ff0000" });
    expect(store.getState().toolDefaults.stroke).toBe("#ff0000");
    expect(store.getState().toolDefaults.strokeWidth).toBe(DEFAULT_STYLE.strokeWidth);
  });
});

describe("applyStyleToSelection", () => {
  it("writes style into selected nodes only and updates toolDefaults", () => {
    store.getState().setGraph(
      [
        { id: "a", type: "shapeNode", position: { x: 0, y: 0 }, selected: true,
          data: { text: "", kind: "", purpose: "", model: "" } },
        { id: "b", type: "shapeNode", position: { x: 0, y: 0 }, selected: false,
          data: { text: "", kind: "", purpose: "", model: "" } },
      ] as never,
      [],
    );
    store.getState().applyStyleToSelection({ fill: "#00ff00" });
    const [a, b] = store.getState().nodes;
    expect(a.data.style?.fill).toBe("#00ff00");
    expect(a.data.style?.stroke).toBe(DEFAULT_STYLE.stroke); // seeded from defaults
    expect(b.data.style).toBeUndefined();
    expect(store.getState().toolDefaults.fill).toBe("#00ff00");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/workspace-store.test.ts`
Expected: FAIL — `makeStore` is not exported / `activeTool` undefined.

- [ ] **Step 3: Write minimal implementation**

In `core/state/workspace-store.ts`:

3a. Add imports at the top (after the existing `@xyflow/react` import):

```ts
import type { CanvasTool } from "@/core/canvas/tools";
import { type ShapeStyle, DEFAULT_STYLE } from "@/core/canvas/style";
```

3b. Add `style` to `AiNodeData` (inside the existing type):

```ts
  wireframe?: WireframeSpec;
  style?: ShapeStyle;
```

3c. Add to the `WorkspaceState` type (alongside `penMode`):

```ts
  activeTool: CanvasTool;
  toolDefaults: ShapeStyle;
  setActiveTool: (t: CanvasTool) => void;
  setToolDefaults: (patch: Partial<ShapeStyle>) => void;
  applyStyleToSelection: (patch: Partial<ShapeStyle>) => void;
```

3d. Change the `makeStore` declaration from `function makeStore()` to `export function makeStore()`, and add the initial values + actions inside the returned object (place initial values next to `penMode: false,` and actions next to `setPenMode`):

```ts
    // initial state (next to penMode: false)
    activeTool: "select",
    toolDefaults: { ...DEFAULT_STYLE },

    // actions
    setActiveTool: (t) => set({ activeTool: t, penMode: t === "pen" }),
    setPenMode: (on) => get().setActiveTool(on ? "pen" : "select"),
    setToolDefaults: (patch) =>
      set({ toolDefaults: { ...get().toolDefaults, ...patch } }),
    applyStyleToSelection: (patch) =>
      set((state) => ({
        toolDefaults: { ...state.toolDefaults, ...patch },
        nodes: state.nodes.map((n) =>
          n.selected
            ? { ...n, data: { ...n.data, style: { ...state.toolDefaults, ...(n.data.style ?? {}), ...patch } } }
            : n,
        ),
      })),
```

Note: replace the existing `setPenMode: (on) => set({ penMode: on }),` line with the delegating version above (remove the old one).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/workspace-store.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `npm test`
Expected: all previously-green tests still pass, plus the new ones.

- [ ] **Step 6: Commit**

```bash
git add core/state/workspace-store.ts tests/workspace-store.test.ts
git commit -m "feat(canvas): activeTool + toolDefaults + applyStyleToSelection in store"
```

---

### Task 4: Top-center canvas toolbar (replaces the left rail)

**Files:**
- Create: `components/canvas/canvas-toolbar.tsx`
- Modify: `components/canvas/whiteboard-inner.tsx` (swap `CanvasToolsRail` → `CanvasToolbar`)
- Delete: `components/canvas/canvas-tools-rail.tsx` (after porting behavior)

**Interfaces:**
- Consumes: `PHASE1_TOOLS`, `toolForShortcut`, `CanvasTool` from `@/core/canvas/tools`; store `activeTool`, `setActiveTool`, `addNode`, `addNodesEdges`; `useReactFlow().screenToFlowPosition`; the existing `drawNodesToPng` / `interpretSketchAction` / `applyCleanup` used by "Read sketch".
- Produces: `export function CanvasToolbar({ projectId }: { projectId: string })`.

- [ ] **Step 1: Create the toolbar component**

Create `components/canvas/canvas-toolbar.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useReactFlow, type Edge } from "@xyflow/react";
import {
  MousePointer2, Hand, Pencil, Square, Circle, Diamond, Type, StickyNote,
  Sparkles, ScanLine, type LucideIcon,
} from "lucide-react";
import { PHASE1_TOOLS, toolForShortcut, type CanvasTool } from "@/core/canvas/tools";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";
import { drawNodesToPng } from "./strokes-to-image";
import { applyCleanup } from "./cleanup-adapter";
import { interpretSketchAction } from "@/app/p/[projectId]/sketch-actions";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const ICONS: Record<CanvasTool, LucideIcon> = {
  select: MousePointer2, hand: Hand, pen: Pencil, rectangle: Square, ellipse: Circle,
  diamond: Diamond, text: Type, note: StickyNote, aiNode: Sparkles,
  // not shown in Phase 1 but typed for completeness:
  arrow: MousePointer2, line: MousePointer2, image: MousePointer2, code: MousePointer2,
  eraser: MousePointer2, frame: MousePointer2,
};

const INSERT_DEFAULTS: Partial<Record<CanvasTool, { type: string; data: Record<string, unknown>; style?: React.CSSProperties }>> = {
  rectangle: { type: "shapeNode", data: { shape: "rectangle" }, style: { width: 150, height: 90 } },
  ellipse: { type: "shapeNode", data: { shape: "ellipse" }, style: { width: 120, height: 120 } },
  diamond: { type: "shapeNode", data: { shape: "diamond" }, style: { width: 120, height: 120 } },
  text: { type: "textNode", data: {} },
  note: { type: "noteNode", data: {} },
  aiNode: { type: "aiNode", data: { text: "New idea", kind: "idea" } },
};

export function CanvasToolbar({ projectId }: { projectId: string }) {
  const { screenToFlowPosition } = useReactFlow();
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const setActiveTool = useWorkspaceStore((s) => s.setActiveTool);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const addNodesEdges = useWorkspaceStore((s) => s.addNodesEdges);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function insert(tool: CanvasTool) {
    const def = INSERT_DEFAULTS[tool];
    if (!def) return;
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    addNode({
      id: crypto.randomUUID(),
      type: def.type,
      position,
      style: def.style,
      data: { text: "", kind: "generic", purpose: "", model: "", ...def.data },
    });
  }

  function activate(tool: CanvasTool, behavior: "mode" | "insert") {
    if (behavior === "insert") insert(tool);
    else setActiveTool(tool);
  }

  // Keyboard shortcuts (ignored while typing in inputs).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const tool = toolForShortcut(e.key);
      if (!tool) return;
      const meta = PHASE1_TOOLS.find((t) => t.tool === tool);
      if (!meta) return;
      e.preventDefault();
      activate(tool, meta.behavior);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function readSketch() {
    startTransition(async () => {
      setMsg(null);
      const png = await drawNodesToPng(useWorkspaceStore.getState().nodes);
      if (!png) { setMsg("Draw with the Pen first."); return; }
      const res = await interpretSketchAction(projectId, png);
      if (res.error) { setMsg(res.error); return; }
      const bp = res.nodes ?? [];
      if (bp.length === 0) return;
      const ids = bp.map(() => crypto.randomUUID());
      const newNodes: AiNode[] = bp.map((n, i) => ({
        id: ids[i], type: "aiNode",
        position: { x: 120 + (i % 4) * 280, y: 100 + Math.floor(i / 4) * 180 },
        data: { text: n.title, kind: n.kind, purpose: n.note, model: "" },
      }));
      const newEdges: Edge[] = (res.edges ?? []).map(([a, b]) => ({
        id: crypto.randomUUID(), source: ids[a], target: ids[b],
      }));
      addNodesEdges(newNodes, newEdges);
      applyCleanup();
    });
  }

  return (
    <div className="absolute left-1/2 top-3 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-card/95 p-1.5 shadow-sm backdrop-blur">
        {PHASE1_TOOLS.map((t) => {
          const Icon = ICONS[t.tool];
          const active = t.behavior === "mode" && activeTool === t.tool;
          return (
            <button
              key={t.tool}
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
          );
        })}
        <div className="mx-1 h-6 w-px bg-border" />
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

- [ ] **Step 2: Swap the rail for the toolbar in `whiteboard-inner.tsx`**

Replace the import line:

```ts
import { CanvasToolsRail } from "./canvas-tools-rail";
```

with:

```ts
import { CanvasToolbar } from "./canvas-toolbar";
```

And replace the usage near the bottom:

```tsx
        {canEdit && <CanvasToolsRail projectId={projectId} />}
```

with:

```tsx
        {canEdit && <CanvasToolbar projectId={projectId} />}
```

- [ ] **Step 3: Delete the old rail**

```bash
git rm components/canvas/canvas-tools-rail.tsx
```

- [ ] **Step 4: Typecheck + full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass. (No new unit test — behavior lives in the already-tested `tools.ts`.)

- [ ] **Step 5: Commit**

```bash
git add components/canvas/canvas-toolbar.tsx components/canvas/whiteboard-inner.tsx
git commit -m "feat(canvas): top-center toolbar with keyboard shortcuts, retire left rail"
```

---

### Task 5: Contextual style panel (left)

**Files:**
- Create: `components/canvas/style-panel.tsx`
- Modify: `components/canvas/whiteboard-inner.tsx` (render the panel)

**Interfaces:**
- Consumes: store `activeTool`, `toolDefaults`, `setToolDefaults`, `applyStyleToSelection`, `nodes`; `ShapeStyle` from `@/core/canvas/style`.
- Produces: `export function StylePanel()`.

Behavior: the panel is visible when a creation tool is active (`activeTool` is not `select`/`hand`) OR at least one node is selected. When a node is selected, edits call `applyStyleToSelection` (writes to the selection + updates `toolDefaults`); otherwise edits call `setToolDefaults`. The displayed values read from the first selected node's `style` (falling back to `toolDefaults`) when there's a selection, else from `toolDefaults`.

- [ ] **Step 1: Create the panel**

Create `components/canvas/style-panel.tsx`:

```tsx
"use client";

import { useWorkspaceStore } from "@/core/state/workspace-store";
import { type ShapeStyle } from "@/core/canvas/style";
import { cn } from "@/lib/utils";

const STROKES = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
const FILLS = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99"];
const WIDTHS: ShapeStyle["strokeWidth"][] = [1, 2, 4];
const STROKE_STYLES: ShapeStyle["strokeStyle"][] = ["solid", "dashed", "dotted"];
const SLOPPINESS: ShapeStyle["sloppiness"][] = [0, 1, 2];
const EDGES: ShapeStyle["edges"][] = ["sharp", "round"];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  const transparent = color === "transparent";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "size-6 rounded-md border transition-transform active:scale-95",
        active ? "ring-2 ring-brand-accent ring-offset-1" : "border-border",
      )}
      style={transparent ? { backgroundImage: "linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(45deg,#ddd 25%,#fff 25%,#fff 75%,#ddd 75%)", backgroundSize: "8px 8px", backgroundPosition: "0 0,4px 4px" } : { background: color }}
    />
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[2rem] rounded-md border px-2 py-1 text-[11px] capitalize transition-colors",
        active ? "border-brand-accent bg-brand-accent/12 text-brand-accent" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

export function StylePanel() {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const toolDefaults = useWorkspaceStore((s) => s.toolDefaults);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const setToolDefaults = useWorkspaceStore((s) => s.setToolDefaults);
  const applyStyleToSelection = useWorkspaceStore((s) => s.applyStyleToSelection);

  const selected = nodes.filter((n) => n.selected);
  const hasSelection = selected.length > 0;
  const creating = activeTool !== "select" && activeTool !== "hand";
  if (!hasSelection && !creating) return null;

  const current: ShapeStyle = { ...toolDefaults, ...(selected[0]?.data.style ?? {}) };
  const set = (patch: Partial<ShapeStyle>) =>
    hasSelection ? applyStyleToSelection(patch) : setToolDefaults(patch);

  return (
    <div className="absolute left-3 top-3 z-20 w-52">
      <div className="space-y-3 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <Section label="Stroke">
          {STROKES.map((c) => (
            <Swatch key={c} color={c} active={current.stroke === c} onClick={() => set({ stroke: c })} />
          ))}
        </Section>
        <Section label="Background">
          {FILLS.map((c) => (
            <Swatch key={c} color={c} active={current.fill === c} onClick={() => set({ fill: c })} />
          ))}
        </Section>
        <Section label="Stroke width">
          {WIDTHS.map((w) => (
            <Chip key={w} label={`${w}px`} active={current.strokeWidth === w} onClick={() => set({ strokeWidth: w })} />
          ))}
        </Section>
        <Section label="Stroke style">
          {STROKE_STYLES.map((s) => (
            <Chip key={s} label={s} active={current.strokeStyle === s} onClick={() => set({ strokeStyle: s })} />
          ))}
        </Section>
        <Section label="Sloppiness">
          {SLOPPINESS.map((s) => (
            <Chip key={s} label={["clean", "rough", "wild"][s]} active={current.sloppiness === s} onClick={() => set({ sloppiness: s })} />
          ))}
        </Section>
        <Section label="Edges">
          {EDGES.map((e) => (
            <Chip key={e} label={e} active={current.edges === e} onClick={() => set({ edges: e })} />
          ))}
        </Section>
        <Section label="Opacity">
          <input
            type="range" min={0} max={100} value={Math.round(current.opacity * 100)}
            onChange={(e) => set({ opacity: Number(e.target.value) / 100 })}
            className="w-full"
          />
        </Section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render the panel in `whiteboard-inner.tsx`**

Add the import:

```ts
import { StylePanel } from "./style-panel";
```

And render it inside the outer `div` (next to `<CanvasToolbar />`), gated on edit rights:

```tsx
        {canEdit && <StylePanel />}
```

- [ ] **Step 3: Typecheck + full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests green.

- [ ] **Step 4: Manual verification (dev server)**

Run: `npm run dev`, open a project canvas. Verify:
- Toolbar sits top-center; keys `V/H/P/R/O/D/T/N/I` work (and do nothing while typing in a node).
- Selecting a shape shows the style panel; changing stroke/fill/width recolors the selection (note: visual restyle of shapes lands in Phase 2 — for now confirm `applyStyleToSelection` runs without error and the panel reflects choices).
- Pen still draws (via synced `penMode`); "Read sketch" still works.

- [ ] **Step 5: Commit**

```bash
git add components/canvas/style-panel.tsx components/canvas/whiteboard-inner.tsx
git commit -m "feat(canvas): contextual style panel wired to toolDefaults + selection"
```

---

## Self-Review

**Spec coverage (Phase 1 rows):** tool+style state (Task 3), top toolbar replacing rail (Tasks 2, 4), contextual style panel (Task 5), geometry helpers (Task 1), keyboard shortcuts (Tasks 2, 4). Style data model (`node.data.style`, `DEFAULT_STYLE`, no migration) — Tasks 1, 3. All Phase 1 spec items map to a task.

**Deferred to later phases (intentionally, per spec phasing):** roughjs visual render of shapes, drag-to-size, eraser, floating edges, image/code nodes, layers/lock, snapping, AI features. Task 5's manual step notes that shape restyle is visually completed in Phase 2.

**Placeholder scan:** none — every code step contains complete code; no TBD/TODO.

**Type consistency:** `CanvasTool`, `ShapeStyle`, `DEFAULT_STYLE`, `ToolMeta` names are used identically across tasks; `applyStyleToSelection`/`setToolDefaults`/`setActiveTool` signatures match between the store (Task 3) and consumers (Tasks 4, 5). `makeStore` exported in Task 3 and consumed by its test.
