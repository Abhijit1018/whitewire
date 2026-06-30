# WhiteWire P4 — AI Objects + Linked Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the workspace inspector alive — select an AI Node to see its detail, generate linked artifacts (Schema/API/UI/Docs) via the user's model with staleness tracking, and attach notes/links/comments/snippets; list all artifacts on the artifacts page.

**Architecture:** New `artifacts` + `attachments` tables with owner-scoped repos (canvas.repo join pattern). Pure, unit-tested helpers carry the logic: `hashSource` (FNV-1a, same on client+server for staleness), `generatorsForKind` (kind→generator list), `buildArtifactPrompt`. A zustand store shares the selected node between the canvas and a new client Inspector; the inspector fetches its own data via server actions (no page refresh, canvas undisturbed). P3's `resolveModel` is extracted to a shared server module reused by command-bar, expand, and artifact generation.

**Tech Stack:** Next.js 16, React 19, TypeScript, zustand, Vercel AI SDK v7, tldraw v5, Drizzle/Neon/PGlite, Vitest, pnpm.

## Global Constraints

- Owner-scoping on every artifact/attachment repo function (verify via `projects.ownerId`), exactly like `core/persistence/canvas.repo.ts`.
- Server actions resolve `ownerId` from `syncCurrentUser()` server-side; never trust a client-supplied owner.
- Server action files (`"use server"`) use the dynamic-import pattern (`const { db } = await import("@/core/persistence/db")`) so `neon()` doesn't evaluate at module load during tests.
- Vitest runs with `fileParallelism: false` (already set) — do not change.
- `GenType = 'schema' | 'api' | 'ui' | 'docs'`. Attachment type = `'note' | 'link' | 'comment' | 'snippet'`.

---

## Existing context (P1–P3)

- `core/persistence/schema.ts` exports `users`, `projects`, `canvasDocs`, `apiKeys`, `userSettings`; imports `pgTable, text, uuid, timestamp, jsonb` from `drizzle-orm/pg-core`.
- `core/persistence/projects.repo.ts` exports `export type Db = any;` and `getProjectById(db,{id,ownerId})`.
- `core/persistence/canvas.repo.ts` is the owner-scoped repo pattern to copy (join `projects` on `ownerId`).
- `tests/setup.ts` exports `client` (PGlite) + `testDb`; `beforeAll` DDL covers users/projects/canvas_docs/api_keys/user_settings; a test `ENCRYPTION_KEY` is set.
- `core/persistence/users.repo.ts` exports `ensureUser`. `core/ai/generate.ts` exports `generateNode(model, prompt)`. `core/ai/providers.ts` exports `buildModel`. `core/ai/keys.repo.ts` exports `getDecryptedKey`. `core/ai/settings.repo.ts` exports `getSettings`. `lib/auth.ts` exports `syncCurrentUser`.
- `app/p/[projectId]/ai-actions.ts` ("use server") has a module-internal `resolveModel(projectId)` returning a model, plus `commandGenerateAction` and `expandAction`.
- `components/canvas/whiteboard-inner.tsx` tracks selection in local `selectedAiNodeId` state via a `session`-scope `editor.store.listen`, passes it to `<ExpandButton>`, and returns both unsubscribers from `onMount`. The `ai-node` shape has props `{w,h,text,kind,purpose,model}`.
- `components/canvas/expand-button.tsx` takes `selectedAiNodeId` prop.
- `components/workspace/workspace-shell.tsx` (server) renders an aside with a placeholder "Inspector". `app/artifacts/page.tsx` is a P1 placeholder.

## File Structure (P4)

```
core/persistence/schema.ts            + artifacts, attachments tables + types
core/persistence/artifacts.repo.ts    upsertArtifact / listArtifactsByNode / listArtifactsByProject / listArtifactsByOwner
core/persistence/attachments.repo.ts  addAttachment / listAttachmentsByNode / deleteAttachment
core/artifacts/hash.ts                hashSource — PURE
core/artifacts/kinds.ts               GenType + generatorsForKind — PURE
core/ai/artifact-prompts.ts           buildArtifactPrompt — PURE
core/ai/resolve-model.ts              resolveModel (extracted, server-only, returns {model, ownerId})
core/state/workspace-store.ts         zustand selection store
app/p/[projectId]/ai-actions.ts       MODIFY: use shared resolveModel
app/p/[projectId]/artifact-actions.ts generateArtifactAction / listNodeArtifactsAction
app/p/[projectId]/attachment-actions.ts addAttachmentAction / listNodeAttachmentsAction / deleteAttachmentAction
components/canvas/whiteboard-inner.tsx MODIFY: selection → store
components/workspace/inspector.tsx     client inspector
components/workspace/workspace-shell.tsx MODIFY: render <Inspector/>
app/artifacts/page.tsx                MODIFY: real grouped list
tests/artifacts.repo.test.ts, tests/attachments.repo.test.ts, tests/hash.test.ts, tests/kinds.test.ts, tests/artifact-prompts.test.ts
```

---

## Task 1: artifacts + attachments schema + repos (TDD)

**Files:**
- Modify: `core/persistence/schema.ts`, `tests/setup.ts`
- Create: `core/persistence/artifacts.repo.ts`, `core/persistence/attachments.repo.ts`
- Create: `tests/artifacts.repo.test.ts`, `tests/attachments.repo.test.ts`

