import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type FallbackTelemetryStage = 'api' | 'firestore' | 'localStorage';

export interface FallbackTelemetryEvent {
  id?: string;
  teacherId: string;
  studentId: string;
  lessonId: string;
  stage: FallbackTelemetryStage;
  timestamp: string;
  errorMessage: string;
  source?: string;
}

const FALLBACK_EVENT_STORAGE_PREFIX = 'fallback-event-';
const MAX_ERROR_MESSAGE_LENGTH = 800;

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const normalizeErrorMessage = (errorMessage: string) => (
  errorMessage.trim().slice(0, MAX_ERROR_MESSAGE_LENGTH) || 'unknown'
);

const buildFallbackEvent = (event: Omit<FallbackTelemetryEvent, 'timestamp'> & { timestamp?: string }): FallbackTelemetryEvent => ({
  ...event,
  timestamp: event.timestamp || new Date().toISOString(),
  errorMessage: normalizeErrorMessage(event.errorMessage),
  source: event.source || 'adaptive-student-portal',
});

const persistQueuedFallbackEvent = (event: FallbackTelemetryEvent) => {
  const storage = getStorage();
  if (!storage) return;
  const key = `${FALLBACK_EVENT_STORAGE_PREFIX}${event.teacherId}-${event.lessonId}-${event.studentId}-${event.stage}-${Date.now()}`;
  storage.setItem(key, JSON.stringify(event));
};

const parseStoredEvent = (value: string | null): FallbackTelemetryEvent | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as FallbackTelemetryEvent;
  } catch {
    return null;
  }
};

const writeFallbackEvent = async (event: FallbackTelemetryEvent) => {
  await addDoc(collection(db, 'fallbackEvents'), event);
};

export const logFallbackEvent = async (event: Omit<FallbackTelemetryEvent, 'timestamp'> & { timestamp?: string }) => {
  const payload = buildFallbackEvent(event);

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
