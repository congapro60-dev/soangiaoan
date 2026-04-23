import { callGeminiAI, callGeminiAIStream, MODELS } from './gemini';
import type { AppData } from '../types';

type Settings = AppData['settings'];

// --- Fallback relay helpers (quota exhaustion) ---

function isQuotaError(error: any): boolean {
  const msg = String(error?.message || error || '');
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('Quota') ||
    msg.includes('rateLimitExceeded') ||
    msg.includes('INVALID_API_KEY') ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('expired') ||
    msg.includes('Invalid API key') ||
    msg.includes('invalid_api_key')
  );
}

async function callRelay(
  prompt: string,
  model: string,
  imageBase64?: string,
  imageMimeType?: string
): Promise<string> {
  const res = await fetch('/api/gemini-relay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, model, imageBase64, imageMimeType }),
  });
  if (!res.ok) throw new Error(`Relay unavailable (${res.status})`);
  const data = await res.json();
  return data.text || '';
}

export const CLAUDE_MODELS = [
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', desc: 'Mạnh nhất, suy luận chuyên sâu' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', desc: 'Cân bằng tốc độ & chất lượng (Default)' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', desc: 'Nhanh, tiết kiệm chi phí' },
];

export const OPENAI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', desc: 'Đa phương thức, mạnh nhất (Default)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', desc: 'Nhanh, tiết kiệm chi phí' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', desc: 'Hiệu suất cao, context dài' },
];

export const GROK_MODELS = [
  { id: 'grok-3', name: 'Grok 3', desc: 'Mạnh nhất của xAI, suy luận sâu (Default)' },
  { id: 'grok-3-mini', name: 'Grok 3 Mini', desc: 'Nhanh, tiết kiệm chi phí' },
  { id: 'grok-2-vision', name: 'Grok 2 Vision', desc: 'Hỗ trợ hình ảnh (vision)' },
];

export const DEEPSEEK_MODELS = [
  { id: 'deepseek-chat', name: 'DeepSeek V3 (Chat)', desc: 'Nhanh, đa năng (Default)' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoner)', desc: 'Suy luận chuyên sâu, chậm hơn' },
];

export const GEMINI_MODELS = [
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', desc: 'Nhanh, hiệu suất cao (Default)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Thông minh, suy luận đa tầng' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'Phiên bản ổn định, tốc độ tốt' },
];

export function getActiveApiKey(settings: Settings): string {
  const provider = settings.selectedProvider ?? 'gemini';
  if (provider === 'claude') return settings.claudeApiKey || '';
  if (provider === 'openai') return settings.openaiApiKey || '';
  if (provider === 'grok') return settings.grokApiKey || '';
  if (provider === 'deepseek') return settings.deepseekApiKey || '';
  return settings.geminiApiKey || '';
}

export async function callAI(prompt: string, settings: Settings): Promise<string> {
  const provider = settings.selectedProvider ?? 'gemini';
  const fallbackModel = MODELS[0];

  try {
    if (provider === 'claude') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: settings.claudeApiKey, dangerouslyAllowBrowser: true });
      const msg = await client.messages.create({
        model: settings.selectedModel || 'claude-sonnet-4-6',
        max_tokens: 8096,
        messages: [{ role: 'user', content: prompt }],
      });
      return msg.content[0].type === 'text' ? msg.content[0].text : '';
    }

    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
      const res = await client.chat.completions.create({
        model: settings.selectedModel || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content ?? '';
    }

    if (provider === 'grok') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.grokApiKey, baseURL: 'https://api.x.ai/v1', dangerouslyAllowBrowser: true });
      const res = await client.chat.completions.create({
        model: settings.selectedModel || 'grok-3',
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content ?? '';
    }

    if (provider === 'deepseek') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.deepseekApiKey, baseURL: 'https://api.deepseek.com', dangerouslyAllowBrowser: true });
      const res = await client.chat.completions.create({
        model: settings.selectedModel || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content ?? '';
    }

    // default: gemini
    const idx = MODELS.indexOf(settings.selectedModel);
    return (await callGeminiAI(prompt, settings.geminiApiKey, idx >= 0 ? idx : 0)) ?? '';
  } catch (err) {
    if (isQuotaError(err)) {
      return callRelay(prompt, fallbackModel);
    }
    throw err;
  }
}

