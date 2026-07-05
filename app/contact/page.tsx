import { hasSession } from "@/lib/auth";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Contact · WhiteWire" };

export default async function Contact() {
  const signedIn = await hasSession();
  return (
    <MarketingShell signedIn={signedIn}>
      <PageHeader title="Get in touch" subtitle="We'd love to hear from you" />
      <div className="space-y-5 text-muted-foreground">
        <p>Questions, feedback, or partnership ideas? Reach out and we'll get back to you.</p>
        <a
          href="mailto:hello@whitewire.app"
          className={cn(buttonVariants({ size: "lg" }), "bg-gradient-brand text-white hover:opacity-90")}
        >
          Email us
        </a>
      </div>
    </MarketingShell>
  );
}
