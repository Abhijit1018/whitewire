import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // Git worktrees under .claude/ hold stale copies of every suite.
    exclude: ["node_modules/**", ".claude/**", "dist/**", ".next/**"],
    setupFiles: ["tests/setup.ts"],
    globals: true,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "tests/stubs/empty-module.ts"),
      "client-only": path.resolve(__dirname, "tests/stubs/empty-module.ts"),
    },
  },
});
