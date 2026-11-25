/**
 * TỰ XOAY KHOÁ RIÊNG — mọi hãng, không chỉ Gemini.
 *
 * - Cùng hãng: giáo viên dán nhiều khoá (mỗi tài khoản một khoá). Khoá hết hạn mức / sai / hết tiền nạp thì cho nghỉ và thử
 *   khoá kế (dùng chung bộ nhớ "khoá nghỉ" với Gemini, nhớ theo dấu vân tay đuôi khoá, không lưu khoá thật).
 * - Khác hãng (tuỳ chọn, mặc định TẮT): hết sạch khoá của hãng đang chọn thì chuyển sang hãng kế tiếp theo thứ tự giáo viên đặt,
 *   chỉ những hãng giáo viên CÓ khoá riêng. Model dùng ở hãng dự phòng: model đã chọn cho hãng đó, không thì model mặc định.
 *
 * Lỗi KHÔNG do khoá (quá tải 503, mạng, prompt sai) ném ra ngay — đổi khoá/hãng không giúp được gì.
 * Khoá chỉ nằm trong trình duyệt (xem settingsSecrets.ts).
 */
import type { AppData } from '../types';
import { DEFAULT_GEMINI_RUNTIME_MODEL } from './gemini';
import { geminiKeysOf, normalizeKeys, withGeminiKeys } from './geminiKeyRing';
import { isOwnKeyFailure } from './ai/aiModeStore';
import { PROVIDER_CONFIG_MAP } from '../data/models';

type Settings = AppData['settings'];

export type RotatableProvider = 'gemini' | 'claude' | 'openai' | 'grok' | 'deepseek' | 'nvidia' | 'vilao';
export const ROTATABLE_PROVIDERS: RotatableProvider[] = ['gemini', 'claude', 'openai', 'grok', 'deepseek', 'nvidia', 'vilao'];

type SingleKeyField = 'claudeApiKey' | 'openaiApiKey' | 'grokApiKey' | 'deepseekApiKey' | 'nvidiaApiKey' | 'vilaoApiKey';
export const SINGLE_KEY_FIELD: Record<Exclude<RotatableProvider, 'gemini'>, SingleKeyField> = {
  claude: 'claudeApiKey',
  openai: 'openaiApiKey',
  grok: 'grokApiKey',
  deepseek: 'deepseekApiKey',
  nvidia: 'nvidiaApiKey',
  vilao: 'vilaoApiKey',
};

const isRotatable = (provider: unknown): provider is RotatableProvider =>
  ROTATABLE_PROVIDERS.includes(provider as RotatableProvider);

/** Danh sách khoá riêng của một hãng: `ownApiKeys[hãng]` nếu có, không thì ô khoá đơn cũ. */
export const providerKeysOf = (provider: RotatableProvider, settings: Settings): string[] => {
  if (provider === 'gemini') return geminiKeysOf(settings);
  const list = normalizeKeys(settings.ownApiKeys?.[provider] ?? []);
  return list.length > 0 ? list : normalizeKeys([String(settings[SINGLE_KEY_FIELD[provider]] ?? '')]);
};

/** Model dùng khi chạy ở hãng `provider`: hãng đang chọn → model đang chọn; hãng dự phòng → model đã nhớ, không thì mặc định. */
export const modelForProvider = (provider: RotatableProvider, settings: Settings): string => {
  if (provider === settings.selectedProvider) return settings.selectedModel;
  const remembered = settings.keyRotation?.models?.[provider];
  if (remembered) return remembered;
  if (provider === 'gemini') return DEFAULT_GEMINI_RUNTIME_MODEL;
  return PROVIDER_CONFIG_MAP[provider]?.models[0]?.id ?? settings.selectedModel;
};

/** Thứ tự hãng sẽ thử: hãng đang chọn trước, rồi (nếu bật) các hãng có khoá riêng theo thứ tự giáo viên đặt. */
export const rotationPlan = (settings: Settings): RotatableProvider[] => {
  const selected = settings.selectedProvider;
  if (!isRotatable(selected)) return [];
  const plan: RotatableProvider[] = [selected];
  if (!settings.keyRotation?.crossProvider) return plan;
  const order = (settings.keyRotation.order ?? ROTATABLE_PROVIDERS).filter(isRotatable);
  for (const provider of [...order, ...ROTATABLE_PROVIDERS]) {
    if (plan.includes(provider)) continue;
    if (providerKeysOf(provider, settings).length > 0) plan.push(provider);
  }
  return plan;
};

/** Cài đặt để chạy MỘT lượt ở hãng `provider` với khoá `key` (Gemini tự xoay khoá bên trong nên không thay khoá). */
export const settingsForAttempt = (settings: Settings, provider: RotatableProvider, key?: string): Settings => {
  const next: Settings = { ...settings, selectedProvider: provider, selectedModel: modelForProvider(provider, settings) };
  if (key && provider !== 'gemini') next[SINGLE_KEY_FIELD[provider]] = key;
  return next;
};

const isMissingKey = (error: unknown): boolean => error instanceof Error && error.name === 'MissingApiKeyError';

/**
 * Chạy `run` qua khoá/hãng theo thứ tự. `canRotate` cho luồng chữ: đã hiện một phần kết quả thì không đổi nữa (tránh lặp).
 * Hãng đang chọn chưa có khoá riêng vẫn chạy như cũ (đường ví / báo thiếu khoá); thất bại thì mới sang hãng dự phòng.
 */
export async function withKeyRotation<T>(
  settings: Settings,
  run: (attempt: Settings) => Promise<T>,
  options: { canRotate?: () => boolean } = {},
): Promise<T> {
  const plan = rotationPlan(settings);
  if (plan.length === 0) return run(settings);
  let lastError: unknown;
  for (const [index, provider] of plan.entries()) {
    const keys = providerKeysOf(provider, settings);
    try {
      if (provider === 'gemini' || keys.length <= 1) {
        // Gemini: withGeminiKeys xoay khoá bên trong đường gọi. Một khoá / chưa có khoá: chạy thẳng như trước.
        return await run(index === 0 && keys.length === 0 ? settings : settingsForAttempt(settings, provider, keys[0]));
      }
      return await withGeminiKeys(keys, key => run(settingsForAttempt(settings, provider, key)), options);
    } catch (error) {
      lastError = error;
      const rotatable = isOwnKeyFailure(error) || (index === 0 && isMissingKey(error));
      if (!rotatable || options.canRotate?.() === false || index === plan.length - 1) throw error;
    }
  }
  throw lastError;
}
