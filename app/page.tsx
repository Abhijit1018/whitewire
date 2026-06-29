import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight">WhiteWire</h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        The AI-native canvas where ideas become specs, diagrams, code, and docs.
        Bring your own LLM. Own your intelligence.
      </p>
      <div className="flex gap-4">
        <Link href="/sign-up" className="rounded-md bg-black px-5 py-2.5 text-white">
          Get started
        </Link>
        <Link href="/sign-in" className="rounded-md border px-5 py-2.5">
          Log in
        </Link>
      </div>
    </main>
  );
}
