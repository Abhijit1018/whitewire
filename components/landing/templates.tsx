import Link from "next/link";
import { Plus } from "lucide-react";
import { Reveal } from "./motion";

/** Tiny hand-drawn-ish previews so each template card shows its shape. */
const PREVIEWS: Record<string, React.ReactNode> = {
  Brainstorm: (
    <>
      <circle cx="60" cy="30" r="10" />
      <circle cx="25" cy="18" r="7" />
      <circle cx="95" cy="18" r="7" />
      <circle cx="30" cy="48" r="7" />
      <circle cx="90" cy="48" r="7" />
      <path d="M50 28 30 20M70 28 90 20M52 36 34 46M68 36 86 46" />
    </>
  ),
  "Project Plan": (
    <>
      <rect x="14" y="22" width="26" height="16" rx="3" />
      <rect x="50" y="22" width="26" height="16" rx="3" />
      <rect x="86" y="22" width="26" height="16" rx="3" />
      <path d="M40 30h10M76 30h10" />
    </>
  ),
  "User Journey": (
    <>
      <circle cx="20" cy="30" r="6" />
      <circle cx="50" cy="30" r="6" />
      <circle cx="80" cy="30" r="6" />
      <circle cx="110" cy="30" r="6" />
      <path d="M26 30h18M56 30h18M86 30h18" strokeDasharray="2 3" />
    </>
  ),
  Wireframe: (
    <>
      <rect x="34" y="12" width="58" height="36" rx="3" />
      <path d="M34 22h58M42 30h20M42 38h30" />
    </>
  ),
};

const TEMPLATES = ["Brainstorm", "Project Plan", "User Journey", "Wireframe"];

export function Templates() {
  return (
    <section className="bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight">Start with a template, or a blank canvas</h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {TEMPLATES.map((t, i) => (
            <Reveal key={t} delay={i * 0.06}>
              <Link
                href="/marketplace"
                className="group block rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-3 grid h-24 place-items-center rounded-lg border border-dashed border-border bg-surface-muted">
                  <svg width="126" height="60" viewBox="0 0 126 60" fill="none" stroke="var(--brand-accent)" strokeWidth="1.5" className="opacity-80">
                    {PREVIEWS[t]}
                  </svg>
                </div>
                <p className="text-center text-sm font-medium text-foreground">{t}</p>
              </Link>
            </Reveal>
          ))}
          <Reveal delay={0.28}>
            <Link
              href="/marketplace"
              className="group flex h-full min-h-[128px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 p-3 text-muted-foreground transition-all hover:-translate-y-1 hover:border-brand-accent/50 hover:text-brand-accent"
            >
              <Plus className="size-6" />
              <p className="text-sm font-medium">More templates</p>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
