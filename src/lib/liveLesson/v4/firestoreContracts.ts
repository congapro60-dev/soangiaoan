// Client-side Firestore document path builders and shape guards for V4 live lesson data zones.
// Mirrors firestore.rules — these are pure functions with no Firestore SDK dependency.

const SESSIONS_COL = 'liveLessonSessions';
const RESPONSES_SUB = 'responses';
const EVIDENCE_SUB = 'evidence';
const PROPOSALS_SUB = 'groupProposals';
const GROUPS_SUB = 'groups';
const PUBLIC_SUB = 'public';

// --- Path builders ---

export const sessionPath = (sessionId: string): string =>
  `${SESSIONS_COL}/${sessionId}`;

export const responsePath = (sessionId: string, responseId: string): string =>
  `${SESSIONS_COL}/${sessionId}/${RESPONSES_SUB}/${responseId}`;

export const evidencePath = (sessionId: string, evidenceId: string): string =>
  `${SESSIONS_COL}/${sessionId}/${EVIDENCE_SUB}/${evidenceId}`;

export const groupProposalsPath = (sessionId: string): string =>
  `${SESSIONS_COL}/${sessionId}/${PROPOSALS_SUB}/current`;

export const groupPath = (sessionId: string, groupId: string): string =>
  `${SESSIONS_COL}/${sessionId}/${GROUPS_SUB}/${groupId}`;

export const groupStudentPath = (sessionId: string, groupId: string, studentId: string): string =>
  `${SESSIONS_COL}/${sessionId}/${GROUPS_SUB}/${groupId}/students/${studentId}`;

export const publicStatePath = (sessionId: string): string =>
  `${SESSIONS_COL}/${sessionId}/${PUBLIC_SUB}/state`;

export const publicStatsPath = (sessionId: string): string =>
  `${SESSIONS_COL}/${sessionId}/${PUBLIC_SUB}/stats`;

export const responseId = (participantUid: string, stepId: string): string =>
  `${participantUid}__${stepId}`;

export const evidenceId = (studentId: string, stepId: string): string =>
  `${studentId}__${stepId}`;

// --- Shape guards ---

export interface EvidenceDocument {
  studentId: string;
  stepId: string;
  confidence: number;
  signal: string;
  privateReason: string;
  createdAt: number;
  updatedAt: number;
}

export interface GroupProposalDocument {
  proposals: GroupProposalItem[];
  updatedAt: number;
}

export interface GroupProposalItem {
  groupId: string;
  purpose: string;
  memberIds: string[];
  scaffold: string;
  reason: string;
  checkpointId: string;
}

export interface GroupDocument {
  groupId: string;
  memberIds: string[];
  scaffold: string;
  startedAt: number;
  updatedAt: number;
}

export interface PublicTvStateDocument {
  cueId: string;
  tvScreenId: string;
  status: string;
  showStats: boolean;
  updatedAt: number;
}

