import { Users, PencilLine, Boxes, RefreshCw, ShieldCheck, FileText } from "lucide-react";
import { Reveal } from "./motion";

const FEATURES = [
  { icon: Users, title: "Real-time collaboration", body: "Work together seamlessly. See changes as they happen." },
  { icon: PencilLine, title: "Sketch anything", body: "Draw, write, diagram, and bring ideas to life." },
  { icon: Boxes, title: "Organize visually", body: "Shapes, frames, and connectors structure complex ideas." },
  { icon: RefreshCw, title: "Always in sync", body: "Your work saves automatically to the cloud." },
  { icon: ShieldCheck, title: "Private by design", body: "Your data is secure and you're always in control." },
  { icon: FileText, title: "Docs & artifacts", body: "Generate specs, schemas, and docs from your canvas." },
];

export function FeaturesBand() {
  return (
    <section id="features" className="scroll-mt-20 border-y border-border bg-card py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight">Everything on one infinite canvas</h2>
          <div className="mx-auto mt-3 h-1 w-20 rounded-full bg-brand-accent/40" />
        </Reveal>
        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08} className="text-center sm:text-left">
              <div className="mb-4 flex justify-center sm:justify-start">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-accent/10 text-brand-accent ring-1 ring-brand-accent/15">
                  <f.icon className="size-5" />
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
