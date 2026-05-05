import { callGeminiAIRaw, callGeminiAIStream, MODELS } from './gemini';
import type { AppData } from '../types';

type Settings = AppData['settings'];

// --- Token limits per provider (kịch trần model hỗ trợ) ---
const CLAUDE_MAX_TOKENS = 32768;
const OPENAI_MAX_TOKENS = 16384;
const GROK_MAX_TOKENS = 16384;
const DEEPSEEK_CHAT_MAX_TOKENS = 8192;       // hard cap của deepseek-chat (V3)
const DEEPSEEK_REASONER_MAX_TOKENS = 32768;  // deepseek-reasoner (R1) hỗ trợ tới 64K

// Số lần auto-continue tối đa khi output bị cắt (an toàn ngân sách)
const MAX_CONTINUATIONS = 3;

function deepseekMaxTokens(model: string | undefined): number {
  return model === 'deepseek-reasoner' ? DEEPSEEK_REASONER_MAX_TOKENS : DEEPSEEK_CHAT_MAX_TOKENS;
}

interface RawResult {
  text: string;
  truncated: boolean;  // true nếu API báo dừng do hết max_tokens
}

function buildContinuationPrompt(combined: string): string {
  // Lấy 800 ký tự cuối làm "neo" để model viết tiếp đúng văn phong/format.
  const tail = combined.slice(-800);
  return `BẠN VỪA TẠO MỘT NỘI DUNG DÀI NHƯNG BỊ CẮT GIỮA CHỪNG (do hết quota token).
NHIỆM VỤ: VIẾT TIẾP NGAY TỪ CHỖ KẾT THÚC — KHÔNG lặp lại, KHÔNG tóm tắt, KHÔNG mở đầu lại, KHÔNG đổi văn phong/format markdown.

ĐOẠN CUỐI CỦA NỘI DUNG ĐÃ VIẾT (giữ nguyên để bạn nối tiếp đúng vị trí):

---BẮT ĐẦU ĐOẠN TRƯỚC---
${tail}
---KẾT THÚC ĐOẠN TRƯỚC---

VIẾT TIẾP NGAY (không thêm dấu xuống dòng dư thừa, không lặp lại bất kỳ ký tự nào ở "đoạn trước" trên):`;
}

// --- Fallback relay helpers (quota exhaustion) ---

function isQuotaError(error: any): boolean {
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('ratelimitexceeded')
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
  if (!res.ok) {
    const msg = res.status === 503
      ? 'API key Gemini đã hết quota hoặc chưa cấu hình. Vui lòng kiểm tra cài đặt API key trong hồ sơ.'
      : `Relay lỗi (${res.status})`;
    throw new Error(msg);
  }
  const data = await res.json();
  return data.text || '';
}

export const CLAUDE_MODELS = [
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', desc: 'Mạnh nhất, suy luận chuyên sâu' },
  { id: 'claude-sonnet-4-7', name: 'Claude Sonnet 4.7', desc: 'Cân bằng tốc độ & chất lượng (Default)' },
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
  { id: 'gemini-3-flash-latest', name: 'Gemini 3 Flash', desc: 'Tốc độ cực nhanh, tối ưu chi phí (Default)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', desc: 'Suy luận toán học phức tạp, chuyên sâu' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite', desc: 'Phiên bản siêu nhẹ, độ trễ thấp' },
];

export function getActiveApiKey(settings: Settings): string {
  const provider = settings.selectedProvider ?? 'gemini';
  if (provider === 'claude') return settings.claudeApiKey || '';
  if (provider === 'openai') return settings.openaiApiKey || '';
  if (provider === 'grok') return settings.grokApiKey || '';
  if (provider === 'deepseek') return settings.deepseekApiKey || '';
  return settings.geminiApiKey || '';
}

async function callAIOnce(prompt: string, settings: Settings): Promise<RawResult> {
  const provider = settings.selectedProvider ?? 'gemini';
  const fallbackModel = MODELS[0];

  try {
    if (provider === 'claude') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: settings.claudeApiKey, dangerouslyAllowBrowser: true });
      const msg = await client.messages.create({
        model: settings.selectedModel || 'claude-sonnet-4-7',
        max_tokens: CLAUDE_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
      return { text, truncated: msg.stop_reason === 'max_tokens' };
    }

    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
      const res = await client.chat.completions.create({
        model: settings.selectedModel || 'gpt-4o',
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const choice = res.choices[0];
      return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
    }

    if (provider === 'grok') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.grokApiKey, baseURL: 'https://api.x.ai/v1', dangerouslyAllowBrowser: true });
      const res = await client.chat.completions.create({
        model: settings.selectedModel || 'grok-3',
        max_tokens: GROK_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const choice = res.choices[0];
      return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
    }

    if (provider === 'deepseek') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.deepseekApiKey, baseURL: 'https://api.deepseek.com', dangerouslyAllowBrowser: true });
      const model = settings.selectedModel || 'deepseek-chat';
      const res = await client.chat.completions.create({
        model,
        max_tokens: deepseekMaxTokens(model),
        messages: [{ role: 'user', content: prompt }],
      });
      const choice = res.choices[0];
      return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
    }

    // default: gemini
    const idx = MODELS.indexOf(settings.selectedModel);
    const result = await callGeminiAIRaw(prompt, settings.geminiApiKey, idx >= 0 ? idx : 0);
    return result ?? { text: '', truncated: false };
  } catch (err) {
    if (isQuotaError(err)) {
      const text = await callRelay(prompt, fallbackModel);
      return { text, truncated: false };  // relay không expose finish_reason
    }
    throw err;
  }
}

