import { describe, expect, it } from 'vitest';
import { buildParentSafeReport, type ParentSafeReportInput } from './parentSafeReport';

const baseSubmission = (patch: Record<string, unknown> = {}) => ({
  id: 'submission-1',
  teacherId: 'teacher-1',
  classId: 'class-1',
  studentId: 'student-1',
  assignmentId: 'assignment-1',
  fileUrls: [],
  note: 'Ghi chú riêng của học sinh',
  status: 'graded' as const,
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  grade: {
    score: 8,
    maxScore: 10,
    feedback: 'Em đã nắm được cách làm chính.',
    noteForTeacher: 'Không đưa dòng này vào bản phụ huynh.',
    strengths: ['Đọc đúng dữ kiện'],
    weaknesses: ['Cần trình bày kết luận'],
    teacherApproved: true,
    gradedAt: '2026-08-28T08:00:00.000Z',
    questionResults: [{
      questionNumber: '1',
      status: 'correct' as const,
      score: 8,
      maxScore: 10,
      studentAnswer: 'x = 42',
      expectedAnswer: 'x = 42',
      errorType: '',
      explanation: 'Nội dung nội bộ không xuất hiện trong báo cáo phụ huynh.',
      correction: '',
      nextPractice: '',
      needsTeacherReview: false,
    }],
  },
  ...patch,
});

const input = (submissions: ParentSafeReportInput['submissions']): ParentSafeReportInput => ({
  studentId: 'student-1',
  studentName: 'Nguyễn Minh An',
  className: '11 Columbus',
  assignments: [
    { id: 'assignment-1', title: 'Hàm số', maxScore: 10 },
    { id: 'assignment-2', title: 'Xác suất', maxScore: 10 },
    { id: 'assignment-3', title: 'Hình học', maxScore: 10 },
  ],
  submissions,
  profile: {
    studentId: 'student-1',
    classId: 'class-1',
    teacherId: 'teacher-1',
    topics: [
      { topic: 'Hàm số', level: 'solid', evidenceSubmissionIds: ['submission-1'], updatedAt: '2026-08-28T08:00:00.000Z' },
      { topic: 'Xác suất', level: 'weak', evidenceSubmissionIds: ['submission-3'], updatedAt: '2026-08-28T08:00:00.000Z' },
    ],
    updatedAt: '2026-08-28T08:00:00.000Z',
  },
});

describe('buildParentSafeReport', () => {
  it('chỉ đưa điểm và nhận xét học sinh của bằng chứng chính thức vào bản phụ huynh', () => {
    const report = buildParentSafeReport(input([
      baseSubmission(),
      baseSubmission({
        id: 'submission-2',
        assignmentId: 'assignment-2',
        createdAt: '2026-08-28T09:00:00.000Z',
        updatedAt: '2026-08-28T09:00:00.000Z',
        grade: { ...baseSubmission().grade, score: 9, teacherApproved: false },
      }),
      baseSubmission({
        id: 'submission-3',
        assignmentId: 'assignment-3',
        createdAt: '2026-08-28T10:00:00.000Z',
        updatedAt: '2026-08-28T10:00:00.000Z',
        grade: { ...baseSubmission().grade, score: 5, strengths: [], weaknesses: ['Nhầm công thức'], teacherApproved: true },
      }),
    ]));

    expect(report).toMatchObject({
      studentName: 'Nguyễn Minh An',
      className: '11 Columbus',
      officialCount: 2,
      officialAveragePercent: 65,
      pendingCount: 1,
      missingCount: 0,
      progress: { trend: 'down' },
    });
    expect(report.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ assignmentId: 'assignment-1', title: 'Hàm số', status: 'official', score: 8, feedback: 'Em đã nắm được cách làm chính.' }),
      expect.objectContaining({ assignmentId: 'assignment-2', title: 'Xác suất', status: 'pending', score: null }),
      expect.objectContaining({ assignmentId: 'assignment-3', title: 'Hình học', status: 'official', score: 5 }),
    ]));
    expect(report.strengths).toContain('Đọc đúng dữ kiện');
    expect(report.strengths).toContain('Hàm số');
    expect(report.areasToPractice).toEqual(expect.arrayContaining(['Cần trình bày kết luận', 'Nhầm công thức', 'Xác suất']));
  });

  it('tách bài chưa nộp, không lộ dữ liệu thô hoặc ghi chú nội bộ', () => {
    const report = buildParentSafeReport(input([baseSubmission()]));

    expect(report.missingCount).toBe(2);
    expect(report.results).toEqual(expect.arrayContaining([
      expect.objectContaining({ assignmentId: 'assignment-2', status: 'not_submitted', score: null }),
      expect.objectContaining({ assignmentId: 'assignment-3', status: 'not_submitted', score: null }),
    ]));
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('noteForTeacher');
    expect(serialized).not.toContain('x = 42');
    expect(serialized).not.toContain('expectedAnswer');
    expect(serialized).not.toContain('studentAnswer');
    expect(serialized).not.toContain('student-2');
  });

  it('không dùng bài chưa duyệt để kết luận xu hướng hoặc điểm trung bình', () => {
    const report = buildParentSafeReport(input([baseSubmission({
      grade: { ...baseSubmission().grade, score: 10, teacherApproved: false },
    })]));

    expect(report.officialCount).toBe(0);
    expect(report.officialAveragePercent).toBeNull();
    expect(report.progress.trend).toBe('not_enough_data');
    expect(report.nextSteps.join(' ')).toMatch(/chờ thầy cô/i);
  });
});
