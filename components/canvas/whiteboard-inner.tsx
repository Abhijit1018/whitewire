"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";
import { getHelperLines } from "@/core/canvas/helper-lines";
import { nodeTypes } from "./ai-node";
import { CanvasToolbar } from "./canvas-toolbar";
import { CanvasContextMenu, type ContextMenuState } from "./canvas-context-menu";
import { SelectionToolbar } from "./selection-toolbar";
import { HelperLines } from "./helper-lines";
import { CommandPalette } from "./command-palette";
import { StylePanel } from "./style-panel";
import { PenLayer } from "./pen-layer";
import { CollabLayer } from "./collab-layer";

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  style: { stroke: "oklch(0.78 0.07 52)", strokeWidth: 1.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "var(--brand-accent)" },
};
import { useDebouncedSaver } from "./use-autosave";
import { saveCanvasAction } from "@/app/p/[projectId]/canvas-actions";

export type WhiteboardInnerProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
  canEdit?: boolean;
};

export default function WhiteboardInner({ projectId, initial, canEdit = true }: WhiteboardInnerProps) {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const edges = useWorkspaceStore((s) => s.edges);
  const onNodesChange = useWorkspaceStore((s) => s.onNodesChange);
  const onEdgesChange = useWorkspaceStore((s) => s.onEdgesChange);
  const onConnect = useWorkspaceStore((s) => s.onConnect);
  const setGraph = useWorkspaceStore((s) => s.setGraph);
  const setSelection = useWorkspaceStore((s) => s.setSelection);
  const penMode = useWorkspaceStore((s) => s.penMode);
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const bgVariant = useWorkspaceStore((s) => s.bgVariant);
  const snapToGrid = useWorkspaceStore((s) => s.snapToGrid);
  const duplicateNode = useWorkspaceStore((s) => s.duplicateNode);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [helperLines, setHelperLines] = useState<{ horizontal?: number; vertical?: number }>({});

  // Wrap node changes: while dragging a single node, snap it to alignment
  // guides against the other nodes and surface the active guide lines.
  const handleNodesChange = useCallback(
    (changes: NodeChange<AiNode>[]) => {
      const drags = changes.filter(
        (c) => c.type === "position" && c.dragging === true && c.position,
      );
      if (drags.length === 1) {
        const change = drags[0];
        if (change.type === "position" && change.position) {
          const all = useWorkspaceStore.getState().nodes;
          const node = all.find((n) => n.id === change.id);
          const size = (n?: AiNode) => ({
            width: n?.measured?.width ?? n?.width ?? 0,
            height: n?.measured?.height ?? n?.height ?? 0,
          });
          if (node) {
            const dragged = { id: change.id, x: change.position.x, y: change.position.y, ...size(node) };
            const others = all
              .filter((n) => n.id !== change.id)
              .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y, ...size(n) }));
            const lines = getHelperLines(dragged, others);
            if (lines.snapX !== undefined) change.position.x = lines.snapX;
            if (lines.snapY !== undefined) change.position.y = lines.snapY;
            setHelperLines({ horizontal: lines.horizontal, vertical: lines.vertical });
          }
        }
      } else {
        setHelperLines({});
      }
      onNodesChange(changes);
    },
    [onNodesChange],
  );

  // Ctrl/Cmd+D duplicates the selected node (ignored while typing).
  useEffect(() => {
    if (!canEdit) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.key === "d" || e.key === "D") || !(e.metaKey || e.ctrlKey)) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      const id = useWorkspaceStore.getState().selectedNodeId;
      if (!id) return;
      e.preventDefault();
      duplicateNode(id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, duplicateNode]);

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
    // Viewers never persist — only owners/editors autosave.
    if (!canEdit) return;
    const unsub = useWorkspaceStore.subscribe((state) => {
      const cleanNodes = state.nodes.map(({ selected, dragging, ...n }) => n);
      saver({ nodes: cleanNodes, edges: state.edges });
    });
    return unsub;
  }, [saver, canEdit]);

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

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: AiNode) => {
      if (!canEdit) return;
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
    },
    [canEdit],
  );

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!canEdit) return;
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, nodeId: null });
    },
    [canEdit],
  );

  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          minZoom={0.2}
          // Hand → left-drag pans. Select → left-drag box-selects, middle-drag
          // pans. Pen → neither (PenLayer owns the pointer).
          panOnDrag={penMode ? false : activeTool === "hand" ? true : [1]}
          selectionOnDrag={!penMode && activeTool === "select"}
          snapToGrid={snapToGrid}
          snapGrid={[22, 22]}
          nodesDraggable={canEdit && !penMode}
          elementsSelectable={canEdit && !penMode}
          nodesConnectable={canEdit}
          proOptions={{ hideAttribution: false }}
        >
          {bgVariant !== "none" && (
            <Background
              variant={
                bgVariant === "lines"
                  ? BackgroundVariant.Lines
                  : bgVariant === "cross"
                    ? BackgroundVariant.Cross
                    : BackgroundVariant.Dots
              }
              gap={22}
              size={bgVariant === "cross" ? 6 : 1}
              color="oklch(0.9 0.008 70)"
            />
          )}
          <Controls />
          <MiniMap pannable zoomable className="!rounded-lg !border !border-border" />
          {canEdit && <HelperLines horizontal={helperLines.horizontal} vertical={helperLines.vertical} />}
        </ReactFlow>
        {penMode && canEdit && <PenLayer />}
        <CollabLayer projectId={projectId} />
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <p className="rounded-lg bg-white/70 px-4 py-2 text-center text-sm text-zinc-500 shadow-sm">
              {canEdit
                ? "Describe an idea in the bar below to build a connected board — or add shapes from the toolbar above."
                : "This board is empty."}
            </p>
          </div>
        )}
        {canEdit && <CanvasToolbar projectId={projectId} />}
        {canEdit && <SelectionToolbar />}
        {canEdit && <StylePanel />}
        {canEdit && contextMenu && (
          <CanvasContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
        )}
        {canEdit && <CommandPalette />}
      </div>
    </ReactFlowProvider>
  );
}
