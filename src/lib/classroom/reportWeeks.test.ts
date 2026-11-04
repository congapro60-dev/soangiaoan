import { describe, expect, it } from 'vitest';
import { groupResultsByWeek, weekNumber, weekTitle, mondayOf } from './reportWeeks';
import type { ParentSafeAssignmentResult } from './parentSafeReport';

const r = (id: string, dueAt: string | undefined, status: ParentSafeAssignmentResult['status'] = 'official', submittedAt?: string): ParentSafeAssignmentResult =>
  ({ assignmentId: id, title: id, status, score: status === 'official' ? 8 : null, maxScore: status === 'official' ? 10 : null, ...(dueAt ? { dueAt } : {}), ...(submittedAt ? { submittedAt } : {}) });

describe('chia kết quả theo tuần học', () => {
  const plan = { week1Monday: '2026-08-31', skippedWeeks: ['2026-09-07'] };

  it('thứ Hai của một ngày; Chủ nhật thuộc tuần trước', () => {
    expect(mondayOf('2026-10-07')).toBe('2026-10-05');
    expect(mondayOf('2026-10-11')).toBe('2026-10-05');
    expect(mondayOf('2026-10-12')).toBe('2026-10-12');
  });

  it('đánh số theo Lịch dạy: tuần 1 từ ngày bắt đầu, tuần không đánh số bị bỏ qua và không có số', () => {
    expect(weekNumber('2026-08-31', plan)).toBe(1);
    expect(weekNumber('2026-09-07', plan)).toBeNull();
    expect(weekNumber('2026-09-14', plan)).toBe(2);
    expect(weekNumber('2026-10-05', plan)).toBe(5);
    expect(weekNumber('2026-08-24', plan)).toBeNull();
    expect(weekNumber('2026-10-05', null)).toBeNull();
  });

  it('nhóm theo tuần, tuần mới nhất trước; bài không ngày xuống cuối; hạn nộp ưu tiên hơn ngày nộp; giờ VN', () => {
    const groups = groupResultsByWeek([
      r('a', '2026-10-06T10:00:00.000Z'), r('b', '2026-10-08T10:00:00.000Z', 'not_submitted'), r('c', '2026-09-30T10:00:00.000Z'),
      r('d', undefined, 'pending', '2026-09-30T05:00:00.000Z'), r('e', undefined, 'not_submitted'),
      r('f', '2026-10-11T17:30:00.000Z'), // 00:30 thứ Hai 12/10 giờ VN → tuần sau
    ], plan);
    expect(groups.map(g => `${weekTitle(g)}:${g.results.map(x => x.assignmentId).join('')}:${g.officialCount}`)).toEqual([
      'Tuần 6 · 12/10 – 18/10:f:1', 'Tuần 5 · 5/10 – 11/10:ab:1', 'Tuần 4 · 28/9 – 4/10:cd:1', 'Chưa rõ tuần:e:0',
    ]);
  });

  it('chưa có Lịch dạy: chỉ ghi khoảng ngày; tuần nghỉ theo Lịch dạy được gọi là "Tuần nghỉ"', () => {
    expect(weekTitle(groupResultsByWeek([r('a', '2026-10-06T10:00:00.000Z')], null)[0])).toBe('Tuần 5/10 – 11/10');
    expect(weekTitle(groupResultsByWeek([r('a', '2026-09-08T10:00:00.000Z')], plan)[0])).toBe('Tuần nghỉ · 7/9 – 13/9');
  });
});
