export type ApiProvider = 'gemini' | 'claude' | 'openai' | 'grok' | 'deepseek';

export interface ApiModelLimit {
  provider: ApiProvider;
  model: string;
  displayName: string;
  rpm: number;
  rpd: number;
  tpm: number;
  tierNote?: string;
}

const PAID_TIER_NOTE = 'Hạn mức tham chiếu theo tài khoản Tier 1.';

export const API_MODEL_LIMITS: Record<string, ApiModelLimit> = {
  'gemini:gemini-3.5-flash': {
    provider: 'gemini',
    model: 'gemini-3.5-flash',
    displayName: 'Gemini 3.5 Flash',
    rpm: 15,
    rpd: 1500,
    tpm: 1_000_000,
  },
  'gemini:gemini-3-flash-preview': {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash Preview',
    rpm: 15,
    rpd: 1500,
    tpm: 1_000_000,
  },
  'gemini:gemini-3.1-pro': {
    provider: 'gemini',
    model: 'gemini-3.1-pro',
    displayName: 'Gemini 3.1 Pro',
    rpm: 2,
    rpd: 50,
    tpm: 32_000,
  },
  'gemini:gemini-3.1-pro-preview': {
    provider: 'gemini',
    model: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro Preview',
    rpm: 2,
    rpd: 50,
    tpm: 32_000,
  },
  'gemini:gemini-3.1-flash-lite-preview': {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite-preview',
    displayName: 'Gemini 3.1 Flash-Lite Preview',
    rpm: 15,
    rpd: 1500,
    tpm: 1_000_000,
  },
  'openai:gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    displayName: 'GPT-4o Mini',
    rpm: 500,
    rpd: 10_000,
    tpm: 200_000,
    tierNote: PAID_TIER_NOTE,
  },
  'openai:gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    rpm: 500,
    rpd: 10_000,
    tpm: 30_000,
    tierNote: PAID_TIER_NOTE,
  },
  'openai:gpt-4-turbo': {
    provider: 'openai',
    model: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    rpm: 500,
    rpd: 10_000,
    tpm: 30_000,
    tierNote: PAID_TIER_NOTE,
  },
  'claude:claude-haiku-4-5-20251001': {
    provider: 'claude',
    model: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    rpm: 5,
    rpd: 1000,
    tpm: 50_000,
    tierNote: PAID_TIER_NOTE,
  },
  'claude:claude-sonnet-4-7': {
    provider: 'claude',
    model: 'claude-sonnet-4-7',
    displayName: 'Claude Sonnet 4.7',
    rpm: 5,
    rpd: 1000,
    tpm: 20_000,
    tierNote: PAID_TIER_NOTE,
  },
  'claude:claude-opus-4-7': {
    provider: 'claude',
    model: 'claude-opus-4-7',
    displayName: 'Claude Opus 4.7',
    rpm: 5,
    rpd: 1000,
    tpm: 20_000,
    tierNote: PAID_TIER_NOTE,
  },
  'grok:grok-3-mini': {
    provider: 'grok',
    model: 'grok-3-mini',
    displayName: 'Grok 3 Mini',
    rpm: 100,
    rpd: 5000,
    tpm: 100_000,
    tierNote: PAID_TIER_NOTE,
  },
  'grok:grok-3': {
    provider: 'grok',
    model: 'grok-3',
    displayName: 'Grok 3',
    rpm: 30,
    rpd: 1000,
    tpm: 30_000,
    tierNote: PAID_TIER_NOTE,
  },
  'grok:grok-2-vision': {
    provider: 'grok',
    model: 'grok-2-vision',
    displayName: 'Grok 2 Vision',
    rpm: 30,
    rpd: 1000,
    tpm: 30_000,
    tierNote: PAID_TIER_NOTE,
  },
  'deepseek:deepseek-chat': {
    provider: 'deepseek',
    model: 'deepseek-chat',
    displayName: 'DeepSeek Chat',
    rpm: 100,
    rpd: 5000,
    tpm: 100_000,
    tierNote: PAID_TIER_NOTE,
  },
  'deepseek:deepseek-reasoner': {
    provider: 'deepseek',
    model: 'deepseek-reasoner',
    displayName: 'DeepSeek Reasoner',
    rpm: 100,
    rpd: 5000,
    tpm: 100_000,
    tierNote: PAID_TIER_NOTE,
  },
};

export const makeApiLimitKey = (provider: ApiProvider, model: string): string => `${provider}:${model}`;

export const getApiModelLimit = (provider: ApiProvider, model: string): ApiModelLimit | undefined => (
  API_MODEL_LIMITS[makeApiLimitKey(provider, model)]
);
