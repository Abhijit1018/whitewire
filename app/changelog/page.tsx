import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "Changelog · WhiteWire" };

const ENTRIES = [
  { date: "Jul 2026", title: "Landing & app redesign", body: "New single-scroll landing, grey/white app theme, transparent brand logo, and an Account page." },
  { date: "Jul 2026", title: "Model-picker in Settings", body: "Load available models straight from your provider — no more manual typos." },
  { date: "Jun 2026", title: "Artifacts", body: "Generated diagrams, specs, and docs are saved and browsable per project." },
  { date: "Jun 2026", title: "Bring Your Own LLM", body: "Add OpenAI-compatible, Anthropic, or Google keys and route models per task." },
];

export default async function Changelog() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
      <PageHeader title="Changelog" subtitle="What's new" />
      <div className="space-y-6">
        {ENTRIES.map((e) => (
          <div key={e.title} className="rounded-xl border border-border bg-white p-5">
            <p className="font-hand text-lg text-brand-violet">{e.date}</p>
            <h3 className="mt-1 font-semibold">{e.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{e.body}</p>
          </div>
        ))}
      </div>
    </MarketingShell>
  );
}
