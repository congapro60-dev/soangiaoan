import { callGeminiAIRaw, callGeminiAIStream, DEFAULT_GEMINI_RUNTIME_MODEL, GEMINI_RUNTIME_MODELS } from './gemini';
import { estimateTokenCount, recordTokenUsage } from '../hooks/useTokenTracker';
import { CLAUDE_MODELS as TRACKER_CLAUDE_MODELS, DEEPSEEK_MODELS as TRACKER_DEEPSEEK_MODELS, GEMINI_MODELS as TRACKER_GEMINI_MODELS, GROK_MODELS as TRACKER_GROK_MODELS, OPENAI_MODELS as TRACKER_OPENAI_MODELS, NVIDIA_MODELS as TRACKER_NVIDIA_MODELS, toModelOption } from '../data/models';
import type { ApiProvider } from '../config/apiLimits';
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
  return model === 'deepseek-v4-pro' || model === 'deepseek-r1' ? DEEPSEEK_REASONER_MAX_TOKENS : DEEPSEEK_CHAT_MAX_TOKENS;
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

// --- Chính sách API key: người dùng BẮT BUỘC dùng key của riêng mình ---
// (Quyết định 2026-07-21: bỏ toàn bộ key dự phòng/relay. Giáo viên VÀ học sinh đều tự
// nhập key riêng — xem src/lib/adaptive/studentAiKey.ts cho phía cổng học sinh.)

const NO_KEY_MESSAGE =
  'Chưa có API key. Các tính năng AI cần API key của riêng bạn — vào Cài đặt, chọn nhà cung cấp và dán key (Gemini có key miễn phí tại aistudio.google.com/apikey).';

const MISSING_KEY_ERROR_NAME = 'MissingApiKeyError';

/** Nhận diện lỗi thiếu key để UI hiển thị nguyên văn hướng dẫn thay vì thông báo lỗi chung. */
export function isMissingApiKeyError(err: unknown): boolean {
  return err instanceof Error && err.name === MISSING_KEY_ERROR_NAME;
}

function assertOwnApiKey(settings: Settings): void {
  const provider = (settings.selectedProvider ?? 'gemini') as string;
  const message = provider === 'free-router'
    ? `Chế độ "Router Free" (key dùng chung) đã ngừng hỗ trợ. ${NO_KEY_MESSAGE}`
    : NO_KEY_MESSAGE;
  if (provider === 'free-router' || !getActiveApiKey(settings)) {
    const err = new Error(message);
    err.name = MISSING_KEY_ERROR_NAME;
    throw err;
  }
}

export const CLAUDE_MODELS = TRACKER_CLAUDE_MODELS.map(toModelOption);
export const OPENAI_MODELS = TRACKER_OPENAI_MODELS.map(toModelOption);
export const GROK_MODELS = TRACKER_GROK_MODELS.map(toModelOption);
export const DEEPSEEK_MODELS = TRACKER_DEEPSEEK_MODELS.map(toModelOption);
export const NVIDIA_MODELS = TRACKER_NVIDIA_MODELS.map(toModelOption);
const GEMINI_TAG_TRANSLATIONS: Record<string, string> = {
  'reasoning': 'suy luận',
  'vision': 'đọc ảnh',
  'coding': 'lập trình',
  'fast': 'siêu tốc',
  'cheap': 'tiết kiệm',
  '1M-ctx': '1M ngữ cảnh',
};

export const GEMINI_MODELS = TRACKER_GEMINI_MODELS.map(model => ({
  ...toModelOption(model),
  desc: [
    model.id === DEFAULT_GEMINI_RUNTIME_MODEL ? 'Mặc định runtime an toàn' : undefined,
    model.tags?.includes('generateContent') ? 'Viết bài' : 'Tracker/Preview',
    model.isPreview ? 'Bản thử nghiệm' : undefined,
    model.tags?.filter(tag => !['tracker', 'generateContent', 'preview'].includes(tag)).map(tag => GEMINI_TAG_TRANSLATIONS[tag] || tag).slice(0, 3).join(' · '),
  ].filter(Boolean).join(' · '),
}));

