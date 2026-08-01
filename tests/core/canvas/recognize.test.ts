import { describe, it, expect } from "vitest";
import {
  classifyStroke,
  clusterText,
  buildGraph,
  promoteArrowHeads,
  recognizeStrokes,
  describeGraph,
  bboxOf,
  polygonArea,
  simplify,
  isClosed,
} from "@/core/canvas/recognize";

const asPoints = (pts: number[][]) => pts.map(([x, y]) => [x, y] as [number, number]);

/** Traces a rectangle outline as a closed run of points. */
function rect(x: number, y: number, w: number, h: number, step = 10): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= w; i += step) pts.push([x + i, y]);
  for (let i = 0; i <= h; i += step) pts.push([x + w, y + i]);
  for (let i = w; i >= 0; i -= step) pts.push([x + i, y + h]);
  for (let i = h; i >= 0; i -= step) pts.push([x, y + i]);
  return pts;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 48): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  return pts;
}

function diamond(cx: number, cy: number, rx: number, ry: number, step = 0.05): number[][] {
  const corners: number[][] = [
    [cx, cy - ry],
    [cx + rx, cy],
    [cx, cy + ry],
    [cx - rx, cy],
    [cx, cy - ry],
  ];
  const pts: number[][] = [];
  for (let i = 1; i < corners.length; i += 1) {
    const [x0, y0] = corners[i - 1];
    const [x1, y1] = corners[i];
    for (let t = 0; t < 1; t += step) pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
  }
  pts.push(corners[corners.length - 1]);
  return pts;
}

function line(x0: number, y0: number, x1: number, y1: number, steps = 20): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= steps; i += 1) {
    pts.push([x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps]);
  }
  return pts;
}

/** A shaft followed by barbs that double back from the tip. */
function arrow(x0: number, y0: number, x1: number, y1: number): number[][] {
  return [...line(x0, y0, x1, y1), [x1 - 20, y1 - 12], [x1, y1], [x1 - 20, y1 + 12]];
}

function zigzag(x: number, y: number, size = 10, teeth = 4): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= teeth; i += 1) {
    pts.push([x + i * size, y + (i % 2 === 0 ? 0 : size * 2)]);
  }
  return pts;
}

describe("geometry helpers", () => {
  it("computes a bounding box across all points", () => {
    expect(bboxOf(asPoints([[10, 20], [30, 5], [15, 40]]))).toEqual({ x: 10, y: 5, w: 20, h: 35 });
  });

  it("computes polygon area with the shoelace formula", () => {
    expect(polygonArea(asPoints([[0, 0], [10, 0], [10, 10], [0, 10]]))).toBe(100);
  });

  it("keeps the endpoints when simplifying a straight run", () => {
    const simplified = simplify(asPoints(line(0, 0, 100, 0)), 1);
    expect(simplified).toEqual([[0, 0], [100, 0]]);
  });

  it("treats a traced outline as closed and a straight run as open", () => {
    expect(isClosed(asPoints(rect(0, 0, 100, 60)))).toBe(true);
    expect(isClosed(asPoints(line(0, 0, 100, 0)))).toBe(false);
  });
});

describe("classifyStroke", () => {
  it("recognizes a rectangle", () => {
    const s = classifyStroke("a", rect(20, 30, 200, 100));
    expect(s.kind).toBe("rect");
    expect(s.bbox).toEqual({ x: 20, y: 30, w: 200, h: 100 });
  });

  it("recognizes an ellipse", () => {
    expect(classifyStroke("a", ellipse(100, 100, 80, 50)).kind).toBe("ellipse");
  });

  it("recognizes a diamond", () => {
    expect(classifyStroke("a", diamond(100, 100, 70, 70)).kind).toBe("diamond");
  });

  it("recognizes a straight line", () => {
    expect(classifyStroke("a", line(0, 0, 200, 0)).kind).toBe("line");
  });

  it("recognizes an arrow by its doubled-back head", () => {
    const s = classifyStroke("a", arrow(0, 0, 200, 0));
    expect(s.kind).toBe("arrow");
    // The head marks the tip, not the last drawn point.
    expect(s.end).toEqual([200, 0]);
  });

  it("falls back to scribble for handwriting", () => {
    expect(classifyStroke("a", zigzag(0, 0)).kind).toBe("scribble");
  });

  it("treats a dot as a scribble rather than a shape", () => {
    expect(classifyStroke("a", [[0, 0], [1, 1], [0, 0]]).kind).toBe("scribble");
  });
});

