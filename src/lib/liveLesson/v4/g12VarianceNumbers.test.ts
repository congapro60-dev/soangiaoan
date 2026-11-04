import { describe, expect, it } from 'vitest';
import { getBanToanV4Contract } from './lessonAdapter';
import { CASIO_FX580_STEPS } from '../casioGuide';

/**
 * Khoá số của bài Phương sai (12-11-80).
 *
 * Lịch sử: giáo án gốc ghi x̄ = 8,5 trong khi 180/20 = 9, kéo theo toàn bộ
 * s² = 1,05 / 3,05 và σx = 1,02469 đều sai. Đã sửa theo số đúng (thầy duyệt 2026-10-25).
 * Test này tính lại từ tần số thật, không chép lại hằng số — sai số liệu là đỏ ngay.
 */
const GROUPS = [7, 9, 11];
const FREQ_AN = [2, 16, 2];
const FREQ_BINH = [7, 6, 7];

const mean = (freq: number[]) =>
  GROUPS.reduce((sum, c, i) => sum + freq[i] * c, 0) / freq.reduce((a, b) => a + b, 0);

const variance = (freq: number[], m: number) =>
  GROUPS.reduce((sum, c, i) => sum + freq[i] * (c - m) ** 2, 0) / freq.reduce((a, b) => a + b, 0);

describe('Bài 12 — số liệu hai xạ thủ', () => {
  const meanAn = mean(FREQ_AN);
  const meanBinh = mean(FREQ_BINH);

  it('180/20 = 9, không phải 8,5', () => {
    expect(meanAn).toBe(9);
    expect(meanBinh).toBe(9);
  });

  it('An: s² = 0,8 và s ≈ 0,894', () => {
    expect(variance(FREQ_AN, meanAn)).toBeCloseTo(0.8, 10);
    expect(Math.sqrt(variance(FREQ_AN, meanAn))).toBeCloseTo(0.894, 3);
  });

  it('Bình: s² = 2,8 và s ≈ 1,673', () => {
    expect(variance(FREQ_BINH, meanBinh)).toBeCloseTo(2.8, 10);
    expect(Math.sqrt(variance(FREQ_BINH, meanBinh))).toBeCloseTo(1.673, 3);
  });

  it('công thức rút gọn ra cùng kết quả với định nghĩa', () => {
    const sumSq = GROUPS.reduce((sum, c, i) => sum + FREQ_AN[i] * c * c, 0);
    const n = FREQ_AN.reduce((a, b) => a + b, 0);
    expect(sumSq / n - meanAn ** 2).toBeCloseTo(variance(FREQ_AN, meanAn), 10);
  });

  it('An ổn định hơn Bình dù cùng điểm trung bình', () => {
    expect(Math.sqrt(variance(FREQ_AN, meanAn))).toBeLessThan(Math.sqrt(variance(FREQ_BINH, meanBinh)));
  });

  it('nội dung bài học không còn con số sai của giáo án cũ', () => {
    const contract = getBanToanV4Contract('12-11-80');
    const body = JSON.stringify(contract);
    // '8,5' chỉ được xuất hiện như mốc "không phải 8,5" nếu có; nơi đây phải sạch hẳn.
    expect(body).not.toContain('s^2 = 1,05');
    expect(body).not.toContain('3,05');
    expect(body).not.toContain('72,25');
    expect(body).not.toContain('180/20 = 8,5');
  });

  it('σx trên Casio khớp s của An (0,89443…)', () => {
    expect(CASIO_FX580_STEPS[3].expected).toBe('σx = 0,89443…');
    expect(Math.sqrt(variance(FREQ_AN, meanAn))).toBeCloseTo(0.89443, 5);
  });
});
