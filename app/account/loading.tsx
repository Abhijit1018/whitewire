import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Account" }]} />
        <main className="flex-1 space-y-8 p-8">
          <Skeleton className="h-64 max-w-xl" />
          <Skeleton className="h-48 max-w-xl" />
        </main>
      </div>
    </div>
  );
}
