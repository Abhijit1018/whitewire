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

  it("does not delete a project owned by someone else", async () => {
    const p = await createProject(testDb, { ownerId: "u1", name: "Keep" });
    await deleteProject(testDb, { id: p.id, ownerId: "intruder" });
    const list = await listProjects(testDb, "u1");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(p.id);
  });

  it("lists projects newest-updated first", async () => {
    const a = await createProject(testDb, { ownerId: "u1", name: "A" });
    await new Promise(r => setTimeout(r, 2));
    const b = await createProject(testDb, { ownerId: "u1", name: "B" });
    await new Promise(r => setTimeout(r, 2));
    // Renaming A bumps its updatedAt to the latest, so it should sort first.
    await renameProject(testDb, { id: a.id, ownerId: "u1", name: "A2" });
    const list = await listProjects(testDb, "u1");
    expect(list.map((p) => p.id)).toEqual([a.id, b.id]);
  });
});
