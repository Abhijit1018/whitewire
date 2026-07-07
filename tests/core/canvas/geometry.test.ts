import { describe, expect, it } from "vitest";
import { normalizeRect, rectFromDrag } from "@/core/canvas/geometry";

describe("normalizeRect", () => {
  it("orders a top-left → bottom-right drag", () => {
    expect(normalizeRect({ x: 10, y: 20 }, { x: 40, y: 60 })).toEqual({
      x: 10, y: 20, width: 30, height: 40,
    });
  });

  it("normalizes an inverted (bottom-right → top-left) drag", () => {
    expect(normalizeRect({ x: 40, y: 60 }, { x: 10, y: 20 })).toEqual({
      x: 10, y: 20, width: 30, height: 40,
    });
  });
});

describe("rectFromDrag", () => {
  it("returns the normalized rectangle by default", () => {
    expect(rectFromDrag({ x: 0, y: 0 }, { x: 50, y: 30 })).toEqual({
      x: 0, y: 0, width: 50, height: 30,
    });
  });

  it("constrains to a square using the larger magnitude, keeping direction", () => {
    expect(rectFromDrag({ x: 0, y: 0 }, { x: 50, y: 30 }, true)).toEqual({
      x: 0, y: 0, width: 50, height: 50,
    });
  });

  it("constrains a square for an up-left drag, keeping the anchor corner", () => {
    expect(rectFromDrag({ x: 100, y: 100 }, { x: 60, y: 90 }, true)).toEqual({
      x: 60, y: 60, width: 40, height: 40,
    });
  });
});
