import { describe, expect, it } from 'vitest';
import { buildClassLoScores } from './loClassScores';

// Dùng một năng lực có thật trong khung lớp 11 để buildStudentCompetencyPortfolio nhận ra.
const COMP = 'g11-day-so-cap-so';

describe('buildClassLoScores', () => {
  const roster = [{ id: 's1', code: 'HS001' }, { id: 's2', code: 'HS002' }, { id: 's3', code: '' }];
  const assignments = [{ id: 'a1', competencyTags: [{ competencyId: COMP }] }];
  const submissions = [
    { studentId: 's1', assignmentId: 'a1', createdAt: '2026-09-01', grade: { score: 8, maxScore: 10, teacherApproved: true } },
    { studentId: 's2', assignmentId: 'a1', createdAt: '2026-09-01', grade: { score: 6, maxScore: 10, teacherApproved: false } },
  ];

  it('quy điểm thang 10 cho HS có bài đã duyệt', () => {
    const scores = buildClassLoScores(11, roster, submissions, assignments);
    const hs1 = scores.find((s) => s.maHS === 'HS001');
    expect(hs1?.scoreByCompetency[COMP]).toBe(8);
  });

  it('bài CHƯA duyệt không tính (HS002 rỗng)', () => {
    const scores = buildClassLoScores(11, roster, submissions, assignments);
    const hs2 = scores.find((s) => s.maHS === 'HS002');
    expect(hs2?.scoreByCompetency[COMP]).toBeUndefined();
  });

  it('bỏ học sinh không có Mã HS', () => {
    const scores = buildClassLoScores(11, roster, submissions, assignments);
    expect(scores.map((s) => s.maHS)).toEqual(['HS001', 'HS002']);
  });
});
