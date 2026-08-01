import { describe, it, expect } from "vitest";
import { toAbsoluteStrokes } from "@/core/canvas/recognize";

const drawNode = (id: string, x: number, y: number, points: number[][]) => ({
  id,
  type: "drawNode",
  position: { x, y },
  data: { points },
});

describe("toAbsoluteStrokes", () => {
  it("rebases stroke points by their node position", () => {
    const strokes = toAbsoluteStrokes([drawNode("a", 100, 50, [[0, 0], [10, 20]])]);
    expect(strokes).toEqual([{ id: "a", points: [[100, 50], [110, 70]], color: undefined, size: undefined }]);
  });

  it("carries the pen's colour and size through", () => {
    const node = { ...drawNode("a", 0, 0, [[0, 0], [5, 5]]), data: { points: [[0, 0], [5, 5]], color: "#f00", size: 9 } };
    expect(toAbsoluteStrokes([node])).toMatchObject([{ color: "#f00", size: 9 }]);
  });

  it("ignores nodes that are not pen strokes", () => {
    const other = { id: "b", type: "aiNode", position: { x: 0, y: 0 }, data: {} };
    expect(toAbsoluteStrokes([drawNode("a", 0, 0, [[0, 0], [1, 1]]), other])).toHaveLength(1);
  });

  it("ignores strokes too short to have a shape", () => {
    expect(toAbsoluteStrokes([drawNode("a", 0, 0, [[0, 0]])])).toHaveLength(0);
  });
});
