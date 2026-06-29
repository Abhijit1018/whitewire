# WhiteWire P3 — BYO-LLM + AI Objects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users bring their own LLM — an AES-256-GCM key vault, a settings UI to manage provider keys and pick the active model, an AI command bar that creates a custom AI Node shape on the canvas, and an Expand action that grows a node into connected child nodes via the user's model.

**Architecture:** Provider keys are encrypted at rest (`core/ai/crypto.ts`) and accessed only through owner-scoped repos; they are decrypted in-memory inside server actions. AI calls go through Vercel AI SDK v6 behind a thin `providers.ts`/`generate.ts` boundary. Pure, unit-tested helpers (`crypto.ts`, `prompts.ts`) carry the testable logic; tldraw-coupled UI (custom AI Node shape, command bar, Expand) is manually verified. P2's cleanup layout reuses arrow connections to tidy expanded nodes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vercel AI SDK v6 (`ai`, `@ai-sdk/openai-compatible`, `@ai-sdk/anthropic`, `@ai-sdk/google`), Node crypto, tldraw v5, Drizzle/Neon/PGlite, Vitest, pnpm.

---

## Existing context (P1+P2)

- `core/persistence/schema.ts` exports `users`, `projects`, `canvasDocs`; imports `pgTable, text, uuid, timestamp, jsonb` from `drizzle-orm/pg-core`.
- `core/persistence/projects.repo.ts` exports `export type Db = any;` (reuse it).
- `tests/setup.ts` exports `client` (PGlite) + `testDb`; `beforeAll` runs DDL for `users`, `projects`, `canvas_docs`. Vitest has `fileParallelism: false`.
- Server actions use dynamic imports (`const { db } = await import("@/core/persistence/db")`).
- `components/canvas/whiteboard-inner.tsx` renders `<Tldraw persistenceKey onMount>`, has `editorRef`, debounced autosave via `editor.store.listen`, and a "Tidy up" button calling `applyCleanup(editor)`.
- `components/canvas/cleanup-adapter.ts` exports `applyCleanup(editor)`. `core/canvas/cleanup.ts` exports `cleanup/tidyShapes/layoutGraph`.
- `lib/auth.ts` exports `syncCurrentUser(database?)`. `.env.local` (gitignored) holds real Clerk + Neon values.

## File Structure (P3)

```
core/ai/crypto.ts            getEncryptionKey + encrypt/decrypt (AES-256-GCM) — PURE
core/ai/keys.repo.ts         addKey/listKeys/deleteKey/getDecryptedKey — owner-scoped
core/ai/settings.repo.ts     getSettings/setActiveKey — owner-scoped
core/ai/providers.ts         buildModel({provider,baseUrl,apiKey,model}) -> AI SDK model
core/ai/prompts.ts           buildExpandPrompt + parseExpandResponse -> string[] — PURE
core/ai/generate.ts          generateNode(model, prompt) -> string
core/persistence/schema.ts   + apiKeys, userSettings tables
tests/setup.ts               + api_keys, user_settings DDL + ENCRYPTION_KEY for tests
app/settings/page.tsx        real keys UI (list/add/delete/active picker)
app/settings/keys-actions.ts addKeyAction/deleteKeyAction/setActiveKeyAction
app/p/[projectId]/ai-actions.ts commandGenerateAction/expandAction
components/canvas/shapes/ai-node-util.tsx  AiNodeUtil ShapeUtil + AiNodeShape type
components/canvas/command-bar.tsx          bottom AI command bar
components/canvas/whiteboard-inner.tsx     register shapeUtils, render command bar + Expand
tests/crypto.test.ts, tests/ai-keys.repo.test.ts, tests/ai-settings.repo.test.ts, tests/prompts.test.ts
```

---

## Task 1: Key encryption (TDD)

**Files:**
- Create: `core/ai/crypto.ts`, `tests/crypto.test.ts`
- Modify: `tests/setup.ts` (set a test `ENCRYPTION_KEY`)
- Modify: `.env.example`

- [ ] **Step 1: Set a deterministic `ENCRYPTION_KEY` for tests in `tests/setup.ts`**

At the very top of `tests/setup.ts` (before other imports run), add:
```ts
// 32-byte test key (base64). Real key comes from env in production.
process.env.ENCRYPTION_KEY ||= Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");
```

- [ ] **Step 2: Write the failing test — `tests/crypto.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { encrypt, decrypt, getEncryptionKey } from "@/core/ai/crypto";

const key = getEncryptionKey();

describe("crypto", () => {
  it("roundtrips plaintext", () => {
    const blob = encrypt("sk-secret-123", key);
    expect(blob).not.toContain("sk-secret-123");
    expect(decrypt(blob, key)).toBe("sk-secret-123");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encrypt("same", key)).not.toBe(encrypt("same", key));
  });

  it("throws on a tampered blob", () => {
    const blob = encrypt("hello", key);
    const [iv, tag, ct] = blob.split(":");
    const tampered = [iv, tag, Buffer.from("garbage").toString("base64")].join(":");
    expect(() => decrypt(tampered, key)).toThrow();
  });

  it("throws on a malformed blob", () => {
    expect(() => decrypt("not-a-valid-blob", key)).toThrow("Invalid encrypted blob");
  });

  it("getEncryptionKey throws when env is missing", () => {
    const prev = process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY;
    try {
      expect(() => getEncryptionKey()).toThrow("ENCRYPTION_KEY");
    } finally {
      process.env.ENCRYPTION_KEY = prev;
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test tests/crypto.test.ts`
Expected: FAIL — `@/core/ai/crypto` not found.

