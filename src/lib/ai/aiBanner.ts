import type { AiKeyStatus } from './aiBillingApi';
import { vnd } from './statementPrintDoc';

export interface AiBannerMessage {
  text: string;
  /** Có việc đang bị chặn (bài chờ / hết tiền) — tô đậm hơn. */
  urgent: boolean;
}

/** Ví dưới mức này thì nhắc nạp thêm. */
export const LOW_BALANCE_VND = 20_000;

/**
 * Thông báo AI hiện khi giáo viên đăng nhập, hoặc null nếu không có gì phải làm.
 * Ví chỉ đáng nhắc khi nó thật sự bị trừ: thuộc nhóm dùng thẳng khoá chung, hoặc đã đồng ý dùng khoá chung.
 * Người chỉ dùng khoá riêng thì không bao giờ bị báo "hết tiền".
 */
export const aiBannerMessage = (status: AiKeyStatus): AiBannerMessage | null => {
  const blocked = status.blockedSubmissionIds.length;
  if (blocked > 0) return { text: `Có ${blocked} bài học sinh đang chờ chấm vì AI tạm dừng.`, urgent: true };
  if (!status.gateEnabled || status.exempt) return null;

  const ownKeyOk = status.hasKey && status.keyStatus === 'ok';
  if (!status.shared && !status.consent && !ownKeyOk) {
    return {
      text: status.hasKey
        ? 'Khoá Gemini riêng của thầy/cô đang không dùng được. Thay khoá khác, hoặc đồng ý dùng khoá của web (trừ ví theo mức dùng).'
        : 'Chấm bài, bài luyện bằng AI cần khoá: nhập khoá Gemini riêng (lấy miễn phí ở Google AI Studio), hoặc đồng ý dùng khoá của web (trừ ví theo mức dùng).',
      urgent: false,
    };
  }

  const walletUsed = status.shared || status.consent;
  if (!walletUsed || (status.activeVoucher?.percent ?? 0) >= 100) return null;
  if (status.balanceVnd <= 0) {
    return {
      text: ownKeyOk ? 'Ví AI đã hết tiền — khi khoá riêng hết lượt, AI sẽ tạm dừng.' : 'Ví AI đã hết tiền — chấm bài bằng AI sẽ tạm dừng.',
      urgent: true,
    };
  }
  if (status.balanceVnd < LOW_BALANCE_VND) return { text: `Ví AI còn ${vnd(status.balanceVnd)} — nên nạp thêm.`, urgent: false };
  return null;
};
