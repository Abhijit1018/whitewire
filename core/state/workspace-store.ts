import { create, type StoreApi, type UseBoundStore } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

import type { WireframeSpec } from "@/core/ai/wireframe";
import type { CanvasTool } from "@/core/canvas/tools";
import { type ShapeStyle, DEFAULT_STYLE } from "@/core/canvas/style";
import {
  computeAlign, computeDistribute,
  type AlignEdge, type AlignNode, type DistributeAxis,
} from "@/core/canvas/align";

export type AiNodeData = {
  text: string;
  kind: string;
  purpose: string;
  model: string;
  shape?: string;
  points?: number[][];
  color?: string;
  size?: number;
  wireframe?: WireframeSpec;
  style?: ShapeStyle;
  locked?: boolean;
};
export type AiNode = Node<AiNodeData>;

export type BgVariant = "dots" | "lines" | "cross" | "none";

type WorkspaceState = {
  nodes: AiNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedNodeText: string;
  selectedNodeKind: string;
  selectedNodeType: string;
  penMode: boolean;
  bgVariant: BgVariant;
  activeTool: CanvasTool;
  toolDefaults: ShapeStyle;

  setPenMode: (on: boolean) => void;
  setBgVariant: (v: BgVariant) => void;
  setActiveTool: (t: CanvasTool) => void;
  setToolDefaults: (patch: Partial<ShapeStyle>) => void;
  applyStyleToSelection: (patch: Partial<ShapeStyle>) => void;
  onNodesChange: (changes: NodeChange<AiNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setGraph: (nodes: AiNode[], edges: Edge[]) => void;
  setNodes: (nodes: AiNode[]) => void;
  addNode: (node: AiNode) => void;
  addNodesEdges: (nodes: AiNode[], edges: Edge[]) => void;
  updateNodeData: (id: string, data: Partial<AiNodeData>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  bringNodeToFront: (id: string) => void;
  sendNodeToBack: (id: string) => void;
  setNodeLocked: (id: string, locked: boolean) => void;
  applyStyleToNode: (id: string, patch: Partial<ShapeStyle>) => void;
  alignNodes: (ids: string[], edge: AlignEdge) => void;
  distributeNodes: (ids: string[], axis: DistributeAxis) => void;
  lockNodes: (ids: string[], locked: boolean) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => void;
  applyStyleToNodes: (ids: string[], patch: Partial<ShapeStyle>) => void;
  setSelection: (sel: { id: string | null; text: string; kind: string; type: string }) => void;
};

/** Resolve a node's on-screen size from whatever RF has populated. */
function nodeSize(n: AiNode): { width: number; height: number } {
  const w = n.width ?? n.measured?.width ?? (typeof n.style?.width === "number" ? n.style.width : 0) ?? 0;
  const h = n.height ?? n.measured?.height ?? (typeof n.style?.height === "number" ? n.style.height : 0) ?? 0;
  return { width: w, height: h };
}

export function makeStore() {
  return create<WorkspaceState>((set, get) => ({
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedNodeText: "",
    selectedNodeKind: "",
    selectedNodeType: "",
    penMode: false,
    bgVariant: "dots",
    activeTool: "select",
    toolDefaults: { ...DEFAULT_STYLE },

    setActiveTool: (t) => set({ activeTool: t, penMode: t === "pen" }),
    setPenMode: (on) => get().setActiveTool(on ? "pen" : "select"),
    setToolDefaults: (patch) =>
      set({ toolDefaults: { ...get().toolDefaults, ...patch } }),
    applyStyleToSelection: (patch) =>
      set((state) => ({
        toolDefaults: { ...state.toolDefaults, ...patch },
        nodes: state.nodes.map((n) =>
          n.selected
            ? { ...n, data: { ...n.data, style: { ...state.toolDefaults, ...(n.data.style ?? {}), ...patch } } }
            : n,
        ),
      })),
    setBgVariant: (v) => set({ bgVariant: v }),
    onNodesChange: (changes) =>
      set({ nodes: applyNodeChanges(changes, get().nodes) as AiNode[] }),
    onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
    onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),
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
    duplicateNode: (id) =>
      set((state) => {
        const src = state.nodes.find((n) => n.id === id);
        if (!src) return state;
        const clone: AiNode = {
          ...src,
          id: crypto.randomUUID(),
          position: { x: src.position.x + 24, y: src.position.y + 24 },
          selected: false,
          data: { ...src.data },
        };
        return { nodes: [...state.nodes, clone] };
      }),
    bringNodeToFront: (id) =>
      set((state) => {
        const idx = state.nodes.findIndex((n) => n.id === id);
        if (idx === -1) return state;
        const next = [...state.nodes];
        const [n] = next.splice(idx, 1);
        next.push(n);
        return { nodes: next };
      }),
    sendNodeToBack: (id) =>
      set((state) => {
        const idx = state.nodes.findIndex((n) => n.id === id);
        if (idx === -1) return state;
        const next = [...state.nodes];
        const [n] = next.splice(idx, 1);
        next.unshift(n);
        return { nodes: next };
      }),
    setNodeLocked: (id, locked) =>
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === id
            ? { ...n, draggable: !locked, connectable: !locked, data: { ...n.data, locked } }
            : n,
        ),
      })),
    applyStyleToNode: (id, patch) =>
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, style: { ...state.toolDefaults, ...(n.data.style ?? {}), ...patch } } }
            : n,
        ),
      })),
    alignNodes: (ids, edge) =>
      set((state) => {
        const set_ = new Set(ids);
        const targets: AlignNode[] = state.nodes
          .filter((n) => set_.has(n.id))
          .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y, ...nodeSize(n) }));
        const patch = computeAlign(targets, edge);
        return {
          nodes: state.nodes.map((n) =>
            patch[n.id] ? { ...n, position: { ...n.position, ...patch[n.id] } } : n,
          ),
        };
      }),
    distributeNodes: (ids, axis) =>
      set((state) => {
        const set_ = new Set(ids);
        const targets: AlignNode[] = state.nodes
          .filter((n) => set_.has(n.id))
          .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y, ...nodeSize(n) }));
        const patch = computeDistribute(targets, axis);
        return {
          nodes: state.nodes.map((n) =>
            patch[n.id] ? { ...n, position: { ...n.position, ...patch[n.id] } } : n,
          ),
        };
      }),
    lockNodes: (ids, locked) =>
      set((state) => {
        const set_ = new Set(ids);
        return {
          nodes: state.nodes.map((n) =>
            set_.has(n.id)
              ? { ...n, draggable: !locked, connectable: !locked, data: { ...n.data, locked } }
              : n,
          ),
        };
      }),
    deleteNodes: (ids) =>
      set((state) => {
        const set_ = new Set(ids);
        return {
          nodes: state.nodes.filter((n) => !set_.has(n.id)),
          edges: state.edges.filter((e) => !set_.has(e.source) && !set_.has(e.target)),
          selectedNodeId: set_.has(state.selectedNodeId ?? "") ? null : state.selectedNodeId,
        };
      }),
    duplicateNodes: (ids) =>
      set((state) => {
        const set_ = new Set(ids);
        const clones: AiNode[] = state.nodes
          .filter((n) => set_.has(n.id))
          .map((src) => ({
            ...src,
            id: crypto.randomUUID(),
            position: { x: src.position.x + 24, y: src.position.y + 24 },
            selected: false,
            data: { ...src.data },
          }));
        return { nodes: [...state.nodes, ...clones] };
      }),
    applyStyleToNodes: (ids, patch) =>
      set((state) => {
        const set_ = new Set(ids);
        return {
          nodes: state.nodes.map((n) =>
            set_.has(n.id)
              ? { ...n, data: { ...n.data, style: { ...state.toolDefaults, ...(n.data.style ?? {}), ...patch } } }
              : n,
          ),
        };
      }),
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
