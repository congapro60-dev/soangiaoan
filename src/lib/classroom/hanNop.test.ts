import { describe, expect, it } from 'vitest';
import { laNopQuaHan, submissionDeadlineState } from './hanNop';

describe('badge hạn nộp ngoài danh sách', () => {
  it('cảnh báo quá hạn và trong 24 giờ, không gán hạn giả', () => {
    const due = '2026-10-15T01:00:00Z';
    expect(submissionDeadlineState(due, undefined, Date.parse(due) - 60_000).key).toBe('imminent');
    expect(submissionDeadlineState(due, undefined, Date.parse(due) + 1).key).toBe('overdue');
    expect(submissionDeadlineState('ngày hỏng', undefined).dueLabel).toBe('');
    expect(submissionDeadlineState(undefined, undefined).key).toBe('pending');
  });
  it('đúng bằng hạn là đúng hạn; muộn1ms hiện nộp muộn', () => {
    const due = '2026-10-15T01:00:00Z';
    expect(submissionDeadlineState(due, due).label).toBe('Đúng hạn');
    expect(submissionDeadlineState(due, '2026-10-15T01:00:00.001Z').label).toBe('Nộp muộn');
    expect(submissionDeadlineState(undefined, due).label).toBe('Đã nộp');
    expect(submissionDeadlineState(due).dueLabel).toContain('08:00');
  });
});

const HAN = '2026-08-22T20:00:00.000Z';

describe('laNopQuaHan', () => {
  it('nộp trước hạn → đúng hạn', () => {
    expect(laNopQuaHan('2026-08-22T10:00:00.000Z', HAN)).toBe(false);
  });

  it('nộp sau hạn → muộn', () => {
    expect(laNopQuaHan('2026-08-22T20:00:01.000Z', HAN)).toBe(true);
  });

  it('nộp đúng bằng mốc hạn vẫn counted đúng hạn (so sánh nghiêm >)', () => {
    expect(laNopQuaHan(HAN, HAN)).toBe(false);
  });

  it('bài không đặt hạn thì không bao giờ muộn', () => {
    expect(laNopQuaHan('2027-01-01T00:00:00.000Z', undefined)).toBe(false);
    expect(laNopQuaHan('2027-01-01T00:00:00.000Z', '')).toBe(false);
  });

  it('dữ liệu hỏng (ngày không đọc được) thì fail-open thành đúng hạn, không oan học sinh', () => {
    expect(laNopQuaHan('khong-phai-ngay', HAN)).toBe(false);
    expect(laNopQuaHan('2026-08-23T00:00:00.000Z', 'han-lo')).toBe(false);
  });
});
