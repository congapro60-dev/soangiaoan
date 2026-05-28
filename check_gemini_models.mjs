import { GoogleGenAI } from '@google/genai';

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.log('NO_KEY');
  process.exit(0);
}

const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
for (const apiVersion of ['v1beta', 'v1alpha']) {
  const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion } });
  for (const model of models) {
    try {
      const r = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: 'ping' }] }],
        config: { maxOutputTokens: 8 },
      });
      console.log(apiVersion, model, 'OK', (r.text || '').slice(0, 30));
    } catch (e) {
      console.log(apiVersion, model, 'ERR', String(e.message || e).slice(0, 180));
    }
  }
}
