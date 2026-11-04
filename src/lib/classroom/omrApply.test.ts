import { describe, expect, it } from 'vitest';
import { applyOmrSheet } from './omrApply';
import type { OmrSheetResult, QuestionResult } from './types';

const row = (questionNumber: string, expectedAnswer: string, maxScore: number, studentAnswer = 'AI đọc', over: Partial<QuestionResult> = {}): QuestionResult => ({
  questionNumber, expectedAnswer, studentAnswer, maxScore, score: 0, status: 'incorrect', errorType: '', explanation: '', correction: '', nextPractice: '', ...over,
} as QuestionResult);

const sheet = (over: Partial<OmrSheetResult> = {}): OmrSheetResult => ({
  form: 'k12', alignment: 1, examCode: '102', studentCode: null,
  mcq: [{ q: 1, answer: 'B', confidence: .95 }, { q: 2, answer: null, confidence: .95 }, { q: 3, answer: 'C', confidence: .5 }],
  trueFalse: [{ q: 1, items: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' }, confidence: .95 }, { q: 2, items: { a: 'Đ', b: null, c: null, d: 'S' }, confidence: .95 }],
  shortAnswer: [{ q: 1, answer: '-1,5', confidence: .95 }, { q: 2, answer: '20', confidence: .3 }],
  ...over,
});

describe('áp kết quả máy dò phiếu tô', () => {
  it('thay chữ AI đọc ở câu tô và chấm tất định; câu chưa chắc giữ chữ AI + cờ GV; tự luận không đụng', () => {
    const grade = { score: 0, maxScore: 4.75, questionResults: [
      row('Phần I – Câu 1', 'B', .25), row('Phần I – Câu 2', 'A', .25), row('Phần I – Câu 3', 'C', .25),
      row('Câu 1 (Phần II)', 'a) Đ; b) S; c) Đ; d) S', 1), row('Câu 2 (Phần II)', 'a) Đ; b) Đ; c) S; d) S', 1),
      row('Phần III – Câu 1', '-1,5', .5), row('Phần III – Câu 2', '20', .5),
      row('Bài 1', 'Lời giải tự luận dài…', 1, 'bài viết', { score: .75 }),
    ] };
    const { grade: out, applied, uncertain } = applyOmrSheet(grade, sheet());
    const by = (n: string) => out.questionResults!.find(q => q.questionNumber === n)!;
    expect(by('Phần I – Câu 1')).toMatchObject({ studentAnswer: 'B', score: .25, status: 'correct' });
    expect(by('Phần I – Câu 2')).toMatchObject({ studentAnswer: '', score: 0, status: 'not_attempted' });
    expect(by('Phần I – Câu 3')).toMatchObject({ studentAnswer: 'AI đọc', needsTeacherReview: true });
    expect(by('Câu 1 (Phần II)')).toMatchObject({ score: 1, status: 'correct' });
    expect(by('Câu 2 (Phần II)')).toMatchObject({ studentAnswer: 'a) Đ; d) S', score: .25 }); // 2/4 ý đúng → 0,25
    expect(by('Phần III – Câu 1')).toMatchObject({ studentAnswer: '-1,5', score: .5 });
    expect(by('Phần III – Câu 2')).toMatchObject({ needsTeacherReview: true });
    expect(by('Bài 1')).toMatchObject({ studentAnswer: 'bài viết', score: .75 });
    expect(out.score).toBe(2.75);
    expect([applied, uncertain]).toEqual([5, 2]);
  });

  it('không có nhãn phần: ghép theo thứ tự từng loại; câu GV đã sửa giữ nguyên; phiếu 10–11 không dò Phần III', () => {
    const grade = { score: 0, maxScore: 2, questionResults: [
      row('Câu 1', 'B', .5), row('Câu 2', 'A', .5, 'A', { teacherEdited: true, score: .5 }),
      row('Câu 13', 'a) Đ; b) S; c) Đ; d) S', .5), row('Câu 17', '-1,5', .5),
    ] };
    const { grade: out } = applyOmrSheet(grade, sheet({ form: 'k1011' }));
    expect(out.questionResults!.map(q => q.studentAnswer)).toEqual(['B', 'A', 'a) Đ; b) S; c) Đ; d) S', 'AI đọc']);
    expect(out.score).toBe(1.5);
  });

  it('nhãn phần mâu thuẫn với loại đáp án → không ghép', () => {
    const grade = { score: 0, maxScore: 1, questionResults: [row('Phần II – Câu 1', 'B', 1)] };
    expect(applyOmrSheet(grade, sheet())).toMatchObject({ applied: 0, uncertain: 0 });
  });
});
