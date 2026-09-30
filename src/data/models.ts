import type { ApiProvider } from '../config/apiLimits';

export interface ProviderModel {
  id: string;
  name: string;
  contextWindow: number;
  rpdLimit: number;
  tpmLimit: number;
  rpmLimit: number;
  isFree?: boolean;
  isPreview?: boolean;
  isLatest?: boolean;
  tags?: string[];
}

export interface ProviderConfig {
  key: ApiProvider;
  label: string;
  baseUrl: string;
  models: ProviderModel[];
}

export const GEMINI_MODELS: ProviderModel[] = [
  // Ba con so gioi han duoi day CHUA XAC MINH cho 3.7/3.8 Flash — tam lay theo 3.6 Flash.
  // Chung chi dung de hien muc da dung trong Cai dat, khong anh huong luc goi API.
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 1_000_000, rpmLimit: 30, isLatest: true, tags: ['reasoning', 'vision', 'coding', 'flagship', 'tracker'] },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 1_000_000, rpmLimit: 30, tags: ['reasoning', 'vision', 'coding', 'tracker'] },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 1_000_000, rpmLimit: 30, tags: ['reasoning', 'vision', 'coding', 'tracker'] },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 1_000_000, rpmLimit: 30, tags: ['reasoning', 'vision', 'coding', 'tracker'] },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', contextWindow: 1_000_000, rpdLimit: 50, tpmLimit: 32_000, rpmLimit: 2, isPreview: true, tags: ['reasoning', 'vision', '1M-ctx', 'preview', 'tracker'] },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', contextWindow: 1_000_000, rpdLimit: 1_500, tpmLimit: 500_000, rpmLimit: 15, isPreview: true, tags: ['fast', 'vision', 'cheap', 'preview', 'tracker'] },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', contextWindow: 1_000_000, rpdLimit: 1_500, tpmLimit: 1_000_000, rpmLimit: 30, tags: ['fast', 'vision', 'cheap', 'tracker'] },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1_000_000, rpdLimit: 50, tpmLimit: 32_000, rpmLimit: 5, tags: ['reasoning', 'vision', 'coding', 'generateContent'] },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1_048_576, rpdLimit: 1_500, tpmLimit: 1_000_000, rpmLimit: 15, tags: ['fast', 'vision', 'cheap', 'generateContent'] },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', contextWindow: 1_048_576, rpdLimit: 1_500, tpmLimit: 1_000_000, rpmLimit: 30, tags: ['fast', 'cheap', 'generateContent'] },
];

// Danh sách model + giá tra ngày 2026-09-30 từ trang chính thức của từng hãng (giá trong `providerGuide.ts`).
// rpm/rpd/tpm của các hãng ngoài Google là mức THAM CHIẾU theo tài khoản mới, chưa xác minh từng model;
// chỉ dùng để hiện thanh "đã dùng" trong Cài đặt, không ảnh hưởng lúc gọi API.
// Model còn lưu trong cài đặt cũ nhưng không còn ở đây vẫn được gọi bình thường (id được dùng nguyên văn).
export const CLAUDE_MODELS: ProviderModel[] = [
  { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', contextWindow: 1_000_000, rpdLimit: 2_000, tpmLimit: 200_000, rpmLimit: 50, isLatest: true, tags: ['fast', 'reasoning', 'vision', 'coding', '1M-ctx'] },
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', contextWindow: 1_000_000, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 50, isLatest: true, tags: ['reasoning', 'vision', 'coding', 'flagship', '1M-ctx'] },
  { id: 'claude-fable-5-1', name: 'Claude Fable 5.1', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 100_000, rpmLimit: 50, isLatest: true, tags: ['reasoning', 'vision', 'premium', '1M-ctx'] },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextWindow: 200_000, rpdLimit: 5_000, tpmLimit: 400_000, rpmLimit: 50, tags: ['fast', 'vision', 'cheap'] },
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', contextWindow: 1_000_000, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 50, tags: ['legacy', 'reasoning', 'vision', 'coding', '1M-ctx'] },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 1_000_000, rpdLimit: 2_000, tpmLimit: 200_000, rpmLimit: 50, tags: ['legacy', 'fast', 'vision', 'coding', '1M-ctx'] },
];

