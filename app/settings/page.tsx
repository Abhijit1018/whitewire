import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";
import { db } from "@/core/persistence/db";
import { listKeys } from "@/core/ai/keys.repo";
import { getSettings } from "@/core/ai/settings.repo";
import { syncCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { deleteKeyAction, setActiveKeyAction } from "./keys-actions";
import { RouteSelect } from "./route-select";
import { AddKeyForm } from "@/components/settings/add-key-form";

const ROLES: { role: string; hint: string }[] = [
  { role: "reasoning", hint: "Architect Assist" },
  { role: "code", hint: "Schema / API / ORM / ERD / UI" },
  { role: "docs", hint: "Documentation" },
];

export default async function Settings() {
  const ownerId = await syncCurrentUser();
  const [keys, settings] = await Promise.all([listKeys(db, ownerId), getSettings(db, ownerId)]);

  return (
    <div className="flex bg-surface-muted">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar breadcrumbs={[{ label: "Settings" }]} />
        <main className="flex-1 p-4 sm:p-8">
          <Card className="mb-8 max-w-xl p-6">
            <h2 className="mb-3 font-medium">API Keys (BYO-LLM)</h2>
            {keys.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">No keys yet. Add one below.</p>
            ) : (
              <ul className="mb-4 space-y-2">
                {keys.map((k) => (
                  <li key={k.id} className="flex items-center justify-between rounded-lg border border-border p-3">
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
                        <button className="text-sm text-destructive hover:underline" type="submit">Delete</button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <AddKeyForm />
          </Card>

          {keys.length > 0 && (
            <Card className="max-w-xl p-6">
              <h2 className="mb-1 font-medium">Model routing</h2>
              <p className="mb-3 text-sm text-muted-foreground">
                Use different models per task. Anything left on “Use active key” falls back to your
                active key.
              </p>
              <div className="space-y-2 rounded-lg border border-border p-4">
                {ROLES.map((r) => (
                  <div key={r.role}>
                    <RouteSelect
                      role={r.role}
                      current={settings.routes[r.role] ?? ""}
                      keys={keys.map((k) => ({ id: k.id, label: `${k.label} (${k.model})` }))}
                    />
                    <p className="ml-[7.5rem] text-xs text-muted-foreground">{r.hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
