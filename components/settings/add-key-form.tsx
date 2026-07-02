"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addKeyAction } from "@/app/settings/keys-actions";

export function AddKeyForm() {
  const [provider, setProvider] = useState("openai-compatible");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [manual, setManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadModels() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider, baseUrl: baseUrl || null, apiKey }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load models");
      if (!json.models?.length) throw new Error("No models returned for this key.");
      setModels(json.models);
      setManual(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load models");
      setModels([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={addKeyAction} className="space-y-3 rounded-lg border border-border p-4">
      <h3 className="font-medium">Add a key</h3>
      <select
        name="provider"
        value={provider}
        onChange={(e) => {
          setProvider(e.target.value);
          setModels([]);
        }}
        className="w-full rounded border px-3 py-2"
      >
        <option value="openai-compatible">OpenAI-compatible (OpenAI, Groq, OpenRouter, Ollama…)</option>
        <option value="anthropic">Anthropic</option>
        <option value="google">Google</option>
      </select>
      <Input name="label" placeholder="Label (e.g. My OpenAI)" required />
      {provider === "openai-compatible" && (
        <Input
          name="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="Base URL (default https://api.openai.com/v1)"
        />
      )}
      <Input
        name="apiKey"
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="API key"
        required
      />

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={loadModels} disabled={!apiKey || loading}>
          {loading ? "Loading…" : "Load models"}
        </Button>
        {(models.length > 0 || manual) && (
          <button
            type="button"
            className="text-sm text-muted-foreground underline"
            onClick={() => setManual((m) => !m)}
          >
            {manual ? "Pick from list" : "Type manually"}
          </button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {models.length > 0 && !manual ? (
        <select name="model" required className="w-full rounded border px-3 py-2">
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : (
        <Input name="model" placeholder="Model id (e.g. gpt-4o, claude-3-5-sonnet-latest)" required />
      )}

      <Button type="submit">Add key</Button>
    </form>
  );
}