export const OPENAI_MODELS: ProviderModel[] = [
  { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', contextWindow: 1_050_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 100, isLatest: true, tags: ['reasoning', 'vision', 'coding'] },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna', contextWindow: 1_050_000, rpdLimit: 2_000, tpmLimit: 500_000, rpmLimit: 500, isLatest: true, tags: ['fast', 'vision', 'cheap'] },
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', contextWindow: 1_050_000, rpdLimit: 200, tpmLimit: 100_000, rpmLimit: 50, isLatest: true, tags: ['reasoning', 'vision', 'coding', 'premium'] },
  { id: 'gpt-6-sol', name: 'GPT-6 Sol', contextWindow: 400_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 100, tags: ['reasoning', 'vision', 'coding'] },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', contextWindow: 200_000, rpdLimit: 2_000, tpmLimit: 200_000, rpmLimit: 500, tags: ['fast', 'vision', 'cheap'] },
  { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano', contextWindow: 200_000, rpdLimit: 5_000, tpmLimit: 500_000, rpmLimit: 1_000, tags: ['fast', 'cheap'] },
  { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 40_000, rpmLimit: 30, tags: ['legacy', 'coding', 'vision', '1M-ctx'] },
  { id: 'gpt-4.1-mini-2025-04-14', name: 'GPT-4.1 mini', contextWindow: 1_000_000, rpdLimit: 2_000, tpmLimit: 200_000, rpmLimit: 500, tags: ['legacy', 'fast', 'vision', 'cheap', '1M-ctx'] },
];

export const GROK_MODELS: ProviderModel[] = [
  { id: 'grok-4.3', name: 'Grok 4.3', contextWindow: 1_000_000, rpdLimit: 1_000, tpmLimit: 500_000, rpmLimit: 60, isLatest: true, tags: ['reasoning', 'vision', 'cheap', '1M-ctx'] },
  { id: 'grok-4.7', name: 'Grok 4.7', contextWindow: 500_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 30, isLatest: true, tags: ['reasoning', 'vision', 'flagship'] },
  { id: 'grok-4.6', name: 'Grok 4.6', contextWindow: 500_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 30, tags: ['reasoning', 'vision'] },
  { id: 'grok-4.5', name: 'Grok 4.5', contextWindow: 500_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 30, tags: ['reasoning', 'vision'] },
  { id: 'grok-4.20-0309-reasoning', name: 'Grok 4.20 (suy luận)', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 30, tags: ['reasoning', 'vision', '1M-ctx'] },
  { id: 'grok-4.20-0309-non-reasoning', name: 'Grok 4.20 (nhanh)', contextWindow: 1_000_000, rpdLimit: 1_000, tpmLimit: 500_000, rpmLimit: 60, tags: ['fast', 'vision', '1M-ctx'] },
  { id: 'grok-build-0.1', name: 'Grok Build 0.1', contextWindow: 256_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 30, tags: ['coding'] },
];

export const DEEPSEEK_MODELS: ProviderModel[] = [
  { id: 'deepseek-flash', name: 'DeepSeek Flash', contextWindow: 1_000_000, rpdLimit: 2_000, tpmLimit: 500_000, rpmLimit: 60, isLatest: true, tags: ['fast', 'coding', '1M-ctx', 'cheap'] },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 20, isLatest: true, tags: ['reasoning', 'coding', '1M-ctx'] },
];

// contextWindow 0 = chưa rõ (danh mục NVIDIA đổi liên tục) → không hiện dòng "Ngữ cảnh".
export const NVIDIA_MODELS: ProviderModel[] = [
  { id: 'moonshotai/kimi-k3', name: 'Kimi K3', contextWindow: 0, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 40, isLatest: true, tags: ['reasoning', 'coding'] },
  { id: 'z-ai/glm-5.3', name: 'GLM 5.3', contextWindow: 0, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 40, isLatest: true, tags: ['reasoning', 'coding'] },
  { id: 'deepseek-ai/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', contextWindow: 0, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 40, isLatest: true, tags: ['fast', 'coding'] },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', contextWindow: 128_000, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 60, tags: ['reasoning', 'coding', 'fast'] },
  { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron 4 340B', contextWindow: 4_096, rpdLimit: 500, tpmLimit: 40_000, rpmLimit: 30, tags: ['reasoning', 'coding'] },
];

export const PROVIDER_CONFIGS: ProviderConfig[] = [
  { key: 'gemini', label: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', models: GEMINI_MODELS },
  { key: 'claude', label: 'Anthropic Claude', baseUrl: 'https://api.anthropic.com/v1', models: CLAUDE_MODELS },
  { key: 'openai', label: 'OpenAI ChatGPT', baseUrl: 'https://api.openai.com/v1', models: OPENAI_MODELS },
  { key: 'grok', label: 'xAI Grok', baseUrl: 'https://api.x.ai/v1', models: GROK_MODELS },
  { key: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: DEEPSEEK_MODELS },
  { key: 'nvidia', label: 'NVIDIA NIM', baseUrl: 'https://integrate.api.nvidia.com/v1', models: NVIDIA_MODELS },
];

export const PROVIDER_CONFIG_MAP = Object.fromEntries(PROVIDER_CONFIGS.map(config => [config.key, config])) as Record<ApiProvider, ProviderConfig>;

export const getProviderModel = (provider: ApiProvider, modelId: string): ProviderModel | undefined => (
  PROVIDER_CONFIG_MAP[provider]?.models.find(model => model.id === modelId)
);

const TAG_TRANSLATIONS: Record<string, string> = {
  'reasoning': 'suy luận',
  'vision': 'đọc ảnh',
  'coding': 'lập trình',
  'flagship': 'cao cấp',
  'preview': 'thử nghiệm',
  'fast': 'siêu tốc',
  'cheap': 'tiết kiệm',
  'generateContent': 'viết bài',
  'premium': 'bản Pro',
  'legacy': 'bản cũ',
  'multimodal': 'đa phương tiện',
  'audio': 'âm thanh',
  'video': 'video',
  'search': 'tìm kiếm web',
  'math': 'toán học',
  'safety': 'an toàn',
  '1M-ctx': '1M ngữ cảnh',
  '2M-ctx': '2M ngữ cảnh'
};

export const toModelOption = (model: ProviderModel) => ({
  id: model.id,
  name: model.name,
  desc: [
    model.isLatest ? 'Mới nhất' : undefined,
    model.isPreview ? 'Bản thử nghiệm' : undefined,
    model.tags?.filter(tag => tag !== 'tracker').map(tag => TAG_TRANSLATIONS[tag] || tag).slice(0, 4).join(' · '),
    model.contextWindow > 0 ? `Ngữ cảnh: ${model.contextWindow.toLocaleString('vi-VN')} token` : undefined,
  ].filter(Boolean).join(' · '),
});
