import { describe, expect, it } from 'vitest';
import { buildClassAssignmentReport, type ClassReportInput } from './classReportModel';

const baseSubmission = (patch: Partial<ClassReportInput['assignment']['submissions'][number]> = {}) => ({
  id: 'submission-1',
  studentKey: 'student-1',
  createdAt: '2026-08-25T08:00:00.000Z',
  status: 'graded' as const,
  score: 8,
  maxScore: 10,
  official: true,
  questionResults: [],
  ...patch,
});

const baseInput = (submissions: ClassReportInput['assignment']['submissions']): ClassReportInput => ({
  roster: [
    { studentKey: 'student-1' },
    { studentKey: 'student-2' },
    { studentKey: 'student-3' },
    { studentKey: 'student-4' },
  ],
  assignment: {
    id: 'assignment-1',
    title: 'Hàm số bậc hai',
    type: 'exam',
    maxScore: 10,
    submissions,
  },
});

describe('buildClassAssignmentReport', () => {
  it('chỉ giữ lượt mới nhất và tách các counter theo trạng thái', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 'old', createdAt: '2026-08-24T08:00:00.000Z', score: 2 }),
      baseSubmission({ id: 'new', createdAt: '2026-08-25T08:00:00.000Z', score: 0 }),
      baseSubmission({
        id: 'pending',
        studentKey: 'student-2',
        status: 'graded',
        official: false,
        score: 7,
      }),
      baseSubmission({
        id: 'submitted',
        studentKey: 'student-3',
        status: 'submitted',
        official: false,
        score: null,
        maxScore: 10,
      }),
    ]));

    expect(report.latest.map(submission => submission.id)).toEqual(['new', 'pending', 'submitted']);
    expect(report.counters).toEqual({
      roster: 4,
      submitted: 3,
      graded: 2,
      official: 1,
      pending: 1,
      missing: 1,
    });
    expect(report.metrics.averagePercent).toBe(0);
    expect(report.official).toHaveLength(1);
  });

  it('tính điểm chính thức theo phần trăm, median và bốn khoảng thang 10', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 's1', studentKey: 'student-1', score: 0 }),
      baseSubmission({ id: 's2', studentKey: 'student-2', score: 5 }),
      baseSubmission({ id: 's3', studentKey: 'student-3', score: 6.5 }),
      baseSubmission({ id: 's4', studentKey: 'student-4', score: 8 }),
    ]));

    expect(report.metrics.averagePercent).toBe(48.75);
    expect(report.metrics.medianPercent).toBe(57.5);
    expect(report.scoreDistribution).toEqual({
      '0-<5': 1,
      '5-<6.5': 1,
      '6.5-<8': 1,
      '8-10': 1,
    });
  });

  it('tổng hợp câu hỏi, lỗi và chủ đề bằng nhãn chuẩn hóa', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({
        id: 's1',
        studentKey: 'student-1',
        questionResults: [
          {
            questionNumber: '1',
            status: 'correct',
            score: 2,
            maxScore: 2,
            errorType: '  Sai   dấu ',
            weakTopics: [' Hàm số ', 'hàm   số'],
          },
          {
            questionNumber: '2',
            status: 'partial',
            score: 1,
            maxScore: 2,
            errorType: 'sai dấu',
            weakTopics: ['Biến thiên'],
          },
        ],
      }),
      baseSubmission({
        id: 's2',
        studentKey: 'student-2',
        questionResults: [
          {
            questionNumber: '1',
            status: 'unreadable',
            score: 0,
            maxScore: 2,
            errorType: '',
            weakTopics: ['HÀM SỐ'],
          },
        ],
      }),
      baseSubmission({
        id: 'pending',
        studentKey: 'student-3',
        official: false,
        questionResults: [{
          questionNumber: '1',
          status: 'incorrect',
          score: 0,
          maxScore: 2,
          errorType: 'Không tính',
          weakTopics: ['Không tính'],
        }],
      }),
    ]));

    expect(report.questionStats).toEqual([
      expect.objectContaining({
        questionNumber: '1',
        evidenceCount: 2,
        correct: 1,
        partial: 0,
        incorrect: 0,
        unreadable: 1,
        correctRate: 0.5,
        scoreRate: 0.5,
      }),
      expect.objectContaining({
        questionNumber: '2',
        evidenceCount: 1,
        correct: 0,
        partial: 1,
        correctRate: 0,
        scoreRate: 0.5,
      }),
    ]);
    expect(report.errorStats).toEqual([
      { label: 'Sai dấu', evidenceCount: 2 },
    ]);
    expect(report.topicStats).toEqual([
      { label: 'Hàm số', evidenceCount: 3 },
      { label: 'Biến thiên', evidenceCount: 1 },
    ]);
  });

  it('bỏ điểm không hợp lệ, không làm hỏng model và vẫn giữ điểm 0 hợp lệ', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({ id: 'zero', studentKey: 'student-1', score: 0 }),
      baseSubmission({ id: 'nan', studentKey: 'student-2', score: Number.NaN }),
      baseSubmission({ id: 'over', studentKey: 'student-3', score: 11 }),
      baseSubmission({ id: 'bad-max', studentKey: 'student-4', score: 4, maxScore: 0 }),
    ]));

    expect(report.metrics.averagePercent).toBe(0);
    expect(report.metrics.medianPercent).toBe(0);
    expect(report.metrics.officialEvidenceCount).toBe(1);
    expect(report.recommendations).toEqual([
      expect.stringContaining('Chưa đủ dữ liệu'),
    ]);
    expect(JSON.stringify(report)).not.toContain('studentAnswer');
    expect(JSON.stringify(report)).not.toContain('noteForTeacher');
  });

  it('không suy diễn điểm câu từ thang bài và không đếm nhãn ngoài bằng chứng câu', () => {
    const report = buildClassAssignmentReport(baseInput([
      baseSubmission({
        id: 's1',
        studentKey: 'student-1',
        questionResults: [{
          questionNumber: '1',
          status: 'correct',
          score: 1,
          errorType: 'Cần kiểm tra',
          weakTopics: ['Đồ thị'],
        }],
      }),
      baseSubmission({
        id: 's2',
        studentKey: 'student-2',
        questionResults: [{
          questionNumber: '1',
          status: 'not_attempted',
          score: 0,
          maxScore: 1,
          errorType: 'Không tính',
          weakTopics: ['Không tính'],
        }],
      }),
    ]));

    expect(report.questionStats[0].scoreRate).toBe(0);
    expect(report.errorStats).toEqual([{ label: 'Cần kiểm tra', evidenceCount: 1 }]);
    expect(report.topicStats).toEqual([{ label: 'Đồ thị', evidenceCount: 1 }]);
  });

  it('sinh khuyến nghị deterministic khi có ít nhất ba bằng chứng chính thức', () => {
    const input = baseInput([
      baseSubmission({ id: 's1', studentKey: 'student-1', score: 4, questionResults: [{ questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2, errorType: 'Sai dấu', weakTopics: ['Hàm số'] }] }),
      baseSubmission({ id: 's2', studentKey: 'student-2', score: 5, questionResults: [{ questionNumber: '1', status: 'incorrect', score: 0, maxScore: 2, errorType: 'Sai dấu', weakTopics: ['Hàm số'] }] }),
      baseSubmission({ id: 's3', studentKey: 'student-3', score: 6, questionResults: [{ questionNumber: '1', status: 'partial', score: 1, maxScore: 2, errorType: 'Thiếu bước', weakTopics: ['Hàm số'] }] }),
    ]);

    const first = buildClassAssignmentReport(input);
    const second = buildClassAssignmentReport(input);

    expect(first.recommendations.length).toBeGreaterThan(0);
    expect(first.recommendations).toEqual(second.recommendations);
    expect(first.recommendations.join(' ')).toMatch(/Hàm số|Sai dấu/);
    expect(first.recommendations.join(' ')).not.toContain('Chưa đủ dữ liệu');
  });
});
