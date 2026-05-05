import { GoogleGenAI } from "@google/genai";

export const MODELS = ['gemini-3.1-flash', 'gemini-3.1-pro', 'gemini-3.0-flash'];

const GEMINI_MAX_OUTPUT_TOKENS = 65536;

export interface GeminiCallResult {
  text: string;
  truncated: boolean;
}

export async function callGeminiAI(prompt: string, apiKey: string, modelIndex = 0): Promise<string | null> {
  const result = await callGeminiAIRaw(prompt, apiKey, modelIndex);
  return result ? result.text : null;
}

export async function callGeminiAIRaw(prompt: string, apiKey: string, modelIndex = 0): Promise<GeminiCallResult | null> {
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const maxRetries = 2;
  let retryCount = 0;

  async function executeCall(idx: number): Promise<GeminiCallResult | null> {
    const modelName = idx >= 0 && idx < MODELS.length ? MODELS[idx] : MODELS[0];

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: { temperature: 0.1, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS },
      });
      const finishReason = (response as any)?.candidates?.[0]?.finishReason;
      const truncated = finishReason === 'MAX_TOKENS';
      return { text: response.text || '', truncated };
    } catch (error: any) {
      console.error(`Error with model ${modelName}:`, error);

      const isOverloaded = error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('UNAVAILABLE');

      if (isOverloaded && retryCount < maxRetries) {
        retryCount++;
        const delay = 3000 * retryCount;
        await new Promise(r => setTimeout(r, delay));
        return executeCall(idx);
      }

      if (idx < MODELS.length - 1) {
        return executeCall(idx + 1);
      }

      let friendlyMessage = error.message || JSON.stringify(error);
      if (isOverloaded) {
        friendlyMessage = "Hệ thống AI của Google đang quá tải (503). Thầy/cô vui lòng bấm 'Bắt đầu' lại sau 1-2 phút hoặc đổi Model khác trong phần Cài đặt.";
      }
      throw new Error(friendlyMessage);
    }
  }

  return executeCall(modelIndex);
}

export async function callGeminiAIStream(
  prompt: string,
  apiKey: string,
  onChunk: (chunk: string) => void,
  modelIndex = 0
): Promise<void> {
  if (!apiKey) return;

  const ai = new GoogleGenAI({ apiKey });
  const maxRetries = 2;
  let retryCount = 0;

  async function executeStream(idx: number): Promise<void> {
    const modelName = idx >= 0 && idx < MODELS.length ? MODELS[idx] : MODELS[0];

    try {
      const result = await ai.models.generateContentStream({
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: { temperature: 0.1, maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS },
      });

      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) onChunk(chunkText);
      }
    } catch (error: any) {
      console.error(`Stream error with model ${modelName}:`, error);

      const isOverloaded = error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('UNAVAILABLE');

      if (isOverloaded && retryCount < maxRetries) {
        retryCount++;
        await new Promise(r => setTimeout(r, 3000 * retryCount));
        return executeStream(idx);
      }

      if (idx < MODELS.length - 1) {
        return executeStream(idx + 1);
      }

      throw new Error(isOverloaded ? "Hệ thống AI đang quá tải. Vui lòng thử lại sau." : error.message);
    }
  }

  return executeStream(modelIndex);
}
