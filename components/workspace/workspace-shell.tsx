import React from "react";
import { Inspector } from "./inspector";
import { CanvasTools } from "@/components/canvas/canvas-tools";
import { CommandBar } from "@/components/canvas/command-bar";

export function WorkspaceShell({
  projectId,
  name,
  children,
}: {
  projectId: string;
  name: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col" data-project-id={projectId}>
      <header className="flex h-12 items-center justify-between gap-4 border-b px-4">
        <span className="font-medium">{name}</span>
        <CanvasTools projectId={projectId} />
        <span className="text-sm text-muted-foreground">Model: (set up in Settings)</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <section className="relative flex-1 bg-muted/30">{children}</section>
        <aside className="w-72 border-l p-4 overflow-hidden" aria-label="Inspector">
          <Inspector projectId={projectId} />
        </aside>
      </div>
      <footer className="flex h-14 items-center border-t px-4">
        <CommandBar projectId={projectId} />
      </footer>
    </div>
  );
}
