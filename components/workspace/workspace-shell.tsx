import React from "react";
import { Inspector } from "./inspector";

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
      <header className="flex h-12 items-center justify-between border-b px-4">
        <span className="font-medium">{name}</span>
        <span className="text-sm text-muted-foreground">Model: (set up in Settings)</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-14 border-r" aria-label="Tools" />
        <section className="relative flex-1 bg-muted/30">{children}</section>
        <aside className="w-72 border-l p-4 overflow-hidden" aria-label="Inspector">
          <Inspector projectId={projectId} />
        </aside>
      </div>
      <footer className="h-12 border-t flex items-center px-4 text-sm text-muted-foreground">
        AI command bar — Phase 3
      </footer>
    </div>
  );
}
