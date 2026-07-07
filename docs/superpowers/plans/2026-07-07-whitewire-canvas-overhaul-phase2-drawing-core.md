# WhiteWire Canvas Overhaul — Phase 2: Drawing Core (style rendering + shape library) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the style menu real — the pen and all shapes actually render with the chosen stroke/fill/width/dash/sloppiness/edges/opacity — seed newly-created elements with the current tool defaults, and add a shapes dropdown covering a full shape library rendered via roughjs.

**Architecture:** Keep the single React Flow engine. Introduce a pure shape-geometry registry (`core/canvas/shapes.ts`) that maps each shape to a primitive descriptor, and a roughjs-backed renderer (`rough-shape.tsx`) that turns a descriptor + `ShapeStyle` into SVG `<path>`s. Rewrite `ShapeNode` to render through it. Wire the pen (`pen-layer.tsx` + `draw-node.tsx`) to consume `toolDefaults`/`data.style`. Seed `data.style` on insert and add a shapes dropdown to the toolbar.

**Tech Stack:** Next.js 16, React 19, `@xyflow/react` 12, Zustand 5, **roughjs** (new direct dep), `perfect-freehand`, Tailwind 4, lucide-react, Vitest 4.

## Global Constraints

- Persistence snapshot stays `{ nodes, edges }`; **no schema migration**. New fields live in `node.data`.
- Absent `data.style` must fall back to `DEFAULT_STYLE` (from `@/core/canvas/style`) so old boards and legacy draw/shape nodes still render.
- Legacy `DrawNode` data (`data.color`, `data.size`) must keep rendering (back-compat) when `data.style` is absent.
- Import alias `@/`. Vitest tests colocated under `tests/`, pure-logic only — no React Testing Library. Pure geometry/helpers get tests; React components do not.
- `ShapeStyle` shape (from Phase 1): `{ stroke, fill, strokeWidth: 1|2|4, strokeStyle: "solid"|"dashed"|"dotted", sloppiness: 0|1|2, edges: "sharp"|"round", opacity: 0..1, fontSize? }`. `DEFAULT_STYLE` = stroke `#1e1e1e`, fill `transparent`, strokeWidth 2, strokeStyle solid, sloppiness 1, edges round, opacity 1.
- Commit after every task with the shown message.

---

### Task 1: Dash-array + pen-size style helpers (pure)

**Files:**
- Modify: `core/canvas/style.ts`
- Test: `tests/core/canvas/style-helpers.test.ts` (create)

**Interfaces:**
- Consumes: `ShapeStyle` (existing).
- Produces:
  - `function dashArray(strokeStyle: ShapeStyle["strokeStyle"], strokeWidth: number): number[]` — `solid → []`, `dashed → [strokeWidth*4, strokeWidth*2]`, `dotted → [strokeWidth, strokeWidth*2]`.
  - `function penSize(strokeWidth: ShapeStyle["strokeWidth"]): number` — maps `1→4`, `2→7`, `4→12` (freehand feels ~2–3× a shape border).

- [ ] **Step 1: Write the failing test**

Create `tests/core/canvas/style-helpers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dashArray, penSize } from "@/core/canvas/style";

describe("dashArray", () => {
  it("solid → no dashes", () => {
    expect(dashArray("solid", 2)).toEqual([]);
  });
  it("dashed → scaled by width", () => {
    expect(dashArray("dashed", 2)).toEqual([8, 4]);
  });
  it("dotted → tight dots scaled by width", () => {
    expect(dashArray("dotted", 4)).toEqual([4, 8]);
  });
});

describe("penSize", () => {
  it("maps the three stroke widths to freehand sizes", () => {
    expect(penSize(1)).toBe(4);
    expect(penSize(2)).toBe(7);
    expect(penSize(4)).toBe(12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/canvas/style-helpers.test.ts`
Expected: FAIL — `dashArray`/`penSize` not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `core/canvas/style.ts`:

