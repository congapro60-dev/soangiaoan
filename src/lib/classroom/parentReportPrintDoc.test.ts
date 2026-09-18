import { describe, expect, it } from 'vitest';
import { buildParentReportPrintDoc } from './parentReportPrintDoc';
import type { ParentSafeReport } from './parentSafeReport';

const report: ParentSafeReport = {
  studentId: 'student-1',
  studentName: 'Nguyễn Minh An',
  className: '11 Columbus',
  results: [
    { assignmentId: 'a1', title: 'Hàm số', status: 'official', score: 8, maxScore: 10 },
    { assignmentId: 'a2', title: 'Xác suất', status: 'pending', score: null, maxScore: null },
  ],
  officialCount: 1,
  officialAveragePercent: 80,
  pendingCount: 1,
  missingCount: 0,
  strengths: ['Hàm số'],
  areasToPractice: ['Xác suất'],
  progress: { trend: 'up', firstPercent: 60, latestPercent: 80 },
  overallSummary: 'Con học rất tốt, tiếp tục phát huy.',
  parentActions: ['Hỏi con mỗi ngày'],
  teacherActions: ['Giao bài luyện đúng phần yếu'],
};

describe('buildParentReportPrintDoc', () => {
  it('dựng nội dung báo cáo với thông tin học sinh và mọi mục an toàn', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'Nguyễn Minh An', className: '11 Columbus', studentCode: 'GB0117', generatedOn: '18/09/2026' });
    expect(html).toContain('parent-report-pdf-root'); // style đã scope
    expect(html).toContain('Nguyễn Minh An');
    expect(html).toContain('GB0117');
    expect(html).toContain('18/09/2026');
    expect(html).toContain('Con học rất tốt, tiếp tục phát huy.');
    expect(html).toContain('Hỏi con mỗi ngày');
    expect(html).toContain('Giao bài luyện đúng phần yếu');
    expect(html).toContain('Đang tiến bộ'); // nhãn xu hướng
    expect(html).toContain('8/10'); // điểm bài official
    expect(html).toContain('80.0%'); // điểm trung bình
  });

  it('escape ký tự HTML trong dữ liệu động để không vỡ trang', () => {
    const html = buildParentReportPrintDoc({
      report: { ...report, strengths: ['<script>alert(1)</script>'] },
      studentName: 'A & B <x>',
      className: '11',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B &lt;x&gt;');
  });

  it('không kèm ghi chú nội bộ hay đáp án (chỉ nhận ParentSafeReport)', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'Nguyễn Minh An', className: '11 Columbus' });
    expect(html).not.toContain('noteForTeacher');
    expect(html).not.toContain('expectedAnswer');
  });
});
