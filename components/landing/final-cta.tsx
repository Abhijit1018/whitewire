import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";
import { Sparkle } from "./hand";

function PaperPlane({ className }: { className?: string }) {
  return (
    <svg className={cn(className)} width="150" height="120" viewBox="0 0 150 120" fill="none" aria-hidden>
      <path
        d="M4 116C10 74 34 40 92 30"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="2 8"
        strokeLinecap="round"
      />
      <path
        d="M96 12L146 30l-34 12-6 26-14-20-38 8 58-42Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M112 42l-6 26" stroke="oklch(1 0 0 / 0.4)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="relative overflow-hidden bg-background px-6 py-28">
      <Reveal className="relative mx-auto max-w-2xl text-center">
        <PaperPlane className="pointer-events-none absolute -left-28 top-2 hidden text-brand-accent/70 lg:block" />

        {/* sticky note */}
        <div className="pointer-events-none absolute -right-24 -top-4 hidden rotate-6 lg:block">
          <div className="w-40 rounded-md bg-[oklch(0.9_0.05_58)] px-4 py-3 font-hand text-lg leading-tight text-[oklch(0.36_0.08_45)] shadow-lg">
            Let&apos;s build something amazing
          </div>
        </div>

        <h2 className="inline-flex flex-wrap items-center justify-center gap-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Ready to shape your ideas?
          <Sparkle className="text-brand-accent" />
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Join thousands of creators and teams turning messy thoughts into clear plans.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={signedIn ? "/dashboard" : "/sign-up"}
            className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base shadow-sm")}
          >
            {signedIn ? "Open WhiteWire" : "Get started free"}
          </Link>
          <Link
            href="/dashboard"
            className="group inline-flex h-11 items-center gap-1.5 px-3 text-base font-medium text-foreground"
          >
            Explore templates
            <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
