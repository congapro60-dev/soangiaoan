import type { LessonIRV83 } from './lessonIRSchema.js';
import type { LearningQualityResult } from './qualityGate.js';
import { transitionBuildStatus } from './buildLifecycle.js';
import { validateLessonIRReferences } from './runtimePackage.js';
import { validateV84ActivityBudgets } from '../../lessonRuntime/v84/budgetContract.js';
import { parseMathVisualExtension } from '../../lessonRuntime/v84/mathVisual/extension.js';
import { evaluateExperienceDesign } from './experienceDesign.js';
import type { SourceModel } from './sourceModel.js';

export const freezeReviewedDesign = (lesson: LessonIRV83, quality: LearningQualityResult, sourceModel?: SourceModel): LessonIRV83 => {
  if (lesson.sourceVerification.status !== 'VERIFIED' || lesson.sourceVerification.unresolved.length
    || !lesson.sourceVerification.canonicalSources.length) throw new Error('SOURCE_GATE_NOT_VERIFIED');
  if (quality.status === 'BLOCKED' || quality.failedRules.length || quality.pendingRules.length) throw new Error('QUALITY_GATE_BLOCKED');
  const refs = validateLessonIRReferences(lesson);
  if (refs.length) throw new Error(`DESIGN_REFERENCES_INVALID:${refs.join(',')}`);
  parseMathVisualExtension(lesson);
  const timing = validateV84ActivityBudgets(lesson);
  if (timing.status === 'INVALID') throw new Error(`DESIGN_TIMING_INVALID:${timing.issues.join(',')}`);
  const experience = evaluateExperienceDesign(lesson, sourceModel);
  if (experience.status === 'BLOCKED') throw new Error(`V871_EXPERIENCE_BLOCKED:${experience.issues.join(',')}`);
  if (experience.status === 'REVIEW_REQUIRED') throw new Error(`V871_EXPERIENCE_REVIEW_REQUIRED:${experience.diagnostics.join(',')}`);
  const next = structuredClone(lesson);
  const context = { sourceVerified: true, qualityStatus: quality.status,
    materialConfirmationsResolved: false, browserQaPassed: false, teacherApproved: false };
  const stages = ['QUALITY_AUDIT', 'QUALITY_FROZEN', 'DESIGN_DRAFT', 'DESIGN_VALIDATED', 'DESIGN_FROZEN'] as const;
  const index = stages.indexOf(next.buildStatus as typeof stages[number]);
  if (index < 0) throw new Error(`DESIGN_REVIEW_STATE_INVALID:${next.buildStatus}`);
  for (const state of stages.slice(index + 1)) next.buildStatus = transitionBuildStatus(next.buildStatus, state, context);
  next.qualityAudit = { ...next.qualityAudit, status: quality.status, passedRules: quality.passedRules,
    failedRules: [], warnings: quality.warnings,
    teacherConfirmationsRequired: quality.teacherConfirmationsRequired.filter(item =>
      !next.learnerContext.evidence.some(evidence => evidence.id === item.id)).map(item => ({ ...item, resolved: false })) };
  return next;
};
