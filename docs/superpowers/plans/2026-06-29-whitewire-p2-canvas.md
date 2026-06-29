# WhiteWire P2 — Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed a persistent tldraw canvas into the project workspace with debounced DB autosave, local IndexedDB persistence, and one-click mess cleanup (tidy loose shapes + dagre graph layout for connected shapes).

**Architecture:** A new `canvas_docs` table (one row per project) stores the tldraw snapshot, accessed through an owner-scoped `canvas.repo`. Pure geometry functions in `core/canvas/cleanup.ts` compute tidy/graph-layout positions and are fully unit-tested without tldraw. tldraw itself is lazy-loaded (`next/dynamic`, `ssr:false`) inside a client `whiteboard-inner` component that loads the initial snapshot, sets a `persistenceKey`, debounce-autosaves via a server action, and runs cleanup by adapting editor state to/from the pure functions.

**Tech Stack:** Next.js 16, React 19, TypeScript, tldraw (SDK), @dagrejs/dagre, Drizzle ORM, Neon/PGlite, Vitest, pnpm.

---

## Existing context (P1, already built)

- `core/persistence/schema.ts` exports `users`, `projects`, types `Project`/`NewProject`. Uses `pgTable`, `text`, `uuid`, `timestamp` from `drizzle-orm/pg-core`.
- `core/persistence/projects.repo.ts` exports `export type Db = any;` plus repo fns. Reuse `Db`.
- `core/persistence/db.ts` exports `db` (Neon). `lib/auth.ts` exports `syncCurrentUser(database?)`.
- `tests/setup.ts` exports `client` (PGlite) + `testDb`, creates `users`+`projects` tables in `beforeAll`.
- `app/p/[projectId]/page.tsx` fetches the project (owner-scoped via `getProjectById`) and renders `<WorkspaceShell projectId={project.id} name={project.name} />`.
- `components/workspace/workspace-shell.tsx` renders header/tools/canvas-section/inspector/footer; the canvas `<section>` currently shows "Canvas coming in Phase 2".
- Server actions use the dynamic-import pattern (`const { db } = await import("@/core/persistence/db")`) to avoid `neon()` evaluating at module load in tests.

## File Structure (P2)

```
core/persistence/schema.ts          MODIFY: add canvasDocs table + jsonb import
core/persistence/canvas.repo.ts     CREATE: getCanvas / saveCanvas (owner-scoped, upsert)
core/canvas/cleanup.ts              CREATE: Box/Edge types, tidyShapes, layoutGraph, cleanup
app/p/[projectId]/canvas-actions.ts CREATE: saveCanvasAction server action
app/p/[projectId]/page.tsx          MODIFY: load snapshot, pass <Whiteboard/> into shell
components/workspace/workspace-shell.tsx  MODIFY: render children in canvas section
components/canvas/whiteboard.tsx     CREATE: dynamic(ssr:false) wrapper
components/canvas/whiteboard-inner.tsx CREATE: real tldraw + load + autosave + cleanup
components/canvas/use-autosave.ts    CREATE: createDebouncedSaver (pure) + useDebouncedSave hook
components/canvas/cleanup-adapter.ts CREATE: editor <-> Box/Edge adapter + applyCleanup
tests/setup.ts                       MODIFY: add canvas_docs DDL
tests/canvas.repo.test.ts           CREATE
tests/cleanup.test.ts               CREATE
tests/use-autosave.test.ts          CREATE
```

---

## Task 1: canvas_docs schema + repo (TDD)

**Files:**
- Modify: `core/persistence/schema.ts`
- Modify: `tests/setup.ts`
- Create: `core/persistence/canvas.repo.ts`
- Create: `tests/canvas.repo.test.ts`

- [ ] **Step 1: Add the `canvasDocs` table to `core/persistence/schema.ts`**

Add `jsonb` to the existing `drizzle-orm/pg-core` import, and append the table + types:
```ts
import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";

// ...existing users + projects tables unchanged...

export const canvasDocs = pgTable("canvas_docs", {
  projectId: uuid("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  snapshot: jsonb("snapshot").notNull().$type<Record<string, unknown>>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CanvasDoc = typeof canvasDocs.$inferSelect;
```

