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
  it("generic/unknown → all four primary", () => {
    expect(generatorsForKind("generic").primary).toEqual(["schema", "api", "ui", "docs"]);
    expect(generatorsForKind("whatever").primary).toEqual(["schema", "api", "ui", "docs"]);
  });
  it("all is always the four generators", () => {
    expect(generatorsForKind("idea").all).toEqual(["schema", "api", "ui", "docs"]);
  });
});
