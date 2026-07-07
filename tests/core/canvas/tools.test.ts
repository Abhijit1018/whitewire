import { describe, expect, it } from "vitest";
import { PHASE1_TOOLS, toolForShortcut } from "@/core/canvas/tools";

describe("PHASE1_TOOLS", () => {
  it("includes only tools wired this phase (no arrow/line/image/code/eraser/frame yet)", () => {
    const tools = PHASE1_TOOLS.map((t) => t.tool);
    expect(tools).toEqual(["select", "hand", "pen", "text", "note", "aiNode"]);
  });

  it("marks select/hand/pen as modes and the rest as inserts", () => {
    const byTool = Object.fromEntries(PHASE1_TOOLS.map((t) => [t.tool, t.behavior]));
    expect(byTool.select).toBe("mode");
    expect(byTool.hand).toBe("mode");
    expect(byTool.pen).toBe("mode");
    expect(byTool.text).toBe("insert");
    expect(byTool.aiNode).toBe("insert");
  });
});

describe("toolForShortcut", () => {
  it("maps single letters to tools (case-insensitive)", () => {
    expect(toolForShortcut("v")).toBe("select");
    expect(toolForShortcut("p")).toBe("pen");
    expect(toolForShortcut("i")).toBe("aiNode");
  });

  it("no longer maps shape shortcuts in this phase", () => {
    expect(toolForShortcut("r")).toBeNull();
  });

  it("returns null for unmapped keys", () => {
    expect(toolForShortcut("z")).toBeNull();
    expect(toolForShortcut("Enter")).toBeNull();
  });
});
