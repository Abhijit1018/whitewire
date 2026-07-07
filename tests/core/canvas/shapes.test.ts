import { describe, expect, it } from "vitest";
import { SHAPES, shapePrimitive } from "@/core/canvas/shapes";

describe("SHAPES", () => {
  it("covers basic, flowchart, and decorative categories", () => {
    const cats = new Set(SHAPES.map((s) => s.category));
    expect(cats).toEqual(new Set(["basic", "flowchart", "decorative"]));
  });
  it("includes the full requested set", () => {
    const ids = SHAPES.map((s) => s.id).sort();
    expect(ids).toEqual(
      [
        "arrow", "arrowBlock", "cloud", "cylinder", "diamond", "ellipse", "heart",
        "hexagon", "line", "parallelogram", "rectangle", "roundRect", "speechBubble",
        "star", "triangle",
      ].sort(),
    );
  });
});

describe("shapePrimitive", () => {
  it("rectangle sharp → rect not rounded", () => {
    expect(shapePrimitive("rectangle", 100, 60, "sharp")).toEqual({ kind: "rect", round: false });
  });
  it("rectangle with round edges → rounded rect", () => {
    expect(shapePrimitive("rectangle", 100, 60, "round")).toEqual({ kind: "rect", round: true });
  });
  it("ellipse → ellipse primitive", () => {
    expect(shapePrimitive("ellipse", 100, 60, "sharp")).toEqual({ kind: "ellipse" });
  });
  it("triangle → three inset points", () => {
    const p = shapePrimitive("triangle", 100, 60, "sharp");
    expect(p).toEqual({ kind: "polygon", points: [[50, 4], [96, 56], [4, 56]] });
  });
  it("diamond → four inset points", () => {
    const p = shapePrimitive("diamond", 100, 60, "sharp");
    expect(p).toEqual({ kind: "polygon", points: [[50, 4], [96, 30], [50, 56], [4, 30]] });
  });
  it("line → two points, no arrowhead", () => {
    expect(shapePrimitive("line", 100, 60, "sharp")).toEqual({
      kind: "line", points: [[4, 30], [96, 30]], arrow: false,
    });
  });
  it("arrow → line flagged as arrow", () => {
    const p = shapePrimitive("arrow", 100, 60, "sharp");
    expect(p.kind).toBe("line");
    if (p.kind === "line") expect(p.arrow).toBe(true);
  });
  it("heart → a path primitive", () => {
    expect(shapePrimitive("heart", 100, 60, "sharp").kind).toBe("path");
  });
});
