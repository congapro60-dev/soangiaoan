import { describe, expect, it } from 'vitest';
import type { QuestionResult } from './types';
import {
  applyAnswerKeyFixes,
  keepTeacherEditedRows,
  parseExpectedAnswer,
  questionKey,
  recomputeTotal,
  reconcileAiGrade,
  rescoreQuestion,
  scoreObjective,
} from './questionRescore';

const q = (over: Partial<QuestionResult>): QuestionResult => ({
  questionNumber: 'Câu 1',
  status: 'incorrect',
  score: 0,
  maxScore: 1,
  studentAnswer: '',
  expectedAnswer: '',
  errorType: 'Sai',
  explanation: 'cũ',
  correction: 'sửa cũ',
  nextPractice: 'luyện cũ',
  needsTeacherReview: false,
  ...over,
});

describe('parseExpectedAnswer', () => {
  it.each([
    ['C', 'mcq'],
    ['C.', 'mcq'],
    ['(B)', 'mcq'],
    ['Đáp án D', 'mcq'],
    ['A. $x = 2$', 'mcq'],
    ['a) Đ; b) S; c) Đ; d) S', 'true_false'],
    ['a, Đúng; b, Sai; c, Đúng; d, Đúng', 'true_false'],
    ['a)Đ b)S c)S d)Đ', 'true_false'],
    ['Sai', 'true_false_single'],
    ['Đ', 'true_false_single'],
    ['-1,5', 'numeric'],
    ['$0.25$', 'numeric'],
    ['3/4', 'numeric'],
    ['$\\frac{3}{4}$', 'numeric'],
  ])('%s → %s', (text, kind) => {
    expect(parseExpectedAnswer(text)?.kind).toBe(kind);
  });

  it.each([
    'A = 5',
    'a) S = 12 cm²; b) đường cao 4',
    'x = 2 hoặc x = 3',
    'Chứng minh được tam giác ABC cân',
    '',
    'c',
  ])('tự luận / không đúng khuôn → null: %s', text => {
    expect(parseExpectedAnswer(text)).toBeNull();
  });
});

describe('scoreObjective', () => {
  it('trắc nghiệm: đúng/sai/bỏ trống/không đọc được', () => {
    expect(scoreObjective('C', 'c')?.fraction).toBe(1);
    expect(scoreObjective('C', 'Em chọn B')?.fraction).toBe(0);
    expect(scoreObjective('C', 'Bỏ trống')?.fraction).toBe(0);
    expect(scoreObjective('C', 'Không đọc rõ')).toBeNull();
    expect(scoreObjective('C', 'B hoặc D')).toBeNull();
  });

  it.each([
    ['a) Đ; b) S; c) Đ; d) S', 0],
    ['a) S; b) S; c) Đ; d) S', 0.1],
    ['a) S; b) Đ; c) Đ; d) S', 0.25],
    ['a) S; b) Đ; c) Đ; d) Đ', 0.5],
    ['a) S; b) Đ; c) S; d) Đ', 1],
  ])('Đúng/Sai 4 ý theo thang THPT: %s → %s', (student, fraction) => {
    expect(scoreObjective('a) S; b) Đ; c) S; d) Đ', student)?.fraction).toBe(fraction);
  });

  it('Đúng/Sai: thiếu ý tính là sai ý đó, bỏ trống được 0', () => {
    expect(scoreObjective('a) S; b) Đ; c) S; d) Đ', 'a) S; b) Đ; c) S')?.fraction).toBe(0.5);
    expect(scoreObjective('a) S; b) Đ; c) S; d) Đ', '')?.fraction).toBe(0);
  });

  it('trả lời ngắn: so số, chấp nhận dấu phẩy và "x ="', () => {
    expect(scoreObjective('-1,5', '-1.5')?.fraction).toBe(1);
    expect(scoreObjective('0,75', '$\\frac{3}{4}$')?.fraction).toBe(1);
    expect(scoreObjective('2', 'x = 2')?.fraction).toBe(1);
    expect(scoreObjective('2', '3')?.fraction).toBe(0);
    expect(scoreObjective('2', 'ta có 2x = 4 nên x = 2')).toBeNull();
  });
});

describe('rescoreQuestion', () => {
  it('đổi điểm thì viết lại giải thích cho khớp, không để lời cũ mâu thuẫn', () => {
    const next = rescoreQuestion(q({ studentAnswer: 'C', expectedAnswer: 'C', score: 0, status: 'incorrect' }), 'teacher');
    expect(next).toMatchObject({ score: 1, status: 'correct', errorType: 'Không có', correction: '' });
    expect(next?.explanation).toContain('Thầy cô đã soát lại');
  });

  it('Đúng/Sai 2 ý đúng trên câu 1 điểm = 0,25 và là đúng một phần', () => {
    const next = rescoreQuestion(q({ studentAnswer: 'a) Đ; b) Đ; c) Đ; d) Đ', expectedAnswer: 'a) Đ; b) Đ; c) S; d) S' }), 'teacher');
    expect(next).toMatchObject({ score: 0.25, status: 'partially_correct' });
  });

  it('giữ nguyên câu không đổi và bỏ qua câu tự luận / câu GV dặn bỏ', () => {
    const same = q({ studentAnswer: 'C', expectedAnswer: 'C', score: 1, status: 'correct' });
    expect(rescoreQuestion(same, 'teacher')).toBe(same);
    expect(rescoreQuestion(q({ expectedAnswer: 'Chứng minh ...' }), 'teacher')).toBeNull();
    expect(rescoreQuestion(q({ expectedAnswer: 'C', studentAnswer: 'C', ignoredByTeacherInstruction: true }), 'teacher')).toBeNull();
  });
});

