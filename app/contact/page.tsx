import { createClient } from "@/core/supabase/server";
import { MarketingShell, PageHeader } from "@/components/marketing/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "Contact · WhiteWire" };

export default async function Contact() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <MarketingShell signedIn={Boolean(user)}>
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
