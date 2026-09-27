import { describe, expect, it } from 'vitest';
import { buildObjectiveReflectionText } from './StudentGoalReflection';

describe('buildObjectiveReflectionText', () => {
  it('keeps the exact shared objective text and records the student assessment beside it', () => {
    expect(buildObjectiveReflectionText(
      ['MUST · Tôi có thể lập mô hình.', 'SHOULD · Tôi có thể kiểm tra nghiệm.'],
      { 0: 'Đã làm được', 1: 'Đang tiến bộ' },
    )).toBe('MUST · Tôi có thể lập mô hình.\nTự đánh giá: Đã làm được\nSHOULD · Tôi có thể kiểm tra nghiệm.\nTự đánh giá: Đang tiến bộ');
  });
});
