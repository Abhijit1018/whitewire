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
