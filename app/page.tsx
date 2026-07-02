import { createClient } from "@/core/supabase/server";
import { LandingNav } from "@/components/landing/landing-nav";
import { Hero } from "@/components/landing/hero";
import { LiveCanvasDemo } from "@/components/landing/live-canvas-demo";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeaturesBand } from "@/components/landing/features-band";
import { Pricing } from "@/components/landing/pricing";
import { ByoAi } from "@/components/landing/byo-ai";
import { LandingFooter } from "@/components/landing/footer";

export default async function Landing() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = Boolean(user);

  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground">
      <LandingNav signedIn={signedIn} />
      <main className="flex-1">
        <Hero signedIn={signedIn} />
        <LiveCanvasDemo />
        <HowItWorks />
        <FeaturesBand />
        <ByoAi />
        <Pricing signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}
