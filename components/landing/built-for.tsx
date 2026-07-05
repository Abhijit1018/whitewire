import { Check } from "lucide-react";
import { Reveal } from "./motion";
import { Scribble } from "./hand";

const AUDIENCES = ["Product & design teams", "Engineering & architecture", "Education & research"];

function SketchCard({ className, rotate }: { className?: string; rotate: string }) {
  return (
    <div className={`absolute w-44 rounded-md border border-border bg-card p-3 shadow-lg ${className}`} style={{ rotate }}>
      {/* tape */}
      <span className="absolute -top-2 left-1/2 h-4 w-12 -translate-x-1/2 -rotate-3 rounded-sm bg-[oklch(0.88_0.04_58)]/70" />
      <svg viewBox="0 0 150 110" fill="none" stroke="oklch(0.5 0.02 50)" strokeWidth="1.6" className="w-full">
        <rect x="8" y="8" width="134" height="94" rx="4" />
        <path d="M8 26h134" />
        <rect x="18" y="36" width="52" height="34" rx="3" />
        <rect x="80" y="36" width="52" height="34" rx="3" />
        <path d="M18 82h114M18 92h70" />
      </svg>
    </div>
  );
}

function Camera({ className }: { className?: string }) {
  return (
    <svg className={className} width="88" height="70" viewBox="0 0 88 70" fill="none" aria-hidden>
      <rect x="4" y="16" width="80" height="48" rx="8" fill="oklch(0.32 0.02 50)" />
      <rect x="26" y="8" width="20" height="12" rx="3" fill="oklch(0.32 0.02 50)" />
      <circle cx="44" cy="40" r="16" fill="oklch(0.22 0.01 50)" />
      <circle cx="44" cy="40" r="9" fill="oklch(0.6 0.13 44)" />
      <circle cx="72" cy="26" r="3" fill="oklch(0.7 0.12 55)" />
    </svg>
  );
}

export function BuiltFor() {
  return (
    <section className="overflow-hidden bg-card px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        {/* sketch collage */}
        <Reveal className="relative mx-auto h-72 w-full max-w-md">
          <SketchCard className="left-2 top-4" rotate="-6deg" />
          <SketchCard className="right-4 top-16" rotate="5deg" />
          <Camera className="absolute bottom-2 left-1/2 -translate-x-1/2 drop-shadow-lg" />
          <span className="absolute right-2 top-0 font-hand text-lg text-brand-accent">ideas, here ✦</span>
        </Reveal>

        {/* copy */}
        <Reveal delay={0.1}>
          <Scribble>Built for makers and thinkers</Scribble>
          <h2 className="mt-3 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            For teams, creators, and solo builders.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            From product roadmaps to design sprints, WhiteWire adapts to the way you think and work.
          </p>
          <ul className="mt-6 space-y-3">
            {AUDIENCES.map((a) => (
              <li key={a} className="flex items-center gap-2.5 text-foreground">
                <span className="grid size-5 place-items-center rounded-full bg-brand-accent/12 text-brand-accent">
                  <Check className="size-3.5" />
                </span>
                {a}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
