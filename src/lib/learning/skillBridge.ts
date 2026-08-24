import {
  findSkillByTopic,
  SKILL_CATALOG,
  type SkillTopicMatch,
} from './skillCatalog.js';
import type {
  SkillDefinition,
  SkillEvidence,
  SkillEvidenceSource,
  SkillSignal,
} from './skillTypes.js';

export const mapTopicToSkill = (topic: string, catalog: SkillDefinition[] = SKILL_CATALOG): SkillTopicMatch =>
  findSkillByTopic(topic, catalog);

export type ObjectiveSkillMatch =
  | { kind: 'unique'; skill: SkillDefinition }
  | { kind: 'unlinked'; objectiveId: string }
  | { kind: 'unknown'; objectiveId: string; skillId: string };

export interface ObjectiveReference {
  id: string;
  skillId?: string;
}

export const mapObjectiveToSkill = (
  objective: ObjectiveReference,
  catalog: SkillDefinition[] = SKILL_CATALOG,
): ObjectiveSkillMatch => {
  const skillId = objective.skillId?.trim();
  if (!skillId) return { kind: 'unlinked', objectiveId: objective.id };

  const skill = catalog.find(item => item.skillId === skillId);
  return skill
    ? { kind: 'unique', skill }
    : { kind: 'unknown', objectiveId: objective.id, skillId };
};

export interface SkillEvidenceInput {
  evidenceId: string;
  source: SkillEvidenceSource;
  signal: SkillSignal;
  skillId?: string;
  topic?: string;
  scoreRatio?: number;
  confidence: number;
  misconceptionCodes?: string[];
  assignmentId?: string;
  submissionId?: string;
  attemptId?: string;
  assessedAt: string;
  approved?: boolean;
}

const clamp01 = (value: number | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

const resolveSkillId = (input: SkillEvidenceInput): string | null => {
  if (input.skillId?.trim()) {
    return SKILL_CATALOG.some(skill => skill.skillId === input.skillId?.trim())
      ? input.skillId.trim()
      : null;
  }

  if (!input.topic) return null;
  const match = mapTopicToSkill(input.topic);
  return match.kind === 'unique' ? match.skill.skillId : null;
};

/**
 * Chuẩn hóa một tín hiệu thành evidence canonical. Homework chỉ có giá trị
 * authoritative sau khi giáo viên duyệt; unknown/ambiguous topic bị bỏ qua.
 */
export const toSkillEvidence = (input: SkillEvidenceInput): SkillEvidence | null => {
  if (input.source === 'homework' && input.approved !== true) return null;

  const skillId = resolveSkillId(input);
  if (!skillId || !input.evidenceId.trim() || !input.assessedAt.trim()) return null;

  const evidence: SkillEvidence = {
    evidenceId: input.evidenceId.trim(),
    skillId,
    source: input.source,
    signal: input.signal,
    confidence: clamp01(input.confidence),
    assessedAt: input.assessedAt.trim(),
  };

  if (input.scoreRatio !== undefined) evidence.scoreRatio = clamp01(input.scoreRatio);
  if (input.misconceptionCodes?.length) {
    evidence.misconceptionCodes = [...new Set(input.misconceptionCodes.map(code => code.trim()).filter(Boolean))];
  }
  if (input.assignmentId?.trim()) evidence.assignmentId = input.assignmentId.trim();
  if (input.submissionId?.trim()) evidence.submissionId = input.submissionId.trim();
  if (input.attemptId?.trim()) evidence.attemptId = input.attemptId.trim();
  if (input.approved !== undefined) evidence.approved = input.approved;

  return evidence;
};
