import Link from "next/link";
import { Sidebar } from "@/components/app-shell/sidebar";
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
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Artifacts</h1>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No artifacts yet. Open a project, select an AI Node, and generate one.
          </p>
        ) : (
          <div className="space-y-8">
            {[...byProject.entries()].map(([projectId, group]) => (
              <section key={projectId}>
                <h2 className="mb-2 font-medium">
                  <Link href={`/p/${projectId}`} className="underline">
                    {group.name}
                  </Link>
                </h2>
                <ul className="space-y-2">
                  {group.items.map((a) => (
                    <li key={a.id} className="rounded border p-3">
                      <span className="font-medium capitalize">{a.type}</span>
                      <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">{a.content}</pre>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
