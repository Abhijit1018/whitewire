import "server-only";

type Input = { provider: string; baseUrl: string | null; apiKey: string };

const TIMEOUT_MS = 10_000;

async function getJson(url: string, headers: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(
      res.status === 401 || res.status === 403
        ? `Provider rejected the key (${res.status}).`
        : `Could not load models (${res.status}).`,
    );
  }
  return res.json();
}

export async function listModels({ provider, baseUrl, apiKey }: Input): Promise<string[]> {
  if (provider === "openai-compatible") {
    const base = (baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
    const json = (await getJson(`${base}/models`, { Authorization: `Bearer ${apiKey}` })) as {
      data?: { id: string }[];
    };
    return (json.data ?? []).map((m) => m.id).sort();
  }
  if (provider === "anthropic") {
    const json = (await getJson("https://api.anthropic.com/v1/models", {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    })) as { data?: { id: string }[] };
    return (json.data ?? []).map((m) => m.id).sort();
  }
  if (provider === "google") {
    const json = (await getJson(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      {},
    )) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (json.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .sort();
  }
  throw new Error(`Unknown provider: ${provider}`);
}
