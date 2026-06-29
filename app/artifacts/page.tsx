import { Sidebar } from "@/components/app-shell/sidebar";

export default function Artifacts() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Artifacts</h1>
        <p className="text-muted-foreground">Generated docs, diagrams, and code appear here (Phase 4).</p>
      </main>
    </div>
  );
}
