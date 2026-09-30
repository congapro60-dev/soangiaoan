/** Chữ và trạng thái hiển thị cho ba chế độ nguồn khoá — thuần, để trang "AI của tôi" chỉ việc vẽ. */
import type { AiKeyMode } from '../admin/aiKeyPolicy';

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
