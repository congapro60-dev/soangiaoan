import type { LiveResponseType, SubmitLiveResponseInput } from './types';

export type LiveResponseDeliveryState = 'pending' | 'blocked' | 'failed';
export type LiveResponseQueueFailureKind = 'retryable' | 'blocked';

export interface QueuedLiveResponse extends SubmitLiveResponseInput {
  enqueuedAt: number;
  deliveryState: LiveResponseDeliveryState;
  lastError?: string;
  retryAfter?: number;
  retryCount?: number;
}

export interface LiveResponseStepState {
  clientNonce: string;
  status: LiveResponseDeliveryState | 'synced';
  lastError?: string;
  retryAfter?: number;
  retryCount?: number;
}

export interface LiveResponseQueueFailure {
  item: QueuedLiveResponse;
  kind: LiveResponseQueueFailureKind;
  message: string;
}

export interface FlushLiveResponseResult {
  attempted: number;
  synced: number;
  failed: LiveResponseQueueFailure | null;
}

interface StoredQueueState {
  version: 2;
  items: QueuedLiveResponse[];
  stepStates: Record<string, LiveResponseStepState>;
}

const QUEUE_PREFIX = 'smartplan-ai:live-response-queue:v2';
const LEGACY_QUEUE_PREFIX = 'smartplan-ai:live-response-queue:v1';
const responseTypes = new Set<LiveResponseType>(['choice', 'text', 'boolean', 'route', 'hint', 'exit_ticket']);
const permanentErrorCodes = new Set(['permission-denied', 'failed-precondition', 'not-found', 'invalid-argument', 'closed', 'expired']);
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;
const MAX_RETRY_COUNT = 5;

const isStorage = (value: Storage | null | undefined): value is Storage => Boolean(value && typeof value.getItem === 'function');

const defaultStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const queueKey = (sessionId: string, participantUid: string): string => `${QUEUE_PREFIX}:${sessionId}:${participantUid}`;
const legacyQueueKey = (sessionId: string, participantUid: string): string => `${LEGACY_QUEUE_PREFIX}:${sessionId}:${participantUid}`;

const isPrimitive = (value: unknown): value is string | number | boolean => (
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
);

export const validateLiveResponsePayload = (input: SubmitLiveResponseInput): SubmitLiveResponseInput => {
  if (!input || typeof input !== 'object') throw new Error('Response payload must be an object.');
  for (const [value, label] of [[input.sessionId, 'sessionId'], [input.participantUid, 'participantUid'], [input.classId, 'classId'], [input.stepId, 'stepId'], [input.clientNonce, 'clientNonce']] as const) {
    if (typeof value !== 'string' || value.trim().length === 0 || value.includes('/')) throw new Error(`${label} is invalid.`);
  }
  if (!responseTypes.has(input.responseType)) throw new Error('Response type is invalid.');
  if (!isPrimitive(input.value)) throw new Error('Response value must be primitive.');
  if (typeof input.value === 'number' && !Number.isFinite(input.value)) throw new Error('Response value must be finite.');
  if (typeof input.value === 'string' && input.value.length > 2000) throw new Error('Response text cannot exceed 2000 characters.');
  if (input.responseType === 'route' && !['M', 'S', 'C'].includes(String(input.value))) throw new Error('Route response is invalid.');
  if (input.responseType === 'boolean' && typeof input.value !== 'boolean') throw new Error('Boolean response is invalid.');
  return { ...input };
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  if (typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code;
  }
  return String(error || 'Không thể đồng bộ phản hồi.');
};

const errorCode = (error: unknown): string => {
  if (typeof error !== 'object' || error === null || typeof (error as { code?: unknown }).code !== 'string') return '';
  return (error as { code: string }).code.toLowerCase().split('/').pop() ?? '';
};

export const classifyLiveResponseError = (error: unknown): LiveResponseQueueFailureKind => {
  const code = errorCode(error);
  const message = errorMessage(error).toLowerCase();
  if (permanentErrorCodes.has(code) || /permission[- ]denied|failed[- ]precondition|not found|invalid argument|closed|expired|hết hạn|đã đóng/.test(message)) {
    return 'blocked';
  }
  return 'retryable';
};

const normalizeEntry = (value: unknown): QueuedLiveResponse | null => {
  if (!value || typeof value !== 'object') return null;
  try {
    const item = value as Partial<QueuedLiveResponse>;
    const payload = validateLiveResponsePayload(item as SubmitLiveResponseInput);
    if (typeof item.enqueuedAt !== 'number' || !Number.isFinite(item.enqueuedAt)) return null;
    const deliveryState = item.deliveryState === 'blocked' ? 'blocked'
      : item.deliveryState === 'failed' ? 'failed'
        : 'pending';
    return {
      ...payload,
      enqueuedAt: item.enqueuedAt,
      deliveryState,
      ...(typeof item.lastError === 'string' && item.lastError ? { lastError: item.lastError.slice(0, 500) } : {}),
      ...(typeof item.retryAfter === 'number' && Number.isFinite(item.retryAfter) && item.retryAfter > 0 ? { retryAfter: item.retryAfter } : {}),
      ...(typeof item.retryCount === 'number' && Number.isFinite(item.retryCount) && item.retryCount >= 0 ? { retryCount: Math.floor(item.retryCount) } : {}),
    };
  } catch {
    return null;
  }
};

