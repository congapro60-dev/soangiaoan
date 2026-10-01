import type { AnswerKeyFix, QuestionResult, QuestionResultStatus } from './types.js';

/**
 * Chấm lại TẤT ĐỊNH các câu khách quan — không gọi AI, không tốn tiền, không "mỗi lần một kiểu".
 *
 * Dùng ở ba chỗ:
 *  1. Thầy cô sửa "Em làm" / "Đáp án" của một câu trong hộp Sửa điểm → điểm câu tự tính lại.
 *  2. Thầy cô sửa đáp án một câu cho CẢ LỚP → mọi bài đã chấm được tính lại câu đó.
 *  3. Sau mỗi lượt AI chấm: áp đáp án thầy cô đã sửa, giữ nguyên câu thầy cô đã soát tay.
 *
 * Nguyên tắc an toàn: chỉ nhận dạng khi chữ ĐÚNG KHUÔN (một chữ cái, bộ a–d Đ/S, một con số).
 * Không nhận ra thì trả null và để người chấm — đoán sai ở đây là đổi điểm của em một cách âm thầm.
 */

export type ObjectiveAnswer =
  | { kind: 'mcq'; choice: string }
  | { kind: 'true_false'; items: Record<string, boolean> }
  | { kind: 'true_false_single'; value: boolean }
  | { kind: 'numeric'; value: number };

/** Thang Đúng/Sai của đề thi THPT: số ý đúng trong câu 4 ý → phần điểm của câu. */
export const THPT_TRUE_FALSE_FRACTION = [0, 0.1, 0.25, 0.5, 1] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const LABEL = /^(?:em chọn|chọn|đáp án|đáp số|kết quả|trả lời)\s*[:\-–]?\s*/i;
const BLANK = /^(?:|-|—|\.\.\.|bỏ trống|để trống|không làm|chưa làm|không trả lời|chưa trả lời|không có)$/i;

const clean = (text: string): string => text
  .replace(/\$/g, '')
  .replace(/\\text\{([^}]*)\}/g, '$1')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(LABEL, '')
  .trim();

export const isBlankAnswer = (text: string): boolean => BLANK.test(clean(text).replace(/[.\s]+$/, ''));

/** "C", "C.", "(C)", "C. $x=2$", "Đáp án C". Đáp án chuẩn phải viết hoa; bài em được viết thường. */
const parseMcq = (text: string, lenient: boolean): string | null => {
  const t = clean(text);
  const m = t.match(lenient
    ? /^\(?([A-Da-d])\)?(?:\s*[.:)]\s*.*)?$/s
    : /^\(?([A-D])\)?(?:\s*[.:)]\s*.*)?$/s);
  return m ? m[1].toUpperCase() : null;
};

const TF_PAIR = /(?<![a-zà-ỹ])([a-d])\s*[).:,\-–]?\s*(đúng|sai|đ|s)(?![a-zà-ỹ0-9])/g;
const TF_LEFTOVER = /^(?:câu\s*\d+\s*[:.)\-–]?)?[\s;,.|/\-–:]*$/;

/** "a) Đ; b) S; c) Đ; d) S" — phần còn lại sau khi bóc các cặp chỉ được là dấu ngăn cách. */
const parseTrueFalseItems = (text: string): Record<string, boolean> | null => {
  const t = clean(text).toLowerCase();
  const items: Record<string, boolean> = {};
  const leftover = t.replace(TF_PAIR, (_all, letter: string, value: string) => {
    items[letter] = value === 'đúng' || value === 'đ';
    return ' ';
  });
  if (!TF_LEFTOVER.test(leftover)) return null;
  return items;
};

const parseTrueFalseSingle = (text: string): boolean | null => {
  const t = clean(text).toLowerCase().replace(/[.\s]+$/, '');
  if (t === 'đúng' || t === 'đ') return true;
  if (t === 'sai' || t === 's') return false;
  return null;
};

const NUMBER = /^-?\d+(?:[.,]\d+)?$/;
const FRACTION = /^(-?\d+)\/(\d+)$/;
const LATEX_FRACTION = /^(-)?\\[dt]?frac\{(-?\d+)\}\{(\d+)\}$/;

/** Một con số: "-1,5", "0.25", "3/4", "\frac{3}{4}". Bài em được phép có "x = " ở trước. */
const parseNumber = (text: string, lenient: boolean): number | null => {
  let t = clean(text).replace(/−/g, '-').replace(/\s+/g, '');
  if (lenient) t = t.replace(/^[a-zA-Z]\w*=/, '');
  if (NUMBER.test(t)) return Number(t.replace(',', '.'));
  const f = t.match(FRACTION);
  if (f && Number(f[2]) !== 0) return Number(f[1]) / Number(f[2]);
  const lf = t.match(LATEX_FRACTION);
  if (lf && Number(lf[3]) !== 0) return (lf[1] ? -1 : 1) * Number(lf[2]) / Number(lf[3]);
  return null;
};