describe('recomputeTotal', () => {
  it('bảng câu đủ thang → tổng = cộng các câu', () => {
    const rows = [q({ score: 1, maxScore: 5 }), q({ questionNumber: 'Câu 2', score: 4, maxScore: 5 })];
    expect(recomputeTotal({ score: 3, maxScore: 10, questionResults: rows }, rows)).toBe(5);
  });

  it('AI quy đổi thang (câu cộng 20, bài trên 10) → cộng phần chênh theo tỉ lệ', () => {
    const before = [q({ score: 0, maxScore: 10 }), q({ questionNumber: 'Câu 2', score: 10, maxScore: 10 })];
    const after = [q({ score: 4, maxScore: 10 }), before[1]];
    expect(recomputeTotal({ score: 5, maxScore: 10, questionResults: before }, after)).toBe(7);
  });
});

describe('applyAnswerKeyFixes', () => {
  const fixes = [{ questionNumber: 'câu 2', expectedAnswer: 'B', fixedAt: 't' }];

  it('chấm lại câu khách quan theo đáp án mới; khớp tên câu bỏ qua hoa/thường, dấu chấm', () => {
    const rows = [q({}), q({ questionNumber: 'Câu 2.', studentAnswer: 'B', expectedAnswer: 'A', score: 0 })];
    const out = applyAnswerKeyFixes(rows, fixes);
    expect(out.changed).toBe(true);
    expect(out.rows[1]).toMatchObject({ expectedAnswer: 'B', score: 1, status: 'correct' });
    expect(out.rows[0]).toBe(rows[0]);
  });

  it('câu tự luận / bài em không theo khuôn → giữ điểm, gắn cờ cần soát', () => {
    const rows = [q({ questionNumber: 'Câu 2', studentAnswer: 'Không đọc rõ', expectedAnswer: 'A', score: 0.5 })];
    const out = applyAnswerKeyFixes(rows, fixes);
    expect(out.needsReview).toBe(1);
    expect(out.rows[0]).toMatchObject({ expectedAnswer: 'B', score: 0.5, needsTeacherReview: true });
  });

  it('không có câu khớp → không đổi', () => {
    const rows = [q({ questionNumber: 'Phần I - Câu 2', expectedAnswer: 'A' })];
    expect(applyAnswerKeyFixes(rows, fixes).changed).toBe(false);
    expect(questionKey('Phần I - Câu 2')).not.toBe(questionKey('Câu 2'));
  });
});

describe('reconcileAiGrade', () => {
  it('AI chấm Đúng/Sai sai thang → tính lại theo THPT; giữ câu GV đã soát; áp đáp án đã sửa', () => {
    const ai = {
      score: 2,
      maxScore: 3,
      questionResults: [
        q({ questionNumber: 'Câu 1', studentAnswer: 'a) Đ; b) Đ; c) S; d) S', expectedAnswer: 'a) Đ; b) Đ; c) Đ; d) Đ', score: 0.5 }),
        q({ questionNumber: 'Câu 2', studentAnswer: 'A', expectedAnswer: 'B', score: 0 }),
        q({ questionNumber: 'Câu 3', studentAnswer: 'D', expectedAnswer: 'D', score: 1, status: 'correct' }),
      ],
    };
    const previous = [q({ questionNumber: 'Câu 3', studentAnswer: 'C', expectedAnswer: 'D', score: 0, teacherEdited: true })];
    const out = reconcileAiGrade(ai, [{ questionNumber: 'Câu 2', expectedAnswer: 'A', fixedAt: 't' }], previous);
    expect(out.questionResults.map(r => r.score)).toEqual([0.25, 1, 0]);
    expect(out.questionResults[2].teacherEdited).toBe(true);
    expect(out.score).toBe(1.25);
  });

  it('không có gì đổi → trả nguyên bản, không đụng điểm AI', () => {
    const ai = { score: 7, maxScore: 10, questionResults: [q({ expectedAnswer: 'Chứng minh', score: 1 })] };
    expect(reconcileAiGrade(ai, undefined, undefined)).toBe(ai);
  });

  it('keepTeacherEditedRows chỉ thay câu trùng tên', () => {
    const rows = [q({ questionNumber: 'Câu 1', score: 0 })];
    expect(keepTeacherEditedRows(rows, [q({ questionNumber: 'Câu 9', teacherEdited: true })])).toEqual(rows);
  });
});
