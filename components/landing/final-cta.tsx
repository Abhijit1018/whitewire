import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="bg-white px-6 py-24">
      <Reveal className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-gradient-brand px-8 py-16 text-center text-white">
        <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Start building your ideas</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/90">
          Your keys, your models, your canvas. Free to start.
        </p>
        <div className="mt-8">
          <Link
            href={signedIn ? "/dashboard" : "/sign-up"}
            className={cn(buttonVariants({ size: "lg" }), "bg-white text-foreground hover:opacity-90")}
          >
            {signedIn ? "Open WhiteWire" : "Get started free"}
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
