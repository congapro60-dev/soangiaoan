/**
 * CĂN CỨ ra bài luyện thêm cho học sinh — thuần, không Firestore.
 *
 * Bài luyện bám LỖI CỤ THỂ em mắc: từng câu sai trong BTVN đã chấm (loại lỗi, vì sao sai, cách sửa)
 * và các câu em vừa làm chưa đúng ở lượt luyện trước. Đề cũ gần đây được gửi kèm để AI KHÔNG lặp lại.
 */
import type { PracticeAttemptDoc, PracticeKeyDoc, PracticeSetDoc, QuestionResult, SubmissionDoc } from './types.js';

/** Một lỗi đã ghi nhận, rút gọn để đưa vào prompt. */
export interface PracticeMistake {
  /** Nguồn hiển thị cho học sinh, vd "BTVN Đại số 18/09/2026 · Câu 2" hoặc "Lượt luyện trước · Câu 3". */
  source: string;
  errorType: string;
  explanation: string;
  correction: string;
  nextPractice: string;
}

const clip = (value: unknown, max: number): string =>
  String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const ngayVn = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

const isMistake = (result: QuestionResult): boolean =>
  (result.status === 'incorrect' || result.status === 'partially_correct')
  && !result.ignoredByTeacherInstruction
  && Boolean(result.errorType || result.explanation);

/**
 * Lỗi từng câu trong các bài BTVN đã chấm, mới nhất trước. Gộp lỗi trùng (cùng loại lỗi + cùng giải thích)
 * để 6 câu luyện không dồn vào một lỗi lặp nhiều lần.
 */
export const collectHomeworkMistakes = (
  submissions: readonly Pick<SubmissionDoc, 'assignmentId' | 'createdAt' | 'status' | 'grade'>[],
  titleOf: (assignmentId: string) => string,
  limit = 6,
): PracticeMistake[] => {
  const seen = new Set<string>();
  const mistakes: PracticeMistake[] = [];
  const graded = [...submissions]
    .filter(s => s.status === 'graded' && Array.isArray(s.grade?.questionResults))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  for (const submission of graded) {
    const title = submission.assignmentId ? titleOf(submission.assignmentId) : '';
    const where = [title || 'BTVN', ngayVn(submission.createdAt)].filter(Boolean).join(' ');
    for (const result of submission.grade!.questionResults!) {
      if (!isMistake(result)) continue;
      const key = `${clip(result.errorType, 80).toLowerCase()}|${clip(result.explanation, 120).toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      mistakes.push({
        source: `${where} · ${clip(result.questionNumber, 20) || 'một câu'}`,
        errorType: clip(result.errorType, 120),
        explanation: clip(result.explanation, 300),
        correction: clip(result.correction, 200),
        nextPractice: clip(result.nextPractice, 200),
      });
      if (mistakes.length >= limit) return mistakes;
    }
  }
  return mistakes;
};

/** Các câu em làm chưa trọn điểm ở lượt luyện đã chấm gần nhất — để đề sau bám tiếp chỗ còn vướng. */
export const collectPracticeMistakes = (
  attempt: Pick<PracticeAttemptDoc, 'status' | 'questionResults'> | null,
  key: Pick<PracticeKeyDoc, 'questions'> | null,
  limit = 3,
): PracticeMistake[] => {
  if (!attempt || attempt.status !== 'graded' || !key) return [];
  const questionById = new Map(key.questions.map(q => [q.id, q]));
  return (attempt.questionResults ?? [])
    .filter(result => result.score < result.maxScore)
    .slice(0, limit)
    .map((result, index) => ({
      source: `Lượt luyện trước · Câu ${result.id.replace(/^q/, '') || index + 1}`,
      errorType: 'Chưa làm trọn điểm',
      explanation: clip(`${questionById.get(result.id)?.question ?? ''} — ${result.feedback}`, 400),
      correction: '',
      nextPractice: '',
    }));
};

/** Câu hỏi các đề luyện gần đây của em (mới nhất trước) — gửi AI để cấm lặp lại. */
export const recentPracticeQuestions = (
  sets: readonly Pick<PracticeSetDoc, 'createdAt' | 'questions'>[],
  maxSets = 3,
  maxQuestions = 18,
): string[] => [...sets]
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  .slice(0, maxSets)
  .flatMap(set => set.questions.map(q => clip(q.question, 220)))
  .filter(Boolean)
  .slice(0, maxQuestions);

/**
 * Lệnh LaTeX mở đầu bằng chữ trùng mã thoát JSON (\b \f \n \r \t). Nếu AI quên nhân đôi dấu `\`,
 * `JSON.parse` vẫn chạy nhưng biến `\frac` thành ký tự form-feed + "rac" — công thức vỡ mà không báo lỗi.
 * Chỉ sửa khi CẢ TỪ là lệnh LaTeX quen thuộc, để không đụng xuống dòng thật như "\nTa có".
 */
const LATEX_WORDS = new Set([
  'frac', 'forall', 'flat',
  'beta', 'bar', 'binom', 'begin', 'bigcup', 'bigcap', 'boxed', 'bmatrix', 'bot', 'bullet', 'big', 'bigg', 'backslash',
  'times', 'text', 'textbf', 'textit', 'theta', 'tan', 'tau', 'to', 'top', 'triangle', 'tfrac', 'tilde', 'therefore', 'tag',
  'neq', 'nabla', 'not', 'notin', 'neg', 'nearrow', 'nless', 'ngtr', 'nmid', 'nexists',
  'right', 'rightarrow', 'rho', 'rm', 'rangle', 'rfloor', 'rceil', 'rvert',
]);

export const repairLatexEscapes = (json: string): string =>
  json.replace(/(\\+)([bfnrt][A-Za-z]*)/g, (match, slashes: string, word: string) =>
    slashes.length % 2 === 1 && LATEX_WORDS.has(word) ? `${slashes}\\${word}` : match);
