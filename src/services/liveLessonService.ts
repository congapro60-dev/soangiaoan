import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toPublicStats } from '../lib/liveLesson/aggregate';
import type {
  CreateLiveSessionInput,
  LiveLessonDefinition,
  LiveLessonSession,
  LiveLessonStatePatch,
  LivePublicState,
  LivePublicStats,
  LiveResponse,
  LiveResponseType,
  SubmitLiveResponseInput,
} from '../lib/liveLesson/types';

const SESSIONS_COL = 'liveLessonSessions';
const RESPONSES_SUB = 'responses';
const PUBLIC_SUB = 'public';
const RESPONSE_TYPES: LiveResponseType[] = ['choice', 'text', 'boolean', 'route', 'hint', 'exit_ticket'];
const SESSION_MODES = ['teacher', 'tv', 'student'] as const;
const SESSION_STATUSES = ['lobby', 'running', 'paused', 'closed'] as const;
const SESSION_PATCH_KEYS = new Set([
  'status',
  'currentCueId',
  'currentTvScreenId',
  'publicStateEnabled',
  'publicStatsEnabled',
]);
const EXPIRY_BUFFER_SECONDS = 5 * 60;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

function assertIdentifier(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.includes('/')) {
    throw new Error(`${label} must be a non-empty Firestore-safe identifier.`);
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

const isLiveResponseType = (value: unknown): value is LiveResponseType => (
  typeof value === 'string' && RESPONSE_TYPES.includes(value as LiveResponseType)
);

const isSessionMode = (value: unknown): value is LiveLessonSession['mode'] => (
  typeof value === 'string' && SESSION_MODES.includes(value as LiveLessonSession['mode'])
);

const isSessionStatus = (value: unknown): value is LiveLessonSession['status'] => (
  typeof value === 'string' && SESSION_STATUSES.includes(value as LiveLessonSession['status'])
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isPrimitiveResponseValue = (value: unknown): value is string | number | boolean => (
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
);

const toEpochMillis = (value: unknown, label: string): number => {
  if (isFiniteNumber(value)) return value;
  if (isRecord(value) && typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    if (isFiniteNumber(millis)) return millis;
  }
  if (isRecord(value) && isFiniteNumber(value.seconds)) {
    const nanoseconds = isFiniteNumber(value.nanoseconds) ? value.nanoseconds : 0;
    const millis = value.seconds * 1000 + nanoseconds / 1_000_000;
    if (Number.isFinite(millis)) return millis;
  }
  throw new Error(`${label} must be a Firestore Timestamp or finite number.`);
};

const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));

const normalizeSession = (sessionId: string, value: unknown): LiveLessonSession => {
  if (!isRecord(value)) throw new Error('Live lesson session data is invalid.');
  assertNonEmptyString(value.lessonId, 'lessonId');
  assertNonEmptyString(value.title, 'title');
  assertIdentifier(value.classId, 'classId');
  assertIdentifier(value.teacherUid, 'teacherUid');
  if (!Array.isArray(value.allowedStepIds) || value.allowedStepIds.length === 0
    || !value.allowedStepIds.every((stepId) => typeof stepId === 'string' && stepId.length > 0 && !stepId.includes('/'))) {
    throw new Error('allowedStepIds must contain at least one Firestore-safe step id.');
  }
  if (!isSessionMode(value.mode)) throw new Error('Session mode is invalid.');
  if (!isSessionStatus(value.status)) throw new Error('Session status is invalid.');
  assertNonEmptyString(value.currentCueId, 'currentCueId');
  assertNonEmptyString(value.currentTvScreenId, 'currentTvScreenId');
  if (typeof value.publicStateEnabled !== 'boolean' || typeof value.publicStatsEnabled !== 'boolean') {
    throw new Error('Public session flags are invalid.');
  }
  return {
    id: sessionId,
    lessonId: value.lessonId,
    title: value.title,
    classId: value.classId,
    teacherUid: value.teacherUid,
    allowedStepIds: [...value.allowedStepIds],
    expiresAt: toEpochMillis(value.expiresAt, 'expiresAt'),
    mode: value.mode,
    status: value.status,
    currentCueId: value.currentCueId,
    currentTvScreenId: value.currentTvScreenId,
    publicStateEnabled: value.publicStateEnabled,
    publicStatsEnabled: value.publicStatsEnabled,
    createdAt: toEpochMillis(value.createdAt, 'createdAt'),
    updatedAt: toEpochMillis(value.updatedAt, 'updatedAt'),
  };
};

