/**
 * ĐƯỜNG RELAY GEMINI cho ví web — phần thuần (kiểm đầu vào, hằng số), không đụng Firebase/mạng.
 *
 * Vì sao có: soạn giáo án, nâng cấp, dự giờ, ra đề… gọi Gemini THẲNG từ trình duyệt bằng khoá của giáo viên, nên ví web
 * không trả được cho chúng. Chủ dự án chốt 2026-09-30: token mua trên web dùng cho MỌI tính năng AI. Đường này để
 * trình duyệt nhờ máy chủ gọi Gemini bằng khoá chung, trừ ví như các lượt chấm bài.
 *
 * Chỉ nhận model đã có giá trong `aiPricing.ts` — model chưa có giá sẽ bị tính 0đ, tức tặng miễn phí.
 */
import type { InlineImage } from './_grading-core.js';

/** Khớp `functions["api/ai-relay.ts"].maxDuration` trong vercel.json (có test khoá hai bên bằng nhau). */
export const RELAY_MAX_DURATION_S = 300;
/** Chừa ~30 giây cuối để ghi sổ và trả lời trước khi Vercel cắt hàm. */
export const RELAY_GEMINI_TIMEOUT_MS = (RELAY_MAX_DURATION_S - 30) * 1000;

export const RELAY_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.1-pro-preview'] as const;
export const RELAY_DEFAULT_MODEL = RELAY_MODELS[0];

/**
 * Hãng khác Gemini mà ví web trả được (chủ dự án chốt 2026-10-01: chỉ Claude và ChatGPT). Mỗi hãng chỉ nhận model đã có giá
 * trong `aiPricing.ts`; model đắt nhất (Claude Fable 5.1) cố ý để ngoài. Trùng `RELAY_VENDOR_MODEL_IDS` ở `src/lib/aiRelay.ts`
 * (có test khoá hai bên). Khoá của máy chủ nằm ở biến môi trường `RELAY_VENDOR_ENV`; chưa đặt biến thì hãng đó chưa bật.
 */
