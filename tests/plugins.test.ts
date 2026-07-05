import { describe, expect, it } from "vitest";
import { PLUGINS, getPlugin } from "@/core/plugins/registry";

const ctx = { center: { x: 100, y: 200 } };

describe("plugin registry", () => {
  it("has unique plugin ids", () => {
    const ids = PLUGINS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getPlugin resolves by id and returns undefined otherwise", () => {
    expect(getPlugin(PLUGINS[0].id)?.id).toBe(PLUGINS[0].id);
    expect(getPlugin("does-not-exist")).toBeUndefined();
  });

  it("every plugin produces at least one node", () => {
    for (const p of PLUGINS) {
      const { nodes } = p.run(ctx);
      expect(nodes.length).toBeGreaterThan(0);
    }
  });

  it("every node has a unique id and required data shape", () => {
    for (const p of PLUGINS) {
      const { nodes } = p.run(ctx);
      const ids = nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const n of nodes) {
        expect(typeof n.data.text).toBe("string");
        expect(n.data.text.length).toBeGreaterThan(0);
        expect(n.type).toBeTruthy();
      }
    }
  });

  it("every edge references node ids that exist in the same result", () => {
    for (const p of PLUGINS) {
      const { nodes, edges } = p.run(ctx);
      const ids = new Set(nodes.map((n) => n.id));
      for (const e of edges) {
        expect(ids.has(e.source)).toBe(true);
        expect(ids.has(e.target)).toBe(true);
      }
    }
  });

  it("nodes are positioned around the given center", () => {
    const { nodes } = PLUGINS[0].run({ center: { x: 1000, y: 1000 } });
    const near = nodes.some((n) => Math.abs(n.position.x - 1000) < 600);
    expect(near).toBe(true);
  });
});
