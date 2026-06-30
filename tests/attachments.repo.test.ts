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
