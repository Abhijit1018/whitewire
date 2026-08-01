import { describe, expect, it } from "vitest";
import { buildWireframePrompt, parseWireframe, WIREFRAME_TYPES } from "@/core/ai/wireframe";

describe("buildWireframePrompt", () => {
  it("embeds the screen and asks for JSON elements", () => {
    const p = buildWireframePrompt("Login screen");
    expect(p).toContain("Login screen");
    expect(p.toLowerCase()).toContain("json");
    expect(p).toContain('"elements"');
  });
});

describe("parseWireframe", () => {
  it("parses title + elements and clamps coords", () => {
    const raw = JSON.stringify({
      title: "Login",
      elements: [{ type: "button", label: "Sign in", x: -5, y: 200, w: 30, h: 8 }],
    });
    const s = parseWireframe(raw);
    expect(s.title).toBe("Login");
    expect(s.elements[0]).toEqual({ type: "button", label: "Sign in", x: 0, y: 100, w: 30, h: 8 });
  });

  it("falls back unknown element types to text", () => {
    const s = parseWireframe('{"elements":[{"type":"blob","label":"x","x":1,"y":1,"w":5,"h":5}]}');
    expect(s.elements[0].type).toBe("text");
  });

  it("parses JSON inside fences", () => {
    const raw = '```json\n{"title":"T","elements":[{"type":"input","label":"Email","x":1,"y":1,"w":50,"h":6}]}\n```';
    expect(parseWireframe(raw).elements).toHaveLength(1);
  });

  it("returns empty for unparseable input", () => {
    expect(parseWireframe("nope")).toEqual({ title: "", elements: [] });
  });
});

describe("wireframe vocabulary", () => {
  it("covers the structure, content, control and people primitives", () => {
    for (const t of ["sidebar", "table", "chart", "search", "tabs", "pagination", "avatarRow", "modal"]) {
      expect(WIREFRAME_TYPES).toContain(t);
    }
  });

  it("keeps a camelCase type through a lowercase reply", () => {
    const s = parseWireframe('{"elements":[{"type":"avatarrow","label":"Team","x":1,"y":1,"w":9,"h":9}]}');
    expect(s.elements[0].type).toBe("avatarRow");
  });

  it("still falls back to text for a type the renderer does not know", () => {
    const s = parseWireframe('{"elements":[{"type":"carousel","label":"x","x":1,"y":1,"w":5,"h":5}]}');
    expect(s.elements[0].type).toBe("text");
  });
});

describe("wireframe device", () => {
  it("reads a named device", () => {
    expect(parseWireframe('{"device":"mobile","elements":[]}').device).toBe("mobile");
  });

  it("ignores a device it cannot draw", () => {
    expect(parseWireframe('{"device":"watch","elements":[]}').device).toBeUndefined();
  });

  it("leaves the device unset when the model omits it", () => {
    expect(parseWireframe('{"elements":[]}').device).toBeUndefined();
  });

  it("asks the model to choose one in the prompt", () => {
    expect(buildWireframePrompt("Login")).toContain("mobile");
  });
});
