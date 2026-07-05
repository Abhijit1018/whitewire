import { ShieldCheck, TerminalSquare, Laptop, Lock } from "lucide-react";
import { Reveal } from "./motion";

const POINTS = [
  { icon: ShieldCheck, title: "You're in control", body: "Your API keys. Your data. Always private." },
  { icon: TerminalSquare, title: "Any model, any source", body: "OpenAI, Claude, Gemini, Llama, Groq, Ollama & more." },
  { icon: Laptop, title: "Local or cloud", body: "Run locally with Ollama or connect any provider." },
  { icon: Lock, title: "Privacy first", body: "End-to-end control. No lock-in. No hidden fees." },
];

export function ByoAi() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight">Your keys. Your freedom.</h2>
      </Reveal>
      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((p, i) => (
          <Reveal key={p.title} delay={(i % 4) * 0.08}>
            <p.icon className="size-7 text-brand-violet" />
            <h3 className="mt-3 font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
