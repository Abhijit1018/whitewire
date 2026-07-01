import { cleanup, type Box, type Edge as CleanupEdge } from "@/core/canvas/cleanup";
import { useWorkspaceStore } from "@/core/state/workspace-store";

const NODE_W = 220;
const NODE_H = 80;

/** Lays out the current graph (dagre tree when edges connect nodes, else a tidy grid). */
export function applyCleanup() {
  const store = useWorkspaceStore.getState();
  const { nodes, edges } = store;
  if (nodes.length < 2) return;

  const boxes: Box[] = nodes.map((n) => ({
    id: n.id,
    x: n.position.x,
    y: n.position.y,
    w: n.measured?.width ?? NODE_W,
    h: n.measured?.height ?? NODE_H,
  }));
  const cleanupEdges: CleanupEdge[] = edges.map((e) => ({ from: e.source, to: e.target }));

  const positions = cleanup(boxes, cleanupEdges);
  store.setNodes(nodes.map((n) => (positions[n.id] ? { ...n, position: positions[n.id] } : n)));
}