**Interfaces:**
- Consumes: `Db` from `projects.repo`; `projects` from schema; `ensureUser`, `createProject`, `testDb`, `client`.
- Produces:
  - `artifacts`, `attachments` tables; types `Artifact`, `Attachment`.
  - `upsertArtifact(db, { ownerId, projectId, sourceNodeId, type, content, sourceHash }): Promise<Artifact>`
  - `listArtifactsByNode(db, { ownerId, projectId, sourceNodeId }): Promise<Artifact[]>`
  - `listArtifactsByProject(db, { ownerId, projectId }): Promise<Artifact[]>`
  - `listArtifactsByOwner(db, ownerId): Promise<(Artifact & { projectName: string })[]>`
  - `addAttachment(db, { ownerId, projectId, sourceNodeId, type, content }): Promise<Attachment>`
  - `listAttachmentsByNode(db, { ownerId, projectId, sourceNodeId }): Promise<Attachment[]>`
  - `deleteAttachment(db, { ownerId, id }): Promise<void>`

- [ ] **Step 1: Add tables to `core/persistence/schema.ts`**

Change the `drizzle-orm/pg-core` import to add `unique`, then append:
```ts
import { pgTable, text, uuid, timestamp, jsonb, unique } from "drizzle-orm/pg-core";

// ...existing tables...

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    sourceNodeId: text("source_node_id").notNull(),
    type: text("type").notNull(),
    content: text("content").notNull(),
    sourceHash: text("source_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("artifacts_node_type_unique").on(t.projectId, t.sourceNodeId, t.type)],
);

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  sourceNodeId: text("source_node_id").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Artifact = typeof artifacts.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
```

- [ ] **Step 2: Add DDL to `tests/setup.ts`** (inside the `beforeAll` `client.exec` template, after user_settings)

```sql
    CREATE TABLE IF NOT EXISTS artifacts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      source_node_id text NOT NULL,
      type text NOT NULL,
      content text NOT NULL,
      source_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (project_id, source_node_id, type)
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      source_node_id text NOT NULL,
      type text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
```

- [ ] **Step 3: Write failing test — `tests/artifacts.repo.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { createProject } from "@/core/persistence/projects.repo";
import {
  upsertArtifact,
  listArtifactsByNode,
  listArtifactsByProject,
  listArtifactsByOwner,
} from "@/core/persistence/artifacts.repo";

let projectId: string;

beforeEach(async () => {
  await client.exec(
    "DELETE FROM attachments; DELETE FROM artifacts; DELETE FROM canvas_docs; DELETE FROM user_settings; DELETE FROM api_keys; DELETE FROM projects; DELETE FROM users;",
  );
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
  await ensureUser(testDb, { id: "u2", email: "c@d.com" });
  const p = await createProject(testDb, { ownerId: "u1", name: "Proj" });
  projectId = p.id;
});

describe("artifacts.repo", () => {
  it("upserts then lists by node", async () => {
    await upsertArtifact(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "docs", content: "v1", sourceHash: "h1" });
    const list = await listArtifactsByNode(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1" });
    expect(list).toHaveLength(1);
    expect(list[0].content).toBe("v1");
  });

  it("upsert overwrites same (node,type)", async () => {
    await upsertArtifact(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "docs", content: "v1", sourceHash: "h1" });
    await upsertArtifact(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "docs", content: "v2", sourceHash: "h2" });
    const list = await listArtifactsByNode(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1" });
    expect(list).toHaveLength(1);
    expect(list[0].content).toBe("v2");
    expect(list[0].sourceHash).toBe("h2");
  });

  it("keeps different types as separate rows", async () => {
    await upsertArtifact(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "docs", content: "d", sourceHash: "h" });
    await upsertArtifact(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "schema", content: "s", sourceHash: "h" });
    expect(await listArtifactsByNode(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1" })).toHaveLength(2);
  });

  it("rejects upsert for a non-owner", async () => {
    await expect(
      upsertArtifact(testDb, { ownerId: "u2", projectId, sourceNodeId: "n1", type: "docs", content: "x", sourceHash: "h" }),
    ).rejects.toThrow("Project not found");
  });

  it("does not list another owner's artifacts", async () => {
    await upsertArtifact(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "docs", content: "v", sourceHash: "h" });
    expect(await listArtifactsByProject(testDb, { ownerId: "u2", projectId })).toHaveLength(0);
  });

  it("listArtifactsByOwner includes project name", async () => {
    await upsertArtifact(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "docs", content: "v", sourceHash: "h" });
    const rows = await listArtifactsByOwner(testDb, "u1");
    expect(rows).toHaveLength(1);
    expect(rows[0].projectName).toBe("Proj");
  });

  it("cascade-deletes artifacts with the project", async () => {
    await upsertArtifact(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "docs", content: "v", sourceHash: "h" });
    await client.exec("DELETE FROM projects;");
    expect(await listArtifactsByOwner(testDb, "u1")).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Run → FAIL** (`@/core/persistence/artifacts.repo` not found). `pnpm test tests/artifacts.repo.test.ts`. Report.

- [ ] **Step 5: Implement `core/persistence/artifacts.repo.ts`**

```ts
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { artifacts, projects, type Artifact } from "./schema";
import type { Db } from "./projects.repo";

