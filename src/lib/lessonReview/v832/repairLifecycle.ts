import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema.js';
import { validateLessonIRSchema } from '../../lessonCompiler/v832/lessonIRSchema.js';

export const ISSUE_CATEGORIES = [
  'CONTENT_IR', 'PEDAGOGY_IR', 'LEARNER_EVIDENCE_IR', 'SUCCESS_CRITERIA_IR',
  'INTELLECTUAL_ENGAGEMENT_IR', 'AFL_EVIDENCE_IR', 'RESPONSIVE_DECISION_IR',
  'RECHECK_IR', 'DIFFERENTIATION_QUALITY_IR', 'LANGUAGE_ACCESS_IR',
  'CONDITIONAL_FEATURE_IR', 'REFLECTION_IR', 'CIS_THEATRE', 'QUESTION_IR',
  'REVEAL_IR', 'VISUAL_IR', 'LAYOUT_IR', 'PAIRED_SURFACE_IR', 'ORCHESTRATION_IR',
  'SURFACE_HANDOFF_IR', 'COACH_STUDENT_MIRROR_IR', 'DEVICE_ADAPTATION_IR',
  'LANGUAGE_SUPPORT_IR', 'LOCALE_COPY', 'TIMING_IR', 'CIS_EVIDENCE_IR',
  'SOURCE_CANONICAL', 'MATH_CORRECTNESS', 'RUNTIME_ENGINE', 'REALTIME_ENGINE',
  'PERFORMANCE_ENGINE', 'ACCESSIBILITY', 'PRIVACY_SECURITY', 'BUILD_PIPELINE', 'UNKNOWN',
] as const;

export type IssueCategory = typeof ISSUE_CATEGORIES[number];
export type IssueTargetLayer = 'LESSON_IR' | 'SHARED_ENGINE' | 'SOURCE_REVIEW' | 'MANUAL_REVIEW';
export type IssueSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export interface IssueClassification {
  primary: IssueCategory;
  secondary: IssueCategory[];
  targetLayer: IssueTargetLayer;
  confidence: number;
  rationale: string;
  affectedPaths: string[];
  severity: IssueSeverity;
}

export const validateIssueClassification = (value: IssueClassification): string[] => {
  const issues: string[] = [];
  if (!ISSUE_CATEGORIES.includes(value.primary)) issues.push('INVALID_ISSUE_CATEGORY');
  if (!value.secondary.every(item => ISSUE_CATEGORIES.includes(item))) issues.push('INVALID_SECONDARY_CATEGORY');
  if (!['LESSON_IR', 'SHARED_ENGINE', 'SOURCE_REVIEW', 'MANUAL_REVIEW'].includes(value.targetLayer)) issues.push('INVALID_TARGET_LAYER');
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) issues.push('CONFIDENCE_OUT_OF_RANGE');
  if (!value.rationale.trim()) issues.push('RATIONALE_REQUIRED');
  if (!value.affectedPaths.length || value.affectedPaths.some(path => !path.trim())) issues.push('AFFECTED_PATH_REQUIRED');
  if (!['P0', 'P1', 'P2', 'P3'].includes(value.severity)) issues.push('INVALID_SEVERITY');
  return issues;
};

export const LESSON_IR_PATCH_OPERATIONS = [
  'UPDATE_ACTIVITY', 'UPDATE_QUESTION', 'UPDATE_VISUAL_STATE', 'ADD_HINT',
  'CHANGE_TIMING', 'ADD_STUDENT_VISUAL', 'UPDATE_ATTENTION_BEACON',
  'UPDATE_PAIRED_SURFACE', 'UPDATE_ORCHESTRATION', 'UPDATE_SURFACE_HANDOFF',
  'UPDATE_DEVICE_ADAPTATION', 'UPDATE_LEARNER_EVIDENCE',
  'UPDATE_PLANNING_IMPLICATION', 'UPDATE_SUCCESS_CRITERIA',
  'UPDATE_COGNITIVE_DEMAND', 'UPDATE_FORMATIVE_CHECK', 'UPDATE_DECISION_RULE',
  'ADD_RECHECK', 'UPDATE_DIFFERENTIATION', 'UPDATE_SCAFFOLD_FADE',
  'UPDATE_CONDITIONAL_FEATURE', 'UPDATE_REFLECTION',
] as const;

