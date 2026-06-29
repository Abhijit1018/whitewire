"use server";

import { revalidatePath } from "next/cache";

export async function addKeyAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { addKey } = await import("@/core/ai/keys.repo");
  const ownerId = await syncCurrentUser();

  const provider = String(formData.get("provider") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const baseUrlRaw = String(formData.get("baseUrl") ?? "").trim();
  if (!label || !model || !apiKey) throw new Error("label, model and apiKey are required");
  if (!["openai-compatible", "anthropic", "google"].includes(provider))
    throw new Error("invalid provider");
  const baseUrl =
    provider === "openai-compatible" ? baseUrlRaw || "https://api.openai.com/v1" : null;

  await addKey(db, { ownerId, provider, label, baseUrl, model, apiKey });
  revalidatePath("/settings");
}

export async function deleteKeyAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { deleteKey } = await import("@/core/ai/keys.repo");
  const ownerId = await syncCurrentUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id required");
  await deleteKey(db, { id, ownerId });
  revalidatePath("/settings");
}

export async function setActiveKeyAction(formData: FormData) {
  const { db } = await import("@/core/persistence/db");
  const { syncCurrentUser } = await import("@/lib/auth");
  const { setActiveKey } = await import("@/core/ai/settings.repo");
  const ownerId = await syncCurrentUser();
  const id = String(formData.get("id") ?? "");
  await setActiveKey(db, { ownerId, keyId: id || null });
  revalidatePath("/settings");
}
