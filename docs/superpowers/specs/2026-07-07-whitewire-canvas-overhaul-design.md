# WhiteWire Canvas Overhaul — Design

**Date:** 2026-07-07
**Status:** Approved (brainstorm) → pending spec review
**Author:** Abhijeet + Claude

## Problem

The canvas today is a React Flow (`@xyflow/react`) node-graph: you insert nodes
(AI, text, note, shape, draw, wireframe) from a left rail and connect them
through two fixed handles (the "2 dots"). It is good at *connected AI graphs* but
weak as a *freeform whiteboard*:

- Shapes are click-to-insert at screen center, not **drag-to-size**.
- The only style controls are a fixed grey 6px pen. No stroke color, fill,
  width, dash, opacity, sloppiness, or edge rounding.
- **No eraser.**
- Nodes connect only at two fixed points, not anywhere.
- No images, no code blocks on the board.

Reference bar: Excalidraw's interaction model and polish. We are **not** embedding
Excalidraw or reverting to tldraw — we extend the one React Flow engine so there
is a single persistence model, a single undo stack, and one selection model.

## Goals

A unified, Excalidraw-class freeform canvas that keeps WhiteWire's AI-native
graph, adds a full drawing toolset, and fuses the two so drawings and AI nodes
are interchangeable.

Non-goals for this pass: web/iframe embed nodes, presentation/follow mode,
reusable component libraries, comment pins, voice→canvas. These are explicit
fast-follows.

## Framing decision: unified toolbar, no modes

Excalidraw has no modes — one tool row. We adopt that. There is **no** Flow vs.
Design toggle. Drawing tools and AI/graph tools live in one top-center toolbar;
each tool has a single-key shortcut. This supersedes the earlier "dual-mode"
idea from brainstorming.

## Architecture

Everything new is a **node type**, an **edge type**, or a **tool** on the
existing React Flow substrate. No second engine.

### Layout (matches the reference screenshots)

- **Top-center toolbar** — Select (V) · Hand (H) · Rectangle (R) · Ellipse (O) ·
  Diamond (D) · Arrow (A) · Line (L) · Pen (P) · Text (T) · Image · Code ·
  Eraser (E) · AI-node (I) · Frame (F).
- **Left style panel** — contextual: shown when a creation tool is active (edits
  tool defaults) or when node(s) are selected (edits their style). Sections:
  Stroke, Background/Fill, Stroke width, Stroke style, Sloppiness, Edges,
  Opacity, Layers.
- **Bottom-left** — zoom + undo/redo. Collab cursors unchanged.

### Module map

| Concern | Module | Status |
|---|---|---|
| Tool + style state | `core/state/workspace-store.ts` | extend |
| Top toolbar | `components/canvas/canvas-toolbar.tsx` | new (replaces `canvas-tools-rail.tsx`) |
| Contextual style panel | `components/canvas/style-panel.tsx` | new |
| Drag-to-size creation | `components/canvas/shape-draw-layer.tsx` | new (generalizes `pen-layer.tsx`) |
| Hand-drawn shape render | `components/canvas/rough-shape.tsx` | new (roughjs) |
| Rich pen | `components/canvas/pen-layer.tsx` | edit (read tool defaults) |
| Eraser | folded into `shape-draw-layer.tsx` + store `eraseAt` | new |
| Connect-anywhere edges | `components/canvas/floating-edge.tsx` + `floating-connection-line.tsx` | new |
| Image node | `components/canvas/image-node.tsx` | new |
| Code node | `components/canvas/code-node.tsx` | new |
| Geometry helpers (pure) | `core/canvas/geometry.ts` | new |
| AI: text/Mermaid → diagram | `app/p/[projectId]/diagram-actions.ts` | new |
| AI: cleanup sketch | extend `cleanup-adapter.ts` + existing sketch action | edit |

### New dependencies

- `roughjs` — promote from transitive to a **declared** dependency; powers the
  hand-drawn shape aesthetic and sloppiness levels.
- `@uiw/react-codemirror` + language extensions — code node editor.
- `@vercel/sandbox` — code node **Run** action (server-side execution).

Already present and reused: `perfect-freehand` (pen), `mermaid` (Mermaid parse),
`@vercel/blob` (image upload), `html-to-image` (export), `motion` (laser/anim).

## Data model — no persistence migration

New properties ride inside `node.data`; the snapshot stays `{ nodes, edges }`
through the existing `saveCanvasAction`. Old boards load unchanged (absent style
falls back to defaults).