export function getActiveApiKey(settings: Settings): string {
  const provider = settings.selectedProvider ?? 'gemini';
  if (provider === 'claude') return settings.claudeApiKey || '';
  if (provider === 'openai') return settings.openaiApiKey || '';
  if (provider === 'grok') return settings.grokApiKey || '';
  if (provider === 'deepseek') return settings.deepseekApiKey || '';
  if (provider === 'nvidia') return settings.nvidiaApiKey || '';
  if (provider === 'openai-compatible') return settings.openaiCompatibleApiKey || '';
  // 'free-router' (đã ngừng hỗ trợ) rơi xuống đây → trả '' để mọi nơi coi là thiếu key.
  if ((provider as string) === 'free-router') return '';
  return settings.geminiApiKey || '';
}

const getActiveModelId = (provider: ApiProvider, settings: Settings, override?: string): string => {
  if (override) return override;
  if (provider === 'claude') return settings.selectedModel || CLAUDE_MODELS[0].id;
  if (provider === 'openai') return settings.selectedModel || OPENAI_MODELS[0].id;
  if (provider === 'grok') return settings.selectedModel || GROK_MODELS[0].id;
  if (provider === 'deepseek') return settings.selectedModel || DEEPSEEK_MODELS[0].id;
  if (provider === 'nvidia') return settings.selectedModel || NVIDIA_MODELS[0].id;
  if (provider === 'openai-compatible') return settings.openaiCompatibleModelId || 'claude-opus-4-7';
  const idx = GEMINI_RUNTIME_MODELS.indexOf(settings.selectedModel);
  return idx >= 0 ? GEMINI_RUNTIME_MODELS[idx] : DEFAULT_GEMINI_RUNTIME_MODEL;
};

const recordExactUsage = (
  provider: ApiProvider,
  model: string,
  usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
) => {
  recordTokenUsage({
    provider,
    model,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
  });
};

const recordEstimatedUsage = (provider: ApiProvider, model: string, prompt: string, output = '') => {
  recordTokenUsage({
    provider,
    model,
    promptTokens: estimateTokenCount(prompt),
    completionTokens: output ? estimateTokenCount(output) : 0,
  });
};