```ts
export function dashArray(strokeStyle: ShapeStyle["strokeStyle"], strokeWidth: number): number[] {
  if (strokeStyle === "dashed") return [strokeWidth * 4, strokeWidth * 2];
  if (strokeStyle === "dotted") return [strokeWidth, strokeWidth * 2];
  return [];
}

export function penSize(strokeWidth: ShapeStyle["strokeWidth"]): number {
  return strokeWidth === 1 ? 4 : strokeWidth === 2 ? 7 : 12;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/canvas/style-helpers.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add core/canvas/style.ts tests/core/canvas/style-helpers.test.ts
git commit -m "feat(canvas): dashArray + penSize style helpers"
```

---

### Task 2: Shape geometry registry (pure)

**Files:**
- Create: `core/canvas/shapes.ts`
- Test: `tests/core/canvas/shapes.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ShapeId = "rectangle" | "roundRect" | "ellipse" | "diamond" | "triangle" | "line" | "arrow" | "cylinder" | "parallelogram" | "hexagon" | "cloud" | "star" | "heart" | "speechBubble" | "arrowBlock"`
  - `type ShapeCategory = "basic" | "flowchart" | "decorative"`
  - `type ShapeMeta = { id: ShapeId; label: string; category: ShapeCategory }`
  - `const SHAPES: ShapeMeta[]`
  - `type Primitive = { kind: "rect"; round: boolean } | { kind: "ellipse" } | { kind: "polygon"; points: [number, number][] } | { kind: "line"; points: [number, number][]; arrow: boolean } | { kind: "path"; d: string }`
  - `function shapePrimitive(id: ShapeId, w: number, h: number, edges: "sharp" | "round"): Primitive` — geometry in a `w×h` box with `PAD = 4` inset.

- [ ] **Step 1: Write the failing test**

Create `tests/core/canvas/shapes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SHAPES, shapePrimitive } from "@/core/canvas/shapes";

describe("SHAPES", () => {
  it("covers basic, flowchart, and decorative categories", () => {
    const cats = new Set(SHAPES.map((s) => s.category));
    expect(cats).toEqual(new Set(["basic", "flowchart", "decorative"]));
  });
  it("includes the full requested set", () => {
    const ids = SHAPES.map((s) => s.id).sort();
    expect(ids).toEqual(
      [
        "arrow", "arrowBlock", "cloud", "cylinder", "diamond", "ellipse", "heart",
        "hexagon", "line", "parallelogram", "rectangle", "roundRect", "speechBubble",
        "star", "triangle",
      ].sort(),
    );
  });
});

describe("shapePrimitive", () => {
  it("rectangle sharp → rect not rounded", () => {
    expect(shapePrimitive("rectangle", 100, 60, "sharp")).toEqual({ kind: "rect", round: false });
  });
  it("rectangle with round edges → rounded rect", () => {
    expect(shapePrimitive("rectangle", 100, 60, "round")).toEqual({ kind: "rect", round: true });
  });
  it("ellipse → ellipse primitive", () => {
    expect(shapePrimitive("ellipse", 100, 60, "sharp")).toEqual({ kind: "ellipse" });
  });
  it("triangle → three inset points", () => {
    const p = shapePrimitive("triangle", 100, 60, "sharp");
    expect(p).toEqual({ kind: "polygon", points: [[50, 4], [96, 56], [4, 56]] });
  });
  it("diamond → four inset points", () => {
    const p = shapePrimitive("diamond", 100, 60, "sharp");
    expect(p).toEqual({ kind: "polygon", points: [[50, 4], [96, 30], [50, 56], [4, 30]] });
  });
  it("line → two points, no arrowhead", () => {
    expect(shapePrimitive("line", 100, 60, "sharp")).toEqual({
      kind: "line", points: [[4, 30], [96, 30]], arrow: false,
    });
  });
  it("arrow → line flagged as arrow", () => {
    const p = shapePrimitive("arrow", 100, 60, "sharp");
    expect(p.kind).toBe("line");
    if (p.kind === "line") expect(p.arrow).toBe(true);
  });
  it("heart → a path primitive", () => {
    expect(shapePrimitive("heart", 100, 60, "sharp").kind).toBe("path");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/canvas/shapes.test.ts`
