import { describe, expect, it } from 'vitest';
import { aggregateCompetencies, levelForScore, type CompetencyEvidenceInput } from './competencyModel';

const ev = (over: Partial<CompetencyEvidenceInput>): CompetencyEvidenceInput => ({
  assignmentId: 'a1', competencyId: 'c1', score: 8, maxScore: 10, approved: true, submittedAt: '2026-09-01T00:00:00.000Z', ...over,
});

describe('levelForScore — ngưỡng mặc định', () => {
  it('map đúng 4 mức theo thang 10', () => {
    expect(levelForScore(9)).toBe('Xuất sắc');
    expect(levelForScore(8.9)).toBe('Tốt');
    expect(levelForScore(7)).toBe('Tốt');
    expect(levelForScore(6.9)).toBe('Đạt yêu cầu');
    expect(levelForScore(5)).toBe('Đạt yêu cầu');
    expect(levelForScore(4.9)).toBe('Chưa đạt yêu cầu');
  });

  it('theo ngưỡng tuỳ chỉnh', () => {
    expect(levelForScore(8, { xuatSac: 8, tot: 6, dat: 4 })).toBe('Xuất sắc');
  });
});

describe('aggregateCompetencies', () => {
  it('chỉ tính bài đã duyệt; bài chưa duyệt bị bỏ', () => {
    const res = aggregateCompetencies([
      ev({ competencyId: 'c1', score: 9, maxScore: 10, approved: true }),
      ev({ competencyId: 'c1', assignmentId: 'a2', score: 2, maxScore: 10, approved: false }),
    ]);
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ competencyId: 'c1', level: 'Xuất sắc', scoreOutOf10: 9 });
    expect(res[0].evidence).toHaveLength(1);
  });

  it('quy đổi điểm về thang 10 đúng (maxScore khác 10)', () => {
    const res = aggregateCompetencies([ev({ score: 4.25, maxScore: 5 })]); // 8.5/10
    expect(res[0].scoreOutOf10).toBe(8.5);
    expect(res[0].level).toBe('Tốt');
  });

  it('ưu tiên tối đa 3 bài gần nhất khi tính mức, nhưng giữ đủ minh chứng', () => {
    const res = aggregateCompetencies([
      ev({ assignmentId: 'old1', score: 2, maxScore: 10, submittedAt: '2026-08-01T00:00:00.000Z' }),
      ev({ assignmentId: 'r1', score: 9, maxScore: 10, submittedAt: '2026-09-10T00:00:00.000Z' }),
      ev({ assignmentId: 'r2', score: 10, maxScore: 10, submittedAt: '2026-09-11T00:00:00.000Z' }),
      ev({ assignmentId: 'r3', score: 8, maxScore: 10, submittedAt: '2026-09-12T00:00:00.000Z' }),
    ]);
    // 3 bài gần nhất: 8,10,9 -> TB 9.0 -> Xuất sắc; bài cũ điểm 2 không kéo tụt.
    expect(res[0].scoreOutOf10).toBe(9);
    expect(res[0].level).toBe('Xuất sắc');
    expect(res[0].evidence.map(e => e.assignmentId)).toEqual(['r3', 'r2', 'r1', 'old1']); // mới nhất trước
  });

  it('gộp theo từng năng lực, bỏ năng lực không có bài; maxScore<=0 bị loại', () => {
    const res = aggregateCompetencies([
      ev({ competencyId: 'cA', score: 6, maxScore: 10 }),
      ev({ competencyId: 'cB', assignmentId: 'b1', score: 3, maxScore: 0 }), // hỏng -> loại
    ]);
    expect(res.map(r => r.competencyId)).toEqual(['cA']);
    expect(res[0].level).toBe('Đạt yêu cầu');
  });

  it('điểm vượt/âm bị kẹp trong [0, maxScore]', () => {
    expect(aggregateCompetencies([ev({ score: 15, maxScore: 10 })])[0].scoreOutOf10).toBe(10);
    expect(aggregateCompetencies([ev({ score: -3, maxScore: 10 })])[0].scoreOutOf10).toBe(0);
  });
});