- [ ] **Step 4: Implement `core/ai/crypto.ts`**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** Returns the 32-byte master key from ENCRYPTION_KEY (base64). Throws if missing/invalid. */
export function getEncryptionKey(): Buffer {
  const b64 = process.env.ENCRYPTION_KEY;
  if (!b64) throw new Error("ENCRYPTION_KEY is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

/** AES-256-GCM. Returns base64(iv):base64(authTag):base64(ciphertext). */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

/** Reverses encrypt(); throws on tampering (auth tag) or malformed input. */
export function decrypt(blob: string, key: Buffer): string {
  const parts = blob.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted blob");
  const [ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/crypto.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Document the env var in `.env.example`**

Append:
```
# 32-byte key, base64. Generate with: openssl rand -base64 32
ENCRYPTION_KEY=
```

- [ ] **Step 7: Commit**

```bash
git add core/ai/crypto.ts tests/crypto.test.ts tests/setup.ts .env.example
git commit -m "feat: add AES-256-GCM key encryption util"
```

---

## Task 2: apiKeys + userSettings schema + repos (TDD)

**Files:**
- Modify: `core/persistence/schema.ts`, `tests/setup.ts`
- Create: `core/ai/keys.repo.ts`, `core/ai/settings.repo.ts`
- Create: `tests/ai-keys.repo.test.ts`, `tests/ai-settings.repo.test.ts`

- [ ] **Step 1: Add tables to `core/persistence/schema.ts`**

Append (the `pgTable, text, uuid, timestamp` imports already exist):
```ts
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // 'openai-compatible' | 'anthropic' | 'google'
  label: text("label").notNull(),
  baseUrl: text("base_url"),
  model: text("model").notNull(),
  encrypted: text("encrypted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  activeKeyId: uuid("active_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type KeyMetadata = Pick<ApiKey, "id" | "provider" | "label" | "baseUrl" | "model" | "createdAt">;
```

- [ ] **Step 2: Add DDL to `tests/setup.ts`**

Append inside the `beforeAll` `client.exec(\`...\`)` template:
```sql
    CREATE TABLE IF NOT EXISTS api_keys (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider text NOT NULL,
      label text NOT NULL,
      base_url text,
      model text NOT NULL,
      encrypted text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      active_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL
    );
```

- [ ] **Step 3: Write failing test — `tests/ai-keys.repo.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { addKey, listKeys, deleteKey, getDecryptedKey } from "@/core/ai/keys.repo";

beforeEach(async () => {
  await client.exec(
    "DELETE FROM user_settings; DELETE FROM api_keys; DELETE FROM projects; DELETE FROM users;",
  );
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
  await ensureUser(testDb, { id: "u2", email: "c@d.com" });
});

describe("keys.repo", () => {
  it("adds a key and returns metadata without the secret", async () => {
    const meta = await addKey(testDb, {
      ownerId: "u1",
      provider: "openai-compatible",
      label: "My OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o",
      apiKey: "sk-secret",
    });
    expect(meta.label).toBe("My OpenAI");
    expect(JSON.stringify(meta)).not.toContain("sk-secret");
  });

  it("stores the key encrypted (not plaintext) in the row", async () => {
    await addKey(testDb, {
      ownerId: "u1", provider: "anthropic", label: "A", baseUrl: null,
      model: "claude-3-5-sonnet-latest", apiKey: "sk-plain",
    });
    const rows = await client.query<{ encrypted: string }>("SELECT encrypted FROM api_keys");
    expect(rows.rows[0].encrypted).not.toContain("sk-plain");
    expect(rows.rows[0].encrypted).toContain(":");
  });

  it("lists only the owner's keys, metadata only", async () => {
    await addKey(testDb, { ownerId: "u1", provider: "google", label: "G", baseUrl: null, model: "gemini-2.0-flash", apiKey: "k1" });
    await addKey(testDb, { ownerId: "u2", provider: "google", label: "Other", baseUrl: null, model: "gemini-2.0-flash", apiKey: "k2" });
    const list = await listKeys(testDb, "u1");
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe("G");
    expect(JSON.stringify(list)).not.toContain("encrypted");
  });

  it("getDecryptedKey returns the secret for the owner only", async () => {
    const meta = await addKey(testDb, { ownerId: "u1", provider: "openai-compatible", label: "X", baseUrl: "https://x/v1", model: "gpt-4o", apiKey: "sk-roundtrip" });
    const got = await getDecryptedKey(testDb, { keyId: meta.id, ownerId: "u1" });
    expect(got?.apiKey).toBe("sk-roundtrip");
    expect(got?.baseUrl).toBe("https://x/v1");
    expect(await getDecryptedKey(testDb, { keyId: meta.id, ownerId: "u2" })).toBeUndefined();
  });

  it("deletes only the owner's key", async () => {
    const meta = await addKey(testDb, { ownerId: "u1", provider: "anthropic", label: "D", baseUrl: null, model: "m", apiKey: "k" });
    await deleteKey(testDb, { id: meta.id, ownerId: "u2" });
    expect(await listKeys(testDb, "u1")).toHaveLength(1);
    await deleteKey(testDb, { id: meta.id, ownerId: "u1" });
    expect(await listKeys(testDb, "u1")).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test tests/ai-keys.repo.test.ts`
Expected: FAIL — `@/core/ai/keys.repo` not found.

- [ ] **Step 5: Implement `core/ai/keys.repo.ts`**

```ts
import { and, desc, eq } from "drizzle-orm";
import { apiKeys, type KeyMetadata } from "@/core/persistence/schema";
import type { Db } from "@/core/persistence/projects.repo";
import { encrypt, decrypt, getEncryptionKey } from "./crypto";

const META = {
  id: apiKeys.id,
  provider: apiKeys.provider,
  label: apiKeys.label,
  baseUrl: apiKeys.baseUrl,
  model: apiKeys.model,
  createdAt: apiKeys.createdAt,
};

export async function addKey(
  db: Db,
  input: {
    ownerId: string;
    provider: string;
    label: string;
    baseUrl: string | null;
    model: string;
    apiKey: string;
  },
): Promise<KeyMetadata> {
  const encrypted = encrypt(input.apiKey, getEncryptionKey());
  const [row] = await db
    .insert(apiKeys)
    .values({
      userId: input.ownerId,
      provider: input.provider,
      label: input.label,
      baseUrl: input.baseUrl,
      model: input.model,
      encrypted,
    })
    .returning(META);
  return row;
}

export async function listKeys(db: Db, ownerId: string): Promise<KeyMetadata[]> {
  return db
    .select(META)
    .from(apiKeys)
    .where(eq(apiKeys.userId, ownerId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function deleteKey(db: Db, input: { id: string; ownerId: string }): Promise<void> {
  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, input.id), eq(apiKeys.userId, input.ownerId)));
}

export async function getDecryptedKey(
  db: Db,
  input: { keyId: string; ownerId: string },
): Promise<{ provider: string; baseUrl: string | null; model: string; apiKey: string } | undefined> {
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, input.keyId), eq(apiKeys.userId, input.ownerId)));
  if (!row) return undefined;
  return {
    provider: row.provider,
    baseUrl: row.baseUrl,
    model: row.model,
    apiKey: decrypt(row.encrypted, getEncryptionKey()),
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test tests/ai-keys.repo.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Write failing test — `tests/ai-settings.repo.test.ts`**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { addKey } from "@/core/ai/keys.repo";
import { getSettings, setActiveKey } from "@/core/ai/settings.repo";

beforeEach(async () => {
  await client.exec(
    "DELETE FROM user_settings; DELETE FROM api_keys; DELETE FROM projects; DELETE FROM users;",
  );
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
});

describe("settings.repo", () => {
  it("returns undefined activeKeyId when unset", async () => {
    expect(await getSettings(testDb, "u1")).toEqual({ activeKeyId: null });
  });

  it("sets and reads the active key", async () => {
    const meta = await addKey(testDb, { ownerId: "u1", provider: "anthropic", label: "A", baseUrl: null, model: "m", apiKey: "k" });
    await setActiveKey(testDb, { ownerId: "u1", keyId: meta.id });
    expect((await getSettings(testDb, "u1")).activeKeyId).toBe(meta.id);
  });

  it("nulls the active key when that key is deleted (ON DELETE SET NULL)", async () => {
    const meta = await addKey(testDb, { ownerId: "u1", provider: "anthropic", label: "A", baseUrl: null, model: "m", apiKey: "k" });
    await setActiveKey(testDb, { ownerId: "u1", keyId: meta.id });
    await client.exec("DELETE FROM api_keys;");
    expect((await getSettings(testDb, "u1")).activeKeyId).toBeNull();
  });
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `pnpm test tests/ai-settings.repo.test.ts`
Expected: FAIL — `@/core/ai/settings.repo` not found.

- [ ] **Step 9: Implement `core/ai/settings.repo.ts`**

```ts
import { eq } from "drizzle-orm";
import { userSettings } from "@/core/persistence/schema";
import type { Db } from "@/core/persistence/projects.repo";

export async function getSettings(db: Db, ownerId: string): Promise<{ activeKeyId: string | null }> {
  const [row] = await db
    .select({ activeKeyId: userSettings.activeKeyId })
    .from(userSettings)
    .where(eq(userSettings.userId, ownerId));
  return { activeKeyId: row?.activeKeyId ?? null };
}

export async function setActiveKey(
  db: Db,
  input: { ownerId: string; keyId: string | null },
): Promise<void> {
  await db
    .insert(userSettings)
    .values({ userId: input.ownerId, activeKeyId: input.keyId })
    .onConflictDoUpdate({ target: userSettings.userId, set: { activeKeyId: input.keyId } });
}
```

- [ ] **Step 10: Verify + migration**

Run: `pnpm test tests/ai-settings.repo.test.ts` → PASS (3).
Run: `pnpm db:generate` → new `drizzle/0002_*.sql` for api_keys + user_settings.
Run: `pnpm test` → all pass. Run: `pnpm exec tsc --noEmit` → clean.

- [ ] **Step 11: Commit**

```bash
git add core/persistence/schema.ts core/ai/keys.repo.ts core/ai/settings.repo.ts tests/setup.ts tests/ai-keys.repo.test.ts tests/ai-settings.repo.test.ts drizzle/
git commit -m "feat: add api_keys + user_settings tables and owner-scoped repos"
```

---

## Task 3: Providers + prompts + generate (TDD on prompts)

**Files:**
- Create: `core/ai/providers.ts`, `core/ai/prompts.ts`, `core/ai/generate.ts`, `tests/prompts.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install AI SDK v6 + providers**

```bash
pnpm add ai @ai-sdk/openai-compatible @ai-sdk/anthropic @ai-sdk/google
```
Report installed versions. The code below targets AI SDK v6 (`generateText` from
`"ai"`; `createOpenAICompatible`, `createAnthropic`, `createGoogleGenerativeAI`
from their packages). If an installed package's factory name differs, adapt and
report — these calls are isolated in `providers.ts`/`generate.ts`.

- [ ] **Step 2: Write failing test — `tests/prompts.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { buildExpandPrompt, parseExpandResponse } from "@/core/ai/prompts";

describe("buildExpandPrompt", () => {
  it("includes the concept text and asks for a JSON array", () => {
    const p = buildExpandPrompt("Login Page");
    expect(p).toContain("Login Page");
    expect(p.toLowerCase()).toContain("json");
  });
});

describe("parseExpandResponse", () => {
  it("parses a bare JSON array", () => {
    expect(parseExpandResponse('["Email", "Password", "OAuth"]')).toEqual(["Email", "Password", "OAuth"]);
  });

  it("parses a fenced ```json block", () => {
    const raw = "Sure!\n```json\n[\"A\", \"B\"]\n```\nDone";
    expect(parseExpandResponse(raw)).toEqual(["A", "B"]);
  });

  it("falls back to splitting bullet/numbered lines", () => {
    const raw = "- Email\n- Password\n3. Forgot password";
    expect(parseExpandResponse(raw)).toEqual(["Email", "Password", "Forgot password"]);
  });

  it("trims and drops empty entries", () => {
    expect(parseExpandResponse('["  A  ", "", "B"]')).toEqual(["A", "B"]);
  });

  it("returns an empty array for unparseable input", () => {
    expect(parseExpandResponse("   ")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test tests/prompts.test.ts`
Expected: FAIL — `@/core/ai/prompts` not found.

- [ ] **Step 4: Implement `core/ai/prompts.ts`**

```ts
export function buildExpandPrompt(text: string): string {
  return [
    `Break the following concept into 3 to 7 concise, distinct sub-components.`,
    `Concept: "${text}"`,
    `Reply with ONLY a JSON array of short strings (no prose, no markdown).`,
    `Example: ["Email field", "Password field", "OAuth login"]`,
  ].join("\n");
}

/** Defensive: bare JSON array, fenced ```json, or bullet/numbered lines -> string[]. */
export function parseExpandResponse(raw: string): string[] {
  const clean = (arr: unknown[]): string[] =>
    arr.map((s) => String(s).trim()).filter((s) => s.length > 0);

  const tryJson = (s: string): string[] | null => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? clean(v) : null;
    } catch {
      return null;
    }
  };

  // 1) bare JSON array
  const trimmed = raw.trim();
  const direct = tryJson(trimmed);
  if (direct) return direct;

  // 2) fenced ```json ... ``` or first [...] block
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) {
    const j = tryJson(fenced.trim());
    if (j) return j;
  }
  const bracket = trimmed.match(/\[[\s\S]*\]/)?.[0];
  if (bracket) {
    const j = tryJson(bracket);
    if (j) return j;
  }

  // 3) bullet / numbered lines
  const lines = trimmed
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length > 0);
  return lines;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test tests/prompts.test.ts`
Expected: PASS (all).

- [ ] **Step 6: Implement `core/ai/providers.ts`**

```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export function buildModel(input: {
  provider: string;
  baseUrl: string | null;
  apiKey: string;
  model: string;
}): LanguageModel {
  switch (input.provider) {
    case "openai-compatible":
      return createOpenAICompatible({
        name: "byo",
        baseURL: input.baseUrl ?? "https://api.openai.com/v1",
        apiKey: input.apiKey,
      })(input.model);
    case "anthropic":
      return createAnthropic({ apiKey: input.apiKey })(input.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey: input.apiKey })(input.model);
    default:
      throw new Error(`Unknown provider: ${input.provider}`);
  }
}
```
If AI SDK v6's `LanguageModel` type name or a factory signature differs, adapt
and report. `buildModel` is the only place provider SDKs are imported.

- [ ] **Step 7: Implement `core/ai/generate.ts`**

```ts
import { generateText, type LanguageModel } from "ai";

export async function generateNode(model: LanguageModel, prompt: string): Promise<string> {
  const { text } = await generateText({ model, prompt });
  return text.trim();
}
```

- [ ] **Step 8: Verify**

Run: `pnpm exec tsc --noEmit` → clean.
Run: `pnpm test` → all pass.
Run: `pnpm build` → succeeds.

- [ ] **Step 9: Commit**

```bash
git add core/ai/providers.ts core/ai/prompts.ts core/ai/generate.ts tests/prompts.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add AI SDK provider builder, expand prompts, generate wrapper"
```

---

## Task 4: Settings UI + key actions

**Files:**
- Create: `app/settings/keys-actions.ts`
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Create `app/settings/keys-actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";

export async function addKeyAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { addKey } = await import("@/core/ai/keys.repo");
  const ownerId = await syncCurrentUser();

  const provider = String(formData.get("provider") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const baseUrlRaw = String(formData.get("baseUrl") ?? "").trim();
  if (!label || !model || !apiKey) throw new Error("label, model and apiKey are required");
  if (!["openai-compatible", "anthropic", "google"].includes(provider))
    throw new Error("invalid provider");
  const baseUrl =
    provider === "openai-compatible" ? baseUrlRaw || "https://api.openai.com/v1" : null;

  await addKey(db, { ownerId, provider, label, baseUrl, model, apiKey });
  revalidatePath("/settings");
}

export async function deleteKeyAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { deleteKey } = await import("@/core/ai/keys.repo");
  const ownerId = await syncCurrentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await deleteKey(db, { id, ownerId });
  revalidatePath("/settings");
}

