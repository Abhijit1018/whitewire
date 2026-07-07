export type CanvasTool =
  | "select" | "hand" | "rectangle" | "ellipse" | "diamond"
  | "arrow" | "line" | "pen" | "text" | "note" | "image" | "code"
  | "eraser" | "aiNode" | "frame";

export type ToolMeta = {
  tool: CanvasTool;
  label: string;
  shortcut: string | null;
  behavior: "mode" | "insert";
};

export const PHASE1_TOOLS: ToolMeta[] = [
  { tool: "select", label: "Select", shortcut: "v", behavior: "mode" },
  { tool: "hand", label: "Hand", shortcut: "h", behavior: "mode" },
  { tool: "pen", label: "Draw", shortcut: "p", behavior: "mode" },
  { tool: "text", label: "Text", shortcut: "t", behavior: "insert" },
  { tool: "note", label: "Note", shortcut: "n", behavior: "insert" },
  { tool: "aiNode", label: "AI node", shortcut: "i", behavior: "insert" },
];

const SHORTCUTS: Record<string, CanvasTool> = Object.fromEntries(
  PHASE1_TOOLS.filter((t) => t.shortcut).map((t) => [t.shortcut, t.tool]),
) as Record<string, CanvasTool>;

export function toolForShortcut(key: string): CanvasTool | null {
  if (key.length !== 1) return null;
  return SHORTCUTS[key.toLowerCase()] ?? null;
}
