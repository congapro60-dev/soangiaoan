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
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 1_000_000, rpmLimit: 30, isLatest: true, tags: ['reasoning', 'vision', 'coding', 'flagship', 'tracker'] },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 1_000_000, rpmLimit: 30, tags: ['reasoning', 'vision', 'coding', 'tracker'] },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', contextWindow: 1_000_000, rpdLimit: 50, tpmLimit: 32_000, rpmLimit: 2, isPreview: true, tags: ['reasoning', 'vision', '1M-ctx', 'preview', 'tracker'] },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', contextWindow: 1_000_000, rpdLimit: 1_500, tpmLimit: 500_000, rpmLimit: 15, isPreview: true, tags: ['fast', 'vision', 'cheap', 'preview', 'tracker'] },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', contextWindow: 1_000_000, rpdLimit: 1_500, tpmLimit: 1_000_000, rpmLimit: 30, tags: ['fast', 'vision', 'cheap', 'tracker'] },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1_000_000, rpdLimit: 50, tpmLimit: 32_000, rpmLimit: 5, tags: ['reasoning', 'vision', 'coding', 'generateContent'] },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1_048_576, rpdLimit: 1_500, tpmLimit: 1_000_000, rpmLimit: 15, tags: ['fast', 'vision', 'cheap', 'generateContent'] },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', contextWindow: 1_048_576, rpdLimit: 1_500, tpmLimit: 1_000_000, rpmLimit: 30, tags: ['fast', 'cheap', 'generateContent'] },
];

export const CLAUDE_MODELS: ProviderModel[] = [
  { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', contextWindow: 1_000_000, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 50, isLatest: true, tags: ['reasoning', 'vision', 'coding', 'flagship', '1M-ctx'] },
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', contextWindow: 1_000_000, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 50, tags: ['reasoning', 'vision', 'coding', '1M-ctx'] },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', contextWindow: 1_000_000, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 50, tags: ['reasoning', 'vision', 'coding', '1M-ctx'] },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', contextWindow: 1_000_000, rpdLimit: 2_000, tpmLimit: 200_000, rpmLimit: 50, tags: ['fast', 'vision', 'coding', '1M-ctx'] },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', contextWindow: 200_000, rpdLimit: 5_000, tpmLimit: 400_000, rpmLimit: 50, tags: ['fast', 'vision', 'cheap'] },
];

