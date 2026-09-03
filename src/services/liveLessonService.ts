import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toPublicStats } from '../lib/liveLesson/aggregate';
import { sanitizeStudentLanguagePreference } from '../lib/liveLesson/v4/languageSupport';
import type { StudentLanguageView } from '../lib/liveLesson/v4/types.js';
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
const PREFERENCES_SUB = 'preferences';
const PUBLIC_SUB = 'public';
const RESPONSE_TYPES: LiveResponseType[] = ['choice', 'text', 'boolean', 'route', 'hint', 'exit_ticket'];
const SESSION_STATUSES = ['lobby', 'running', 'paused', 'closed'] as const;
const SESSION_PATCH_KEYS = new Set([
  'status',
  'currentCueId',
  'currentTvScreenId',
  'publicStateEnabled',
  'publicStatsEnabled',
]);
const EXPIRY_BUFFER_SECONDS = 5 * 60;
const SERVER_TIMESTAMP_READ_RETRY_DELAYS_MS = [50, 100, 200] as const;

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

const isUnresolvedTimestampReadError = (error: unknown): boolean => (
  error instanceof Error && /must be a Firestore Timestamp or finite number\.$/.test(error.message)
);

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
  if (value.schemaVersion !== 1) throw new Error('Live lesson session schemaVersion must be 1.');
  if (!isSessionStatus(value.status)) throw new Error('Session status is invalid.');
  assertNonEmptyString(value.currentCueId, 'currentCueId');
  assertNonEmptyString(value.currentTvScreenId, 'currentTvScreenId');
  if (typeof value.publicStateEnabled !== 'boolean' || typeof value.publicStatsEnabled !== 'boolean') {
    throw new Error('Public session flags are invalid.');
  }
  return {
    id: sessionId,
    schemaVersion: 1,
    lessonId: value.lessonId,
    title: value.title,
    classId: value.classId,
    teacherUid: value.teacherUid,
    allowedStepIds: [...value.allowedStepIds],
    expiresAt: toEpochMillis(value.expiresAt, 'expiresAt'),
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

const normalizePublicState = (value: unknown): LivePublicState => {
  if (!isRecord(value)) throw new Error('Live public state data is invalid.');
  assertNonEmptyString(value.cueId, 'cueId');
  assertNonEmptyString(value.tvScreenId, 'tvScreenId');
  if (!isSessionStatus(value.status)) throw new Error('Public state status is invalid.');
  if (typeof value.showStats !== 'boolean') throw new Error('Public state showStats is invalid.');
  return {
    cueId: value.cueId,
    tvScreenId: value.tvScreenId,
    status: value.status,
    showStats: value.showStats,
    updatedAt: toEpochMillis(value.updatedAt, 'updatedAt'),
  };
};

export const buildLiveResponseFirestorePayload = (input: SubmitLiveResponseInput, includeIdentity: boolean): Record<string, unknown> => {
  const languagePreference = sanitizeStudentLanguagePreference(input.languagePreference);
  return {
    ...(includeIdentity ? {
      participantUid: input.participantUid,
      classId: input.classId,
      stepId: input.stepId,
    } : {}),
    responseType: input.responseType,
    value: input.value,
    clientNonce: input.clientNonce,
    ...(languagePreference ? { languagePreference } : {}),
  };
};

const readSnapshot = async (sessionId: string): Promise<LiveLessonSession> => {
  // Use getDocFromServer to bypass local cache so serverTimestamp fields are resolved.
  // The emulator/browser can still return a pending serverTimestamp for one immediate
  // read after a write; retry only that normalization case and never hide other errors.
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= SERVER_TIMESTAMP_READ_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const snapshot = await getDocFromServer(doc(db, SESSIONS_COL, sessionId));
      if (!snapshot.exists()) throw new Error('Created live lesson session could not be read back.');
      return normalizeSession(sessionId, snapshot.data());
    } catch (error) {
      lastError = asError(error);
      const delay = SERVER_TIMESTAMP_READ_RETRY_DELAYS_MS[attempt];
      if (!isUnresolvedTimestampReadError(lastError) || delay === undefined) throw lastError;
      await new Promise<void>(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError ?? new Error('Live lesson session could not be read back.');
};

const writePublicState = async (session: LiveLessonSession): Promise<void> => {
  // Closing a session revokes public reads in Firestore Rules. Do not write a
  // final public document after that revocation; the existing public listener
  // will be denied and the TV will retain its last safe screen.
  if (session.status === 'closed' || !session.publicStateEnabled) return;
  await setDoc(doc(db, SESSIONS_COL, session.id, PUBLIC_SUB, 'state'), {
    cueId: session.currentCueId,
    tvScreenId: session.currentTvScreenId,
    status: session.status,
    showStats: session.publicStatsEnabled,
    updatedAt: serverTimestamp(),
  });
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
    schemaVersion: 1,
    lessonId: sessionDefinition.lessonId,
    title: sessionDefinition.title,
    classId,
    teacherUid,
    allowedStepIds: [...sessionDefinition.allowedStepIds],
    expiresAt,
    status: 'lobby',
    currentCueId: firstCue.id,
    currentTvScreenId: firstCue.tvScreenId,
    publicStateEnabled: true,
    publicStatsEnabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const session = await readSnapshot(sessionRef.id);
  await writePublicState(session);
  return session;
};

export const getLiveLessonSession = async (sessionId: string): Promise<LiveLessonSession | null> => {
  assertIdentifier(sessionId, 'sessionId');
  const snapshot = await getDoc(doc(db, SESSIONS_COL, sessionId));
  return snapshot.exists() ? normalizeSession(sessionId, snapshot.data()) : null;
};

export const updateLiveLessonState = async (sessionId: string, patch: LiveLessonStatePatch): Promise<LiveLessonSession> => {
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
  const session = await readSnapshot(sessionId);
  await writePublicState(session);
  return session;
};

export const closeLiveLessonSession = async (sessionId: string): Promise<LiveLessonSession> => {
  assertIdentifier(sessionId, 'sessionId');
  // Fail-closed: read current session so we can write a safe public-state marker
  // with the last known cueId/tvScreenId before revoking public access.
  const current = await readSnapshot(sessionId);
  // 1) Write the closed marker to public/state FIRST so the TV listener receives
  //    status:'closed' before Firestore Rules revoke the read.
  await setDoc(doc(db, SESSIONS_COL, sessionId, PUBLIC_SUB, 'state'), {
    cueId: current.currentCueId,
    tvScreenId: current.currentTvScreenId,
    status: 'closed',
    showStats: false,
    updatedAt: serverTimestamp(),
  });
  // 2) Revoke public access on the parent document.
  await updateDoc(doc(db, SESSIONS_COL, sessionId), {
    status: 'closed',
    publicStateEnabled: false,
    publicStatsEnabled: false,
    updatedAt: serverTimestamp(),
  });
  // 3) Read the final parent state to return.
  const session = await readSnapshot(sessionId);
  return session;
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
  const responseRef = doc(db, SESSIONS_COL, input.sessionId, RESPONSES_SUB, responseId);

  // One read-before-write transaction distinguishes a brand-new response from a
  // resubmission. No merge-first probe and no permission-denied retry on the
  // allow-path: the create payload is always complete and server-timestamped.
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(responseRef);
    if (snapshot.exists()) {
      // Idempotent resubmission: only mutable fields change. submittedAt and
      // clientNonce are immutable after creation, so they are never rewritten.
      const updatePayload: Record<string, unknown> = {
        responseType: input.responseType,
        value: input.value,
        updatedAt: serverTimestamp(),
      };
      const languagePreference = sanitizeStudentLanguagePreference(input.languagePreference);
      if (languagePreference) updatePayload.languagePreference = languagePreference;
      tx.update(responseRef, updatePayload);
      return;
    }
    tx.set(responseRef, {
      ...buildLiveResponseFirestorePayload(input, true),
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

// --- V4: student-owned language preference ---

export const saveStudentLanguagePreference = async (
  sessionId: string,
  participantUid: string,
  classId: string,
  languagePreference: StudentLanguageView,
): Promise<void> => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(participantUid, 'participantUid');
  assertIdentifier(classId, 'classId');
  const sanitized = sanitizeStudentLanguagePreference(languagePreference);
  if (!sanitized) throw new Error('Student language preference is invalid.');
  await setDoc(doc(db, SESSIONS_COL, sessionId, PREFERENCES_SUB, participantUid), {
    participantUid,
    classId,
    languagePreference: sanitized,
    updatedAt: serverTimestamp(),
  });
};

export const readStudentLanguagePreference = async (
  sessionId: string,
  participantUid: string,
): Promise<StudentLanguageView | null> => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(participantUid, 'participantUid');
  const snapshot = await getDoc(doc(db, SESSIONS_COL, sessionId, PREFERENCES_SUB, participantUid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (!isRecord(data)) return null;
  return sanitizeStudentLanguagePreference(data.languagePreference);
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

const isPendingServerWriteSnapshot = (snapshot: { metadata?: { hasPendingWrites?: boolean } }): boolean => (
  snapshot.metadata?.hasPendingWrites === true
);

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
    if (isPendingServerWriteSnapshot(snapshot)) return;
    try {
      onChange(snapshot.docs.map((item) => normalizeResponse(item.id, item.data())));
    } catch (error) {
      onError(asError(error));
    }
  }, (error) => onError(asError(error)));
}, onError);

export const subscribeToTeacherSession = (
  sessionId: string,
  onChange: (session: LiveLessonSession | null) => void,
  onError: (error: Error) => void,
): (() => void) => subscribeSafely(() => {
  assertIdentifier(sessionId, 'sessionId');
  return onSnapshot(doc(db, SESSIONS_COL, sessionId), (snapshot) => {
    if (isPendingServerWriteSnapshot(snapshot)) return;
    try {
      onChange(snapshot.exists() ? normalizeSession(sessionId, snapshot.data()) : null);
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
    if (isPendingServerWriteSnapshot(snapshot)) return;
    try {
      onChange(snapshot.exists() ? normalizePublicState(snapshot.data()) : null);
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
    if (isPendingServerWriteSnapshot(snapshot)) return;
    try {
      onChange(snapshot.exists() ? normalizePublicStats(snapshot.data()) : null);
    } catch (error) {
      onError(asError(error));
    }
  }, (error) => onError(asError(error)));
}, onError);

const PROPOSALS_SUB = 'groupProposals';
const GROUPS_SUB = 'groups';
const STUDENTS_SUB = 'students';
const EVIDENCE_SUB = 'evidence';

export interface GroupProposalFirestore {
  groupId: string;
  purpose: string;
  memberIds: string[];
  scaffold: string;
  reason: string;
  checkpointId: string;
}

export interface ApprovedGroupFirestore {
  groupId: string;
  memberIds: string[];
  scaffold: string;
  startedAt: number;
}

export interface StudentGroupPayload {
  groupId: string;
  scaffold: string;
  startedAt: number;
}

export interface EvidenceFirestore {
  studentId: string;
  stepId: string;
  confidence: number;
  signal: string;
  privateReason: string;
  createdAt: number;
  updatedAt: number;
}

const normalizeGroupProposal = (value: unknown): GroupProposalFirestore | null => {
  if (!isRecord(value)) return null;
  if (typeof value.groupId !== 'string' || typeof value.purpose !== 'string') return null;
  if (!Array.isArray(value.memberIds)) return null;
  if (typeof value.scaffold !== 'string' || typeof value.reason !== 'string') return null;
  return {
    groupId: value.groupId,
    purpose: value.purpose,
    memberIds: value.memberIds.filter((id): id is string => typeof id === 'string'),
    scaffold: value.scaffold,
    reason: value.reason,
    checkpointId: typeof value.checkpointId === 'string' ? value.checkpointId : '',
  };
};

const normalizeApprovedGroup = (value: unknown): ApprovedGroupFirestore | null => {
  if (!isRecord(value)) return null;
  if (typeof value.groupId !== 'string') return null;
  if (!Array.isArray(value.memberIds)) return null;
  if (typeof value.scaffold !== 'string') return null;
  return {
    groupId: value.groupId,
    memberIds: value.memberIds.filter((id): id is string => typeof id === 'string'),
    scaffold: value.scaffold,
    startedAt: isFiniteNumber(value.startedAt) ? value.startedAt : Date.now(),
  };
};

const normalizeStudentGroupPayload = (value: unknown): StudentGroupPayload | null => {
  if (!isRecord(value)) return null;
  if (typeof value.groupId !== 'string') return null;
  if (typeof value.scaffold !== 'string') return null;
  return {
    groupId: value.groupId,
    scaffold: value.scaffold,
    startedAt: isFiniteNumber(value.startedAt) ? value.startedAt : Date.now(),
  };
};

const normalizeEvidence = (value: unknown): EvidenceFirestore | null => {
  if (!isRecord(value)) return null;
  assertIdentifier(value.studentId, 'studentId');
  assertIdentifier(value.stepId, 'stepId');
  if (!isFiniteNumber(value.confidence) || value.confidence < 0 || value.confidence > 1) return null;
  assertNonEmptyString(value.signal, 'signal');
  if (typeof value.privateReason !== 'string') return null;
  return {
    studentId: value.studentId,
    stepId: value.stepId,
    confidence: value.confidence,
    signal: value.signal,
    privateReason: value.privateReason,
    createdAt: toEpochMillis(value.createdAt, 'createdAt'),
    updatedAt: toEpochMillis(value.updatedAt, 'updatedAt'),
  };
};

export const subscribeToGroupProposals = (
  sessionId: string,
  onChange: (proposals: GroupProposalFirestore[]) => void,
  onError: (error: Error) => void,
): (() => void) => subscribeSafely(() => {
  assertIdentifier(sessionId, 'sessionId');
  return onSnapshot(doc(db, SESSIONS_COL, sessionId, PROPOSALS_SUB, 'current'), (snapshot) => {
    try {
      if (!snapshot.exists()) { onChange([]); return; }
      const data = snapshot.data();
      if (isRecord(data) && Array.isArray(data.proposals)) {
        const proposals = data.proposals.map(normalizeGroupProposal).filter((p): p is GroupProposalFirestore => p !== null);
        onChange(proposals);
      } else {
        onChange([]);
      }
    } catch (error) {
      onError(asError(error));
    }
  }, (error) => onError(asError(error)));
}, onError);

export const subscribeToApprovedGroup = (
  sessionId: string,
  groupId: string,
  onChange: (group: ApprovedGroupFirestore | null) => void,
  onError: (error: Error) => void,
): (() => void) => subscribeSafely(() => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(groupId, 'groupId');
  return onSnapshot(doc(db, SESSIONS_COL, sessionId, GROUPS_SUB, groupId), (snapshot) => {
    try {
      onChange(snapshot.exists() ? normalizeApprovedGroup(snapshot.data()) : null);
    } catch (error) {
      onError(asError(error));
    }
  }, (error) => onError(asError(error)));
}, onError);

// --- V4: Evidence read/write (teacher-only) ---

export const writeEvidence = async (
  sessionId: string,
  studentId: string,
  stepId: string,
  evidence: Omit<EvidenceFirestore, 'createdAt' | 'updatedAt'>,
): Promise<void> => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(studentId, 'studentId');
  assertIdentifier(stepId, 'stepId');
  const evidenceId = `${studentId}__${stepId}`;
  await setDoc(doc(db, SESSIONS_COL, sessionId, EVIDENCE_SUB, evidenceId), {
    ...evidence,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const readEvidence = async (
  sessionId: string,
  studentId: string,
  stepId: string,
): Promise<EvidenceFirestore | null> => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(studentId, 'studentId');
  assertIdentifier(stepId, 'stepId');
  const evidenceId = `${studentId}__${stepId}`;
  const snapshot = await getDoc(doc(db, SESSIONS_COL, sessionId, EVIDENCE_SUB, evidenceId));
  return snapshot.exists() ? normalizeEvidence(snapshot.data()) : null;
};

// --- V4: Approved group read/write (teacher writes, assigned student reads) ---

export const writeApprovedGroup = async (
  sessionId: string,
  group: ApprovedGroupFirestore,
): Promise<void> => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(group.groupId, 'groupId');
  const groupDocRef = doc(db, SESSIONS_COL, sessionId, GROUPS_SUB, group.groupId);
  await setDoc(groupDocRef, {
    ...group,
    updatedAt: serverTimestamp(),
  });
  for (const studentId of group.memberIds) {
    assertIdentifier(studentId, 'memberId');
    const studentRef = doc(db, SESSIONS_COL, sessionId, GROUPS_SUB, group.groupId, STUDENTS_SUB, studentId);
    await setDoc(studentRef, {
      groupId: group.groupId,
      scaffold: group.scaffold,
      startedAt: group.startedAt,
    });
  }
};

export const readApprovedGroup = async (
  sessionId: string,
  groupId: string,
): Promise<ApprovedGroupFirestore | null> => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(groupId, 'groupId');
  const snapshot = await getDoc(doc(db, SESSIONS_COL, sessionId, GROUPS_SUB, groupId));
  return snapshot.exists() ? normalizeApprovedGroup(snapshot.data()) : null;
};

// --- V4: Group proposals read/write (teacher-only) ---

export const writeGroupProposals = async (
  sessionId: string,
  proposals: GroupProposalFirestore[],
): Promise<void> => {
  assertIdentifier(sessionId, 'sessionId');
  await setDoc(doc(db, SESSIONS_COL, sessionId, PROPOSALS_SUB, 'current'), {
    proposals,
    updatedAt: serverTimestamp(),
  });
};

export const readGroupProposals = async (
  sessionId: string,
): Promise<GroupProposalFirestore[]> => {
  assertIdentifier(sessionId, 'sessionId');
  const snapshot = await getDoc(doc(db, SESSIONS_COL, sessionId, PROPOSALS_SUB, 'current'));
  if (!snapshot.exists()) return [];
  const data = snapshot.data();
  if (!isRecord(data) || !Array.isArray(data.proposals)) return [];
  return data.proposals.map(normalizeGroupProposal).filter((p): p is GroupProposalFirestore => p !== null);
};

// --- V4: Subscribe to assigned student's group (student reads their own assignment) ---

export const subscribeToStudentGroup = (
  sessionId: string,
  groupId: string,
  studentId: string,
  onChange: (group: StudentGroupPayload | null) => void,
  onError: (error: Error) => void,
): (() => void) => subscribeSafely(() => {
  assertIdentifier(sessionId, 'sessionId');
  assertIdentifier(groupId, 'groupId');
  assertIdentifier(studentId, 'studentId');
  // Student reads ONLY their own assignment subdoc (parent group doc is teacher-only)
  return onSnapshot(doc(db, SESSIONS_COL, sessionId, GROUPS_SUB, groupId, STUDENTS_SUB, studentId), (snapshot) => {
    try {
      onChange(snapshot.exists() ? normalizeStudentGroupPayload(snapshot.data()) : null);
    } catch (error) {
      onError(asError(error));
    }
  }, (error) => onError(asError(error)));
}, onError);