Expected: FAIL — cannot resolve `@/core/canvas/shapes`.

- [ ] **Step 3: Write minimal implementation**

Create `core/canvas/shapes.ts`:

```ts
export type ShapeId =
  | "rectangle" | "roundRect" | "ellipse" | "diamond" | "triangle"
  | "line" | "arrow" | "cylinder" | "parallelogram" | "hexagon" | "cloud"
  | "star" | "heart" | "speechBubble" | "arrowBlock";

export type ShapeCategory = "basic" | "flowchart" | "decorative";
export type ShapeMeta = { id: ShapeId; label: string; category: ShapeCategory };

export const SHAPES: ShapeMeta[] = [
  { id: "rectangle", label: "Rectangle", category: "basic" },
  { id: "roundRect", label: "Rounded rectangle", category: "basic" },
  { id: "ellipse", label: "Ellipse", category: "basic" },
  { id: "diamond", label: "Diamond", category: "basic" },
  { id: "triangle", label: "Triangle", category: "basic" },
  { id: "line", label: "Line", category: "basic" },
  { id: "arrow", label: "Arrow", category: "basic" },
  { id: "cylinder", label: "Cylinder", category: "flowchart" },
  { id: "parallelogram", label: "Parallelogram", category: "flowchart" },
  { id: "hexagon", label: "Hexagon", category: "flowchart" },
  { id: "cloud", label: "Cloud", category: "flowchart" },
  { id: "star", label: "Star", category: "decorative" },
  { id: "heart", label: "Heart", category: "decorative" },
  { id: "speechBubble", label: "Speech bubble", category: "decorative" },
  { id: "arrowBlock", label: "Block arrow", category: "decorative" },
];

const PAD = 4;

type Pt = [number, number];
export type Primitive =
  | { kind: "rect"; round: boolean }
  | { kind: "ellipse" }
  | { kind: "polygon"; points: Pt[] }
  | { kind: "line"; points: Pt[]; arrow: boolean }
  | { kind: "path"; d: string };

function star(cx: number, cy: number, outer: number, inner: number, spikes = 5): Pt[] {
  const pts: Pt[] = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + i * step;
    pts.push([+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)]);
  }
  return pts;
}

export function shapePrimitive(id: ShapeId, w: number, h: number, edges: "sharp" | "round"): Primitive {
  const l = PAD, t = PAD, r = w - PAD, b = h - PAD;
  const cx = w / 2, cy = h / 2, iw = r - l, ih = b - t;
  switch (id) {
    case "rectangle": return { kind: "rect", round: edges === "round" };
    case "roundRect": return { kind: "rect", round: true };
    case "ellipse": return { kind: "ellipse" };
    case "diamond": return { kind: "polygon", points: [[cx, t], [r, cy], [cx, b], [l, cy]] };
    case "triangle": return { kind: "polygon", points: [[cx, t], [r, b], [l, b]] };
    case "parallelogram": return { kind: "polygon", points: [[l + iw * 0.25, t], [r, t], [r - iw * 0.25, b], [l, b]] };
    case "hexagon": return { kind: "polygon", points: [[l + iw * 0.25, t], [r - iw * 0.25, t], [r, cy], [r - iw * 0.25, b], [l + iw * 0.25, b], [l, cy]] };
    case "arrowBlock": {
      const my = cy, sh = ih * 0.28, hw = iw * 0.4;
      return { kind: "polygon", points: [[l, my - sh], [l + hw, my - sh], [l + hw, t], [r, my], [l + hw, b], [l + hw, my + sh], [l, my + sh]] };
    }
    case "star": return { kind: "polygon", points: star(cx, cy, Math.min(iw, ih) / 2, Math.min(iw, ih) / 4) };
    case "line": return { kind: "line", points: [[l, cy], [r, cy]], arrow: false };
    case "arrow": return { kind: "line", points: [[l, cy], [r, cy]], arrow: true };
    case "cylinder": {
      const ry = ih * 0.12;
      const d = `M ${l} ${t + ry} A ${iw / 2} ${ry} 0 0 0 ${r} ${t + ry} L ${r} ${b - ry} A ${iw / 2} ${ry} 0 0 1 ${l} ${b - ry} Z M ${l} ${t + ry} A ${iw / 2} ${ry} 0 0 1 ${r} ${t + ry}`;
      return { kind: "path", d };
    }
    case "speechBubble": {
      const rad = 12, tailX = l + iw * 0.25;
      const d = `M ${l + rad} ${t} L ${r - rad} ${t} Q ${r} ${t} ${r} ${t + rad} L ${r} ${b - rad - ih * 0.18} Q ${r} ${b - ih * 0.18} ${r - rad} ${b - ih * 0.18} L ${tailX + 16} ${b - ih * 0.18} L ${tailX} ${b} L ${tailX + 4} ${b - ih * 0.18} L ${l + rad} ${b - ih * 0.18} Q ${l} ${b - ih * 0.18} ${l} ${b - rad - ih * 0.18} L ${l} ${t + rad} Q ${l} ${t} ${l + rad} ${t} Z`;
      return { kind: "path", d };
    }
    case "heart": {
      const d = `M ${cx} ${b} C ${l - iw * 0.1} ${t + ih * 0.55} ${l + iw * 0.15} ${t - ih * 0.1} ${cx} ${t + ih * 0.35} C ${r - iw * 0.15} ${t - ih * 0.1} ${r + iw * 0.1} ${t + ih * 0.55} ${cx} ${b} Z`;
      return { kind: "path", d };
    }
    case "cloud": {
      const d = `M ${l + iw * 0.25} ${b} C ${l} ${b} ${l} ${cy} ${l + iw * 0.2} ${cy} C ${l + iw * 0.2} ${t + ih * 0.1} ${l + iw * 0.55} ${t} ${l + iw * 0.6} ${t + ih * 0.25} C ${r - iw * 0.1} ${t + ih * 0.05} ${r} ${cy * 0.9} ${r - iw * 0.15} ${cy} C ${r} ${cy} ${r} ${b} ${l + iw * 0.75} ${b} Z`;
      return { kind: "path", d };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/canvas/shapes.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add core/canvas/shapes.ts tests/core/canvas/shapes.test.ts
git commit -m "feat(canvas): shape geometry registry (primitives for 15 shapes)"
```

