/**
 * Quy điểm học tập (thang 10) → mức đánh giá LO của SSM (TDS "Thang4_26-27").
 * Thuần, không gọi mạng, không đụng SSM. Chỉ là phần TÍNH — việc điền vào file Excel và tải lên SSM
 * do giáo viên tự làm bằng nút xuất/nhập của chính SSM.
 *
 * Thang SSM đọc trực tiếp từ `scoring_scale` của bài đánh giá (2026-09-24):
 *   N (chưa đánh giá) · 4 · 3.5 · 3 · 2.5 · 2 · 1.5 · 1 · 0
 * Lưu ý: thang NHẢY từ 1 thẳng xuống 0 — KHÔNG có mức 0,5.
 * Quy đổi (chủ dự án chốt 2026-09-24): điểm/2,5 rồi khớp mức gần nhất CÓ THẬT trong thang.
 *   8,0 → 3 · 9,0 → 3.5 · 10 → 4 · 0 → 0.
 */

/** Các mức số của thang 4 (không kể "N"), giảm dần — đúng thứ tự SSM hiển thị. */
export const SSM_SCALE_4 = [4, 3.5, 3, 2.5, 2, 1.5, 1, 0] as const;

/** Ô điểm LO: một mức số trong thang, hoặc "N" khi chưa đủ căn cứ để chấm. */
export type LoMark = (typeof SSM_SCALE_4)[number] | 'N';

const DIVISOR = 2.5;

/**
 * Điểm thang 10 → mức thang 4. `null`/ngoài [0,10] → "N" (chưa có căn cứ, đúng nghĩa "chưa đánh giá").
 * Điểm hợp lệ LUÔN ra một mức số: chia 2,5 rồi lấy mức gần nhất trong thang; hoà thì lấy mức CAO hơn.
 */
export const toScale4 = (scoreOutOf10: number | null | undefined): LoMark => {
  if (typeof scoreOutOf10 !== 'number' || !Number.isFinite(scoreOutOf10)) return 'N';
  if (scoreOutOf10 < 0 || scoreOutOf10 > 10) return 'N';
  const raw = scoreOutOf10 / DIVISOR;
  // Thang xếp giảm dần; duyệt từ cao xuống, hoà (chênh bằng nhau) giữ mức cao đang xét trước.
  let best = SSM_SCALE_4[0];
  let bestGap = Math.abs(SSM_SCALE_4[0] - raw);
  for (const mark of SSM_SCALE_4) {
    const gap = Math.abs(mark - raw);
    if (gap < bestGap) {
      best = mark;
      bestGap = gap;
    }
  }
  return best;
};

/** Nhãn hiển thị cho giáo viên soát: giữ "N", số thì bỏ ".0" thừa (3.0 → "3"). */
export const loMarkLabel = (mark: LoMark): string => (mark === 'N' ? 'N' : String(mark));
