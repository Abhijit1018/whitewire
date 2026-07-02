import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  // motion-safe: only pulse when the user hasn't asked to reduce motion.
  return <div className={cn("motion-safe:animate-pulse rounded-md bg-muted", className)} />;
}
