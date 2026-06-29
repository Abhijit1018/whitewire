# WhiteWire P1 — Shell + Auth + DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the published app shell — landing, Clerk auth, dashboard with project CRUD, an empty workspace shell, and a settings skeleton — on a modular Next.js 16 foundation that later phases extend without restructuring.

**Architecture:** Next.js 16 App Router (TypeScript). Auth via Clerk middleware. Data in Postgres (Neon) through Drizzle ORM, accessed only via repository functions in `core/persistence`. UI with Tailwind + shadcn/ui. Heavy modules (canvas/AI) are not in P1 but route boundaries are reserved. Business logic (repos, server actions) is unit-tested with Vitest against an in-memory PGlite database; pages are verified manually.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Clerk, Drizzle ORM, Neon Postgres (PGlite for tests), Zustand, Vitest, pnpm.

---

## File Structure (P1)

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts, drizzle.config.ts
.env.local (gitignored), .env.example
middleware.ts                         Clerk route protection
app/
  layout.tsx                          root: ClerkProvider, fonts, globals
  globals.css                         Tailwind base
  page.tsx                            landing (SSR)
  (auth)/login/[[...rest]]/page.tsx   Clerk SignIn
  (auth)/signup/[[...rest]]/page.tsx  Clerk SignUp
  dashboard/page.tsx                  projects grid (server component)
  dashboard/actions.ts                createProject / renameProject / deleteProject
  p/[projectId]/page.tsx              workspace shell (panels skeleton)
  settings/page.tsx                   settings skeleton (tabs)
  artifacts/page.tsx                  placeholder list
core/
  persistence/
    db.ts                             Drizzle client (Neon)
    schema.ts                         tables: users, projects, ... (P1 subset)
    projects.repo.ts                  project CRUD functions
    users.repo.ts                     ensureUser (sync Clerk user → db)
components/
  ui/...                              shadcn primitives (button, card, dialog, input)
  app-shell/sidebar.tsx              dashboard/workspace nav
  workspace/workspace-shell.tsx     panel layout (left/right/top/bottom)
lib/
  auth.ts                             getCurrentUserId() helper (Clerk)
tests/
  setup.ts                            PGlite test db bootstrap
  projects.repo.test.ts
  actions.test.ts
```

---

## Task 1: Scaffold Next.js 16 project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore` (update)

- [ ] **Step 1: Create the Next.js app non-interactively**

Run from repo root (it already contains `docs/` and `.git/`):
```bash
pnpm dlx create-next-app@latest . --ts --tailwind --app --eslint --src-dir=false --import-alias "@/*" --use-pnpm --yes
```
If it refuses due to non-empty dir, scaffold in a temp dir and move files:
```bash
pnpm dlx create-next-app@latest .nextapp --ts --tailwind --app --eslint --src-dir=false --import-alias "@/*" --use-pnpm --yes
cp -r .nextapp/. . && rm -rf .nextapp
```

- [ ] **Step 2: Verify dev server boots**

Run: `pnpm dev` then open `http://localhost:3000`.
Expected: default Next.js page renders. Stop the server (Ctrl-C).

- [ ] **Step 3: Replace landing page with a minimal SSR landing**

`app/page.tsx`:
```tsx
import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">WhiteWire</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        The AI-native canvas where ideas become specs, diagrams, code, and docs.
        Bring your own LLM. Own your intelligence.
      </p>
      <div className="flex gap-4">
        <Link href="/signup" className="rounded-md bg-black px-5 py-2.5 text-white">
          Get started
        </Link>
        <Link href="/login" className="rounded-md border px-5 py-2.5">
          Log in
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 16 app with landing page"
```

---

## Task 2: Add Vitest + PGlite test harness

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`
- Modify: `package.json` (scripts, devDeps)

- [ ] **Step 1: Install test + db deps**

```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D vitest @electric-sql/pglite drizzle-kit @types/node
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

