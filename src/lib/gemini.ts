import { GoogleGenAI } from "@google/genai";

export const MODELS = ['gemini-3-flash-preview', 'gemini-3-pro-preview', 'gemini-2.5-flash'];

export async function callGeminiAI(prompt: string, apiKey: string, modelIndex = 0): Promise<string | null> {
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const modelName = modelIndex >= 0 && modelIndex < MODELS.length ? MODELS[modelIndex] : MODELS[0];

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
      },
    });

    return response.text || '';
  } catch (error: any) {
    console.error(`Error with model ${modelName}:`, error);
    
    // Fallback cơ chế: tự động thử lại model kế tiếp
    if (modelIndex < MODELS.length - 1) {
      console.log(`Fallback: Đang chuyển từ ${modelName} sang model dự phòng ${MODELS[modelIndex + 1]}...`);
      return callGeminiAI(prompt, apiKey, modelIndex + 1);
    }
    
    throw new Error(error.message || JSON.stringify(error));
  }
}
