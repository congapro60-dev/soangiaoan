import { describe, expect, it } from 'vitest';
import { buildClassProgressMatrix, type ClassProgressReportInput } from './classProgressModel';

const students = [
  { id: 'student-1', name: 'Nguyễn An', code: '001', progress: 0, status: 'active' as const },
  { id: 'student-2', name: 'Trần Bình', code: '002', progress: 0, status: 'active' as const },
];

const report = (id: string, title: string, latest: ClassProgressReportInput['reports'][number]['latest']): ClassProgressReportInput['reports'][number] => ({
  assignment: { id, title, type: 'Bài nộp ảnh/AI', maxScore: 10 },
  latest,
  official: [],
  counters: { roster: 2, submitted: latest.length, graded: latest.filter(item => item.status === 'graded').length, official: latest.filter(item => item.official).length, pending: 0, missing: 2 - latest.length },
  metrics: { averagePercent: null, medianPercent: null, officialEvidenceCount: 0 },
  averagePercent: null,
  medianPercent: null,
  scoreDistribution: { '0-<5': 0, '5-<6.5': 0, '6.5-<8': 0, '8-10': 0 },
  distribution: { '0-<5': 0, '5-<6.5': 0, '6.5-<8': 0, '8-10': 0 },
  questionStats: [],
  errorStats: [],
  topicStats: [],
  recommendations: [],
});

describe('buildClassProgressMatrix', () => {
  it('tổng hợp theo học sinh và bài, giữ điểm chính thức cùng số lượt nộp', () => {
    const matrix = buildClassProgressMatrix(students, [
      report('a1', 'BTVN 1', [{
        id: 'submission-1', studentKey: 'student-1', createdAt: '2026-08-27T08:00:00.000Z', status: 'graded', score: 8, maxScore: 10, official: true, attemptCount: 2, weakTopics: [], questionResults: [],
      }, {
        id: 'submission-2', studentKey: 'student-2', createdAt: '2026-08-27T08:10:00.000Z', status: 'graded', score: 5, maxScore: 10, official: false, attemptCount: 1, weakTopics: [], questionResults: [],
      }]),
      report('a2', 'BTVN 2', []),
    ]);

    expect(matrix.assignments.map(assignment => assignment.title)).toEqual(['BTVN 1', 'BTVN 2']);
    expect(matrix.totalAttempts).toBe(3);
    expect(matrix.rows[0]).toMatchObject({
      studentKey: 'student-1',
      submittedCount: 1,
      assignmentCount: 2,
      completionRate: 0.5,
      officialCount: 1,
      averagePercent: 80,
    });
    expect(matrix.rows[0].cells).toEqual([
      expect.objectContaining({ assignmentId: 'a1', status: 'graded', score: 8, maxScore: 10, official: true, attemptCount: 2 }),
      expect.objectContaining({ assignmentId: 'a2', status: 'missing', score: null, official: false, attemptCount: 0 }),
    ]);
    expect(matrix.rows[1]).toMatchObject({ submittedCount: 1, completionRate: 0.5, officialCount: 0, averagePercent: null });
  });

  it('phân biệt lượt đang làm với bài đã nộp trong tỷ lệ hoàn thành', () => {
    const matrix = buildClassProgressMatrix(students, [report('a1', 'BTVN 1', [{
      id: 'in-progress', studentKey: 'student-1', createdAt: '2026-08-27T08:00:00.000Z', status: 'in_progress', score: null, maxScore: 10, official: false, attemptCount: 1, weakTopics: [], questionResults: [],
    }])]);

    expect(matrix.totalAttempts).toBe(1);
    expect(matrix.rows[0]).toMatchObject({ submittedCount: 0, completionRate: 0 });
    expect(matrix.rows[0].cells[0]).toMatchObject({ status: 'in_progress', attemptCount: 1 });
  });
});
