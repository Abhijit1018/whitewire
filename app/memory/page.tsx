import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { db } from "@/core/persistence/db";
import { listNotes } from "@/core/persistence/memory.repo";
import { listProjects } from "@/core/persistence/projects.repo";
import { getCanvas } from "@/core/persistence/canvas.repo";
import { harvestNotes, describeHarvest, type HarvestedProject } from "@/core/memory/harvest";
import { normalizeTitle } from "@/core/memory/links";
import { syncCurrentUser } from "@/lib/auth";
import { MemoryWorkbench } from "./memory-workbench";

/** Reads every board this user owns so memory can build itself from them. */
async function loadBoards(ownerId: string): Promise<HarvestedProject[]> {
  const projects = await listProjects(db, ownerId);
  const boards = await Promise.all(
    projects.map(async (p) => {
      try {
        const snapshot = await getCanvas(db, { projectId: p.id, ownerId });
        const doc = (snapshot ?? {}) as { nodes?: unknown; edges?: unknown };
        return {
          projectId: p.id,
          projectName: p.name,
          nodes: Array.isArray(doc.nodes) ? (doc.nodes as HarvestedProject["nodes"]) : [],
          edges: Array.isArray(doc.edges) ? (doc.edges as HarvestedProject["edges"]) : [],
        };
      } catch {
        // One unreadable board must not empty the whole graph.
        return { projectId: p.id, projectName: p.name, nodes: [], edges: [] };
      }
    }),
  );
  return boards;
}

export default async function MemoryPage() {
  const ownerId = await syncCurrentUser();
  const [written, boards] = await Promise.all([listNotes(db, ownerId), loadBoards(ownerId)]);

  const harvested = harvestNotes(boards);
  // A note the user wrote wins over the harvested one of the same name — their
  // words are the authority, the boards only fill the gaps.
  const writtenTitles = new Set(written.map((n) => normalizeTitle(n.title)));

  const notes = [
    ...written.map((n) => ({ id: n.id, title: n.title, body: n.body, harvested: false })),
    ...harvested
      .filter((h) => !writtenTitles.has(normalizeTitle(h.title)))
      .map((h) => ({ id: h.id, title: h.title, body: describeHarvest(h), harvested: true })),
  ];

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Memory" }]} />
        <main className="flex-1 p-4 sm:p-8">
          <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
            Built from your boards automatically — every entity you create becomes a node here, and
            an idea that shows up on several boards becomes one node that knows about all of them.
            Write your own notes too, and link anything with{" "}
            <code className="rounded bg-muted px-1">[[double brackets]]</code>.
          </p>
          <MemoryWorkbench notes={notes} />
        </main>
      </div>
    </div>
  );
}
