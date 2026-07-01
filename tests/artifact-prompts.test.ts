import { describe, expect, it } from "vitest";
import { buildArtifactPrompt } from "@/core/ai/artifact-prompts";

describe("buildArtifactPrompt", () => {
  it("embeds the node text in every type", () => {
    for (const t of ["schema", "api", "orm", "erd", "ui", "docs"] as const) {
      expect(buildArtifactPrompt(t, "Login Page")).toContain("Login Page");
    }
  });
  it("schema asks for SQL", () => {
    expect(buildArtifactPrompt("schema", "x").toLowerCase()).toContain("sql");
  });
  it("orm asks for an ORM", () => {
    expect(buildArtifactPrompt("orm", "x").toLowerCase()).toContain("orm");
  });
  it("erd asks for a mermaid ER diagram", () => {
    expect(buildArtifactPrompt("erd", "x").toLowerCase()).toContain("mermaid");
  });
  it("api asks for endpoints", () => {
    expect(buildArtifactPrompt("api", "x").toLowerCase()).toContain("endpoint");
  });
  it("ui asks for React", () => {
    expect(buildArtifactPrompt("ui", "x").toLowerCase()).toContain("react");
  });
  it("docs asks for markdown", () => {
    expect(buildArtifactPrompt("docs", "x").toLowerCase()).toContain("markdown");
  });
});
