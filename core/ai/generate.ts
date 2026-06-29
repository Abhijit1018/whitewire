import { generateText, type LanguageModel } from "ai";

export async function generateNode(model: LanguageModel, prompt: string): Promise<string> {
  const { text } = await generateText({ model, prompt });
  return text.trim();
}
