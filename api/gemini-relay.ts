/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, model, imageBase64, imageMimeType } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  const geminiKey = process.env.GEMINI_FALLBACK_KEY;
  const grokKey = process.env.GROK_FALLBACK_KEY;
  const deepseekKeys = (process.env.DEEPSEEK_FALLBACK_KEYS || '')
    .split(',')
    .map((k: string) => k.trim())
    .filter(Boolean);

  if (!geminiKey && !grokKey && deepseekKeys.length === 0) {
    return res.status(503).json({ error: 'Fallback service unavailable' });
  }

  // Try Gemini first
  if (geminiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey, httpOptions: { apiVersion: 'v1beta' } });

      const parts: any[] = [{ text: prompt }];
      if (imageBase64 && imageMimeType) {
        parts.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });
      }

      const result = await ai.models.generateContent({
        model: typeof model === 'string' ? model : 'gemini-2.5-flash',
        contents: [{ parts }],
        config: { temperature: 0.1, systemInstruction: EXAM_FORMAT_SYSTEM_INSTRUCTION },
      });

      return res.status(200).json({ text: result.text || '' });
    } catch (geminiErr: any) {
      console.warn('[gemini-relay] Gemini fallback failed; trying secondary providers...', geminiErr?.message || geminiErr);
      // Fall through to Grok/DeepSeek for quota, wrong model id, auth/key issues, overload, etc.
    }
  }

  // Grok fallback (xAI — OpenAI-compatible)
  let grokFailed = false;
  if (grokKey) {
    try {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: grokKey, baseURL: 'https://api.x.ai/v1' });

      const content: any[] = [];
      if (imageBase64 && imageMimeType) {
        content.push({ type: 'image_url', image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } });
      }
      content.push({ type: 'text', text: prompt });

      const grokModel = imageBase64 ? 'grok-2-vision' : 'grok-3';
      const result = await client.chat.completions.create({
        model: grokModel,
        messages: [{ role: 'user', content }],
      });

      return res.status(200).json({ text: result.choices[0]?.message?.content || '' });
    } catch {
      grokFailed = true;
    }
  } else {
    grokFailed = true;
  }

  // DeepSeek pool fallback (text-only — no vision support)
  if (grokFailed && !imageBase64) {
    for (const dsKey of deepseekKeys) {
      try {
        const OpenAI = (await import('openai')).default;
        const client = new OpenAI({ apiKey: dsKey, baseURL: 'https://api.deepseek.com' });
        const result = await client.chat.completions.create({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
        });
        return res.status(200).json({ text: result.choices[0]?.message?.content || '' });
      } catch {
        // try next key
      }
    }
  }

  return res.status(500).json({ error: 'All fallback providers exhausted' });
}
