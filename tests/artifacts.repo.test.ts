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
