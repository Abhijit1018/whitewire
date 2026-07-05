import { hasSession } from "@/lib/auth";
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
import { BuiltFor } from "@/components/landing/built-for";
import { Templates } from "@/components/landing/templates";
import { Testimonial } from "@/components/landing/testimonial";

export default async function Landing() {
  const signedIn = await hasSession();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingNav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <LiveCanvasDemo />
        <FeaturesBand />
        <BuiltFor />
        <HowItWorks />
        <Templates />
        <UseCases />
        <Integrations />
        <ByoAi />
        <Testimonial />
        <Pricing signedIn={signedIn} />
        <Faq />
        <FinalCta signedIn={signedIn} />
      </main>
      <LandingFooter />
    </div>
  );
}
