import Link from "next/link";
import { Sidebar } from "@/components/app-shell/sidebar";
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
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Projects</h1>
          <NewProjectDialog />
        </div>
        {projects.length === 0 ? (
          <p className="text-muted-foreground">No projects yet. Create your first one.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card key={p.id} className="flex items-center justify-between p-4">
                <Link href={`/p/${p.id}`} className="font-medium hover:underline">
                  {p.name}
                </Link>
                <form action={deleteProjectAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="text-sm text-red-500" type="submit">Delete</button>
                </form>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
