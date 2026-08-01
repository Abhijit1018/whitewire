import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/auth/submit-button";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Create your WhiteWire account">
      <div className="space-y-4">
        <GoogleButton label="Sign up with Google" />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={signUpAction} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <p>{error}</p>
              {/already exists/i.test(error) && (
                <Link
                  href="/sign-in"
                  className="mt-1 inline-block font-medium text-brand-accent hover:underline"
                >
                  Go to sign in →
                </Link>
              )}
            </div>
          )}
          <Input name="email" type="email" placeholder="Email" required className="h-10" />
          <PasswordInput
            name="password"
            placeholder="Password (min 6 chars)"
            required
            minLength={6}
            className="h-10"
          />
          <SubmitButton pendingText="Creating account…">Sign up</SubmitButton>
          <p className="text-sm text-muted-foreground">
            Have an account?{" "}
            <Link href="/sign-in" className="text-brand-accent hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
