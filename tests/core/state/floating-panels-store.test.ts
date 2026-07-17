import { beforeEach, describe, expect, it } from "vitest";
import { useFloatingPanelsStore } from "@/core/state/floating-panels-store";

beforeEach(() => {
  useFloatingPanelsStore.setState({ panelRects: {} });
});

describe("floating-panels-store", () => {
  it("registers a rect under an id", () => {
    useFloatingPanelsStore.getState().setPanelRect("canvas-menu", { x: 0, y: 0, width: 10, height: 10 });
    expect(useFloatingPanelsStore.getState().panelRects).toEqual({
      "canvas-menu": { x: 0, y: 0, width: 10, height: 10 },
    });
  });

  it("removes the id when set to null", () => {
    useFloatingPanelsStore.getState().setPanelRect("canvas-menu", { x: 0, y: 0, width: 10, height: 10 });
    useFloatingPanelsStore.getState().setPanelRect("canvas-menu", null);
    expect(useFloatingPanelsStore.getState().panelRects).toEqual({});
  });

  it("keeps multiple ids independent", () => {
    useFloatingPanelsStore.getState().setPanelRect("plugin-menu", { x: 0, y: 0, width: 10, height: 10 });
    useFloatingPanelsStore.getState().setPanelRect("canvas-menu", { x: 20, y: 20, width: 10, height: 10 });
    useFloatingPanelsStore.getState().setPanelRect("plugin-menu", null);
    expect(useFloatingPanelsStore.getState().panelRects).toEqual({
      "canvas-menu": { x: 20, y: 20, width: 10, height: 10 },
    });
  });

  it("setPanelRect(id, null) on an id that was never set is a no-op", () => {
    useFloatingPanelsStore.getState().setPanelRect("nothing-here", null);
    expect(useFloatingPanelsStore.getState().panelRects).toEqual({});
  });
});