export const RELAY_VENDORS = ['claude', 'openai'] as const;
export type RelayVendor = (typeof RELAY_VENDORS)[number];
export type RelayProvider = 'gemini' | RelayVendor;
export const RELAY_VENDOR_MODELS: Record<RelayVendor, readonly string[]> = {
  claude: ['claude-sonnet-5-5', 'claude-haiku-4-5-20251001', 'claude-opus-5-5'],
  openai: ['gpt-6.1-sol', 'gpt-6-luna', 'gpt-6-astra'],
};
export const RELAY_VENDOR_ENV: Record<RelayVendor, string> = { claude: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY' };

/** Khoá của máy chủ cho hãng đó (null = chưa cấu hình → hãng đó chưa dùng được bằng ví). */
export const relayVendorKey = (vendor: RelayVendor, env: NodeJS.ProcessEnv = process.env): string | null => env[RELAY_VENDOR_ENV[vendor]]?.trim() || null;
/** Các hãng đã cấu hình khoá trên máy chủ — client chỉ chuyển sang ví cho những hãng này. */
export const enabledRelayVendors = (env: NodeJS.ProcessEnv = process.env): RelayVendor[] => RELAY_VENDORS.filter(vendor => relayVendorKey(vendor, env));

/** Trần đầu ra mỗi lượt: dưới ngưỡng 10 phút của Anthropic cho lời gọi không stream; bị cắt thì client tự xin viết tiếp. */
export const RELAY_VENDOR_MAX_OUTPUT_TOKENS: Record<RelayVendor, number> = { claude: 16_000, openai: 16_384 };

export const RELAY_TEMPERATURE = 0.1;
export const RELAY_MAX_OUTPUT_TOKENS = 65_536;

/**
 * Số lượt relay chạy CÙNG LÚC tối đa cho một giáo viên. Ví chỉ bị trừ SAU khi Google trả lời, nên các lượt chạy song song
 * cùng qua được kiểm số dư và có thể làm ví âm; giới hạn đồng thời chặn mức âm tối đa ≈ số lượt × giá một lượt lớn nhất.
 */
export const RELAY_MAX_INFLIGHT = 3;
/** Lượt "đang chạy" quá lâu (hàm bị giết, không kịp trả chỗ) thì coi như đã hết — sau một chu kỳ tối đa của hàm. */
export const RELAY_INFLIGHT_STALE_MS = (RELAY_MAX_DURATION_S + 10) * 1000;

export const RELAY_MAX_PROMPT_CHARS = 1_000_000;
export const RELAY_MAX_SYSTEM_CHARS = 8_000;
export const RELAY_MAX_IMAGES = 8;
/** Vercel từ chối thân request > 4,5MB trước khi tới hàm; chừa chỗ cho chữ. */
export const RELAY_MAX_IMAGE_BASE64_CHARS = 3_600_000;

/** Chặn vét khoá: số lượt relay tối đa mỗi giáo viên mỗi ngày (tiền vẫn do ví giới hạn). */
export const relayDailyLimit = (env: NodeJS.ProcessEnv = process.env): number => Number(env.AI_RELAY_DAILY_LIMIT) || 400;

export interface RelayRequest {
  provider: RelayProvider;
  model: string;
  prompt: string;
  system?: string;
  images: InlineImage[];
}

export type RelayParse = { ok: true; value: RelayRequest } | { ok: false; status: number; error: string };

const DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

export const parseRelayBody = (body: unknown): RelayParse => {
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  const provider = source.provider === undefined ? 'gemini' : source.provider;
  if (provider !== 'gemini' && !(RELAY_VENDORS as readonly string[]).includes(provider as string)) {
    return { ok: false, status: 400, error: 'Hãng AI này chưa dùng được bằng ví web.' };
  }
  const allowed: readonly string[] = provider === 'gemini' ? RELAY_MODELS : RELAY_VENDOR_MODELS[provider as RelayVendor];
  const model = source.model === undefined ? allowed[0] : source.model;
  if (typeof model !== 'string' || !allowed.includes(model)) {
    return { ok: false, status: 400, error: 'Model này chưa dùng được bằng ví web. Chọn một model có trong danh sách của ví web.' };
  }

  const prompt = source.prompt;
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > RELAY_MAX_PROMPT_CHARS) {
    return { ok: false, status: 400, error: 'Nội dung gửi đến AI không hợp lệ hoặc quá dài.' };
  }

  let system: string | undefined;
  if (source.system !== undefined) {
    if (typeof source.system !== 'string' || source.system.length > RELAY_MAX_SYSTEM_CHARS) {
      return { ok: false, status: 400, error: 'Chỉ dẫn hệ thống không hợp lệ hoặc quá dài.' };
    }
    system = source.system || undefined;
  }

  const rawImages = source.images === undefined ? [] : source.images;
  if (!Array.isArray(rawImages) || rawImages.length > RELAY_MAX_IMAGES) {
    return { ok: false, status: 400, error: `Chỉ gửi tối đa ${RELAY_MAX_IMAGES} ảnh mỗi lượt.` };
  }
  const images: InlineImage[] = [];
  let total = 0;
  for (const item of rawImages) {
    const match = typeof item === 'string' ? DATA_URL.exec(item) : null;
    if (!match) return { ok: false, status: 400, error: 'Ảnh gửi lên không đúng định dạng (chỉ nhận PNG, JPEG, WebP, GIF).' };
    total += match[2].length;
    if (total > RELAY_MAX_IMAGE_BASE64_CHARS) {
      return { ok: false, status: 413, error: 'Ảnh quá nặng để gửi qua ví web. Chụp gọn lại hoặc gửi ít ảnh hơn.' };
    }
    images.push({ mimeType: match[1], data: match[2] });
  }

  return { ok: true, value: { provider: provider as RelayProvider, model, prompt, ...(system ? { system } : {}), images } };
};