---

### Task 3: roughjs shape renderer + ShapeNode rewrite

**Files:**
- Create: `components/canvas/rough-shape.tsx`
- Modify: `components/canvas/ai-node.tsx` (`ShapeNode` + add `shapeNode` already registered; keep `nodeTypes`)
- Modify: `package.json` (add `roughjs`)

**Interfaces:**
- Consumes: `shapePrimitive`, `ShapeId` from `@/core/canvas/shapes`; `ShapeStyle`, `DEFAULT_STYLE`, `dashArray` from `@/core/canvas/style`.
- Produces: `export function RoughShape({ shape, width, height, style, seed }: { shape: ShapeId; width: number; height: number; style: ShapeStyle; seed: number })` — renders an inline SVG of the shape via roughjs.

- [ ] **Step 1: Add the dependency**

Run:

```bash
npm install roughjs@4.6.6
```

Expected: `roughjs` moves into `dependencies` in `package.json`.

- [ ] **Step 2: Create the renderer**

Create `components/canvas/rough-shape.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { RoughGenerator } from "roughjs/bin/generator";
import { shapePrimitive, type ShapeId } from "@/core/canvas/shapes";
import { type ShapeStyle, dashArray } from "@/core/canvas/style";

const gen = new RoughGenerator();

export function RoughShape({
  shape, width, height, style, seed,
}: { shape: ShapeId; width: number; height: number; style: ShapeStyle; seed: number }) {
  const paths = useMemo(() => {
    const w = Math.max(width, 8);
    const h = Math.max(height, 8);
    const prim = shapePrimitive(shape, w, h, style.edges);
    const hasFill = style.fill !== "transparent";
    const opts = {
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      roughness: style.sloppiness,
      seed: seed || 1,
      fill: hasFill ? style.fill : undefined,
      fillStyle: "solid" as const,
      strokeLineDash: dashArray(style.strokeStyle, style.strokeWidth),
    };
    let drawable;
    const p = 4;
    switch (prim.kind) {
      case "rect":
        drawable = prim.round
          ? gen.path(roundedRectPath(p, p, w - 2 * p, h - 2 * p, 12), opts)
          : gen.rectangle(p, p, w - 2 * p, h - 2 * p, opts);
        break;
      case "ellipse":
        drawable = gen.ellipse(w / 2, h / 2, w - 2 * p, h - 2 * p, opts);
        break;
      case "polygon":
        drawable = gen.polygon(prim.points, opts);
        break;
      case "path":
        drawable = gen.path(prim.d, opts);
        break;
      case "line": {
        const [[x1, y1], [x2, y2]] = prim.points;
        return [
          ...gen.toPaths(gen.line(x1, y1, x2, y2, opts)),
          ...(prim.arrow ? gen.toPaths(gen.linearPath(arrowHead(x1, y1, x2, y2), opts)) : []),
        ];
      }
    }
    return gen.toPaths(drawable);
  }, [shape, width, height, style, seed]);

  return (
    <svg width={Math.max(width, 8)} height={Math.max(height, 8)} style={{ overflow: "visible", opacity: style.opacity }}>
      {paths.map((pt, i) => (
        <path
          key={i}
          d={pt.d}
          stroke={pt.stroke}
          strokeWidth={pt.strokeWidth}
          fill={pt.fill ?? "none"}
          strokeDasharray={pt.strokeLineDash?.length ? pt.strokeLineDash.join(" ") : undefined}
        />
      ))}
    </svg>
  );
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M ${x + rr} ${y} L ${x + w - rr} ${y} Q ${x + w} ${y} ${x + w} ${y + rr} L ${x + w} ${y + h - rr} Q ${x + w} ${y + h} ${x + w - rr} ${y + h} L ${x + rr} ${y + h} Q ${x} ${y + h} ${x} ${y + h - rr} L ${x} ${y + rr} Q ${x} ${y} ${x + rr} ${y} Z`;
}

