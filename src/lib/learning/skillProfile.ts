import { mapTopicToSkill } from './skillBridge.js';
import { SKILL_CATALOG } from './skillCatalog.js';
import { reduceSkillStates } from './skillMastery.js';
import type { SkillEvidence, SkillSignal, StudentSkillState } from './skillTypes.js';

interface HomeworkGradeInput {
  score: number;
  maxScore: number;
  weakTopics?: string[];
  strengths?: string[];
  teacherApproved: boolean;
  gradedAt: string;
  questionResults?: Array<{ confidence?: number }>;
}

export interface HomeworkSkillEvidenceInput {
  submissionId: string;
  assignmentId?: string;
  grade: HomeworkGradeInput;
}

export interface OnlineSkillEvidenceInput {
  attemptId: string;
  assignmentId?: string;
  skillIds?: string[];
  score: number;
  maxScore: number;
  teacherApproved: boolean;
  gradedAt: string;
}

interface PracticeEvidenceInput {
  attemptId: string;
  setId: string;
  skillIds?: string[];
  topics?: string[];
  score?: number;
  maxScore?: number;
  updatedAt: string;
  status: 'grading' | 'graded' | 'error';
}

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const uniqueStrings = (values: string[] | undefined): string[] =>
  [...new Set((values || []).map(value => value.trim()).filter(Boolean))];

const gradeConfidence = (grade: HomeworkGradeInput): number => {
  const values = (grade.questionResults || [])
    .map(item => item.confidence)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .map(clamp01);
  if (values.length === 0) return 0.6;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const addTopicSignals = (
  target: Map<string, { weak: boolean; strong: boolean }>,
  topics: string[] | undefined,
  kind: 'weak' | 'strong',
): void => {
  for (const topic of uniqueStrings(topics)) {
    const match = mapTopicToSkill(topic);
    if (match.kind !== 'unique') continue;
    const existing = target.get(match.skill.skillId) || { weak: false, strong: false };
    existing[kind] = true;
    target.set(match.skill.skillId, existing);
  }
};

const signalFromRatio = (ratio: number): SkillSignal => {
  if (ratio < 0.4) return 'weak';
  if (ratio < 0.75) return 'partial';
  return 'strong';
};

export const skillIdsForTopics = (topics: string[] | undefined): string[] => {
  const ids = new Set<string>();
  for (const topic of uniqueStrings(topics)) {
    const match = mapTopicToSkill(topic);
    if (match.kind === 'unique') ids.add(match.skill.skillId);
  }
  return [...ids];
};

export const buildHomeworkSkillEvidence = ({ submissionId, assignmentId, grade }: HomeworkSkillEvidenceInput): SkillEvidence[] => {
  if (!grade.teacherApproved || !submissionId.trim() || !grade.gradedAt.trim()) return [];

  const signals = new Map<string, { weak: boolean; strong: boolean }>();
  addTopicSignals(signals, grade.weakTopics, 'weak');
  addTopicSignals(signals, grade.strengths, 'strong');

  const scoreRatio = grade.maxScore > 0 ? clamp01(grade.score / grade.maxScore) : 0;
  const confidence = gradeConfidence(grade);
  return [...signals.entries()].map(([skillId, signal]) => ({
    evidenceId: `${submissionId}:${skillId}`,
    skillId,
    source: 'homework' as const,
    signal: signal.weak ? 'weak' : 'strong',
    scoreRatio,
    confidence,
    ...(assignmentId?.trim() ? { assignmentId: assignmentId.trim() } : {}),
    submissionId: submissionId.trim(),
    assessedAt: grade.gradedAt.trim(),
    approved: true,
  }));
};

/** Online attempt chỉ trở thành minh chứng homework sau khi có điểm chính thức. */
export const buildOnlineSkillEvidence = ({
  attemptId,
  assignmentId,
  skillIds,
  score,
  maxScore,
  teacherApproved,
  gradedAt,
}: OnlineSkillEvidenceInput): SkillEvidence[] => {
  const sourceId = attemptId.trim();
  const assessedAt = gradedAt.trim();
  if (!teacherApproved || !sourceId || !assessedAt) return [];

  const ids = [...new Set(uniqueStrings(skillIds))]
    .filter(skillId => SKILL_CATALOG.some(skill => skill.skillId === skillId));
  if (ids.length === 0) return [];

  const ratio = maxScore > 0 ? clamp01(score / maxScore) : 0;
  return ids.map(skillId => ({
    evidenceId: `${sourceId}:${skillId}`,
    skillId,
    source: 'homework' as const,
    signal: signalFromRatio(ratio),
    scoreRatio: ratio,
    confidence: 0.8,
    ...(assignmentId?.trim() ? { assignmentId: assignmentId.trim() } : {}),
    submissionId: sourceId,
    assessedAt,
    approved: true,
  }));
};

export const buildPracticeSkillEvidence = ({
  attemptId,
  setId: _setId,
  skillIds,
  topics,
  score = 0,
  maxScore = 0,
  updatedAt,
  status,
}: PracticeEvidenceInput): SkillEvidence[] => {
  if (status !== 'graded' || !attemptId.trim() || !updatedAt.trim()) return [];

  const ids = new Set<string>();
  for (const skillId of uniqueStrings(skillIds)) {
    if (SKILL_CATALOG.some(skill => skill.skillId === skillId)) ids.add(skillId);
  }
  if (ids.size === 0) skillIdsForTopics(topics).forEach(skillId => ids.add(skillId));

  const ratio = maxScore > 0 ? clamp01(score / maxScore) : 0;
  return [...ids].map(skillId => ({
    evidenceId: `${attemptId}:${skillId}`,
    skillId,
    source: 'practice' as const,
    signal: signalFromRatio(ratio),
    scoreRatio: ratio,
    confidence: Math.min(0.5, ratio),
    attemptId: attemptId.trim(),
    assessedAt: updatedAt.trim(),
  }));
};

export const buildSkillSummary = (evidence: SkillEvidence[]): StudentSkillState[] =>
  reduceSkillStates(SKILL_CATALOG, evidence);