export type LessonIRPatchOperation = typeof LESSON_IR_PATCH_OPERATIONS[number];

export interface LessonIRPatch {
  op: LessonIRPatchOperation;
  targetId: string;
  baseLessonVersion: string;
  baseContentHash: string;
  beforeHash: string;
  changes: Record<string, unknown>;
}

export interface LessonCandidateBuild {
  id: string;
  status: 'CANDIDATE_DRAFT';
  qaStatus: 'NOT_RUN';
  parentVersion: string;
  version: string;
  contentHash: string;
  patch: LessonIRPatch;
  lessonIR: LessonIRV83;
}

export type ApplyIrPatchResult =
  | { accepted: false; issues: string[] }
  | { accepted: true; candidate: LessonCandidateBuild };

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().filter(key => object[key] !== undefined)
      .map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
};

const hashJson = async (value: unknown): Promise<string> => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(value)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
};

const unsafePatchKey = (value: unknown, seen = new WeakSet<object>()): string | null => {
  if (!value || typeof value !== 'object' || seen.has(value)) return null;
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (['__proto__', 'prototype', 'constructor'].includes(key)) return key;
    const nested = unsafePatchKey((value as Record<string, unknown>)[key], seen);
    if (nested) return nested;
  }
  return null;
};

export const computeLessonContentHash = async (lesson: LessonIRV83): Promise<string> => {
  const authored = structuredClone(lesson);
  if (authored.provenance) delete authored.provenance.contentHash;
  delete authored.generatedArtifacts;
  delete (authored as Partial<LessonIRV83>).qualityAudit;
  delete (authored as Partial<LessonIRV83>).buildStatus;
  return hashJson(authored);
};

const ACTIVITY_OPS = new Set<LessonIRPatchOperation>([
  'UPDATE_ACTIVITY', 'CHANGE_TIMING', 'ADD_STUDENT_VISUAL', 'UPDATE_ATTENTION_BEACON',
  'UPDATE_PAIRED_SURFACE', 'UPDATE_ORCHESTRATION', 'UPDATE_SURFACE_HANDOFF',
  'UPDATE_DEVICE_ADAPTATION', 'UPDATE_COGNITIVE_DEMAND', 'UPDATE_DIFFERENTIATION',
]);
const QUESTION_OPS = new Set<LessonIRPatchOperation>(['UPDATE_QUESTION', 'ADD_HINT']);
const FORMATIVE_OPS = new Set<LessonIRPatchOperation>(['UPDATE_FORMATIVE_CHECK', 'UPDATE_DECISION_RULE', 'ADD_RECHECK']);

const targetForPatch = (lesson: LessonIRV83, op: LessonIRPatchOperation, targetId: string): unknown => {
  if (ACTIVITY_OPS.has(op)) return lesson.timeline.find(activity => activity.id === targetId);
  if (QUESTION_OPS.has(op)) return lesson.questions[targetId];
  if (FORMATIVE_OPS.has(op)) return lesson.formativeDecisionCycles.find(cycle => cycle.id === targetId);
  switch (op) {
    case 'UPDATE_VISUAL_STATE': {
      const [visualId, stateId] = targetId.split('#');
      return lesson.visuals[visualId]?.states[stateId];
    }
    case 'UPDATE_LEARNER_EVIDENCE': return lesson.learnerContext.evidence.find(evidence => evidence.id === targetId);
    case 'UPDATE_PLANNING_IMPLICATION': return lesson.learnerContext.planningImplications.find(item => item.id === targetId);
    case 'UPDATE_SUCCESS_CRITERIA': return lesson.learningDesign.successCriteria.find(item => item.id === targetId);
    case 'UPDATE_SCAFFOLD_FADE': {
      const [activityId, scaffoldId] = targetId.split('#');
      return lesson.timeline.find(activity => activity.id === activityId)?.differentiation.scaffolds.find(item => item.id === scaffoldId);
    }
    case 'UPDATE_CONDITIONAL_FEATURE': return Object.hasOwn(lesson.conditionalFeatures, targetId)
      ? lesson.conditionalFeatures[targetId as keyof LessonIRV83['conditionalFeatures']]
      : undefined;
    case 'UPDATE_REFLECTION': return targetId === lesson.lesson.lessonId ? lesson.reflectionContract : undefined;
    default: return undefined;
  }
};

