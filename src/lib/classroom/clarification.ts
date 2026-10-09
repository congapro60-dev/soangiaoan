/**
 * LÀM RÕ VỚI HỌC SINH — thuần, dùng chung máy chủ và giao diện.
 *
 * Máy chấm xong bài học sinh tự nộp (ảnh chụp). Câu nào máy đọc chưa chắc thì HỎI LẠI chính học sinh thay vì
 * đẩy hết cho giáo viên: câu khách quan (trắc nghiệm / đúng-sai / trả lời ngắn) → em chọn hoặc gõ đáp án;
 * câu tự luận → em chụp lại đúng bài làm câu đó. Thầy cô vẫn thấy mọi thứ và soát được.
 *
 * Chống chép đáp án: câu còn chờ làm rõ KHÔNG được lộ đáp án đúng / giải thích / điểm cho học sinh.
 */
import { READ_CONFIDENCE_FLOOR } from './submissionSelection.js';
import { applyStudentTypedAnswer, parseExpectedAnswer } from './questionRescore.js';
import type { ClarifyKind, ClarifyState, QuestionClarify, QuestionResult } from './types.js';

/** Trường của lớp: giáo viên bật thì máy mới hỏi lại học sinh. Mặc định TẮT. */
export const CLARIFY_CLASS_FIELD = 'askStudentClarification';
export const clarifyEnabledFor = (classData: Record<string, unknown> | null | undefined): boolean =>
  classData?.[CLARIFY_CLASS_FIELD] === true;

/** Câu máy đọc chưa chắc: không đọc được, tự đánh dấu cần soát, hoặc độ chắc dưới ngưỡng (cùng tiêu chí `hasUncertainRead`). */
export const isUncertainQuestion = (q: QuestionResult): boolean =>
  q.ignoredByTeacherInstruction !== true
  && (q.status === 'unreadable'
    || q.needsTeacherReview === true
    || (typeof q.confidence === 'number' && q.confidence < READ_CONFIDENCE_FLOOR));

type Section = 'mcq' | 'true_false' | 'short' | 'essay' | null;

/** Phần của đề theo nhãn câu: "Phần I – Câu 3" (trắc nghiệm), "Phần II" (đúng-sai), "Phần III" (trả lời ngắn), "Tự luận". */
const sectionOf = (questionNumber: string): Section => {
  const t = questionNumber.normalize('NFC').toLocaleLowerCase('vi-VN');
  if (/phần\s*(?:iii|3)\b|trả\s*lời\s*ngắn/.test(t)) return 'short';
  if (/phần\s*(?:ii|2)\b|đúng\s*[-/–]?\s*sai/.test(t)) return 'true_false';
  if (/phần\s*(?:i|1)\b|trắc\s*nghiệm/.test(t)) return 'mcq';
  if (/tự\s*luận/.test(t)) return 'essay';
  return null;
};

/**
 * Cách làm rõ một câu. Dạng đáp án chuẩn đi trước (đáp án một chữ cái → chọn; bộ a–d Đ/S → đúng-sai; một con số →
 * gõ số — chủ dự án chốt cho gõ số cho tiện); không nhận ra thì xem nhãn phần của đề; vẫn không rõ → tự luận (chụp lại).
 */
export const clarifyKindFor = (q: QuestionResult): ClarifyKind => {
  const expected = parseExpectedAnswer(q.expectedAnswer);
  if (expected?.kind === 'mcq') return 'mcq';
  if (expected?.kind === 'true_false' || expected?.kind === 'true_false_single') return 'true_false';
  if (expected?.kind === 'numeric') return 'short';
  const section = sectionOf(q.questionNumber);
  if (section === 'mcq' || section === 'true_false' || section === 'short') return section;
  return 'photo';
};

const trueFalseParts = (q: QuestionResult): string[] | undefined => {
  const expected = parseExpectedAnswer(q.expectedAnswer);
  if (expected?.kind === 'true_false') return Object.keys(expected.items).sort();
  if (expected?.kind === 'true_false_single') return undefined;
  return ['a', 'b', 'c', 'd'];
};

