"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/core/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/sign-in?error=" + encodeURIComponent(error.message));
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect("/sign-up?error=" + encodeURIComponent(error.message));
  // If email confirmation is enabled, there is no session yet.
  if (!data.session) {
    redirect("/sign-in?error=" + encodeURIComponent("Check your email to confirm, then sign in."));
  }
  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
