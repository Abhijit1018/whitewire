# WhiteWire P4 — AI Objects + Linked Artifacts Design Spec

Date: 2026-06-30
Status: Approved (design level)
Builds on: P1 (shell/auth/DB), P2 (canvas), P3 (BYO-LLM + AI Node + Expand).

## 1. Scope

Make the workspace inspector come alive. Selecting an AI Node shows its detail,
**kind-aware generator buttons** (Schema / API / UI / Docs) that produce **linked
artifacts** with **staleness** tracking, and **text attachments** (notes, links,
comments, code snippets). The artifacts page lists all generated artifacts for a
project. File upload is explicitly deferred to a follow-on phase (P4b) and only
adds a new attachment type backed by blob storage.

### Goals
- Generate artifacts from an AI Node via the user's active model (BYO-LLM, P3).
- Store each artifact linked to its source node + a hash of the source text.
- Show a "stale" badge when the source node text changed since generation;
  regenerate on demand. No auto-regeneration.
- Text attachments per node: note, link, comment, snippet.
- Artifacts page: all project artifacts grouped by source node.

### Non-Goals (later)
- **File upload** (needs blob storage) — P4b, added as another attachment type.
- Auto-regeneration / bidirectional sync — staleness is the chosen model.
- Orphan-artifact cleanup when a node is deleted — page tolerates missing nodes.
- Specialized agents (P5), versioning (P6).

## 2. Locked Decisions

- **Sync model = staleness (A):** artifact stores `sourceHash`; inspector compares
  it to the current node text's hash and flags stale; user regenerates manually.
- **Generators (A+B):** all four generators exist; the inspector surfaces the
  kind-relevant ones first and the rest under "More".
- **Attachments:** note / link / comment / snippet — all text, one table. File
  upload is P4b.

## 3. Tech Decisions

| Concern | Choice | Reason |
|---------|--------|--------|
| Shared selection state | Zustand (install now) | Canvas (client) and inspector (client) share the selected node without a page refresh; matches master-spec plan |
| Generation | Reuse P3 `resolveModel` + `generateNode` | Owner-scoped active model already solved |
| Persistence | New `artifacts` + `attachments` tables + owner-scoped repos | Same `canvas.repo` join-on-`projects.ownerId` pattern |
| Source hash | Pure FNV-1a hex (`hashSource`) usable on client AND server | Inspector computes staleness client-side; server stores the same hash |

## 4. Data Model (new tables)

```
artifacts: {
  id           uuid PK default random
  projectId    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  sourceNodeId text NOT NULL                 // tldraw shape id of the source AI Node
  type         text NOT NULL                 // 'schema' | 'api' | 'ui' | 'docs'
  content      text NOT NULL                 // generated artifact (code/markdown)
  sourceHash   text NOT NULL                 // hashSource(node text) at generation time
  createdAt    timestamptz NOT NULL default now()
  updatedAt    timestamptz NOT NULL default now()
  UNIQUE (projectId, sourceNodeId, type)     // one artifact per node+type → upsert
}

attachments: {
  id           uuid PK default random
  projectId    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  sourceNodeId text NOT NULL
  type         text NOT NULL                 // 'note' | 'link' | 'comment' | 'snippet'
  content      text NOT NULL
  createdAt    timestamptz NOT NULL default now()
}
```

`sourceNodeId` is a tldraw shape id (lives in the canvas snapshot, not a FK). All
repo access is owner-scoped by joining `projects` on `ownerId`.

## 5. Module Boundaries

```
core/artifacts/hash.ts              hashSource(text): string  (FNV-1a hex) — PURE, tested
core/artifacts/kinds.ts             generatorsForKind(kind): { primary: GenType[]; all: GenType[] } — PURE, tested
core/ai/artifact-prompts.ts         buildArtifactPrompt(type: GenType, nodeText: string): string — PURE, tested
core/persistence/artifacts.repo.ts  upsertArtifact / listArtifactsByNode / listArtifactsByProject — owner-scoped
core/persistence/attachments.repo.ts addAttachment / listAttachmentsByNode / deleteAttachment — owner-scoped
core/state/workspace-store.ts       zustand store: selection state
app/p/[projectId]/artifact-actions.ts    generateArtifactAction / listNodeArtifactsAction
app/p/[projectId]/attachment-actions.ts  addAttachmentAction / listNodeAttachmentsAction / deleteAttachmentAction
components/workspace/inspector.tsx       client; node detail + generators + artifacts + attachments
components/canvas/whiteboard-inner.tsx   selection listener writes to workspace-store
components/workspace/workspace-shell.tsx renders <Inspector/> in the aside
app/artifacts/page.tsx                   real: project artifacts grouped by source node
```

`GenType = 'schema' | 'api' | 'ui' | 'docs'`.

## 6. Pure Helpers

- `hashSource(text)`: FNV-1a 32-bit, returned as hex. Deterministic, stable,
  changes when text changes. Same function used client (staleness compare) and
  server (stored at generation).
