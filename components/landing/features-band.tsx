import { Users, Sparkles, Workflow, LayoutTemplate, MessageSquare, FileText } from "lucide-react";
import { Reveal } from "./motion";

const FEATURES = [
  { icon: Users, title: "Collaborative Canvas", body: "Work together in real time on an infinite canvas." },
  { icon: Sparkles, title: "AI, Your Way", body: "Use any LLM — local or cloud. You're in control." },
  { icon: Workflow, title: "Diagrams & Flow", body: "From flowcharts to system designs in seconds." },
  { icon: LayoutTemplate, title: "Wireframes & UI", body: "Generate, edit, and iterate beautiful interfaces." },
  { icon: MessageSquare, title: "Chat with Context", body: "AI that understands your canvas, always." },
  { icon: FileText, title: "Docs & Notes", body: "Write, organize, and link everything in one place." },
];

export function FeaturesBand() {
  return (
    <section id="features" className="scroll-mt-20 bg-neutral-950 py-24 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything, in one place</h2>
          <p className="mt-3 text-neutral-300">Think. Visualize. Collaborate. Build.</p>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 0.08}>
              <div className="h-full bg-neutral-950 p-8">
                <div className="flex size-11 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-[0_0_24px_-4px_var(--brand-violet)]">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-neutral-300">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
