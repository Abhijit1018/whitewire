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