export async function setActiveKeyAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { setActiveKey } = await import("@/core/ai/settings.repo");
  const ownerId = await syncCurrentUser();
  const id = String(formData.get("id") ?? "");
  await setActiveKey(db, { ownerId, keyId: id || null });
  revalidatePath("/settings");
}
```

- [ ] **Step 2: Replace `app/settings/page.tsx` with the real keys UI**

```tsx
import { Sidebar } from "@/components/app-shell/sidebar";
import { db } from "@/core/persistence/db";
import { listKeys } from "@/core/ai/keys.repo";
import { getSettings } from "@/core/ai/settings.repo";
import { syncCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addKeyAction, deleteKeyAction, setActiveKeyAction } from "./keys-actions";

export default async function Settings() {
  const ownerId = await syncCurrentUser();
  const [keys, settings] = await Promise.all([listKeys(db, ownerId), getSettings(db, ownerId)]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

        <section className="mb-10 max-w-xl">
          <h2 className="mb-3 font-medium">API Keys (BYO-LLM)</h2>
          {keys.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">No keys yet. Add one below.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <span className="font-medium">{k.label}</span>{" "}
                    <span className="text-sm text-muted-foreground">
                      ({k.provider} · {k.model}){settings.activeKeyId === k.id ? " · active" : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {settings.activeKeyId !== k.id && (
                      <form action={setActiveKeyAction}>
                        <input type="hidden" name="id" value={k.id} />
                        <button className="text-sm underline" type="submit">Make active</button>
                      </form>
                    )}
                    <form action={deleteKeyAction}>
                      <input type="hidden" name="id" value={k.id} />
                      <button className="text-sm text-red-500" type="submit">Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={addKeyAction} className="space-y-3 rounded border p-4">
            <h3 className="font-medium">Add a key</h3>
            <select name="provider" className="w-full rounded border px-3 py-2" defaultValue="openai-compatible">
              <option value="openai-compatible">OpenAI-compatible (OpenAI, Groq, OpenRouter, Ollama…)</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </select>
            <Input name="label" placeholder="Label (e.g. My OpenAI)" required />
            <Input name="baseUrl" placeholder="Base URL (openai-compatible only, default https://api.openai.com/v1)" />
            <Input name="model" placeholder="Model id (e.g. gpt-4o, claude-3-5-sonnet-latest, gemini-2.0-flash)" required />
            <Input name="apiKey" type="password" placeholder="API key" required />
            <Button type="submit">Add key</Button>
          </form>
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit` → clean.
Run: `pnpm test` → all pass.
Run: `pnpm build` → succeeds; `/settings` listed.

- [ ] **Step 4: Commit**

```bash
git add app/settings/page.tsx app/settings/keys-actions.ts
git commit -m "feat: settings UI to add, delete, and activate provider keys"
```

---

## Task 5: AI Node custom shape

**Files:**
- Create: `components/canvas/shapes/ai-node-util.tsx`
- Modify: `components/canvas/whiteboard-inner.tsx`

- [ ] **Step 1: Create `components/canvas/shapes/ai-node-util.tsx`**

```tsx
import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  type RecordProps,
  type TLBaseShape,
} from "tldraw";

export type AiNodeShape = TLBaseShape<
  "ai-node",
  { w: number; h: number; text: string; kind: string; purpose: string; model: string }
>;

export class AiNodeUtil extends ShapeUtil<AiNodeShape> {
  static override type = "ai-node" as const;
  static override props: RecordProps<AiNodeShape> = {
    w: T.number,
    h: T.number,
    text: T.string,
    kind: T.string,
    purpose: T.string,
    model: T.string,
  };

  getDefaultProps(): AiNodeShape["props"] {
    return { w: 220, h: 100, text: "New node", kind: "generic", purpose: "", model: "" };
  }

  getGeometry(shape: AiNodeShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: AiNodeShape) {
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #d4d4d8",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflow: "hidden",
          pointerEvents: "all",
        }}
      >
        <span
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "#71717a",
          }}
        >
          {shape.props.kind}
        </span>
        <span style={{ fontSize: 14, color: "#18181b", lineHeight: 1.3 }}>
          {shape.props.text}
        </span>
      </HTMLContainer>
    );
  }

  indicator(shape: AiNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={10} />;
  }
}
```
Verify against tldraw v5: `ShapeUtil`, `TLBaseShape`, `Rectangle2d`, `HTMLContainer`,
`T`, `RecordProps` are all exported from `"tldraw"`, and `static type`/`static props`/
`getDefaultProps`/`getGeometry`/`component`/`indicator` are the v5 override surface.
Adapt names if the installed v5 differs and report.

- [ ] **Step 2: Register the shape util in `components/canvas/whiteboard-inner.tsx`**

Add the import and pass `shapeUtils` to `<Tldraw>`. At the top:
```tsx
import { AiNodeUtil } from "./shapes/ai-node-util";
```
Define a stable array (module scope, above the component):
```tsx
const customShapeUtils = [AiNodeUtil];
```
And update the `<Tldraw ...>` props to include it:
```tsx
      <Tldraw
        persistenceKey={`ww-${projectId}`}
        shapeUtils={customShapeUtils}
        onMount={handleMount}
      />
