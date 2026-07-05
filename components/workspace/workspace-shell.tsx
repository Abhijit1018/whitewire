import React from "react";
import Link from "next/link";
import { InspectorPanel } from "./inspector-panel";
import { CanvasTools } from "@/components/canvas/canvas-tools";
import { CommandBar } from "@/components/canvas/command-bar";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";

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
      <header className="flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b border-border bg-surface px-3 md:px-4">
        <nav className="flex shrink-0 items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Projects
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground">{name}</span>
        </nav>
        <div className="shrink-0 md:mx-auto">
          <CanvasTools projectId={projectId} />
        </div>
        <Link
          href="/settings"
          className="ml-auto shrink-0 text-sm text-muted-foreground hover:text-foreground hover:underline md:ml-0"
        >
          Settings
        </Link>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <section className="relative flex-1 bg-surface-muted">{children}</section>
        <InspectorPanel projectId={projectId} />
      </div>
      <footer className="flex h-14 shrink-0 items-center border-t border-border bg-surface px-3 md:px-4">
        <CommandBar projectId={projectId} />
      </footer>
      <OnboardingTour />
    </div>
  );
}