export interface PublicStatsDocument {
  stepId: string;
  participantCount: number;
  submittedCount: number;
  choiceCounts: Record<string, number>;
  routeCounts: Record<string, number>;
  errorCategoryCounts: Record<string, number>;
  hintUseCount: number;
  updatedAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNonEmptyString = (value: unknown, maxLen: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= maxLen;

const isArrayOfStrings = (value: unknown, maxLen: number): value is string[] =>
  Array.isArray(value) && value.length <= maxLen && value.every(v => typeof v === 'string');

export const isEvidenceDocument = (data: unknown): data is EvidenceDocument => {
  if (!isRecord(data)) return false;
  return (
    isNonEmptyString(data.studentId, 128)
    && isNonEmptyString(data.stepId, 128)
    && isFiniteNumber(data.confidence)
    && data.confidence >= 0
    && data.confidence <= 1
    && isNonEmptyString(data.signal, 500)
    && typeof data.privateReason === 'string'
    && data.privateReason.length <= 1000
    && isFiniteNumber(data.createdAt)
    && isFiniteNumber(data.updatedAt)
  );
};

export const isGroupProposalDocument = (data: unknown): data is GroupProposalDocument => {
  if (!isRecord(data)) return false;
  if (!Array.isArray(data.proposals) || data.proposals.length > 10) return false;
  if (!isFiniteNumber(data.updatedAt)) return false;
  return data.proposals.every((p: unknown) => {
    if (!isRecord(p)) return false;
    return (
      isNonEmptyString(p.groupId, 128)
      && isNonEmptyString(p.purpose, 128)
      && isArrayOfStrings(p.memberIds, 12)
      && typeof p.scaffold === 'string'
      && p.scaffold.length <= 2000
      && typeof p.reason === 'string'
      && p.reason.length <= 1000
      && typeof p.checkpointId === 'string'
    );
  });
};

export const isGroupDocument = (data: unknown): data is GroupDocument => {
  if (!isRecord(data)) return false;
  return (
    isNonEmptyString(data.groupId, 128)
    && isArrayOfStrings(data.memberIds, 12)
    && typeof data.scaffold === 'string'
    && data.scaffold.length <= 2000
    && isFiniteNumber(data.startedAt)
    && isFiniteNumber(data.updatedAt)
  );
};

export const isPublicTvStateDocument = (data: unknown): data is PublicTvStateDocument => {
  if (!isRecord(data)) return false;
  return (
    isNonEmptyString(data.cueId, 128)
    && isNonEmptyString(data.tvScreenId, 128)
    && typeof data.status === 'string'
    && ['lobby', 'running', 'paused', 'closed'].includes(data.status)
    && typeof data.showStats === 'boolean'
    && isFiniteNumber(data.updatedAt)
  );
};

export const isPublicStatsDocument = (data: unknown): data is PublicStatsDocument => {
  if (!isRecord(data)) return false;
  if (!isNonEmptyString(data.stepId, 128)) return false;
  if (!isFiniteNumber(data.participantCount) || !isFiniteNumber(data.submittedCount) || !isFiniteNumber(data.hintUseCount)) return false;
  if (!isFiniteNumber(data.updatedAt)) return false;
  if (!isRecord(data.choiceCounts) || !isRecord(data.routeCounts) || !isRecord(data.errorCategoryCounts)) return false;
  return true;
};

// --- Evaluator-safe stat map builders (must stay within Firestore rules budget) ---

export const VALID_CHOICE_KEYS = [
  'A', 'B', 'C', 'D', 'G1', 'G2', 'G3', 'Yes', 'No',
  'true', 'false', 'x', 'y', '=', '<=', '>=',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
] as const;

export const VALID_ROUTES = ['M', 'S', 'C'] as const;

export const VALID_ERROR_CATEGORIES = ['Conceptual', 'Algebraic', 'Logical', 'Missing condition'] as const;

export const buildEmptyChoiceCounts = (): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const key of VALID_CHOICE_KEYS) counts[key] = 0;
  return counts;
};

export const buildEmptyRouteCounts = (): Record<string, number> => ({
  M: 0, S: 0, C: 0,
});

export const buildEmptyErrorCategoryCounts = (): Record<string, number> => ({
  Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0,
});

export const sanitizeChoiceCounts = (input: Record<string, number>): Record<string, number> => {
  const sanitized: Record<string, number> = {};
  const allowed = new Set(VALID_CHOICE_KEYS);
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key as typeof VALID_CHOICE_KEYS[number]) && typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10000) {
      sanitized[key] = Math.floor(value);
    }
  }
  return sanitized;
};

export const sanitizeRouteCounts = (input: Record<string, number>): Record<string, number> => {
  const sanitized: Record<string, number> = { M: 0, S: 0, C: 0 };
  for (const route of VALID_ROUTES) {
    const value = input[route];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10000) {
      sanitized[route] = Math.floor(value);
    }
  }
  return sanitized;
};

export const sanitizeErrorCategoryCounts = (input: Record<string, number>): Record<string, number> => {
  const sanitized: Record<string, number> = { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 };
  for (const cat of VALID_ERROR_CATEGORIES) {
    const value = input[cat];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10000) {
      sanitized[cat] = Math.floor(value);
    }
  }
  return sanitized;
};