```
Leave the autosave listener, loadSnapshot, and Tidy up button unchanged.

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit` → clean.
Run: `pnpm test` → all pass.
Run: `pnpm build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/canvas/shapes/ai-node-util.tsx components/canvas/whiteboard-inner.tsx
git commit -m "feat: add custom AI Node tldraw shape"
```

---

## Task 6: AI command bar (prompt → AI Node)

**Files:**
- Create: `app/p/[projectId]/ai-actions.ts`
- Create: `components/canvas/command-bar.tsx`
- Modify: `components/canvas/whiteboard-inner.tsx`

- [ ] **Step 1: Create `app/p/[projectId]/ai-actions.ts`**

```ts
"use server";

async function resolveModel(projectId: string) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { getProjectById } = await import("@/core/persistence/projects.repo");
  const { getSettings } = await import("@/core/ai/settings.repo");
  const { getDecryptedKey } = await import("@/core/ai/keys.repo");
  const { buildModel } = await import("@/core/ai/providers");

  const ownerId = await syncCurrentUser();
  const project = await getProjectById(db, { id: projectId, ownerId });
  if (!project) throw new Error("Project not found");
  const { activeKeyId } = await getSettings(db, ownerId);
  if (!activeKeyId) throw new Error("No active model. Add a key in Settings and make it active.");
  const key = await getDecryptedKey(db, { keyId: activeKeyId, ownerId });
  if (!key) throw new Error("Active model is unavailable. Re-select a key in Settings.");
  return buildModel(key);
}

export async function commandGenerateAction(
  projectId: string,
  prompt: string,
): Promise<{ text: string }> {
  const { generateNode } = await import("@/core/ai/generate");
  const model = await resolveModel(projectId);
  const text = await generateNode(model, prompt);
  return { text };
}

export async function expandAction(
  projectId: string,
  text: string,
): Promise<{ items: string[] }> {
  const { generateNode } = await import("@/core/ai/generate");
  const { buildExpandPrompt, parseExpandResponse } = await import("@/core/ai/prompts");
  const model = await resolveModel(projectId);
  const raw = await generateNode(model, buildExpandPrompt(text));
  return { items: parseExpandResponse(raw) };
}
```