```ts
// added to AiNodeData
type ShapeStyle = {
  stroke: string;              // hex
  fill: string;                // hex | "transparent"
  strokeWidth: number;         // 1 | 2 | 4
  strokeStyle: "solid" | "dashed" | "dotted";
  sloppiness: 0 | 1 | 2;       // roughjs roughness
  edges: "sharp" | "round";
  opacity: number;             // 0..1
  fontSize?: number;
};

type AiNodeData = {
  /* …existing fields… */
  style?: ShapeStyle;          // shapes, pen, text, note, image frame
  locked?: boolean;            // Layers: lock
  // image node
  src?: string;                // Blob URL
  naturalW?: number; naturalH?: number;
  // code node
  code?: string; language?: string; runOutput?: string; runStatus?: "idle" | "running" | "ok" | "error";
};
```

Edges gain `type: "floating"` and a `data.style` (stroke, width, dash,
arrowheads). z-order is the array order of `nodes`; Layers actions reorder it.

## Component designs

### 1. Tool + style state (workspace-store)

Replace the boolean `penMode` with an `activeTool` enum, and add tool defaults +
style application. `penMode` becomes a derived selector (`activeTool === "pen"`)
during migration so existing consumers keep working.

```ts
activeTool: "select" | "hand" | "rectangle" | "ellipse" | "diamond"
          | "arrow" | "line" | "pen" | "text" | "image" | "code"
          | "eraser" | "aiNode" | "frame";
toolDefaults: ShapeStyle;              // applied to newly created elements
setActiveTool(t): void;
setToolDefaults(patch: Partial<ShapeStyle>): void;
applyStyleToSelection(patch: Partial<ShapeStyle>): void;   // N selected nodes
eraseAt(nodeIdsUnderCursor: string[]): void;               // delete + edges
// Layers
bringForward(id) / sendBackward(id) / bringToFront(id) / sendToBack(id): void;
toggleLock(id): void;
duplicateSelection(): void;             // copy/paste/alt-drag support
```

### 2. Drag-to-size creation (`shape-draw-layer.tsx`)

Active whenever `activeTool` is a shape/line/arrow/frame tool. Generalizes the
existing pen-layer flow:

- pointer-down → record flow-space anchor, begin live SVG preview.
- pointer-move → update preview (rubber-band rect; ellipse/diamond inscribed;
  line/arrow endpoint). Hold Shift = constrain square/circle/45°.
- pointer-up → compute `{position, width, height}`, create the node with
  `type` from the tool and `data.style = toolDefaults`, then return to Select
  (Excalidraw behavior; hold the tool with a lock toggle to keep drawing).

Geometry (anchor+current → position/size, inscribed shapes, Shift constraint)
lives in `core/canvas/geometry.ts` as pure functions — unit tested first.

### 3. Hand-drawn shapes (`rough-shape.tsx`)

`ShapeNode` renders through roughjs instead of plain CSS borders. Inputs:
`shape`, size, and `style` (stroke/fill/width/dash/sloppiness/edges/opacity).
Renders to an inline SVG sized to the node; re-renders on resize. Sharp vs round
edges maps to roughjs corner handling; sloppiness maps to `roughness`. Keeps the
existing `NodeResizer` and inline label input.

### 4. Rich pen (`pen-layer.tsx`)

Read `toolDefaults` for color/width/stroke-style instead of the hard-coded
`#3f3f46` / 6px. Dashed/dotted strokes render via SVG `stroke-dasharray` on the
outline path. Still commits a `drawNode` on pointer-up (keeps collab sync simple:
strokes appear after completion).

### 5. Eraser

Object eraser: while `activeTool === "eraser"`, pointer-down + drag hit-tests
nodes/edges under the cursor and deletes them (`eraseAt`), with a red hover
outline before deletion. Simple, matches "remove the pen or any drawing." No
pixel-level erase in this pass.

### 6. Connect-anywhere floating edges

Replace fixed Top/Bottom handles with the standard React Flow **floating edge**
pattern:

- Each connectable node gets a single full-cover handle (source+target) so a
  drag can start/end anywhere on it; a hover halo signals draggability.
- `floating-edge.tsx` computes the visual endpoints as the **border
  intersection** between the two node rectangles (via `getNodeIntersection` /
  `getEdgePosition` helpers in `core/canvas/geometry.ts`), so the line meets each
  shape at the true edge point regardless of where you grabbed.
- `floating-connection-line.tsx` renders the in-progress drag.
- Works uniformly across shapes ↔ AI nodes ↔ code ↔ image nodes.

Intersection math is pure and unit-tested.

### 7. Image node (`image-node.tsx`)

Insert via the Image tool, paste, or drag-drop onto the canvas → upload to Vercel
Blob (reuse existing upload path) → node stores `src` + natural dimensions →
renders `<img>` inside a resizable frame (aspect-locked by default; Shift to free
resize). Connectable like any node.

