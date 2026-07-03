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
                  className="group/proj flex flex-row items-center justify-between p-4 transition-shadow hover:shadow-md"
                >
                  <Link href={`/p/${p.id}`} className="font-medium hover:text-brand-violet">
                    {p.name}
                  </Link>
                  <form action={deleteProjectAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover/proj:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
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