- [ ] **Step 2: Create `components/canvas/command-bar.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import type { Editor } from "tldraw";
import { createShapeId } from "tldraw";
import { commandGenerateAction } from "@/app/p/[projectId]/ai-actions";

export function CommandBar({ projectId, editor }: { projectId: string; editor: Editor | null }) {
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!editor || !prompt.trim()) return;
    const text = prompt.trim();
    startTransition(async () => {
      setError(null);
      try {
        const { text: generated } = await commandGenerateAction(projectId, text);
        const center = editor.getViewportPageBounds().center;
        editor.createShape({
          id: createShapeId(),
          type: "ai-node",
          x: center.x - 110,
          y: center.y - 50,
          props: { text: generated, kind: "generic", purpose: "", model: "" },
        });
        setPrompt("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    });
  }

  return (
    <div className="absolute bottom-4 left-1/2 z-10 w-[min(90%,640px)] -translate-x-1/2">
      {error && <p className="mb-1 rounded bg-red-50 px-3 py-1 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 rounded-lg border bg-white p-2 shadow">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask AI to create a node…"
          className="flex-1 px-2 py-1 outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-black px-4 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
```
Verify against tldraw v5: `createShapeId` exported from `"tldraw"`,
`editor.getViewportPageBounds().center` returns a `{x,y}` page point, and
`editor.createShape({ id, type, x, y, props })` is the v5 signature. Adapt + report
if different.