async function assertOwns(db: Db, projectId: string, ownerId: string) {
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  if (!owned) throw new Error("Project not found");
}

export async function upsertArtifact(
  db: Db,
  input: { ownerId: string; projectId: string; sourceNodeId: string; type: string; content: string; sourceHash: string },
): Promise<Artifact> {
  await assertOwns(db, input.projectId, input.ownerId);
  const [row] = await db
    .insert(artifacts)
    .values({
      projectId: input.projectId,
      sourceNodeId: input.sourceNodeId,
      type: input.type,
      content: input.content,
      sourceHash: input.sourceHash,
    })
    .onConflictDoUpdate({
      target: [artifacts.projectId, artifacts.sourceNodeId, artifacts.type],
      set: { content: input.content, sourceHash: input.sourceHash, updatedAt: new Date() },
    })
    .returning();
  return row;
}

export async function listArtifactsByNode(
  db: Db,
  input: { ownerId: string; projectId: string; sourceNodeId: string },
): Promise<Artifact[]> {
  return db
    .select(getTableColumns(artifacts))
    .from(artifacts)
    .innerJoin(projects, eq(artifacts.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, input.ownerId),
        eq(artifacts.projectId, input.projectId),
        eq(artifacts.sourceNodeId, input.sourceNodeId),
      ),
    )
    .orderBy(artifacts.type);
}

export async function listArtifactsByProject(
  db: Db,
  input: { ownerId: string; projectId: string },
): Promise<Artifact[]> {
  return db
    .select(getTableColumns(artifacts))
    .from(artifacts)
    .innerJoin(projects, eq(artifacts.projectId, projects.id))
    .where(and(eq(projects.ownerId, input.ownerId), eq(artifacts.projectId, input.projectId)))
    .orderBy(desc(artifacts.updatedAt));
}

export async function listArtifactsByOwner(
  db: Db,
  ownerId: string,
): Promise<(Artifact & { projectName: string })[]> {
  return db
    .select({ ...getTableColumns(artifacts), projectName: projects.name })
    .from(artifacts)
    .innerJoin(projects, eq(artifacts.projectId, projects.id))
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(artifacts.updatedAt));
}
```

- [ ] **Step 6: Run → PASS.** `pnpm test tests/artifacts.repo.test.ts` (7 tests).

- [ ] **Step 7: Write failing test — `tests/attachments.repo.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { createProject } from "@/core/persistence/projects.repo";
import { addAttachment, listAttachmentsByNode, deleteAttachment } from "@/core/persistence/attachments.repo";

let projectId: string;

beforeEach(async () => {
  await client.exec(
    "DELETE FROM attachments; DELETE FROM artifacts; DELETE FROM canvas_docs; DELETE FROM user_settings; DELETE FROM api_keys; DELETE FROM projects; DELETE FROM users;",
  );
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
  await ensureUser(testDb, { id: "u2", email: "c@d.com" });
  const p = await createProject(testDb, { ownerId: "u1", name: "Proj" });
  projectId = p.id;
});

describe("attachments.repo", () => {
  it("adds then lists by node", async () => {
    await addAttachment(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "note", content: "hello" });
    const list = await listAttachmentsByNode(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1" });
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe("note");
    expect(list[0].content).toBe("hello");
  });

  it("rejects add for a non-owner", async () => {
    await expect(
      addAttachment(testDb, { ownerId: "u2", projectId, sourceNodeId: "n1", type: "note", content: "x" }),
    ).rejects.toThrow("Project not found");
  });

  it("does not list another owner's attachments", async () => {
    await addAttachment(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "link", content: "u" });
    expect(await listAttachmentsByNode(testDb, { ownerId: "u2", projectId, sourceNodeId: "n1" })).toHaveLength(0);
  });

  it("deletes only the owner's attachment", async () => {
    const a = await addAttachment(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1", type: "comment", content: "c" });
    await deleteAttachment(testDb, { ownerId: "u2", id: a.id });
    expect(await listAttachmentsByNode(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1" })).toHaveLength(1);
    await deleteAttachment(testDb, { ownerId: "u1", id: a.id });
    expect(await listAttachmentsByNode(testDb, { ownerId: "u1", projectId, sourceNodeId: "n1" })).toHaveLength(0);
  });
});
```

- [ ] **Step 8: Run → FAIL.** `pnpm test tests/attachments.repo.test.ts`. Report.

- [ ] **Step 9: Implement `core/persistence/attachments.repo.ts`**

```ts
import { and, desc, eq, getTableColumns, inArray } from "drizzle-orm";
import { attachments, projects, type Attachment } from "./schema";
import type { Db } from "./projects.repo";

export async function addAttachment(
  db: Db,
  input: { ownerId: string; projectId: string; sourceNodeId: string; type: string; content: string },
): Promise<Attachment> {
  const [owned] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.ownerId, input.ownerId)));
  if (!owned) throw new Error("Project not found");
  const [row] = await db
    .insert(attachments)
    .values({
      projectId: input.projectId,
      sourceNodeId: input.sourceNodeId,
      type: input.type,
      content: input.content,
    })
    .returning();
  return row;
}