- `generatorsForKind(kind)`: returns `{ primary, all }`.
  - `component` → primary `['ui','docs']`
  - `feature`   → primary `['api','schema','docs']`
  - `idea`      → primary `['docs']`
  - default/`generic` → primary `['schema','api','ui','docs']`
  - `all` is always `['schema','api','ui','docs']`.
- `buildArtifactPrompt(type, nodeText)`: per-type instruction. schema → SQL DDL;
  api → REST endpoint list; ui → a React component; docs → concise markdown.
  Each prompt embeds `nodeText` and asks for only the artifact content.

## 7. Repositories (owner-scoped)

`Db` reused from `projects.repo`. All take `ownerId` and verify project ownership
via a join on `projects` (matching `canvas.repo`).

- `upsertArtifact(db, { ownerId, projectId, sourceNodeId, type, content, sourceHash })`
  — verifies project ownership, upserts on `(projectId, sourceNodeId, type)`,
  bumps `updatedAt`. Returns the artifact row.
- `listArtifactsByNode(db, { ownerId, projectId, sourceNodeId })` → `Artifact[]`.
- `listArtifactsByProject(db, { ownerId, projectId })` → `Artifact[]`.
- `addAttachment(db, { ownerId, projectId, sourceNodeId, type, content })` →
  `Attachment` (verifies ownership).
- `listAttachmentsByNode(db, { ownerId, projectId, sourceNodeId })` → `Attachment[]`.
- `deleteAttachment(db, { ownerId, id })` — owner-scoped delete.

## 8. State (zustand)

`core/state/workspace-store.ts`:
```
{ selectedNodeId: string | null;
  selectedNodeText: string;
  selectedNodeKind: string;
  setSelection(sel: { id: string | null; text: string; kind: string }): void; }
```
`whiteboard-inner` updates it from the selection listener (replacing its local
`selectedAiNodeId` state; the Expand button reads `selectedNodeId` from the store).
The inspector reads the store reactively.

## 9. Data Flow

1. **Selection:** node selected → whiteboard-inner writes `{id,text,kind}` to store.
2. **Inspector load:** on `selectedNodeId` change → `listNodeArtifactsAction` +
   `listNodeAttachmentsAction` (owner-scoped) → local component state.
3. **Generate:** click a generator → `generateArtifactAction(projectId, nodeId,
   type, currentText)` → `resolveModel` → `buildArtifactPrompt` → `generateNode`
   → `upsertArtifact` with `hashSource(currentText)` → re-fetch artifacts.
4. **Staleness:** for each artifact, `hashSource(currentNodeText) !== sourceHash`
   → show "stale" + Regenerate (same action overwrites).
5. **Attachments:** add `{type, content}` → `addAttachmentAction` → re-fetch;
   delete → `deleteAttachmentAction` → re-fetch.
6. **Artifacts page:** server `listArtifactsByProject` (owner-scoped), grouped by
   `sourceNodeId`; shows type, snippet, updatedAt.

## 10. Error Handling

- Generation errors (no active model, provider failure) surface inline in the
  inspector (same pattern as the P3 command bar).
- Server actions resolve `ownerId` via `syncCurrentUser()`; repos reject
  cross-tenant access (return empty / throw on ownership failure).
- A selected shape that is not an `ai-node` shows the empty inspector state.

## 11. Testing

- `hash.ts` (unit): deterministic; same input → same hash; different input →
  different hash.
- `kinds.ts` (unit): `generatorsForKind` per kind returns expected primary/all.
- `artifact-prompts.ts` (unit): each `GenType` prompt contains the node text and
  type-appropriate intent (e.g. schema → "SQL").
- `artifacts.repo` (PGlite): upsert overwrites same node+type; owner-scoping on
  every fn; `listByNode`/`listByProject`; cascade delete with project.
- `attachments.repo` (PGlite): add/list/delete; owner-scoping; cascade.
- Inspector UI, generation round-trip, zustand wiring, artifacts page → manual.

## 12. Build Phases

1. `artifacts` + `attachments` schema + repos (TDD) + migration.
2. Pure helpers: `hash`, `kinds`, `artifact-prompts` (TDD).
3. Zustand store + rewire `whiteboard-inner` selection (and Expand) to the store.
4. Artifact + attachment server actions.
5. Inspector component (detail + kind-aware generators + artifacts + staleness +
   text attachments).
6. Artifacts page (grouped list, tolerant of deleted nodes).
7. Manual end-to-end verification.

## 13. Risks

- **Orphaned artifacts** when a node is deleted (artifacts key on shape id, not a
  FK). The artifacts page tolerates missing nodes; orphan cleanup is later polish.
- **Zustand vs canvas remount:** the store is a module singleton and the inspector
  fetches its own data via actions (no `router.refresh`), so the tldraw canvas is
  never remounted by inspector activity.
- **Generated content size** in `text` columns: fine for P4 single-user scale.
