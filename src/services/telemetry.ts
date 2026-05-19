import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type FallbackTelemetryStage = 'api' | 'firestore' | 'localStorage';

export type FallbackErrorCode =
  | 'network'
  | 'permission_denied'
  | 'quota_exceeded'
  | 'not_found'
  | 'invalid_argument'
  | 'unauthenticated'
  | 'unknown';

export interface FallbackTelemetryPayload {
  teacherId: string;
  studentId: string;
  lessonId: string;
  stage: FallbackTelemetryStage;
  timestamp: string;
  errorCode: FallbackErrorCode;
  source: 'student_portal';
}

export interface FallbackTelemetryEvent extends FallbackTelemetryPayload {
  id?: string;
}

const FALLBACK_EVENT_STORAGE_PREFIX = 'fallback-event-';
const FALLBACK_EVENT_DEDUPE_MS = 60_000;
const recentEventKeys = new Set<string>();

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

export function classifyFallbackError(error: unknown): FallbackErrorCode {
  if (!error) return 'unknown';

  const errorWithCode = error as { code?: unknown };
  const code = typeof errorWithCode.code === 'string' ? errorWithCode.code : '';
  const message = error instanceof Error ? error.message : String(error);
  const normalized = `${code} ${message}`;

  if (/permission[-_ ]?denied|permission/i.test(normalized)) return 'permission_denied';
  if (/unauthenticated|unauth|auth\/argument-error/i.test(normalized)) return 'unauthenticated';
  if (/resource[-_ ]?exhausted|quota|429|rate limit/i.test(normalized)) return 'quota_exceeded';
  if (/not[-_ ]?found|404|not found/i.test(normalized)) return 'not_found';
  if (/invalid[-_ ]?argument|invalid/i.test(normalized)) return 'invalid_argument';
  if (/network|fetch|offline|timeout|unavailable|deadline[-_ ]?exceeded/i.test(normalized)) return 'network';

  return 'unknown';
}

const buildFallbackEvent = (event: Omit<FallbackTelemetryPayload, 'timestamp' | 'source'> & { timestamp?: string; source?: 'student_portal' }): FallbackTelemetryPayload => ({
  teacherId: event.teacherId,
  studentId: event.studentId,
  lessonId: event.lessonId,
  stage: event.stage,
  timestamp: event.timestamp || new Date().toISOString(),
  errorCode: event.errorCode,
  source: 'student_portal',
});

const getDedupeKey = (event: FallbackTelemetryPayload) => `${event.teacherId}_${event.studentId}_${event.lessonId}_${event.stage}_${event.errorCode}`;

const shouldSkipDuplicate = (event: FallbackTelemetryPayload) => {
  const dedupeKey = getDedupeKey(event);
  if (recentEventKeys.has(dedupeKey)) return true;

  recentEventKeys.add(dedupeKey);
  if (typeof window !== 'undefined') {
    window.setTimeout(() => recentEventKeys.delete(dedupeKey), FALLBACK_EVENT_DEDUPE_MS);
  } else {
    setTimeout(() => recentEventKeys.delete(dedupeKey), FALLBACK_EVENT_DEDUPE_MS);
  }

  return false;
};

const persistQueuedFallbackEvent = (event: FallbackTelemetryPayload) => {
  const storage = getStorage();
  if (!storage) return;
  const key = `${FALLBACK_EVENT_STORAGE_PREFIX}${event.teacherId}-${event.lessonId}-${event.studentId}-${event.stage}-${event.errorCode}-${Date.now()}`;
  storage.setItem(key, JSON.stringify(event));
};

const parseStoredEvent = (value: string | null): FallbackTelemetryPayload | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<FallbackTelemetryPayload>;
    if (
      typeof parsed.teacherId !== 'string'
      || typeof parsed.studentId !== 'string'
      || typeof parsed.lessonId !== 'string'
      || !['api', 'firestore', 'localStorage'].includes(String(parsed.stage))
      || typeof parsed.timestamp !== 'string'
      || !['network', 'permission_denied', 'quota_exceeded', 'not_found', 'invalid_argument', 'unauthenticated', 'unknown'].includes(String(parsed.errorCode))
    ) {
      return null;
    }

    return {
      teacherId: parsed.teacherId,
      studentId: parsed.studentId,
      lessonId: parsed.lessonId,
      stage: parsed.stage as FallbackTelemetryStage,
      timestamp: parsed.timestamp,
      errorCode: parsed.errorCode as FallbackErrorCode,
      source: 'student_portal',
    };
  } catch {
    return null;
  }
};

const writeFallbackEvent = async (event: FallbackTelemetryPayload) => {
  await addDoc(collection(db, 'fallbackEvents'), event);
};

export const logFallbackEvent = async (event: Omit<FallbackTelemetryPayload, 'timestamp' | 'source'> & { timestamp?: string; source?: 'student_portal' }) => {
  const payload = buildFallbackEvent(event);
  if (shouldSkipDuplicate(payload)) return;

  try {
    await writeFallbackEvent(payload);
  } catch (error) {
    console.warn('Không ghi được telemetry fallback, lưu tạm trên thiết bị', error);
    persistQueuedFallbackEvent(payload);
  }
};

export const syncQueuedFallbackEvents = async () => {
  const storage = getStorage();
  if (!storage || typeof navigator !== 'undefined' && !navigator.onLine) return { attempted: 0, synced: 0, failed: 0 };

  const keys = Object.keys(storage).filter(key => key.startsWith(FALLBACK_EVENT_STORAGE_PREFIX));
  let attempted = 0;
  let synced = 0;
  let failed = 0;

  for (const key of keys) {
    const event = parseStoredEvent(storage.getItem(key));
    if (!event) {
      storage.removeItem(key);
      continue;
    }

    attempted++;
    try {
      await writeFallbackEvent(event);
      storage.removeItem(key);
      synced++;
    } catch {
      failed++;
    }
  }

  return { attempted, synced, failed };
};

export const getFallbackEventsForTeacher = async (teacherId: string): Promise<FallbackTelemetryEvent[]> => {
  const snapshot = await getDocs(query(
    collection(db, 'fallbackEvents'),
    where('teacherId', '==', teacherId)
  ));

  return snapshot.docs
    .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as FallbackTelemetryEvent))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