export async function listAttachmentsByNode(
  db: Db,
  input: { ownerId: string; projectId: string; sourceNodeId: string },
): Promise<Attachment[]> {
  return db
    .select(getTableColumns(attachments))
    .from(attachments)
    .innerJoin(projects, eq(attachments.projectId, projects.id))
    .where(
      and(
        eq(projects.ownerId, input.ownerId),
        eq(attachments.projectId, input.projectId),
        eq(attachments.sourceNodeId, input.sourceNodeId),
      ),
    )
    .orderBy(desc(attachments.createdAt));
}

export async function deleteAttachment(db: Db, input: { ownerId: string; id: string }): Promise<void> {
  // delete only if the attachment's project is owned by the caller
  const owned = db
    .select({ id: attachments.id })
    .from(attachments)
    .innerJoin(projects, eq(attachments.projectId, projects.id))
    .where(and(eq(attachments.id, input.id), eq(projects.ownerId, input.ownerId)));
  await db.delete(attachments).where(inArray(attachments.id, owned));
}
```

- [ ] **Step 10: Run → PASS** (4 tests). Then migration + full verify:
  - `pnpm db:generate` → new `drizzle/0003_*.sql`.
  - `pnpm test` → all pass. `pnpm exec tsc --noEmit` → clean.

- [ ] **Step 11: Commit**

```bash
git add core/persistence/schema.ts core/persistence/artifacts.repo.ts core/persistence/attachments.repo.ts tests/setup.ts tests/artifacts.repo.test.ts tests/attachments.repo.test.ts drizzle/
git commit -m "feat: add artifacts + attachments tables and owner-scoped repos"
```

---

## Task 2: Pure helpers — hash, kinds, artifact-prompts (TDD)

**Files:**
- Create: `core/artifacts/hash.ts`, `core/artifacts/kinds.ts`, `core/ai/artifact-prompts.ts`
- Create: `tests/hash.test.ts`, `tests/kinds.test.ts`, `tests/artifact-prompts.test.ts`

**Interfaces:**
- Produces:
  - `hashSource(text: string): string`
  - `type GenType = 'schema'|'api'|'ui'|'docs'`; `generatorsForKind(kind: string): { primary: GenType[]; all: GenType[] }`
  - `buildArtifactPrompt(type: GenType, nodeText: string): string`

- [ ] **Step 1: Failing test — `tests/hash.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { hashSource } from "@/core/artifacts/hash";

describe("hashSource", () => {
  it("is deterministic", () => {
    expect(hashSource("Login Page")).toBe(hashSource("Login Page"));
  });
  it("differs when text differs", () => {
    expect(hashSource("a")).not.toBe(hashSource("b"));
  });
  it("returns a non-empty hex string", () => {
    expect(hashSource("x")).toMatch(/^[0-9a-f]+$/);
  });
});
```

- [ ] **Step 2: Run → FAIL.** `pnpm test tests/hash.test.ts`. Report.

- [ ] **Step 3: Implement `core/artifacts/hash.ts`**

```ts
/** FNV-1a 32-bit hash as hex. Deterministic; usable identically on client and server. */
export function hashSource(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
```

- [ ] **Step 4: Run → PASS** (3 tests).

- [ ] **Step 5: Failing test — `tests/kinds.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { generatorsForKind } from "@/core/artifacts/kinds";

describe("generatorsForKind", () => {
  it("component → ui + docs primary", () => {
    expect(generatorsForKind("component").primary).toEqual(["ui", "docs"]);
  });
  it("feature → api, schema, docs primary", () => {
    expect(generatorsForKind("feature").primary).toEqual(["api", "schema", "docs"]);
  });
  it("idea → docs primary", () => {
    expect(generatorsForKind("idea").primary).toEqual(["docs"]);
  });
  it("generic/unknown → all four primary", () => {
    expect(generatorsForKind("generic").primary).toEqual(["schema", "api", "ui", "docs"]);
    expect(generatorsForKind("whatever").primary).toEqual(["schema", "api", "ui", "docs"]);
  });
  it("all is always the four generators", () => {
    expect(generatorsForKind("idea").all).toEqual(["schema", "api", "ui", "docs"]);
  });
});
```

- [ ] **Step 6: Run → FAIL.** Report.

- [ ] **Step 7: Implement `core/artifacts/kinds.ts`**

```ts
export type GenType = "schema" | "api" | "ui" | "docs";

const ALL: GenType[] = ["schema", "api", "ui", "docs"];

export function generatorsForKind(kind: string): { primary: GenType[]; all: GenType[] } {
  switch (kind) {
    case "component":
      return { primary: ["ui", "docs"], all: ALL };
    case "feature":
      return { primary: ["api", "schema", "docs"], all: ALL };
    case "idea":
      return { primary: ["docs"], all: ALL };
    default:
      return { primary: ALL, all: ALL };
  }
}
```

- [ ] **Step 8: Run → PASS** (5 tests).

- [ ] **Step 9: Failing test — `tests/artifact-prompts.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildArtifactPrompt } from "@/core/ai/artifact-prompts";

