import { describe, expect, it } from "vitest";
import { computeAlign, computeDistribute, type AlignNode } from "@/core/canvas/align";

const nodes: AlignNode[] = [
  { id: "a", x: 0, y: 0, width: 100, height: 40 },
  { id: "b", x: 50, y: 100, width: 60, height: 20 },
  { id: "c", x: 200, y: 30, width: 40, height: 80 },
];

describe("computeAlign", () => {
  it("left aligns every node to the min x", () => {
    const p = computeAlign(nodes, "left");
    expect(p.a.x).toBe(0);
    expect(p.b.x).toBe(0);
    expect(p.c.x).toBe(0);
  });

  it("right aligns so right edges meet max right (200+40=240)", () => {
    const p = computeAlign(nodes, "right");
    expect(p.a.x).toBe(240 - 100);
    expect(p.b.x).toBe(240 - 60);
    expect(p.c.x).toBe(240 - 40);
  });

  it("center-h centers each node on the bounding-box center", () => {
    // bbox x: [0, 240] → centerX 120
    const p = computeAlign(nodes, "center-h");
    expect(p.a.x).toBe(120 - 50);
    expect(p.c.x).toBe(120 - 20);
  });

  it("top aligns to min y", () => {
    expect(computeAlign(nodes, "top").b.y).toBe(0);
  });

  it("bottom aligns to max bottom (100+20=120)", () => {
    const p = computeAlign(nodes, "bottom");
    expect(p.a.y).toBe(120 - 40);
    expect(p.b.y).toBe(120 - 20);
  });

  it("returns empty for fewer than 2 nodes", () => {
    expect(computeAlign([nodes[0]], "left")).toEqual({});
  });
});

describe("computeDistribute", () => {
  it("evenly spaces centers horizontally, keeping extremes fixed", () => {
    // centers x: a=50, b=80, c=220. first=50 last=220 step=85 → middle center=135
    const p = computeDistribute(nodes, "h");
    expect(p.a).toBeUndefined();
    expect(p.c).toBeUndefined();
    expect(p.b!.x).toBe(135 - 30); // center 135 minus half width (60/2)
  });

  it("evenly spaces centers vertically", () => {
    // centers y: a=20, c=70, b=110. sorted a,c,b. first=20 last=110 step=45 → middle=65
    const p = computeDistribute(nodes, "v");
    expect(p.c!.y).toBe(65 - 40); // c height 80 → half 40
  });

  it("returns empty for fewer than 3 nodes", () => {
    expect(computeDistribute(nodes.slice(0, 2), "h")).toEqual({});
  });
});
