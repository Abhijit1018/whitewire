import React from "react";
import Link from "next/link";
import { InspectorPanel } from "./inspector-panel";
import { ShareDialog } from "./share-dialog";
import { CanvasTools } from "@/components/canvas/canvas-tools";
import { CommandBar } from "@/components/canvas/command-bar";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import type { Role } from "@/core/persistence/projects.repo";

export function WorkspaceShell({
  projectId,
  name,
  role,
  isOwner,
  shareEnabled,
  shareRole,
  children,
}: {
  projectId: string;
  name: string;
  role: Role;
  isOwner: boolean;
  shareEnabled: boolean;
  shareRole: "editor" | "viewer";
  children?: React.ReactNode;
}) {
  const canEdit = role === "owner" || role === "editor";
  return (
    <div className="flex h-[100dvh] flex-col" data-project-id={projectId}>
      {/* relative + z-30 so tool dropdowns overlay the canvas; NOT overflow-x-auto
          (that forces overflow-y and clips any menu opening below the header). */}
      <header className="relative z-30 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 md:px-4">
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
          {canEdit ? (
            <CanvasTools projectId={projectId} />
          ) : (
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              View only
            </span>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3">
          <ShareDialog
            projectId={projectId}
            isOwner={isOwner}
            shareEnabled={shareEnabled}
            shareRole={shareRole}
          />
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Settings
          </Link>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <section className="relative flex-1 bg-surface-muted">{children}</section>
        <InspectorPanel projectId={projectId} />
      </div>
      {canEdit && (
        <footer className="flex h-14 shrink-0 items-center border-t border-border bg-surface px-3 md:px-4">
          <CommandBar projectId={projectId} />
        </footer>
      )}
      <OnboardingTour />
    </div>
  );
}
