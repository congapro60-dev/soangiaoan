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

  it('thầy sửa điểm + duyệt lại → điểm mới thay điểm cũ khi gọi lại với dữ liệu mới', () => {
    const truoc = buildClassLoScores(11, roster, submissions, assignments);
    // Grade của thầy sửa tay có thêm `editedByTeacher` — gán biến trước để TS không chặn field thừa.
    const sauSuaSubmissions = [
      { studentId: 's1', assignmentId: 'a1', createdAt: '2026-09-01', grade: { score: 5.5, maxScore: 10, teacherApproved: true, editedByTeacher: true } },
      { studentId: 's2', assignmentId: 'a1', createdAt: '2026-09-01', grade: { score: 6, maxScore: 10, teacherApproved: false } },
    ];
    const sauSua = buildClassLoScores(11, roster, sauSuaSubmissions, assignments);
    expect(truoc.find((s) => s.maHS === 'HS001')?.scoreByCompetency[COMP]).toBe(8);
    expect(sauSua.find((s) => s.maHS === 'HS001')?.scoreByCompetency[COMP]).toBe(5.5);
  });

  it('bỏ học sinh không có Mã HS', () => {
    const scores = buildClassLoScores(11, roster, submissions, assignments);
    expect(scores.map((s) => s.maHS)).toEqual(['HS001', 'HS002']);
  });

  it('F1 gom bài tháng 8-9, loại bài ngoài kỳ', () => {
    const scoped = buildClassLoScores(11, roster, [
      ...submissions,
      { studentId: 's1', assignmentId: 'a2', createdAt: '2026-10-01', grade: { score: 2, maxScore: 10, teacherApproved: true } },
    ], [
      ...assignments,
      { id: 'a2', createdAt: '2026-10-01', competencyTags: [{ competencyId: COMP }] },
    ], { period: 'F1', academicYear: 2026 });
    expect(scoped.find((s) => s.maHS === 'HS001')?.scoreByCompetency[COMP]).toBe(8);
  });

  it('IA1 dùng 60% bài thi tháng 10 + 40% bài thường', () => {
    const scoped = buildClassLoScores(11, roster, [
      { studentId: 's1', assignmentId: 'regular', createdAt: '2026-10-05', grade: { score: 5, maxScore: 10, teacherApproved: true } },
      { studentId: 's1', assignmentId: 'exam', createdAt: '2026-10-20', grade: { score: 9, maxScore: 10, teacherApproved: true } },
    ], [
      { id: 'regular', createdAt: '2026-10-05', competencyTags: [{ competencyId: COMP }] },
      { id: 'exam', createdAt: '2026-10-20', title: 'Thi giữa HKI', periodicTest: {}, competencyTags: [{ competencyId: COMP }] },
    ], { period: 'IA1', academicYear: 2026 });
    expect(scoped.find((s) => s.maHS === 'HS001')?.scoreByCompetency[COMP]).toBe(7.4);
  });

  it('bài thi muộn vẫn thuộc tháng theo ngày giao, không theo ngày nộp', () => {
    const scoped = buildClassLoScores(11, [roster[0]], [
      { studentId: 's1', assignmentId: 'exam', createdAt: '2026-11-02', grade: { score: 9, maxScore: 10, teacherApproved: true } },
    ], [{ id: 'exam', createdAt: '2026-10-20', dueAt: '2026-10-25', periodicTest: {}, competencyTags: [{ competencyId: COMP }] }], { period: 'IA1', academicYear: 2026 });
    expect(scoped[0].scoreByCompetency[COMP]).toBe(9);
  });
});