function arrowHead(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const len = 12;
  return [
    [x2 - len * Math.cos(a - Math.PI / 6), y2 - len * Math.sin(a - Math.PI / 6)],
    [x2, y2],
    [x2 - len * Math.cos(a + Math.PI / 6), y2 - len * Math.sin(a + Math.PI / 6)],
  ];
}
```

Note: `roughjs/bin/generator`'s `toPaths` returns objects typed loosely; `pt.strokeLineDash` may be absent — the optional chaining guards it.

- [ ] **Step 3: Rewrite `ShapeNode` to use `RoughShape`**

In `components/canvas/ai-node.tsx`, replace the entire `ShapeNode` function (currently the CSS-border version) with:

```tsx
export function ShapeNode({ id, data, selected }: NodeProps<AiNodeType>) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  const shape = (data.shape ?? "rectangle") as ShapeId;
  const style = data.style ?? DEFAULT_STYLE;
  const seed = useMemo(() => hashSeed(id), [id]);
  return (
    <div className="relative h-full w-full">
      <NodeResizer
        minWidth={40}
        minHeight={40}
        isVisible={!!selected}
        lineClassName="!border-brand-accent"
        handleClassName="!h-2 !w-2 !rounded-sm !border-white !bg-brand-accent"
      />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="relative h-full w-full">
        <div className="absolute inset-0">
          <RoughShapeFill id={id} shape={shape} style={style} seed={seed} selected={!!selected} />
        </div>
        <input
          className="nodrag absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 bg-transparent text-center text-sm text-zinc-800 outline-none"
          defaultValue={data.text}
          placeholder="Label"
          onChange={(e) => updateNodeData(id, { text: e.target.value })}
        />
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}
```

Add a small wrapper that measures the node box and renders `RoughShape`, plus the seed hash. Put these near the top of `ai-node.tsx` (after imports):

```tsx
import { useMemo, useRef, useState, useEffect } from "react";
import { RoughShape } from "./rough-shape";
import { type ShapeId } from "@/core/canvas/shapes";
import { DEFAULT_STYLE, type ShapeStyle } from "@/core/canvas/style";

