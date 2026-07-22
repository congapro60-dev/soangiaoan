import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GEMINI_RUNTIME_MODEL = 'gemini-3.6-flash';

// Runtime model list for Gemini generateContent on v1beta.
// Keep the exact API IDs here; display labels can be shorter in src/data/models.ts.
export const GEMINI_RUNTIME_MODELS = [
  DEFAULT_GEMINI_RUNTIME_MODEL,
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-3.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];

// Backward-compatible alias used by existing callers.
export const MODELS = GEMINI_RUNTIME_MODELS;

const GEMINI_MAX_OUTPUT_TOKENS = 65536;

const EXAM_FORMAT_SYSTEM_INSTRUCTION = `Bạn là chuyên gia soạn đề thi Toán THPT. BẮT BUỘC tuân thủ định dạng Markdown sau:
1. Trắc nghiệm: 4 đáp án trên 4 dòng, dùng list \`- **A.** \`, \`- **B.** \`...
2. Đúng/Sai: 4 ý a, b, c, d trên 4 dòng riêng biệt, dùng list \`- a) \`, \`- b) \`... Tuyệt đối không viết liền 1 dòng.
3. Trả lời ngắn: Mỗi câu cách nhau 1 dòng trống.
4. ĐÁP ÁN: BẮT BUỘC kẻ Bảng Markdown (Table) cho đáp án chi tiết.
5. Kí hiệu Toán: inline \`$ ... $\`, block \`$$ ... $$\`.
6. Kí hiệu tập hợp A giao B viết liền thành AB. Biến cố đối dùng gạch ngang trên đầu (vd: \\overline{B}).
7. Hình vẽ minh họa: 
   - Nếu sơ đồ tư duy/lưu đồ: Dùng \`\`\`mermaid.
   - Nếu hình học cơ bản: Dùng \`\`\`latex (TikZ) với các lệnh cơ bản (draw, node, fill). KHÔNG dùng các thư viện ngoài như tkz-euclide.
   - Nếu hình ảnh thực tế/phức tạp: TUYỆT ĐỐI KHÔNG viết code, chỉ viết Gợi ý ảnh bằng tiếng Anh trong blockquote \`> 🎨 Image Prompt: ...\`.`;

export interface GeminiCallResult {
  text: string;
  truncated: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export async function callGeminiAI(prompt: string, apiKey: string, modelIndex = 0): Promise<string | null> {
  const result = await callGeminiAIRaw(prompt, apiKey, modelIndex);
  return result ? result.text : null;
}

export async function callGeminiAIRaw(prompt: string, apiKey: string, modelIndex = 0): Promise<GeminiCallResult | null> {
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  const maxRetries = 2;
  let retryCount = 0;

  async function executeCall(idx: number): Promise<GeminiCallResult | null> {
    const modelName = idx >= 0 && idx < MODELS.length ? MODELS[idx] : MODELS[0];

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
          systemInstruction: EXAM_FORMAT_SYSTEM_INSTRUCTION,
        },
      });
      const finishReason = (response as any)?.candidates?.[0]?.finishReason;
      const usageMetadata = (response as any)?.usageMetadata;
      const truncated = finishReason === 'MAX_TOKENS';
      return {
        text: response.text || '',
        truncated,
        usage: usageMetadata ? {
          promptTokens: usageMetadata.promptTokenCount,
          completionTokens: usageMetadata.candidatesTokenCount,
          totalTokens: usageMetadata.totalTokenCount,
        } : undefined,
      };
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
  modelIndex = 0,
  modelOverride?: string
): Promise<void> {
  if (!apiKey) return;

  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
  const maxRetries = 2;
  let retryCount = 0;

  async function executeStream(idx: number): Promise<void> {
    const modelName = modelOverride ? modelOverride : (idx >= 0 && idx < MODELS.length ? MODELS[idx] : MODELS[0]);

    try {
      const result = await ai.models.generateContentStream({
        model: modelName,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
          systemInstruction: EXAM_FORMAT_SYSTEM_INSTRUCTION,
        },
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
