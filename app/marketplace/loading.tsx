import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Marketplace" }]} />
        <main className="flex-1 p-4 sm:p-8">
          <Skeleton className="mb-2 h-6 w-52" />
          <Skeleton className="mb-8 h-4 w-80" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
