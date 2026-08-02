import type { Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { Scene } from "@/core/ai/scene";
import { layoutScene } from "@/core/canvas/scene-layout";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";

/** Rough kind label for the concept badge, kept for continuity with older boards. */
function kindOf(type: string): string {
  if (type === "aiNode") return "idea";
  if (type === "tableNode") return "entity";
  if (type === "codeNode") return "component";
  return "generic";
}

export type ApplySceneOptions = {
  /** Handle (#1) -> existing canvas node id, so a scene can attach to the board. */
  handles?: Record<string, string>;
  /** Explicit positions for top-level nodes, by index — used when the scene
   *  came from a drawing and should keep the arrangement that was drawn. */
  positions?: ({ x: number; y: number } | undefined)[];
  /** Existing node id to link new top-level nodes back to, as Expand does. */
  connectFrom?: string;
};

/**
 * Places a generated scene on the canvas. Groups are added before their
 * children so React Flow can resolve `parentId`, and children are clamped to
 * their parent's box.
 */
export function applyScene(
  scene: Scene,
  origin: { x: number; y: number },
  options: ApplySceneOptions = {},
): void {
  const layout = layoutScene(scene, origin);
  // A reply may be updates only — rewording existing nodes and adding nothing.
  if (layout.nodes.length === 0 && scene.updates.length === 0) return;

  // Overridden positions apply to top-level nodes only; group members stay
  // relative to their parent.
  if (options.positions) {
    let rootIndex = 0;
    for (const placed of layout.nodes) {
      if (placed.parentId) continue;
      const override = options.positions[rootIndex];
      rootIndex += 1;
      if (override) placed.position = override;
    }
  }

  // Stable ids per run, so edges and parent links resolve to the new nodes.
  const idMap = new Map(layout.nodes.map((n) => [n.id, crypto.randomUUID()]));
  // A reference is either a node in this scene or a handle for one already on
  // the board; anything else is dangling and its edge is dropped.
  const resolve = (ref: string): string | undefined =>
    idMap.get(ref) ?? options.handles?.[ref];

  const nodes: AiNode[] = layout.nodes.map((placed) => {
    const { source } = placed;
    return {
      id: idMap.get(placed.id)!,
      type: placed.type,
      position: placed.position,
      style: { width: placed.width, height: placed.height },
      ...(placed.parentId
        ? { parentId: idMap.get(placed.parentId), extent: "parent" as const }
        : {}),
      data: {
        text: source.title,
        kind: kindOf(placed.type),
        purpose: source.body,
        model: "",
        ...(source.table ? { table: source.table } : {}),
        ...(source.code ? { code: source.code } : {}),
        ...(source.media ? { media: source.media } : {}),
        ...(source.wireframe ? { wireframe: source.wireframe } : {}),
        ...(source.shape ? { shape: source.shape } : {}),
        ...(source.stack ? { stack: source.stack } : {}),
      },
    };
  });

  const edges: Edge[] = layout.edges
    .map((e) => {
      const source = resolve(e.source);
      const target = resolve(e.target);
      if (!source || !target) return null;
      return {
        id: crypto.randomUUID(),
        source,
        target,
        label: e.label,
        markerEnd: e.directed ? { type: MarkerType.ArrowClosed } : undefined,
      };
    })
    .filter((e) => e !== null) as Edge[];

  // Expand hangs its results off the node the user had selected.
  if (options.connectFrom) {
    const anchored = layout.nodes.filter((n) => !n.parentId);
    const linked = new Set(layout.edges.map((e) => e.target));
    for (const node of anchored) {
      if (linked.has(node.id)) continue;
      edges.push({
        id: crypto.randomUUID(),
        source: options.connectFrom,
        target: idMap.get(node.id)!,
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    }
  }

  // Containers must exist before the nodes that name them as parent.
  const groupsFirst = [...nodes].sort((a, b) => {
    const aGroup = a.type === "groupNode" ? 0 : 1;
    const bGroup = b.type === "groupNode" ? 0 : 1;
    return aGroup - bGroup;
  });

  const store = useWorkspaceStore.getState();
  store.addNodesEdges(groupsFirst, edges);

  // Amendments to nodes already on the board, so a follow-up prompt rewords
  // what is there instead of adding a near-duplicate beside it.
  for (const update of scene.updates) {
    const id = options.handles?.[update.target];
    if (!id) continue;
    store.updateNodeData(id, {
      ...(update.title ? { text: update.title } : {}),
      ...(update.body ? { purpose: update.body } : {}),
    });
  }
}
