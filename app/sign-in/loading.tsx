import { AuthShell } from "@/components/auth/auth-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <AuthShell title="Sign in to WhiteWire">
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </AuthShell>
  );
}
