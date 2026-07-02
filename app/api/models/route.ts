import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/auth";
import { listModels } from "@/core/ai/list-models";
import { assertAllowedBaseUrl } from "@/core/ai/net-guard";

const PROVIDERS = ["openai-compatible", "anthropic", "google"];

export async function POST(req: Request) {
  try {
    await syncCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { provider?: string; baseUrl?: string | null; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const provider = String(body.provider ?? "");
  const apiKey = String(body.apiKey ?? "").trim();
  const baseUrl = body.baseUrl ? String(body.baseUrl).trim() : null;

  if (!PROVIDERS.includes(provider))
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  if (!apiKey) return NextResponse.json({ error: "API key is required" }, { status: 400 });
  if (baseUrl) {
    try {
      assertAllowedBaseUrl(baseUrl);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid baseUrl";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    const models = await listModels({ provider, baseUrl, apiKey });
    return NextResponse.json({ models });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load models";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
