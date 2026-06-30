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
      ownerId: "u1", provider: "openai-compatible", label: "My OpenAI",
      baseUrl: "https://api.openai.com/v1", model: "gpt-4o", apiKey: "sk-secret",
    });
    expect(meta.label).toBe("My OpenAI");
    expect(JSON.stringify(meta)).not.toContain("sk-secret");
  });

  it("stores the key encrypted (not plaintext) in the row", async () => {
    await addKey(testDb, { ownerId: "u1", provider: "anthropic", label: "A", baseUrl: null, model: "claude-3-5-sonnet-latest", apiKey: "sk-plain" });
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
