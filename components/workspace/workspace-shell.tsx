import React from "react";
import Link from "next/link";
import { InspectorPanel } from "./inspector-panel";
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
    <div className="flex h-[100dvh] flex-col" data-project-id={projectId}>
      <header className="flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b px-3 md:px-4">
        <Link
          href="/dashboard"
          className="shrink-0 text-sm text-muted-foreground hover:underline"
        >
          ← Projects
        </Link>
        <span className="shrink-0 font-medium">{name}</span>
        <div className="shrink-0 md:mx-auto">
          <CanvasTools projectId={projectId} />
        </div>
        <Link
          href="/settings"
          className="ml-auto shrink-0 text-sm text-muted-foreground hover:underline md:ml-0"
        >
          Settings
        </Link>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <section className="relative flex-1 bg-muted/30">{children}</section>
        <InspectorPanel projectId={projectId} />
      </div>
      <footer className="flex h-14 shrink-0 items-center border-t px-3 md:px-4">
        <CommandBar projectId={projectId} />
      </footer>
    </div>
  );
}
