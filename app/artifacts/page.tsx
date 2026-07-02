import Link from "next/link";
import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Card } from "@/components/ui/card";
import { db } from "@/core/persistence/db";
import { listArtifactsByOwner } from "@/core/persistence/artifacts.repo";
import { syncCurrentUser } from "@/lib/auth";

export default async function ArtifactsPage() {
  const ownerId = await syncCurrentUser();
  const rows = await listArtifactsByOwner(db, ownerId);

  const byProject = new Map<string, { name: string; items: typeof rows }>();
  for (const r of rows) {
    const g = byProject.get(r.projectId) ?? { name: r.projectName, items: [] as typeof rows };
    g.items.push(r);
    byProject.set(r.projectId, g);
  }

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Artifacts" }]} />
        <main className="flex-1 p-8">
          {rows.length === 0 ? (
            <p className="mt-20 text-center text-sm text-muted-foreground">
              No artifacts yet. Open a project, select an AI Node, and generate one.
            </p>
          ) : (
            <div className="space-y-8">
              {[...byProject.entries()].map(([projectId, group]) => (
                <section key={projectId}>
                  <h2 className="mb-3 font-medium">
                    <Link href={`/p/${projectId}`} className="hover:text-brand-violet">
                      {group.name}
                    </Link>
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.items.map((a) => (
                      <Card key={a.id} className="p-4">
                        <span className="text-sm font-medium capitalize">{a.type}</span>
                        <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                          {a.content}
                        </pre>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
