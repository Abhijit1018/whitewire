import { beforeEach, describe, expect, it } from "vitest";
import { testDb, client } from "./setup";
import { ensureUser } from "@/core/persistence/users.repo";
import { createProject } from "@/core/persistence/projects.repo";
import {
  saveVersion,
  listVersions,
  getVersionSnapshot,
  logPrompt,
  listPrompts,
} from "@/core/persistence/versions.repo";

let projectId: string;

beforeEach(async () => {
  await client.exec(
    "DELETE FROM prompt_history; DELETE FROM versions; DELETE FROM attachments; DELETE FROM artifacts; DELETE FROM canvas_docs; DELETE FROM user_settings; DELETE FROM api_keys; DELETE FROM projects; DELETE FROM users;",
  );
  await ensureUser(testDb, { id: "u1", email: "a@b.com" });
  await ensureUser(testDb, { id: "u2", email: "c@d.com" });
  const p = await createProject(testDb, { ownerId: "u1", name: "P" });
  projectId = p.id;
});

describe("versions.repo", () => {
  it("saves a version and lists it (metadata only)", async () => {
    const meta = await saveVersion(testDb, { ownerId: "u1", projectId, label: "v1", snapshot: { nodes: [1] } });
    const list = await listVersions(testDb, { ownerId: "u1", projectId });
    expect(list.map((v) => v.id)).toContain(meta.id);
    expect(JSON.stringify(list)).not.toContain("nodes");
  });

  it("restores a version snapshot for the owner only", async () => {
    const meta = await saveVersion(testDb, { ownerId: "u1", projectId, label: "v1", snapshot: { a: 1 } });
    expect(await getVersionSnapshot(testDb, { ownerId: "u1", id: meta.id })).toEqual({ a: 1 });
    expect(await getVersionSnapshot(testDb, { ownerId: "u2", id: meta.id })).toBeUndefined();
  });

  it("rejects saving a version for a non-owner", async () => {
    await expect(
      saveVersion(testDb, { ownerId: "u2", projectId, label: "x", snapshot: {} }),
    ).rejects.toThrow("Project not found");
  });

  it("logs and lists prompts, owner-scoped", async () => {
    await logPrompt(testDb, { ownerId: "u1", projectId, kind: "command", prompt: "hi", output: "out" });
    await logPrompt(testDb, { ownerId: "u2", projectId, kind: "command", prompt: "nope", output: "x" });
    const list = await listPrompts(testDb, { ownerId: "u1", projectId });
    expect(list).toHaveLength(1);
    expect(list[0].prompt).toBe("hi");
    expect(await listPrompts(testDb, { ownerId: "u2", projectId })).toHaveLength(0);
  });
});
