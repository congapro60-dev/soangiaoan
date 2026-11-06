/**
 * Điểm cộng từ nhiều câu bị sai số số học (9,13 thành 9,1299999999999) vì số thực nhị phân.
 * Làm tròn 2 chữ số: giữ nguyên điểm lẻ 0,25 / 0,05 thầy cô vẫn cho (4,85 · 3,25), chỉ bỏ phần sai số.
 */
export const SCORE_DIGITS = 2;

export const roundScore = (value: number, digits: number = SCORE_DIGITS): number => {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/** Chuỗi hiển thị: "9.13", "10", "4.85" — không bao giờ có đuôi số thực. Không phải số → chuỗi rỗng. */
export const formatScore = (value: unknown, digits: number = SCORE_DIGITS): string =>
  typeof value === 'number' && Number.isFinite(value) ? String(roundScore(value, digits)) : '';
