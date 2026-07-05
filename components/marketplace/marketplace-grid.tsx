"use client";

import { PLUGINS } from "@/core/plugins/registry";
import { useInstalledPlugins } from "./use-installed-plugins";

export function MarketplaceGrid() {
  const { isInstalled, install, uninstall, ids } = useInstalledPlugins();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {ids.length > 0
          ? `${ids.length} installed — run them from the Plugins menu on any canvas.`
          : "Install a plugin, then run it from the Plugins menu on any canvas."}
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLUGINS.map((p) => {
          const installed = isInstalled(p.id);
          return (
            <div
              key={p.id}
              className="flex flex-col rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-xl" aria-hidden>
                  {p.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {p.category} · {p.author}
                  </p>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-muted-foreground">{p.description}</p>
              <button
                type="button"
                onClick={() => (installed ? uninstall(p.id) : install(p.id))}
                className={`mt-4 rounded-md px-3 py-1.5 text-sm font-medium transition-all active:scale-95 ${
                  installed
                    ? "border border-border text-muted-foreground hover:bg-muted"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                {installed ? "Installed ✓ — Remove" : "Install"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
