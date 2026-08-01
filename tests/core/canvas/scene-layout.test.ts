import { describe, it, expect } from "vitest";
import { layoutScene } from "@/core/canvas/scene-layout";
import { parseScene, SIZE_PX } from "@/core/ai/scene";

const scene = (obj: unknown) => parseScene(JSON.stringify(obj));

describe("layoutScene", () => {
  it("maps each scene type onto its canvas renderer", () => {
    const layout = layoutScene(
      scene({
        nodes: [
          { id: "a", type: "concept", title: "A" },
          { id: "b", type: "table", title: "B" },
          { id: "c", type: "code", title: "C", code: { source: "x" } },
          { id: "d", type: "image", title: "D" },
          { id: "e", type: "video", title: "E" },
          { id: "f", type: "note", title: "F" },
        ],
      }),
    );
    expect(layout.nodes.map((n) => n.type)).toEqual([
      "aiNode",
      "tableNode",
      "codeNode",
      "imageNode",
      "videoNode",
      "noteNode",
    ]);
  });

  it("sizes nodes from their size bucket rather than a fixed box", () => {
    const layout = layoutScene(
      scene({ nodes: [{ id: "a", title: "A", size: "sm" }, { id: "b", title: "B", size: "xl" }] }),
    );
    expect(layout.nodes[0]).toMatchObject(SIZE_PX.sm);
    expect(layout.nodes[1]).toMatchObject(SIZE_PX.xl);
  });

  it("does not overlap nodes laid out side by side", () => {
    const layout = layoutScene(scene({ nodes: [{ id: "a", title: "A" }, { id: "b", title: "B" }] }));
    const [a, b] = layout.nodes;
    expect(b.position.x).toBeGreaterThanOrEqual(a.position.x + a.width);
  });

  it("wraps onto a new row instead of running off to the right", () => {
    const nodes = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, title: `N${i}`, size: "xl" }));
    const layout = layoutScene(scene({ nodes }));
    expect(layout.nodes.some((n) => n.position.y > layout.nodes[0].position.y)).toBe(true);
  });

  it("offsets the whole scene from the given origin", () => {
    const layout = layoutScene(scene({ nodes: [{ id: "a", title: "A" }] }), { x: 500, y: 300 });
    expect(layout.nodes[0].position).toEqual({ x: 500, y: 300 });
  });
});

describe("layoutScene — groups", () => {
  const grouped = scene({
    nodes: [
      { id: "g", type: "group", title: "Worker Pool" },
      { id: "a", title: "Worker 1", parent: "g", size: "sm" },
      { id: "b", title: "Worker 2", parent: "g", size: "sm" },
    ],
  });

  it("parents members to the group", () => {
    const layout = layoutScene(grouped);
    const kids = layout.nodes.filter((n) => n.parentId === "g");
    expect(kids.map((n) => n.id)).toEqual(["a", "b"]);
  });

  it("positions members relative to the group, below its title", () => {
    const layout = layoutScene(grouped);
    const first = layout.nodes.find((n) => n.id === "a")!;
    expect(first.position.x).toBeGreaterThan(0);
    expect(first.position.y).toBeGreaterThan(0);
  });

  it("grows the group to contain its members", () => {
    const layout = layoutScene(grouped);
    const group = layout.nodes.find((n) => n.id === "g")!;
    const kids = layout.nodes.filter((n) => n.parentId === "g");
    for (const kid of kids) {
      expect(kid.position.x + kid.width).toBeLessThanOrEqual(group.width);
      expect(kid.position.y + kid.height).toBeLessThanOrEqual(group.height);
    }
  });

  it("treats a node parented to a non-group as a peer", () => {
    const layout = layoutScene(
      scene({ nodes: [{ id: "p", type: "table", title: "P" }, { id: "c", title: "C", parent: "p" }] }),
    );
    expect(layout.nodes.every((n) => n.parentId === undefined)).toBe(true);
  });
});

describe("layoutScene — edges", () => {
  it("carries the label and joins the sub-caption onto it", () => {
    const layout = layoutScene(
      scene({
        nodes: [{ id: "a", title: "A" }, { id: "b", title: "B" }],
        edges: [{ from: "a", to: "b", label: "3. Iterate", note: "3 at a time" }],
      }),
    );
    expect(layout.edges[0]).toEqual({
      source: "a",
      target: "b",
      label: "3. Iterate — 3 at a time",
      directed: true,
    });
  });

  it("leaves the label unset when the model gave none", () => {
    const layout = layoutScene(
      scene({ nodes: [{ id: "a", title: "A" }, { id: "b", title: "B" }], edges: [["a", "b"]] }),
    );
    expect(layout.edges[0].label).toBeUndefined();
  });
});

