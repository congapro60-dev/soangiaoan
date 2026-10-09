import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReportOverridesEditor } from './ReportOverridesEditor';
import type { ParentReportPrintInput } from '../../../lib/classroom/parentReportTypes';

const base: ParentReportPrintInput = {
  studentName: 'An', className: '11A',
  report: {
    studentId: 's', studentName: 'An', className: '11A',
    results: [{ assignmentId: 'a1', title: 'Bài 1', status: 'official', score: 8, maxScore: 10 }],
    officialCount: 1, officialAveragePercent: 80, pendingCount: 0, missingCount: 2,
    strengths: ['Hàm số'], areasToPractice: ['Xác suất'], progress: { trend: 'flat', firstPercent: null, latestPercent: null },
    overallSummary: 'Tự động', parentActions: ['Hỏi con'], teacherActions: ['Giao bài'],
  },
  exams: { moet: [{ label: 'Giữa kì', score: 7 }], tds: [] },
  hs1: [{ label: '15 phút', date: '2026-09-20', score: 6 }],
};

describe('ReportOverridesEditor', () => {
  it('hiện mọi mục sửa được với giá trị tự động, chưa có dấu "đã chỉnh tay"', () => {
    const html = renderToStaticMarkup(<ReportOverridesEditor base={base} value={{}} onChange={() => undefined} />);
    for (const text of ['Nhận xét chung về con', 'Điểm mạnh', 'Cần rèn thêm', 'Phụ huynh có thể đồng hành cùng con', 'Thầy cô sẽ hỗ trợ con', 'Số liệu đầu trang', 'Kết quả theo bài', 'Điểm định kì', 'Điểm hệ số 1', 'Tự động', 'Hàm số', 'Giữa kì']) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain('đã chỉnh tay</span>');
  });

  it('chỗ đã chỉnh hiện giá trị thầy cô sửa kèm dấu và nút về bản tự động; chỗ khác giữ nguyên', () => {
    const html = renderToStaticMarkup(<ReportOverridesEditor base={base} value={{ overallSummary: 'Thầy viết', missingCount: 0 }} onChange={() => undefined} />);
    expect(html).toContain('Thầy viết');
    expect(html.match(/đã chỉnh tay<\/span>/g)).toHaveLength(2);
    expect(html).toContain('Về bản tự động');
    expect(html).toContain('Xác suất');
  });
});