describe("buildArtifactPrompt", () => {
  it("embeds the node text in every type", () => {
    for (const t of ["schema", "api", "ui", "docs"] as const) {
      expect(buildArtifactPrompt(t, "Login Page")).toContain("Login Page");
    }
  });
  it("schema asks for SQL", () => {
    expect(buildArtifactPrompt("schema", "x").toLowerCase()).toContain("sql");
  });
  it("api asks for endpoints", () => {
    expect(buildArtifactPrompt("api", "x").toLowerCase()).toContain("endpoint");
  });
  it("ui asks for React", () => {
    expect(buildArtifactPrompt("ui", "x").toLowerCase()).toContain("react");
  });
  it("docs asks for markdown", () => {
    expect(buildArtifactPrompt("docs", "x").toLowerCase()).toContain("markdown");
  });
});
```

- [ ] **Step 10: Run → FAIL.** Report.

- [ ] **Step 11: Implement `core/ai/artifact-prompts.ts`**

```ts
import type { GenType } from "@/core/artifacts/kinds";

export function buildArtifactPrompt(type: GenType, nodeText: string): string {
  const base = `Source concept: "${nodeText}"\n\n`;
  switch (type) {
    case "schema":
      return base + "Generate a PostgreSQL schema (SQL DDL) for this concept. Reply with ONLY SQL, no prose.";
    case "api":
      return base + "Generate a concise REST API endpoint list (method + path + one-line purpose) for this concept. Reply with ONLY the list.";
    case "ui":
      return base + "Generate a single React function component (TypeScript) for this concept. Reply with ONLY the code.";
    case "docs":
      return base + "Write concise markdown documentation for this concept. Reply with ONLY markdown.";
  }
}
```

- [ ] **Step 12: Run → PASS.** Then `pnpm test` (all) + `pnpm exec tsc --noEmit` (clean).

- [ ] **Step 13: Commit**

```bash
git add core/artifacts/hash.ts core/artifacts/kinds.ts core/ai/artifact-prompts.ts tests/hash.test.ts tests/kinds.test.ts tests/artifact-prompts.test.ts
git commit -m "feat: add artifact hash, kind-routing, and prompt helpers"
```

---

## Task 3: Zustand store + selection rewire

**Files:**
- Create: `core/state/workspace-store.ts`
- Modify: `components/canvas/whiteboard-inner.tsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `useWorkspaceStore` with `{ selectedNodeId: string|null; selectedNodeText: string; selectedNodeKind: string; setSelection({id,text,kind}) }`.
- Consumes: existing `whiteboard-inner` selection listener + `ExpandButton` (`selectedAiNodeId` prop).

- [ ] **Step 1: Install zustand**

```bash
pnpm add zustand
```
Report version.

- [ ] **Step 2: Create `core/state/workspace-store.ts`**

```ts
import { create } from "zustand";

type WorkspaceState = {
  selectedNodeId: string | null;
  selectedNodeText: string;
  selectedNodeKind: string;
  setSelection: (sel: { id: string | null; text: string; kind: string }) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedNodeId: null,
  selectedNodeText: "",
  selectedNodeKind: "",
  setSelection: ({ id, text, kind }) =>
    set({ selectedNodeId: id, selectedNodeText: text, selectedNodeKind: kind }),
}));
```

- [ ] **Step 3: Rewire selection in `components/canvas/whiteboard-inner.tsx`**

- Add `import { useWorkspaceStore } from "@/core/state/workspace-store";`
- Remove the local `const [selectedAiNodeId, setSelectedAiNodeId] = useState<string|null>(null);`.
- Read store setter + id near the top of the component:
```tsx
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
```
- Replace the `updateSel` body (inside `handleMount`) with:
```tsx
      const updateSel = () => {
        const ids = editor.getSelectedShapeIds();
        if (ids.length === 1) {
          const s = editor.getShape(ids[0]);
          if (s?.type === "ai-node") {
            const p = s.props as { text: string; kind: string };
            setSelection({ id: ids[0], text: p.text, kind: p.kind });
            return;
          }
        }
        setSelection({ id: null, text: "", kind: "" });
      };
```
- Keep the `editor.store.listen(updateSel, { scope: "session" })` registration and the dual-unsub cleanup return.
- `ExpandButton` still takes `selectedAiNodeId` — pass the store value:
```tsx
      {ready && editorRef.current && (
        <ExpandButton
          projectId={projectId}
          editor={editorRef.current}
          selectedAiNodeId={selectedNodeId}
        />
      )}
```
- Add `setSelection` to the `handleMount` `useCallback` dependency array (alongside `initial`, `saver`).

- [ ] **Step 4: Verify**

`pnpm exec tsc --noEmit` → clean. `pnpm test` → all pass. `pnpm build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add core/state/workspace-store.ts components/canvas/whiteboard-inner.tsx package.json pnpm-lock.yaml
git commit -m "feat: add zustand workspace store and route canvas selection through it"
```

---

## Task 4: resolveModel extraction + artifact/attachment actions

**Files:**
- Create: `core/ai/resolve-model.ts`, `app/p/[projectId]/artifact-actions.ts`, `app/p/[projectId]/attachment-actions.ts`
- Modify: `app/p/[projectId]/ai-actions.ts`

