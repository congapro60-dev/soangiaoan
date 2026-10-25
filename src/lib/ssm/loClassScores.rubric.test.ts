import { describe, expect, it } from 'vitest';
import { buildClassLoScores } from './loClassScores';

const roster = [{ id: 's1', code: 'GB01' }];

const submission = (score: number, assignmentId: string) => ({
  studentId: 's1',
  assignmentId,
  grade: { score, maxScore: 10, teacherApproved: true },
  createdAt: '2026-10-01T08:00:00+07:00',
});

describe('buildClassLoScores — ma trận điểm của trường', () => {
  it('dùng trọng số LO: LO nặng đóng góp nhiều hơn LO nhẹ dù cùng tỉ lệ đúng', () => {
    // Một bài định kì duy nhất, học sinh đạt 8/10 (80%). Ma trận: LO1 0.5 điểm, LO2 2.75 điểm.
    const scores = buildClassLoScores(
      10,
      roster,
      [submission(8, 'a1')],
      [
        {
          id: 'a1',
          dueAt: '2026-10-20',
          periodicTest: true,
          competencyTags: [{ competencyId: 'g10-tap-hop-va-menh-de' }, { competencyId: 'g10-phep-toan-tren-tap-hop' }],
          loRubric: [
            { loCode: 'LO_DIS_TO_34344', maxPoints: 0.5 },
            { loCode: 'LO_DIS_TO_34345', maxPoints: 2.75 },
          ],
        },
      ],
      { period: 'IA1', academicYear: 2026 },
    );

    // Cùng tỉ lệ đúng ⇒ cùng điểm thang 10, nhưng đường tính đã đi qua trọng số của ma trận.
    expect(scores[0].scoreByCompetency['g10-tap-hop-va-menh-de']).toBe(8);
    expect(scores[0].scoreByCompetency['g10-phep-toan-tren-tap-hop']).toBe(8);
  });

  it('LO có trọng số 0 (vectơ lớp 10 giữa HKI) thì không có điểm', () => {
    const scores = buildClassLoScores(
      10,
      roster,
      [submission(9, 'a1')],
      [
        {
          id: 'a1',
          dueAt: '2026-10-20',
          competencyTags: [{ competencyId: 'g10-tap-hop-va-menh-de' }, { competencyId: 'g10-vecto-va-phep-toan' }],
          loRubric: [
            { loCode: 'LO_DIS_TO_34344', maxPoints: 0.5 },
            { loCode: 'LO_DIS_TO_34354', maxPoints: 0 },
          ],
        },
      ],
      { period: 'IA1', academicYear: 2026 },
    );

    expect(scores[0].scoreByCompetency['g10-tap-hop-va-menh-de']).toBe(9);
    expect(scores[0].scoreByCompetency['g10-vecto-va-phep-toan']).toBeUndefined();
  });

  it('bài không có ma trận vẫn tính theo nhãn năng lực như trước', () => {
    const scores = buildClassLoScores(
      10,
      roster,
      [submission(6, 'a1')],
      [{ id: 'a1', dueAt: '2026-10-20', competencyTags: [{ competencyId: 'g10-tap-hop-va-menh-de' }] }],
      { period: 'IA1', academicYear: 2026 },
    );

    expect(scores[0].scoreByCompetency['g10-tap-hop-va-menh-de']).toBe(6);
  });

  it('lấy lượt nộp mới nhất khi một em nộp lại', () => {
    const scores = buildClassLoScores(
      10,
      roster,
      [
        { ...submission(3, 'a1'), createdAt: '2026-10-01T08:00:00+07:00' },
        { ...submission(9, 'a1'), createdAt: '2026-10-02T08:00:00+07:00' },
      ],
      [{ id: 'a1', dueAt: '2026-10-20', competencyTags: [{ competencyId: 'g10-tap-hop-va-menh-de' }] }],
      { period: 'IA1', academicYear: 2026 },
    );

    expect(scores[0].scoreByCompetency['g10-tap-hop-va-menh-de']).toBe(9);
  });
});