describe("layoutScene — wireframe devices", () => {
  const wire = (device: string) =>
    scene({
      nodes: [
        {
          id: "w",
          type: "wireframe",
          title: "Screen",
          size: "lg",
          wireframe: { title: "S", device, elements: [{ type: "button", label: "Go", x: 1, y: 1, w: 10, h: 5 }] },
        },
      ],
    });

  it("draws a mobile screen taller than it is wide", () => {
    const node = layoutScene(wire("mobile")).nodes[0];
    expect(node.height).toBeGreaterThan(node.width);
  });

  it("draws a desktop screen wider than it is tall", () => {
    const node = layoutScene(wire("desktop")).nodes[0];
    expect(node.width).toBeGreaterThan(node.height);
  });

  it("falls back to the plain size bucket when no device is named", () => {
    const node = layoutScene(
      scene({ nodes: [{ id: "w", type: "wireframe", title: "S", size: "lg" }] }),
    ).nodes[0];
    expect(node).toMatchObject(SIZE_PX.lg);
  });
});

describe("layoutScene — board genres", () => {
  const many = (n: number, extra: Record<string, unknown> = {}) =>
    Array.from({ length: n }, (_, i) => ({ id: `n${i}`, title: `N${i}`, size: "sm", ...extra }));

  const noOverlap = (nodes: { position: { x: number; y: number }; width: number; height: number }[]) => {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const apart =
          a.position.x + a.width <= b.position.x ||
          b.position.x + b.width <= a.position.x ||
          a.position.y + a.height <= b.position.y ||
          b.position.y + b.height <= a.position.y;
        if (!apart) return false;
      }
    }
    return true;
  };

  it("defaults to flow when no layout is named", () => {
    expect(scene({ nodes: many(2) }).layout).toBe("flow");
  });

  it("ignores a layout it cannot draw", () => {
    expect(scene({ layout: "spiral", nodes: many(2) }).layout).toBe("flow");
  });

  it("puts the first node in the middle of a mindmap", () => {
    const nodes = layoutScene(scene({ layout: "mindmap", nodes: many(7) })).nodes;
    const centre = nodes[0];
    const xs = nodes.map((n) => n.position.x);
    const ys = nodes.map((n) => n.position.y);
    expect(centre.position.x).toBeGreaterThan(Math.min(...xs));
    expect(centre.position.x).toBeLessThan(Math.max(...xs));
    expect(centre.position.y).toBeGreaterThan(Math.min(...ys));
    expect(centre.position.y).toBeLessThan(Math.max(...ys));
  });

  it("keeps every node on canvas whatever the genre", () => {
    for (const layout of ["mindmap", "tree", "matrix", "timeline"]) {
      const nodes = layoutScene(scene({ layout, nodes: many(6) })).nodes;
      expect(nodes.every((n) => n.position.x >= 0 && n.position.y >= 0)).toBe(true);
    }
  });

  it("layers a tree by its edges", () => {
    const layout = layoutScene(
      scene({
        layout: "tree",
        nodes: many(3),
        edges: [{ from: "n0", to: "n1" }, { from: "n1", to: "n2" }],
      }),
    );
    const [root, mid, leaf] = layout.nodes;
    expect(mid.position.y).toBeGreaterThan(root.position.y);
    expect(leaf.position.y).toBeGreaterThan(mid.position.y);
  });

  it("does not stack a tree when the edges form a cycle", () => {
    const layout = layoutScene(
      scene({
        layout: "tree",
        nodes: many(2),
        edges: [{ from: "n0", to: "n1" }, { from: "n1", to: "n0" }],
      }),
    );
    expect(noOverlap(layout.nodes)).toBe(true);
  });

  it("spreads a matrix across two rows and two columns", () => {
    const nodes = layoutScene(scene({ layout: "matrix", nodes: many(4) })).nodes;
    expect(new Set(nodes.map((n) => n.position.x)).size).toBeGreaterThan(1);
    expect(new Set(nodes.map((n) => n.position.y)).size).toBeGreaterThan(1);
  });

  it("runs a timeline left to right, alternating about the spine", () => {
    const nodes = layoutScene(scene({ layout: "timeline", nodes: many(4) })).nodes;
    for (let i = 1; i < nodes.length; i += 1) {
      expect(nodes[i].position.x).toBeGreaterThan(nodes[i - 1].position.x);
    }
    expect(nodes[0].position.y).not.toBe(nodes[1].position.y);
  });

  it("never overlaps nodes in any genre", () => {
    for (const layout of ["flow", "mindmap", "tree", "matrix", "timeline"]) {
      expect(noOverlap(layoutScene(scene({ layout, nodes: many(6) })).nodes)).toBe(true);
    }
  });
});