### 8. Code node (`code-node.tsx`) — editable + AI + runnable

One node, three progressive affordances:

- **Edit** — CodeMirror editor, language selector; `code`/`language` persisted.
- **Generate** — reuses existing AI/wireframe-to-code infra: an action fills the
  block from a prompt or an attached wireframe/frame; editable and regeneratable.
- **Run** — server action executes the code in **Vercel Sandbox** and streams
  `runOutput` into an output pane; `runStatus` drives the UI. Run is the heaviest
  piece and is isolated behind its own server action so it cannot destabilize the
  rest of the canvas; if the sandbox is unavailable the node degrades to
  edit+generate only.

### 9. AI differentiators

- **Shape recognition** (toggle): after a pen stroke, an optional pass classifies
  it (rectangle/ellipse/line/arrow via simple heuristics on the point cloud) and
  offers to snap the `drawNode` into a clean `shapeNode`. Off by default so the
  intentional hand-drawn look stays available.
- **Text / Mermaid → diagram** (`diagram-actions.ts`): a prompt or pasted Mermaid
  → nodes+edges laid out onto the board. Mermaid parsed with the installed
  `mermaid`; freeform prompts reuse the existing AI graph-gen used by the command
  bar. Auto-layout via the installed `@dagrejs/dagre`.
- **AI cleanup of sketches**: select messy drawing → existing `read-sketch` +
  `cleanup-adapter` redraw it clean into shapes/nodes.
- **Rough box → AI node**: a selected shape has a one-click "make AI node" action
  that converts it into a live `aiNode` in place.

### 10. Pro-feel bundle

- **Layers/z-order + lock** — store actions above; panel section with
  front/back/forward/backward + lock toggle. Locked nodes ignore drag/select.
- **Copy / paste / duplicate** — `duplicateSelection` + clipboard handlers; alt-drag
  clones.
- **Multi-select → style all** — `applyStyleToSelection` writes to every selected
  node; style panel reflects mixed values.
- **Snapping + alignment guides** — while dragging, compare against neighbor
  edges/centers; render alignment lines and snap within a threshold. Guide math
  pure and tested.
- **Laser pointer** — ephemeral fading trail (a tool) for live sessions; not
  persisted.

## Data flow

1. User picks a tool (toolbar) → `setActiveTool`.
2. Creation tools → `shape-draw-layer` captures the drag → creates a node with
   `data.style = toolDefaults` → `addNode`.
3. Selecting node(s) → style panel edits → `applyStyleToSelection` /
   `updateNodeData`.
4. Any store mutation → existing debounced autosave strips volatile flags →
   `saveCanvasAction({ nodes, edges })` (owners/editors only).
5. Collab layer broadcasts as today; new node types flow through unchanged.

## Error handling

- Image upload failure → toast, no node created.
- Code Run: sandbox errors captured into `runStatus: "error"` + `runOutput`;
  timeouts bounded by the server action; node stays editable.
- AI actions (diagram/cleanup/generate) already return `{error}` shapes → surfaced
  inline as today.
- Malformed/old snapshots → missing `style` uses `toolDefaults`; unknown node
  types are skipped rather than crashing the board.

## Testing (TDD, keep the suite green)

Pure logic first, then light rendering smoke tests:

- `geometry.ts`: drag→{position,size}, inscribed shapes, Shift constraint,
  floating-edge intersection, snapping/alignment.
- `workspace-store`: `setActiveTool`, tool defaults, `applyStyleToSelection`,
  `eraseAt`, layer reorders, `duplicateSelection`.
- pen/shape style application (stroke/dash/opacity → rendered attributes).
- shape recognition heuristics on sample point clouds.
- persistence round-trip: new node types + `style` survive save/load
  (extend `tests/canvas.repo.test.ts`).
- Mermaid→graph parse mapping.
- Component smoke: toolbar renders all tools; style panel reflects selection.

## Phasing (single build, ordered so each phase is shippable)

1. **Foundation** — `activeTool`/`toolDefaults` state, top toolbar, contextual
   style panel, geometry helpers. (No visual regressions; rail → toolbar.)
2. **Drawing core** — drag-to-size creation, roughjs shapes, rich pen, eraser.
3. **Connect-anywhere** — floating edges + connection line; retire fixed handles.
4. **Media** — image node, code node (edit + generate), then Run (sandbox).
5. **Pro-feel** — layers/lock, copy/paste/duplicate, multi-select styling,
   snapping guides, laser pointer.
6. **AI differentiators** — shape recognition, text/Mermaid→diagram, AI cleanup,
   rough-box→AI-node.

## Open questions

None blocking. Run-in-sandbox language support and resource limits to be pinned
during Phase 4.