const normalizeStepState = (value: unknown): LiveResponseStepState | null => {
  if (!value || typeof value !== 'object') return null;
  const state = value as Partial<LiveResponseStepState>;
  if (typeof state.clientNonce !== 'string' || !state.clientNonce.trim()) return null;
  if (state.status !== 'pending' && state.status !== 'blocked' && state.status !== 'failed' && state.status !== 'synced') return null;
  return {
    clientNonce: state.clientNonce,
    status: state.status,
    ...(typeof state.lastError === 'string' && state.lastError ? { lastError: state.lastError.slice(0, 500) } : {}),
    ...(typeof state.retryAfter === 'number' && Number.isFinite(state.retryAfter) && state.retryAfter > 0 ? { retryAfter: state.retryAfter } : {}),
    ...(typeof state.retryCount === 'number' && Number.isFinite(state.retryCount) && state.retryCount >= 0 ? { retryCount: Math.floor(state.retryCount) } : {}),
  };
};

const emptyState = (): StoredQueueState => ({ version: 2, items: [], stepStates: {} });

const collapseItemsByStep = (items: QueuedLiveResponse[]): QueuedLiveResponse[] => {
  const latest = new Map<string, QueuedLiveResponse>();
  for (const item of items) {
    const current = latest.get(item.stepId);
    if (!current || item.enqueuedAt >= current.enqueuedAt) latest.set(item.stepId, item);
  }
  return [...latest.values()].sort((a, b) => a.enqueuedAt - b.enqueuedAt);
};

const stateFromItems = (rawItems: QueuedLiveResponse[]): StoredQueueState => {
  const items = collapseItemsByStep(rawItems);
  return {
    version: 2,
    items,
    stepStates: Object.fromEntries(items.map(item => [item.stepId, {
      clientNonce: item.clientNonce,
      status: item.deliveryState,
      ...(item.lastError ? { lastError: item.lastError } : {}),
    }])),
  };
};

const readState = (sessionId: string, participantUid: string, storage: Storage | null | undefined): StoredQueueState => {
  if (!isStorage(storage)) return emptyState();
  try {
    const current = storage.getItem(queueKey(sessionId, participantUid));
    const raw = current ?? storage.getItem(legacyQueueKey(sessionId, participantUid));
    if (!raw) return emptyState();
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return stateFromItems(parsed.map(normalizeEntry).filter((item): item is QueuedLiveResponse => Boolean(item)));
    }
    if (!parsed || typeof parsed !== 'object' || (parsed as { version?: unknown }).version !== 2) return emptyState();
    const items = Array.isArray((parsed as { items?: unknown }).items)
      ? (parsed as { items: unknown[] }).items.map(normalizeEntry).filter((item): item is QueuedLiveResponse => Boolean(item))
      : [];
    const rawStepStates = (parsed as { stepStates?: unknown }).stepStates;
    const stepStates: Record<string, LiveResponseStepState> = {};
    if (rawStepStates && typeof rawStepStates === 'object') {
      for (const [stepId, value] of Object.entries(rawStepStates)) {
        const state = normalizeStepState(value);
        if (state) stepStates[stepId] = state;
      }
    }
    const collapsedItems = collapseItemsByStep(items);
    for (const item of collapsedItems) {
      stepStates[item.stepId] = {
        clientNonce: item.clientNonce,
        status: item.deliveryState,
        ...(item.lastError ? { lastError: item.lastError } : {}),
      };
    }
    return { version: 2, items: collapsedItems, stepStates };
  } catch {
    return emptyState();
  }
};

const writeState = (sessionId: string, participantUid: string, state: StoredQueueState, storage: Storage | null | undefined): void => {
  if (!isStorage(storage)) throw new Error('Offline response storage is unavailable.');
  storage.setItem(queueKey(sessionId, participantUid), JSON.stringify(state));
};

export const getQueuedLiveResponses = (sessionId: string, participantUid: string, storage = defaultStorage()): QueuedLiveResponse[] => (
  readState(sessionId, participantUid, storage).items.sort((a, b) => a.enqueuedAt - b.enqueuedAt)
);

export const getLiveResponseStepState = (
  sessionId: string,
  participantUid: string,
  stepId: string,
  storage = defaultStorage(),
): LiveResponseStepState | null => readState(sessionId, participantUid, storage).stepStates[stepId] ?? null;

