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

  it("reads a diagram plan with its edges", () => {
    const raw = `{"mode":"diagram","nodes":[{"title":"API","kind":"component","note":"x"},{"title":"DB","kind":"entity","note":"y"}],"edges":[[0,1]]}`;
    const plan = parseSketchPlan(raw);
    if (plan?.mode !== "diagram") throw new Error("expected diagram");
    expect(plan.nodes.map((n) => n.title)).toEqual(["API", "DB"]);
    expect(plan.edges).toEqual([[0, 1]]);
  });

  it("tolerates prose wrapped around the JSON", () => {
    const raw = `Sure! Here you go:\n{"mode":"diagram","nodes":[{"title":"API","kind":"component","note":""}],"edges":[]}\nHope that helps.`;
    expect(parseSketchPlan(raw)?.mode).toBe("diagram");
  });

  it("falls back to a diagram when the mode is missing", () => {
    const raw = `{"nodes":[{"title":"API","kind":"component","note":""}],"edges":[]}`;
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
