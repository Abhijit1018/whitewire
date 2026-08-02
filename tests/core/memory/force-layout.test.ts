import { describe, it, expect } from "vitest";
import { layoutForce, boundsOf } from "@/core/memory/force-layout";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `n${i}`);

describe("layoutForce", () => {
  it("handles an empty graph", () => {
    expect(layoutForce([], [])).toEqual([]);
  });

  it("places every node", () => {
    expect(layoutForce(ids(20), [])).toHaveLength(20);
  });

  it("never produces a NaN position", () => {
    const nodes = layoutForce(ids(30), [{ from: "n0", to: "n1" }]);
    expect(nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });

  it("settles the same way every run, so the map does not jump about", () => {
    const a = layoutForce(ids(15), [{ from: "n0", to: "n3" }]);
    const b = layoutForce(ids(15), [{ from: "n0", to: "n3" }]);
    expect(a.map((n) => [n.x, n.y])).toEqual(b.map((n) => [n.x, n.y]));
  });

  it("pushes unconnected nodes apart rather than stacking them", () => {
    const nodes = layoutForce(ids(12), []);
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
        expect(d).toBeGreaterThan(1);
      }
    }
  });

  it("pulls linked nodes closer than unlinked ones", () => {
    const nodes = layoutForce(ids(6), [{ from: "n0", to: "n1" }]);
    const by = new Map(nodes.map((n) => [n.id, n]));
    const linked = Math.hypot(by.get("n0")!.x - by.get("n1")!.x, by.get("n0")!.y - by.get("n1")!.y);
    const far = Math.hypot(by.get("n0")!.x - by.get("n4")!.x, by.get("n0")!.y - by.get("n4")!.y);
    expect(linked).toBeLessThan(far);
  });

  it("counts degree so busier nodes can be drawn larger", () => {
    const nodes = layoutForce(ids(4), [
      { from: "n0", to: "n1" },
      { from: "n0", to: "n2" },
    ]);
    expect(nodes.find((n) => n.id === "n0")!.degree).toBe(2);
    expect(nodes.find((n) => n.id === "n3")!.degree).toBe(0);
  });

  it("ignores links pointing at nodes that are not present", () => {
    const nodes = layoutForce(ids(3), [{ from: "n0", to: "ghost" }]);
    expect(nodes.every((n) => n.degree === 0)).toBe(true);
  });

  it("ignores a self link", () => {
    expect(layoutForce(ids(2), [{ from: "n0", to: "n0" }])[0].degree).toBe(0);
  });

  it("copes with a graph the size of a real vault", () => {
    const many = ids(200);
    const links = many.slice(1).map((id, i) => ({ from: many[i], to: id }));
    const nodes = layoutForce(many, links, { iterations: 60 });
    expect(nodes).toHaveLength(200);
    expect(nodes.every((n) => Number.isFinite(n.x))).toBe(true);
  });
});

describe("boundsOf", () => {
  it("measures the settled layout", () => {
    const b = boundsOf([
      { id: "a", x: -10, y: -5, vx: 0, vy: 0, degree: 0 },
      { id: "b", x: 30, y: 15, vx: 0, vy: 0, degree: 0 },
    ]);
    expect(b).toEqual({ x: -10, y: -5, w: 40, h: 20 });
  });

  it("is empty for no nodes", () => {
    expect(boundsOf([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});
