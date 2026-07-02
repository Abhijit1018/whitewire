"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Float } from "./motion";

function FloatCard({
  className,
  amplitude,
  duration,
  delay,
  children,
}: {
  className: string;
  amplitude?: number;
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <Float className={className} amplitude={amplitude} duration={duration} delay={delay}>
      <div className="rounded-xl border border-border bg-white p-3 shadow-lg">{children}</div>
    </Float>
  );
}

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden bg-dotted-grid pt-32 pb-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
          <Lock className="size-4 text-brand-violet" />
          Bring Your Own AI · Your Keys · Your Freedom
        </span>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          <span className="text-gradient-brand">Think. Visualize.</span>
          <br />
          <span className="text-gradient-brand">Collaborate. Build.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          The AI-native canvas where ideas become specs, diagrams, wireframes, and docs.
          Any model, local or cloud. You stay in control.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/sign-up"}
            className={cn(buttonVariants({ size: "lg" }), "bg-gradient-brand text-white hover:opacity-90")}
          >
            {signedIn ? "Open WhiteWire" : "Get started free"}
          </Link>
          <Link href="#how" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            See how it works
          </Link>
        </div>
      </div>

      {/* floating decoration — hidden on small screens */}
      <FloatCard className="absolute left-[8%] top-40 hidden w-52 lg:block" duration={5} delay={0.2}>
        <p className="text-xs font-medium text-muted-foreground">System architecture</p>
        <div className="mt-2 space-y-1">
          <div className="h-3 rounded bg-gradient-brand opacity-80" />
          <div className="flex gap-1">
            <div className="h-8 flex-1 rounded border border-border" />
            <div className="h-8 flex-1 rounded border border-border" />
            <div className="h-8 flex-1 rounded border border-border" />
          </div>
        </div>
      </FloatCard>

      <FloatCard className="absolute right-[8%] top-36 hidden w-48 lg:block" duration={4.5} delay={0.5}>
        <p className="text-xs font-medium text-muted-foreground">Wireframe</p>
        <div className="mt-2 grid grid-cols-2 gap-1">
          <div className="col-span-2 h-4 rounded bg-muted" />
          <div className="h-10 rounded border border-dashed border-border" />
          <div className="h-10 rounded border border-dashed border-border" />
        </div>
      </FloatCard>

      <Float className="absolute right-[14%] bottom-16 hidden lg:block" amplitude={8} duration={6} delay={0.3}>
        <div className="-rotate-6 rounded-md bg-yellow-200 p-3 shadow-lg">
          <p className="font-hand text-lg leading-tight text-yellow-900">Add onboarding flow ✦</p>
        </div>
      </Float>

      <Float className="absolute left-[14%] bottom-24 hidden lg:block" amplitude={12} duration={5.5} delay={0.6}>
        <div className="flex size-12 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-lg">
          ✓
        </div>
      </Float>
    </section>
  );
}
