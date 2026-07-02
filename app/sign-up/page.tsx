import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Create your WhiteWire account">
      <form action={signUpAction} className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Input name="email" type="email" placeholder="Email" required className="h-10" />
        <Input
          name="password"
          type="password"
          placeholder="Password (min 6 chars)"
          required
          minLength={6}
          className="h-10"
        />
        <Button type="submit" size="lg" className="w-full bg-gradient-brand text-white hover:opacity-90">
          Sign up
        </Button>
        <p className="text-sm text-muted-foreground">
          Have an account?{" "}
          <Link href="/sign-in" className="text-brand-violet hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
