import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/footer";

export function MarketingShell({
  signedIn,
  children,
}: {
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <LandingNav signedIn={signedIn} />
      <main className="min-h-[70vh] bg-dotted-grid px-6 pb-24 pt-32">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
      <LandingFooter />
    </>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-10">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {subtitle && <p className="mt-3 font-hand text-2xl text-brand-violet">{subtitle}</p>}
    </header>
  );
}
