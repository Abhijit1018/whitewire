import { createClient } from "@/core/supabase/server";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { LiveCanvasDemo } from "@/components/landing/live-canvas-demo";
import { HowItWorks } from "@/components/landing/how-it-works";
import { UseCases } from "@/components/landing/use-cases";
import { FeaturesBand } from "@/components/landing/features-band";
import { Integrations } from "@/components/landing/integrations";
import { ByoAi } from "@/components/landing/byo-ai";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  return (
    <>
      <LandingNav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <LiveCanvasDemo />
        <HowItWorks />
        <UseCases />
        <FeaturesBand />
        <Integrations />
        <ByoAi />
        <Pricing signedIn={signedIn} />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <LandingFooter />
    </>
  );
}
