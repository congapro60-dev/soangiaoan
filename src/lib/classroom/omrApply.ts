import { parseExpectedAnswer, recomputeTotal, rescoreQuestion } from './questionRescore.js';
import type { OmrSheetResult, QuestionResult } from './types.js';

/**
 * Dùng kết quả MÁY DÒ PHIẾU TÔ thay cho chữ AI đọc ở các câu tô (Phần I A–D, Phần II Đúng/Sai,
 * Phần III tô số), rồi chấm tất định theo đáp án. Câu tự luận giữ nguyên bài chấm của AI.
 *
 * Ghép câu: có nhãn "Phần I/II/III" thì theo số câu; không có nhãn thì theo thứ tự xuất hiện của
 * từng loại câu (câu A–D thứ k ↔ ô Phần I câu k). Loại câu lấy từ ĐÁP ÁN, nên nhãn phần sai loại → bỏ qua.
 * Máy dò chưa chắc → giữ chữ AI đọc nhưng gắn cờ GV soát; không bao giờ đoán.
 */

const CONFIDENT = 0.9;
const PART = /phần\s*(iii|ii|i|3|2|1)\b/i;

const partOf = (label: string): 1 | 2 | 3 | null => {
  const m = PART.exec(label.normalize('NFC'));
  if (!m) return null;
  return ({ i: 1, '1': 1, ii: 2, '2': 2, iii: 3, '3': 3 } as const)[m[1].toLowerCase() as 'i'];
};

const numberOf = (label: string): number | null => {
  const m = /câu\s*(\d+)/i.exec(label.normalize('NFC')) || /^\s*(\d+)\s*[.)]?\s*$/.exec(label);
  return m ? Number(m[1]) : null;
};

type Kind = 1 | 2 | 3;
const kindOf = (row: QuestionResult): Kind | null => {
  const expected = parseExpectedAnswer(row.expectedAnswer);
  if (expected?.kind === 'mcq') return 1;
  if (expected?.kind === 'true_false' && Object.keys(expected.items).length === 4) return 2;
  if (expected?.kind === 'numeric') return 3;
  return null;
};

/** Chữ "Em làm" theo đúng khuôn mà bộ chấm tất định hiểu; '' = bỏ trống; null = máy dò chưa chắc. */
const answerFor = (sheet: OmrSheetResult, kind: Kind, n: number): string | null => {
  if (kind === 1) {
    const d = sheet.mcq.find(x => x.q === n);
    return d && d.confidence >= CONFIDENT ? d.answer || '' : null;
  }
  if (kind === 2) {
    const d = sheet.trueFalse.find(x => x.q === n);
    if (!d || d.confidence < CONFIDENT) return null;
    return (['a', 'b', 'c', 'd'] as const).filter(s => d.items[s]).map(s => `${s}) ${d.items[s]}`).join('; ');
  }
  const d = sheet.shortAnswer.find(x => x.q === n);
  return d && d.confidence >= CONFIDENT ? d.answer || '' : null;
};

export interface OmrApplied<G> { grade: G; applied: number; uncertain: number }

export const applyOmrSheet = <G extends { score: number; maxScore: number; questionResults?: QuestionResult[] }>(
  grade: G,
  sheet: OmrSheetResult,
): OmrApplied<G> => {
  const rows = grade.questionResults || [];
  const ordinal: Record<Kind, number> = { 1: 0, 2: 0, 3: 0 };
  let applied = 0, uncertain = 0;
  const next = rows.map(row => {
    const kind = kindOf(row);
    if (!kind) return row;
    ordinal[kind] += 1;
    if (row.teacherEdited || row.ignoredByTeacherInstruction) return row;
    // Phiếu 10–11: Phần III là tự luận viết tay, không có ô tô số để dò.
    if (kind === 3 && sheet.form === 'k1011') return row;
    const part = partOf(row.questionNumber);
    if (part !== null && part !== kind) return row;
    const n = part !== null ? numberOf(row.questionNumber) : ordinal[kind];
    if (!n) return row;
    const answer = answerFor(sheet, kind, n);
    if (answer === null) { uncertain += 1; return { ...row, needsTeacherReview: true }; }
    applied += 1;
    const base: QuestionResult = { ...row, studentAnswer: answer, confidence: 1, needsTeacherReview: false };
    return rescoreQuestion(base, 'machine') || { ...base, needsTeacherReview: true };
  });
  if (applied === 0 && uncertain === 0) return { grade, applied, uncertain };
  return { grade: { ...grade, questionResults: next, score: recomputeTotal(grade, next) }, applied, uncertain };
};