export const getPatchTargetHash = async (lesson: LessonIRV83, op: LessonIRPatchOperation, targetId: string): Promise<string> => {
  const target = targetForPatch(lesson, op, targetId);
  if (target === undefined) throw new Error(`PATCH_TARGET_NOT_FOUND:${targetId}`);
  return hashJson(target);
};

const allowedChanges: Record<LessonIRPatchOperation, readonly string[]> = {
  UPDATE_ACTIVITY: ['title', 'phase', 'template', 'objectiveRefs', 'successCriteriaRefs', 'formativeCycleRefs',
    'studentAction', 'teacherAction', 'cognitiveDemand', 'expectedEvidence', 'successLookFor', 'materials',
    'threeWayOrchestration', 'attentionBeacon', 'surfaceHandoff', 'interactionBlock', 'deviceAdaptation',
    'presenter', 'student', 'coach', 'questionBuild', 'questionInstances', 'visualStateRefs', 'languageSupportRef',
    'differentiation', 'cis', 'boardAction', 'notebookAction', 'revealPolicy', 'transitionPolicy',
    'privacy', 'persistencePolicy', 'fallback', 'timingPolicy'],
  UPDATE_QUESTION: ['prompt', 'responseType', 'options', 'correctAnswer', 'rubric', 'workedSolution', 'hints', 'reveal',
    'misconceptions', 'evidenceTargets', 'submissionModes', 'privacy', 'estimatedWorkTimeSec', 'handoffOverheadSec',
    'visualRef', 'languageSupportRef', 'authoredSource'],
  UPDATE_VISUAL_STATE: ['visibleObjects', 'hiddenObjects', 'emphasizedObjects', 'dimmedObjects', 'labels', 'camera', 'annotations'],
  ADD_HINT: ['hint'],
  CHANGE_TIMING: ['durationSec', 'surfaceSwitchCostSec'],
  ADD_STUDENT_VISUAL: ['visualId'],
  UPDATE_ATTENTION_BEACON: ['attentionBeacon'],
  UPDATE_PAIRED_SURFACE: ['presenterVisualRefs', 'studentVisualRefs', 'sharedContextRequired'],
  UPDATE_ORCHESTRATION: ['threeWayOrchestration'],
  UPDATE_SURFACE_HANDOFF: ['surfaceHandoff'],
  UPDATE_DEVICE_ADAPTATION: ['deviceAdaptation'],
  UPDATE_LEARNER_EVIDENCE: ['summary', 'sourceRef', 'capturedAt', 'lessonRef', 'activityRef', 'conceptRef', 'materialForReadyToTeach'],
  UPDATE_PLANNING_IMPLICATION: ['evidenceRefs', 'implication', 'affectedActivityRefs', 'confidence'],
  UPDATE_SUCCESS_CRITERIA: ['statement', 'observableEvidence', 'mappedQuestionRefs', 'mappedActivityRefs'],
  UPDATE_COGNITIVE_DEMAND: ['cognitiveDemand'],
  UPDATE_FORMATIVE_CHECK: ['collect'],
  UPDATE_DECISION_RULE: ['decisionRule'],
  ADD_RECHECK: ['recheck'],
  UPDATE_DIFFERENTIATION: ['differentiation'],
  UPDATE_SCAFFOLD_FADE: ['fadeCondition'],
  UPDATE_CONDITIONAL_FEATURE: ['triggered', 'triggerReason', 'learningValue', 'studentAction', 'expectedEvidence', 'observerEvidence'],
  UPDATE_REFLECTION: ['mappedSuccessCriteria', 'studentReflection', 'nextStep'],
};

