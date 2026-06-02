import { PROVIDER_CONFIGS } from '../data/models';

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

const tierNoteFor = (provider: ApiProvider): string | undefined => {
  if (provider === 'gemini') return undefined;
  if (provider === 'deepseek') return 'Giới hạn ước tính — DeepSeek dùng dynamic throttling.';
  return 'Hạn mức tham chiếu theo tài khoản Tier 1.';
};

export const makeApiLimitKey = (provider: ApiProvider, model: string): string => `${provider}:${model}`;

export const API_MODEL_LIMITS: Record<string, ApiModelLimit> = Object.fromEntries(
  PROVIDER_CONFIGS.flatMap(providerConfig => providerConfig.models.map(model => [
    makeApiLimitKey(providerConfig.key, model.id),
    {
      provider: providerConfig.key,
      model: model.id,
      displayName: model.name,
      rpm: model.rpmLimit,
      rpd: model.rpdLimit,
      tpm: model.tpmLimit,
      tierNote: tierNoteFor(providerConfig.key),
    } satisfies ApiModelLimit,
  ]))
) as Record<string, ApiModelLimit>;

export const getApiModelLimit = (provider: ApiProvider, model: string): ApiModelLimit | undefined => (
  API_MODEL_LIMITS[makeApiLimitKey(provider, model)]
);
