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
