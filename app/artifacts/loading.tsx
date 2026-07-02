import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Artifacts" }]} />
        <main className="flex-1 space-y-8 p-8">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
