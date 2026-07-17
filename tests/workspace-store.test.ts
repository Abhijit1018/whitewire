import { beforeEach, describe, expect, it } from "vitest";
import { makeStore } from "@/core/state/workspace-store";
import { DEFAULT_STYLE } from "@/core/canvas/style";

let store: ReturnType<typeof makeStore>;

beforeEach(() => {
  store = makeStore();
});

describe("activeTool", () => {
  it("defaults to select with penMode false", () => {
    expect(store.getState().activeTool).toBe("select");
    expect(store.getState().penMode).toBe(false);
  });

  it("setActiveTool('pen') syncs penMode true; leaving pen resets it", () => {
    store.getState().setActiveTool("pen");
    expect(store.getState().penMode).toBe(true);
    store.getState().setActiveTool("select");
    expect(store.getState().penMode).toBe(false);
  });

  it("setPenMode delegates to setActiveTool", () => {
    store.getState().setPenMode(true);
    expect(store.getState().activeTool).toBe("pen");
  });
});

describe("toolDefaults", () => {
  it("starts at DEFAULT_STYLE", () => {
    expect(store.getState().toolDefaults).toEqual(DEFAULT_STYLE);
  });

  it("setToolDefaults merges a patch", () => {
    store.getState().setToolDefaults({ stroke: "#ff0000" });
    expect(store.getState().toolDefaults.stroke).toBe("#ff0000");
    expect(store.getState().toolDefaults.strokeWidth).toBe(DEFAULT_STYLE.strokeWidth);
  });
});

describe("applyStyleToSelection", () => {
  it("writes style into selected nodes only and updates toolDefaults", () => {
    store.getState().setGraph(
      [
        { id: "a", type: "shapeNode", position: { x: 0, y: 0 }, selected: true,
          data: { text: "", kind: "", purpose: "", model: "" } },
        { id: "b", type: "shapeNode", position: { x: 0, y: 0 }, selected: false,
          data: { text: "", kind: "", purpose: "", model: "" } },
      ] as never,
      [],
    );
    store.getState().applyStyleToSelection({ fill: "#00ff00" });
    const [a, b] = store.getState().nodes;
    expect(a.data.style?.fill).toBe("#00ff00");
    expect(a.data.style?.stroke).toBe(DEFAULT_STYLE.stroke); // seeded from defaults
    expect(b.data.style).toBeUndefined();
    expect(store.getState().toolDefaults.fill).toBe("#00ff00");
  });
});

function seedTwo() {
  store.getState().setGraph(
    [
      { id: "a", type: "aiNode", position: { x: 10, y: 20 },
        data: { text: "A", kind: "idea", purpose: "", model: "" } },
      { id: "b", type: "aiNode", position: { x: 50, y: 60 },
        data: { text: "B", kind: "idea", purpose: "", model: "" } },
    ] as never,
    [],
  );
}

describe("duplicateNode", () => {
  it("appends an offset clone with a fresh id, deselected", () => {
    seedTwo();
    store.getState().duplicateNode("a");
    const nodes = store.getState().nodes;
    expect(nodes).toHaveLength(3);
    const clone = nodes[2];
    expect(clone.id).not.toBe("a");
    expect(clone.position).toEqual({ x: 34, y: 44 });
    expect(clone.data.text).toBe("A");
    expect(clone.selected).toBe(false);
  });

  it("is a no-op for an unknown id", () => {
    seedTwo();
    store.getState().duplicateNode("zzz");
    expect(store.getState().nodes).toHaveLength(2);
  });
});

describe("z-order", () => {
  it("bringNodeToFront moves the node to the end of the array", () => {
    seedTwo();
    store.getState().bringNodeToFront("a");
    expect(store.getState().nodes.map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("sendNodeToBack moves the node to the front of the array", () => {
    seedTwo();
    store.getState().sendNodeToBack("b");
    expect(store.getState().nodes.map((n) => n.id)).toEqual(["b", "a"]);
  });
});

describe("setNodeLocked", () => {
  it("locking disables drag/connect and flags data.locked", () => {
    seedTwo();
    store.getState().setNodeLocked("a", true);
    const a = store.getState().nodes.find((n) => n.id === "a")!;
    expect(a.draggable).toBe(false);
    expect(a.connectable).toBe(false);
    expect(a.data.locked).toBe(true);
  });

  it("unlocking re-enables drag/connect", () => {
    seedTwo();
    store.getState().setNodeLocked("a", true);
    store.getState().setNodeLocked("a", false);
    const a = store.getState().nodes.find((n) => n.id === "a")!;
    expect(a.draggable).toBe(true);
    expect(a.connectable).toBe(true);
    expect(a.data.locked).toBe(false);
  });
});

describe("applyStyleToNode", () => {
  it("writes style to just that node without touching toolDefaults", () => {
    seedTwo();
    store.getState().applyStyleToNode("a", { stroke: "#ff0000" });
    const [a, b] = store.getState().nodes;
    expect(a.data.style?.stroke).toBe("#ff0000");
    expect(a.data.style?.fill).toBe(DEFAULT_STYLE.fill); // seeded from defaults
    expect(b.data.style).toBeUndefined();
    expect(store.getState().toolDefaults.stroke).toBe(DEFAULT_STYLE.stroke); // unchanged
  });
});
