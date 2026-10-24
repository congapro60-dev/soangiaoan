/**
 * P-timer theo dải P của mẫu giáo án Ban Toán (P0 → P40).
 *
 * Vì sao tách riêng khỏi TvLiveView: dải P là khái niệm của giáo án in, còn
 * `getTvPacing` chỉ biết cue nào dài bao lâu. Gate D yêu cầu Presenter hiển thị
 * đúng "phút thứ P" để GV khớp với tờ giáo án trên tay, nên cần một lớp quy đổi
 * riêng và kiểm được bằng máy.
 */

/** Đệm cảnh báo theo contract timing của Gate D (chuẩn chung mục 4). */
export const P_TIMER_WARN_AT_MINUTE = 35;
export const P_TIMER_URGENT_AT_MINUTE = 38;

export type PTimerTone = 'normal' | 'warn' | 'urgent' | 'overrun';

export interface PTimerState {
  /** Phút đã trôi qua trong tiết, làm tròn xuống. Có thể > 40 nếu lố giờ. */
  minute: number;
  /** Giây lẻ trong phút hiện tại, 0–59. */
  second: number;
  /** Nhãn dải P đang chạy, ví dụ "P12". */
  band: string;
  tone: PTimerTone;
  /** Câu nhắc hiện trên V1; null = không nhắc gì. */
  notice: string | null;
  /** Số giây còn lại tới hết tiết; âm nghĩa là đã lố. */
  remainingSeconds: number;
}

const clampSeconds = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

/**
 * Quy đổi số giây đã trôi trong tiết thành trạng thái P-timer.
 * `slotMinutes` mặc định 40 theo khung Ban Toán; bài 35' hoặc 45' vẫn dùng được.
 */
export const getPTimerState = (elapsedSeconds: number, slotMinutes = 40): PTimerState => {
  const slot = slotMinutes > 0 ? slotMinutes : 40;
  const elapsed = clampSeconds(elapsedSeconds);
  const totalSeconds = slot * 60;
  const minute = Math.floor(elapsed / 60);
  const second = elapsed % 60;
  const band = `P${minute}`;
  const remainingSeconds = totalSeconds - elapsed;

  if (remainingSeconds < 0) {
    return { minute, second, band, tone: 'overrun', notice: `Đã lố ${Math.ceil(Math.abs(remainingSeconds) / 60)} phút — chốt ngay.`, remainingSeconds };
  }
  if (minute >= P_TIMER_URGENT_AT_MINUTE) {
    return { minute, second, band, tone: 'urgent', notice: 'SƠ KẾT — còn 2 phút.', remainingSeconds };
  }
  if (minute >= P_TIMER_WARN_AT_MINUTE) {
    const left = Math.ceil(remainingSeconds / 60);
    return { minute, second, band, tone: 'warn', notice: `Còn ${left} phút — chuẩn bị sơ kết.`, remainingSeconds };
  }
  return { minute, second, band, tone: 'normal', notice: null, remainingSeconds };
};

/** Nhãn "P12 · 12:34" cho V1. Giây vẫn hiện để GV canh nhịp ngắn (chờ hai nhịp 15s). */
export const formatPTimerLabel = (state: PTimerState): string => `${state.band} · ${state.minute}:${String(state.second).padStart(2, '0')}`;

/**
 * Dải P của một pha, suy từ lịch cue công khai. Dùng cho thanh tiến trình:
 * mỗi cue đã có `atSeconds`, chỉ cần đổi sang phút là ra dải P tương ứng.
 */
export const getPBandForOffset = (atSeconds: number): string => `P${Math.floor(clampSeconds(atSeconds) / 60)}`;
