import { describe, expect, it } from 'vitest';
import { attachWorkedSolutions, parseWorkedSolutions, buildWorkedSolutionsPrompt } from './workedSolutions';
const input = { answerKey: 'Câu 1: B', assignmentText: 'Câu 1. Tính 1+1.', maxScore: 1,
  questions: [{ questionNumber: 'Câu 1', expectedAnswer: 'B' }] };
it('requires all source questions, rejects fabricated rows, never substitutes an answer for a solution', () => {
  const cache = parseWorkedSolutions(JSON.stringify({ questions: [{ questionNumber: 'Câu 1', workedSolution: 'Ta cộng hai đơn vị: $1+1=2$. Chọn B.', status: 'ready' }] }), input, 'v', 'now');
  expect(cache.status).toBe('ready');
  expect(() => parseWorkedSolutions('{"questions":[{"questionNumber":"Câu 99","workedSolution":"bịa","status":"ready"}]}', input, 'v', 'now')).toThrow();
  expect(parseWorkedSolutions('{"questions":[]}', input, 'v', 'now').status).toBe('incomplete');
});
it('true-false requires conclusion and reasoning for all four subitems', () => {
  const tf = { ...input, questions: [{ questionNumber: 'Câu 1', expectedAnswer: 'a) Đ; b) S; c) Đ; d) S' }] };
  expect(parseWorkedSolutions(JSON.stringify({ questions: [{ questionNumber: 'Câu 1', workedSolution: 'a) Đúng vì x=1.', status: 'ready' }] }), tf, 'v', 'now').status).toBe('incomplete');
  const workedSolution = ['a', 'b', 'c', 'd'].map(l => `${l}) **${['a', 'c'].includes(l) ? 'Đúng' : 'Sai'}.** Vì thay số vào biểu thức được kết quả tương ứng.`).join('\n\n');
  expect(parseWorkedSolutions(JSON.stringify({ questions: [{ questionNumber: 'Câu 1', workedSolution, status: 'ready' }] }), tf, 'v', 'now').status).toBe('ready');
  expect(buildWorkedSolutionsPrompt(tf)).toContain('a), b), c), d)');
});
it('attaches cached solution without touching grades; invalidates stale versions; keeps same-version teacher edits', () => {
  const row = { questionNumber: 'Câu 1', status: 'correct' as const, score: 1, maxScore: 1, studentAnswer: 'B', expectedAnswer: 'B',
    errorType: '', explanation: 'Nhận xét riêng', correction: '', nextPractice: '', needsTeacherReview: false };
  const cache = { version: 'v', generatedAt: 'now', status: 'ready' as const, questions: [{ questionNumber: 'Câu 1', workedSolution: 'Lời giải chung', status: 'ready' as const }] };
  const attached = attachWorkedSolutions([row], cache, 'v')[0];
  expect(attached).toMatchObject({ score: 1, explanation: 'Nhận xét riêng', workedSolution: 'Lời giải chung', workedSolutionVersion: 'v' });
  expect(attachWorkedSolutions([{ ...attached, teacherEdited: true, workedSolution: 'GV sửa' }], cache, 'v')[0].workedSolution).toBe('GV sửa');
  expect(attachWorkedSolutions([attached], cache, 'new')[0]).not.toHaveProperty('workedSolution');
});

it('accepts indented uppercase true-false headings while preserving verdict validation', () => {
 const tf = { ...input, questions: [{ questionNumber: 'Câu 1', expectedAnswer: 'a) Đ; b) S; c) Đ; d) S' }] };
 const workedSolution = ['A','B','C','D'].map(l => `  ${l}) **${['A','C'].includes(l) ? 'Đúng' : 'Sai'}.** Vì thay số vào biểu thức được kết quả tương ứng.`).join('\n\n');
 expect(parseWorkedSolutions(JSON.stringify({ questions: [{ questionNumber: 'Câu 1', workedSolution, status: 'ready' }] }), tf, 'v', 'now').status).toBe('ready');
});

it('keeps a freshly generated solution stamped with the current source version when no shared cache exists', () => {
 const row = { questionNumber: 'Câu 1', status: 'correct' as const, score: 1, maxScore: 1, studentAnswer: 'B', expectedAnswer: 'B', errorType: '', explanation: '', correction: '', nextPractice: '', needsTeacherReview: false, workedSolution: 'Lập luận mới từ đúng phiên đề.', workedSolutionVersion: 'v', workedSolutionStatus: 'ready' as const };
 expect(attachWorkedSolutions([row], undefined, 'v')[0].workedSolution).toBe(row.workedSolution);
 expect(attachWorkedSolutions([row], undefined, 'changed')[0].workedSolution).toBeUndefined();
});
