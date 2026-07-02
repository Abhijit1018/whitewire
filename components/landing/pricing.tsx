import Link from "next/link";
import { Check } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

const INCLUDED = [
  "Bring your own API key",
  "Infinite collaborative canvas",
  "AI diagrams, wireframes & docs",
  "No lock-in, no hidden fees",
];

export function Pricing({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="pricing" className="scroll-mt-20 border-t border-border bg-surface-muted py-24">
      <div className="mx-auto max-w-md px-6">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Simple pricing</h2>
          <p className="mt-3 text-muted-foreground">Pay for your own model usage. WhiteWire is free.</p>
        </Reveal>
        <Reveal className="mt-10" delay={0.1}>
          <div className="rounded-2xl border border-border bg-white p-8 shadow-xl">
            <p className="text-sm font-medium text-brand-violet">Free — bring your own key</p>
            <p className="mt-2 text-4xl font-bold">
              $0<span className="text-base font-normal text-muted-foreground">/forever</span>
            </p>
            <ul className="mt-6 space-y-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-brand-blue" /> {item}
                </li>
              ))}
            </ul>
            <Link
              href={signedIn ? "/dashboard" : "/sign-up"}
              className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full bg-gradient-brand text-white hover:opacity-90")}
            >
              {signedIn ? "Open WhiteWire" : "Get started free"}
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
