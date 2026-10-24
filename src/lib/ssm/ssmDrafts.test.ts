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
  const base = { officialCount: 4, trend: 'flat' as const, missingCount: 0, strengths: [], areasToPractice: [] };
  it('học khá: nêu mức % theo dữ liệu, không nhãn biểu mẫu, không gạch ngang AI', () => {
    const c = buildSubjectComment({ ...base, averagePercent: 71, areasToPractice: ['Hệ thức lượng trong tam giác'] });
    expect(c).toContain('trung bình khoảng 71%');
    expect(c).toContain('Hệ thức lượng trong tam giác');
    expect(c).not.toContain('Điểm mạnh:');
    expect(c).not.toContain('Cần rèn thêm:');
    expect(c).not.toContain(' — ');
  });
  it('đi xuống + còn bài chưa nộp: có cả hai ý', () => {
    const c = buildSubjectComment({ ...base, averagePercent: 55, trend: 'down', missingCount: 2 });
    expect(c).toContain('đang đi xuống');
    expect(c).toContain('Còn 2 bài chưa nộp');
  });
  it('tier giỏi và tier yếu khác cả câu mở lẫn câu kết', () => {
    const good = buildSubjectComment({ ...base, averagePercent: 92 });
    const weak = buildSubjectComment({ ...base, averagePercent: 32 });
    expect(good.startsWith('Con nắm chắc kiến thức')).toBe(true);
    expect(weak.startsWith('Kết quả của con')).toBe(true);
    expect(good).toContain('nâng cao');
    expect(weak).toContain('phần cơ bản');
    expect(good).not.toContain('32%');
    expect(weak).not.toContain('92%');
  });
  it('tiến bộ: có câu xu hướng đứng', () => {
    const c = buildSubjectComment({ ...base, averagePercent: 68, trend: 'up' });
    expect(c).toContain('tiến bộ rõ rệt');
  });
  it('chưa đủ bài chấm chính thức: không nêu số, không kết mức', () => {
    const c = buildSubjectComment({ ...base, averagePercent: null, officialCount: 0 });
    expect(c).toContain('chưa có đủ bài chấm chính thức');
    expect(c).not.toContain('%');
  });
});
