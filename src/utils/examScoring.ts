import { ExamQuestion } from '../types';

export type TfScoringMode = 'all_or_nothing' | 'thpt2025';

// Ministry of Education THPT 2025 standard for 4-option compound T/F:
// Correct 1/4 → 10%  |  2/4 → 25%  |  3/4 → 50%  |  4/4 → 100%
const THPT2025_SCALE = [0, 0.1, 0.25, 0.5, 1.0];

export const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const isCompoundTF = (q: ExamQuestion) =>
  q.type === 'true_false' && Array.isArray(q.options) && q.options.length > 0;

export const parseTFSub = (v: string): Partial<Record<'a' | 'b' | 'c' | 'd', 'Đ' | 'S'>> => {
  try { return JSON.parse(v); } catch { return {}; }
};

export const computeAutoScore = (
  q: ExamQuestion,
  answer: string,
  tfScoringMode?: TfScoringMode
): number | undefined => {
  if (!answer) return 0;

  if (q.type === 'multiple_choice') {
    if (!q.correctAnswer) return undefined;
    return answer.toUpperCase() === q.correctAnswer.toUpperCase() ? q.points : 0;
  }

  if (q.type === 'true_false') {
    if (!q.correctAnswer) return undefined;
    if (isCompoundTF(q)) {
      const sub = parseTFSub(answer);
      const keys = ['a', 'b', 'c', 'd'] as const;
      const correctParts = q.correctAnswer.split(',').map(s => s.trim());

      if (tfScoringMode === 'thpt2025') {
        let correctCount = 0;
        keys.forEach((k, i) => {
          const sv = norm(sub[k] || '');
          const cv = norm(correctParts[i] || '');
          if (sv && cv && sv === cv) correctCount++;
        });
        return Math.round(q.points * THPT2025_SCALE[Math.min(correctCount, 4)] * 1000) / 1000;
      }

      // Default: all_or_nothing
      const combined = keys.map(k => sub[k] || '').join(',');
      return norm(combined) === norm(q.correctAnswer) ? q.points : 0;
    }
    return norm(answer) === norm(q.correctAnswer) ? q.points : 0;
  }

  if (q.type === 'short_answer') {
    if (!q.correctAnswer) return undefined;
    return norm(answer) === norm(q.correctAnswer) ? q.points : 0;
  }

  return undefined; // essay — graded separately
};

export const recalcTotalScore = (
  answers: { questionId: string; answer: string; autoScore?: number; aiScore?: number }[],
  questions: ExamQuestion[],
  tfScoringMode?: TfScoringMode
): number => {
  return Math.round(
    answers.reduce((sum, a) => {
      const q = questions.find(q => q.id === a.questionId);
      if (!q) return sum;
      if (q.type === 'essay') return sum + Math.min(a.aiScore ?? 0, q.points);
      const score = computeAutoScore(q, a.answer, tfScoringMode) ?? 0;
      return sum + Math.min(score, q.points);
    }, 0) * 100
  ) / 100;
};
