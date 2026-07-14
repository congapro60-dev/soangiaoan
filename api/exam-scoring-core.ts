// Logic chấm điểm THUẦN cho hàm serverless — mirror src/utils/examScoring.computeAutoScore.
// Tách riêng để unit-test được (Vercel function không import chéo src/). Xem exam-scoring-core.test.ts.

export type TfScoringMode = 'all_or_nothing' | 'thpt2025';

export interface CoreQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  points: number;
}

export interface CoreAnswer {
  questionId: string;
  answer: string;
  autoScore?: number;
  aiScore?: number;
  aiFeedback?: string;
  correctAnswer?: string;
  explanation?: string;
}

const isCompoundTF = (q: CoreQuestion) =>
  q.type === 'true_false' && Array.isArray(q.options) && q.options.length > 0;

const parseTFSub = (v: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(v);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const normalize = (s: string) => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Tính điểm tự động một câu (non-essay). Trả undefined cho essay (cần AI/giáo viên chấm). */
export const computeAutoScoreCore = (
  q: CoreQuestion,
  answer: string,
  tfScoringMode?: TfScoringMode
): number | undefined => {
  if (q.type === 'essay') return undefined;
  if (!answer) return 0;

  if (q.type === 'multiple_choice') {
    return answer === q.correctAnswer ? q.points : 0;
  }

  if (isCompoundTF(q)) {
    const studentTF = parseTFSub(answer);
    const correctTF = parseTFSub(q.correctAnswer || '');
    const keys = ['a', 'b', 'c', 'd'];
    const correctCount = keys.filter(k => studentTF[k] === correctTF[k]).length;

    if (tfScoringMode === 'thpt2025') {
      if (correctCount === 4) return q.points;
      if (correctCount === 3) return q.points * 0.5;
      if (correctCount === 2) return q.points * 0.25;
      if (correctCount === 1) return q.points * 0.1;
      return 0;
    }
    return correctCount === 4 ? q.points : 0;
  }

  if (q.type === 'true_false') {
    return normalize(answer) === normalize(q.correctAnswer || '') ? q.points : 0;
  }

  if (q.type === 'short_answer') {
    return normalize(answer) === normalize(q.correctAnswer || '') ? q.points : 0;
  }

  return 0;
};

export interface GradeResult {
  answers: CoreAnswer[];
  totalScore: number;
  status: 'submitted' | 'graded';
}

/**
 * Chấm toàn bộ bài nộp từ đáp án gốc (nguồn tin cậy = server).
 * - non-essay: tính lại autoScore.
 * - essay: giữ aiScore nếu đã có.
 * - allowReview=true: nhúng correctAnswer/explanation vào từng answer để học sinh xem lại
 *   (chỉ khi giáo viên bật) — KHÔNG lộ đáp án khi allowReview tắt.
 * - status: 'graded' nếu mọi câu đã có điểm, ngược lại 'submitted' (còn tự luận chờ chấm).
 */
export const gradeSubmissionCore = (
  questions: CoreQuestion[],
  submissionAnswers: CoreAnswer[],
  allowReview: boolean,
  tfScoringMode?: TfScoringMode
): GradeResult => {
  const answers: CoreAnswer[] = submissionAnswers.map(a => {
    const q = questions.find(item => item.id === a.questionId);
    if (!q) return a;

    const next: CoreAnswer = { questionId: a.questionId, answer: a.answer };
    if (a.aiScore !== undefined) next.aiScore = a.aiScore;
    if (a.aiFeedback !== undefined) next.aiFeedback = a.aiFeedback;

    if (q.type === 'essay') {
      // essay giữ nguyên aiScore/autoScore đã có
      if (a.autoScore !== undefined) next.autoScore = a.autoScore;
    } else {
      const autoScore = computeAutoScoreCore(q, a.answer, tfScoringMode);
      if (autoScore !== undefined) next.autoScore = autoScore;
    }

    if (allowReview) {
      if (q.correctAnswer !== undefined) next.correctAnswer = q.correctAnswer;
      if (q.explanation !== undefined) next.explanation = q.explanation;
    }
    return next;
  });

  const totalScore = Math.round(answers.reduce((sum, a) => {
    if (a.autoScore !== undefined) return sum + a.autoScore;
    if (a.aiScore !== undefined) return sum + a.aiScore;
    return sum;
  }, 0) * 100) / 100;

  const fullyGraded = questions.every(q => {
    const a = answers.find(item => item.questionId === q.id);
    if (!a) return false;
    return q.type === 'essay' ? (a.aiScore !== undefined || a.autoScore !== undefined) : true;
  });

  return { answers, totalScore, status: fullyGraded ? 'graded' : 'submitted' };
};

/** Bỏ đáp án + giải thích khỏi câu hỏi trước khi gửi cho học sinh (chống xem đáp án qua DevTools). */
export const stripAnswerKey = <T extends { correctAnswer?: unknown; explanation?: unknown }>(question: T): Omit<T, 'correctAnswer' | 'explanation'> => {
  const { correctAnswer, explanation, ...rest } = question;
  return rest;
};
