import { generateText, type LanguageModel } from "ai";

export async function generateNode(model: LanguageModel, prompt: string): Promise<string> {
  const { text } = await generateText({ model, prompt });
  return text.trim();
}

/** Sends a prompt plus an image (data URL) to a vision-capable model. */
export async function generateVision(
  model: LanguageModel,
  prompt: string,
  imageDataUrl: string,
): Promise<string> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", image: imageDataUrl },
        ],
      },
    ],
  });
  return text.trim();
}
