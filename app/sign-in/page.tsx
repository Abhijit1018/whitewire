import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/auth/submit-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthShell title="Sign in to WhiteWire">
      <div className="space-y-4">
        <GoogleButton label="Sign in with Google" />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form action={signInAction} className="space-y-4">
          {/* Reserved space: the error appears without pushing the fields down. */}
          <p className="min-h-5 text-sm text-destructive" role="alert">
            {error}
          </p>
          <Input name="email" type="email" placeholder="Email" required className="h-10" />
          <PasswordInput name="password" placeholder="Password" required className="h-10" />
          <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
          <p className="text-sm text-muted-foreground">
            No account?{" "}
            <Link href="/sign-up" className="text-brand-accent hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </AuthShell>
  );
}
