/**
 * Chế độ "chờ hai nhịp" của giáo án Ban Toán, thay cho bảng con đã bị thay bằng máy
 * (quyết định thầy 2026-10-25).
 *
 * Nhịp 1: GV đọc câu hỏi, ô nhập KHOÁ — học sinh chỉ được nghĩ, chưa được gõ.
 * Nhịp 2: hết giờ chờ, ô MỞ — học sinh gõ và gửi.
 *
 * Vì sao phải khoá thật chứ không chỉ nhắc bằng lời: nếu ô mở sẵn, học sinh nhanh
 * gõ trước khi cả lớp kịp nghĩ, GV không còn đo được "cả lớp hiểu tới đâu" — đúng
 * thứ mà bảng con cho GV thấy.
 */

export type ThinkWindowPhase = 'idle' | 'thinking' | 'answering' | 'closed';

export interface ThinkWindowConfig {
  /** Số giây khoá ô (giáo án gốc dùng 10–15 giây tuỳ câu). */
  thinkSeconds: number;
  /** Khi true, không khoá ô — dùng cho câu thăm dò không cần suy nghĩ. */
  skip?: boolean;
}

export interface ThinkWindowState {
  phase: ThinkWindowPhase;
  /** Số giây chờ còn lại; 0 khi đã mở. */
  remainingSeconds: number;
  /** Ô nhập có nhận gõ không. */
  canAnswer: boolean;
  /** Nhãn hiện cho học sinh. */
  label: string;
}

export const DEFAULT_THINK_SECONDS = 10;

/**
 * `elapsedInRound` = số giây đã trôi kể từ lúc GV bật câu hỏi này.
 * Trả về trạng thái thuần, không đụng DOM — view tự vẽ theo `canAnswer`.
 */
export const getThinkWindowState = (config: ThinkWindowConfig, elapsedInRound: number): ThinkWindowState => {
  if (config.skip) {
    return { phase: 'answering', remainingSeconds: 0, canAnswer: true, label: 'Gửi đáp án' };
  }
  const think = Math.max(0, Math.floor(config.thinkSeconds || DEFAULT_THINK_SECONDS));
  const elapsed = Math.max(0, Math.floor(Number.isFinite(elapsedInRound) ? elapsedInRound : 0));
  if (elapsed < think) {
    const remaining = think - elapsed;
    return { phase: 'thinking', remainingSeconds: remaining, canAnswer: false, label: `Suy nghĩ ${remaining}s — chưa bấm gì` };
  }
  return { phase: 'answering', remainingSeconds: 0, canAnswer: true, label: 'Gửi đáp án' };
};

/**
 * GV bấm "Công bố" thì khoá lại để học sinh không sửa bài sau khi thấy kết quả.
 * Tách hàm riêng để Presenter và Student dùng cùng một luật.
 */
export const getLockedThinkWindow = (): ThinkWindowState => ({
  phase: 'closed', remainingSeconds: 0, canAnswer: false, label: 'Đã công bố — không sửa được nữa',
});
