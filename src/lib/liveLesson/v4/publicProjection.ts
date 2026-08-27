import type {
  PublicTvField,
  PublicTvState,
  V4ErrorCategory,
  V4Route,
  V4SessionStatus,
} from './types';

const ALLOWED_FIELDS: ReadonlySet<string> = new Set<string>([
  'cueId',
  'screenId',
  'status',
  'showStats',
  'participantCount',
  'submittedCount',
  'routeCounts',
  'errorCategoryCounts',
  'groupProgress',
  'updatedAt',
] satisfies PublicTvField[]);

const EMPTY_ROUTE_COUNTS: Record<V4Route, number> = { M: 0, S: 0, C: 0 };
const EMPTY_ERROR_COUNTS: Record<V4ErrorCategory, number> = {
  Conceptual: 0,
  Algebraic: 0,
  Logical: 0,
  'Missing condition': 0,
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const SESSION_STATUSES: ReadonlySet<string> = new Set<string>([
  'lobby', 'running', 'paused', 'closed',
]);

export interface PublicProjectionInput {
  cueId: string;
  screenId: string;
  status?: string;
  showStats?: boolean;
  participantCount?: number;
  submittedCount?: number;
  routeCounts?: Partial<Record<V4Route, number>>;
  errorCategoryCounts?: Partial<Record<V4ErrorCategory, number>>;
  groupProgress?: Record<string, number>;
  updatedAt?: number;
}

export function buildPublicTvState(input: PublicProjectionInput): PublicTvState {
  const status: V4SessionStatus = SESSION_STATUSES.has(input.status ?? '') ? (input.status as V4SessionStatus) : 'running';
  const routeCounts: Record<V4Route, number> = { ...EMPTY_ROUTE_COUNTS };
  if (isRecord(input.routeCounts)) {
    for (const key of ['M', 'S', 'C'] as V4Route[]) {
      if (typeof input.routeCounts[key] === 'number') {
        routeCounts[key] = input.routeCounts[key]!;
      }
    }
  }
  const errorCategoryCounts: Record<V4ErrorCategory, number> = { ...EMPTY_ERROR_COUNTS };
  if (isRecord(input.errorCategoryCounts)) {
    for (const key of ['Conceptual', 'Algebraic', 'Logical', 'Missing condition'] as V4ErrorCategory[]) {
      if (typeof input.errorCategoryCounts[key] === 'number') {
        errorCategoryCounts[key] = input.errorCategoryCounts[key]!;
      }
    }
  }

  return {
    cueId: String(input.cueId ?? ''),
    screenId: String(input.screenId ?? ''),
    status,
    showStats: Boolean(input.showStats),
    participantCount: isFiniteNumber(input.participantCount) ? input.participantCount : 0,
    submittedCount: isFiniteNumber(input.submittedCount) ? input.submittedCount : 0,
    routeCounts,
    errorCategoryCounts,
    ...(input.groupProgress != null ? { groupProgress: { ...input.groupProgress } } : {}),
    updatedAt: isFiniteNumber(input.updatedAt) ? input.updatedAt : 0,
  };
}

export function projectToPublicTvState(raw: Record<string, unknown>): PublicTvState {
  const allowed: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (ALLOWED_FIELDS.has(key)) {
      allowed[key] = raw[key];
    }
  }
  return buildPublicTvState({
    cueId: String(allowed.cueId ?? ''),
    screenId: String(allowed.screenId ?? ''),
    ...(typeof allowed.status === 'string' ? { status: allowed.status } : {}),
    ...(typeof allowed.showStats === 'boolean' ? { showStats: allowed.showStats } : {}),
    ...(typeof allowed.participantCount === 'number' ? { participantCount: allowed.participantCount } : {}),
    ...(typeof allowed.submittedCount === 'number' ? { submittedCount: allowed.submittedCount } : {}),
    ...(isRecord(allowed.routeCounts) ? { routeCounts: allowed.routeCounts } : {}),
    ...(isRecord(allowed.errorCategoryCounts) ? { errorCategoryCounts: allowed.errorCategoryCounts } : {}),
    ...(isRecord(allowed.groupProgress) ? { groupProgress: allowed.groupProgress as Record<string, number> } : {}),
    ...(typeof allowed.updatedAt === 'number' ? { updatedAt: allowed.updatedAt } : {}),
  } as PublicProjectionInput);
}

export function isPrivateFieldLeaked(json: string): string | null {
  const privatePatterns = [
    /name["\s]*:["\s]*[^,}]+/i,
    /studentId["\s]*:["\s]*[^,}]+/i,
    /languageSupportPlan["\s]*:["\s]*[^,}]+/i,
    /rawText["\s]*:["\s]*[^,}]+/i,
    /privateReason["\s]*:["\s]*[^,}]+/i,
    /teacherScript["\s]*:["\s]*[^,}]+/i,
    /participantUid["\s]*:["\s]*[^,}]+/i,
  ];
  for (const pattern of privatePatterns) {
    if (pattern.test(json)) {
      return `Potential private field detected: ${pattern.source}`;
    }
  }
  return null;
}
