# Rich Canvas Scenes — Design

**Date:** 2026-08-01
**Status:** Approved, phased delivery

## Problem

Every AI path in the app produces the same thing: a grid of small boxes, each a
title plus one line of note. Generate, Expand, Architect and Read-sketch's
diagram mode all funnel through `core/ai/blueprint.ts`, whose output type is:

```ts
type BlueprintNode = { title: string; kind: string; note: string };
```

That type cannot express anything else, so the model never emits anything else.
The canvas registers six node types (`ai-node.tsx`) and ships fifteen shapes,
but the AI can reach only `aiNode`. `image` and `code` appear in
`core/canvas/tools.ts` with no renderer at all.

The gap against real reference boards:

| Reference | Needs | Today |
| --- | --- | --- |
| Lo-fi UI wireframes | sidebar, search, table, avatar row, tabs, pagination, chart, modal; device variants | 8 primitives: nav, header, text, button, input, image, card, list |
| Architecture diagrams | labelled edges with sub-captions, titled group containers, stacked cards, decision diamonds | unlabelled edges, no containers |
| Infrastructure diagrams | nested containers, icon nodes, external actors | none |
| Mixed idea boards | trees, mind maps, matrices, timelines, charts | one node shape |

## Approach

The bottleneck is the schema, not the model. Widening the node kit is worthless
while the AI can only say `{title, kind, note}`, so the schema comes first and
everything else builds on it.

Four phases, delivered in order. Each is independently shippable.

---

## Phase 1 — Scene schema and node kit

Replace the flat blueprint with a heterogeneous *scene*: one AI call returns
mixed content at appropriate sizes, instead of N identical boxes.

```ts
export type SceneNodeType =
  | "concept" | "note" | "group" | "table" | "code"
  | "image" | "video" | "wireframe" | "shape";

export type SceneNode = {
  /** Model-assigned, referenced by edges and by `parent`. */
  id: string;
  type: SceneNodeType;
  title: string;
  body?: string;
  /** Group membership — maps to React Flow's parentId. */
  parent?: string;
  /** The model sizes its own content; maps to a pixel box. */
  size?: "sm" | "md" | "lg" | "xl";
  table?: { columns: { name: string; type: string; key?: "pk" | "fk" }[] };
  code?: { language: string; source: string };
  media?: { url?: string; caption?: string };
  wireframe?: WireframeSpec;
  shape?: ShapeId;
};

export type SceneEdge = {
  from: string;
  to: string;
  label?: string;
  /** Second line under the label, as in numbered architecture diagrams. */
  note?: string;
  directed?: boolean;
};

export type Scene = { nodes: SceneNode[]; edges: SceneEdge[] };
```

Two decisions worth stating:

- **String ids, not array indices.** Indices break as soon as output is
  heterogeneous and nodes nest; `parent` needs a stable handle anyway.
- **The model picks `size`.** A schema table or a code block is not the same
  shape as a one-line idea, and a fixed 1×2 box is the current complaint.

Renderers to build: `groupNode` (titled container, children move with it via
React Flow `parentId` + `extent: "parent"`), `tableNode` (name, columns, types,
PK/FK markers), `codeNode` (syntax-highlighted, sized to content), `imageNode`
and `videoNode` (Vercel Blob upload — `BLOB_READ_WRITE_TOKEN` is already
configured — plus URL embed).

Also in this phase: edge labels, the `size` → pixel mapping, and rewiring
Generate and Read-sketch to emit scenes. `parseBlueprint` stays for a release so
older callers keep working.

## Phase 2 — Wireframe depth

Grow `WIREFRAME_TYPES` from 8 to roughly 20: `sidebar`, `search`, `table`,
`avatar`, `avatarRow`, `tabs`, `breadcrumb`, `pagination`, `chart`, `checkbox`,
`toggle`, `badge`, `modal`, `footer`, `divider`, `icon`, alongside the existing
set. Add device framing — mobile, tablet, desktop — so one screen can be emitted
at three widths, as in the responsive reference kits.

## Phase 3 — Diagram expressiveness

Numbered and sub-captioned edges. Titled group containers driven by the model
rather than only by sketch containment. Decision diamonds and the other twelve
existing shapes made reachable from AI output via `shape`. Stacked/repeated
cards for "N of these" in a pipeline. Sketch containment feeds `parent`.

## Phase 4 — Board genres

Layout templates the model can choose: mind map (radial), tree (hierarchical),
matrix (2×2 grid with axis labels), timeline (horizontal spine), and simple
charts. Selection works like the wireframe/diagram decision already added to
Read sketch — the model picks the genre that fits the request.

---

## Testing

Pure modules get vitest coverage as usual: scene parsing and validation, the
size mapping, id/parent resolution and cycle rejection, and each phase's
vocabulary parser. Renderers are verified in the browser against the reference
boards.

## Risks

- **Model compliance.** A richer schema is harder for small free models to emit
  correctly. The parser must degrade gracefully: unknown `type` falls back to
  `concept`, a missing `parent` is dropped rather than orphaning a node, and a
  malformed payload keeps the node but discards the payload.
- **Scope.** Phase 1 alone touches the AI schema, five new renderers and every
  AI entry point. It is not a single sitting.