export const reviewPatchAllowedFields = (operation: LessonIRPatchOperation): readonly string[] => allowedChanges[operation];

const applyChanges = (lesson: LessonIRV83, patch: LessonIRPatch): void => {
  const target = targetForPatch(lesson, patch.op, patch.targetId);
  if (!target || typeof target !== 'object') throw new Error(`PATCH_TARGET_NOT_FOUND:${patch.targetId}`);
  const changes = patch.changes;
  const activity = ACTIVITY_OPS.has(patch.op) ? target as LessonIRV83['timeline'][number] : null;
  switch (patch.op) {
    case 'ADD_HINT': lesson.questions[patch.targetId].hints.push(changes.hint as LessonIRV83['questions'][string]['hints'][number]); break;
    case 'CHANGE_TIMING': {
      if (!activity) throw new Error('PATCH_TARGET_NOT_FOUND');
      activity.durationSec = changes.durationSec as number;
      activity.timingPolicy.plannedDurationSec = activity.durationSec;
      if ('surfaceSwitchCostSec' in changes) activity.timingPolicy.surfaceSwitchCostSec = changes.surfaceSwitchCostSec as number;
      break;
    }
    case 'ADD_STUDENT_VISUAL': {
      if (!activity) throw new Error('PATCH_TARGET_NOT_FOUND');
      const visualId = changes.visualId as string;
      if (!lesson.visuals[visualId]) throw new Error(`PATCH_VISUAL_NOT_FOUND:${visualId}`);
      activity.student.visualRefs = [...new Set([...(activity.student.visualRefs ?? []), visualId])];
      break;
    }
    case 'UPDATE_PAIRED_SURFACE': {
      if (!activity) throw new Error('PATCH_TARGET_NOT_FOUND');
      if ('presenterVisualRefs' in changes) activity.presenter.visualRefs = changes.presenterVisualRefs as string[];
      if ('studentVisualRefs' in changes) activity.student.visualRefs = changes.studentVisualRefs as string[];
      if ('sharedContextRequired' in changes) activity.threeWayOrchestration.sharedContextRequired = changes.sharedContextRequired as boolean;
      break;
    }
    case 'UPDATE_ATTENTION_BEACON': Object.assign(activity!.attentionBeacon, changes.attentionBeacon); break;
    case 'UPDATE_ORCHESTRATION': Object.assign(activity!.threeWayOrchestration, changes.threeWayOrchestration); break;
    case 'UPDATE_SURFACE_HANDOFF': activity!.surfaceHandoff = changes.surfaceHandoff as LessonIRV83['timeline'][number]['surfaceHandoff']; break;
    case 'UPDATE_DEVICE_ADAPTATION': Object.assign(activity!.deviceAdaptation, changes.deviceAdaptation); break;
    case 'UPDATE_COGNITIVE_DEMAND': activity!.cognitiveDemand = changes.cognitiveDemand as string; break;
    case 'UPDATE_DIFFERENTIATION': Object.assign(activity!.differentiation, changes.differentiation); break;
    case 'UPDATE_FORMATIVE_CHECK': Object.assign((target as LessonIRV83['formativeDecisionCycles'][number]).collect, changes.collect); break;
    case 'UPDATE_DECISION_RULE': Object.assign((target as LessonIRV83['formativeDecisionCycles'][number]).decisionRule, changes.decisionRule); break;
    case 'ADD_RECHECK': (target as LessonIRV83['formativeDecisionCycles'][number]).recheck = changes.recheck as LessonIRV83['formativeDecisionCycles'][number]['recheck']; break;
    case 'UPDATE_LEARNER_EVIDENCE': {
      Object.assign(target, changes);
      const evidence = target as LessonIRV83['learnerContext']['evidence'][number];
      if (evidence.type === 'planning_assumption' || evidence.type === 'unknown') evidence.confirmedByTeacher = false;
      break;
    }
    default: Object.assign(target, changes);
  }
};

