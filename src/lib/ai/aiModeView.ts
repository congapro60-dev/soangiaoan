/** Chữ và trạng thái hiển thị cho ba chế độ nguồn khoá — thuần, để trang "AI của tôi" chỉ việc vẽ. */
import type { AiKeyMode } from '../admin/aiKeyPolicy';
import { GUIDE_USD_VND, lessonPlanCostVnd } from '../../data/providerGuide';
import { priceFor } from '../admin/aiPricing';

export interface AiModeOption {
  id: AiKeyMode;
  title: string;
  desc: string;
}

export const aiModeOptions = (exempt: boolean): AiModeOption[] => [
  { id: 'own', title: 'Chỉ khoá riêng', desc: 'Dùng khoá Gemini của thầy/cô, tự trả Google. Khoá hết hạn mức thì AI tạm dừng, không đụng tới ví.' },
  {
    id: 'wallet',
    title: 'Chỉ ví web',
    desc: exempt
      ? 'Dùng khoá của web. Tài khoản này không bị trừ ví.'
      : 'Dùng khoá của web, trừ ví theo giá Google. Bỏ qua khoá riêng. Ví hết thì AI tạm dừng.',
  },
  { id: 'both', title: 'Cả hai', desc: 'Khoá riêng chạy trước; khi khoá riêng hết hạn mức hoặc hỏng mới chuyển sang ví web.' },
];

export interface SourceState {
  label: string;
  active: boolean;
}

/** Trạng thái từng nguồn theo chế độ: nguồn bị tắt thì thẻ mờ đi nhưng vẫn sửa được. */
export const sourceStates = (mode: AiKeyMode): { own: SourceState; wallet: SourceState } => ({
  own: mode === 'wallet' ? { label: 'Tắt', active: false } : { label: mode === 'both' ? 'Ưu tiên 1' : 'Đang dùng', active: true },
  wallet: mode === 'own' ? { label: 'Tắt', active: false } : { label: mode === 'both' ? 'Dự phòng' : 'Đang dùng', active: true },
});

/** Chọn ví/cả hai lần đầu phải tích đồng ý tính phí (người trong nhóm dùng thẳng khoá chung nên không cần). */
export const needsConsent = (status: { shared: boolean; consent: boolean }, target: AiKeyMode): boolean =>
  target !== 'own' && !status.shared && !status.consent;

const VENDOR_NAME: Record<string, string> = { claude: 'Claude', openai: 'ChatGPT' };

/** Câu nói rõ ví web trả cho những hãng AI nào, tuỳ máy chủ đã bật hãng nào (Grok, DeepSeek… luôn dùng khoá riêng của hãng). */
export const walletScopeText = (relayVendors: readonly string[] | undefined): string => {
  const names = (relayVendors ?? []).map(id => VENDOR_NAME[id]).filter(Boolean);
  const base = 'Áp dụng cho mọi tính năng AI dùng Gemini: chấm bài, bài luyện, soạn giáo án, nâng cấp, dự giờ, ra đề…';
  const glm = ' GLM 5.2 (chọn ở Cài đặt) cũng chạy bằng khoá của web và trừ ví theo giá riêng.';
  if (names.length === 0) return `${base} Chọn hãng khác (Claude, ChatGPT, Grok, DeepSeek) ở Cài đặt thì vẫn dùng khoá của hãng đó, ví web không trả cho các hãng này.${glm}`;
  return `${base} ${names.join(' và ')} cũng dùng được ví web (không cần dán khoá, tính theo giá của hãng). Hãng khác ở Cài đặt (Grok, DeepSeek…) vẫn dùng khoá của hãng đó.${glm}`;
};

/** Nhắc ở Cài đặt khi Claude/ChatGPT có thể do ví web trả thay khoá riêng; null = không có gì để nhắc. */
export const vendorWalletHint = (provider: string, relayVendors: readonly string[] | undefined): string | null =>
  (relayVendors?.includes(provider)
    ? `Không có khoá ${VENDOR_NAME[provider]} riêng cũng dùng được: chọn "Chỉ ví web" hoặc "Cả hai" ở mục Chi phí AI để ví web trả thay, tính theo giá của hãng. Có khoá riêng ở đây thì "Cả hai" sẽ dùng khoá của thầy/cô trước.`
    : null);

const fmtVnd = (value: number): string => `${Math.round(value).toLocaleString('vi-VN')}đ`;

/**
 * Lời nhắc ở Cài đặt khi chọn GLM 5.2: chạy bằng khoá của web nên TRỪ VÍ (chủ dự án chốt giữ tính tiền, 2026-10-01).
 * `gatewayReady === false` thì nói thẳng là máy chủ chưa bật, thay vì để giáo viên thử rồi gặp lỗi cấu hình.
 */
export const glmWalletNotice = (gatewayReady: boolean | undefined, day: string = new Date().toISOString().slice(0, 10)): { text: string; warning: string | null } => {
  const price = priceFor('zai/glm-5.2', day);
  const perPlan = price ? lessonPlanCostVnd({ inUsd: price.input, outUsd: price.output }, GUIDE_USD_VND) : null;
  const priceText = price && perPlan !== null
    ? ` Giá Vercel AI Gateway: $${price.input} vào · $${price.output} ra mỗi 1 triệu token, khoảng ${fmtVnd(perPlan)} cho một giáo án.`
    : '';
  return {
    text: `GLM 5.2 chạy bằng khoá của web nên TRỪ VÍ theo mức dùng.${priceText} Cần đồng ý tính phí và còn số dư ở mục Chi phí AI; mỗi ngày có giới hạn số lượt; chỉ xử lý văn bản (không đọc ảnh/PDF). Thầy/cô không cần dán khoá.`,
    warning: gatewayReady === false ? 'Máy chủ chưa bật GLM 5.2 nên hiện chưa dùng được. Chọn Gemini, Claude hoặc ChatGPT.' : null,
  };
};