- [ ] **Step 3: Render the command bar in `components/canvas/whiteboard-inner.tsx`**

Add `import { CommandBar } from "./command-bar";` and render it inside the root
`<div className="absolute inset-0">`, after the Tidy up button:
```tsx
      <CommandBar projectId={projectId} editor={editorRef.current} />
```
Note: `editorRef.current` is set in `onMount`. To make the command bar re-render
once the editor is ready, add a small state flag set in `handleMount`. Concretely:
add `const [ready, setReady] = useState(false);`, call `setReady(true)` at the end
of `handleMount` (after `editorRef.current = editor`), and render
`{ready && <CommandBar projectId={projectId} editor={editorRef.current} />}`.

- [ ] **Step 4: Verify**

Run: `pnpm exec tsc --noEmit` → clean.
Run: `pnpm test` → all pass.
Run: `pnpm build` → succeeds.

- [ ] **Step 5: Commit**

```bash
git add app/p/[projectId]/ai-actions.ts components/canvas/command-bar.tsx components/canvas/whiteboard-inner.tsx
git commit -m "feat: AI command bar creates AI Node from a prompt"
```

---

## Task 7: Expand (AI Node → connected child nodes)

**Files:**
- Create: `components/canvas/expand-button.tsx`
- Modify: `components/canvas/whiteboard-inner.tsx`

