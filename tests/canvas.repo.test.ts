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
    expect(await getCanvas(testDb, { projectId, ownerId: "u1" })).toBeUndefined();
  });
});