describe("clusterText", () => {
  it("groups nearby scribbles into one label and keeps distant ones apart", () => {
    const strokes = [
      classifyStroke("a", zigzag(0, 0)),
      classifyStroke("b", zigzag(45, 0)),
      classifyStroke("c", zigzag(600, 400)),
    ];
    const clusters = clusterText(strokes);
    expect(clusters).toHaveLength(2);
    expect(clusters.map((c) => c.strokeIds.length).sort()).toEqual([1, 2]);
  });

  it("ignores large strokes, which are drawings rather than letters", () => {
    expect(clusterText([classifyStroke("a", rect(0, 0, 300, 200))])).toHaveLength(0);
  });
});

describe("promoteArrowHeads", () => {
  it("upgrades a line to an arrow when a small scribble sits on its end", () => {
    const strokes = [
      classifyStroke("shaft", line(0, 0, 200, 0)),
      classifyStroke("head", zigzag(190, -10, 6, 3)),
    ];
    const { strokes: promoted, consumedIds } = promoteArrowHeads(strokes);
    expect(promoted.find((s) => s.id === "shaft")?.kind).toBe("arrow");
    expect(consumedIds.has("head")).toBe(true);
  });

  it("leaves a lone line alone", () => {
    const { strokes } = promoteArrowHeads([classifyStroke("shaft", line(0, 0, 200, 0))]);
    expect(strokes[0].kind).toBe("line");
  });
});

describe("buildGraph", () => {
  const boxA = classifyStroke("a", rect(0, 0, 150, 100));
  const boxB = classifyStroke("b", rect(300, 0, 150, 100));

  it("connects two shapes joined by an arrow", () => {
    const link = classifyStroke("l", arrow(155, 50, 295, 50));
    const graph = buildGraph([boxA, boxB, link], []);
    expect(graph.shapes).toHaveLength(2);
    expect(graph.connections).toEqual([{ fromId: "box1", toId: "box2", directed: true }]);
  });

  it("marks a plain line as undirected", () => {
    const link = classifyStroke("l", line(155, 50, 295, 50));
    expect(buildGraph([boxA, boxB, link], [])[
      "connections"
    ]).toEqual([{ fromId: "box1", toId: "box2", directed: false }]);
  });

  it("drops a connector with a loose end", () => {
    const dangling = classifyStroke("l", arrow(155, 50, 260, 50));
    expect(buildGraph([boxA, dangling], []).connections).toHaveLength(0);
  });

  it("records nesting when one shape is drawn inside another", () => {
    const outer = classifyStroke("o", rect(0, 0, 400, 300));
    const inner = classifyStroke("i", rect(50, 50, 100, 80));
    const graph = buildGraph([outer, inner], []);
    expect(graph.containment).toEqual([{ parentId: "box1", childId: "box2" }]);
  });

  it("attaches a label to the shape that encloses it", () => {
    const cluster = {
      id: "text1",
      bbox: { x: 40, y: 40, w: 40, h: 14 },
      strokeIds: ["t"],
      text: "Login",
    };
    const graph = buildGraph([boxA], [cluster]);
    expect(graph.shapes[0].label).toBe("Login");
    expect(graph.looseLabels).toEqual([]);
  });

  it("keeps handwriting outside any shape as a loose label", () => {
    const cluster = {
      id: "text1",
      bbox: { x: 800, y: 800, w: 40, h: 14 },
      strokeIds: ["t"],
      text: "Auth flow",
    };
    expect(buildGraph([boxA], [cluster]).looseLabels).toEqual(["Auth flow"]);
  });
});

describe("recognizeStrokes", () => {
  it("classifies shapes and clusters handwriting in one pass", () => {
    const { strokes, clusters } = recognizeStrokes([
      { id: "a", points: rect(0, 0, 150, 100) },
      { id: "t", points: zigzag(40, 40) },
    ]);
    expect(strokes.map((s) => s.kind)).toEqual(["rect", "scribble"]);
    expect(clusters).toHaveLength(1);
  });
});

describe("describeGraph", () => {
  it("renders shapes, connections and nesting as text", () => {
    const graph = buildGraph(
      [
        classifyStroke("a", rect(0, 0, 150, 100)),
        classifyStroke("b", rect(300, 0, 150, 100)),
        classifyStroke("l", arrow(155, 50, 295, 50)),
      ],
      [{ id: "text1", bbox: { x: 40, y: 40, w: 40, h: 14 }, strokeIds: ["t"], text: "Login" }],
    );
    const text = describeGraph(graph);
    expect(text).toContain("box1: rectangle at (0,0) size 150x100 labelled \"Login\"");
    expect(text).toContain("box2: rectangle at (300,0) size 150x100 unlabelled");
    expect(text).toContain("- box1 -> box2");
  });

  it("returns an empty string when nothing was recognized", () => {
    expect(describeGraph({ shapes: [], connections: [], containment: [], looseLabels: [] })).toBe("");
  });
});