**Interfaces:**
- Produces:
  - `resolveModel(projectId: string): Promise<{ model: LanguageModel; ownerId: string }>` (server-only)
  - `generateArtifactAction(projectId, sourceNodeId, type, sourceText): Promise<Artifact>`
  - `listNodeArtifactsAction(projectId, sourceNodeId): Promise<Artifact[]>`
  - `addAttachmentAction(projectId, sourceNodeId, type, content): Promise<Attachment>`
  - `listNodeAttachmentsAction(projectId, sourceNodeId): Promise<Attachment[]>`
  - `deleteAttachmentAction(id): Promise<void>`
- Consumes: repos from Task 1; `buildArtifactPrompt`, `hashSource`; `generateNode`; `GenType`.

- [ ] **Step 1: Create `core/ai/resolve-model.ts`** (shared, server-only)

```ts
import "server-only";
import { db } from "@/core/persistence/db";
import { syncCurrentUser } from "@/lib/auth";
import { getProjectById } from "@/core/persistence/projects.repo";
import { getSettings } from "@/core/ai/settings.repo";
import { getDecryptedKey } from "@/core/ai/keys.repo";
import { buildModel } from "@/core/ai/providers";
import type { LanguageModel } from "ai";

export async function resolveModel(projectId: string): Promise<{ model: LanguageModel; ownerId: string }> {
  const ownerId = await syncCurrentUser();
  const project = await getProjectById(db, { id: projectId, ownerId });
  if (!project) throw new Error("Project not found");
  const { activeKeyId } = await getSettings(db, ownerId);
  if (!activeKeyId) throw new Error("No active model. Add a key in Settings and make it active.");
  const key = await getDecryptedKey(db, { keyId: activeKeyId, ownerId });
  if (!key) throw new Error("Active model is unavailable. Re-select a key in Settings.");
  return { model: buildModel(key), ownerId };
}
```

- [ ] **Step 2: Update `app/p/[projectId]/ai-actions.ts` to use the shared resolver**

Remove the local `resolveModel` function. In `commandGenerateAction` and `expandAction`, replace the model resolution with:
```ts
  const { resolveModel } = await import("@/core/ai/resolve-model");
  const { model } = await resolveModel(projectId);
```
(Everything else in those two actions stays the same — they only use `model`.)

- [ ] **Step 3: Create `app/p/[projectId]/artifact-actions.ts`**

```ts
"use server";

const GEN_TYPES = ["schema", "api", "ui", "docs"];

export async function generateArtifactAction(
  projectId: string,
  sourceNodeId: string,
  type: string,
  sourceText: string,
) {
  if (!GEN_TYPES.includes(type)) throw new Error("invalid artifact type");
  const { resolveModel } = await import("@/core/ai/resolve-model");
  const { generateNode } = await import("@/core/ai/generate");
  const { buildArtifactPrompt } = await import("@/core/ai/artifact-prompts");
  const { hashSource } = await import("@/core/artifacts/hash");
  const { upsertArtifact } = await import("@/core/persistence/artifacts.repo");
  const { db } = await import("@/core/persistence/db");

  const { model, ownerId } = await resolveModel(projectId);
  const content = await generateNode(model, buildArtifactPrompt(type as never, sourceText));
  return upsertArtifact(db, {
    ownerId,
    projectId,
    sourceNodeId,
    type,
    content,
    sourceHash: hashSource(sourceText),
  });
}

export async function listNodeArtifactsAction(projectId: string, sourceNodeId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { listArtifactsByNode } = await import("@/core/persistence/artifacts.repo");
  const ownerId = await syncCurrentUser();
  return listArtifactsByNode(db, { ownerId, projectId, sourceNodeId });
}
```

- [ ] **Step 4: Create `app/p/[projectId]/attachment-actions.ts`**

```ts
"use server";

const ATTACH_TYPES = ["note", "link", "comment", "snippet"];

export async function addAttachmentAction(
  projectId: string,
  sourceNodeId: string,
  type: string,
  content: string,
) {
  if (!ATTACH_TYPES.includes(type)) throw new Error("invalid attachment type");
  const trimmed = content.trim();
  if (!trimmed) throw new Error("content required");
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { addAttachment } = await import("@/core/persistence/attachments.repo");
  const ownerId = await syncCurrentUser();
  return addAttachment(db, { ownerId, projectId, sourceNodeId, type, content: trimmed });
}

export async function listNodeAttachmentsAction(projectId: string, sourceNodeId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { listAttachmentsByNode } = await import("@/core/persistence/attachments.repo");
  const ownerId = await syncCurrentUser();
  return listAttachmentsByNode(db, { ownerId, projectId, sourceNodeId });
}

export async function deleteAttachmentAction(id: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { deleteAttachment } = await import("@/core/persistence/attachments.repo");
  const ownerId = await syncCurrentUser();
  await deleteAttachment(db, { ownerId, id });
}
```

- [ ] **Step 5: Verify**

`pnpm exec tsc --noEmit` → clean (confirm ai-actions still compiles after the refactor). `pnpm test` → all pass. `pnpm build` → succeeds.

- [ ] **Step 6: Commit**

