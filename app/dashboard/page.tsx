import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { db } from "@/core/persistence/db";
import { listProjects } from "@/core/persistence/projects.repo";
import { syncCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { NewProjectDialog } from "./new-project-dialog";
import { deleteProjectAction } from "./actions";

export default async function Dashboard() {
  const ownerId = await syncCurrentUser();
  const projects = await listProjects(db, ownerId);

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Projects" }]} actions={<NewProjectDialog />} />
        <main className="flex-1 p-4 sm:p-8">
          {projects.length === 0 ? (
            <div className="mt-20 flex flex-col items-center text-center">
              <p className="text-muted-foreground">No projects yet.</p>
              <p className="text-sm text-muted-foreground">Create your first one to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <Card
                  key={p.id}
                  className="group/proj relative flex flex-col gap-0 overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Stretched link makes the whole card clickable; delete sits above it (z-10). */}
                  <Link
                    href={`/p/${p.id}`}
                    className="absolute inset-0 z-0 rounded-[inherit] focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open ${p.name}`}
                  />
                  {/* mini board preview */}
                  <div
                    className="relative h-28 border-b border-border"
                    style={{
                      backgroundColor: "oklch(0.985 0.006 74)",
                      backgroundImage: "radial-gradient(oklch(0.88 0.006 65) 1px, transparent 1px)",
                      backgroundSize: "14px 14px",
                    }}
                  >
                    <span className="absolute left-4 top-4 h-5 w-16 rounded border border-border bg-card shadow-sm" />
                    <span className="absolute left-24 top-8 h-5 w-14 rounded border border-border bg-card shadow-sm" />
                    <span className="absolute left-8 top-14 h-5 w-20 rounded-md bg-brand-accent/15" />
                    <span className="absolute right-5 top-6 size-8 rounded-full border border-dashed border-brand-accent/40" />
                  </div>
                  <div className="flex items-center justify-between gap-2 p-4">
                    <p className="truncate font-display font-semibold text-foreground transition-colors group-hover/proj:text-brand-accent">
                      {p.name}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground opacity-0 transition group-hover/proj:opacity-100">
                      Open →
                    </span>
                  </div>
                  <form action={deleteProjectAction} className="absolute right-2 top-2 z-10">
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      className="rounded-md bg-card/80 p-1.5 text-muted-foreground opacity-0 backdrop-blur transition hover:bg-destructive/10 hover:text-destructive group-hover/proj:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
                      type="submit"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </form>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
