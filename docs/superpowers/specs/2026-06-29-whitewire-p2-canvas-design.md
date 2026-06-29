# WhiteWire P2 — Canvas Design Spec

Date: 2026-06-29
Status: Approved (design level)
Builds on: P1 (shell + auth + DB), 2026-06-28-whitewire-design.md

## 1. Scope

Embed the tldraw canvas into the project workspace, persist each project's
board durably and locally, and provide "mess cleanup" (tidy loose shapes +
graph layout for connected shapes). No AI objects yet — those arrive in P3.

### Goals
- Real, usable infinite canvas inside `/p/[projectId]`.
- Board survives reload (local IndexedDB + durable DB) and moves across devices.
- One-click cleanup: tidy loose shapes; dagre graph layout when arrows connect them.
- Keep the app fast: tldraw is lazy-loaded only on the workspace route.

### Non-Goals (later phases)
- AI Objects / semantic shapes (P3+).
- Real-time multiplayer (P7).
- Removing the tldraw watermark (business license obtained pre-launch, not now).

## 2. Tech Decisions

| Concern | Choice | Reason |
|---------|--------|--------|
| Canvas lib | tldraw SDK (with watermark) | Best for custom AI shapes later; license pre-launch |
| Loading | dynamic import, `ssr: false` | tldraw is heavy; lazy-load keeps landing/dashboard fast |
| Local persistence | tldraw `persistenceKey={projectId}` (IndexedDB) | Free crash recovery / instant reload |
| Durable persistence | `canvas_docs` table + debounced autosave (~1.5s idle) | Cross-device, durable, Figma-like UX |
| Cleanup | dagre (graph layout) + pure tidy (align/distribute/grid-snap) | Covers loose and connected shapes |

## 3. Module Boundaries (extends P1, no restructure)

```
core/persistence/schema.ts          + canvasDocs table
core/persistence/canvas.repo.ts     getCanvas / saveCanvas (upsert), owner-scoped
core/canvas/cleanup.ts              PURE: tidyShapes(boxes) + layoutGraph(boxes, edges)
app/p/[projectId]/canvas-actions.ts saveCanvasAction (server action)
components/canvas/whiteboard.tsx     client; dynamic tldraw, persistenceKey, load+autosave+cleanup
components/canvas/use-autosave.ts    debounced autosave hook
```

The workspace shell's placeholder ("Canvas coming in Phase 2") is replaced by
`<Whiteboard projectId={...} name={...} initial={snapshot} />`.

## 4. Data Model

```
canvasDocs: {
  projectId  uuid  PRIMARY KEY  REFERENCES projects(id) ON DELETE CASCADE
  snapshot   jsonb NOT NULL                 // tldraw store snapshot
  updatedAt  timestamptz NOT NULL DEFAULT now()
}
```

One row per project (projectId is the PK → natural upsert target). Deleting a
project cascades to its canvas.

## 5. Persistence Layer (`canvas.repo.ts`)

All functions take an injectable `db` (PGlite in tests, Neon at runtime), same
pattern as P1 repos.

- `getCanvas(db, { projectId, ownerId })`: returns the snapshot only if the
  project is owned by `ownerId` (join/verify against `projects`). Returns
  `undefined` when no canvas saved yet or not owned.
- `saveCanvas(db, { projectId, ownerId, snapshot })`: verifies ownership, then
  upserts the row (`ON CONFLICT (projectId) DO UPDATE SET snapshot, updatedAt`).
  Returns void; throws if the project is not owned by `ownerId`.

## 6. Cleanup Logic (`core/canvas/cleanup.ts`) — the testable core

Pure functions over plain geometry, **no tldraw import**, so they are fully unit
testable. `whiteboard.tsx` adapts tldraw editor state to/from these types.

```ts
type Box = { id: string; x: number; y: number; w: number; h: number };
type Edge = { from: string; to: string };

// Align to a grid + distribute evenly; deterministic.
function tidyShapes(boxes: Box[], opts?: { gap?: number }): Record<string, { x: number; y: number }>;

// Layered top-down layout via dagre; parents above children, no overlap.
function layoutGraph(boxes: Box[], edges: Edge[], opts?: { rankGap?: number; nodeGap?: number }): Record<string, { x: number; y: number }>;

// Chooses layoutGraph when edges connect >=2 of the boxes, else tidyShapes.
function cleanup(boxes: Box[], edges: Edge[]): Record<string, { x: number; y: number }>;
```

Returns a map of shape id → new top-left position. The caller applies positions
via `editor.updateShapes`.

## 7. Canvas Component (`whiteboard.tsx`)

- Client component; tldraw imported dynamically with `ssr: false`.
- Props: `projectId`, `name`, `initial` (snapshot | null).
- On mount: load `initial` into the store if present; set
  `persistenceKey={projectId}` for local IndexedDB.
- On store change: call `use-autosave` (debounced 1.5s) → `saveCanvasAction`.
- Cleanup button (in the workspace tools/top bar): reads selected shapes (or all
  shapes if none selected) + their connecting arrow bindings, maps to `Box[]` /
  `Edge[]`, calls `cleanup(...)`, applies results via `editor.updateShapes`.

## 8. Autosave (`use-autosave.ts`)

- Debounce (~1500ms) the latest snapshot; on settle, call the server action.
- Skip save if snapshot unchanged since last successful save.
- Swallow/last-write-wins on transient errors (no multiplayer in P2); surface a
  small "saving…/saved" indicator is optional polish, not required.

## 9. Data Flow

1. Workspace page (server) fetches `getCanvas(db, { projectId, ownerId })`.
2. Passes snapshot to `<Whiteboard initial={snapshot} />`.
3. tldraw mounts with snapshot (or empty) + `persistenceKey` (local IndexedDB).
4. Edits → debounced 1.5s → `saveCanvasAction(projectId, snapshot)` → upsert DB.
5. Cleanup button → editor shapes → `cleanup()` → `editor.updateShapes`.

## 10. Testing

- `cleanup.ts` (Vitest, pure):
  - `tidyShapes`: equal gaps, aligned rows; deterministic positions.
  - `layoutGraph`: parent ranks above children; no two nodes overlap; stable.
  - `cleanup`: routes to graph layout when edges connect boxes, else tidy.
- `canvas.repo.ts` (Vitest + PGlite): save→get roundtrip; upsert overwrites;
  `getCanvas`/`saveCanvas` reject non-owner; cascade delete with project.
- tldraw rendering / drag / persistence: manual browser verification.

## 11. Build Phases (additive)

1. `canvasDocs` schema + migration + `canvas.repo` (TDD).
2. `cleanup.ts` pure functions (TDD: tidy, graph, router).
3. `whiteboard.tsx` — embed tldraw (dynamic, ssr:false), load initial, persistenceKey.
4. autosave hook + `saveCanvasAction` wire-up.
5. cleanup button wiring (editor ↔ cleanup fns).
6. Manual verification (draw, reload persists locally + in DB, cleanup tidies + lays out graph).

## 12. Risks

- **tldraw store snapshot API/version drift** — pin the tldraw version; isolate
  all tldraw calls inside `whiteboard.tsx` so the rest of the app is insulated.
- **Snapshot size in jsonb** — fine for P2 (single user, modest boards); revisit
  if boards grow huge (chunking/compression is a later concern).
- **Autosave races** — last-write-wins is acceptable in P2 (no multiplayer);
  the test suite covers repo correctness, not concurrent writers.
- **dagre dependency size** — small; runs client-side only inside cleanup path.