```bash
git add core/ai/resolve-model.ts app/p/[projectId]/ai-actions.ts app/p/[projectId]/artifact-actions.ts app/p/[projectId]/attachment-actions.ts
git commit -m "feat: shared resolveModel + artifact/attachment server actions"
```

---

## Task 5: Inspector component

**Files:**
- Create: `components/workspace/inspector.tsx`
- Modify: `components/workspace/workspace-shell.tsx`

**Interfaces:**
- Consumes: `useWorkspaceStore`; `generatorsForKind`, `GenType`; `hashSource`; the four actions from Task 4.
- Produces: `<Inspector projectId={string} />`.

- [ ] **Step 1: Create `components/workspace/inspector.tsx`**

```tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { generatorsForKind, type GenType } from "@/core/artifacts/kinds";
import { hashSource } from "@/core/artifacts/hash";
import { generateArtifactAction, listNodeArtifactsAction } from "@/app/p/[projectId]/artifact-actions";
import {
  addAttachmentAction,
  listNodeAttachmentsAction,
  deleteAttachmentAction,
} from "@/app/p/[projectId]/attachment-actions";

type Artifact = { id: string; type: string; content: string; sourceHash: string };
type Attachment = { id: string; type: string; content: string };
const ATTACH_TYPES = ["note", "link", "comment", "snippet"] as const;

export function Inspector({ projectId }: { projectId: string }) {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const text = useWorkspaceStore((s) => s.selectedNodeText);
  const kind = useWorkspaceStore((s) => s.selectedNodeKind);

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [attType, setAttType] = useState<(typeof ATTACH_TYPES)[number]>("note");
  const [attText, setAttText] = useState("");
  const [pending, startTransition] = useTransition();

  async function refresh(nodeId: string) {
    const [a, at] = await Promise.all([
      listNodeArtifactsAction(projectId, nodeId),
      listNodeAttachmentsAction(projectId, nodeId),
    ]);
    setArtifacts(a as Artifact[]);
    setAttachments(at as Attachment[]);
  }

  useEffect(() => {
    if (!selectedNodeId) {
      setArtifacts([]);
      setAttachments([]);
      return;
    }
    refresh(selectedNodeId).catch(() => setError("Failed to load node data"));
  }, [selectedNodeId, projectId]);

  if (!selectedNodeId) {
    return <p className="text-sm text-muted-foreground">Select an AI Node to inspect.</p>;
  }

  const gens = generatorsForKind(kind);
  const shown = showAll ? gens.all : gens.primary;
  const currentHash = hashSource(text);

  function generate(type: GenType) {
    startTransition(async () => {
      setError(null);
      try {
        await generateArtifactAction(projectId, selectedNodeId!, type, text);
        await refresh(selectedNodeId!);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    });
  }

  function addAttachment() {
    if (!attText.trim()) return;
    startTransition(async () => {
      setError(null);
      try {
        await addAttachmentAction(projectId, selectedNodeId!, attType, attText);
        setAttText("");
        await refresh(selectedNodeId!);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Add failed");
      }
    });
  }

  function removeAttachment(id: string) {
    startTransition(async () => {
      await deleteAttachmentAction(id);
      await refresh(selectedNodeId!);
    });
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto text-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{kind || "node"}</p>
        <p className="font-medium">{text || "(empty)"}</p>
      </div>

      {error && <p className="rounded bg-red-50 px-2 py-1 text-red-600">{error}</p>}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">Generate</span>
          {gens.primary.length < gens.all.length && (
            <button className="text-xs underline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Less" : "More"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {shown.map((t) => (
            <button
              key={t}
              type="button"
              disabled={pending}
              onClick={() => generate(t)}
              className="rounded border px-2 py-1 capitalize disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="font-medium">Artifacts</span>
        {artifacts.length === 0 ? (
          <p className="text-muted-foreground">None yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {artifacts.map((a) => {
              const stale = a.sourceHash !== currentHash;
              return (
                <li key={a.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{a.type}</span>
                    <span className="flex items-center gap-2">
                      {stale && <span className="rounded bg-amber-100 px-1 text-xs text-amber-700">stale</span>}
                      <button className="text-xs underline" disabled={pending} onClick={() => generate(a.type as GenType)}>
                        Regenerate
                      </button>
                    </span>
                  </div>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">{a.content}</pre>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <span className="font-medium">Attachments</span>
        <div className="mt-2 flex gap-2">
          <select
            value={attType}
            onChange={(e) => setAttType(e.target.value as (typeof ATTACH_TYPES)[number])}
            className="rounded border px-1"
          >
            {ATTACH_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={attText}
            onChange={(e) => setAttText(e.target.value)}
            placeholder="Add note/link/comment/snippet…"
            className="flex-1 rounded border px-2 py-1"
          />
          <button type="button" disabled={pending} onClick={addAttachment} className="rounded bg-black px-2 py-1 text-white disabled:opacity-50">
            Add
          </button>
        </div>
        {attachments.length > 0 && (
          <ul className="mt-2 space-y-1">
            {attachments.map((at) => (
              <li key={at.id} className="flex items-start justify-between gap-2 rounded border p-2">
                <span>
                  <span className="mr-1 text-xs uppercase text-muted-foreground">{at.type}</span>
                  {at.content}
                </span>
                <button className="text-xs text-red-500" onClick={() => removeAttachment(at.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render the inspector in `components/workspace/workspace-shell.tsx`**

Add `import { Inspector } from "./inspector";` and replace the aside's placeholder `<p>` content with `<Inspector projectId={projectId} />`. Keep the `<aside>` element + its classes (give it `overflow-hidden` if not present). The shell stays a server component rendering the client `<Inspector/>`.

- [ ] **Step 3: Verify**

`pnpm exec tsc --noEmit` → clean. `pnpm test` → all pass. `pnpm build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/workspace/inspector.tsx components/workspace/workspace-shell.tsx
git commit -m "feat: inspector with generators, artifacts, staleness, attachments"
```

---

## Task 6: Artifacts page

**Files:**
- Modify: `app/artifacts/page.tsx`

**Interfaces:**
- Consumes: `listArtifactsByOwner(db, ownerId)`; `syncCurrentUser`; `Sidebar`.

- [ ] **Step 1: Replace `app/artifacts/page.tsx`**

```tsx
import Link from "next/link";
import { Sidebar } from "@/components/app-shell/sidebar";
import { db } from "@/core/persistence/db";
import { listArtifactsByOwner } from "@/core/persistence/artifacts.repo";
import { syncCurrentUser } from "@/lib/auth";

