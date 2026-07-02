import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-brand p-10 text-white md:flex">
        <Link href="/" aria-label="WhiteWire home">
          <Logo variant="full" appearance="dark" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Think. Visualize.<br />Collaborate. Build.</h2>
          <p className="mt-4 max-w-sm text-white/80">
            The AI-native canvas. Your keys, your freedom.
          </p>
        </div>
        <p className="text-sm text-white/70">Bring Your Own AI · Your Keys · Your Freedom</p>
      </div>
      <div className="flex items-center justify-center bg-dotted-grid p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 md:hidden">
            <Logo variant="full" appearance="light" />
          </div>
          <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
