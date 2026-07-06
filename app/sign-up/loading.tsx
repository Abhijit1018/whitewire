import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AuthShell title="Create your WhiteWire account">
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </AuthShell>
  );
}
