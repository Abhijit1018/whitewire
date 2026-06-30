import { create } from "zustand";

type WorkspaceState = {
  selectedNodeId: string | null;
  selectedNodeText: string;
  selectedNodeKind: string;
  setSelection: (sel: { id: string | null; text: string; kind: string }) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  selectedNodeId: null,
  selectedNodeText: "",
  selectedNodeKind: "",
  setSelection: ({ id, text, kind }) =>
    set({ selectedNodeId: id, selectedNodeText: text, selectedNodeKind: kind }),
}));
