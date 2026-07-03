import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/core/supabase/server";
import { updateProfileAction, changePasswordAction, deleteAccountAction } from "./actions";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  const displayName = (user?.user_metadata?.display_name as string | undefined) ?? "";

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Account" }]} />
        <main className="flex-1 space-y-8 p-4 sm:p-8">
          {error && <p className="max-w-xl rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          {ok && <p className="max-w-xl rounded-lg bg-green-500/10 p-3 text-sm text-green-700">Saved.</p>}

          <Card className="max-w-xl p-6">
            <h2 className="mb-3 font-medium">Profile</h2>
            <form action={updateProfileAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Email</label>
                <Input value={email} disabled readOnly />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Display name</label>
                <Input name="displayName" defaultValue={displayName} placeholder="Your name" />
              </div>
              <Button type="submit">Save profile</Button>
            </form>
          </Card>

          <Card className="max-w-xl p-6">
            <h2 className="mb-3 font-medium">Change password</h2>
            <form action={changePasswordAction} className="space-y-3">
              <Input name="password" type="password" placeholder="New password (min 6 chars)" required />
              <Input name="confirm" type="password" placeholder="Confirm new password" required />
              <Button type="submit">Update password</Button>
            </form>
          </Card>

          <Card className="max-w-xl border-destructive/40 p-6">
            <h2 className="mb-1 font-medium text-destructive">Danger zone</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Permanently delete your account and all projects, keys, and artifacts. This cannot be
              undone. Type <span className="font-mono">delete my account</span> to confirm.
            </p>
            <form action={deleteAccountAction} className="space-y-3">
              <Input name="confirm" placeholder="delete my account" required />
              <Button type="submit" className="bg-destructive text-white hover:opacity-90">
                Delete account
              </Button>
            </form>
          </Card>
        </main>
      </div>
    </div>
  );
}
