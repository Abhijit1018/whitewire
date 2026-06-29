import { describe, expect, it } from "vitest";
import { tidyShapes, layoutGraph, cleanup, type Box, type Edge } from "@/core/canvas/cleanup";

const box = (id: string, x: number, y: number): Box => ({ id, x, y, w: 100, h: 60 });

function overlaps(a: { x: number; y: number }, b: { x: number; y: number }, w = 100, h = 60) {
  return Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < h;
}

describe("tidyShapes", () => {
  it("returns a position for every box", () => {
    const boxes = [box("a", 13, 99), box("b", 200, 5), box("c", 7, 7), box("d", 60, 300)];
    const pos = tidyShapes(boxes);
    expect(Object.keys(pos).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("lays boxes on a grid with no overlaps and uniform spacing", () => {
    const boxes = [box("a", 0, 0), box("b", 5, 5), box("c", 10, 10), box("d", 15, 15)];
    const pos = tidyShapes(boxes, { gap: 20 });
    const ids = Object.keys(pos);
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        expect(overlaps(pos[ids[i]], pos[ids[j]])).toBe(false);
    const xs = [...new Set(Object.values(pos).map((p) => p.x))].sort((a, b) => a - b);
    expect(xs).toHaveLength(2);
    expect(xs[1] - xs[0]).toBe(100 + 20);
  });

  it("is deterministic", () => {
    const boxes = [box("a", 0, 0), box("b", 5, 5), box("c", 10, 10)];
    expect(tidyShapes(boxes)).toEqual(tidyShapes(boxes));
  });
});

describe("layoutGraph", () => {
  it("places a child below its parent", () => {
    const boxes = [box("a", 0, 0), box("b", 999, 999)];
    const edges: Edge[] = [{ from: "a", to: "b" }];
    const pos = layoutGraph(boxes, edges);
    expect(pos.b.y).toBeGreaterThan(pos.a.y);
  });

  it("produces no overlapping nodes for a small tree", () => {
    const boxes = [box("a", 0, 0), box("b", 0, 0), box("c", 0, 0)];
    const edges: Edge[] = [{ from: "a", to: "b" }, { from: "a", to: "c" }];
    const pos = layoutGraph(boxes, edges);
    expect(overlaps(pos.b, pos.c)).toBe(false);
  });
});

describe("cleanup (router)", () => {
  it("uses graph layout when edges connect boxes", () => {
    const boxes = [box("a", 0, 0), box("b", 0, 0)];
    const pos = cleanup(boxes, [{ from: "a", to: "b" }]);
    expect(pos.b.y).toBeGreaterThan(pos.a.y);
  });

  it("falls back to tidy when there are no connecting edges", () => {
    const boxes = [box("a", 0, 0), box("b", 5, 5), box("c", 10, 10), box("d", 15, 15)];
    const pos = cleanup(boxes, []);
    const xs = [...new Set(Object.values(pos).map((p) => p.x))];
    expect(xs.length).toBeGreaterThan(1);
  });

  it("ignores edges that reference unknown boxes", () => {
    const boxes = [box("a", 0, 0), box("b", 5, 5), box("c", 10, 10), box("d", 15, 15)];
    const pos = cleanup(boxes, [{ from: "a", to: "ghost" }]);
    const xs = [...new Set(Object.values(pos).map((p) => p.x))];
    expect(xs.length).toBeGreaterThan(1);
  });
});
