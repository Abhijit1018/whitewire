import { describe, it, expect } from "vitest";
import { parseScene, SIZE_PX } from "@/core/ai/scene";

const wrap = (obj: unknown) => JSON.stringify(obj);

describe("parseScene — nodes", () => {
  it("reads a mixed scene rather than one node shape", () => {
    const scene = parseScene(
      wrap({
        nodes: [
          { id: "a", type: "concept", title: "Idea", body: "one line" },
          { id: "b", type: "table", title: "users", table: { columns: [{ name: "id", type: "uuid", key: "pk" }] } },
          { id: "c", type: "code", title: "handler", code: { language: "ts", source: "export {}" } },
        ],
        edges: [],
      }),
    );
    expect(scene.nodes.map((n) => n.type)).toEqual(["concept", "table", "code"]);
    expect(scene.nodes[1].table?.columns[0]).toEqual({ name: "id", type: "uuid", key: "pk" });
    expect(scene.nodes[2].code).toEqual({ language: "ts", source: "export {}" });
  });

  it("gives content-heavy types a larger default box", () => {
    const scene = parseScene(
      wrap({ nodes: [{ id: "a", type: "code", title: "x", code: { source: "y" } }, { id: "b", title: "note" }] }),
    );
    expect(scene.nodes[0].size).toBe("lg");
    expect(scene.nodes[1].size).toBe("md");
  });

  it("honours an explicit size over the default", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "a", type: "code", title: "x", size: "sm", code: { source: "y" } }] }));
    expect(scene.nodes[0].size).toBe("sm");
  });

  it("falls back to concept for an unknown type", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "a", type: "hologram", title: "x" }] }));
    expect(scene.nodes[0].type).toBe("concept");
  });

  it("keeps the node but drops a malformed payload", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "a", type: "table", title: "users", table: { columns: "nope" } }] }));
    expect(scene.nodes).toHaveLength(1);
    expect(scene.nodes[0].table).toBeUndefined();
  });

  it("accepts label/name and note/description as aliases", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "a", label: "Titled", description: "detail" }] }));
    expect(scene.nodes[0]).toMatchObject({ title: "Titled", body: "detail" });
  });

  it("assigns an id when the model omits one", () => {
    const scene = parseScene(wrap({ nodes: [{ title: "x" }, { title: "y" }] }));
    expect(scene.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("drops an empty concept but keeps a titled one", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "a" }, { id: "b", title: "real" }] }));
    expect(scene.nodes.map((n) => n.id)).toEqual(["b"]);
  });

  it("discards duplicate ids so edges cannot bind to the wrong node", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "a", title: "first" }, { id: "a", title: "second" }] }));
    expect(scene.nodes).toHaveLength(1);
    expect(scene.nodes[0].title).toBe("first");
  });

  it("only accepts shapes the canvas actually knows", () => {
    const scene = parseScene(
      wrap({ nodes: [{ id: "a", type: "shape", title: "d", shape: "diamond" }, { id: "b", type: "shape", title: "z", shape: "trapezoid" }] }),
    );
    expect(scene.nodes[0].shape).toBe("diamond");
    expect(scene.nodes[1].shape).toBeUndefined();
  });

  it("ignores prose wrapped around the JSON", () => {
    const scene = parseScene('Here you go:\n{"nodes":[{"id":"a","title":"x"}],"edges":[]}\nEnjoy!');
    expect(scene.nodes).toHaveLength(1);
  });

  it("returns an empty scene for unparseable output", () => {
    expect(parseScene("no json here")).toEqual({ nodes: [], edges: [] });
    expect(parseScene("{ broken")).toEqual({ nodes: [], edges: [] });
  });
});

describe("parseScene — grouping", () => {
  it("keeps a parent that points at a real node", () => {
    const scene = parseScene(
      wrap({ nodes: [{ id: "g", type: "group", title: "Pool" }, { id: "a", title: "child", parent: "g" }] }),
    );
    expect(scene.nodes[1].parent).toBe("g");
  });

  it("drops a parent that points nowhere", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "a", title: "x", parent: "ghost" }] }));
    expect(scene.nodes[0].parent).toBeUndefined();
  });

  it("drops a node parented to itself", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "a", title: "x", parent: "a" }] }));
    expect(scene.nodes[0].parent).toBeUndefined();
  });

  it("breaks a parent cycle", () => {
    const scene = parseScene(
      wrap({ nodes: [{ id: "a", title: "x", parent: "b" }, { id: "b", title: "y", parent: "a" }] }),
    );
    expect(scene.nodes.every((n) => n.parent === undefined)).toBe(true);
  });
});

describe("parseScene — edges", () => {
  const nodes = [{ id: "a", title: "A" }, { id: "b", title: "B" }];

  it("reads labelled, directed edges", () => {
    const scene = parseScene(wrap({ nodes, edges: [{ from: "a", to: "b", label: "2. Fetch", note: "from cache" }] }));
    expect(scene.edges[0]).toEqual({ from: "a", to: "b", label: "2. Fetch", note: "from cache", directed: true });
  });

  it("accepts source/target as aliases", () => {
    const scene = parseScene(wrap({ nodes, edges: [{ source: "a", target: "b" }] }));
    expect(scene.edges[0]).toMatchObject({ from: "a", to: "b" });
  });

  it("honours an explicitly undirected edge", () => {
    const scene = parseScene(wrap({ nodes, edges: [{ from: "a", to: "b", directed: false }] }));
    expect(scene.edges[0].directed).toBe(false);
  });

  it("still accepts the older pair form", () => {
    const scene = parseScene(wrap({ nodes, edges: [["a", "b"]] }));
    expect(scene.edges[0]).toMatchObject({ from: "a", to: "b", directed: true });
  });

  it("drops edges to unknown nodes and self-loops", () => {
    const scene = parseScene(
      wrap({ nodes, edges: [{ from: "a", to: "ghost" }, { from: "a", to: "a" }, { from: "a", to: "b" }] }),
    );
    expect(scene.edges).toHaveLength(1);
  });
});

describe("SIZE_PX", () => {
  it("grows monotonically so bigger content gets a bigger box", () => {
    expect(SIZE_PX.sm.width).toBeLessThan(SIZE_PX.md.width);
    expect(SIZE_PX.md.width).toBeLessThan(SIZE_PX.lg.width);
    expect(SIZE_PX.lg.width).toBeLessThan(SIZE_PX.xl.width);
  });
});

describe("parseScene — stacks and shapes", () => {
  it("reads a stack count for repeated things", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "w", title: "Worker", stack: 3 }] }));
    expect(scene.nodes[0].stack).toBe(3);
  });

  it("ignores a stack of one, which is just a node", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "w", title: "Worker", stack: 1 }] }));
    expect(scene.nodes[0].stack).toBeUndefined();
  });

  it("caps a runaway stack at what still reads as layers", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "w", title: "Worker", stack: 400 }] }));
    expect(scene.nodes[0].stack).toBe(6);
  });

  it("ignores a stack that is not a number", () => {
    const scene = parseScene(wrap({ nodes: [{ id: "w", title: "Worker", stack: "many" }] }));
    expect(scene.nodes[0].stack).toBeUndefined();
  });

  it("accepts the flowchart shapes a diagram needs", () => {
    for (const shape of ["diamond", "cylinder", "parallelogram", "hexagon", "cloud"]) {
      const scene = parseScene(wrap({ nodes: [{ id: "s", type: "shape", title: "x", shape }] }));
      expect(scene.nodes[0].shape).toBe(shape);
    }
  });
});
