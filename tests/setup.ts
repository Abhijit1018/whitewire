import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll } from "vitest";
import * as schema from "@/core/persistence/schema";

export const client = new PGlite();
export const testDb = drizzle(client, { schema });

beforeAll(async () => {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS projects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id text NOT NULL REFERENCES users(id),
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});