export const OPENAI_MODELS: ProviderModel[] = [
  { id: 'gpt-5.5', name: 'GPT-5.5', contextWindow: 400_000, rpdLimit: 500, tpmLimit: 40_000, rpmLimit: 20, isLatest: true, tags: ['reasoning', 'vision', 'coding', 'flagship'] },
  { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro', contextWindow: 400_000, rpdLimit: 200, tpmLimit: 20_000, rpmLimit: 10, tags: ['reasoning', 'vision', 'coding', 'premium'] },
  { id: 'gpt-5.4-thinking', name: 'GPT-5.4 Thinking', contextWindow: 400_000, rpdLimit: 500, tpmLimit: 40_000, rpmLimit: 20, tags: ['reasoning', 'vision', 'coding'] },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 mini', contextWindow: 200_000, rpdLimit: 2_000, tpmLimit: 200_000, rpmLimit: 500, tags: ['fast', 'vision', 'cheap'] },
  { id: 'gpt-5.4-nano', name: 'GPT-5.4 nano', contextWindow: 200_000, rpdLimit: 5_000, tpmLimit: 500_000, rpmLimit: 1_000, tags: ['fast', 'cheap'] },
  { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 40_000, rpmLimit: 30, tags: ['coding', 'vision', '1M-ctx'] },
  { id: 'gpt-4.1-mini-2025-04-14', name: 'GPT-4.1 mini', contextWindow: 1_000_000, rpdLimit: 2_000, tpmLimit: 200_000, rpmLimit: 500, tags: ['fast', 'vision', 'cheap', '1M-ctx'] },
  { id: 'gpt-4.1-nano-2025-04-14', name: 'GPT-4.1 nano', contextWindow: 1_000_000, rpdLimit: 5_000, tpmLimit: 1_000_000, rpmLimit: 1_000, tags: ['fast', 'cheap', '1M-ctx'] },
  { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128_000, rpdLimit: 500, tpmLimit: 40_000, rpmLimit: 30, tags: ['vision', 'audio', 'multimodal'] },
  { id: 'o3-2025-04-16', name: 'o3', contextWindow: 200_000, rpdLimit: 200, tpmLimit: 40_000, rpmLimit: 20, tags: ['reasoning', 'vision'] },
  { id: 'o3-pro', name: 'o3-pro', contextWindow: 200_000, rpdLimit: 100, tpmLimit: 20_000, rpmLimit: 10, tags: ['reasoning', 'premium'] },
];

export const GROK_MODELS: ProviderModel[] = [
  { id: 'grok-4.3', name: 'Grok 4.3', contextWindow: 1_000_000, rpdLimit: 1_000, tpmLimit: 500_000, rpmLimit: 60, isLatest: true, tags: ['reasoning', 'vision', 'video', 'flagship'] },
  { id: 'grok-4.20', name: 'Grok 4.20', contextWindow: 2_000_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 30, tags: ['reasoning', 'vision', '2M-ctx'] },
  { id: 'grok-4-0709', name: 'Grok 4', contextWindow: 256_000, rpdLimit: 1_000, tpmLimit: 500_000, rpmLimit: 60, tags: ['reasoning', 'vision'] },
  { id: 'grok-3-beta', name: 'Grok 3 Beta', contextWindow: 131_000, rpdLimit: 2_000, tpmLimit: 500_000, rpmLimit: 60, tags: ['vision', 'search'] },
  { id: 'grok-3-mini-beta', name: 'Grok 3 Mini', contextWindow: 131_000, rpdLimit: 5_000, tpmLimit: 1_000_000, rpmLimit: 120, tags: ['fast', 'cheap'] },
];

export const DEEPSEEK_MODELS: ProviderModel[] = [
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', contextWindow: 1_000_000, rpdLimit: 2_000, tpmLimit: 500_000, rpmLimit: 60, isLatest: true, tags: ['fast', 'coding', '1M-ctx', 'cheap'] },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', contextWindow: 1_000_000, rpdLimit: 500, tpmLimit: 200_000, rpmLimit: 20, isLatest: true, tags: ['reasoning', 'coding', '1M-ctx'] },
  { id: 'deepseek-v3-2', name: 'DeepSeek V3.2', contextWindow: 128_000, rpdLimit: 2_000, tpmLimit: 500_000, rpmLimit: 60, tags: ['coding', 'fast'] },
  { id: 'deepseek-r1', name: 'DeepSeek R1', contextWindow: 128_000, rpdLimit: 1_000, tpmLimit: 200_000, rpmLimit: 30, tags: ['reasoning', 'math'] },
];

export const NVIDIA_MODELS: ProviderModel[] = [
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct', contextWindow: 128_000, rpdLimit: 1_000, tpmLimit: 100_000, rpmLimit: 60, isLatest: true, tags: ['reasoning', 'coding', 'fast'] },
  { id: 'nvidia/nemotron-4-340b-instruct', name: 'Nemotron 4 340B', contextWindow: 4_096, rpdLimit: 500, tpmLimit: 40_000, rpmLimit: 30, tags: ['reasoning', 'coding'] },
  { id: 'nvidia/nemotron-3.5-content-safety', name: 'Nemotron Content Safety', contextWindow: 8_192, rpdLimit: 1_000, tpmLimit: 40_000, rpmLimit: 60, tags: ['safety', 'fast'] },
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
    `Ngữ cảnh: ${model.contextWindow.toLocaleString('vi-VN')} token`,
  ].filter(Boolean).join(' · '),
});
