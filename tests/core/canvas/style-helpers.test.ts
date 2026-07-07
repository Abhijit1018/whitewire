import { describe, expect, it } from "vitest";
import { dashArray, penSize } from "@/core/canvas/style";

describe("dashArray", () => {
  it("solid → no dashes", () => {
    expect(dashArray("solid", 2)).toEqual([]);
  });
  it("dashed → scaled by width", () => {
    expect(dashArray("dashed", 2)).toEqual([8, 4]);
  });
  it("dotted → tight dots scaled by width", () => {
    expect(dashArray("dotted", 4)).toEqual([4, 8]);
  });
});

describe("penSize", () => {
  it("maps the three stroke widths to freehand sizes", () => {
    expect(penSize(1)).toBe(4);
    expect(penSize(2)).toBe(7);
    expect(penSize(4)).toBe(12);
  });
});