/**
 * Gọi AI với ảnh đính kèm (multimodal / vision).
 * imageDataUrl: full data URL — data:image/jpeg;base64,...
 * Nếu provider không hỗ trợ vision, fallback về text-only.
 */
export async function callAIWithVision(
  prompt: string,
  imageDataUrl: string,
  settings: Settings
): Promise<string> {
  const provider = settings.selectedProvider ?? 'gemini';
  const [header, base64Data] = imageDataUrl.split(',');
  const mimeType = (header.match(/data:([^;]+)/)?.[1] || 'image/jpeg') as
    | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  const fallbackModel = MODELS[0];

  try {
  if (provider === 'claude') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: settings.claudeApiKey, dangerouslyAllowBrowser: true });
    const msg = await client.messages.create({
      model: settings.selectedModel || 'claude-sonnet-4-6',
      max_tokens: 8096,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Data } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    return msg.content[0].type === 'text' ? msg.content[0].text : '';
  }

  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
    const res = await client.chat.completions.create({
      model: settings.selectedModel || 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    return res.choices[0]?.message?.content ?? '';
  }

  if (provider === 'grok') {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: settings.grokApiKey, baseURL: 'https://api.x.ai/v1', dangerouslyAllowBrowser: true });
    const res = await client.chat.completions.create({
      model: settings.selectedModel || 'grok-2-vision',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageDataUrl } },
          { type: 'text', text: prompt },
        ],
      }],
    });
    return res.choices[0]?.message?.content ?? '';
  }

  if (provider === 'deepseek') {
    // DeepSeek không hỗ trợ vision — fallback về text-only
    return callAI(prompt, settings);
  }

  // Gemini
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
  const idx = MODELS.indexOf(settings.selectedModel);
  const modelName = idx >= 0 ? MODELS[idx] : MODELS[0];
  const result = await ai.models.generateContent({
    model: modelName,
    contents: [{ parts: [{ text: prompt }, { inlineData: { data: base64Data, mimeType } }] }],
    config: { temperature: 0.1, maxOutputTokens: 8192 },
  });
  return result.text || '';
  } catch (err) {
    if (isQuotaError(err)) {
      return callRelay(prompt, fallbackModel, base64Data, mimeType);
    }
    throw err;
  }
}

export async function callAIStream(
  prompt: string,
  settings: Settings,
  onChunk: (chunk: string) => void
): Promise<void> {
  const provider = settings.selectedProvider ?? 'gemini';
  const fallbackModel = MODELS[0];

  try {
    if (provider === 'claude') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: settings.claudeApiKey, dangerouslyAllowBrowser: true });
      const stream = client.messages.stream({
        model: settings.selectedModel || 'claude-sonnet-4-6',
        max_tokens: 8096,
        messages: [{ role: 'user', content: prompt }],
      });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          onChunk(event.delta.text);
        }
      }
      return;
    }

    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
      const stream = await client.chat.completions.create({
        model: settings.selectedModel || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) onChunk(text);
      }
      return;
    }

    if (provider === 'grok') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.grokApiKey, baseURL: 'https://api.x.ai/v1', dangerouslyAllowBrowser: true });
      const stream = await client.chat.completions.create({
        model: settings.selectedModel || 'grok-3',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) onChunk(text);
      }
      return;
    }

    if (provider === 'deepseek') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.deepseekApiKey, baseURL: 'https://api.deepseek.com', dangerouslyAllowBrowser: true });
      const stream = await client.chat.completions.create({
        model: settings.selectedModel || 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) onChunk(text);
      }
      return;
    }

    // default: gemini
    const idx = MODELS.indexOf(settings.selectedModel);
    return callGeminiAIStream(prompt, settings.geminiApiKey, onChunk, idx >= 0 ? idx : 0);
  } catch (err) {
    if (isQuotaError(err)) {
      // Relay không hỗ trợ streaming — lấy full text rồi deliver một lần
      const text = await callRelay(prompt, fallbackModel);
      onChunk(text);
      return;
    }
    throw err;
  }
}