function hashSeed(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function RoughShapeFill({ id, shape, style, seed, selected }: { id: string; shape: ShapeId; style: ShapeStyle; seed: number; selected: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`h-full w-full ${selected ? "rounded outline outline-1 outline-brand-accent/40" : ""}`}>
      {size.w > 0 && <RoughShape shape={shape} width={size.w} height={size.h} style={style} seed={seed} />}
    </div>
  );
}
```

Ensure the existing top-of-file imports still include `Handle, NodeResizer, Position, type NodeProps` and `useWorkspaceStore`, `AiNode as AiNodeType`. Merge the new `useMemo/useRef/useState/useEffect` import with any existing React import (there is none currently — the file imports only from `@xyflow/react` and local modules, so add the `react` import line).

- [ ] **Step 4: Typecheck + full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass (pure logic unchanged; component not unit-tested).

- [ ] **Step 5: Manual verification (dev server)**

Run `npm run dev`, open a canvas, insert a rectangle, select it, change stroke to red, fill to blue, width to 4px, style to Dashed, sloppiness to Wild, edges to Round, opacity to 60%. Confirm the shape re-renders hand-drawn with those attributes. Insert an ellipse and diamond; confirm both restyle.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json components/canvas/rough-shape.tsx components/canvas/ai-node.tsx
git commit -m "feat(canvas): roughjs shape rendering honoring full style menu"
```

---

### Task 4: Pen consumes tool defaults / draw-node honors style

**Files:**
- Modify: `components/canvas/pen-layer.tsx`
- Modify: `components/canvas/draw-node.tsx`

**Interfaces:**
- Consumes: store `toolDefaults`; `penSize` from `@/core/canvas/style`; `ShapeStyle`.
- Produces: pen strokes created with `data.style = { ...toolDefaults }` (plus legacy `color`/`size` kept for back-compat); `DrawNode` renders using `data.style` when present, else legacy `data.color`/`data.size`.

- [ ] **Step 1: Pen layer reads tool defaults**

In `components/canvas/pen-layer.tsx`, replace the fixed constants and the `addNode` payload:

Remove:

```tsx
const PEN_COLOR = "#3f3f46";
const PEN_SIZE = 6;
```

Add near the other store hooks inside `PenLayer`:

```tsx
const toolDefaults = useWorkspaceStore((s) => s.toolDefaults);
```

Replace the preview `<path>` fill and the created node data so they use the current defaults. Change the live preview render to:

```tsx
      {screenPts.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full">
          <path d={strokePath(screenPts, penSize(toolDefaults.strokeWidth))} fill={toolDefaults.stroke} opacity={toolDefaults.opacity} />
        </svg>
      )}
```

And in `up()`, replace the `addNode({...})` data block with:

```tsx
      addNode({
        id: crypto.randomUUID(),
        type: "drawNode",
        position: { x: minX, y: minY },
        data: {
          text: "",
          kind: "generic",
          purpose: "",
          model: "",
          points: pts.map(([x, y]) => [x - minX, y - minY]),
          color: toolDefaults.stroke,
          size: penSize(toolDefaults.strokeWidth),
          style: { ...toolDefaults },
        },
      });
```

