import { describe, expect, it, vi } from 'vitest';
vi.mock('../firebase', () => ({ auth: {} }));
import { summarizeBenchmark, type BenchmarkTruth } from './modelBenchmark';

const truth = (id: string, score: number, rows: [string, number][]): BenchmarkTruth => ({
  id, assignmentId: 'a', studentId: 's', examCode: null, score, maxScore: 10, approved: true, editedByTeacher: false, files: 1,
  rows: rows.map(([q, s]) => ({ q, score: s, maxScore: 1, teacherEdited: false })),
});

describe('tóm tắt đo model', () => {
  it('lệch điểm theo thang 10, số câu lệch, số câu gắn cờ, tiền mỗi bài; lượt lỗi tính riêng', () => {
    const t = [truth('x', 8, [['Câu 1', 1], ['Câu 2', 0.5]]), truth('y', 5, [['Câu 1', 0]])];
    const out = summarizeBenchmark(t, [
      { submissionId: 'x', run: { ok: true, model: 'm', ms: 20000, score: 7.5, maxScore: 10, rows: [{ q: 'Câu 1', score: 1, maxScore: 1, status: 'correct', review: false }, { q: 'câu 2', score: 0, maxScore: 1, status: 'incorrect', review: true }], usage: [{ model: 'm', inputTokens: 1, outputTokens: 1, thoughtsTokens: 0, costUsd: 0.001 }] } },
      { submissionId: 'y', run: { ok: true, model: 'm', ms: 40000, score: 5, maxScore: 10, rows: [{ q: 'Câu 1', score: 0, maxScore: 1, status: 'incorrect', review: false }], usage: [{ model: 'm', inputTokens: 1, outputTokens: 1, thoughtsTokens: 0, costUsd: null }] } },
      { submissionId: 'y', run: { ok: false, model: 'n', ms: 1000, error: 'hết hạn' } },
    ]);
    expect(out[0]).toMatchObject({ model: 'm', runs: 2, failed: 0, meanAbsDiff10: 0.25, maxAbsDiff10: 0.5, within025: 0.5, rowMismatchPerSubmission: 0.5, flaggedPerSubmission: 0.5, costUsdPerSubmission: 0.0005, costPartial: true, avgSeconds: 30 });
    expect(out[1]).toMatchObject({ model: 'n', runs: 1, failed: 1, meanAbsDiff10: null });
  });
});