/**
 * Đánh dấu các câu máy chưa chắc là `open` để hỏi lại học sinh. Câu đã có `clarify` (đã xử lý) giữ nguyên.
 * Câu tự luận (`photo`) CHƯA hỏi lại ở giai đoạn này (chụp lại từng câu làm ở giai đoạn 2): giữ cờ cho thầy cô như cũ.
 */
export const buildClarifyRows = (rows: readonly QuestionResult[]): { rows: QuestionResult[]; asked: number } => {
  let asked = 0;
  const next = rows.map(q => {
    if (q.clarify || !isUncertainQuestion(q)) return q;
    const kind = clarifyKindFor(q);
    if (kind === 'photo') return q;
    asked += 1;
    const parts = kind === 'true_false' ? trueFalseParts(q) : undefined;
    return { ...q, clarify: { kind, state: 'open' as ClarifyState, reading: q.studentAnswer, ...(parts ? { parts } : {}) } };
  });
  return { rows: next, asked };
};

const WAITING: readonly ClarifyState[] = ['open', 'photo_saved', 'regrading'];

/** Câu còn chờ em làm rõ (chưa trả lời, hoặc ảnh đang chờ máy chấm lại). */
export const isClarifyPending = (q: Pick<QuestionResult, 'clarify'>): boolean => Boolean(q.clarify && WAITING.includes(q.clarify.state));

export const pendingClarifyCount = (rows: readonly QuestionResult[] | undefined): number =>
  (rows || []).filter(isClarifyPending).length;

/** Bài này đang chờ học sinh làm rõ ít nhất một câu → chưa hiện điểm / đáp án cho em. */
export const awaitsClarification = (rows: readonly QuestionResult[] | undefined): boolean => pendingClarifyCount(rows) > 0;

export type CanonicalAnswer = { ok: true; value: string } | { ok: false; error: string };

const TF_ITEM = /^([a-d])\)\s*([ĐS])$/;
const NUMBER_ANSWER = /^-?\d+(?:[.,]\d+)?(?:\/\d+)?$/;

/**
 * Chuẩn hoá đáp án học sinh gõ về đúng khuôn mà bộ chấm tất định đọc được:
 * trắc nghiệm "B" · đúng-sai "a) Đ; b) S; c) Đ; d) S" (hoặc "Đúng"/"Sai" nếu câu chỉ một ý) · trả lời ngắn một con số.
 */
export const canonicalAnswer = (kind: ClarifyKind, raw: unknown, parts?: readonly string[]): CanonicalAnswer => {
  const text = typeof raw === 'string' ? raw.normalize('NFC').trim() : '';
  if (!text) return { ok: false, error: 'Em chưa trả lời câu này.' };
  if (kind === 'mcq') {
    const m = text.match(/^\(?([A-Da-d])\)?$/);
    return m ? { ok: true, value: m[1].toUpperCase() } : { ok: false, error: 'Chọn một trong A, B, C, D.' };
  }
  if (kind === 'true_false') {
    if (!parts || parts.length === 0) {
      const lower = text.toLocaleLowerCase('vi-VN');
      if (lower === 'đúng' || lower === 'đ') return { ok: true, value: 'Đúng' };
      if (lower === 'sai' || lower === 's') return { ok: true, value: 'Sai' };
      return { ok: false, error: 'Chọn Đúng hoặc Sai.' };
    }
    const items = text.split(';').map(item => item.trim()).filter(Boolean);
    const chosen = new Map<string, string>();
    for (const item of items) {
      const m = item.match(TF_ITEM);
      if (!m) return { ok: false, error: 'Mỗi ý chọn Đúng hoặc Sai.' };
      chosen.set(m[1], m[2]);
    }
    const missing = parts.filter(letter => !chosen.has(letter));
    if (missing.length > 0 || chosen.size !== parts.length) return { ok: false, error: `Em chọn Đúng/Sai cho đủ các ý ${parts.join(', ')}.` };
    return { ok: true, value: [...parts].map(letter => `${letter}) ${chosen.get(letter)}`).join('; ') };
  }
  if (kind === 'short') {
    const compact = text.replace(/\s+/g, '').replace(/−/g, '-');
    if (compact.length > 24 || !NUMBER_ANSWER.test(compact)) return { ok: false, error: 'Em gõ một con số (ví dụ 3,5 hoặc -2 hoặc 3/4).' };
    return { ok: true, value: compact };
  }
  return { ok: false, error: 'Câu này em cần chụp lại bài làm.' };
};

