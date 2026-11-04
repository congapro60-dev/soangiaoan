import { describe, expect, it } from 'vitest';
import { studentKeyStatusText } from './StudentAiKeySection';

describe('trạng thái khoá AI của học sinh', () => {
  it('không có khoá / khoá dùng được / hỏng / hết hạn mức: luôn nói rõ bài đang chấm bằng khoá nào', () => {
    expect(studentKeyStatusText(null)).toContain('khoá của thầy cô');
    expect(studentKeyStatusText({ hasKey: true, last4: 'abcd', keyStatus: 'ok', usable: true, retryAt: null })).toContain('khoá của em (…abcd)');
    expect(studentKeyStatusText({ hasKey: true, last4: 'abcd', keyStatus: 'invalid', usable: false, retryAt: null })).toContain('Google từ chối');
    const exhausted = studentKeyStatusText({ hasKey: true, last4: 'abcd', keyStatus: 'exhausted', usable: false, retryAt: '2026-10-16T08:30:00.000Z' });
    expect(exhausted).toContain('hết hạn mức');
    expect(exhausted).toContain('khoá của thầy cô');
    expect(exhausted).toContain('thử lại');
  });
});
