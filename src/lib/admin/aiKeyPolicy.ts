/**
 * CHỌN KHOÁ AI cho một lượt gọi — thuần, dùng chung máy chủ + giao diện.
 *
 * Chủ dự án chốt (2026-09-24):
 *  - Nhóm (chủ dự án + các cô trong danh sách) dùng thẳng khoá chung, không cần khoá riêng hay bấm đồng ý
 *    (vẫn trừ ví, trừ chủ dự án).
 *  - Giáo viên khác dùng KHOÁ GEMINI RIÊNG. Khoá hết/hỏng hoặc chưa có khoá thì bị chặn — bài học sinh
 *    nằm chờ — trừ khi giáo viên đã ĐỒNG Ý dùng khoá chung và chịu tính tiền theo mức dùng.
 *  - Có khoá riêng thì luôn dùng khoá riêng trước — KỂ CẢ người trong nhóm (tự trả Google, không trừ ví);
 *    khoá chung chỉ là dự phòng: người trong nhóm tự chuyển, người ngoài nhóm phải đã đồng ý.
 *  - Chưa bật kiểm soát trong trang Quản trị thì ai cũng dùng khoá chung (hành vi trước đây).
 */

export type AiKeySource = 'shared' | 'own' | 'owner_consent';
export type AiKeyStatus = 'ok' | 'exhausted' | 'invalid';
/** 'consent_required' = tính năng chỉ chạy bằng khoá chung (vd GLM), khoá Gemini riêng không thay được. */
export type AiKeyBlockReason = 'no_key' | 'exhausted' | 'invalid' | 'consent_required' | 'cap_reached' | 'no_balance';

/** Khoá riêng bị Google báo hết hạn mức thì nghỉ chừng này rồi thử lại (429 có thể chỉ là quá tải theo phút). */
export const EXHAUSTED_COOLDOWN_MS = 60 * 60 * 1000;

export interface AiKeyPolicyInput {
  gateEnabled: boolean;
  isShared: boolean;
  ownKey: { status: AiKeyStatus; statusAt?: string } | null;
  consent: boolean;
  now?: number;
}

export type AiKeyDecision =
  | { use: 'shared' | 'own' | 'owner_consent' }
  | { use: 'blocked'; reason: AiKeyBlockReason };

/** Khoá riêng có dùng được lúc này không (đang "hết" nhưng đã qua thời gian nghỉ thì thử lại). */
export const ownKeyUsable = (own: AiKeyPolicyInput['ownKey'], now = Date.now()): boolean => {
  if (!own) return false;
  if (own.status === 'ok') return true;
  if (own.status === 'invalid') return false;
  const at = Date.parse(own.statusAt || '');
  return !Number.isFinite(at) || now - at >= EXHAUSTED_COOLDOWN_MS;
};

export const decideAiKey = ({ gateEnabled, isShared, ownKey, consent, now = Date.now() }: AiKeyPolicyInput): AiKeyDecision => {
  if (!gateEnabled) return { use: 'shared' };
  if (ownKeyUsable(ownKey, now)) return { use: 'own' };
  if (isShared) return { use: 'shared' };
  if (consent) return { use: 'owner_consent' };
  return { use: 'blocked', reason: ownKey ? (ownKey.status === 'invalid' ? 'invalid' : 'exhausted') : 'no_key' };
};

/**
 * Lỗi HTTP của Gemini có phải lỗi CỦA KHOÁ (hết hạn mức / khoá hỏng / chưa bật thanh toán) không.
 * Lỗi khác (503 quá tải, 500, payload sai) KHÔNG phải lỗi khoá — không được đẩy giáo viên sang trả tiền.
 */
export const classifyGeminiKeyFailure = (httpStatus: number, body: string): AiKeyStatus | null => {
  const text = String(body || '');
  if (httpStatus === 429) return 'exhausted';
  if (httpStatus === 403 && /RESOURCE_EXHAUSTED|quota/i.test(text)) return 'exhausted';
  if (httpStatus === 401) return 'invalid';
  if (httpStatus === 400 && /API_KEY_INVALID|API key not valid|API key expired/i.test(text)) return 'invalid';
  if (httpStatus === 403 && /PERMISSION_DENIED|billing|API_KEY|has not been used|disabled|SERVICE_DISABLED/i.test(text)) return 'invalid';
  return null;
};

/** Khoá Gemini (Google AI Studio) có dạng "AIza" + 35 ký tự. */
export const looksLikeGeminiKey = (value: string): boolean => /^AIza[0-9A-Za-z_-]{35}$/.test(value.trim());

export const maskKey = (key: string): string => (key.length >= 4 ? key.slice(-4) : '');

/** Câu giải thích cho giáo viên vì sao AI đang bị chặn. */
export const blockReasonText = (reason: AiKeyBlockReason): string => ({
  no_key: 'Tài khoản của thầy/cô chưa có khoá AI (Gemini) để chấm bài.',
  exhausted: 'Khoá AI (Gemini) của thầy/cô đã hết hạn mức hoặc hết tiền.',
  invalid: 'Khoá AI (Gemini) của thầy/cô không dùng được (sai khoá, bị khoá hoặc chưa bật thanh toán).',
  consent_required: 'Tính năng này chạy bằng khoá AI chung của web, cần thầy/cô đồng ý tính phí theo mức dùng (hoặc dùng khoá cá nhân trong Cài đặt).',
  cap_reached: 'Thầy/cô đã dùng hết trần chi tiêu AI tháng này do chính thầy/cô đặt. Nâng trần hoặc nhập khoá riêng để dùng tiếp.',
  no_balance: 'Số dư AI của thầy/cô đã hết. Nạp thêm bằng mã QR chuyển khoản, nhập mã giảm giá, hoặc dùng khoá Gemini riêng để dùng tiếp.',
}[reason]);

/** Trần tháng do giáo viên tự đặt (VNĐ). Không đặt / 0 = không giới hạn. */
export const capReached = (spentVnd: number, capVnd: number | null | undefined): boolean =>
  typeof capVnd === 'number' && capVnd > 0 && spentVnd >= capVnd;

/** Tiền VNĐ làm tròn tới đồng, dùng chung cho bộ đếm, trần và hoá đơn. */
export const usdToVndRounded = (usd: number, usdVnd: number): number => Math.round(usd * usdVnd);