export async function callAI(prompt: string, settings: Settings): Promise<string> {
  let combined = '';
  let nextPrompt = prompt;

  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const { text, truncated } = await callAIOnce(nextPrompt, settings);
    combined += text;

    if (!truncated) return combined;

    if (i === MAX_CONTINUATIONS) {
      console.warn(`[callAI] Output vẫn bị cắt sau ${MAX_CONTINUATIONS} lần auto-continue — dừng để bảo vệ ngân sách token.`);
      return combined;
    }

    console.log(`[callAI] Output bị cắt — auto-continue lần ${i + 1}/${MAX_CONTINUATIONS}`);
    nextPrompt = buildContinuationPrompt(combined);
  }

  return combined;
}

/**
 * Gọi AI với ảnh đính kèm (multimodal / vision).
 * imageDataUrls: single data URL hoặc mảng data URL (multi-page PDF).
 * Nếu provider không hỗ trợ vision, fallback về text-only.
 */
export async function callAIWithVision(
  prompt: string,
  imageDataUrls: string | string[],
  settings: Settings
): Promise<string> {
  const provider = settings.selectedProvider ?? 'gemini';
  const urls = Array.isArray(imageDataUrls) ? imageDataUrls : [imageDataUrls];
  const parsedImages = urls.map(url => {
    const [header, base64Data] = url.split(',');
    const mimeType = (header.match(/data:([^;]+)/)?.[1] || 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    return { base64Data, mimeType, url };
  });
  const { base64Data: firstBase64, mimeType: firstMime } = parsedImages[0];
  const fallbackModel = MODELS[0];

  try {
  if (provider === 'claude') {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: settings.claudeApiKey, dangerouslyAllowBrowser: true });
    const imageBlocks = parsedImages.map(({ base64Data, mimeType }) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: mimeType, data: base64Data },
    }));
    const msg = await client.messages.create({
      model: settings.selectedModel || 'claude-sonnet-4-7',
      max_tokens: CLAUDE_MAX_TOKENS,
      messages: [{
        role: 'user',
        content: [...imageBlocks, { type: 'text' as const, text: prompt }],
      }],
    });
    return msg.content[0].type === 'text' ? msg.content[0].text : '';
  }

  if (provider === 'openai') {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
    const imageBlocks = parsedImages.map(({ url }) => ({
      type: 'image_url' as const,
      image_url: { url },
    }));
    const res = await client.chat.completions.create({
      model: settings.selectedModel || 'gpt-4o',
      max_tokens: OPENAI_MAX_TOKENS,
      messages: [{
        role: 'user',
        content: [...imageBlocks, { type: 'text' as const, text: prompt }],
      }],
    });
    return res.choices[0]?.message?.content ?? '';
  }

  if (provider === 'grok') {
    const OpenAI = (await import('openai')).default;
    const client = new OpenAI({ apiKey: settings.grokApiKey, baseURL: 'https://api.x.ai/v1', dangerouslyAllowBrowser: true });
    const imageBlocks = parsedImages.map(({ url }) => ({
      type: 'image_url' as const,
      image_url: { url },
    }));
    const res = await client.chat.completions.create({
      model: settings.selectedModel || 'grok-2-vision',
      max_tokens: GROK_MAX_TOKENS,
      messages: [{
        role: 'user',
        content: [...imageBlocks, { type: 'text' as const, text: prompt }],
      }],
    });
    return res.choices[0]?.message?.content ?? '';
  }

  if (provider === 'deepseek') {
    return callAI(prompt, settings);
  }

  // Gemini — hỗ trợ nhiều ảnh qua nhiều inlineData parts
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey });
  const idx = MODELS.indexOf(settings.selectedModel);
  const modelName = idx >= 0 ? MODELS[idx] : MODELS[0];
  const imageParts = parsedImages.map(({ base64Data, mimeType }) => ({
    inlineData: { data: base64Data, mimeType },
  }));
  const result = await ai.models.generateContent({
    model: modelName,
    contents: [{ parts: [{ text: prompt }, ...imageParts] }],
    config: { temperature: 0.1, maxOutputTokens: 65536 },
  });
  return result.text || '';
  } catch (err) {
    if (isQuotaError(err)) {
      return callRelay(prompt, fallbackModel, firstBase64, firstMime);
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
        model: settings.selectedModel || 'claude-sonnet-4-7',
        max_tokens: CLAUDE_MAX_TOKENS,
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
        max_tokens: OPENAI_MAX_TOKENS,
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
        max_tokens: GROK_MAX_TOKENS,
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
      const model = settings.selectedModel || 'deepseek-chat';
      const stream = await client.chat.completions.create({
        model,
        max_tokens: deepseekMaxTokens(model),
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
