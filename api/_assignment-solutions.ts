import type { AssignmentDoc, SubmissionDoc } from '../src/lib/classroom/types.js';
import { attachWorkedSolutions, type WorkedSolutionsInput } from '../src/lib/classroom/workedSolutions.js';
import { workedSolutionVersion } from './_worked-solutions.js';
import { questionKey } from '../src/lib/classroom/questionRescore.js';
/** Effective catalog and key are shared by generation, commit validation and EVERY detail projection. */
export const assignmentSolutionInput = (assignment: Partial<AssignmentDoc>, examCode = ''): WorkedSolutionsInput => {
  const variant = assignment.examVariants?.find(item => item.code === examCode);
  const fixes = (assignment.answerKeyFixes || []).filter(fix => !fix.examCode || fix.examCode === examCode);
  const answerKey = variant ? variant.answerKey : assignment.answerKey || '';
  return { answerKey, assignmentText: variant ? variant.sourceText : assignment.sourceText || '', maxScore: assignment.maxScore || 10,
    assignmentTitle: assignment.title, rubric: assignment.rubric, gradingInstructions: assignment.gradingInstructions,
    contentVersion: assignment.contentVersion, examCode, sourceUrls: [...(assignment.sourceImageUrls || []), ...(assignment.answerKeyImageUrls || []), ...(assignment.attachments || []).map(file => file.url)], answerKeyFixes: fixes,
    questions: (examCode ? assignment.questionCatalogByExamCode?.[examCode] || [] : assignment.questionCatalog || []).map(row => ({ questionNumber: row.questionNumber, content: row.content,
      expectedAnswer: fixes.find(fix => questionKey(fix.questionNumber) === questionKey(row.questionNumber))?.expectedAnswer || row.expectedAnswer })) };
};
export const attachAssignmentSolutions = (submission: SubmissionDoc, assignment?: Partial<AssignmentDoc>): SubmissionDoc => {
  if (!assignment || !submission.grade?.questionResults?.length) return submission;
  const input = assignmentSolutionInput(assignment, submission.examCode || '');
  const cache = submission.examCode ? assignment.workedSolutionsByExamCode?.[submission.examCode] : assignment.workedSolutions;
  return { ...submission, grade: { ...submission.grade, questionResults: attachWorkedSolutions(submission.grade.questionResults, cache, workedSolutionVersion(input)) } };
};
