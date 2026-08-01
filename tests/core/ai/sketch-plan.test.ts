import { describe, it, expect } from "vitest";
import { parseSketchPlan, buildSketchPlanPrompt } from "@/core/ai/sketch-plan";

describe("parseSketchPlan", () => {
  it("reads a wireframe plan", () => {
    const raw = `{"mode":"wireframe","title":"Login","elements":[{"type":"input","label":"Email","x":10,"y":30,"w":80,"h":8}]}`;
    const plan = parseSketchPlan(raw);
    expect(plan?.mode).toBe("wireframe");
    if (plan?.mode !== "wireframe") throw new Error("expected wireframe");
    expect(plan.spec.title).toBe("Login");
    expect(plan.spec.elements[0]).toMatchObject({ type: "input", label: "Email" });
  });

  it("reads a diagram plan as a scene with its edges", () => {
    const raw = `{"mode":"diagram","nodes":[{"id":"box1","title":"API"},{"id":"box2","type":"table","title":"DB"}],"edges":[{"from":"box1","to":"box2","label":"reads"}]}`;
    const plan = parseSketchPlan(raw);
    if (plan?.mode !== "diagram") throw new Error("expected diagram");
    expect(plan.scene.nodes.map((n) => n.title)).toEqual(["API", "DB"]);
    // A drawn database becomes a real table node, not another concept box.
    expect(plan.scene.nodes[1].type).toBe("table");
    expect(plan.scene.edges[0]).toMatchObject({ from: "box1", to: "box2", label: "reads" });
  });

  it("keeps the shape ids so positions line up with the drawing", () => {
    const raw = `{"mode":"diagram","nodes":[{"id":"box1","title":"A"},{"id":"box2","title":"B"}],"edges":[]}`;
    const plan = parseSketchPlan(raw);
    if (plan?.mode !== "diagram") throw new Error("expected diagram");
    expect(plan.scene.nodes.map((n) => n.id)).toEqual(["box1", "box2"]);
  });

  it("tolerates prose wrapped around the JSON", () => {
    const raw = `Sure! Here you go:\n{"mode":"diagram","nodes":[{"title":"API","kind":"component","note":""}],"edges":[]}\nHope that helps.`;
    expect(parseSketchPlan(raw)?.mode).toBe("diagram");
  });

  it("falls back to a diagram when the mode is missing", () => {
    const raw = `{"nodes":[{"id":"a","title":"API"}],"edges":[]}`;
    expect(parseSketchPlan(raw)?.mode).toBe("diagram");
  });

  it("returns null for a wireframe with no elements", () => {
    expect(parseSketchPlan(`{"mode":"wireframe","title":"Empty","elements":[]}`)).toBeNull();
  });

  it("returns null when there is no JSON at all", () => {
    expect(parseSketchPlan("I could not read that sketch.")).toBeNull();
  });
});

describe("buildSketchPlanPrompt", () => {
  it("carries the geometry through and asks for a mode", () => {
    const prompt = buildSketchPlanPrompt("Shapes:\n- box1: rectangle at (0,0) size 10x10");
    expect(prompt).toContain("box1: rectangle at (0,0) size 10x10");
    expect(prompt).toContain('mode "wireframe"');
    expect(prompt).toContain('mode "diagram"');
  });

  it("tells the model OCR labels may be imperfect", () => {
    expect(buildSketchPlanPrompt("x")).toContain("OCR");
  });
});
