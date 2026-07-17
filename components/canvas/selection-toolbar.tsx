"use client";

import {
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Copy, Lock, Trash2, type LucideIcon,
} from "lucide-react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import type { AlignEdge, DistributeAxis } from "@/core/canvas/align";
import { cn } from "@/lib/utils";

const ALIGNS: { edge: AlignEdge; icon: LucideIcon; label: string }[] = [
  { edge: "left", icon: AlignHorizontalJustifyStart, label: "Align left" },
  { edge: "center-h", icon: AlignHorizontalJustifyCenter, label: "Align center" },
  { edge: "right", icon: AlignHorizontalJustifyEnd, label: "Align right" },
  { edge: "top", icon: AlignVerticalJustifyStart, label: "Align top" },
  { edge: "middle", icon: AlignVerticalJustifyCenter, label: "Align middle" },
  { edge: "bottom", icon: AlignVerticalJustifyEnd, label: "Align bottom" },
];

function IconBtn({ icon: Icon, label, onClick, danger }: {
  icon: LucideIcon; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg transition-colors active:scale-95",
        danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}

function Divider() {
  return <div className="mx-0.5 h-6 w-px bg-border" />;
}

export function SelectionToolbar() {
  const nodes = useWorkspaceStore((s) => s.nodes);
  const alignNodes = useWorkspaceStore((s) => s.alignNodes);
  const distributeNodes = useWorkspaceStore((s) => s.distributeNodes);
  const lockNodes = useWorkspaceStore((s) => s.lockNodes);
  const duplicateNodes = useWorkspaceStore((s) => s.duplicateNodes);
  const deleteNodes = useWorkspaceStore((s) => s.deleteNodes);

  const ids = nodes.filter((n) => n.selected).map((n) => n.id);
  if (ids.length < 2) return null;

  const distributable = ids.length >= 3;
  const allLocked = nodes.filter((n) => n.selected).every((n) => n.data.locked);

  return (
    <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-1.5 shadow-md backdrop-blur">
        <span className="px-1.5 text-xs font-medium text-muted-foreground">{ids.length}</span>
        <Divider />
        {ALIGNS.map((a) => (
          <IconBtn key={a.edge} icon={a.icon} label={a.label} onClick={() => alignNodes(ids, a.edge)} />
        ))}
        <Divider />
        <IconBtn
          icon={AlignHorizontalDistributeCenter}
          label={distributable ? "Distribute horizontally" : "Distribute needs 3+"}
          onClick={() => distributable && distributeNodes(ids, "h" as DistributeAxis)}
        />
        <IconBtn
          icon={AlignVerticalDistributeCenter}
          label={distributable ? "Distribute vertically" : "Distribute needs 3+"}
          onClick={() => distributable && distributeNodes(ids, "v" as DistributeAxis)}
        />
        <Divider />
        <IconBtn icon={Copy} label="Duplicate all" onClick={() => duplicateNodes(ids)} />
        <IconBtn icon={Lock} label={allLocked ? "Unlock all" : "Lock all"} onClick={() => lockNodes(ids, !allLocked)} />
        <IconBtn icon={Trash2} label="Delete all" danger onClick={() => deleteNodes(ids)} />
      </div>
    </div>
  );
}
