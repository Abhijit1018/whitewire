import { Network, LayoutTemplate, FileText, Lightbulb } from "lucide-react";
import { Reveal } from "./motion";

const CASES = [
  { icon: Network, title: "System design", body: "Turn a sentence into a full architecture diagram." },
  { icon: LayoutTemplate, title: "Wireframes & UI", body: "Sketch a screen, generate clean interfaces." },
  { icon: FileText, title: "Docs & specs", body: "Draft specs and documentation from your canvas." },
  { icon: Lightbulb, title: "Brainstorming", body: "Think out loud on an infinite, AI-aware canvas." },
];

export function UseCases() {
  return (
    <section className="bg-surface-muted px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">One canvas, many jobs</h2>
          <p className="mt-3 text-muted-foreground">However you think, WhiteWire keeps up.</p>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CASES.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-border bg-white p-6 transition-transform hover:-translate-y-1">
                <div className="mb-4 grid size-11 place-items-center rounded-xl bg-gradient-brand text-white">
                  <c.icon className="size-5" />
                </div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