async function callAIOnce(prompt: string, settings: Settings): Promise<RawResult> {
  const provider = settings.selectedProvider ?? 'gemini';
  assertOwnApiKey(settings);

  try {
    if (provider === 'claude') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: settings.claudeApiKey, dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings);
      const msg = await client.messages.create({
        model,
        max_tokens: CLAUDE_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
      recordExactUsage(provider, model, {
        promptTokens: msg.usage?.input_tokens,
        completionTokens: msg.usage?.output_tokens,
      });
      return { text, truncated: msg.stop_reason === 'max_tokens' };
    }

    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const choice = res.choices[0];
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      });
      return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
    }

    if (provider === 'grok') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.grokApiKey, baseURL: 'https://api.x.ai/v1', dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: GROK_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const choice = res.choices[0];
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      });
      return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
    }

    if (provider === 'deepseek') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.deepseekApiKey, baseURL: 'https://api.deepseek.com', dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: deepseekMaxTokens(model),
        messages: [{ role: 'user', content: prompt }],
      });
      const choice = res.choices[0];
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      });
      return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
    }

    if (provider === 'nvidia') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.nvidiaApiKey, baseURL: 'https://integrate.api.nvidia.com/v1', dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const choice = res.choices[0];
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      });
      return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
    }

    if (provider === 'openai-compatible') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ 
        apiKey: settings.openaiCompatibleApiKey || 'sk-none', 
        baseURL: settings.openaiCompatibleBaseUrl || 'https://digishop-api.io.vn/v1',
        dangerouslyAllowBrowser: true 
      });
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      const choice = res.choices[0];
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      });
      return { text: choice?.message?.content ?? '', truncated: choice?.finish_reason === 'length' };
    }

    // default: gemini
    const idx = GEMINI_RUNTIME_MODELS.indexOf(settings.selectedModel);
    const model = idx >= 0 ? GEMINI_RUNTIME_MODELS[idx] : DEFAULT_GEMINI_RUNTIME_MODEL;

    const result = await callGeminiAIRaw(prompt, settings.geminiApiKey, idx >= 0 ? idx : 0);

    if (!result) {
      throw new Error('Gemini không trả về kết quả. Kiểm tra API key trong Cài đặt hoặc thử lại sau.');
    }

    if (result.usage) {
      recordExactUsage(provider, model, result.usage);
    } else {
      recordEstimatedUsage(provider, model, prompt, result.text || '');
    }
    return result;
  } catch (err) {
    console.error('[aiProviders] AI call failed:', err);
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
  assertOwnApiKey(settings);
  const urls = Array.isArray(imageDataUrls) ? imageDataUrls : [imageDataUrls];

  const parsedImages = urls.map(url => {
    const [header, base64Data] = url.split(',');
    const mimeType = (header.match(/data:([^;]+)/)?.[1] || 'image/jpeg') as
      'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    return { base64Data, mimeType, url };
  });

  try {
    if (provider === 'claude') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: settings.claudeApiKey, dangerouslyAllowBrowser: true });
      const imageBlocks = parsedImages.map(({ base64Data, mimeType }) => ({
        type: 'image' as const,
        source: { type: 'base64' as const, media_type: mimeType, data: base64Data },
      }));
      const model = getActiveModelId(provider, settings);
      const msg = await client.messages.create({
        model,
        max_tokens: CLAUDE_MAX_TOKENS,
        messages: [{
          role: 'user',
          content: [...imageBlocks, { type: 'text' as const, text: prompt }],
        }],
      });
      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      recordExactUsage(provider, model, {
        promptTokens: msg.usage?.input_tokens,
        completionTokens: msg.usage?.output_tokens,
      });
      return text;
    }

    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
      const imageBlocks = parsedImages.map(({ url }) => ({
        type: 'image_url' as const,
        image_url: { url },
      }));
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{
          role: 'user',
          content: [...imageBlocks, { type: 'text' as const, text: prompt }],
        }],
      });
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
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
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: GROK_MAX_TOKENS,
        messages: [{
          role: 'user',
          content: [...imageBlocks, { type: 'text' as const, text: prompt }],
        }],
      });
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      });
      return res.choices[0]?.message?.content ?? '';
    }

    if (provider === 'deepseek') {
      return callAI(prompt, settings);
    }

    if (provider === 'nvidia') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.nvidiaApiKey, baseURL: 'https://integrate.api.nvidia.com/v1', dangerouslyAllowBrowser: true });
      const imageBlocks = parsedImages.map(({ url }) => ({
        type: 'image_url' as const,
        image_url: { url },
      }));
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{
          role: 'user',
          content: [...imageBlocks, { type: 'text' as const, text: prompt }],
        }],
      });
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      });
      return res.choices[0]?.message?.content ?? '';
    }

    if (provider === 'openai-compatible') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ 
        apiKey: settings.openaiCompatibleApiKey || 'sk-none', 
        baseURL: settings.openaiCompatibleBaseUrl || 'https://digishop-api.io.vn/v1',
        dangerouslyAllowBrowser: true 
      });
      const imageBlocks = parsedImages.map(({ url }) => ({
        type: 'image_url' as const,
        image_url: { url },
      }));
      const model = getActiveModelId(provider, settings);
      const res = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{
          role: 'user',
          content: [...imageBlocks, { type: 'text' as const, text: prompt }],
        }],
      });
      recordExactUsage(provider, model, {
        promptTokens: res.usage?.prompt_tokens,
        completionTokens: res.usage?.completion_tokens,
        totalTokens: res.usage?.total_tokens,
      });
      return res.choices[0]?.message?.content ?? '';
    }

    // Gemini
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: settings.geminiApiKey, httpOptions: { apiVersion: 'v1beta' } });
    const idx = GEMINI_RUNTIME_MODELS.indexOf(settings.selectedModel);
    const modelName = idx >= 0 ? GEMINI_RUNTIME_MODELS[idx] : DEFAULT_GEMINI_RUNTIME_MODEL;
    
    const imageParts = parsedImages.map(({ base64Data, mimeType }) => ({
      inlineData: { data: base64Data, mimeType },
    }));

    const maxVisionRetries = 2;
    let visionRetryCount = 0;

    async function executeVisionCall(): Promise<string> {
      try {
        const result = await ai.models.generateContent({
          model: modelName,
          contents: [{ parts: [{ text: prompt }, ...imageParts] }],
          config: { temperature: 0.1, maxOutputTokens: 65536 },
        });
        const usageMetadata = (result as any)?.usageMetadata;
        const text = result.text || '';
        if (usageMetadata) {
          recordExactUsage(provider, modelName, {
            promptTokens: usageMetadata.promptTokenCount,
            completionTokens: usageMetadata.candidatesTokenCount,
            totalTokens: usageMetadata.totalTokenCount,
          });
        } else {
          recordEstimatedUsage(provider, modelName, prompt, text);
        }
        return text;
      } catch (error: any) {
        const msg = String(error?.message || '').toLowerCase();
        const isOverloaded = msg.includes('503') || msg.includes('high demand') || msg.includes('unavailable');
        
        if (isOverloaded && visionRetryCount < maxVisionRetries) {
          visionRetryCount++;
          await new Promise(r => setTimeout(r, 2000 * visionRetryCount));
          return executeVisionCall();
        }
        throw error;
      }
    }

    return executeVisionCall();
  } catch (err) {
    console.error('[aiProviders] Vision call failed:', err);
    throw err;
  }
}

