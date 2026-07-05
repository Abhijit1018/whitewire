import { Reveal } from "./motion";

const MODELS = ["OpenAI", "Anthropic", "Google Gemini", "Ollama", "LM Studio", "Groq", "Mistral", "OpenRouter"];

export function Integrations() {
  return (
    <section className="bg-white px-6 py-24">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Plays well with your model of choice</h2>
          <p className="mt-3 text-muted-foreground">
            Bring your own key, cloud or local. No lock-in, no hidden credits.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {MODELS.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-transform hover:-translate-y-0.5"
            >
              <span className="size-2 rounded-full bg-brand-accent/70" />
              {m}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
