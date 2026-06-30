import type { GenType } from "@/core/artifacts/kinds";

export function buildArtifactPrompt(type: GenType, nodeText: string): string {
  const base = `Source concept: "${nodeText}"\n\n`;
  switch (type) {
    case "schema":
      return base + "Generate a PostgreSQL schema (SQL DDL) for this concept. Reply with ONLY SQL, no prose.";
    case "api":
      return base + "Generate a concise REST API endpoint list (method + path + one-line purpose) for this concept. Reply with ONLY the list.";
    case "ui":
      return base + "Generate a single React function component (TypeScript) for this concept. Reply with ONLY the code.";
    case "docs":
      return base + "Write concise markdown documentation for this concept. Reply with ONLY markdown.";
  }
}
