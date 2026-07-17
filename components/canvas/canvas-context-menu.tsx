"use client";

import { useEffect, type ComponentType } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  Copy, Trash2, Lock, Unlock, BringToFront, SendToBack,
  StickyNote, Type, BoxSelect, type LucideIcon,
} from "lucide-react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { cn } from "@/lib/utils";

export type ContextMenuState = { x: number; y: number; nodeId: string | null };

/** Quick stroke-color swatches shown for a node. */
const SWATCHES = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#ae3ec9"];

function Item({
  icon: Icon, label, hint, destructive, onClick,
}: {
  icon?: LucideIcon | ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
        destructive ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-muted",
      )}
    >
      {Icon && <Icon className="size-4 shrink-0 opacity-80" />}
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </button>
  );
}

function Separator() {
  return <div className="my-1 h-px bg-border" />;
}

export function CanvasContextMenu({
  menu, onClose,
}: {
  menu: ContextMenuState;
  onClose: () => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const nodes = useWorkspaceStore((s) => s.nodes);
  const addNode = useWorkspaceStore((s) => s.addNode);
  const setNodes = useWorkspaceStore((s) => s.setNodes);
  const deleteNode = useWorkspaceStore((s) => s.deleteNode);
  const duplicateNode = useWorkspaceStore((s) => s.duplicateNode);
  const bringNodeToFront = useWorkspaceStore((s) => s.bringNodeToFront);
  const sendNodeToBack = useWorkspaceStore((s) => s.sendNodeToBack);
  const setNodeLocked = useWorkspaceStore((s) => s.setNodeLocked);
  const applyStyleToNode = useWorkspaceStore((s) => s.applyStyleToNode);
  const toolDefaults = useWorkspaceStore((s) => s.toolDefaults);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const node = menu.nodeId ? nodes.find((n) => n.id === menu.nodeId) : null;
  const locked = !!node?.data.locked;

  function run(fn: () => void) {
    fn();
    onClose();
  }

  function addAt(type: string, data: Record<string, unknown>) {
    const position = screenToFlowPosition({ x: menu.x, y: menu.y });
    addNode({
      id: crypto.randomUUID(),
      type,
      position,
      data: { text: "", kind: "generic", purpose: "", model: "", ...data, style: { ...toolDefaults } },
    });
    onClose();
  }

  // Keep the menu on-screen: flip toward the anchor near the right/bottom edges.
  const flipX = typeof window !== "undefined" && menu.x > window.innerWidth - 200;
  const flipY = typeof window !== "undefined" && menu.y > window.innerHeight - 260;

  return (
    <div
      className="fixed inset-0 z-[60]"
      onMouseDown={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        role="menu"
        className="absolute min-w-44 rounded-xl border border-border bg-surface p-1 text-sm shadow-xl"
        style={{
          left: menu.x,
          top: menu.y,
          transform: `translate(${flipX ? "-100%" : "0"}, ${flipY ? "-100%" : "0"})`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {menu.nodeId && node ? (
          <>
            <Item icon={Copy} label="Duplicate" hint="Ctrl+D" onClick={() => run(() => duplicateNode(node.id))} />
            <Item icon={BringToFront} label="Bring to front" onClick={() => run(() => bringNodeToFront(node.id))} />
            <Item icon={SendToBack} label="Send to back" onClick={() => run(() => sendNodeToBack(node.id))} />
            <Item
              icon={locked ? Unlock : Lock}
              label={locked ? "Unlock" : "Lock"}
              onClick={() => run(() => setNodeLocked(node.id, !locked))}
            />
            <Separator />
            <div className="flex items-center gap-1.5 px-2 py-1.5">
              {SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={`Color ${c}`}
                  onClick={() => run(() => applyStyleToNode(node.id, { stroke: c }))}
                  className="size-5 rounded-full border border-border transition-transform hover:scale-110"
                  style={{ background: c }}
                />
              ))}
            </div>
            <Separator />
            <Item icon={Trash2} label="Delete" hint="Del" destructive onClick={() => run(() => deleteNode(node.id))} />
          </>
        ) : (
          <>
            <Item icon={StickyNote} label="Add sticky note" onClick={() => addAt("noteNode", {})} />
            <Item icon={Type} label="Add text" onClick={() => addAt("textNode", {})} />
            <Separator />
            <Item
              icon={BoxSelect}
              label="Select all"
              onClick={() => run(() => setNodes(nodes.map((n) => ({ ...n, selected: true }))))}
            />
          </>
        )}
      </div>
    </div>
  );
}
