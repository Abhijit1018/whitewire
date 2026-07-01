import { create, type StoreApi, type UseBoundStore } from "zustand";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

export type AiNodeData = {
  text: string;
  kind: string;
  purpose: string;
  model: string;
  shape?: string;
};
export type AiNode = Node<AiNodeData>;

type WorkspaceState = {
  nodes: AiNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedNodeText: string;
  selectedNodeKind: string;
  selectedNodeType: string;

  onNodesChange: (changes: NodeChange<AiNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  setGraph: (nodes: AiNode[], edges: Edge[]) => void;
  setNodes: (nodes: AiNode[]) => void;
  addNode: (node: AiNode) => void;
  addNodesEdges: (nodes: AiNode[], edges: Edge[]) => void;
  updateNodeData: (id: string, data: Partial<AiNodeData>) => void;
  deleteNode: (id: string) => void;
  setSelection: (sel: { id: string | null; text: string; kind: string; type: string }) => void;
};

function makeStore() {
  return create<WorkspaceState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedNodeText: "",
    selectedNodeKind: "",
    selectedNodeType: "",

    onNodesChange: (changes) =>
      set({ nodes: applyNodeChanges(changes, get().nodes) as AiNode[] }),
    onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
    setGraph: (nodes, edges) => set({ nodes, edges }),
    setNodes: (nodes) => set({ nodes }),
    addNode: (node) => set({ nodes: [...get().nodes, node] }),
    addNodesEdges: (nodes, edges) =>
      set({ nodes: [...get().nodes, ...nodes], edges: [...get().edges, ...edges] }),
    updateNodeData: (id, data) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
        ),
      }),
    deleteNode: (id) =>
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== id),
        edges: state.edges.filter((e) => e.source !== id && e.target !== id),
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
      })),
    setSelection: ({ id, text, kind, type }) =>
      set({
        selectedNodeId: id,
        selectedNodeText: text,
        selectedNodeKind: kind,
        selectedNodeType: type,
      }),
  }));
}

// The canvas loads via a dynamic ssr:false chunk that can get its own copy of this
// module. Cache the store on `window` so every chunk shares ONE instance.
type StoreHook = UseBoundStore<StoreApi<WorkspaceState>>;
const globalKey = "__whitewireWorkspaceStore" as const;

export const useWorkspaceStore: StoreHook =
  typeof window === "undefined"
    ? makeStore()
    : ((window as unknown as Record<string, StoreHook>)[globalKey] ??= makeStore());
