import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./core/persistence/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