- [ ] **Step 1: Create `components/canvas/expand-button.tsx`**

Renders a button when exactly one AI Node is selected; on click, calls
`expandAction`, creates a child AI Node per item below the parent + a bound arrow
parent→child, then runs `applyCleanup` so they lay out as a tidy tree.
```tsx
"use client";

import { useState, useTransition } from "react";
import { type Editor, createShapeId, createBindingId } from "tldraw";
import { expandAction } from "@/app/p/[projectId]/ai-actions";
import { applyCleanup } from "./cleanup-adapter";

export function ExpandButton({
  projectId,
  editor,
  selectedAiNodeId,
}: {
  projectId: string;
  editor: Editor;
  selectedAiNodeId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!selectedAiNodeId) return null;

  function expand() {
    const parent = editor.getShape(selectedAiNodeId as never);
    if (!parent || parent.type !== "ai-node") return;
    const parentText = (parent.props as { text: string }).text;
    startTransition(async () => {
      setError(null);
      try {
        const { items } = await expandAction(projectId, parentText);
        if (items.length === 0) {
          setError("Model returned no sub-items.");
          return;
        }
        const baseX = (parent as { x: number }).x;
        const baseY = (parent as { y: number }).y;
        items.forEach((item, i) => {
          const childId = createShapeId();
          editor.createShape({
            id: childId,
            type: "ai-node",
            x: baseX + i * 260,
            y: baseY + 220,
            props: { text: item, kind: "generic", purpose: "", model: "" },
          });
          const arrowId = createShapeId();
          editor.createShape({ id: arrowId, type: "arrow", x: 0, y: 0 });
          editor.createBindings([
            {
              id: createBindingId(),
              type: "arrow",
              fromId: arrowId,
              toId: parent.id,
              props: { terminal: "start", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
            },
            {
              id: createBindingId(),
              type: "arrow",
              fromId: arrowId,
              toId: childId,
              props: { terminal: "end", normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
            },
          ]);
        });
        applyCleanup(editor);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Expand failed");
      }
    });
  }

  return (
    <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
      {error && <p className="mb-1 rounded bg-red-50 px-3 py-1 text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={expand}
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm text-white shadow disabled:opacity-50"
      >
        {pending ? "Expanding…" : "Expand"}
      </button>
    </div>
  );
}
```
Verify against tldraw v5: `createShapeId`, `createBindingId` from `"tldraw"`;
`editor.createBindings([...])` with `{ id, type:"arrow", fromId, toId, props:{ terminal, normalizedAnchor, isExact, isPrecise } }`
is the v5 arrow-binding shape. If v5's binding props differ, adapt to match the
real `TLArrowBindingProps` (the same type the P2 cleanup-adapter reads via
`getBindingsFromShape(id,"arrow")` → `.props.terminal`). Report any change. If
programmatic binding proves unreliable, still create the child nodes + a plain
arrow and rely on the manual position offset; report this fallback.

