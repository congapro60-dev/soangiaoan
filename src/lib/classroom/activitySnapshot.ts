import type { Exam, ExamQuestion } from '../../types';

export type StudentExamQuestion = Omit<ExamQuestion, 'correctAnswer' | 'explanation'>;

export interface ExamContentSnapshot {
  contentVersion: string;
  contentHash: string;
  canonicalQuestions: ExamQuestion[];
  studentQuestions: StudentExamQuestion[];
  teacherQuestions: ExamQuestion[];
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const next = (value as Record<string, unknown>)[key];
        if (next !== undefined) result[key] = stableValue(next);
        return result;
      }, {});
  }
  return value;
};

const hashString = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const canonicalQuestionsFor = (exam: Exam): ExamQuestion[] => exam.questions.map(question => ({
  id: question.id,
  type: question.type,
  content: question.content,
  imageUrl: question.imageUrl,
  options: question.options ? [...question.options] : undefined,
  correctAnswer: question.correctAnswer,
  points: question.points,
  explanation: question.explanation,
  cognitiveLevel: question.cognitiveLevel,
}));

export const getExamContentHash = (exam: Exam): string => {
  const canonical = stableValue({
    questions: canonicalQuestionsFor(exam),
    maxScore: exam.maxScore,
    skillIds: exam.skillIds || [],
    tfScoringMode: exam.tfScoringMode,
  });
  return `fnv1a:${hashString(JSON.stringify(canonical))}`;
};

const studentQuestion = (question: ExamQuestion): StudentExamQuestion => {
  const { correctAnswer: _correctAnswer, explanation: _explanation, ...safe } = question;
  return safe;
};

export const buildExamContentSnapshot = (exam: Exam): ExamContentSnapshot => {
  const canonicalQuestions = canonicalQuestionsFor(exam);
  const contentHash = getExamContentHash(exam);
  return {
    contentVersion: exam.contentVersion || `v1-${contentHash.slice('fnv1a:'.length)}`,
    contentHash,
    canonicalQuestions,
    studentQuestions: canonicalQuestions.map(studentQuestion),
    teacherQuestions: canonicalQuestions.map(question => ({ ...question, options: question.options ? [...question.options] : undefined })),
  };
};

const CONTENT_KEYS = new Set(['questions', 'maxScore', 'durationMinutes', 'skillIds', 'tfScoringMode']);

export const canEditExamContent = (
  exam: Pick<Exam, 'isImmutableAfterPublish'>,
  patch: Partial<Exam>,
): { allowed: boolean; requiresNewVersion: boolean } => {
  if (!exam.isImmutableAfterPublish) return { allowed: true, requiresNewVersion: false };
  const changesContent = Object.keys(patch).some(key => CONTENT_KEYS.has(key) && patch[key as keyof Exam] !== undefined);
  return changesContent
    ? { allowed: false, requiresNewVersion: true }
    : { allowed: true, requiresNewVersion: false };
};