export async function callAIStream(
  prompt: string,
  settings: Settings,
  onChunk: (chunk: string) => void,
  modelOverride?: string
): Promise<void> {
  const provider = settings.selectedProvider ?? 'gemini';
  assertOwnApiKey(settings);

  try {
    if (provider === 'claude') {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: settings.claudeApiKey, dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings, modelOverride);
      const stream = client.messages.stream({
        model,
        max_tokens: CLAUDE_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      });
      let output = '';
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          output += event.delta.text;
          onChunk(event.delta.text);
        }
      }
      recordEstimatedUsage(provider, model, prompt, output);
      return;
    }

    if (provider === 'openai') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.openaiApiKey, dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings, modelOverride);
      const stream = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      let output = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          output += text;
          onChunk(text);
        }
      }
      recordEstimatedUsage(provider, model, prompt, output);
      return;
    }

    if (provider === 'grok') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.grokApiKey, baseURL: 'https://api.x.ai/v1', dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings, modelOverride);
      const stream = await client.chat.completions.create({
        model,
        max_tokens: GROK_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      let output = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          output += text;
          onChunk(text);
        }
      }
      recordEstimatedUsage(provider, model, prompt, output);
      return;
    }

    if (provider === 'deepseek') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.deepseekApiKey, baseURL: 'https://api.deepseek.com', dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings, modelOverride);
      const stream = await client.chat.completions.create({
        model,
        max_tokens: deepseekMaxTokens(model),
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      let output = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          output += text;
          onChunk(text);
        }
      }
      recordEstimatedUsage(provider, model, prompt, output);
      return;
    }

    if (provider === 'nvidia') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ apiKey: settings.nvidiaApiKey, baseURL: 'https://integrate.api.nvidia.com/v1', dangerouslyAllowBrowser: true });
      const model = getActiveModelId(provider, settings, modelOverride);
      const stream = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      let output = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          output += text;
          onChunk(text);
        }
      }
      recordEstimatedUsage(provider, model, prompt, output);
      return;
    }

    if (provider === 'openai-compatible') {
      const OpenAI = (await import('openai')).default;
      const client = new OpenAI({ 
        apiKey: settings.openaiCompatibleApiKey || 'sk-none', 
        baseURL: settings.openaiCompatibleBaseUrl || 'https://digishop-api.io.vn/v1',
        dangerouslyAllowBrowser: true 
      });
      const model = getActiveModelId(provider, settings, modelOverride);
      const stream = await client.chat.completions.create({
        model,
        max_tokens: OPENAI_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      });
      let output = '';
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) {
          output += text;
          onChunk(text);
        }
      }
      recordEstimatedUsage(provider, model, prompt, output);
      return;
    }

    // default: gemini
    const idx = GEMINI_RUNTIME_MODELS.indexOf(settings.selectedModel);
    const model = getActiveModelId(provider, settings, modelOverride);
    let output = '';
    await callGeminiAIStream(prompt, settings.geminiApiKey, (chunk) => {
      output += chunk;
      onChunk(chunk);
    }, idx >= 0 ? idx : 0, modelOverride);
    recordEstimatedUsage(provider, model, prompt, output);
    return;
  } catch (err) {
    console.error('[aiProviders] Stream call failed:', err);
    throw err;
  }
}
