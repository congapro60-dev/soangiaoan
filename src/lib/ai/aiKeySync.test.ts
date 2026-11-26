import { describe, expect, it } from 'vitest';
import { planKeySync } from './aiKeySync';

const K1 = 'AIza' + 'a'.repeat(31) + 'k1k1';
const K2 = 'AIza' + 'b'.repeat(31) + 'k2k2';

describe('đồng bộ khoá Gemini Cài đặt → máy chủ', () => {
  it('máy chủ trống: gửi khoá trình duyệt lên', () => {
    expect(planKeySync([K1, K2], [], [])).toEqual({ needed: true, keys: [K1, K2], keepLast4: [] });
  });

  it('đã khớp: không gọi máy chủ', () => {
    expect(planKeySync([K1, K2], ['k1k1', 'k2k2'], ['k1k1', 'k2k2']).needed).toBe(false);
  });

  it('khoá chỉ có trên máy chủ (lưu ở Chi phí AI trước đây) được GIỮ, xếp sau', () => {
    expect(planKeySync([K1], ['htzg'], [])).toEqual({ needed: true, keys: [K1], keepLast4: ['htzg'] });
  });

  it('khoá từng đồng bộ rồi bị xoá ở Cài đặt thì máy chủ cũng bỏ', () => {
    expect(planKeySync([K1], ['k1k1', 'k2k2'], ['k1k1', 'k2k2'])).toEqual({ needed: true, keys: [K1], keepLast4: [] });
  });

  it('trình duyệt chưa có khoá nào: không đụng khoá trên máy chủ', () => {
    expect(planKeySync([], ['htzg'], []).needed).toBe(false);
  });
});