/** Nhận dạng câu khách quan từ ĐÁP ÁN (khuôn chặt). Không khớp khuôn nào → câu tự luận → null. */
export const parseExpectedAnswer = (text: string): ObjectiveAnswer | null => {
  if (!text || !text.trim()) return null;
  const choice = parseMcq(text, false);
  if (choice) return { kind: 'mcq', choice };
  const items = parseTrueFalseItems(text);
  if (items && Object.keys(items).length >= 2) return { kind: 'true_false', items };
  const single = parseTrueFalseSingle(text);
  if (single !== null) return { kind: 'true_false_single', value: single };
  const value = parseNumber(text, false);
  if (value !== null) return { kind: 'numeric', value };
  return null;
};

export interface ObjectiveScore {
  /** Phần điểm 0..1 của câu. */
  fraction: number;
  /** Mô tả ngắn để ghi vào ô "Vì sao". */
  detail: string;
}

/**
 * Chấm một câu khách quan. null khi đáp án không phải khuôn khách quan, hoặc bài em không đọc
 * được theo khuôn (VD "Không đọc rõ", "B hoặc D") — những câu đó để người chấm.
 */
export const scoreObjective = (expectedAnswer: string, studentAnswer: string): ObjectiveScore | null => {
  const expected = parseExpectedAnswer(expectedAnswer);
  if (!expected) return null;
  const blank = isBlankAnswer(studentAnswer);

  if (expected.kind === 'mcq') {
    if (blank) return { fraction: 0, detail: `em bỏ trống, đáp án đúng là ${expected.choice}` };
    const choice = parseMcq(studentAnswer, true);
    if (!choice) return null;
    return choice === expected.choice
      ? { fraction: 1, detail: `em chọn ${choice}, đúng đáp án` }
      : { fraction: 0, detail: `em chọn ${choice}, đáp án đúng là ${expected.choice}` };
  }

  if (expected.kind === 'true_false') {
    const letters = Object.keys(expected.items).sort();
    const student = blank ? {} : parseTrueFalseItems(studentAnswer);
    if (!student) return null;
    const right = letters.filter(l => student[l] === expected.items[l]);
    const wrong = letters.filter(l => !right.includes(l));
    const fraction = letters.length === 4
      ? THPT_TRUE_FALSE_FRACTION[right.length]
      : right.length / letters.length;
    return {
      fraction,
      detail: wrong.length === 0
        ? `em đúng cả ${letters.length} ý`
        : `em đúng ${right.length}/${letters.length} ý, chưa đúng ý ${wrong.join(', ')}`,
    };
  }

  if (expected.kind === 'true_false_single') {
    const want = expected.value ? 'Đúng' : 'Sai';
    if (blank) return { fraction: 0, detail: `em bỏ trống, đáp án là ${want}` };
    const value = parseTrueFalseSingle(studentAnswer);
    if (value === null) return null;
    return value === expected.value
      ? { fraction: 1, detail: `em chọn ${want}, đúng đáp án` }
      : { fraction: 0, detail: `em chọn ${value ? 'Đúng' : 'Sai'}, đáp án là ${want}` };
  }

  if (blank) return { fraction: 0, detail: 'em bỏ trống' };
  const value = parseNumber(studentAnswer, true);
  if (value === null) return null;
  return Math.abs(value - expected.value) < 1e-9
    ? { fraction: 1, detail: 'em ra đúng kết quả' }
    : { fraction: 0, detail: `em ra ${clean(studentAnswer)}, đáp án là ${clean(expectedAnswer)}` };
};

const statusFor = (fraction: number, studentAnswer: string): QuestionResultStatus => {
  if (fraction >= 1) return 'correct';
  if (fraction > 0) return 'partially_correct';
  return isBlankAnswer(studentAnswer) ? 'not_attempted' : 'incorrect';
};

/**
 * Tính lại một câu khách quan và viết lại phần giải thích cho khớp điểm mới — để nguyên lời
 * giải thích cũ ("em chọn A, sai") cạnh điểm mới "đúng" là bảng câu tự mâu thuẫn trước mắt em.
 * null nếu không chấm tất định được.
 */
export const rescoreQuestion = (
  q: QuestionResult,
  by: 'teacher' | 'machine',
): QuestionResult | null => {
  if (q.ignoredByTeacherInstruction) return null;
  const result = scoreObjective(q.expectedAnswer, q.studentAnswer);
  if (!result) return null;
  const score = round2(q.maxScore * result.fraction);
  const status = statusFor(result.fraction, q.studentAnswer);
  if (score === q.score && status === q.status) return q;
  const who = by === 'teacher' ? 'Thầy cô đã soát lại' : 'Máy đối chiếu đáp án';
  return {
    ...q,
    score,
    status,
    errorType: status === 'correct' ? 'Không có' : status === 'not_attempted' ? 'Chưa trả lời' : 'Chọn chưa đúng đáp án',
    explanation: `${who}: ${result.detail}.`,
    correction: status === 'correct' ? '' : q.correction,
    nextPractice: status === 'correct' ? '' : q.nextPractice,
  };
};

