import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-screen flex-col bg-surface-muted">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}
