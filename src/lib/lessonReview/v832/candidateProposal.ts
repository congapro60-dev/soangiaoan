import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema';
import { validateLessonIRReferences } from '../../lessonCompiler/v832/runtimePackage';
import { validateV84ActivityBudgets } from '../../lessonRuntime/v84/budgetContract';
import { parseMathVisualExtension } from '../../lessonRuntime/v84/mathVisual/extension';
import { diffReviewCandidate, inspectClassifiedChanges, type ReviewFieldChange } from './candidateChanges';
import { expandSparseReviewPatch } from './sparseReviewPatch';
import { applyIrPatchCandidate, computeLessonContentHash, getPatchTargetHash,
  validateIssueClassification, type IssueClassification, type LessonCandidateBuild, type LessonIRPatch } from './repairLifecycle';

export interface ReviewCandidateChecks {
  schema: 'PASS';
  references: 'PASS';
  budget: 'VALID' | 'UNVALIDATED';
  mathVisual: 'PASS' | 'NOT_APPLICABLE';
  math: 'NOT_RUN';
  browser: 'NOT_RUN';
  semantic: 'NOT_RUN';
  teacherApproval: 'PENDING';
}

type ReviewCandidateResult =
  | { accepted: false; issues: string[] }
  | { accepted: true; candidate: LessonCandidateBuild;
    changes: ReviewFieldChange[];
    qa: ReviewCandidateChecks };

const protectedCategories = new Set<IssueClassification['primary']>([
  'MATH_CORRECTNESS', 'SOURCE_CANONICAL', 'RUNTIME_ENGINE', 'REALTIME_ENGINE',
  'PRIVACY_SECURITY', 'BUILD_PIPELINE', 'PERFORMANCE_ENGINE',
]);

export const routeReviewIssueLayer = (classification: IssueClassification): IssueClassification['targetLayer'] => {
  const categories = [classification.primary, ...classification.secondary];
  if (categories.some(category => category === 'MATH_CORRECTNESS' || category === 'SOURCE_CANONICAL')) return 'SOURCE_REVIEW';
  if (categories.some(category => protectedCategories.has(category))) return 'SHARED_ENGINE';
  if (categories.includes('UNKNOWN')) return 'MANUAL_REVIEW';
  return classification.targetLayer;
};

export const prepareReviewCandidate = async (
  lesson: LessonIRV83,
  classification: IssueClassification,
  proposal: Pick<LessonIRPatch, 'op' | 'targetId' | 'changes'>,
): Promise<ReviewCandidateResult> => {
  const issues = validateIssueClassification(classification);
  if (routeReviewIssueLayer(classification) !== 'LESSON_IR') {
    issues.push('ISSUE_REQUIRES_CORRECT_OWNER_LAYER');
  }
  if (issues.length) return { accepted: false, issues };
  let beforeHash: string;
  let expanded: typeof proposal;
  try {
    beforeHash = await getPatchTargetHash(lesson, proposal.op, proposal.targetId);
    expanded = expandSparseReviewPatch(lesson, proposal);
  }
  catch (cause) { return { accepted: false, issues: [cause instanceof Error ? cause.message : 'PATCH_TARGET_NOT_FOUND'] }; }
  const result = await applyIrPatchCandidate(lesson, {
    ...expanded, baseLessonVersion: lesson.lesson.lessonVersion,
    baseContentHash: await computeLessonContentHash(lesson), beforeHash,
  }, classification);
  if ('issues' in result) return { accepted: false, issues: result.issues };
  const changes = diffReviewCandidate(lesson, result.candidate.lessonIR);
  const scopeIssues = inspectClassifiedChanges(changes, classification);
  if (scopeIssues.length) return { accepted: false, issues: scopeIssues };
  const references = validateLessonIRReferences(result.candidate.lessonIR);
  if (references.length) return { accepted: false, issues: references };
  const budget = validateV84ActivityBudgets(result.candidate.lessonIR);
  if (budget.status === 'INVALID') return { accepted: false, issues: budget.issues };
  let visualCount = 0;
  try { visualCount = Object.keys(parseMathVisualExtension(result.candidate.lessonIR)).length; }
  catch (cause) { return { accepted: false, issues: [cause instanceof Error ? cause.message : 'VISUAL_MODEL_INVALID'] }; }
  return { accepted: true, candidate: result.candidate, changes, qa: {
    schema: 'PASS', references: 'PASS', budget: budget.status,
    mathVisual: visualCount ? 'PASS' : 'NOT_APPLICABLE',
    math: 'NOT_RUN', browser: 'NOT_RUN', semantic: 'NOT_RUN', teacherApproval: 'PENDING',
  } };
};