const normalizeResponse = (id: string, value: unknown): LiveResponse => {
  if (!isRecord(value)) throw new Error('Live response data is invalid.');
  assertIdentifier(value.participantUid, 'participantUid');
  assertIdentifier(value.classId, 'classId');
  assertIdentifier(value.stepId, 'stepId');
  if (!isLiveResponseType(value.responseType)) throw new Error('Response type is invalid.');
  const responseValue = value.value;
  if (!isPrimitiveResponseValue(responseValue)) throw new Error('Response value must be primitive.');
  if (typeof responseValue === 'number' && !Number.isFinite(responseValue)) throw new Error('Response value must be finite.');
  assertNonEmptyString(value.clientNonce, 'clientNonce');
  return {
    id,
    participantUid: value.participantUid,
    classId: value.classId,
    stepId: value.stepId,
    responseType: value.responseType,
    value: responseValue,
    clientNonce: value.clientNonce,
    submittedAt: toEpochMillis(value.submittedAt, 'submittedAt'),
    updatedAt: toEpochMillis(value.updatedAt, 'updatedAt'),
  };
};

const normalizePublicStats = (value: unknown): LivePublicStats => {
  if (!isRecord(value)) throw new Error('Live public stats data is invalid.');
  assertNonEmptyString(value.stepId, 'stepId');
  if (!isFiniteNumber(value.participantCount) || !isFiniteNumber(value.submittedCount) || !isFiniteNumber(value.hintUseCount)) {
    throw new Error('Live public stats counts are invalid.');
  }
  const updatedAt = toEpochMillis(value.updatedAt, 'updatedAt');
  return toPublicStats({
    stepId: value.stepId,
    participantCount: value.participantCount,
    submittedCount: value.submittedCount,
    choiceCounts: isRecord(value.choiceCounts) ? value.choiceCounts as Record<string, number> : {},
    routeCounts: isRecord(value.routeCounts) ? value.routeCounts as LivePublicStats['routeCounts'] : { M: 0, S: 0, C: 0 },
    errorCategoryCounts: isRecord(value.errorCategoryCounts)
      ? value.errorCategoryCounts as LivePublicStats['errorCategoryCounts']
      : { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
    hintUseCount: value.hintUseCount,
    updatedAt,
  });
};

const normalizePublicState = (sessionId: string, value: unknown): LivePublicState => {
  if (!isRecord(value)) throw new Error('Live public state data is invalid.');
  assertNonEmptyString(value.lessonId, 'lessonId');
  if (!isSessionStatus(value.status)) throw new Error('Public state status is invalid.');
  assertNonEmptyString(value.currentCueId, 'currentCueId');
  assertNonEmptyString(value.currentTvScreenId, 'currentTvScreenId');
  if (typeof value.showStats !== 'boolean') throw new Error('Public state showStats is invalid.');
  const state: LivePublicState = {
    sessionId,
    lessonId: value.lessonId,
    status: value.status,
    currentCueId: value.currentCueId,
    currentTvScreenId: value.currentTvScreenId,
    showStats: value.showStats,
    updatedAt: toEpochMillis(value.updatedAt, 'updatedAt'),
  };
  if (value.stats !== undefined) state.stats = normalizePublicStats(value.stats);
  return state;
};

const readSnapshot = async (sessionId: string): Promise<LiveLessonSession> => {
  const snapshot = await getDoc(doc(db, SESSIONS_COL, sessionId));
  if (!snapshot.exists()) throw new Error('Created live lesson session could not be read back.');
  return normalizeSession(sessionId, snapshot.data());
};

export const createLiveLessonSession = async ({ definition, teacherUid, classId }: CreateLiveSessionInput): Promise<LiveLessonSession> => {
  assertIdentifier(teacherUid, 'teacherUid');
  assertIdentifier(classId, 'classId');
  if (!isRecord(definition)
    || !Array.isArray(definition.cues) || definition.cues.length === 0
    || !Array.isArray(definition.tvScreens) || definition.tvScreens.length === 0
    || !Array.isArray(definition.studentScreens) || definition.studentScreens.length === 0
    || !Array.isArray(definition.allowedStepIds) || definition.allowedStepIds.length === 0) {
    throw new Error('Live lesson definition must contain cues, screens, and allowed steps.');
  }

  const sessionDefinition = definition as LiveLessonDefinition;
  const sessionRef = doc(collection(db, SESSIONS_COL));
  const firstCue = sessionDefinition.cues[0];
  const expiresAt = Timestamp.fromMillis(
    Timestamp.now().toMillis() + (sessionDefinition.durationSeconds + EXPIRY_BUFFER_SECONDS) * 1000,
  );
  await setDoc(sessionRef, {
    id: sessionRef.id,
    lessonId: sessionDefinition.lessonId,
    title: sessionDefinition.title,
    classId,
    teacherUid,
    allowedStepIds: [...sessionDefinition.allowedStepIds],
    expiresAt,
    mode: 'teacher',
    status: 'lobby',
    currentCueId: firstCue.id,
    currentTvScreenId: firstCue.tvScreenId,
    publicStateEnabled: true,
    publicStatsEnabled: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return readSnapshot(sessionRef.id);
};

export const getLiveLessonSession = async (sessionId: string): Promise<LiveLessonSession | null> => {
  assertIdentifier(sessionId, 'sessionId');
  const snapshot = await getDoc(doc(db, SESSIONS_COL, sessionId));
  return snapshot.exists() ? normalizeSession(sessionId, snapshot.data()) : null;
};

export const updateLiveLessonState = async (sessionId: string, patch: LiveLessonStatePatch): Promise<void> => {
  assertIdentifier(sessionId, 'sessionId');
  if (!isRecord(patch)) throw new Error('Live lesson state patch must be an object.');
  for (const key of Object.keys(patch)) {
    if (!SESSION_PATCH_KEYS.has(key)) throw new Error(`Unknown live lesson state patch key: ${key}`);
    if (patch[key] === undefined) throw new Error(`Live lesson state patch cannot contain undefined: ${key}`);
  }
  if (patch.status !== undefined && !isSessionStatus(patch.status)) throw new Error('Session status is invalid.');
  if (patch.currentCueId !== undefined) assertNonEmptyString(patch.currentCueId, 'currentCueId');
  if (patch.currentTvScreenId !== undefined) assertNonEmptyString(patch.currentTvScreenId, 'currentTvScreenId');
  if (patch.publicStateEnabled !== undefined && typeof patch.publicStateEnabled !== 'boolean') throw new Error('publicStateEnabled is invalid.');
  if (patch.publicStatsEnabled !== undefined && typeof patch.publicStatsEnabled !== 'boolean') throw new Error('publicStatsEnabled is invalid.');
  await updateDoc(doc(db, SESSIONS_COL, sessionId), { ...patch, updatedAt: serverTimestamp() });
};

export const closeLiveLessonSession = async (sessionId: string): Promise<void> => {
  assertIdentifier(sessionId, 'sessionId');
  await updateDoc(doc(db, SESSIONS_COL, sessionId), {
    status: 'closed',
    publicStateEnabled: false,
    publicStatsEnabled: false,
    updatedAt: serverTimestamp(),
  });
};

export const submitLiveResponse = async (input: SubmitLiveResponseInput): Promise<void> => {
  assertIdentifier(input.sessionId, 'sessionId');
  assertIdentifier(input.participantUid, 'participantUid');
  assertIdentifier(input.classId, 'classId');
  assertIdentifier(input.stepId, 'stepId');
  if (!isLiveResponseType(input.responseType)) throw new Error('Response type is invalid.');
  if (!['string', 'number', 'boolean'].includes(typeof input.value)) throw new Error('Response value must be primitive.');
  if (typeof input.value === 'number' && !Number.isFinite(input.value)) throw new Error('Response value must be finite.');
  if (typeof input.value === 'string' && input.value.length > 2000) throw new Error('Response text cannot exceed 2000 characters.');
  assertNonEmptyString(input.clientNonce, 'clientNonce');
  const responseId = `${input.participantUid}__${input.stepId}`;
  await setDoc(doc(db, SESSIONS_COL, input.sessionId, RESPONSES_SUB, responseId), {
    participantUid: input.participantUid,
    classId: input.classId,
    stepId: input.stepId,
    responseType: input.responseType,
    value: input.value,
    clientNonce: input.clientNonce,
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const publishLivePublicStats = async (sessionId: string, stats: LivePublicStats): Promise<void> => {
  assertIdentifier(sessionId, 'sessionId');
  const publicStats = toPublicStats(stats);
  await setDoc(doc(db, SESSIONS_COL, sessionId, PUBLIC_SUB, 'stats'), {
    stepId: publicStats.stepId,
    participantCount: publicStats.participantCount,
    submittedCount: publicStats.submittedCount,
    choiceCounts: publicStats.choiceCounts,
    routeCounts: publicStats.routeCounts,
    errorCategoryCounts: publicStats.errorCategoryCounts,
    hintUseCount: publicStats.hintUseCount,
    updatedAt: serverTimestamp(),
  });
};

const subscribeSafely = (
  subscribe: () => unknown,
  onError: (error: Error) => void,
): (() => void) => {
  try {
    const unsubscribe = subscribe();
    return typeof unsubscribe === 'function' ? unsubscribe as () => void : () => {};
  } catch (error) {
    onError(asError(error));
    return () => {};
  }
};

export const subscribeToTeacherResponses = (
  sessionId: string,
  stepId: string,
  onChange: (rows: LiveResponse[]) => void,
  onError: (error: Error) => void,
): (() => void) => subscribeSafely(() => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(stepId, 'stepId');
  const responseQuery = query(
    collection(db, SESSIONS_COL, sessionId, RESPONSES_SUB),
    where('stepId', '==', stepId),
  );
  return onSnapshot(responseQuery, (snapshot) => {
    try {
      onChange(snapshot.docs.map((item) => normalizeResponse(item.id, item.data())));
    } catch (error) {
      onError(asError(error));
    }
  }, (error) => onError(asError(error)));
}, onError);

export const subscribeToLivePublicState = (
  sessionId: string,
  onChange: (state: LivePublicState | null) => void,
  onError: (error: Error) => void,
): (() => void) => subscribeSafely(() => {
  assertIdentifier(sessionId, 'sessionId');
  return onSnapshot(doc(db, SESSIONS_COL, sessionId, PUBLIC_SUB, 'state'), (snapshot) => {
    try {
      onChange(snapshot.exists() ? normalizePublicState(sessionId, snapshot.data()) : null);
    } catch (error) {
      onError(asError(error));
    }
  }, (error) => onError(asError(error)));
}, onError);

export const subscribeToLivePublicStats = (
  sessionId: string,
  onChange: (stats: LivePublicStats | null) => void,
  onError: (error: Error) => void,
): (() => void) => subscribeSafely(() => {
  assertIdentifier(sessionId, 'sessionId');
  return onSnapshot(doc(db, SESSIONS_COL, sessionId, PUBLIC_SUB, 'stats'), (snapshot) => {
    try {
      onChange(snapshot.exists() ? normalizePublicStats(snapshot.data()) : null);
    } catch (error) {
      onError(asError(error));
    }
  }, (error) => onError(asError(error)));
}, onError);
