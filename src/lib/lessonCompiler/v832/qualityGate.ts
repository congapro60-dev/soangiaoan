import type { LessonIRV83 } from './lessonIRSchema.js';
import { validateLessonIRSchema } from './lessonIRSchema.js';
import { inspectTeacherConfirmations } from './teacherConfirmation.js';
import validatorContract from './CIS_TDS_Lesson_Validator_v1.1.json';

type QualityStatus = 'BLOCKED' | 'NEEDS_TEACHER_CONFIRMATION' | 'READY_WITH_WARNINGS' | 'READY';
type Pillar = 'differentiation' | 'global_intercultural' | 'digital_citizenship' | 'assessment_for_learning';

export interface SemanticRuleAttestation {
  ruleId: string;
  verdict: 'pass' | 'fail';
  evidence: string;
  reviewer: string;
  reviewedAt: string;
}

export interface LearningQualityResult {
  status: QualityStatus;
  passedRules: string[];
  failedRules: string[];
  pendingRules: string[];
  warnings: string[];
  teacherConfirmationsRequired: Array<{ id: string; reason: string; materialForReadyToTeach: boolean }>;
  derivedBadges: Record<Pillar, boolean>;
}

const filled = (value: string | null | undefined): boolean => Boolean(value?.trim());
const semanticRules = new Set(['M01', 'M04', 'M05', 'M08', 'M09', 'M10', 'M13', 'M14']);

const validDecisionCycle = (cycle: LessonIRV83['formativeDecisionCycles'][number], successIds: Set<string>, activityIds: Set<string>): boolean => {
  const branches = [cycle.decisionRule.below, cycle.decisionRule.onTrack, cycle.decisionRule.above];
  return filled(cycle.collect.method)
    && filled(cycle.collect.evidenceCollected)
    && cycle.mappedSuccessCriteria.length > 0
    && cycle.mappedSuccessCriteria.every(id => successIds.has(id))
    && activityIds.has(cycle.activityRef)
    && branches.every(branch => filled(branch.interpretation) && filled(branch.decision) && filled(branch.action))
    && filled(cycle.recheck.method)
    && filled(cycle.recheck.newEvidence)
    && filled(cycle.recheck.timing);
};

const validFeature = (feature: LessonIRV83['conditionalFeatures']['digitalCitizenship']): boolean => !feature.triggered || [
  feature.triggerReason, feature.learningValue, feature.studentAction, feature.expectedEvidence,
].every(filled);

