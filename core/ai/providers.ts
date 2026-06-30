import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export function buildModel(input: {
  provider: string;
  baseUrl: string | null;
  apiKey: string;
  model: string;
}): LanguageModel {
  switch (input.provider) {
    case "openai-compatible":
      return createOpenAICompatible({
        name: "byo",
        baseURL: input.baseUrl ?? "https://api.openai.com/v1",
        apiKey: input.apiKey,
      })(input.model);
    case "anthropic":
      return createAnthropic({ apiKey: input.apiKey })(input.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey: input.apiKey })(input.model);
    default:
      throw new Error(`Unknown provider: ${input.provider}`);
  }
}
