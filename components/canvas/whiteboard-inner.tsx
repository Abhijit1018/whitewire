"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type DefaultEdgeOptions,
  type Edge,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";
import { nodeTypes } from "./ai-node";
import { CanvasToolbar } from "./canvas-toolbar";

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  style: { stroke: "#a5b4fc", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "#818cf8" },
};
import { useDebouncedSaver } from "./use-autosave";
import { saveCanvasAction } from "@/app/p/[projectId]/canvas-actions";

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
};

export default function WhiteboardInner({ projectId, initial }: WhiteboardInnerProps) {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const onNodesChange = useWorkspaceStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkspaceStore((s) => s.onEdgesChange);
  const setGraph = useWorkspaceStore((s) => s.setGraph);
  const setSelection = useWorkspaceStore((s) => s.setSelection);

  // Load the saved snapshot once.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const n = (initial?.nodes as AiNode[] | undefined) ?? [];
    const e = (initial?.edges as Edge[] | undefined) ?? [];
    setGraph(n, e);
  }, [initial, setGraph]);

  // Debounced autosave of the graph (strip volatile UI flags).
  const save = useMemo(
    () => (snapshot: Record<string, unknown>) => saveCanvasAction(projectId, snapshot),
    [projectId],
  );
  const saver = useDebouncedSaver(save, 1500);
  useEffect(() => {
    const unsub = useWorkspaceStore.subscribe((state) => {
      const cleanNodes = state.nodes.map(({ selected, dragging, ...n }) => n);
      saver({ nodes: cleanNodes, edges: state.edges });
    });
    return unsub;
  }, [saver]);

  const onSelectionChange = useCallback(
    ({ nodes: sel }: OnSelectionChangeParams) => {
      const n = sel[0] as AiNode | undefined;
      if (n)
        setSelection({
          id: n.id,
          text: n.data.text ?? "",
          kind: n.data.kind ?? "",
          type: n.type ?? "",
        });
      else setSelection({ id: null, text: "", kind: "", type: "" });
    },
    [setSelection],
  );

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        minZoom={0.2}
        proOptions={{ hideAttribution: false }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#e4e4e7" />
        <CanvasToolbar />
        <Controls />
        <MiniMap pannable zoomable className="!rounded-lg !border !border-zinc-200" />
      </ReactFlow>
    </ReactFlowProvider>
  );
}
