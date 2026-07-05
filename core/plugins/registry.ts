import type { Edge } from "@xyflow/react";
import type { AiNode } from "@/core/state/workspace-store";
import type { Plugin, PluginContext, PluginResult } from "./types";

const COL = 260;
const ROW = 170;

function node(text: string, x: number, y: number, kind = "generic"): AiNode {
  return {
    id: crypto.randomUUID(),
    type: "aiNode",
    position: { x, y },
    data: { text, kind, purpose: "", model: "" },
  };
}

/** Lay a flat list of labels into a grid centered on `center`. */
function grid(labels: string[], cols: number, ctx: PluginContext, kind = "generic"): AiNode[] {
  const rows = Math.ceil(labels.length / cols);
  const x0 = ctx.center.x - ((cols - 1) * COL) / 2;
  const y0 = ctx.center.y - ((rows - 1) * ROW) / 2;
  return labels.map((label, i) =>
    node(label, x0 + (i % cols) * COL, y0 + Math.floor(i / cols) * ROW, kind),
  );
}

function edge(source: string, target: string): Edge {
  return { id: crypto.randomUUID(), source, target };
}

export const PLUGINS: Plugin[] = [
  {
    id: "lean-canvas",
    name: "Lean Canvas",
    description: "The 9-block Lean Canvas for pitching a business model on one board.",
    category: "Framework",
    author: "WhiteWire",
    icon: "📋",
    run: (ctx) => ({
      nodes: grid(
        [
          "Problem",
          "Solution",
          "Unique Value Proposition",
          "Unfair Advantage",
          "Customer Segments",
          "Key Metrics",
          "Channels",
          "Cost Structure",
          "Revenue Streams",
        ],
        3,
        ctx,
        "framework",
      ),
      edges: [],
    }),
  },
  {
    id: "swot",
    name: "SWOT Analysis",
    description: "Strengths, Weaknesses, Opportunities, Threats — a 2×2 to size up an idea.",
    category: "Framework",
    author: "WhiteWire",
    icon: "🧭",
    run: (ctx) => ({
      nodes: grid(["Strengths", "Weaknesses", "Opportunities", "Threats"], 2, ctx, "framework"),
      edges: [],
    }),
  },
  {
    id: "flowchart-starter",
    name: "Flowchart Starter",
    description: "Start → Process → Decision → End, pre-connected. A blank flow to fill in.",
    category: "Diagram",
    author: "WhiteWire",
    icon: "🔀",
    run: (ctx): PluginResult => {
      const start = node("Start", ctx.center.x, ctx.center.y - ROW * 1.5, "event");
      const process = node("Process", ctx.center.x, ctx.center.y - ROW * 0.5, "process");
      const decision = node("Decision?", ctx.center.x, ctx.center.y + ROW * 0.5, "decision");
      const end = node("End", ctx.center.x, ctx.center.y + ROW * 1.5, "event");
      return {
        nodes: [start, process, decision, end],
        edges: [
          edge(start.id, process.id),
          edge(process.id, decision.id),
          edge(decision.id, end.id),
        ],
      };
    },
  },
  {
    id: "c4-context",
    name: "C4 Context Diagram",
    description: "A person, your system, and two external systems — the C4 level-1 skeleton.",
    category: "Diagram",
    author: "WhiteWire",
    icon: "🏛️",
    run: (ctx): PluginResult => {
      const person = node("User", ctx.center.x, ctx.center.y - ROW, "actor");
      const system = node("Your System", ctx.center.x, ctx.center.y, "system");
      const extA = node("External API", ctx.center.x - COL, ctx.center.y + ROW, "system");
      const extB = node("Database", ctx.center.x + COL, ctx.center.y + ROW, "system");
      return {
        nodes: [person, system, extA, extB],
        edges: [
          edge(person.id, system.id),
          edge(system.id, extA.id),
          edge(system.id, extB.id),
        ],
      };
    },
  },
  {
    id: "kanban",
    name: "Kanban Board",
    description: "Backlog · To Do · In Progress · Done column headers to plan work visually.",
    category: "Template",
    author: "WhiteWire",
    icon: "🗂️",
    run: (ctx) => ({
      nodes: grid(["Backlog", "To Do", "In Progress", "Done"], 4, ctx, "column"),
      edges: [],
    }),
  },
  {
    id: "user-story-map",
    name: "User Story Map",
    description: "An activity backbone with steps beneath — map a user journey into stories.",
    category: "Template",
    author: "WhiteWire",
    icon: "🗺️",
    run: (ctx): PluginResult => {
      const backbone = ["Discover", "Sign up", "Use core feature", "Get value"];
      const top = backbone.map((label, i) =>
        node(label, ctx.center.x + (i - 1.5) * COL, ctx.center.y - ROW, "activity"),
      );
      const details = top.flatMap((parent, i) => {
        const child = node(`${backbone[i]} — step`, parent.position.x, ctx.center.y + ROW, "story");
        return [child];
      });
      return {
        nodes: [...top, ...details],
        edges: top.map((p, i) => edge(p.id, details[i].id)),
      };
    },
  },
];

export function getPlugin(id: string): Plugin | undefined {
  return PLUGINS.find((p) => p.id === id);
}