- [ ] **Step 3: Create `tests/setup.ts`** (in-memory PGlite db shared by repo tests)

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll } from "vitest";
import * as schema from "@/core/persistence/schema";

export const client = new PGlite();
export const testDb = drizzle(client, { schema });

beforeAll(async () => {
  // Minimal DDL mirrors schema.ts; kept in sync manually for P1.
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id text NOT NULL REFERENCES users(id),
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});
```

- [ ] **Step 4: Add scripts to `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

- [ ] **Step 5: Verify Vitest runs (no tests yet = exit 0)**

Run: `pnpm test`
Expected: "No test files found" or passes with 0 tests, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add Vitest + PGlite harness"
```

---

## Task 3: Database schema + Drizzle client

**Files:**
- Create: `core/persistence/schema.ts`, `core/persistence/db.ts`, `drizzle.config.ts`, `.env.example`

- [ ] **Step 1: Define `core/persistence/schema.ts`** (P1 subset; later phases extend)

```ts
import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
```

- [ ] **Step 2: Create `core/persistence/db.ts`** (Neon client for runtime)

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./core/persistence/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 4: Create `.env.example`**

```
DATABASE_URL=postgresql://user:pass@host/db
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
```

- [ ] **Step 5: Verify it type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle schema and db client"
```

---

## Task 4: Projects repository (TDD)

**Files:**
- Create: `core/persistence/projects.repo.ts`, `core/persistence/users.repo.ts`, `tests/projects.repo.test.ts`

The repo functions accept a `db` argument so tests can inject the PGlite db and
runtime can pass the Neon db. This keeps persistence isolated and testable.

- [ ] **Step 1: Write the failing test** — `tests/projects.repo.test.ts`

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import {
  createProject,
  listProjects,
  renameProject,
  deleteProject,
} from "@/core/persistence/projects.repo";

beforeEach(async () => {
  await client.exec("DELETE FROM projects; DELETE FROM users;");
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
});

