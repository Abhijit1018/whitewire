import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Projects" }]} />
        <main className="flex-1 p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
