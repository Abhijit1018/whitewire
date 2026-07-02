import { describe, it, expect, vi } from "vitest";
import { purgeOwnerData } from "@/core/persistence/purge.repo";
import { projects, users } from "@/core/persistence/schema";

it("deletes projects before the user row", async () => {
  const calls: unknown[] = [];
  const fakeDb = {
    delete: (table: unknown) => ({
      where: async () => {
        calls.push(table);
      },
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await purgeOwnerData(fakeDb as any, "user-1");
  expect(calls[0]).toBe(projects);
  expect(calls[1]).toBe(users);
});
