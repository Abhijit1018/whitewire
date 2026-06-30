import { Sidebar } from "@/components/app-shell/sidebar";
import { db } from "@/core/persistence/db";
import { listKeys } from "@/core/ai/keys.repo";
import { getSettings } from "@/core/ai/settings.repo";
import { syncCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addKeyAction, deleteKeyAction, setActiveKeyAction } from "./keys-actions";

export default async function Settings() {
  const ownerId = await syncCurrentUser();
  const [keys, settings] = await Promise.all([listKeys(db, ownerId), getSettings(db, ownerId)]);

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Settings</h1>

        <section className="mb-10 max-w-xl">
          <h2 className="mb-3 font-medium">API Keys (BYO-LLM)</h2>
          {keys.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">No keys yet. Add one below.</p>
          ) : (
            <ul className="mb-4 space-y-2">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <span className="font-medium">{k.label}</span>{" "}
                    <span className="text-sm text-muted-foreground">
                      ({k.provider} · {k.model}){settings.activeKeyId === k.id ? " · active" : ""}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {settings.activeKeyId !== k.id && (
                      <form action={setActiveKeyAction}>
                        <input type="hidden" name="id" value={k.id} />
                        <button className="text-sm underline" type="submit">Make active</button>
                      </form>
                    )}
                    <form action={deleteKeyAction}>
                      <input type="hidden" name="id" value={k.id} />
                      <button className="text-sm text-red-500" type="submit">Delete</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={addKeyAction} className="space-y-3 rounded border p-4">
            <h3 className="font-medium">Add a key</h3>
            <select name="provider" className="w-full rounded border px-3 py-2" defaultValue="openai-compatible">
              <option value="openai-compatible">OpenAI-compatible (OpenAI, Groq, OpenRouter, Ollama…)</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
            </select>
            <Input name="label" placeholder="Label (e.g. My OpenAI)" required />
            <Input name="baseUrl" placeholder="Base URL (openai-compatible only, default https://api.openai.com/v1)" />
            <Input name="model" placeholder="Model id (e.g. gpt-4o, claude-3-5-sonnet-latest, gemini-2.0-flash)" required />
            <Input name="apiKey" type="password" placeholder="API key" required />
            <Button type="submit">Add key</Button>
          </form>
        </section>
      </main>
    </div>
  );
}