/** Gắn đáp án em gõ vào một câu `open` loại gõ: chấm tất định, đóng trạng thái. Câu không còn `open` thì trả null. */
export const answerClarifyRow = (q: QuestionResult, value: string, at: string): QuestionResult | null => {
  if (!q.clarify || q.clarify.state !== 'open' || q.clarify.kind === 'photo') return null;
  const scored = applyStudentTypedAnswer(q, value);
  return { ...scored, clarify: { ...q.clarify, state: 'answered', at } };
};

/** Em chọn "để thầy cô xem": câu giữ cờ cho thầy cô, không hỏi nữa. */
export const skipClarifyRow = (q: QuestionResult, at: string): QuestionResult | null => {
  if (!q.clarify || !WAITING.includes(q.clarify.state)) return null;
  return { ...q, needsTeacherReview: true, clarify: { ...q.clarify, state: 'skipped', at } };
};

const KINDS: readonly ClarifyKind[] = ['mcq', 'true_false', 'short', 'photo'];
const STATES: readonly ClarifyState[] = ['open', 'answered', 'photo_saved', 'regrading', 'done', 'skipped'];

/** Đọc lại `clarify` từ dữ liệu thô (Firestore / client): chỉ giữ trường hợp lệ, cắt độ dài. */
export const sanitizeClarify = (raw: unknown): QuestionClarify | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const value = raw as Record<string, unknown>;
  if (!KINDS.includes(value.kind as ClarifyKind) || !STATES.includes(value.state as ClarifyState)) return undefined;
  const parts = Array.isArray(value.parts) ? value.parts.filter((p): p is string => typeof p === 'string' && /^[a-d]$/.test(p)).slice(0, 4) : [];
  const photoUrls = Array.isArray(value.photoUrls) ? value.photoUrls.filter((u): u is string => typeof u === 'string').slice(0, 12) : [];
  return {
    kind: value.kind as ClarifyKind,
    state: value.state as ClarifyState,
    reading: typeof value.reading === 'string' ? value.reading.slice(0, 400) : '',
    ...(parts.length > 0 ? { parts } : {}),
    ...(photoUrls.length > 0 ? { photoUrls } : {}),
    ...(typeof value.at === 'string' ? { at: value.at } : {}),
  };
};

/**
 * Bản chiếu cho HỌC SINH của một bài còn câu chờ làm rõ: chỉ còn các câu đang chờ (máy đọc ra gì + cách làm rõ) —
 * KHÔNG đáp án đúng, giải thích, điểm, nhận xét. Hết câu chờ thì bản chiếu bình thường (không qua hàm này).
 */
export const hideWhileAwaitingClarification = (rows: readonly QuestionResult[]): QuestionResult[] =>
  rows.filter(isClarifyPending).map(q => ({
    questionNumber: q.questionNumber,
    status: 'unreadable' as const,
    score: 0,
    maxScore: q.maxScore,
    studentAnswer: q.clarify?.reading ?? '',
    expectedAnswer: '',
    errorType: '',
    explanation: '',
    correction: '',
    nextPractice: '',
    needsTeacherReview: true,
    ...(q.clarify ? { clarify: q.clarify } : {}),
  }));

