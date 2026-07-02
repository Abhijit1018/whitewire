import { PenLine, Sparkles, Share2 } from "lucide-react";
import { Reveal } from "./motion";

const STEPS = [
  { icon: PenLine, title: "Sketch", body: "Draw or type your idea on the canvas — rough is fine." },
  { icon: Sparkles, title: "AI generates", body: "Your model turns strokes and prompts into diagrams, wireframes, and docs." },
  { icon: Share2, title: "Collaborate & export", body: "Refine in real time, then export specs and code artifacts." },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-border bg-surface-muted py-24">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">From scribble to shipped</h2>
        </Reveal>
        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="relative rounded-xl border border-border bg-white p-6 shadow-sm">
                <div className="flex size-11 items-center justify-center rounded-lg bg-gradient-brand text-white">
                  <s.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                <span className="absolute right-4 top-4 font-hand text-2xl text-brand-violet/40">
                  {i + 1}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