Add the import at the top:

```tsx
import { penSize } from "@/core/canvas/style";
```

- [ ] **Step 2: Draw-node honors style**

In `components/canvas/draw-node.tsx`, replace the `color`/`size` derivation to prefer `data.style`:

```tsx
export function DrawNode({ data, selected }: NodeProps<AiNodeType>) {
  const points = data.points ?? [];
  const color = data.style?.stroke ?? data.color ?? "#3f3f46";
  const size = data.size ?? 6;
  const opacity = data.style?.opacity ?? 1;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const w = (xs.length ? Math.max(...xs) : 0) + size * 2;
  const h = (ys.length ? Math.max(...ys) : 0) + size * 2;

  return (
    <svg
      width={w}
      height={h}
      style={{ overflow: "visible", outline: selected ? "1px dashed var(--brand-accent)" : "none" }}
    >
      <path d={strokePath(points, size)} fill={color} opacity={opacity} />
    </svg>
  );
}
```

(Freehand strokes are filled blobs, so stroke color + opacity + width apply; dash does not apply to a fill and is intentionally not used for the pen.)

- [ ] **Step 3: Typecheck + full suite**

Run: `npx tsc --noEmit && npm test`
Expected: green.

- [ ] **Step 4: Manual verification**

Dev server: set stroke red, width 4px, opacity 50%, pick Pen, draw. Confirm the stroke is red, thicker, and semi-transparent (not black). Existing legacy strokes still render.

- [ ] **Step 5: Commit**

```bash
git add components/canvas/pen-layer.tsx components/canvas/draw-node.tsx
git commit -m "feat(canvas): pen consumes tool defaults (color/width/opacity)"
```

---

### Task 5: Seed style on insert + shapes dropdown in toolbar