- [ ] **Step 2: Add the `canvas_docs` DDL to `tests/setup.ts`**

Inside the existing `beforeAll` `client.exec(...)` template string, append after the `projects` table:
```sql
    CREATE TABLE IF NOT EXISTS canvas_docs (
      project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      snapshot jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
```

- [ ] **Step 3: Write the failing test — `tests/canvas.repo.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { createProject } from "@/core/persistence/projects.repo";
import { getCanvas, saveCanvas } from "@/core/persistence/canvas.repo";

let projectId: string;

beforeEach(async () => {
  await client.exec("DELETE FROM canvas_docs; DELETE FROM projects; DELETE FROM users;");
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
  const p = await createProject(testDb, { ownerId: "u1", name: "Board" });
  projectId = p.id;
});

describe("canvas.repo", () => {
  it("returns undefined when no canvas saved", async () => {
    expect(await getCanvas(testDb, { projectId, ownerId: "u1" })).toBeUndefined();
  });

  it("saves then gets a snapshot (roundtrip)", async () => {
    await saveCanvas(testDb, { projectId, ownerId: "u1", snapshot: { a: 1 } });
    expect(await getCanvas(testDb, { projectId, ownerId: "u1" })).toEqual({ a: 1 });
  });

  it("upsert overwrites an existing snapshot", async () => {
    await saveCanvas(testDb, { projectId, ownerId: "u1", snapshot: { v: 1 } });
    await saveCanvas(testDb, { projectId, ownerId: "u1", snapshot: { v: 2 } });
    expect(await getCanvas(testDb, { projectId, ownerId: "u1" })).toEqual({ v: 2 });
  });

  it("does not return a canvas for a non-owner", async () => {
    await saveCanvas(testDb, { projectId, ownerId: "u1", snapshot: { a: 1 } });
    expect(await getCanvas(testDb, { projectId, ownerId: "intruder" })).toBeUndefined();
  });

  it("rejects saveCanvas from a non-owner", async () => {
    await expect(
      saveCanvas(testDb, { projectId, ownerId: "intruder", snapshot: { a: 1 } }),
    ).rejects.toThrow("Project not found");
  });

  it("cascade-deletes the canvas when the project is deleted", async () => {
    await saveCanvas(testDb, { projectId, ownerId: "u1", snapshot: { a: 1 } });
    await client.exec("DELETE FROM projects;");
    // canvas row gone (cascade) — getCanvas returns undefined (no project, no row)
    expect(await getCanvas(testDb, { projectId, ownerId: "u1" })).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test tests/canvas.repo.test.ts`
Expected: FAIL — `@/core/persistence/canvas.repo` not found.

- [ ] **Step 5: Implement `core/persistence/canvas.repo.ts`**

