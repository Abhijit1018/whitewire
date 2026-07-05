import { Reveal } from "./motion";

const STEPS = [
  { title: "Start anywhere", body: "Open a blank canvas or pick a template." },
  { title: "Add your ideas", body: "Write, draw, connect, and explore freely." },
  { title: "Collaborate", body: "Invite your team and build together in real time." },
  { title: "Ship it", body: "Export specs, diagrams, and docs into your workflow." },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-background py-28">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal className="text-center">
          <h2 className="font-display text-4xl font-semibold tracking-tight">A space that moves with you</h2>
        </Reveal>

        <div className="relative mt-16">
          {/* connecting dashed path (desktop) */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-6 hidden border-t-2 border-dashed border-brand-accent/30 md:block"
          />
          <div className="grid gap-10 md:grid-cols-4 md:gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08} className="relative text-center md:text-left">
                <div className="mb-4 flex justify-center md:justify-start">
                  <span className="relative z-10 grid size-12 place-items-center rounded-full bg-brand-accent font-hand text-2xl text-white shadow-sm ring-4 ring-background">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
