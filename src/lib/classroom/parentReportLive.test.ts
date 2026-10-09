import { describe, expect, it } from 'vitest';
import { mergeLiveInput } from './parentReportLive';
import type { ParentReportPrintInput } from './parentReportTypes';

const report = (officialCount: number) => ({
  studentId: 's', studentName: 'An', className: '11A', results: [], officialCount, officialAveragePercent: null, pendingCount: 0, missingCount: 0,
  strengths: [], areasToPractice: [], progress: { trend: 'flat' as const, firstPercent: null, latestPercent: null }, overallSummary: '', parentActions: [], teacherActions: [],
});

describe('báo cáo công bố cập nhật theo dữ liệu mới', () => {
  it('số liệu lấy từ bản dựng mới; nhận xét, yêu cầu cần đạt, nhận diện, ngày lập giữ như đã công bố', () => {
    const snapshot: ParentReportPrintInput = {
      report: report(1), studentName: 'An', className: '11A', generatedOn: '01/10/2026', teacherComment: 'Nhận xét cũ',
      requirements: [{ id: 'T11.01', level: 'vung', evidence: 3, percent: 90, note: 'ok' }], branding: { schoolName: 'THPT A' },
      period: { title: 'Tháng 9', range: '1–30/9', kind: 'month' }, exams: { moet: [{ label: 'GK', score: 6 }], tds: [] }, hs1: [],
    };
    const merged = mergeLiveInput(snapshot, {
      report: report(5), studentName: 'An', className: '11A', exams: { moet: [{ label: 'GK', score: 8 }], tds: [] }, hs1: [{ label: '15p', date: '', score: 9 }],
      period: { title: 'Tháng 9', range: '1–30/9', kind: 'month' },
    });
    expect(merged.report.officialCount).toBe(5);
    expect(merged.exams?.moet[0].score).toBe(8);
    expect(merged.hs1).toHaveLength(1);
    expect(merged.teacherComment).toBe('Nhận xét cũ');
    expect(merged.requirements).toHaveLength(1);
    expect(merged.branding).toEqual({ schoolName: 'THPT A' });
    expect(merged.generatedOn).toBe('01/10/2026');
  });
});