```ts
import { and, eq } from "drizzle-orm";
import { canvasDocs, projects } from "./schema";
import type { Db } from "./projects.repo";

export async function getCanvas(
  db: Db,
  input: { projectId: string; ownerId: string },
): Promise<Record<string, unknown> | undefined> {
  const [row] = await db
    .select({ snapshot: canvasDocs.snapshot })
    .from(canvasDocs)
    .innerJoin(projects, eq(canvasDocs.projectId, projects.id))
    .where(
      and(eq(canvasDocs.projectId, input.projectId), eq(projects.ownerId, input.ownerId)),
    );
  return row?.snapshot;
}

export async function saveCanvas(
  db: Db,
  input: { projectId: string; ownerId: string; snapshot: Record<string, unknown> },
): Promise<void> {
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)));
  if (!owned) throw new Error("Project not found");

  await db
    .insert(canvasDocs)
    .values({ projectId: input.projectId, snapshot: input.snapshot })
    .onConflictDoUpdate({
      target: canvasDocs.projectId,
      set: { snapshot: input.snapshot, updatedAt: new Date() },
    });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test tests/canvas.repo.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 7: Generate the migration + verify full suite + types**

Run: `pnpm db:generate` (creates a new `drizzle/0001_*.sql` for canvas_docs).
Run: `pnpm test` → all tests pass (P1 + 6 new).
Run: `pnpm exec tsc --noEmit` → clean.

- [ ] **Step 8: Commit**

```bash
git add core/persistence/schema.ts core/persistence/canvas.repo.ts tests/setup.ts tests/canvas.repo.test.ts drizzle/
git commit -m "feat: add canvas_docs table and owner-scoped canvas repo"
```

---

## Task 2: cleanup pure functions (TDD)

**Files:**
- Create: `core/canvas/cleanup.ts`
- Create: `tests/cleanup.test.ts`
- Modify: `package.json` (add `@dagrejs/dagre`)

- [ ] **Step 1: Install dagre**

```bash
pnpm add @dagrejs/dagre
pnpm add -D @types/dagre
```
(If `@types/dagre` fails to resolve against `@dagrejs/dagre`, skip it — `@dagrejs/dagre` ships its own types. Report which you used.)

- [ ] **Step 2: Write the failing test — `tests/cleanup.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { tidyShapes, layoutGraph, cleanup, type Box, type Edge } from "@/core/canvas/cleanup";

const box = (id: string, x: number, y: number): Box => ({ id, x, y, w: 100, h: 60 });

function overlaps(a: { x: number; y: number }, b: { x: number; y: number }, w = 100, h = 60) {
  return Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < h;
}

