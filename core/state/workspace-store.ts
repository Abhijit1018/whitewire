import { create, type StoreApi, type UseBoundStore } from "zustand";
import type { Editor } from "tldraw";

type WorkspaceState = {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  selectedNodeId: string | null;
  selectedNodeText: string;
  selectedNodeKind: string;
  setSelection: (sel: { id: string | null; text: string; kind: string }) => void;
};

function makeStore() {
  return create<WorkspaceState>((set) => ({
    editor: null,
    setEditor: (editor) => set({ editor }),
    selectedNodeId: null,
    selectedNodeText: "",
    selectedNodeKind: "",
    setSelection: ({ id, text, kind }) =>
      set({ selectedNodeId: id, selectedNodeText: text, selectedNodeKind: kind }),
  }));
}

// The canvas loads via a dynamic ssr:false chunk, which can get its own copy of
// this module. Cache the store on `window` so every chunk shares ONE instance
// (so selection/editor set inside the canvas reach the header/footer/inspector).
// On the server, return a fresh per-render store to avoid cross-request leakage.
type StoreHook = UseBoundStore<StoreApi<WorkspaceState>>;
const globalKey = "__whitewireWorkspaceStore" as const;

export const useWorkspaceStore: StoreHook =
  typeof window === "undefined"
    ? makeStore()
    : ((window as unknown as Record<string, StoreHook>)[globalKey] ??= makeStore());
