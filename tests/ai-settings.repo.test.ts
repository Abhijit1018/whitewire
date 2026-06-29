import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { addKey } from "@/core/ai/keys.repo";
import { getSettings, setActiveKey } from "@/core/ai/settings.repo";

beforeEach(async () => {
  await client.exec("DELETE FROM user_settings; DELETE FROM api_keys; DELETE FROM projects; DELETE FROM users;");
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
});

describe("settings.repo", () => {
  it("returns null activeKeyId when unset", async () => {
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
