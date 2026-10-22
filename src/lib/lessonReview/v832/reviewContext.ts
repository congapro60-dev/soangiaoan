import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema';

export interface ReviewCaptureState {
  role: 'presenter' | 'student' | 'coach';
  activityId: string;
  locale: 'vi' | 'en' | 'ja';
  viewport: { width: number; height: number; devicePixelRatio: number };
  revealStep?: number;
  visualStateId?: string;
  attentionSurface?: string;
  handoffState?: string;
  roomStateRevision?: number;
  questionInstanceId?: string;
  questionRunKey?: string;
  questionRunRevision?: number;
  questionPhase?: string;
  contentHash: string;
  buildId: string;
  compilerVersion: string;
  runtimeVersion: string;
  route: string;
  screenshotAssetId: string;
  visibleComponentIds: string[];
}

export interface ReviewContext extends ReviewCaptureState {
  lessonId: string;
  lessonVersion: string;
  activityOrder: number;
  pedagogical: {
    learningIntention: LessonIRV83['learningDesign']['learningIntention'];
    successCriteria: LessonIRV83['learningDesign']['successCriteria'];
    learnerEvidenceProvenance: LessonIRV83['learnerContext']['evidence'];
    planningAssumptions: LessonIRV83['learnerContext']['evidence'];
    objectiveRefs: string[];
    cognitiveDemand: string;
    expectedEvidence: string;
    thresholdRules: string[];
    recommendedAction: string;
    recheck?: string;
    differentiationState: LessonIRV83['timeline'][number]['differentiation'];
    fadeCondition?: string;
    conditionalFeatureState: LessonIRV83['conditionalFeatures'];
    reflectionContract: LessonIRV83['reflectionContract'];
  };
}

export const captureReviewContext = (lesson: LessonIRV83, state: ReviewCaptureState): ReviewContext => {
  const activity = lesson.timeline.find(item => item.id === state.activityId);
  if (!activity) throw new Error(`Không tìm thấy activity ${state.activityId} để ghi ReviewContext.`);
  const formativeCycle = lesson.formativeDecisionCycles.find(cycle => activity.formativeCycleRefs?.includes(cycle.id));
  const fadeCondition = activity.differentiation.scaffolds.map(scaffold => scaffold.fadeCondition).filter(Boolean).join('; ');
  return {
    ...state,
    visibleComponentIds: [...state.visibleComponentIds],
    lessonId: lesson.lesson.lessonId,
    lessonVersion: lesson.lesson.lessonVersion,
    activityOrder: activity.order,
    pedagogical: {
      learningIntention: lesson.learningDesign.learningIntention,
      successCriteria: lesson.learningDesign.successCriteria,
      learnerEvidenceProvenance: lesson.learnerContext.evidence,
      planningAssumptions: lesson.learnerContext.evidence.filter(evidence => evidence.type === 'planning_assumption' || evidence.type === 'unknown'),
      objectiveRefs: activity.objectiveRefs,
      cognitiveDemand: activity.cognitiveDemand,
      expectedEvidence: activity.expectedEvidence,
      thresholdRules: activity.coach.studentMirror.aflThresholds ?? [],
      recommendedAction: activity.coach.studentMirror.recommendedTeacherAction,
      ...(formativeCycle ? { recheck: formativeCycle.recheck.newEvidence } : {}),
      differentiationState: activity.differentiation,
      ...(fadeCondition ? { fadeCondition } : {}),
      conditionalFeatureState: lesson.conditionalFeatures,
      reflectionContract: lesson.reflectionContract,
    },
  };
};
