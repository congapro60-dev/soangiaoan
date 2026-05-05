import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  if (!geminiKey && !grokKey) {
    return res.status(503).json({ error: 'Fallback service unavailable' });
  }

  // Try Gemini first
  if (geminiKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      const parts: any[] = [{ text: prompt }];
      if (imageBase64 && imageMimeType) {
        parts.push({ inlineData: { data: imageBase64, mimeType: imageMimeType } });
      }

      const result = await ai.models.generateContent({
        model: typeof model === 'string' ? model : 'gemini-1.5-flash',
        contents: [{ parts }],
        config: { temperature: 0.1 },
      });

      return res.status(200).json({ text: result.text || '' });
    } catch (geminiErr: any) {
      const msg = String(geminiErr?.message || '');
      const isQuota = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota');
      // Only fall through to Grok on quota errors; hard errors bubble up
      if (!isQuota || !grokKey) {
        return res.status(500).json({ error: geminiErr.message || 'Gemini error' });
      }
      // Fall through to Grok below
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
    const deepseekKeys = (process.env.DEEPSEEK_FALLBACK_KEYS || '')
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);

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
