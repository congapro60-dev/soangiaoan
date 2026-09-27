import { describe, expect, it } from 'vitest';
import { collectHomeworkMistakes, collectPracticeMistakes, recentPracticeQuestions, repairLatexEscapes } from './practiceBasis';
import type { QuestionResult } from './types';

const qr = (over: Partial<QuestionResult>): QuestionResult => ({
  questionNumber: 'Câu 1', status: 'incorrect', score: 0, maxScore: 1, studentAnswer: '', expectedAnswer: '',
  errorType: 'Sai dấu', explanation: 'Chuyển vế quên đổi dấu', correction: 'Đổi dấu', nextPractice: '', needsTeacherReview: false, ...over,
});

describe('căn cứ bài luyện', () => {
  it('lấy lỗi câu sai/đúng một phần, mới nhất trước, gộp lỗi trùng, bỏ câu đúng/bỏ qua theo lệnh GV', () => {
    const mistakes = collectHomeworkMistakes([
      { assignmentId: 'a1', createdAt: '2026-09-10T02:00:00Z', status: 'graded', grade: { questionResults: [qr({ questionNumber: 'Câu 3' })] } as never },
      {
        assignmentId: 'a2', createdAt: '2026-09-18T02:00:00Z', status: 'graded', grade: { questionResults: [
          qr({ questionNumber: 'Câu 2' }),
          qr({ questionNumber: 'Câu 4', status: 'partially_correct', errorType: 'Thiếu điều kiện', explanation: 'Quên ĐKXĐ' }),
          qr({ questionNumber: 'Câu 5', status: 'correct' }),
          qr({ questionNumber: 'Câu 6', ignoredByTeacherInstruction: true, errorType: 'Khác', explanation: 'x' }),
        ] } as never,
      },
      { assignmentId: 'a3', createdAt: '2026-09-20T02:00:00Z', status: 'grading', grade: { questionResults: [qr({ errorType: 'Chưa chấm xong' })] } as never },
    ], id => ({ a1: 'BTVN Hình', a2: 'BTVN Đại số' }[id] ?? ''));
    expect(mistakes.map(m => m.source)).toEqual(['BTVN Đại số 18/9/2026 · Câu 2', 'BTVN Đại số 18/9/2026 · Câu 4']);
    expect(mistakes[1]).toMatchObject({ errorType: 'Thiếu điều kiện', explanation: 'Quên ĐKXĐ' });
  });

  it('lượt luyện trước: chỉ câu chưa trọn điểm, kèm đề câu đó; chưa chấm thì bỏ', () => {
    const key = { questions: [{ id: 'q1', question: 'Giải $x+1=3$', hint: '', expectedAnswer: '2', maxScore: 1 }, { id: 'q2', question: 'Tính $2^3$', hint: '', expectedAnswer: '8', maxScore: 1 }] };
    const attempt = { status: 'graded' as const, questionResults: [{ id: 'q1', score: 1, maxScore: 1, feedback: 'Đúng' }, { id: 'q2', score: 0, maxScore: 1, feedback: 'Nhầm lũy thừa với nhân' }] };
    expect(collectPracticeMistakes(attempt, key)).toEqual([expect.objectContaining({ source: 'Lượt luyện trước · Câu 2', explanation: 'Tính $2^3$ — Nhầm lũy thừa với nhân' })]);
    expect(collectPracticeMistakes({ ...attempt, status: 'error' }, key)).toEqual([]);
  });

  it('câu hỏi các đề gần nhất để cấm lặp, mới nhất trước', () => {
    const sets = [
      { createdAt: '2026-09-01', questions: [{ id: 'q1', question: 'Cũ nhất', hint: '' }] },
      { createdAt: '2026-09-20', questions: [{ id: 'q1', question: 'Mới nhất', hint: '' }] },
      { createdAt: '2026-09-10', questions: [{ id: 'q1', question: 'Giữa', hint: '' }] },
    ];
    expect(recentPracticeQuestions(sets, 2)).toEqual(['Mới nhất', 'Giữa']);
  });

  it('sửa \\frac/\\times/\\neq thiếu gạch chéo nhưng không đụng \\n thật, \\\\frac đã đúng, hay \\n trước chữ Việt', () => {
    const fixed = repairLatexEscapes('"$\\frac{1}{2}\\times 3 \\neq 1$\\nTa có\\n\\nếu \\\\frac"');
    expect(JSON.parse(fixed)).toBe('$\\frac{1}{2}\\times 3 \\neq 1$\nTa có\n\nếu \\frac');
  });
});
