import { describe, expect, it } from 'vitest';
import {
  buildEvidenceInputs,
  buildStudentCompetencyPortfolio,
  portfolioProgress,
  type PortfolioAssignment,
  type PortfolioSubmission,
} from './portfolioModel';
import { competenciesByGrade } from './framework';

const sub = (over: Partial<PortfolioSubmission> = {}): PortfolioSubmission => ({
  assignmentId: 'a1', score: 8, maxScore: 10, approved: true, submittedAt: '2026-09-01T00:00:00.000Z', ...over,
});

describe('buildEvidenceInputs', () => {
  it('nhân bài nộp ra từng nhãn của bài giao', () => {
    const assignments: PortfolioAssignment[] = [
      { id: 'a1', competencyTags: [{ competencyId: 'g10-ham-so-bac-hai' }, { competencyId: 'g10-vecto-va-phep-toan' }] },
    ];
    const inputs = buildEvidenceInputs([sub({ feedback: 'tốt' })], assignments);
    expect(inputs).toHaveLength(2);
    expect(inputs.map(i => i.competencyId)).toEqual(['g10-ham-so-bac-hai', 'g10-vecto-va-phep-toan']);
    expect(inputs[0]).toMatchObject({ assignmentId: 'a1', score: 8, maxScore: 10, approved: true, feedback: 'tốt' });
  });

  it('bỏ bài không có assignmentId hoặc bài giao không nhãn', () => {
    const assignments: PortfolioAssignment[] = [{ id: 'a1', competencyTags: [] }, { id: 'a2' }];
    const inputs = buildEvidenceInputs([
      sub({ assignmentId: '' }),
      sub({ assignmentId: 'a1' }),
      sub({ assignmentId: 'a2' }),
      sub({ assignmentId: 'khong-co-bai-giao' }),
    ], assignments);
    expect(inputs).toEqual([]);
  });
});

describe('buildStudentCompetencyPortfolio', () => {
  const assignments: PortfolioAssignment[] = [
    { id: 'a1', competencyTags: [{ competencyId: 'g10-ham-so-bac-hai' }] },
  ];

  it('liệt kê ĐỦ khung khối, nhóm theo mảng, điền mức chỗ có minh chứng', () => {
    const areas = buildStudentCompetencyPortfolio(10, [sub({ score: 9, maxScore: 10 })], assignments);
    const rowCount = areas.reduce((sum, area) => sum + area.rows.length, 0);
    expect(rowCount).toBe(competenciesByGrade(10).length); // đủ khung, kể cả chưa có minh chứng

    const filled = areas.flatMap(a => a.rows).find(r => r.competency.id === 'g10-ham-so-bac-hai');
    expect(filled?.result?.level).toBe('Xuất sắc');

    const empty = areas.flatMap(a => a.rows).find(r => r.competency.id === 'g10-vecto-va-phep-toan');
    expect(empty?.result).toBeNull();
  });

  it('bài CHƯA duyệt không sinh mức (cổng approved của aggregate)', () => {
    const areas = buildStudentCompetencyPortfolio(10, [sub({ approved: false })], assignments);
    const row = areas.flatMap(a => a.rows).find(r => r.competency.id === 'g10-ham-so-bac-hai');
    expect(row?.result).toBeNull();
  });

  it('nhóm mảng giữ thứ tự xuất hiện trong khung, không trùng', () => {
    const areas = buildStudentCompetencyPortfolio(10, [], assignments);
    const names = areas.map(a => a.area);
    expect(new Set(names).size).toBe(names.length);
    expect(names[0]).toBe(competenciesByGrade(10)[0].area);
  });
});

describe('portfolioProgress', () => {
  it('đếm số năng lực đã có mức trên tổng khung', () => {
    const assignments: PortfolioAssignment[] = [{ id: 'a1', competencyTags: [{ competencyId: 'g10-ham-so-bac-hai' }] }];
    const areas = buildStudentCompetencyPortfolio(10, [sub()], assignments);
    expect(portfolioProgress(areas)).toEqual({ assessed: 1, total: competenciesByGrade(10).length });
  });
});