/**
 * Điểm tổng sau khi bảng câu đổi. Bảng câu đủ thang (tổng điểm tối đa các câu = thang bài) thì
 * tổng = cộng các câu. AI có quy đổi thang (VD câu cộng lại 20, bài chấm trên 10) thì cộng phần
 * chênh theo đúng tỉ lệ quy đổi đó, không bẻ thang của cả bài.
 */
export const recomputeTotal = (
  grade: { score: number; maxScore: number; questionResults?: QuestionResult[] },
  nextRows: QuestionResult[],
): number => {
  const sum = (rows: QuestionResult[]) => rows.reduce((s, q) => s + (Number.isFinite(q.score) ? q.score : 0), 0);
  const rowMax = nextRows.reduce((s, q) => s + (Number.isFinite(q.maxScore) ? q.maxScore : 0), 0);
  if (rowMax > 0 && Math.abs(rowMax - grade.maxScore) <= 0.01) {
    return clamp(round2(sum(nextRows)), 0, grade.maxScore);
  }
  const delta = sum(nextRows) - sum(grade.questionResults || []);
  if (Math.abs(delta) < 1e-9) return grade.score;
  const ratio = rowMax > 0 ? grade.maxScore / rowMax : 1;
  return clamp(round2(grade.score + delta * ratio), 0, grade.maxScore);
};

/** "Câu 3", "câu 3.", "Câu  3" là một câu; "Phần I – Câu 3" khác "Câu 3" (khác phần). */
export const questionKey = (questionNumber: string): string => questionNumber
  .normalize('NFC')
  .toLocaleLowerCase('vi-VN')
  .replace(/[\s.:()\-–—,;]+/g, '');

export interface FixOutcome {
  rows: QuestionResult[];
  /** Có câu nào đổi (đáp án, điểm hoặc cờ soát). */
  changed: boolean;
  /** Câu đã đổi đáp án nhưng không chấm tất định được (tự luận / bài em không theo khuôn). */
  needsReview: number;
}

/** Áp đáp án thầy cô đã sửa vào bảng câu của một bài, chấm lại tất định những câu làm được. */
export const applyAnswerKeyFixes = (rows: QuestionResult[], fixes: AnswerKeyFix[] | undefined): FixOutcome => {
  if (!fixes || fixes.length === 0) return { rows, changed: false, needsReview: 0 };
  const byKey = new Map(fixes.map(f => [questionKey(f.questionNumber), f.expectedAnswer]));
  let changed = false;
  let needsReview = 0;
  const next = rows.map(q => {
    const expectedAnswer = byKey.get(questionKey(q.questionNumber));
    if (expectedAnswer === undefined || expectedAnswer.trim() === q.expectedAnswer.trim()) return q;
    changed = true;
    const withKey = { ...q, expectedAnswer };
    const rescored = rescoreQuestion(withKey, 'teacher');
    if (rescored) return { ...rescored, needsTeacherReview: false };
    needsReview += 1;
    return { ...withKey, needsTeacherReview: true };
  });
  return { rows: next, changed, needsReview };
};

/**
 * Chấm lại bằng AI KHÔNG được xoá công soát tay của thầy cô: câu nào thầy cô đã sửa ở lần trước
 * thì giữ nguyên câu đó, chỉ nhận kết quả mới cho các câu còn lại.
 */
export const keepTeacherEditedRows = (rows: QuestionResult[], previous: QuestionResult[] | undefined): QuestionResult[] => {
  const locked = new Map((previous || []).filter(q => q.teacherEdited).map(q => [questionKey(q.questionNumber), q]));
  if (locked.size === 0) return rows;
  return rows.map(q => locked.get(questionKey(q.questionNumber)) || q);
};

/**
 * Hậu kiểm một lượt AI chấm: (1) trắc nghiệm và Đúng/Sai 4 ý tính lại theo đáp án — máy cộng
 * không nhầm, và Đúng/Sai theo đúng thang THPT; (2) áp đáp án đã sửa; (3) giữ câu thầy cô đã soát.
 * Trả lời ngắn / Đúng-Sai một ý KHÔNG tự tính ở đây vì bài tự luận hay có đáp số dạng một con số
 * mà vẫn đáng điểm cách làm — chỉ tính khi thầy cô chủ động sửa.
 */
export const reconcileAiGrade = <G extends { score: number; maxScore: number; questionResults?: QuestionResult[] }>(
  grade: G,
  fixes: AnswerKeyFix[] | undefined,
  previousRows: QuestionResult[] | undefined,
): G => {
  const rows = grade.questionResults || [];
  if (rows.length === 0) return grade;
  const machine = rows.map(q => {
    const expected = parseExpectedAnswer(q.expectedAnswer);
    const auto = expected?.kind === 'mcq'
      || (expected?.kind === 'true_false' && Object.keys(expected.items).length === 4);
    return auto ? rescoreQuestion(q, 'machine') || q : q;
  });
  const fixed = applyAnswerKeyFixes(machine, fixes).rows;
  const final = keepTeacherEditedRows(fixed, previousRows);
  if (final.every((q, i) => q === rows[i])) return grade;
  return { ...grade, questionResults: final, score: recomputeTotal(grade, final) };
};
