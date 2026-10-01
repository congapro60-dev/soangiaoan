/**
 * Gọi Gemini QUA MÁY CHỦ để trừ ví web (đường `/api/ai-relay`) — dùng khi giáo viên chọn "chỉ ví web", hoặc "cả hai" mà
 * khoá riêng hết hạn mức. Trình duyệt không cần (và không có) khoá; máy chủ dùng khoá chung, ghi lượt, trừ ví, kiểm trần.
 * Bị chặn (chưa đồng ý tính phí, hết số dư, chạm trần) thì máy chủ trả 402 và `aiKeyGate` tự mở hộp nạp tiền rồi gửi lại.
 */
import { auth } from './firebase';

/** Trùng `RELAY_MODELS` ở `api/_ai-relay-core.ts` (có test khoá hai danh sách bằng nhau). */
export const RELAY_MODEL_IDS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.1-pro-preview'] as const;

/** Hãng khác Gemini mà ví web trả được + model nhận. Trùng `RELAY_VENDOR_MODELS` ở `api/_ai-relay-core.ts` (có test khoá hai bên). */
export const RELAY_VENDOR_MODEL_IDS = {
  claude: ['claude-sonnet-5-5', 'claude-haiku-4-5-20251001', 'claude-opus-5-5'],
  openai: ['gpt-6.1-sol', 'gpt-6-luna', 'gpt-6-astra'],
} as const;
export type RelayVendorId = keyof typeof RELAY_VENDOR_MODEL_IDS;

/** Model giáo viên đang chọn của hãng đó nếu ví trả được, không thì model "nên dùng" của hãng. */
export const relayVendorModelFor = (vendor: RelayVendorId, ...candidates: Array<string | undefined>): string =>
  candidates.find(model => model && (RELAY_VENDOR_MODEL_IDS[vendor] as readonly string[]).includes(model)) ?? RELAY_VENDOR_MODEL_IDS[vendor][0];

/** Model giáo viên đang chọn nếu ví trả được, không thì Gemini 3.8 Flash. */
export const relayModelFor = (...candidates: Array<string | undefined>): string =>
  candidates.find(model => model && (RELAY_MODEL_IDS as readonly string[]).includes(model)) ?? RELAY_MODEL_IDS[0];

export interface RelayResult {
  text: string;
  model: string;
  /** Bị cắt vì hết trần token — nơi gọi có thể xin viết tiếp. */
  truncated: boolean;
}

/** Thân request tối đa ~4,5MB trên Vercel: ảnh (base64) giữ dưới mức này. */
const IMAGE_BUDGET_CHARS = 3_400_000;
const TOO_HEAVY = 'Ảnh quá nặng để gửi qua ví web. Chụp gọn lại hoặc gửi ít ảnh hơn.';

const shrinkImage = (dataUrl: string, maxSide: number, quality: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => reject(new Error(TOO_HEAVY));
    image.src = dataUrl;
  });

const totalChars = (urls: readonly string[]): number => urls.reduce((sum, url) => sum + url.length, 0);

/** Nén dần (cạnh dài 1600 → 1280 → 1024px) cho tới khi lọt trần; vẫn quá nặng thì báo lỗi rõ ràng. */
export const fitImagesForRelay = async (urls: readonly string[]): Promise<string[]> => {
  if (totalChars(urls) <= IMAGE_BUDGET_CHARS) return [...urls];
  for (const [side, quality] of [[1600, 0.82], [1280, 0.7], [1024, 0.6]] as const) {
    const next = await Promise.all(urls.map(url => shrinkImage(url, side, quality)));
    if (totalChars(next) <= IMAGE_BUDGET_CHARS) return next;
  }
  throw new Error(TOO_HEAVY);
};

export const callAiRelay = async (input: { prompt: string; model: string; provider?: RelayVendorId; system?: string; images?: readonly string[] }): Promise<RelayResult> => {
  const user = auth.currentUser;
  if (!user || user.isAnonymous) throw new Error('Cần đăng nhập tài khoản giáo viên để dùng AI bằng ví web.');

  const images = input.images?.length ? await fitImagesForRelay(input.images) : [];
  const response = await fetch('/api/ai-relay', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(input.provider ? { provider: input.provider } : {}),
      model: input.model,
      prompt: input.prompt,
      ...(input.system ? { system: input.system } : {}),
      ...(images.length > 0 ? { images } : {}),
    }),
  });
  const payload = await response.json().catch(() => null) as { text?: unknown; model?: unknown; truncated?: unknown; error?: unknown } | null;
  if (!response.ok) throw new Error(typeof payload?.error === 'string' ? payload.error : `Máy chủ trả lỗi ${response.status}.`);
  if (typeof payload?.text !== 'string') throw new Error('AI không trả về nội dung. Thử lại sau ít phút.');
  return { text: payload.text, model: typeof payload.model === 'string' ? payload.model : input.model, truncated: payload.truncated === true };
};
