import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "Docs · WhiteWire" };

const STEPS = [
  { t: "1. Create an account", d: "Sign up with email — no credit card, no credits to buy." },
  { t: "2. Add your model key", d: "In Settings, add an OpenAI-compatible, Anthropic, or Google key. Click 'Load models' and pick one from the list." },
  { t: "3. Start a project", d: "From your dashboard, create a project to open a fresh infinite canvas." },
  { t: "4. Sketch & generate", d: "Draw or drop a note, then ask WhiteWire to turn it into a diagram, wireframe, or doc." },
  { t: "5. Route models per task", d: "Optionally assign different models to reasoning, code, and docs in Settings." },
];

export default async function Docs() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
      <PageHeader title="Getting started" subtitle="From zero to your first diagram" />
      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.t} className="rounded-xl border border-border bg-white p-5">
            <h3 className="font-semibold">{s.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </li>
        ))}
      </ol>
    </MarketingShell>
  );
}
