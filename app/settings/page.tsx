import { Sidebar } from "@/components/app-shell/sidebar";

export default function Settings() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
        <section className="max-w-lg space-y-2">
          <h2 className="font-medium">API Keys (BYO-LLM)</h2>
          <p className="text-sm text-muted-foreground">
            Provider key management arrives in Phase 3.
          </p>
        </section>
      </main>
    </div>
  );
}
