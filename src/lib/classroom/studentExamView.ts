import type { ExamQuestion, StudentAnswer } from '../../types';

export const answersFromSubmission = (
  answers: readonly (Pick<StudentAnswer, 'questionId' | 'answer'> & Partial<Pick<StudentAnswer, 'correctAnswer' | 'explanation'>>)[],
): Record<string, string> => Object.fromEntries(
  answers
    .filter(answer => typeof answer.questionId === 'string' && answer.questionId.trim())
    .map(answer => [answer.questionId, typeof answer.answer === 'string' ? answer.answer : '']),
);

export const submissionAnswersForQuestions = (
  questions: readonly Pick<ExamQuestion, 'id'>[],
  answers: Readonly<Record<string, string>>,
): Array<{ questionId: string; answer: string }> => questions.map(question => ({
  questionId: question.id,
  answer: typeof answers[question.id] === 'string' ? answers[question.id] : '',
}));

export const remainingSecondsForAttempt = (input: {
  durationMinutes: number;
  startedAt: string;
  endAt?: string;
  now?: Date;
}): number => {
  const nowMs = (input.now || new Date()).getTime();
  const startedMs = Date.parse(input.startedAt);
  const durationSeconds = Math.max(0, Math.floor(Number(input.durationMinutes) * 60));
  if (!Number.isFinite(nowMs) || !Number.isFinite(startedMs)) return durationSeconds;
  const elapsed = Math.max(0, Math.floor((nowMs - startedMs) / 1000));
  let remaining = Math.max(0, durationSeconds - elapsed);
  if (input.endAt) {
    const endMs = Date.parse(input.endAt);
    if (Number.isFinite(endMs)) remaining = Math.min(remaining, Math.max(0, Math.floor((endMs - nowMs) / 1000)));
  }
  return remaining;
};
