import { Reveal } from "./motion";

const QA = [
  { q: "Do I need to buy credits?", a: "No. WhiteWire is bring-your-own-key — you pay your model provider directly, or run models locally for free." },
  { q: "Which models can I use?", a: "Any OpenAI-compatible endpoint, Anthropic, or Google — plus local runtimes like Ollama and LM Studio." },
  { q: "Is my data private?", a: "Your keys and canvas stay yours. Requests go straight from your account to your chosen provider." },
  { q: "Can I run models locally?", a: "Yes — point an OpenAI-compatible base URL at Ollama or LM Studio and you're set." },
  { q: "Is it collaborative?", a: "Yes — the canvas is built for real-time collaboration that scales with your team." },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-surface-muted px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions, answered</h2>
        </Reveal>
        <div className="mt-10 space-y-3">
          {QA.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.05}>
              <details className="group rounded-xl border border-border bg-white p-5 [&_summary]:cursor-pointer">
                <summary className="flex items-center justify-between font-medium marker:content-['']">
                  {item.q}
                  <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{item.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