- [ ] **Step 2: Track selection + render Expand in `components/canvas/whiteboard-inner.tsx`**

Use a selection listener to track the single selected AI Node. Add:
```tsx
import { ExpandButton } from "./expand-button";
```
Inside the component, add state and a selection subscription in `handleMount`:
```tsx
  const [selectedAiNodeId, setSelectedAiNodeId] = useState<string | null>(null);
```
At the end of `handleMount` (after `editorRef.current = editor; setReady(true);`),
add a second listener that tracks selection:
```tsx
      const updateSel = () => {
        const ids = editor.getSelectedShapeIds();
        if (ids.length === 1) {
          const s = editor.getShape(ids[0]);
          setSelectedAiNodeId(s?.type === "ai-node" ? ids[0] : null);
        } else {
          setSelectedAiNodeId(null);
        }
      };
      const unsubSel = editor.store.listen(updateSel, { scope: "session" });
```
Return both unsubscribers from `onMount`:
```tsx
      return () => {
        unsub();
        unsubSel();
      };
```
(Replace the existing single `return () => unsub();`.)
Then render the Expand button (only when the editor is ready):
```tsx
      {ready && editorRef.current && (
        <ExpandButton
          projectId={projectId}
          editor={editorRef.current}
          selectedAiNodeId={selectedAiNodeId}
        />
      )}
```

- [ ] **Step 3: Verify**

Run: `pnpm exec tsc --noEmit` → clean.
Run: `pnpm test` → all pass.
Run: `pnpm build` → succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/canvas/expand-button.tsx components/canvas/whiteboard-inner.tsx
git commit -m "feat: expand an AI Node into connected child nodes"
```

---

## Task 8: Manual end-to-end verification

**Files:** none. Requires `.env.local` with `ENCRYPTION_KEY` set + a real provider key to enter in the UI.

- [ ] **Step 1: Add `ENCRYPTION_KEY` to `.env.local`**

Generate and add (do NOT commit `.env.local`):
```bash
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)" >> .env.local
```
(If `openssl` is unavailable on Windows, generate 32 random bytes another way and base64-encode them.)

- [ ] **Step 2: Apply the migration to Neon**

Run: `pnpm db:migrate`
Expected: `api_keys` + `user_settings` tables created (0002 applied).

- [ ] **Step 3: Run the app + verify**

Run: `pnpm dev` (or `npm run dev`). Then:
- Go to Settings → add a real key (e.g. provider openai-compatible, base URL
  `https://api.openai.com/v1`, model `gpt-4o`, your API key) → it appears in the
  list with NO secret shown → click "Make active".
- Open a project → type a prompt in the bottom command bar → Generate → an AI
  Node appears at viewport center with the generated text.
- Select that AI Node → click Expand → child AI Nodes appear connected by arrows,
  laid out as a tidy tree.
- Reload → nodes persist (P2 autosave). Confirm no plaintext key anywhere in the
  network tab responses.

- [ ] **Step 4: Production build sanity**

Run: `pnpm build` → succeeds.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "chore: P3 end-to-end verification fixes"
```

---

## Self-Review

**Spec coverage:**
- AES-256-GCM vault + fail-closed env (spec §5) → Task 1.
- apiKeys + userSettings + owner-scoped repos, metadata-only listing (spec §3,§4,§11) → Task 2.
- Providers (openai-compatible/anthropic/google) + defensive expand parsing (spec §6,§7) → Task 3.
- Settings UI: add/list/delete/active picker (spec §9) → Task 4.
- AI Node custom shape with metadata (spec §8) → Task 5.
- Command bar prompt → AI Node (spec §9,§10) → Task 6.
- Expand → connected child nodes + cleanup layout (spec §8,§10) → Task 7.
- Testing strategy (spec §12): crypto/prompts unit (Tasks 1,3), repos PGlite (Task 2), manual canvas (Task 8).
- Build phases (spec §13) map 1:1 to Tasks 1–8.

**Placeholder scan:** No TBD/vague steps; every code step has full code. AI SDK v6
and tldraw v5 version-verification notes are explicit, bounded fallbacks for the
SDK-coupled surfaces (manually verified), not placeholders.

**Type consistency:** `Db` reused from `projects.repo`. `KeyMetadata` defined in
schema (Task 2) and returned by `addKey`/`listKeys` and consumed by the settings
UI (Task 4). `getDecryptedKey` returns `{provider,baseUrl,model,apiKey}` consumed
directly by `buildModel` (Task 3) in `resolveModel` (Task 6). `buildExpandPrompt`/
`parseExpandResponse` signatures match across Task 3 (def) and Task 6 (use).
`AiNodeShape`/`AiNodeUtil` and the `"ai-node"` type string are consistent across
Tasks 5–7. `commandGenerateAction`/`expandAction` signatures match across Task 6
(def) and Tasks 6/7 (use). Arrow binding `.props.terminal` shape in Task 7 matches
what P2's `cleanup-adapter` reads.
