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

  it('hiện mục Năng lực Toán học khi có hồ sơ, nhóm theo mức', () => {
    const html = buildParentReportPrintDoc({
      report, studentName: 'Nguyễn Minh An', className: '11 Columbus',
      competency: {
        grade: '11', assessed: 2, total: 5,
        items: [
          { area: 'Đại số', topic: 'Hàm số', level: 'Tốt' },
          { area: 'Xác suất', topic: 'Biến cố', level: 'Đạt yêu cầu' },
        ],
      },
    });
    expect(html).toContain('Năng lực Toán học');
    expect(html).toContain('2/5'); // tiến độ đánh giá
    expect(html).toContain('Tốt');
    expect(html).toContain('Hàm số');
    expect(html).toContain('Đạt yêu cầu');
  });

  it('bỏ mục Năng lực Toán học khi không có hồ sơ (competency vắng)', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'Nguyễn Minh An', className: '11 Columbus' });
    expect(html).not.toContain('Năng lực Toán học');
  });

  it('hiện mục Điểm thi định kì với MOET (thang 10) + TDS (kèm điểm chữ)', () => {
    const html = buildParentReportPrintDoc({
      report, studentName: 'Nguyễn Minh An', className: '11 Columbus',
      exams: {
        moet: [{ label: 'Khảo sát đầu năm', score: 2.35 }, { label: 'Giữa học kì I', score: 6 }],
        tds: [{ label: 'Quý 1', score: 7, letter: 'B' }],
      },
    });
    expect(html).toContain('Điểm thi định kì');
    expect(html).toContain('Khảo sát đầu năm');
    expect(html).toContain('2.35/10');
    expect(html).toContain('Quý 1');
    expect(html).toContain('>B<'); // điểm chữ
  });

  it('bỏ mục Điểm thi định kì khi không có điểm', () => {
    const html = buildParentReportPrintDoc({ report, studentName: 'Nguyễn Minh An', className: '11 Columbus', exams: { moet: [], tds: [] }, hs1: [] });
    expect(html).not.toContain('Điểm thi định kì');
    expect(html).not.toContain('hệ số 1');
  });

  it('điểm hệ số 1 vào cùng mục, kèm ngày và điểm trung bình — kể cả khi chưa có điểm thi', () => {
    const html = buildParentReportPrintDoc({
      report, studentName: 'Nguyễn Minh An', className: '11 Columbus',
      hs1: [{ label: 'KT 15 phút lần 1', date: '2026-09-20', score: 8 }, { label: 'Miệng', date: '2026-09-22', score: 9.5 }],
    });
    expect(html).toContain('Điểm kiểm tra &amp; thi định kì');
    expect(html).toContain('Điểm hệ số 1 trên lớp (thang 10) · TB 8.75');
    expect(html).toContain('KT 15 phút lần 1');
    expect(html).toContain('20/09/2026');
    expect(html).toContain('9.5/10');
  });
});
