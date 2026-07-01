import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll } from "vitest";
import * as schema from "@/core/persistence/schema";

// 32-byte test key (base64). Real key comes from env in production.
process.env.ENCRYPTION_KEY ||= Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

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
    CREATE TABLE IF NOT EXISTS canvas_docs (
      project_id uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      snapshot jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS api_keys (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider text NOT NULL,
      label text NOT NULL,
      base_url text,
      model text NOT NULL,
      encrypted text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      active_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
      routes jsonb NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE TABLE IF NOT EXISTS artifacts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      source_node_id text NOT NULL,
      type text NOT NULL,
      content text NOT NULL,
      source_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (project_id, source_node_id, type)
    );
    CREATE TABLE IF NOT EXISTS attachments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      source_node_id text NOT NULL,
      type text NOT NULL,
      content text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
});
