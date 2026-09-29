import { describe, expect, it } from 'vitest';
import { SSM_SCALE_4, toScale4, loMarkLabel } from './loScore';

describe('toScale4 — quy thang 10 → thang 4 SSM', () => {
  it('các mốc chủ dự án chốt', () => {
    expect(toScale4(8)).toBe(3); // 3.2 → gần 3
    expect(toScale4(9)).toBe(3.5); // 3.6 → gần 3.5
    expect(toScale4(10)).toBe(4);
    expect(toScale4(0)).toBe(0);
  });

  it('khớp mức gần nhất CÓ THẬT trong thang', () => {
    expect(toScale4(5)).toBe(2); // 2.0
    expect(toScale4(7.5)).toBe(3); // 3.0
    expect(toScale4(6.25)).toBe(2.5); // đúng 2.5
    expect(toScale4(6.1)).toBe(2.5); // 2.44 → gần 2.5
  });

  it('vùng KHÔNG có mức 0,5: khớp 1 hoặc 0, không trả N', () => {
    expect(toScale4(2.5)).toBe(1); // 1.0
    expect(toScale4(1.3)).toBe(1); // 0.52 → gần 0.5 nhưng thang không có → 1 gần hơn? 0.52 tới 1 = .48, tới 0 = .52 → 1
    expect(toScale4(1.25)).toBe(1); // 0.5 hoà 0 và 1 → lấy mức cao = 1
    expect(toScale4(0.5)).toBe(0); // 0.2 → gần 0
    expect(toScale4(1)).toBe(0); // 0.4 → gần 0.5? tới 0 = .4, tới 0.5(không có)… tới 1(mark) = .6, tới 0 = .4 → 0
  });

  it('mọi điểm hợp lệ đều ra một MỨC SỐ (không bao giờ N)', () => {
    for (let s = 0; s <= 100; s++) {
      const m = toScale4(s / 10);
      expect(m).not.toBe('N');
      expect((SSM_SCALE_4 as readonly number[]).includes(m as number)).toBe(true);
    }
  });

  it('thiếu điểm / ngoài khoảng → N', () => {
    expect(toScale4(null)).toBe('N');
    expect(toScale4(undefined)).toBe('N');
    expect(toScale4(NaN)).toBe('N');
    expect(toScale4(-1)).toBe('N');
    expect(toScale4(11)).toBe('N');
  });
});

describe('loMarkLabel', () => {
  it('N giữ nguyên, số bỏ .0 thừa', () => {
    expect(loMarkLabel('N')).toBe('N');
    expect(loMarkLabel(3)).toBe('3');
    expect(loMarkLabel(3.5)).toBe('3.5');
    expect(loMarkLabel(0)).toBe('0');
  });
});