export const evaluateLearningQuality = (lesson: LessonIRV83, attestations: readonly SemanticRuleAttestation[] = []): LearningQualityResult => {
  const derivedBadges: Record<Pillar, boolean> = {
    differentiation: false, global_intercultural: false, digital_citizenship: false, assessment_for_learning: false,
  };
  const schema = validateLessonIRSchema(lesson);
  if (!schema.valid) {
    return {
      status: 'BLOCKED', passedRules: [], failedRules: ['SCHEMA'], pendingRules: [],
      warnings: schema.issues.map(issue => `SCHEMA ${issue.path}: ${issue.message}`),
      teacherConfirmationsRequired: [], derivedBadges,
    };
  }

  const activities = lesson.timeline;
  const activityIds = new Set(activities.map(activity => activity.id));
  const successIds = new Set(lesson.learningDesign.successCriteria.map(criterion => criterion.id));
  const confirmations = inspectTeacherConfirmations(lesson);
  const hasFormative = lesson.formativeDecisionCycles.length > 0;
  const validCycles = hasFormative && lesson.formativeDecisionCycles.every(cycle => validDecisionCycle(cycle, successIds, activityIds));
  const mainActivities = activities.filter(activity => !['lobby', 'closing'].includes(activity.phase));
  const durationSec = activities.reduce((sum, activity) => sum + activity.durationSec, 0);
  const checks: Record<string, boolean> = {
    M01: lesson.sourceVerification.status === 'VERIFIED'
      && lesson.sourceVerification.canonicalSources.length > 0
      && lesson.sourceVerification.unresolved.length === 0,
    M02: lesson.learnerContext.evidence.length > 0
      && lesson.learnerContext.planningImplications.length > 0
      && lesson.learnerContext.planningImplications.every(item => item.evidenceRefs.length > 0 && item.evidenceRefs.every(id => lesson.learnerContext.evidence.some(evidence => evidence.id === id))),
    M03: filled(lesson.learningDesign.learningIntention.vi)
      && lesson.learningDesign.successCriteria.length > 0
      && lesson.learningDesign.successCriteria.every(criterion => filled(criterion.statement.vi) && filled(criterion.observableEvidence)),
    M04: activities.length > 0 && new Set(activities.map(activity => activity.order)).size === activities.length
      && activities.every((activity, index) => activity.order === index + 1),
    M05: filled(lesson.learningDesign.intellectualDemand.coreRichThinkingMoment)
      && mainActivities.some(activity => ['analyze', 'justify', 'critique', 'generalize', 'model', 'create'].includes(activity.cognitiveDemand) && filled(activity.expectedEvidence)),
    M06: hasFormative && lesson.formativeDecisionCycles.some(cycle => {
      const index = activities.findIndex(activity => activity.id === cycle.activityRef);
      return index >= 0 && index < activities.length - 1
        && !['exit', 'reflection', 'closing'].includes(activities[index].phase);
    }),
    M07: validCycles && lesson.formativeDecisionCycles.every(cycle => activities.some(activity => activity.id === cycle.activityRef && activity.formativeCycleRefs?.includes(cycle.id))),
    M08: mainActivities.every(activity => filled(activity.differentiation.commonCoreLearning)
      && activity.differentiation.scaffolds.every(scaffold => filled(scaffold.fadeCondition))
      && activity.differentiation.challenge.addsDepth !== false),
    M09: !lesson.conditionalFeatures.intensiveLanguageSupport.triggered
      || Object.keys(lesson.languageSupport.activitySupport).length > 0,
    // Privacy is proved by role projections, Rules and browser QA, not by text in mustNotShow.
    M10: true,
    M11: filled(lesson.reflectionContract.studentReflection)
      && filled(lesson.reflectionContract.nextStep)
      && lesson.reflectionContract.mappedSuccessCriteria.length > 0
      && lesson.reflectionContract.mappedSuccessCriteria.every(id => successIds.has(id)),
    M12: durationSec === lesson.lesson.runtimeMin * 60
      && activities.every(activity => activity.durationSec > 0 && activity.timingPolicy.plannedDurationSec === activity.durationSec
        && activity.timingPolicy.surfaceSwitchCostSec <= activity.durationSec && activity.timingPolicy.neverAutoNext),
    M13: mainActivities.length > 0 && mainActivities.every(activity => filled(activity.studentAction) && filled(activity.expectedEvidence) && filled(activity.successLookFor)),
    M14: mainActivities.every(activity => filled(activity.coach.purpose) && filled(activity.coach.transitionWhen)
      && filled(activity.coach.studentMirror.expectedProduct)),
    M15: confirmations.provenanceIssues.length === 0,
  };

  const passedRules: string[] = [];
  const failedRules: string[] = [];
  const pendingRules: string[] = [];
  for (const rule of validatorContract.must_rules) {
    if (!checks[rule.id]) {
      failedRules.push(rule.id);
    } else if (semanticRules.has(rule.id)) {
      const review = attestations.find(item => item.ruleId === rule.id && filled(item.evidence) && filled(item.reviewer) && filled(item.reviewedAt));
      if (!review) pendingRules.push(rule.id);
      else if (review.verdict === 'fail') failedRules.push(rule.id);
      else passedRules.push(rule.id);
    } else {
      passedRules.push(rule.id);
    }
  }

  const warnings: string[] = [];
  const featureForPillar: Partial<Record<Pillar, keyof LessonIRV83['conditionalFeatures']>> = {
    global_intercultural: 'globalIntercultural', digital_citizenship: 'digitalCitizenship',
  };
  const featureKeys: Array<keyof LessonIRV83['conditionalFeatures']> = [
    'globalIntercultural', 'digitalCitizenship', 'technologyEnhancedMathematics', 'realWorldExperiential',
    'groupWork', 'peerAssessment', 'flippedLearning', 'intensiveLanguageSupport',
  ];
  for (const [index, key] of featureKeys.entries()) {
    if (!validFeature(lesson.conditionalFeatures[key])) warnings.push(`C${String(index + 1).padStart(2, '0')}_INVALID_FEATURE`);
  }
  for (const entry of lesson.cisEvidenceMap) {
    const linkedFeature = featureForPillar[entry.pillar];
    const eligible = activityIds.has(entry.activityRef)
      && filled(entry.studentBehavior) && filled(entry.observerEvidence)
      && (!linkedFeature || (lesson.conditionalFeatures[linkedFeature].triggered && validFeature(lesson.conditionalFeatures[linkedFeature])))
      && (entry.pillar !== 'assessment_for_learning' || validCycles)
      && (entry.pillar !== 'differentiation' || checks.M08);
    derivedBadges[entry.pillar] ||= eligible;
    if (entry.badgeEligible && !eligible) {
      const code = entry.pillar === 'digital_citizenship' ? 'C02_BADGE_WITHOUT_VALID_FEATURE'
        : entry.pillar === 'global_intercultural' ? 'C01_BADGE_WITHOUT_VALID_FEATURE'
          : 'CIS_BADGE_WITHOUT_EVIDENCE';
      warnings.push(code);
    }
  }

  const status: QualityStatus = failedRules.length > 0 || pendingRules.length > 0 ? 'BLOCKED'
    : confirmations.releaseBlocked ? 'NEEDS_TEACHER_CONFIRMATION'
      : warnings.length > 0 ? 'READY_WITH_WARNINGS' : 'READY';
  return {
    status, passedRules, failedRules, pendingRules, warnings, derivedBadges,
    teacherConfirmationsRequired: confirmations.pending.map(item => ({
      id: item.id, reason: item.reason, materialForReadyToTeach: item.material,
    })),
  };
};
