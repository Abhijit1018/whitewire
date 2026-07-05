import { hasSession } from "@/lib/auth";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";

export const metadata = { title: "Privacy · WhiteWire" };

export default async function Privacy() {
  const signedIn = await hasSession();
  return (
    <MarketingShell signedIn={signedIn}>
      <PageHeader title="Privacy Policy" subtitle="Your keys. Your data." />
      <div className="space-y-5 text-sm text-muted-foreground">
        <p>WhiteWire is bring-your-own-key. Your API keys are stored encrypted and are used only to make requests to the model provider you choose.</p>
        <p>Your canvases, projects, and generated artifacts are stored so you can access them across sessions. We do not sell your data or use it to train models.</p>
        <p>Model requests go from our server to your chosen provider using your key; that provider's privacy policy governs how they handle the request.</p>
        <p>You can delete your account and all associated data at any time from the Account page.</p>
        <p>Questions? See the <a className="text-brand-violet underline" href="/contact">contact page</a>.</p>
      </div>
    </MarketingShell>
  );
}
