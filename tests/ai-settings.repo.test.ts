import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { addKey } from "@/core/ai/keys.repo";
import { getSettings, setActiveKey, setRoute } from "@/core/ai/settings.repo";

beforeEach(async () => {
  await client.exec("DELETE FROM user_settings; DELETE FROM api_keys; DELETE FROM projects; DELETE FROM users;");
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
});

describe("settings.repo", () => {
  it("returns empty settings when unset", async () => {
    expect(await getSettings(testDb, "u1")).toEqual({ activeKeyId: null, routes: {} });
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

  it("rejects activating a key the caller does not own", async () => {
    await ensureUser(testDb, { id: "u2", email: "c@d.com" });
    const theirs = await addKey(testDb, { ownerId: "u2", provider: "anthropic", label: "B", baseUrl: null, model: "m", apiKey: "k" });
    await expect(
      setActiveKey(testDb, { ownerId: "u1", keyId: theirs.id }),
    ).rejects.toThrow("Key not found");
    expect((await getSettings(testDb, "u1")).activeKeyId).toBeNull();
  });

  it("sets and clears a per-role model route", async () => {
    const a = await addKey(testDb, { ownerId: "u1", provider: "google", label: "Reason", baseUrl: null, model: "gemini", apiKey: "k" });
    await setRoute(testDb, { ownerId: "u1", role: "reasoning", keyId: a.id });
    expect((await getSettings(testDb, "u1")).routes).toEqual({ reasoning: a.id });
    await setRoute(testDb, { ownerId: "u1", role: "reasoning", keyId: null });
    expect((await getSettings(testDb, "u1")).routes).toEqual({});
  });

  it("rejects routing to a key the caller does not own", async () => {
    await ensureUser(testDb, { id: "u2", email: "c@d.com" });
    const theirs = await addKey(testDb, { ownerId: "u2", provider: "google", label: "X", baseUrl: null, model: "m", apiKey: "k" });
    await expect(
      setRoute(testDb, { ownerId: "u1", role: "code", keyId: theirs.id }),
    ).rejects.toThrow("Key not found");
  });

  it("keeps routes when changing the active key", async () => {
    const a = await addKey(testDb, { ownerId: "u1", provider: "google", label: "A", baseUrl: null, model: "m", apiKey: "k" });
    await setRoute(testDb, { ownerId: "u1", role: "code", keyId: a.id });
    await setActiveKey(testDb, { ownerId: "u1", keyId: a.id });
    const s = await getSettings(testDb, "u1");
    expect(s.activeKeyId).toBe(a.id);
    expect(s.routes).toEqual({ code: a.id });
  });
});
