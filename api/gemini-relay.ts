import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_FALLBACK_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Fallback service unavailable' });
  }

  const { prompt, model, imageBase64, imageMimeType } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [{ text: prompt }];
    if (imageBase64 && imageMimeType) {
      parts.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });
    }

    const result = await ai.models.generateContent({
      model: typeof model === 'string' ? model : 'gemini-3.1-flash-lite-preview',
      contents: [{ parts }],
      config: { temperature: 0.1 },
    });

    return res.status(200).json({ text: result.text || '' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
