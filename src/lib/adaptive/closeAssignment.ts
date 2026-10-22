import type { AdaptiveLesson, AdaptiveQuestion, AssessmentAttempt } from './types.js';

export interface CloseSummary {
  students: number;
  objectives: Array<{ title: string; avgPercent: number }>;
  misconceptions: Array<{ title: string; count: number }>;
}
export interface HomeworkRef { assessmentKey: string; questionId: string }
export interface CloseArtifacts {
  closedAt: string;
  summary: CloseSummary;
  feedback: Record<string, string[]>;
  homework: Record<string, HomeworkRef[]>;
}
export type StudentAttempts = Record<string, Record<string, AssessmentAttempt>>;

const MAX_HOMEWORK = 5;
const DEFAULT_THRESHOLD = 0.7;
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 } as const;

const pool = (lesson: AdaptiveLesson): Array<HomeworkRef & { question: AdaptiveQuestion }> => [
  ...lesson.diagnosticTest.questions.map(question => ({ assessmentKey: 'diagnostic', questionId: question.id, question })),
  ...lesson.knowledgeUnits.flatMap(unit => (unit.quickCheck?.questions || []).map(question => ({ assessmentKey: `quickCheck:${unit.id}`, questionId: question.id, question }))),
  ...lesson.exitTicket.questions.map(question => ({ assessmentKey: 'exitTicket', questionId: question.id, question })),
];

const weakObjectives = (lesson: AdaptiveLesson, attempts: AssessmentAttempt[]): string[] => {
  const sums = new Map<string, { score: number; max: number }>();
  attempts.forEach(attempt => attempt.objectiveScores.forEach(item => {
    const cur = sums.get(item.objectiveId) || { score: 0, max: 0 };
    sums.set(item.objectiveId, { score: cur.score + item.score, max: cur.max + item.maxScore });
  }));
  return [...sums].filter(([id, { score, max }]) => max > 0 && score / max < (lesson.objectives.find(o => o.id === id)?.masteryThreshold ?? DEFAULT_THRESHOLD)).map(([id]) => id);
};
const misconceptionsOf = (attempts: AssessmentAttempt[]): string[] =>
  [...new Set(attempts.flatMap(attempt => attempt.answers.flatMap(answer => answer.isCorrect ? [] : answer.detectedMisconceptionIds || [])))];

/** Chi chon tu cau CO SAN trong bai; khong sinh cau moi. Cau HS da lam dung bi loai. */
export const selectHomework = (lesson: AdaptiveLesson, attempts: AssessmentAttempt[]): HomeworkRef[] => {
  const weak = new Set(weakObjectives(lesson, attempts));
  const miss = new Set(misconceptionsOf(attempts));
  const correct = new Set(attempts.flatMap(attempt => attempt.answers.filter(answer => answer.isCorrect).map(answer => answer.questionId)));
  const seen = new Set<string>();
  return pool(lesson)
    .filter(item => !correct.has(item.questionId))
    .map(item => ({ item, score: (item.question.misconceptionIds || []).filter(id => miss.has(id)).length * 2 + item.question.objectiveIds.filter(id => weak.has(id)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || DIFFICULTY_RANK[a.item.question.difficulty] - DIFFICULTY_RANK[b.item.question.difficulty])
    .filter(({ item }) => !seen.has(item.questionId) && !!seen.add(item.questionId))
    .slice(0, MAX_HOMEWORK)
    .map(({ item }) => ({ assessmentKey: item.assessmentKey, questionId: item.questionId }));
};

/** Chi so lop: khong mang studentId/ten. */
export const buildClassSummary = (lesson: AdaptiveLesson, students: StudentAttempts): CloseSummary => {
  const mastery = new Map<string, { sum: number; n: number }>();
  const miss = new Map<string, number>();
  Object.values(students).forEach(byKey => {
    const attempts = Object.values(byKey);
    const per = new Map<string, { score: number; max: number }>();
    attempts.forEach(attempt => attempt.objectiveScores.forEach(item => {
      const cur = per.get(item.objectiveId) || { score: 0, max: 0 };
      per.set(item.objectiveId, { score: cur.score + item.score, max: cur.max + item.maxScore });
    }));
    per.forEach(({ score, max }, id) => { if (max > 0) { const cur = mastery.get(id) || { sum: 0, n: 0 }; mastery.set(id, { sum: cur.sum + score / max, n: cur.n + 1 }); } });
    misconceptionsOf(attempts).forEach(id => miss.set(id, (miss.get(id) || 0) + 1));
  });
  const objectiveTitle = (id: string) => lesson.objectives.find(o => o.id === id)?.title || 'Mục tiêu';
  const misconceptionTitle = (id: string) => lesson.objectives.flatMap(o => o.commonMisconceptions).find(m => m.id === id)?.title || 'Lỗi sai';
  return {
    students: Object.keys(students).length,
    objectives: [...mastery].map(([id, { sum, n }]) => ({ title: objectiveTitle(id), avgPercent: Math.round(sum / n * 100) })),
    misconceptions: [...miss].map(([id, count]) => ({ title: misconceptionTitle(id), count })).sort((a, b) => b.count - a.count || a.title.localeCompare(b.title)).slice(0, 5),
  };
};

/** Nhan xet ca nhan: ten muc tieu yeu + loi sai + huong sua cach nghi. KHONG dung correctAnswer/explanation/feedback tung cau. */
export const buildStudentFeedback = (lesson: AdaptiveLesson, attempts: AssessmentAttempt[]): string[] => {
  const lines: string[] = [];
  weakObjectives(lesson, attempts).forEach(id => {
    const title = lesson.objectives.find(o => o.id === id)?.title;
    if (title) lines.push(`Em cần ôn lại: ${title}.`);
  });
  const all = lesson.objectives.flatMap(o => o.commonMisconceptions);
  misconceptionsOf(attempts).forEach(id => {
    const found = all.find(m => m.id === id);
    if (found) lines.push(`${found.title}. ${found.remediationHint}`.trim());
  });
  return lines.length ? lines : ['Em làm tốt, chưa thấy lỗi sai đáng chú ý. Hãy tiếp tục phát huy.'];
};

export const buildCloseArtifacts = (lesson: AdaptiveLesson, students: StudentAttempts, closedAt: string): CloseArtifacts => {
  const feedback: CloseArtifacts['feedback'] = {};
  const homework: CloseArtifacts['homework'] = {};
  Object.entries(students).forEach(([studentId, byKey]) => {
    const attempts = Object.values(byKey);
    feedback[studentId] = buildStudentFeedback(lesson, attempts);
    homework[studentId] = selectHomework(lesson, attempts);
  });
  return { closedAt, summary: buildClassSummary(lesson, students), feedback, homework };
};

/** Cau BTVN gui cho HS: da bo dap an/loi giai. */
export const resolveHomework = (lesson: AdaptiveLesson, refs: HomeworkRef[]): Array<Pick<AdaptiveQuestion, 'id' | 'type' | 'prompt' | 'options' | 'points'>> => {
  const byId = new Map(pool(lesson).map(item => [item.questionId, item.question]));
  return refs.flatMap(ref => {
    const q = byId.get(ref.questionId);
    return q ? [{ id: q.id, type: q.type, prompt: q.prompt, ...(q.options ? { options: q.options } : {}), points: q.points }] : [];
  });
};
