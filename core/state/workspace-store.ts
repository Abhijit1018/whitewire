import { create } from "zustand";
import type { Editor } from "tldraw";

type WorkspaceState = {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  selectedNodeId: string | null;
  selectedNodeText: string;
  selectedNodeKind: string;
  setSelection: (sel: { id: string | null; text: string; kind: string }) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  selectedNodeId: null,
  selectedNodeText: "",
  selectedNodeKind: "",
  setSelection: ({ id, text, kind }) =>
    set({ selectedNodeId: id, selectedNodeText: text, selectedNodeKind: kind }),
}));