export const enqueueLiveResponse = (
  input: SubmitLiveResponseInput,
  storage = defaultStorage(),
  enqueuedAt = Date.now(),
): QueuedLiveResponse => {
  const payload = validateLiveResponsePayload(input);
  const state = readState(payload.sessionId, payload.participantUid, storage);
  const previous = state.stepStates[payload.stepId] ?? state.items.find(item => item.stepId === payload.stepId);
  const next: QueuedLiveResponse = {
    ...payload,
    clientNonce: previous?.clientNonce ?? payload.clientNonce,
    enqueuedAt,
    deliveryState: 'pending',
    // Preserve retry info from previous attempt when deduplicating by step
    ...(previous && 'retryCount' in previous && typeof (previous as LiveResponseStepState).retryCount === 'number'
      ? { retryCount: (previous as LiveResponseStepState).retryCount }
      : {}),
  };
  const nextState: StoredQueueState = {
    version: 2,
    items: [...state.items.filter(item => item.stepId !== payload.stepId), next],
    stepStates: {
      ...state.stepStates,
      [payload.stepId]: {
        clientNonce: next.clientNonce,
        status: 'pending',
        ...(next.retryCount !== undefined ? { retryCount: next.retryCount } : {}),
      },
    },
  };
  writeState(payload.sessionId, payload.participantUid, nextState, storage);
  return next;
};

const markSynced = (sessionId: string, participantUid: string, item: QueuedLiveResponse, storage: Storage | null | undefined): void => {
  const state = readState(sessionId, participantUid, storage);
  const isCurrent = (candidate: QueuedLiveResponse) => candidate.stepId === item.stepId
    && candidate.clientNonce === item.clientNonce
    && candidate.enqueuedAt === item.enqueuedAt;
  const current = state.items.some(isCurrent);
  if (!current) return;
  writeState(sessionId, participantUid, {
    version: 2,
    items: state.items.filter(candidate => !isCurrent(candidate)),
    stepStates: {
      ...state.stepStates,
      [item.stepId]: { clientNonce: item.clientNonce, status: 'synced' },
    },
  }, storage);
};

const markFailed = (
  sessionId: string,
  participantUid: string,
  item: QueuedLiveResponse,
  kind: LiveResponseQueueFailureKind,
  message: string,
  storage: Storage | null | undefined,
): QueuedLiveResponse => {
  const previousRetryCount = item.retryCount ?? 0;
  const newRetryCount = kind === 'blocked' ? previousRetryCount : previousRetryCount + 1;
  const backoffMs = kind === 'blocked'
    ? undefined
    : Math.min(BASE_BACKOFF_MS * Math.pow(2, previousRetryCount), MAX_BACKOFF_MS);
  const isPermanentlyFailed = kind === 'blocked' || newRetryCount >= MAX_RETRY_COUNT;

  const failed: QueuedLiveResponse = {
    ...item,
    deliveryState: isPermanentlyFailed ? 'blocked' : 'failed',
    lastError: message.slice(0, 500),
    retryCount: newRetryCount,
    ...(backoffMs !== undefined ? { retryAfter: backoffMs } : {}),
  };
  const state = readState(sessionId, participantUid, storage);
  const isCurrent = (candidate: QueuedLiveResponse) => candidate.stepId === item.stepId
    && candidate.clientNonce === item.clientNonce
    && candidate.enqueuedAt === item.enqueuedAt;
  if (!state.items.some(isCurrent)) return failed;
  writeState(sessionId, participantUid, {
    version: 2,
    items: state.items.map(candidate => isCurrent(candidate) ? failed : candidate),
    stepStates: {
      ...state.stepStates,
      [item.stepId]: {
        clientNonce: item.clientNonce,
        status: failed.deliveryState,
        lastError: failed.lastError,
        retryAfter: failed.retryAfter,
        retryCount: failed.retryCount,
      },
    },
  }, storage);
  return failed;
};

export const flushLiveResponseQueue = async (
  submit: (input: SubmitLiveResponseInput) => Promise<void>,
  sessionId: string,
  participantUid: string,
  storage = defaultStorage(),
  now = Date.now(),
): Promise<FlushLiveResponseResult> => {
  const items = getQueuedLiveResponses(sessionId, participantUid, storage);
  let attempted = 0;
  let synced = 0;
  for (const item of items) {
    if (item.deliveryState === 'blocked') {
      return {
        attempted,
        synced,
        failed: { item, kind: 'blocked', message: item.lastError ?? 'Phản hồi bị chặn; cần một câu trả lời mới.' },
      };
    }
    // Skip items that are in 'failed' state but haven't reached their retry-after time
    if (item.deliveryState === 'failed' && item.retryAfter !== undefined && item.retryAfter > 0) {
      const retryAfterTime = item.enqueuedAt + item.retryAfter;
      if (now < retryAfterTime) continue;
    }
    attempted += 1;
    try {
      await submit(item);
      markSynced(sessionId, participantUid, item, storage);
      synced += 1;
    } catch (error) {
      const kind = classifyLiveResponseError(error);
      const message = errorMessage(error);
      const failed = markFailed(sessionId, participantUid, item, kind, message, storage);
      return { attempted, synced, failed: { item: failed, kind, message } };
    }
  }
  return { attempted, synced, failed: null };
};

export const liveResponseQueueKey = queueKey;