export default async function ArtifactsPage() {
  const ownerId = await syncCurrentUser();
  const rows = await listArtifactsByOwner(db, ownerId);

  const byProject = new Map<string, { name: string; items: typeof rows }>();
  for (const r of rows) {
    const g = byProject.get(r.projectId) ?? { name: r.projectName, items: [] as typeof rows };
    g.items.push(r);
    byProject.set(r.projectId, g);
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Artifacts</h1>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No artifacts yet. Open a project, select an AI Node, and generate one.
          </p>
        ) : (
          <div className="space-y-8">
            {[...byProject.entries()].map(([projectId, group]) => (
              <section key={projectId}>
                <h2 className="mb-2 font-medium">
                  <Link href={`/p/${projectId}`} className="underline">
                    {group.name}
                  </Link>
                </h2>
                <ul className="space-y-2">
                  {group.items.map((a) => (
                    <li key={a.id} className="rounded border p-3">
                      <span className="font-medium capitalize">{a.type}</span>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">{a.content}</pre>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

`pnpm exec tsc --noEmit` → clean. `pnpm test` → all pass. `pnpm build` → succeeds; `/artifacts` listed.

- [ ] **Step 3: Commit**

```bash
git add app/artifacts/page.tsx
git commit -m "feat: artifacts page grouped by project"
```

---

## Task 7: Manual end-to-end verification

**Files:** none. Requires `.env.local` (Neon + Clerk + ENCRYPTION_KEY, already set) + an active model key (P3).

- [ ] **Step 1: Apply migration** — `pnpm db:migrate` → `artifacts` + `attachments` created (0003).

- [ ] **Step 2: Run** — `pnpm dev` (or `npm run dev`). With a node generated via the P3 command bar:
  - Select an AI Node → the inspector shows its text/kind + kind-relevant generator buttons.
  - Click **Docs** (or another) → an artifact appears with its content.
  - Edit the node's text → the artifact shows a **stale** badge → **Regenerate** clears it.
  - Add a **note** and a **link** attachment → they list; delete one → it disappears.
  - Open `/artifacts` → the generated artifact appears under its project.
  - Reload the project → canvas + nodes persist (P2); selecting the node re-loads its artifacts/attachments.

- [ ] **Step 3: Build sanity** — `pnpm build` → succeeds.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "chore: P4 end-to-end verification fixes"
```

---

## Self-Review

**Spec coverage:**
- artifacts + attachments tables + owner-scoped repos (spec §4,§7) → Task 1.
- staleness hash + kind routing + prompts (spec §6) → Task 2.
- zustand selection store + canvas rewire (spec §8) → Task 3.
- shared resolveModel + artifact/attachment actions (spec §5,§9) → Task 4.
- inspector: detail + kind-aware generators + artifacts + staleness + text attachments (spec §1,§9) → Task 5.
- artifacts page grouped (spec §9) → Task 6.
- testing (spec §11): repos PGlite (Task 1), pure helpers (Task 2), manual UI (Task 7).
- build phases (spec §12) map to Tasks 1–7.

**Placeholder scan:** No TBD/vague steps; all code provided. The `as never` cast in `generateArtifactAction` is a deliberate narrow cast (type validated at runtime against `GEN_TYPES` first).

**Type consistency:** `GenType` defined in `kinds.ts` (Task 2), consumed by `artifact-prompts.ts`, `artifact-actions.ts`, and `inspector.tsx`. `hashSource` signature identical across Task 2 (def), Task 4 (server store), Task 5 (client compare). Repo signatures in Task 1 Interfaces match their calls in Task 4. `resolveModel` returns `{model, ownerId}` (Task 4) and ai-actions uses only `.model`. `useWorkspaceStore` field names (`selectedNodeId/selectedNodeText/selectedNodeKind/setSelection`) consistent across Task 3 (def), Task 3 (whiteboard rewire), Task 5 (inspector). Attachment types list (`note/link/comment/snippet`) identical in action validation (Task 4) and inspector UI (Task 5).
