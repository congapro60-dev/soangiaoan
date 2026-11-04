import { createHash } from 'node:crypto';
import { buildWorkedSolutionsPrompt, parseWorkedSolutions, type WorkedSolutionsInput } from '../src/lib/classroom/workedSolutions.js';
import type { WorkedSolutionCache } from '../src/lib/classroom/types.js';

/** Identity excludes transient download tokens; content/version/key edits invalidate the cache. */
export const workedSolutionVersion = (input: WorkedSolutionsInput): string => {
  const sourceUrls = (input.sourceUrls || []).map(value => {
    try { const url = new URL(value); return url.origin + url.pathname; } catch { return value; }
  });
  const canonical = { answerKey: input.answerKey, assignmentText: input.assignmentText, maxScore: input.maxScore,
    rubric: input.rubric || '', gradingInstructions: input.gradingInstructions || '', contentVersion: input.contentVersion || '',
    examCode: input.examCode || '', sourceUrls, questions: input.questions,
    answerKeyFixes: (input.answerKeyFixes || []).map(f => ({ questionNumber: f.questionNumber, expectedAnswer: f.expectedAnswer })).sort((a, b) => a.questionNumber.localeCompare(b.questionNumber)) };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
};

/** Caller authorizes GV and owns AI key/quota/usage, source images, persistence and version recheck. */
export const generateWorkedSolutions = async (args: {
  input: WorkedSolutionsInput; existing?: WorkedSolutionCache; now: string; force?: boolean;
  callModel: (prompt: string) => Promise<string>;
}): Promise<WorkedSolutionCache> => {
  const version = workedSolutionVersion(args.input);
  if (!args.force && args.existing?.version === version) return args.existing;
  if (!args.input.questions.length || (!args.input.assignmentText.trim() && !args.input.sourceUrls?.length
    && !args.input.questions.some(q => q.content?.trim()) && args.input.answerKey.trim().length < 100)) {
    return { version, generatedAt: args.now, status: 'incomplete', questions: args.input.questions.filter(q => !q.ignoredByTeacherInstruction)
      .map(q => ({ questionNumber: q.questionNumber, workedSolution: '', status: 'unavailable' })) };
  }
  return parseWorkedSolutions(await args.callModel(buildWorkedSolutionsPrompt(args.input)), args.input, version, args.now);
};
