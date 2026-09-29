import { describe, expect, it } from 'vitest';
import { buildScheduleContent, buildHomeworkDraft, toSsmDeadline, buildSubjectComment } from './ssmDrafts';

describe('buildScheduleContent', () => {
  it('dựng HTML kiểu ô báo giảng SSM, escape ký tự', () => {
    const html = buildScheduleContent('11Columbus', 'VN TOÁN', 'Tuần 6 (21–27/9)', [
      { title: 'Dãy số', detail: 'Tiết 1' },
      { title: 'Cấp số cộng <a>' },
    ]);
    expect(html).toContain('<h3>11Columbus – VN TOÁN</h3>');
    expect(html).toContain('<strong>Tuần 6 (21–27/9)</strong>');
    expect(html).toContain('<li>Dãy số — Tiết 1</li>');
    expect(html).toContain('Cấp số cộng &lt;a&gt;');
  });
  it('tuần rỗng có ghi chú', () => {
    expect(buildScheduleContent('L', 'M', 'Tuần 1', [])).toContain('Chưa có nội dung');
  });
});

describe('toSsmDeadline', () => {
  it('ISO → YYYY-MM-DD HH:mm:ss giờ VN (UTC+7)', () => {
    expect(toSsmDeadline('2026-09-16T01:00:00Z')).toBe('2026-09-16 08:00:00');
  });
  it('rỗng/hỏng → chuỗi rỗng', () => {
    expect(toSsmDeadline(undefined)).toBe('');
    expect(toSsmDeadline('rác')).toBe('');
  });
});

describe('buildHomeworkDraft', () => {
  it('lấy tên, hạn định dạng SSM, nội dung', () => {
    expect(buildHomeworkDraft({ title: '  BTVN Toán  ', description: '<p>Làm bài 1</p>', dueAt: '2026-09-16T01:00:00Z' }))
      .toEqual({ name: 'BTVN Toán', deadline: '2026-09-16 08:00:00', contentHtml: '<p>Làm bài 1</p>' });
  });
});

describe('buildSubjectComment', () => {
  it('gộp một đoạn liền mạch', () => {
    const c = buildSubjectComment({
      overallSummary: 'Con tiến bộ đều.',
      strengths: ['tính toán nhanh'],
      areasToPractice: ['trình bày lời giải'],
      parentActions: ['Cùng con ôn lại bài mỗi tối.'],
    });
    expect(c).toBe('Con tiến bộ đều. Điểm mạnh: tính toán nhanh. Cần rèn thêm: trình bày lời giải. Cùng con ôn lại bài mỗi tối.');
  });
  it('bỏ phần rỗng', () => {
    expect(buildSubjectComment({ overallSummary: 'Ổn.', strengths: [], areasToPractice: [], parentActions: [] })).toBe('Ổn.');
  });
});
