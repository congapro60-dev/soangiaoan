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

export const RELAY_TEMPERATURE = 0.1;
export const RELAY_MAX_OUTPUT_TOKENS = 65_536;

export const RELAY_MAX_PROMPT_CHARS = 1_000_000;
export const RELAY_MAX_SYSTEM_CHARS = 8_000;
export const RELAY_MAX_IMAGES = 8;
/** Vercel từ chối thân request > 4,5MB trước khi tới hàm; chừa chỗ cho chữ. */
export const RELAY_MAX_IMAGE_BASE64_CHARS = 3_600_000;

/** Chặn vét khoá: số lượt relay tối đa mỗi giáo viên mỗi ngày (tiền vẫn do ví giới hạn). */
export const relayDailyLimit = (env: NodeJS.ProcessEnv = process.env): number => Number(env.AI_RELAY_DAILY_LIMIT) || 400;

export interface RelayRequest {
  model: string;
  prompt: string;
  system?: string;
  images: InlineImage[];
}

export type RelayParse = { ok: true; value: RelayRequest } | { ok: false; status: number; error: string };

const DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/;

export const parseRelayBody = (body: unknown): RelayParse => {
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  const model = source.model === undefined ? RELAY_DEFAULT_MODEL : source.model;
  if (typeof model !== 'string' || !(RELAY_MODELS as readonly string[]).includes(model)) {
    return { ok: false, status: 400, error: 'Model này chưa dùng được bằng ví web. Chọn Gemini 3.8 Flash, 3.7 Flash hoặc 3.1 Pro.' };
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

  return { ok: true, value: { model, prompt, ...(system ? { system } : {}), images } };
};
