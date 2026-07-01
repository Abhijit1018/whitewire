import { describe, expect, it } from "vitest";
import { generatorsForKind } from "@/core/artifacts/kinds";

describe("generatorsForKind", () => {
  it("component → ui + docs primary", () => {
    expect(generatorsForKind("component").primary).toEqual(["ui", "docs"]);
  });
  it("feature → api, schema, docs primary", () => {
    expect(generatorsForKind("feature").primary).toEqual(["api", "schema", "docs"]);
  });
  it("idea → docs primary", () => {
    expect(generatorsForKind("idea").primary).toEqual(["docs"]);
  });
  it("entity → schema, orm, erd, docs primary", () => {
    expect(generatorsForKind("entity").primary).toEqual(["schema", "orm", "erd", "docs"]);
  });
  it("generic/unknown → all generators primary", () => {
    expect(generatorsForKind("generic").primary).toEqual(["schema", "api", "orm", "erd", "ui", "docs"]);
    expect(generatorsForKind("whatever").primary).toEqual(["schema", "api", "orm", "erd", "ui", "docs"]);
  });
  it("all is always the full generator set", () => {
    expect(generatorsForKind("idea").all).toEqual(["schema", "api", "orm", "erd", "ui", "docs"]);
  });
});
