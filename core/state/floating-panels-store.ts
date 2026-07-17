import { create } from "zustand";
import type { Rect } from "@/core/canvas/geometry";

type FloatingPanelsState = {
  panelRects: Record<string, Rect>;
  setPanelRect: (id: string, rect: Rect | null) => void;
};

export const useFloatingPanelsStore = create<FloatingPanelsState>((set) => ({
  panelRects: {},
  setPanelRect: (id, rect) =>
    set((state) => {
      if (rect === null) {
        if (!(id in state.panelRects)) return state;
        const next = { ...state.panelRects };
        delete next[id];
        return { panelRects: next };
      }
      return { panelRects: { ...state.panelRects, [id]: rect } };
    }),
}));
