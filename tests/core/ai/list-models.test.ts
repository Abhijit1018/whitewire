import { describe, it, expect, vi, afterEach } from "vitest";
import { listModels } from "@/core/ai/list-models";

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("listModels", () => {
  it("parses openai-compatible /models response", async () => {
    mockFetchOnce(200, { data: [{ id: "gpt-4o" }, { id: "gpt-4o-mini" }] });
    const models = await listModels({ provider: "openai-compatible", baseUrl: null, apiKey: "k" });
    expect(models).toEqual(["gpt-4o", "gpt-4o-mini"]);
  });

  it("parses anthropic /v1/models response", async () => {
    mockFetchOnce(200, { data: [{ id: "claude-3-5-sonnet-latest" }] });
    const models = await listModels({ provider: "anthropic", baseUrl: null, apiKey: "k" });
    expect(models).toContain("claude-3-5-sonnet-latest");
  });

  it("parses google models response and strips the models/ prefix", async () => {
    mockFetchOnce(200, {
      models: [
        { name: "models/gemini-2.0-flash", supportedGenerationMethods: ["generateContent"] },
        { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
      ],
    });
    const models = await listModels({ provider: "google", baseUrl: null, apiKey: "k" });
    expect(models).toEqual(["gemini-2.0-flash"]);
  });

  it("throws a safe error on a non-2xx response", async () => {
    mockFetchOnce(401, { error: "bad key" });
    await expect(
      listModels({ provider: "openai-compatible", baseUrl: null, apiKey: "bad" }),
    ).rejects.toThrow(/401/);
  });

  it("rejects an unknown provider", async () => {
    await expect(listModels({ provider: "nope", baseUrl: null, apiKey: "k" })).rejects.toThrow(
      /provider/i,
    );
  });
});
