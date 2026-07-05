# Plugins & the Marketplace

WhiteWire plugins extend the canvas. A plugin declares a manifest and a `run`
function that returns nodes/edges to insert.

```ts
// core/plugins/types.ts
export type Plugin = {
  id: string;
  name: string;
  description: string;
  category: "Template" | "Diagram" | "Framework";
  author: string;
  icon: string;                       // emoji
  run: (ctx: PluginContext) => PluginResult; // { nodes, edges }
};
```

## Current state (MVP)

- Plugins are **first-party and pure** — they take a `PluginContext` (where to
  drop nodes) and return a `PluginResult`. No network, no side effects, no
  third-party code executes.
- The catalog lives in `core/plugins/registry.ts`. Add a plugin by pushing a
  `Plugin` onto `PLUGINS`.
- Install state is per-browser (`localStorage`, `components/marketplace/use-installed-plugins.ts`).
- Installed plugins appear in the canvas **Plugins** menu; running one inserts
  its nodes/edges via the workspace store.

## Next milestone — third-party plugins

Running untrusted third-party code is the hard part and is **intentionally not
in the MVP**. The planned contract:

1. **Signed manifests** — a plugin is published as a manifest + a bundle hash;
   the registry verifies the signature before listing.
2. **Sandboxed execution** — plugin `run` executes in a Web Worker (or a
   `ShadowRealm` when broadly available) with **no DOM, no network, no
   `localStorage`** access. It receives a frozen, serializable context and
   returns a serializable `PluginResult` that the host validates against a
   schema before touching the store.
3. **Capability grants** — anything beyond "insert nodes" (e.g. calling the
   user's LLM key, reading the current graph) is an explicit, user-approved
   capability, brokered by the host — the plugin never sees a raw key.
4. **Server registry** — a `plugins` table + owner-scoped install records so
   installs sync across devices, replacing the localStorage MVP.

Until that lands, only the curated first-party catalog ships.
