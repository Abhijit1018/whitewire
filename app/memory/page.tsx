import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { db } from "@/core/persistence/db";
import { listNotes } from "@/core/persistence/memory.repo";
import { syncCurrentUser } from "@/lib/auth";
import { MemoryWorkbench } from "./memory-workbench";

export default async function MemoryPage() {
  const ownerId = await syncCurrentUser();
  const rows = await listNotes(db, ownerId);
  const notes = rows.map((n) => ({ id: n.id, title: n.title, body: n.body }));

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Memory" }]} />
        <main className="flex-1 p-4 sm:p-8">
          <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
            Notes that belong to you rather than to one board. Link them with{" "}
            <code className="rounded bg-muted px-1">[[double brackets]]</code> and the graph builds
            itself.
          </p>
          <MemoryWorkbench notes={notes} />
        </main>
      </div>
    </div>
  );
}
