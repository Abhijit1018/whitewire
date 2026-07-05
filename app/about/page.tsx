import { hasSession } from "@/lib/auth";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "About · WhiteWire" };

export default async function About() {
  const signedIn = await hasSession();
  return (
    <MarketingShell signedIn={signedIn}>
      <PageHeader title="About WhiteWire" subtitle="Think. Visualize. Collaborate. Build." />
      <div className="space-y-5 text-muted-foreground">
        <p>
          WhiteWire is an AI-native canvas where ideas become specs, diagrams, wireframes, and docs.
          Sketch a thought and watch it take shape — then refine it together in real time.
        </p>
        <p>
          We built it on one principle: <span className="font-medium text-foreground">you own your intelligence</span>.
          Bring your own model — OpenAI, Anthropic, Google, or a local runtime like Ollama. Your
          keys, your data, no lock-in and no hidden credits.
        </p>
        <p>
          One infinite canvas for the whole idea, from the first scribble to the shipped
          architecture.
        </p>
      </div>
    </MarketingShell>
  );
}