export const applyIrPatchCandidate = async (
  lesson: LessonIRV83,
  patch: LessonIRPatch,
  classification: Pick<IssueClassification, 'targetLayer'> = { targetLayer: 'LESSON_IR' },
): Promise<ApplyIrPatchResult> => {
  if (classification.targetLayer !== 'LESSON_IR') {
    return { accepted: false, issues: [classification.targetLayer === 'SHARED_ENGINE'
      ? 'ENGINE_ISSUE_REQUIRES_ENGINE_PLAN' : 'ISSUE_REQUIRES_REVIEW'] };
  }
  const issues: string[] = [];
  if (!LESSON_IR_PATCH_OPERATIONS.includes(patch.op)) issues.push('PATCH_OPERATION_INVALID');
  const unsafeKey = unsafePatchKey(patch.changes);
  if (unsafeKey) issues.push(`PATCH_UNSAFE_KEY:${unsafeKey}`);
  if (patch.baseLessonVersion !== lesson.lesson.lessonVersion) issues.push('BASE_LESSON_VERSION_MISMATCH');
  if (patch.baseContentHash !== await computeLessonContentHash(lesson)) issues.push('BASE_CONTENT_HASH_MISMATCH');
  const target = targetForPatch(lesson, patch.op, patch.targetId);
  if (target === undefined) issues.push(`PATCH_TARGET_NOT_FOUND:${patch.targetId}`);
  else if (patch.beforeHash !== await hashJson(target)) issues.push('PATCH_TARGET_HASH_MISMATCH');
  for (const key of Object.keys(patch.changes)) {
    if (!allowedChanges[patch.op]?.includes(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) {
      issues.push(`PATCH_PATH_NOT_ALLOWED:${key}`);
    }
  }
  if (!Object.keys(patch.changes).length) issues.push('PATCH_CHANGES_REQUIRED');
  if (issues.length) return { accepted: false, issues };

  const candidateIR = structuredClone(lesson);
  try {
    applyChanges(candidateIR, patch);
  } catch (error) {
    return { accepted: false, issues: [error instanceof Error ? error.message : 'PATCH_APPLY_FAILED'] };
  }
  const schemaResult = validateLessonIRSchema(candidateIR);
  if (!schemaResult.valid) {
    return { accepted: false, issues: schemaResult.issues.map(item => `SCHEMA_INVALID:${item.path}`) };
  }

  const draftHash = await computeLessonContentHash(candidateIR);
  const version = `${lesson.lesson.lessonVersion}-review-${draftHash.slice(0,10)}`;
  candidateIR.lesson.lessonVersion = version;
  candidateIR.buildStatus = 'QUALITY_AUDIT';
  candidateIR.qualityAudit = {
    ...candidateIR.qualityAudit,
    status: 'BLOCKED',
    passedRules: [],
    failedRules: ['QA_NOT_RUN'],
    warnings: [],
  };
  delete candidateIR.generatedArtifacts;
  const contentHash = await computeLessonContentHash(candidateIR);
  if (candidateIR.provenance) candidateIR.provenance.contentHash = contentHash;
  return {
    accepted: true,
    candidate: {
      id: `${lesson.lesson.lessonId}:${version}`,
      status: 'CANDIDATE_DRAFT',
      qaStatus: 'NOT_RUN',
      parentVersion: lesson.lesson.lessonVersion,
      version,
      contentHash,
      patch: structuredClone(patch),
      lessonIR: candidateIR,
    },
  };
};

export interface LessonVersionPointer<T extends { version: string }> {
  currentVersion: string;
  history: T[];
  rollbackFrom: string;
}

export const getVersionPointerAfterRollback = <T extends { version: string }>(
  records: readonly T[], currentVersion: string, targetVersion: string,
): LessonVersionPointer<T> => {
  if (!records.some(record => record.version === currentVersion)) throw new Error('CURRENT_VERSION_NOT_FOUND');
  if (!records.some(record => record.version === targetVersion)) throw new Error('ROLLBACK_TARGET_NOT_FOUND');
  return { currentVersion: targetVersion, history: [...records], rollbackFrom: currentVersion };
};