describe("projects.repo", () => {
  it("creates and lists a project for an owner", async () => {
    const p = await createProject(testDb, { ownerId: "u1", name: "My App" });
    expect(p.name).toBe("My App");
    const list = await listProjects(testDb, "u1");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(p.id);
  });

  it("renames a project", async () => {
    const p = await createProject(testDb, { ownerId: "u1", name: "Old" });
    const updated = await renameProject(testDb, { id: p.id, ownerId: "u1", name: "New" });
    expect(updated?.name).toBe("New");
  });

  it("does not rename a project owned by someone else", async () => {
    const p = await createProject(testDb, { ownerId: "u1", name: "Old" });
    const updated = await renameProject(testDb, { id: p.id, ownerId: "intruder", name: "Hax" });
    expect(updated).toBeUndefined();
  });

  it("deletes a project", async () => {
    const p = await createProject(testDb, { ownerId: "u1", name: "Tmp" });
    await deleteProject(testDb, { id: p.id, ownerId: "u1" });
    expect(await listProjects(testDb, "u1")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/projects.repo.test.ts`
Expected: FAIL — modules `users.repo`/`projects.repo` not found.

- [ ] **Step 3: Implement `core/persistence/users.repo.ts`**

```ts
import { eq } from "drizzle-orm";
import { users } from "./schema";

type Db = any; // drizzle instance (Neon or PGlite); typed loosely to share both

export async function ensureUser(db: Db, u: { id: string; email: string }) {
  await db.insert(users).values(u).onConflictDoNothing();
  const [row] = await db.select().from(users).where(eq(users.id, u.id));
  return row;
}
```

- [ ] **Step 4: Implement `core/persistence/projects.repo.ts`**

```ts
import { and, desc, eq } from "drizzle-orm";
import { projects, type Project } from "./schema";

type Db = any;

export async function createProject(
  db: Db,
  input: { ownerId: string; name: string },
): Promise<Project> {
  const [row] = await db.insert(projects).values(input).returning();
  return row;
}

export async function listProjects(db: Db, ownerId: string): Promise<Project[]> {
  return db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, ownerId))
    .orderBy(desc(projects.updatedAt));
}

export async function renameProject(
  db: Db,
  input: { id: string; ownerId: string; name: string },
): Promise<Project | undefined> {
  const [row] = await db
    .update(projects)
    .set({ name: input.name, updatedAt: new Date() })
    .where(and(eq(projects.id, input.id), eq(projects.ownerId, input.ownerId)))
    .returning();
  return row;
}

export async function deleteProject(
  db: Db,
  input: { id: string; ownerId: string },
): Promise<void> {
  await db
    .delete(projects)
    .where(and(eq(projects.id, input.id), eq(projects.ownerId, input.ownerId)));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/projects.repo.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add users and projects repositories with tests"
```

---

## Task 5: Clerk auth integration

**Files:**
- Create: `middleware.ts`, `lib/auth.ts`, `app/(auth)/login/[[...rest]]/page.tsx`, `app/(auth)/signup/[[...rest]]/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install Clerk**

```bash
pnpm add @clerk/nextjs
```

- [ ] **Step 2: Create `middleware.ts`** (protect app routes, leave landing/auth public)

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublic = createRouteMatcher(["/", "/login(.*)", "/signup(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublic(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
```

- [ ] **Step 3: Wrap root layout with ClerkProvider** — `app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhiteWire",
  description: "AI-native canvas workspace. Bring your own LLM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 4: Create auth pages**

`app/(auth)/login/[[...rest]]/page.tsx`:
```tsx
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <SignIn />
    </main>
  );
}
```

`app/(auth)/signup/[[...rest]]/page.tsx`:
```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <SignUp />
    </main>
  );
}
```

- [ ] **Step 5: Create `lib/auth.ts`** (current user + db sync helper)

```ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/core/persistence/db";
import { ensureUser } from "@/core/persistence/users.repo";

/** Returns the Clerk user id, redirect-protected by middleware. */
export async function getCurrentUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}

/** Ensures the Clerk user exists in our db, returns the user id. */
export async function syncCurrentUser(): Promise<string> {
  const u = await currentUser();
  if (!u) throw new Error("Unauthenticated");
  const email = u.primaryEmailAddress?.emailAddress ?? "";
  await ensureUser(db, { id: u.id, email });
  return u.id;
}
```

- [ ] **Step 6: Verify build type-checks**

Run: `pnpm exec tsc --noEmit`
Expected: no errors. (Runtime auth requires real Clerk keys in `.env.local`; verified in Task 9.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: integrate Clerk auth with protected routes"
```

---

## Task 6: shadcn/ui primitives + app sidebar

**Files:**
- Create (via CLI): `components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`
- Create: `components/app-shell/sidebar.tsx`

- [ ] **Step 1: Init shadcn and add primitives**

```bash
pnpm dlx shadcn@latest init -d
pnpm dlx shadcn@latest add button card dialog input
```

- [ ] **Step 2: Create `components/app-shell/sidebar.tsx`**

```tsx
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const links = [
  { href: "/dashboard", label: "Projects" },
  { href: "/artifacts", label: "Artifacts" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r p-4">
      <Link href="/dashboard" className="mb-6 text-xl font-bold">
        WhiteWire
      </Link>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded px-3 py-2 hover:bg-muted">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <UserButton />
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Verify type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add shadcn primitives and app sidebar"
```

---

## Task 7: Project server actions (TDD on logic)

**Files:**
- Create: `app/dashboard/actions.ts`, `tests/actions.test.ts`

Actions are thin wrappers: resolve current user, call repo, revalidate. We unit
test the **core logic** by extracting it into pure functions the action calls,
keeping Clerk/Next out of the test.

- [ ] **Step 1: Write the failing test** — `tests/actions.test.ts`

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { createProjectLogic, deleteProjectLogic } from "@/app/dashboard/actions";

beforeEach(async () => {
  await client.exec("DELETE FROM projects; DELETE FROM users;");
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
});

describe("project action logic", () => {
  it("rejects empty project name", async () => {
    await expect(createProjectLogic(testDb, "u1", "  ")).rejects.toThrow("Name required");
  });

  it("creates a project with trimmed name", async () => {
    const p = await createProjectLogic(testDb, "u1", "  Cool App ");
    expect(p.name).toBe("Cool App");
  });

  it("deletes a project", async () => {
    const p = await createProjectLogic(testDb, "u1", "Tmp");
    await deleteProjectLogic(testDb, "u1", p.id);
    // no throw = success
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/actions.test.ts`
Expected: FAIL — `createProjectLogic` not exported.

- [ ] **Step 3: Implement `app/dashboard/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/core/persistence/db";
import { syncCurrentUser } from "@/lib/auth";
import {
  createProject,
  deleteProject,
  renameProject,
  type Db,
} from "@/core/persistence/projects.repo";

// --- Pure logic (unit tested) ---

export async function createProjectLogic(database: Db, ownerId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name required");
  return createProject(database, { ownerId, name: trimmed });
}

export async function deleteProjectLogic(database: Db, ownerId: string, id: string) {
  return deleteProject(database, { id, ownerId });
}

// --- Server actions (called from UI) ---

export async function createProjectAction(formData: FormData) {
  const ownerId = await syncCurrentUser();
  const name = String(formData.get("name") ?? "");
  await createProjectLogic(db, ownerId, name);
  revalidatePath("/dashboard");
}

export async function renameProjectAction(formData: FormData) {
  const ownerId = await syncCurrentUser();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  await renameProject(db, { id, ownerId, name });
  revalidatePath("/dashboard");
}

export async function deleteProjectAction(formData: FormData) {
  const ownerId = await syncCurrentUser();
  const id = String(formData.get("id"));
  await deleteProjectLogic(db, ownerId, id);
  revalidatePath("/dashboard");
}
```

- [ ] **Step 4: Export `Db` type from the repo** — add to top of `core/persistence/projects.repo.ts`

Replace the local `type Db = any;` line with an exported shared type:
```ts
export type Db = any; // drizzle instance (Neon or PGlite)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/actions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add project server actions with tested logic"
```

---

## Task 8: Dashboard, workspace shell, settings & artifacts pages

**Files:**
- Create: `app/dashboard/page.tsx`, `app/dashboard/new-project-dialog.tsx`, `app/p/[projectId]/page.tsx`, `components/workspace/workspace-shell.tsx`, `app/settings/page.tsx`, `app/artifacts/page.tsx`

- [ ] **Step 1: Dashboard page** — `app/dashboard/page.tsx`

```tsx
import Link from "next/link";
import { Sidebar } from "@/components/app-shell/sidebar";
import { db } from "@/core/persistence/db";
import { listProjects } from "@/core/persistence/projects.repo";
import { syncCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { NewProjectDialog } from "./new-project-dialog";
import { deleteProjectAction } from "./actions";

export default async function Dashboard() {
  const ownerId = await syncCurrentUser();
  const projects = await listProjects(db, ownerId);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <NewProjectDialog />
        </div>
        {projects.length === 0 ? (
          <p className="text-muted-foreground">No projects yet. Create your first one.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id} className="flex items-center justify-between p-4">
                <Link href={`/p/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <form action={deleteProjectAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-sm text-red-500" type="submit">Delete</button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: New-project dialog** — `app/dashboard/new-project-dialog.tsx`

```tsx
"use client";

import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "./actions";

export function NewProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>New project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>New project</DialogTitle>
        <form action={createProjectAction} className="flex flex-col gap-4">
          <Input name="name" placeholder="Project name" autoFocus required />
          <Button type="submit">Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Workspace shell component** — `components/workspace/workspace-shell.tsx`

Reserves the canvas/panel layout for later phases without implementing them.
```tsx
export function WorkspaceShell({ projectId }: { projectId: string }) {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 items-center justify-between border-b px-4">
        <span className="font-medium">Project {projectId}</span>
        <span className="text-sm text-muted-foreground">Model: (set up in Settings)</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 border-r" aria-label="Tools" />
        <section className="flex-1 bg-muted/30 flex items-center justify-center text-muted-foreground">
          Canvas coming in Phase 2
        </section>
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

- [ ] **Step 4: Workspace page** — `app/p/[projectId]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/core/persistence/db";
import { projects } from "@/core/persistence/schema";
import { syncCurrentUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const ownerId = await syncCurrentUser();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)));
  if (!project) notFound();
  return <WorkspaceShell projectId={project.id} />;
}
```

- [ ] **Step 5: Settings skeleton** — `app/settings/page.tsx`

```tsx
import { Sidebar } from "@/components/app-shell/sidebar";

export default function Settings() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
        <section className="max-w-lg space-y-2">
          <h2 className="font-medium">API Keys (BYO-LLM)</h2>
          <p className="text-sm text-muted-foreground">
            Provider key management arrives in Phase 3.
          </p>
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Artifacts placeholder** — `app/artifacts/page.tsx`

```tsx
import { Sidebar } from "@/components/app-shell/sidebar";

export default function Artifacts() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Artifacts</h1>
        <p className="text-muted-foreground">Generated docs, diagrams, and code appear here (Phase 4).</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Verify type-check + tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add dashboard, workspace shell, settings and artifacts pages"
```

---

## Task 9: End-to-end manual verification

**Files:** none (verification only). Requires real keys in `.env.local`
(`DATABASE_URL` from a Neon dev branch, Clerk publishable + secret keys).

- [ ] **Step 1: Push schema to Neon dev branch**

Run: `pnpm db:generate && pnpm db:migrate`
Expected: `users` and `projects` tables created.

- [ ] **Step 2: Run the app**

Run: `pnpm dev`

- [ ] **Step 3: Verify the full flow manually**

Confirm each:
- `/` landing renders without auth.
- Clicking "Get started" → `/signup`, can create an account.
- After auth, redirected to a protected route; visiting `/dashboard` works.
- Create a project via dialog → appears in grid.
- Open project → workspace shell renders with "Canvas coming in Phase 2".
- Delete project → removed from grid.
- Visiting `/dashboard` while logged out → redirected to login.

- [ ] **Step 4: Production build sanity**

Run: `pnpm build`
Expected: build succeeds with no type/lint errors.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: P1 end-to-end verification fixes"
```

---

## Self-Review

**Spec coverage (P1 scope only):**
- Landing → Task 1. Auth → Task 5. Dashboard + project CRUD → Tasks 4, 7, 8.
- Workspace shell skeleton → Task 8. Settings skeleton → Task 8. Artifacts placeholder → Task 8.
- Modular boundaries (`core/persistence`, `lib`, `components`) → Tasks 3–8.
- Fast/responsive (SSR landing, no heavy deps in P1) → Tasks 1, 8.
- BYO-LLM, canvas, AI Objects, agents, versions are correctly **out of P1** (later phases).

**Type consistency:** `Db` type exported once from `projects.repo.ts` (Task 7 Step 4) and reused by actions; repo fn names (`createProject`, `listProjects`, `renameProject`, `deleteProject`) consistent across Tasks 4, 7, 8; `ensureUser`/`syncCurrentUser` consistent across Tasks 4, 5, 7, 8.

**Placeholder scan:** No "TBD"/"add error handling" placeholders; all code steps contain full code. The "Phase 2/3/4" labels in UI are intentional product copy, not plan placeholders.