describe("tidyShapes", () => {
  it("returns a position for every box", () => {
    const boxes = [box("a", 13, 99), box("b", 200, 5), box("c", 7, 7), box("d", 60, 300)];
    const pos = tidyShapes(boxes);
    expect(Object.keys(pos).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("lays boxes on a grid with no overlaps and uniform spacing", () => {
    const boxes = [box("a", 0, 0), box("b", 5, 5), box("c", 10, 10), box("d", 15, 15)];
    const pos = tidyShapes(boxes, { gap: 20 });
    const ids = Object.keys(pos);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        expect(overlaps(pos[ids[i]], pos[ids[j]])).toBe(false);
    // 4 boxes -> 2 columns; column x positions are exactly two distinct values, evenly spaced
    const xs = [...new Set(Object.values(pos).map((p) => p.x))].sort((a, b) => a - b);
    expect(xs).toHaveLength(2);
    expect(xs[1] - xs[0]).toBe(100 + 20); // w + gap
  });

  it("is deterministic", () => {
    const boxes = [box("a", 0, 0), box("b", 5, 5), box("c", 10, 10)];
    expect(tidyShapes(boxes)).toEqual(tidyShapes(boxes));
  });
});

describe("layoutGraph", () => {
  it("places a child below its parent", () => {
    const boxes = [box("a", 0, 0), box("b", 999, 999)];
    const edges: Edge[] = [{ from: "a", to: "b" }];
    const pos = layoutGraph(boxes, edges);
    expect(pos.b.y).toBeGreaterThan(pos.a.y);
  });

  it("produces no overlapping nodes for a small tree", () => {
    const boxes = [box("a", 0, 0), box("b", 0, 0), box("c", 0, 0)];
    const edges: Edge[] = [{ from: "a", to: "b" }, { from: "a", to: "c" }];
    const pos = layoutGraph(boxes, edges);
    expect(overlaps(pos.b, pos.c)).toBe(false);
  });
});

describe("cleanup (router)", () => {
  it("uses graph layout when edges connect boxes", () => {
    const boxes = [box("a", 0, 0), box("b", 0, 0)];
    const pos = cleanup(boxes, [{ from: "a", to: "b" }]);
    expect(pos.b.y).toBeGreaterThan(pos.a.y);
  });

  it("falls back to tidy when there are no connecting edges", () => {
    const boxes = [box("a", 0, 0), box("b", 5, 5), box("c", 10, 10), box("d", 15, 15)];
    const pos = cleanup(boxes, []);
    const xs = [...new Set(Object.values(pos).map((p) => p.x))];
    expect(xs.length).toBeGreaterThan(1); // arranged into a grid, not stacked
  });

  it("ignores edges that reference unknown boxes", () => {
    const boxes = [box("a", 0, 0), box("b", 5, 5), box("c", 10, 10), box("d", 15, 15)];
    const pos = cleanup(boxes, [{ from: "a", to: "ghost" }]);
    // no valid connecting edge among boxes -> tidy grid
    const xs = [...new Set(Object.values(pos).map((p) => p.x))];
    expect(xs.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test tests/cleanup.test.ts`
Expected: FAIL — `@/core/canvas/cleanup` not found.

- [ ] **Step 4: Implement `core/canvas/cleanup.ts`**

```ts
import dagre from "@dagrejs/dagre";

export type Box = { id: string; x: number; y: number; w: number; h: number };
export type Edge = { from: string; to: string };
export type Positions = Record<string, { x: number; y: number }>;

/**
 * Arrange boxes into an even grid, ordered by current reading order (y then x).
 * Column count = ceil(sqrt(n)); cell size = max box size + gap. Deterministic.
 */
export function tidyShapes(boxes: Box[], opts: { gap?: number } = {}): Positions {
  const gap = opts.gap ?? 40;
  if (boxes.length === 0) return {};
  const cols = Math.ceil(Math.sqrt(boxes.length));
  const cellW = Math.max(...boxes.map((b) => b.w)) + gap;
  const cellH = Math.max(...boxes.map((b) => b.h)) + gap;
  const originX = Math.min(...boxes.map((b) => b.x));
  const originY = Math.min(...boxes.map((b) => b.y));

  const ordered = [...boxes].sort((a, b) => (a.y - b.y) || (a.x - b.x) || (a.id < b.id ? -1 : 1));
  const pos: Positions = {};
  ordered.forEach((b, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    pos[b.id] = { x: originX + col * cellW, y: originY + row * cellH };
  });
  return pos;
}

/** Layered top-down layout via dagre. Returns top-left positions (dagre gives centers). */
export function layoutGraph(
  boxes: Box[],
  edges: Edge[],
  opts: { rankGap?: number; nodeGap?: number } = {},
): Positions {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: opts.rankGap ?? 80, nodesep: opts.nodeGap ?? 60 });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(boxes.map((b) => b.id));
  for (const b of boxes) g.setNode(b.id, { width: b.w, height: b.h });
  for (const e of edges) if (ids.has(e.from) && ids.has(e.to)) g.setEdge(e.from, e.to);

  dagre.layout(g);

  const pos: Positions = {};
  for (const b of boxes) {
    const n = g.node(b.id);
    // dagre node x/y is the center; convert to top-left
    pos[b.id] = { x: Math.round(n.x - b.w / 2), y: Math.round(n.y - b.h / 2) };
  }
  return pos;
}

/** Graph layout when edges connect >=2 of the boxes; otherwise tidy grid. */
export function cleanup(boxes: Box[], edges: Edge[]): Positions {
  const ids = new Set(boxes.map((b) => b.id));
  const connecting = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  return connecting.length > 0 ? layoutGraph(boxes, connecting) : tidyShapes(boxes);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/cleanup.test.ts`
Expected: PASS (all). Run `pnpm exec tsc --noEmit` → clean.

- [ ] **Step 6: Commit**

```bash
git add core/canvas/cleanup.ts tests/cleanup.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add pure tidy + dagre graph cleanup functions"
```

---

## Task 3: Embed tldraw (dynamic, ssr:false) + load initial snapshot

**Files:**
- Create: `components/canvas/whiteboard.tsx`
- Create: `components/canvas/whiteboard-inner.tsx`
- Modify: `components/workspace/workspace-shell.tsx`
- Modify: `app/p/[projectId]/page.tsx`

- [ ] **Step 1: Install tldraw**

```bash
pnpm add tldraw
```
Report the installed tldraw version. The snapshot API below targets tldraw v3
(`getSnapshot`, `loadSnapshot` exported from `"tldraw"`). If the installed major
differs and these names are not exported, adapt to that version's snapshot API
(e.g. `editor.store.getStoreSnapshot()` / `store.loadSnapshot()`) and report the
adaptation. tldraw render is verified manually, so version-specific tweaks here
are expected and acceptable.

- [ ] **Step 2: Create the inner component — `components/canvas/whiteboard-inner.tsx`**

```tsx
"use client";

import { useCallback } from "react";
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from "tldraw";
import "tldraw/tldraw.css";

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export default function WhiteboardInner({ projectId, initial }: WhiteboardInnerProps) {
  const handleMount = useCallback(
    (editor: Editor) => {
      if (initial) {
        try {
          loadSnapshot(editor.store, initial as unknown as TLEditorSnapshot);
        } catch {
          // Corrupt/incompatible snapshot — start from the local persisted state instead.
        }
      }
      // expose getSnapshot for later tasks via a ref on the editor instance
      (editor as unknown as { __getSnapshot?: () => Record<string, unknown> }).__getSnapshot = () =>
        getSnapshot(editor.store) as unknown as Record<string, unknown>;
    },
    [initial],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={`ww-${projectId}`} onMount={handleMount} />
    </div>
  );
}
```

- [ ] **Step 3: Create the dynamic wrapper — `components/canvas/whiteboard.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";

const WhiteboardInner = dynamic(() => import("./whiteboard-inner"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
      Loading canvas…
    </div>
  ),
});

export type WhiteboardProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export function Whiteboard({ projectId, initial }: WhiteboardProps) {
  return <WhiteboardInner projectId={projectId} initial={initial} />;
}
```

- [ ] **Step 4: Let the workspace shell render a canvas child — `components/workspace/workspace-shell.tsx`**

Change the signature to accept `children` and render them in the canvas section
(replacing the "Canvas coming in Phase 2" text). Keep everything else identical:
```tsx
export function WorkspaceShell({
  projectId,
  name,
  children,
}: {
  projectId: string;
  name: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col" data-project-id={projectId}>
      <header className="flex h-12 items-center justify-between border-b px-4">
        <span className="font-medium">{name}</span>
        <span className="text-sm text-muted-foreground">Model: (set up in Settings)</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 border-r" aria-label="Tools" />
        <section className="relative flex-1 bg-muted/30">{children}</section>
        <aside className="w-72 border-l p-4" aria-label="Inspector">
          <p className="text-sm text-muted-foreground">Inspector</p>
        </aside>
      </div>
      <footer className="h-12 border-t flex items-center px-4 text-sm text-muted-foreground">
        AI command bar — Phase 3
      </footer>
    </div>
  );
}
```
Note: the canvas `<section>` is now `relative` so the absolutely-positioned tldraw fills it.

- [ ] **Step 5: Load the snapshot and render the canvas — `app/p/[projectId]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { db } from "@/core/persistence/db";
import { getProjectById } from "@/core/persistence/projects.repo";
import { getCanvas } from "@/core/persistence/canvas.repo";
import { syncCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { Whiteboard } from "@/components/canvas/whiteboard";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ownerId = await syncCurrentUser();
  const project = await getProjectById(db, { id: projectId, ownerId });
  if (!project) notFound();
  const initial = (await getCanvas(db, { projectId: project.id, ownerId })) ?? null;
  return (
    <WorkspaceShell projectId={project.id} name={project.name}>
      <Whiteboard projectId={project.id} initial={initial} />
    </WorkspaceShell>
  );
}
```

- [ ] **Step 6: Verify**

Run: `pnpm exec tsc --noEmit` → clean.
Run: `pnpm test` → all existing tests still pass (no new tests this task).
Run: `pnpm build` → succeeds; `/p/[projectId]` still listed. The tldraw bundle
must NOT appear in the landing/dashboard chunks (it is dynamically imported).

- [ ] **Step 7: Commit**

```bash
git add components/canvas/whiteboard.tsx components/canvas/whiteboard-inner.tsx components/workspace/workspace-shell.tsx "app/p/[projectId]/page.tsx" package.json pnpm-lock.yaml
git commit -m "feat: embed tldraw canvas with initial snapshot load"
```

---

## Task 4: Debounced autosave (TDD on the debouncer) + server action

**Files:**
- Create: `components/canvas/use-autosave.ts`
- Create: `tests/use-autosave.test.ts`
- Create: `app/p/[projectId]/canvas-actions.ts`
- Modify: `components/canvas/whiteboard-inner.tsx`

- [ ] **Step 1: Write the failing test — `tests/use-autosave.test.ts`**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncedSaver } from "@/components/canvas/use-autosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createDebouncedSaver", () => {
  it("saves once after the delay for rapid calls", () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 1500);
    saver({ v: 1 });
    saver({ v: 2 });
    saver({ v: 3 });
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ v: 3 });
  });

  it("does not save when the snapshot is unchanged since last save", () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 1000);
    saver({ v: 1 });
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
    saver({ v: 1 }); // identical content
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("saves again when content changes after a prior save", () => {
    const save = vi.fn();
    const saver = createDebouncedSaver(save, 1000);
    saver({ v: 1 });
    vi.advanceTimersByTime(1000);
    saver({ v: 2 });
    vi.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/use-autosave.test.ts`
Expected: FAIL — `createDebouncedSaver` not found.

- [ ] **Step 3: Implement `components/canvas/use-autosave.ts`**

```ts
"use client";

import { useMemo } from "react";

type Snapshot = Record<string, unknown>;

/** Framework-free debouncer: coalesces rapid calls, skips unchanged snapshots. */
export function createDebouncedSaver(
  save: (snapshot: Snapshot) => void | Promise<void>,
  delay = 1500,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSavedJson = "";
  let pending: Snapshot | null = null;

  return (snapshot: Snapshot) => {
    const json = JSON.stringify(snapshot);
    if (json === lastSavedJson) return;
    pending = snapshot;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      lastSavedJson = JSON.stringify(pending);
      void save(pending as Snapshot);
    }, delay);
  };
}

/** React wrapper: stable saver for the component lifetime. */
export function useDebouncedSaver(
  save: (snapshot: Snapshot) => void | Promise<void>,
  delay = 1500,
) {
  return useMemo(() => createDebouncedSaver(save, delay), [save, delay]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test tests/use-autosave.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create the server action — `app/p/[projectId]/canvas-actions.ts`**

```ts
"use server";

export async function saveCanvasAction(
  projectId: string,
  snapshot: Record<string, unknown>,
) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { saveCanvas } = await import("@/core/persistence/canvas.repo");
  const ownerId = await syncCurrentUser();
  await saveCanvas(db, { projectId, ownerId, snapshot });
}
```

- [ ] **Step 6: Wire autosave into `components/canvas/whiteboard-inner.tsx`**

Subscribe to user document changes and feed snapshots through the debouncer.
Replace the file with:
```tsx
"use client";

import { useCallback } from "react";
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { useDebouncedSaver } from "./use-autosave";
import { saveCanvasAction } from "@/app/p/[projectId]/canvas-actions";

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export default function WhiteboardInner({ projectId, initial }: WhiteboardInnerProps) {
  const saver = useDebouncedSaver(
    (snapshot) => saveCanvasAction(projectId, snapshot),
    1500,
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      if (initial) {
        try {
          loadSnapshot(editor.store, initial as unknown as TLEditorSnapshot);
        } catch {
          // Corrupt/incompatible snapshot — fall back to local persisted state.
        }
      }
      const unsub = editor.store.listen(
        () => {
          const snap = getSnapshot(editor.store) as unknown as Record<string, unknown>;
          saver(snap);
        },
        { source: "user", scope: "document" },
      );
      return () => unsub();
    },
    [initial, saver],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={`ww-${projectId}`} onMount={handleMount} />
    </div>
  );
}
```
Note: `editor.store.listen` returns an unsubscribe fn; returning it from
`onMount` lets tldraw clean it up. If the installed tldraw version's `listen`
filter options differ, adapt the `{ source, scope }` argument and report it.

- [ ] **Step 7: Verify**

Run: `pnpm exec tsc --noEmit` → clean.
Run: `pnpm test` → all pass (P1 + canvas.repo + cleanup + 3 autosave).
Run: `pnpm build` → succeeds.

- [ ] **Step 8: Commit**

```bash
git add components/canvas/use-autosave.ts tests/use-autosave.test.ts app/p/[projectId]/canvas-actions.ts components/canvas/whiteboard-inner.tsx
git commit -m "feat: debounced canvas autosave via server action"
```

---

## Task 5: Mess cleanup button (editor ↔ pure functions)

**Files:**
- Create: `components/canvas/cleanup-adapter.ts`
- Modify: `components/canvas/whiteboard-inner.tsx`

- [ ] **Step 1: Create `components/canvas/cleanup-adapter.ts`**

Adapts a tldraw `Editor` to the pure `cleanup` function and applies results.
```ts
import type { Editor, TLShape, TLShapeId } from "tldraw";
import { cleanup, type Box, type Edge } from "@/core/canvas/cleanup";

/** Reads selected shapes (or all page shapes if <2 selected), runs cleanup, applies positions. */
export function applyCleanup(editor: Editor) {
  const selected = editor.getSelectedShapes();
  const shapes: TLShape[] =
    selected.length >= 2 ? selected : editor.getCurrentPageShapes();

  const boxes: Box[] = [];
  const ids = new Set<TLShapeId>();
  for (const s of shapes) {
    if (s.type === "arrow") continue;
    const b = editor.getShapePageBounds(s.id);
    if (!b) continue;
    boxes.push({ id: s.id, x: b.x, y: b.y, w: b.w, h: b.h });
    ids.add(s.id);
  }
  if (boxes.length < 2) return; // nothing meaningful to arrange

  const edges: Edge[] = [];
  for (const s of shapes) {
    if (s.type !== "arrow") continue;
    // Arrow bindings: one binding per terminal (start/end) -> bound shape id.
    const bindings = editor.getBindingsFromShape(s.id, "arrow") as Array<{
      toId: TLShapeId;
      props: { terminal: "start" | "end" };
    }>;
    const start = bindings.find((b) => b.props.terminal === "start")?.toId;
    const end = bindings.find((b) => b.props.terminal === "end")?.toId;
    if (start && end && ids.has(start) && ids.has(end)) {
      edges.push({ from: start, to: end });
    }
  }

  const positions = cleanup(boxes, edges);
  editor.updateShapes(
    Object.entries(positions).map(([id, p]) => {
      const shape = editor.getShape(id as TLShapeId)!;
      return { id: id as TLShapeId, type: shape.type, x: p.x, y: p.y };
    }),
  );
}
```
Note: `getBindingsFromShape(arrowId, "arrow")` and the `terminal` prop are the
tldraw v3 binding API. If the installed version exposes bindings differently,
adapt this adapter (it is the only tldraw-coupled cleanup code) and report it.
The pure `cleanup()` is already tested, so only this adapter needs manual check.

- [ ] **Step 2: Add a cleanup button to `components/canvas/whiteboard-inner.tsx`**

Keep an editor ref so a button outside the tldraw component can call the adapter.
Replace the file with:
```tsx
"use client";

import { useCallback, useRef } from "react";
import { Tldraw, getSnapshot, loadSnapshot, type Editor, type TLEditorSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { useDebouncedSaver } from "./use-autosave";
import { applyCleanup } from "./cleanup-adapter";
import { saveCanvasAction } from "@/app/p/[projectId]/canvas-actions";

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export default function WhiteboardInner({ projectId, initial }: WhiteboardInnerProps) {
  const editorRef = useRef<Editor | null>(null);
  const saver = useDebouncedSaver(
    (snapshot) => saveCanvasAction(projectId, snapshot),
    1500,
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      if (initial) {
        try {
          loadSnapshot(editor.store, initial as unknown as TLEditorSnapshot);
        } catch {
          // Corrupt/incompatible snapshot — fall back to local persisted state.
        }
      }
      const unsub = editor.store.listen(
        () => saver(getSnapshot(editor.store) as unknown as Record<string, unknown>),
        { source: "user", scope: "document" },
      );
      return () => unsub();
    },
    [initial, saver],
  );

  return (
    <div className="absolute inset-0">
      <Tldraw persistenceKey={`ww-${projectId}`} onMount={handleMount} />
      <button
        type="button"
        onClick={() => editorRef.current && applyCleanup(editorRef.current)}
        className="absolute right-4 top-4 z-10 rounded-md bg-black px-3 py-1.5 text-sm text-white shadow"
      >
        Tidy up
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit` → clean.
Run: `pnpm test` → all pass.
Run: `pnpm build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/canvas/cleanup-adapter.ts components/canvas/whiteboard-inner.tsx
git commit -m "feat: add mess-cleanup (Tidy up) button wired to layout functions"
```

---

## Task 6: Manual end-to-end verification

**Files:** none (verification only). Requires the running app with real
`.env.local` (Neon + Clerk already configured from P1/Clerk setup).

- [ ] **Step 1: Apply the new migration to Neon**

Run: `pnpm db:migrate`
Expected: `canvas_docs` table created (0001 migration applied).

- [ ] **Step 2: Run the app**

Run: `pnpm dev` (or `npm run dev`).

- [ ] **Step 3: Verify canvas behavior**

Sign in, open a project, then confirm:
- The tldraw canvas loads inside the workspace (watermark present; expected).
- Draw a few shapes; wait ~2s. Reload the page → shapes persist (loaded from DB).
- Open the same project in a fresh browser/incognito (same account) → shapes
  appear (proves DB autosave, not just local IndexedDB).
- Draw 4 loose rectangles, click **Tidy up** → they snap into an even grid.
- Draw 3 rectangles, connect them with arrows (a→b, a→c), select all, click
  **Tidy up** → they lay out as a top-down tree (a above b/c, no overlap).
- Delete the project from the dashboard → its canvas row is gone (cascade); no
  errors.

- [ ] **Step 4: Production build sanity**

Run: `pnpm build`
Expected: succeeds; tldraw is in a dynamic chunk, not the main/dashboard bundle.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: P2 canvas end-to-end verification fixes"
```

---

## Self-Review

**Spec coverage:**
- canvas_docs table + owner-scoped repo (spec §4, §5) → Task 1.
- Pure tidy + dagre graph + router (spec §6) → Task 2.
- tldraw embed, dynamic ssr:false, persistenceKey, load initial (spec §2, §7, §9) → Task 3.
- Debounced autosave + server action (spec §7, §8) → Task 4.
- Cleanup button wiring editor ↔ pure fns (spec §7) → Task 5.
- Testing strategy (spec §10): repo PGlite tests (Task 1), cleanup unit tests
  (Task 2), debouncer unit tests (Task 4), manual canvas verification (Task 6).
- Build phases (spec §11) map 1:1 to Tasks 1–6.

**Placeholder scan:** No TBD/"add error handling" placeholders; all code steps
contain full code. tldraw/dagre version-adaptation notes are explicit fallbacks
(the API surface is the one browser/version-sensitive area, verified manually),
not vague placeholders.

**Type consistency:** `Box`/`Edge`/`Positions` and `tidyShapes`/`layoutGraph`/
`cleanup` signatures are identical across Task 2 (definition), its tests, and the
Task 5 adapter. `getCanvas`/`saveCanvas` signatures match across Task 1 (def),
its tests, the Task 4 server action, and the Task 3 page. `Db` is imported from
`projects.repo` (consistent with P1). `WhiteboardInner` props (`projectId`,
`initial`) are stable across Tasks 3–5. `WorkspaceShell` gains an optional
`children` prop without breaking its P1 `projectId`/`name` usage.
