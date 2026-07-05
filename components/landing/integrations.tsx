import { Reveal } from "./motion";

const MODELS = ["OpenAI", "Anthropic", "Google Gemini", "Ollama", "LM Studio", "Groq", "Mistral", "OpenRouter"];

export function Integrations() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Any model, any source</h2>
          <p className="mt-3 text-muted-foreground">
            Bring your own key — cloud or local. No lock-in, no hidden fees.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {MODELS.map((m) => (
            <span
              key={m}
              className="rounded-full border border-border bg-surface-muted px-4 py-2 text-sm font-medium text-foreground"
            >
              {m}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
