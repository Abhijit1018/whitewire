import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Sign in to WhiteWire">
      <form action={signInAction} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Input name="email" type="email" placeholder="Email" required className="h-10" />
        <Input name="password" type="password" placeholder="Password" required className="h-10" />
        <Button type="submit" size="lg" className="w-full bg-gradient-brand text-white hover:opacity-90">
          Sign in
        </Button>
        <p className="text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/sign-up" className="text-brand-violet hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
