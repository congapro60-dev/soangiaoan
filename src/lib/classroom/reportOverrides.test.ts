import { describe, expect, it } from 'vitest';
import { applyReportOverrides, overriddenKeys, sanitizeReportOverrides } from './reportOverrides';
import type { ParentReportPrintInput } from './parentReportTypes';

const input: ParentReportPrintInput = {
  studentName: 'An', className: '11A',
  report: {
    studentId: 's', studentName: 'An', className: '11A',
    results: [
      { assignmentId: 'a1', title: 'Bài 1', status: 'official', score: 8, maxScore: 10 },
      { assignmentId: 'a2', title: 'Bài 2', status: 'pending', score: null, maxScore: null },
    ],
    officialCount: 1, officialAveragePercent: 80, pendingCount: 1, missingCount: 0,
    strengths: ['Hàm số'], areasToPractice: ['Xác suất'], progress: { trend: 'flat', firstPercent: null, latestPercent: null },
    overallSummary: 'Tự động', parentActions: ['Việc A'], teacherActions: ['Việc B'],
  },
  exams: { moet: [{ label: 'Giữa kì', score: 7 }], tds: [] },
  hs1: [{ label: '15 phút', date: '2026-09-20', score: 6 }],
  competency: { grade: '11', assessed: 1, total: 3, items: [{ area: 'Đại số', topic: 'Lượng giác', level: 'Tốt' }] },
};

describe('bản chỉnh tay báo cáo phụ huynh', () => {
  it('không có bản chỉnh thì trả nguyên dữ liệu gốc', () => {
    expect(applyReportOverrides(input, null)).toBe(input);
    expect(applyReportOverrides(input, {})).toBe(input);
  });

  it('chỉ đổi đúng chỗ đã chỉnh, không sửa dữ liệu gốc', () => {
    const out = applyReportOverrides(input, {
      overallSummary: 'Thầy viết', strengths: ['Lượng giác'], officialAveragePercent: 90, missingCount: 2,
      results: [{ id: 'a1', score: 9, title: 'Bài 1 (sửa)' }, { id: 'a2', hidden: true }],
      moet: [{ label: 'Giữa kì', score: 8 }], hs1: [], teacherComment: '',
    });
    expect(out.report).toMatchObject({ overallSummary: 'Thầy viết', strengths: ['Lượng giác'], officialAveragePercent: 90, missingCount: 2, areasToPractice: ['Xác suất'], officialCount: 1 });
    expect(out.report.results).toEqual([{ assignmentId: 'a1', title: 'Bài 1 (sửa)', status: 'official', score: 9, maxScore: 10 }]);
    expect(out.exams).toEqual({ moet: [{ label: 'Giữa kì', score: 8 }], tds: [] });
    expect(out.hs1).toEqual([]);
    expect(out.teacherComment).toBe('');
    expect(input.report.overallSummary).toBe('Tự động');
    expect(input.report.results).toHaveLength(2);
  });

  it('điểm trung bình có thể đặt về "chưa đủ bài" (null)', () => {
    expect(applyReportOverrides(input, { officialAveragePercent: null }).report.officialAveragePercent).toBeNull();
  });

  it('làm sạch: bỏ trường lạ, sai kiểu, quá cỡ; giữ null hợp lệ', () => {
    const clean = sanitizeReportOverrides({
      evil: 'x', overallSummary: ' ok ', strengths: ['a', '', 5, 'b'], officialCount: -3.4, pendingCount: 'x', officialAveragePercent: null,
      results: [{ id: 'a1', score: null, hidden: true }, { id: '' }, { id: 'a2' }],
      moet: [{ label: 'GK', score: 7.456 }, { label: '', score: 1 }, { label: 'x', score: NaN }],
      competencyItems: [{ topic: 'T', level: 'Tốt' }, { topic: 'U', level: 'Giỏi' }],
    }, '11');
    expect(clean).toEqual({
      overallSummary: 'ok', strengths: ['a', 'b'], officialCount: 0, officialAveragePercent: null,
      results: [{ id: 'a1', score: null, hidden: true }],
      moet: [{ label: 'GK', score: 7.46 }],
      competencyItems: [{ area: '', topic: 'T', level: 'Tốt' }],
    });
    expect(sanitizeReportOverrides('rác', '11')).toEqual({});
  });

  it('liệt kê các trường đã chỉnh', () => {
    expect([...overriddenKeys({ overallSummary: 'x', strengths: undefined })]).toEqual(['overallSummary']);
  });
});
