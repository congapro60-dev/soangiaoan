import { GoogleGenAI } from "@google/genai";

export const MODELS = ['gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'];

export async function callGeminiAI(prompt: string, apiKey: string, modelIndex = 0): Promise<string | null> {
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const maxRetries = 2;
  let retryCount = 0;

  async function executeCall(idx: number): Promise<string | null> {
    const modelName = idx >= 0 && idx < MODELS.length ? MODELS[idx] : MODELS[0];
    
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: { temperature: 0.1, maxOutputTokens: 8192 },
      });
      return response.text || '';
    } catch (error: any) {
      console.error(`Error with model ${modelName}:`, error);
      
      const isOverloaded = error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('UNAVAILABLE');
      
      if (isOverloaded && retryCount < maxRetries) {
        retryCount++;
        const delay = 3000 * retryCount;
        // retry overloaded model silently
        await new Promise(r => setTimeout(r, delay));
        return executeCall(idx);
      }

      // Fallback sang model tiếp theo nếu vẫn lỗi
      if (idx < MODELS.length - 1) {
        // fallback to next model silently
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
        config: { temperature: 0.1, maxOutputTokens: 8192 },
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
        // stream fallback to next model silently
        return executeStream(idx + 1);
      }
      
      throw new Error(isOverloaded ? "Hệ thống AI đang quá tải. Vui lòng thử lại sau." : error.message);
    }
  }

  return executeStream(modelIndex);
}
