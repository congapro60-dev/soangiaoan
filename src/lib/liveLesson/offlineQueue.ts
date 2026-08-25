import type { LiveResponseType, SubmitLiveResponseInput } from './types';

export interface QueuedLiveResponse extends SubmitLiveResponseInput {
  enqueuedAt: number;
}

export interface FlushLiveResponseResult {
  attempted: number;
  synced: number;
  failed: QueuedLiveResponse | null;
}

const QUEUE_PREFIX = 'smartplan-ai:live-response-queue:v1';
const responseTypes = new Set<LiveResponseType>(['choice', 'text', 'boolean', 'route', 'hint', 'exit_ticket']);

const isStorage = (value: Storage | null | undefined): value is Storage => Boolean(value && typeof value.getItem === 'function');

const defaultStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const queueKey = (sessionId: string, participantUid: string): string => `${QUEUE_PREFIX}:${sessionId}:${participantUid}`;

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

const readQueue = (sessionId: string, participantUid: string, storage: Storage | null | undefined): QueuedLiveResponse[] => {
  if (!isStorage(storage)) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(queueKey(sessionId, participantUid)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => {
      try { validateLiveResponsePayload(item as SubmitLiveResponseInput); return typeof item.enqueuedAt === 'number'; } catch { return false; }
    }) as QueuedLiveResponse[];
  } catch {
    return [];
  }
};

const writeQueue = (sessionId: string, participantUid: string, items: QueuedLiveResponse[], storage: Storage | null | undefined): void => {
  if (!isStorage(storage)) throw new Error('Offline response storage is unavailable.');
  storage.setItem(queueKey(sessionId, participantUid), JSON.stringify(items));
};

export const getQueuedLiveResponses = (sessionId: string, participantUid: string, storage = defaultStorage()): QueuedLiveResponse[] => (
  readQueue(sessionId, participantUid, storage).sort((a, b) => a.enqueuedAt - b.enqueuedAt)
);

export const enqueueLiveResponse = (
  input: SubmitLiveResponseInput,
  storage = defaultStorage(),
  enqueuedAt = Date.now(),
): QueuedLiveResponse => {
  const payload = validateLiveResponsePayload(input);
  const next: QueuedLiveResponse = { ...payload, enqueuedAt };
  const items = getQueuedLiveResponses(payload.sessionId, payload.participantUid, storage);
  const withoutStep = items.filter(item => item.stepId !== payload.stepId);
  writeQueue(payload.sessionId, payload.participantUid, [...withoutStep, next], storage);
  return next;
};

export const flushLiveResponseQueue = async (
  submit: (input: SubmitLiveResponseInput) => Promise<void>,
  sessionId: string,
  participantUid: string,
  storage = defaultStorage(),
): Promise<FlushLiveResponseResult> => {
  const items = getQueuedLiveResponses(sessionId, participantUid, storage);
  let synced = 0;
  for (const item of items) {
    try {
      await submit(item);
      const remaining = getQueuedLiveResponses(sessionId, participantUid, storage).filter(candidate => candidate.clientNonce !== item.clientNonce);
      writeQueue(sessionId, participantUid, remaining, storage);
      synced += 1;
    } catch {
      return { attempted: items.length, synced, failed: item };
    }
  }
  return { attempted: items.length, synced, failed: null };
};

export const liveResponseQueueKey = queueKey;
