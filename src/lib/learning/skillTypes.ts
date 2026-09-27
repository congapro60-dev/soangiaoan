export type SkillStatus =
  | 'not_seen'
  | 'weak'
  | 'developing'
  | 'mastered'
  | 'advanced';

export type SkillEvidenceSource = 'homework' | 'practice' | 'transfer';
export type SkillSignal = 'weak' | 'partial' | 'strong';
export type SkillTrend = 'up' | 'flat' | 'down';

export interface SkillDefinition {
  skillId: string;
  domain: string;
  title: string;
  description: string;
  aliases: string[];
  prerequisiteSkillIds: string[];
  misconceptionCodes: string[];
  masteryThreshold: number;
}

export interface SkillEvidence {
  evidenceId: string;
  skillId: string;
  source: SkillEvidenceSource;
  signal: SkillSignal;
  scoreRatio?: number;
  confidence: number;
  misconceptionCodes?: string[];
  assignmentId?: string;
  submissionId?: string;
  attemptId?: string;
  assessedAt: string;
  approved?: boolean;
}

export interface StudentSkillState {
  skillId: string;
  masteryEstimate: number;
  confidence: number;
  status: SkillStatus;
  evidenceCount: number;
  sourceKinds: SkillEvidenceSource[];
  misconceptionCounts: Record<string, number>;
  trend: SkillTrend;
  lastEvidenceAt: string;
}
