"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/core/supabase/server";
import { validatePasswordChange } from "./validation";

export async function updateProfileAction(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
  redirect(error ? "/account?error=" + encodeURIComponent(error.message) : "/account?ok=profile");
}

export async function changePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const invalid = validatePasswordChange(password, confirm);
  if (invalid) redirect("/account?error=" + encodeURIComponent(invalid));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  redirect(error ? "/account?error=" + encodeURIComponent(error.message) : "/account?ok=password");
}

export async function deleteAccountAction(formData: FormData) {
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (confirm !== "delete my account")
    redirect("/account?error=" + encodeURIComponent('Type "delete my account" to confirm.'));

  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { purgeOwnerData } = await import("@/core/persistence/purge.repo");
  const { createAdminClient } = await import("@/core/supabase/admin");

  const ownerId = await syncCurrentUser();
  await purgeOwnerData(db, ownerId);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(ownerId);
  if (error) redirect("/account?error=" + encodeURIComponent(error.message));

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
