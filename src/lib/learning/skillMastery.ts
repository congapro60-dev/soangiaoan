import type {
  SkillDefinition,
  SkillEvidence,
  SkillEvidenceSource,
  SkillStatus,
  SkillTrend,
  StudentSkillState,
} from './skillTypes';

export const SKILL_MASTERY_POLICY = {
  sourceWeights: {
    homework: 1,
    practice: 0.35,
    transfer: 1,
  } satisfies Record<SkillEvidenceSource, number>,
  weakEvidenceMinimum: 2,
  advancedEstimate: 0.9,
  trendDelta: 0.1,
} as const;

const signalScores = {
  weak: 0,
  partial: 0.5,
  strong: 1,
} as const;

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const evidenceDate = (evidence: SkillEvidence): number => {
  const parsed = Date.parse(evidence.assessedAt);
  return Number.isFinite(parsed) ? parsed : 0;
};

const evidenceIdentity = (evidence: SkillEvidence): string => {
  if (evidence.source === 'homework' && evidence.assignmentId) return `homework:assignment:${evidence.assignmentId}`;
  if (evidence.source === 'practice' && evidence.attemptId) return `practice:attempt:${evidence.attemptId}`;
  return `${evidence.source}:evidence:${evidence.submissionId || evidence.evidenceId}`;
};

const latestEvidence = (evidence: SkillEvidence[]): SkillEvidence[] => {
  const latestByIdentity = new Map<string, SkillEvidence>();
  for (const item of evidence) {
    const identity = evidenceIdentity(item);
    const previous = latestByIdentity.get(identity);
    if (!previous || evidenceDate(item) >= evidenceDate(previous)) latestByIdentity.set(identity, item);
  }
  return [...latestByIdentity.values()].sort((a, b) => evidenceDate(a) - evidenceDate(b));
};

const signalScore = (evidence: SkillEvidence): number =>
  clamp01(evidence.scoreRatio ?? signalScores[evidence.signal]);

const isHighQuality = (evidence: SkillEvidence): boolean =>
  evidence.source === 'transfer' || (evidence.source === 'homework' && evidence.approved === true);

const independentEvidenceKey = (evidence: SkillEvidence): string =>
  evidence.source === 'homework'
    ? `homework:${evidence.assignmentId || evidence.submissionId || evidence.evidenceId}`
    : evidence.source === 'practice'
      ? `practice:${evidence.attemptId || evidence.evidenceId}`
      : `transfer:${evidence.evidenceId}`;

const statusFor = (
  definition: SkillDefinition,
  evidence: SkillEvidence[],
  masteryEstimate: number,
): SkillStatus => {
  if (evidence.length === 0) return 'not_seen';

  const weakEvidence = new Set(
    evidence
      .filter(item => isHighQuality(item) && item.signal === 'weak')
      .map(independentEvidenceKey),
  ).size;
  if (weakEvidence >= SKILL_MASTERY_POLICY.weakEvidenceMinimum) return 'weak';

  const highQualityCount = evidence.filter(isHighQuality).length;
  if (
    masteryEstimate >= Math.max(definition.masteryThreshold, SKILL_MASTERY_POLICY.advancedEstimate)
    && highQualityCount >= 2
  ) return 'advanced';
  if (masteryEstimate >= definition.masteryThreshold && highQualityCount >= 1) return 'mastered';
  return 'developing';
};

const trendFor = (evidence: SkillEvidence[]): SkillTrend => {
  if (evidence.length < 2) return 'flat';
  const previous = signalScore(evidence[evidence.length - 2]);
  const latest = signalScore(evidence[evidence.length - 1]);
  const delta = latest - previous;
  if (delta >= SKILL_MASTERY_POLICY.trendDelta) return 'up';
  if (delta <= -SKILL_MASTERY_POLICY.trendDelta) return 'down';
  return 'flat';
};

export const reduceSkillState = (
  definition: SkillDefinition,
  allEvidence: SkillEvidence[],
): StudentSkillState => {
  const evidence = latestEvidence(allEvidence.filter(item => item.skillId === definition.skillId));
  const weightedScore = evidence.reduce((sum, item) => {
    return sum + signalScore(item) * SKILL_MASTERY_POLICY.sourceWeights[item.source];
  }, 0);
  const totalWeight = evidence.reduce((sum, item) => sum + SKILL_MASTERY_POLICY.sourceWeights[item.source], 0);
  const masteryEstimate = totalWeight > 0 ? clamp01(weightedScore / totalWeight) : 0;
  const confidence = clamp01(evidence.reduce((sum, item) => {
    return sum + clamp01(item.confidence) * SKILL_MASTERY_POLICY.sourceWeights[item.source];
  }, 0));
  const misconceptionCounts: Record<string, number> = {};
  for (const item of evidence) {
    for (const code of item.misconceptionCodes || []) {
      if (code.trim()) misconceptionCounts[code] = (misconceptionCounts[code] || 0) + 1;
    }
  }

  return {
    skillId: definition.skillId,
    masteryEstimate,
    confidence,
    status: statusFor(definition, evidence, masteryEstimate),
    evidenceCount: evidence.length,
    sourceKinds: [...new Set(evidence.map(item => item.source))],
    misconceptionCounts,
    trend: trendFor(evidence),
    lastEvidenceAt: evidence[evidence.length - 1]?.assessedAt || '',
  };
};

export const reduceSkillStates = (
  definitions: SkillDefinition[],
  evidence: SkillEvidence[],
): StudentSkillState[] => definitions.map(definition => reduceSkillState(definition, evidence));