**Files:**
- Modify: `components/canvas/canvas-toolbar.tsx`
- Modify: `core/canvas/tools.ts` (drop per-shape entries from `PHASE1_TOOLS`; keep a single `rectangle` as the dropdown trigger's default — see below)

**Interfaces:**
- Consumes: `SHAPES`, `ShapeId` from `@/core/canvas/shapes`; store `toolDefaults`, `addNode`; existing `INSERT_DEFAULTS` pattern.
- Produces: toolbar inserts seed `data.style = toolDefaults`; a shapes dropdown button lists all `SHAPES` grouped by category and inserts the chosen shape.

- [ ] **Step 1: Seed style on every insert**

In `components/canvas/canvas-toolbar.tsx`, update `insert()` to read tool defaults and seed style. Add near the other store hooks:

```tsx
const toolDefaults = useWorkspaceStore((s) => s.toolDefaults);
```

Change the `addNode` call inside `insert()` to include style:

```tsx
    addNode({
      id: crypto.randomUUID(),
      type: def.type,
      position,
      style: def.style,
      data: { text: "", kind: "generic", purpose: "", model: "", ...def.data, style: { ...toolDefaults } },
    });
```

- [ ] **Step 2: Add a shapes dropdown**

Add a `insertShape(shapeId: ShapeId)` helper and a dropdown. First add the helper inside the component:

```tsx
function insertShape(shapeId: ShapeId) {
  const isLine = shapeId === "line" || shapeId === "arrow";
  const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  addNode({
    id: crypto.randomUUID(),
    type: "shapeNode",
    position,
    style: isLine ? { width: 160, height: 60 } : { width: 140, height: 100 },
    data: { text: "", kind: "generic", purpose: "", model: "", shape: shapeId, style: { ...toolDefaults } },
  });
  setShapeMenuOpen(false);
}
```

Add `const [shapeMenuOpen, setShapeMenuOpen] = useState(false);` with the other state, import `SHAPES, type ShapeId` from `@/core/canvas/shapes`, `ChevronDown, Shapes` from `lucide-react`, and render the dropdown button in the toolbar (place it where the individual rectangle/ellipse/diamond buttons were — those individual `PHASE1_TOOLS` insert buttons for `rectangle`/`ellipse`/`diamond` are replaced by this single dropdown):

```tsx
        <div className="relative">
          <button
            type="button"
            title="Shapes"
            onClick={() => setShapeMenuOpen((o) => !o)}
            className="flex h-9 items-center gap-0.5 rounded-lg px-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <Shapes className="size-4" />
            <ChevronDown className="size-3" />
          </button>
          {shapeMenuOpen && (
            <div className="absolute left-0 top-11 z-40 w-56 rounded-xl border border-border bg-card p-2 shadow-lg">
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
```

- [ ] **Step 3: Trim `PHASE1_TOOLS` shape entries**

In `core/canvas/tools.ts`, remove the `rectangle`, `ellipse`, and `diamond` entries from `PHASE1_TOOLS` (the dropdown now owns shape insertion). Keep `select`, `hand`, `pen`, `text`, `note`, `aiNode`. Update `tests/core/canvas/tools.test.ts` expected `PHASE1_TOOLS` order accordingly:

```ts
    expect(tools).toEqual(["select", "hand", "pen", "text", "note", "aiNode"]);
```

And update the behavior-tag test to drop the `rectangle` assertion (replace `expect(byTool.rectangle).toBe("insert");` with `expect(byTool.text).toBe("insert");`). Keep the `toolForShortcut` tests, but change the `"R"` assertion — `r` no longer maps to a Phase-1 tool, so update it to `expect(toolForShortcut("r")).toBeNull();` and remove `rectangle` from the shortcut expectations. (Rationale: shape shortcuts return in a later phase alongside drag-to-size; the dropdown is click-only for now.)

Correspondingly, in `core/canvas/tools.ts` remove the `rectangle`/`ellipse`/`diamond` rows so `toolForShortcut("r"/"o"/"d")` return null.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/core/canvas/tools.test.ts && npx tsc --noEmit`
Expected: PASS; no type errors.

- [ ] **Step 5: Full suite**

Run: `npm test`
Expected: green.

- [ ] **Step 6: Manual verification**

Dev server: the toolbar shows a Shapes dropdown; opening it lists Basic/Flowchart/Decorative groups; clicking Cylinder/Star/Heart/etc. inserts that shape rendered via roughjs and seeded with the current style. Change the style menu first, then insert — the new shape adopts those defaults.

- [ ] **Step 7: Commit**

```bash
git add components/canvas/canvas-toolbar.tsx core/canvas/tools.ts tests/core/canvas/tools.test.ts
git commit -m "feat(canvas): shapes dropdown (15 shapes) + seed style on insert"
```

---

## Self-Review

**Spec coverage:** pen honors style (Task 4); shapes render style via roughjs (Tasks 2–3); style menu applies to shapes (Task 3 + existing panel); new shapes seeded with tool defaults (Tasks 4–5); shapes dropdown with expanded library across basic/flowchart/decorative (Tasks 2, 5). Dash/pen-size helpers (Task 1). Matches the user's three requests (pen was always black → fixed; color menu for shapes → fixed; more shapes in a dropdown → added) plus final-review Minor #1 (seed `data.style` on insert).

**Deferred (later phases, unchanged):** drag-to-size creation, eraser, connect-anywhere floating edges, images, code nodes, layers/lock, snapping, AI features. The pen-mode-panel Minor (#2) is resolved here (pen now consumes defaults); the hand-tool Minor (#3) remains deferred.

**Placeholder scan:** none — every code step has complete code.

**Type consistency:** `ShapeId`, `ShapeStyle`, `DEFAULT_STYLE`, `dashArray`, `penSize`, `shapePrimitive`, `Primitive`, `SHAPES` names are used identically across tasks. `RoughShape` prop signature in Task 3 matches its consumer. `PHASE1_TOOLS` trimming in Task 5 is reflected in its test update.
