import type { Edge } from "@xyflow/react";
import type { AiNode } from "@/core/state/workspace-store";

export type PluginResult = { nodes: AiNode[]; edges: Edge[] };

/** What the canvas hands a plugin when it runs (e.g. where to drop nodes). */
export type PluginContext = { center: { x: number; y: number } };

export type PluginCategory = "Template" | "Diagram" | "Framework";

/**
 * A WhiteWire plugin. MVP plugins are pure, first-party canvas generators —
 * they take a context and return nodes/edges to insert. No remote/third-party
 * code executes: that requires a sandbox + signed manifests, documented as the
 * next milestone in docs/plugins.md.
 */
export type Plugin = {
  id: string;
  name: string;
  description: string;
  category: PluginCategory;
  author: string;
  icon: string; // emoji
  run: (ctx: PluginContext) => PluginResult;
};
