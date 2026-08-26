/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { mergeProfileWithExisting } from './adaptive-progress-profile.js';
import {
  buildProgressBridgeResults,
  ProgressBridgeInputError,
  type NormalizedLiveStudentSubmission,
  type TrustedParticipantMetadata,
} from '../src/lib/liveLesson/progressBridge.js';
import type { LiveLessonDefinition, LiveLessonSession, LiveResponse, LiveRoute } from '../src/lib/liveLesson/types.js';

const parseJsonSecret = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return JSON.parse(value.replace(/\r?\n/g, '\\n'));
  }
};

const parseServiceAccount = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const rawBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (rawJson) {
    return parseJsonSecret(rawJson);
  }

  if (rawBase64) {
    return parseJsonSecret(Buffer.from(rawBase64, 'base64').toString('utf8'));
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
};

const getAdminDb = () => {
  if (!getApps().length) {
    const serviceAccount = parseServiceAccount();
    if (!serviceAccount) {
      throw new Error('Missing Firebase Admin service account environment variables');
    }

    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore();
};

const normalizeStudentCode = (value: unknown) => String(value || '').trim().toUpperCase().replace(/\s+/g, '-');
const isNonEmptyString = (value: unknown, maxLength: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
const isValidLearningRoute = (value: unknown) => ['foundation', 'standard', 'challenge'].includes(String(value));
const isValidProgressStatus = (value: unknown) => ['in_progress', 'needs_support', 'completed'].includes(String(value));
const isValidLiveRoute = (value: unknown): value is LiveRoute => ['M', 'S', 'C'].includes(String(value));
const toMillis = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const millis = (value as { toMillis: () => unknown }).toMillis();
    if (typeof millis === 'number' && Number.isFinite(millis)) return millis;
  }
  if (value && typeof (value as { seconds?: unknown }).seconds === 'number') {
    const seconds = (value as { seconds: number }).seconds;
    const nanoseconds = typeof (value as { nanoseconds?: unknown }).nanoseconds === 'number'
      ? (value as { nanoseconds: number }).nanoseconds : 0;
    return seconds * 1000 + nanoseconds / 1_000_000;
  }
  return fallback;
};

const normalizeLiveSession = (sessionId: string, value: FirebaseFirestore.DocumentData): LiveLessonSession => ({
  id: sessionId,
  schemaVersion: 1,
  lessonId: String(value.lessonId || ''),
  title: String(value.title || ''),
  classId: String(value.classId || ''),
  teacherUid: String(value.teacherUid || ''),
  allowedStepIds: Array.isArray(value.allowedStepIds) ? value.allowedStepIds.map(String) : [],
  expiresAt: toMillis(value.expiresAt),
  status: value.status,
  currentCueId: String(value.currentCueId || ''),
  currentTvScreenId: String(value.currentTvScreenId || ''),
  publicStateEnabled: Boolean(value.publicStateEnabled),
  publicStatsEnabled: Boolean(value.publicStatsEnabled),
  createdAt: toMillis(value.createdAt),
  updatedAt: toMillis(value.updatedAt),
});

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const findAdaptiveLessonDocument = async (
  db: FirebaseFirestore.Firestore,
  teacherId: string,
  lessonId: string,
): Promise<{ data: FirebaseFirestore.DocumentData; lesson: Record<string, unknown> } | null> => {
  const candidateIds = [...new Set([lessonId, teacherId].filter(Boolean))];

  for (const candidateId of candidateIds) {
    const snapshot = await db.collection('adaptiveLessons').doc(candidateId).get();
    if (!snapshot.exists) continue;

    const data = snapshot.data() || {};
    const lesson = isRecord(data.lesson) ? data.lesson : data;
    const storedTeacherId = typeof data.teacherId === 'string'
      ? data.teacherId
      : (typeof lesson.teacherId === 'string' ? lesson.teacherId : (candidateId === teacherId ? candidateId : undefined));
    const storedLessonId = typeof lesson.id === 'string' ? lesson.id : data.lessonId;

    if (storedTeacherId !== teacherId || storedLessonId !== lessonId || data.portalEnabled !== true) continue;
    return { data, lesson };
  }

  return null;
};

const normalizeLiveResponse = (id: string, value: FirebaseFirestore.DocumentData): LiveResponse => ({
  id,
  participantUid: String(value.participantUid || ''),
  classId: String(value.classId || ''),
  stepId: String(value.stepId || ''),
  responseType: value.responseType,
  value: value.value,
  clientNonce: String(value.clientNonce || ''),
  submittedAt: toMillis(value.submittedAt, toMillis(value.updatedAt)),
  updatedAt: toMillis(value.updatedAt, toMillis(value.submittedAt)),
});

type ReadyProgressRecord = Extract<ReturnType<typeof buildProgressBridgeResults>[number], { kind: 'ready' }>['record'];

const buildMinimumProfile = ({
  existingProfile,
  metadata,
  record,
  closedAt,
}: {
  existingProfile: any | null;
  metadata: TrustedParticipantMetadata;
  record: ReadyProgressRecord;
  closedAt: string;
}) => ({
  id: metadata.studentId,
  teacherId: metadata.teacherId,
  studentId: metadata.studentId,
  studentCode: metadata.studentCode,
  studentName: metadata.studentName,
  ...(metadata.studentClass ? { studentClass: metadata.studentClass } : {}),
  totalSessions: existingProfile ? Number(existingProfile.totalSessions || 0) : 1,
  averageMastery: existingProfile ? Number(existingProfile.averageMastery || 0) : 0,
  routeHistory: existingProfile?.routeHistory?.length ? existingProfile.routeHistory : [record.route],
  // Live close has no scored objective evidence; preserve existing evidence in the
  // merge helper, but never invent mastery or misconception counts here.
  objectiveMemory: [],
  misconceptionCounts: {},
  lastLessonId: record.lessonId,
  lastLessonTitle: record.lessonTitle,
  lastActiveAt: closedAt,
  createdAt: existingProfile?.createdAt || closedAt,
  updatedAt: closedAt,
});

const saveLiveLessonRecord = async ({
  db,
  record,
  metadata,
  closedAt,
}: {
  db: FirebaseFirestore.Firestore;
  record: ReadyProgressRecord;
  metadata: TrustedParticipantMetadata;
  closedAt: string;
}): Promise<void> => {
  const profileRef = db.collection('studentLearningProfiles').doc(record.studentId);
  const progressRef = db.collection('adaptiveSessionProgress').doc(record.id);
  await db.runTransaction(async transaction => {
    const existingProgressSnapshot = await transaction.get(progressRef);
    const existingProfileSnapshot = await transaction.get(profileRef);
    const existingProfile = existingProfileSnapshot.exists ? existingProfileSnapshot.data() : null;
    transaction.set(progressRef, { ...record, savedViaAdminApi: true, serverSyncedAt: FieldValue.serverTimestamp() }, { merge: true });
    if (!existingProgressSnapshot.exists) {
      const incomingProfile = buildMinimumProfile({ existingProfile, metadata, record, closedAt });
      const mergedProfile = mergeProfileWithExisting({ existingProfile, incomingProfile, progressRecord: record });
      transaction.set(profileRef, { ...mergedProfile, savedViaAdminApi: true, serverSyncedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  });
};

const uidFromIdToken = async (idToken: unknown): Promise<string | null> => {
  if (typeof idToken !== 'string' || !idToken) return null;
  try {
    return (await getAuth().verifyIdToken(idToken)).uid;
  } catch {
    return null;
  }
};

const routeFromExistingProfile = (existingProfile: any | null): LiveRoute | null => {
  const previousRoute = existingProfile?.routeHistory?.at?.(-1);
  if (previousRoute === 'foundation') return 'M';
  if (previousRoute === 'challenge') return 'C';
  if (previousRoute === 'standard') return 'S';
  return null;
};

const routeFromServerResponse = (responses: LiveResponse[]): LiveRoute | null => {
  const response = responses
    .filter(item => item.stepId === 'route' && item.responseType === 'route')
    .sort((left, right) => right.updatedAt - left.updatedAt || right.submittedAt - left.submittedAt || right.id.localeCompare(left.id))[0];
  return response && isValidLiveRoute(String(response.value)) ? String(response.value) as LiveRoute : null;
};

const handleLiveLessonProgressClose = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
) => {
  const uid = await uidFromIdToken(body.idToken);
  if (!uid) return res.status(401).json({ error: 'Cần đăng nhập tài khoản giáo viên.' });
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!isNonEmptyString(sessionId, 128) || !isRecord(body.definition)) {
    return res.status(400).json({ error: 'Thiếu sessionId hoặc canonical live lesson definition.' });
  }

  const sessionSnapshot = await db.collection('liveLessonSessions').doc(sessionId).get();
  if (!sessionSnapshot.exists) return res.status(404).json({ error: 'Không tìm thấy phiên tiết trực tiếp.' });
  const session = normalizeLiveSession(sessionId, sessionSnapshot.data() || {});
  if (session.status !== 'closed') return res.status(409).json({ error: 'Phiên chưa đóng; chưa ghi tiến trình.' });
  if (session.teacherUid !== uid) return res.status(403).json({ error: 'Chỉ giáo viên chủ phiên mới được ghi tiến trình.' });

  const classSnapshot = await db.collection('classes').doc(session.classId).get();
  if (!classSnapshot.exists || classSnapshot.data()?.teacherId !== uid) {
    return res.status(403).json({ error: 'Lớp của phiên không thuộc giáo viên hiện tại.' });
  }
  const adaptiveLesson = await findAdaptiveLessonDocument(db, uid, session.lessonId);
  const lesson = adaptiveLesson?.lesson || {};
  if (!adaptiveLesson || lesson.status !== 'published') {
    return res.status(403).json({ error: 'Bài học chưa published/portal-enabled; chưa ghi tiến trình.' });
  }

  const definition = { ...(body.definition as unknown as LiveLessonDefinition), title: String(lesson.title || body.definition.title || session.title) };
  const responseSnapshot = await db.collection('liveLessonSessions').doc(sessionId).collection('responses').get();
  const responsesByParticipant = new Map<string, LiveResponse[]>();
  const invalidParticipantUids = new Set<string>();
  for (const responseDoc of responseSnapshot.docs) {
    const raw = responseDoc.data() || {};
    const participantUid = typeof raw.participantUid === 'string' ? raw.participantUid : '';
    try {
      const response = normalizeLiveResponse(responseDoc.id, raw);
      if (!response.participantUid) throw new Error('participantUid missing');
      const current = responsesByParticipant.get(response.participantUid) || [];
      current.push(response);
      responsesByParticipant.set(response.participantUid, current);
    } catch {
      if (participantUid) invalidParticipantUids.add(participantUid);
    }
  }

  const participantUids = new Set([...responsesByParticipant.keys(), ...invalidParticipantUids]);
  const participantMetadata: TrustedParticipantMetadata[] = [];
  const rosterRef = classSnapshot.ref.collection('students');
  for (const participantUid of participantUids) {
    if (invalidParticipantUids.has(participantUid)) continue;
    const linkSnapshot = await db.collection('studentLinks').doc(participantUid).get();
    const link = linkSnapshot.data() || {};
    if (!linkSnapshot.exists || link.uid !== participantUid || link.classId !== session.classId || link.teacherId !== uid
      || !isNonEmptyString(link.studentId, 128)) continue;
    const rosterSnapshot = await rosterRef.doc(link.studentId).get();
    const roster = rosterSnapshot.data() || {};
    if (!rosterSnapshot.exists || rosterSnapshot.id !== link.studentId || roster.classId !== session.classId || roster.teacherId !== uid
      || !isNonEmptyString(roster.code, 64) || !isNonEmptyString(roster.name, 120)) continue;
    const adaptiveStudentId: string = `${uid}_${normalizeStudentCode(roster.code)}`;
    const profileSnapshot: any = await db.collection('studentLearningProfiles').doc(adaptiveStudentId).get();
    const existingProfile: any | null = profileSnapshot.exists ? profileSnapshot.data() || null : null;
    const responses = responsesByParticipant.get(participantUid) || [];
    const route = routeFromServerResponse(responses) ?? routeFromExistingProfile(existingProfile);
    if (!route) continue;
    if (existingProfile && (existingProfile.teacherId !== uid || existingProfile.studentId !== adaptiveStudentId
      || normalizeStudentCode(existingProfile.studentCode) !== normalizeStudentCode(roster.code))) continue;
    participantMetadata.push({
      participantUid,
      studentId: adaptiveStudentId,
      studentCode: String(roster.code),
      studentName: String(roster.name),
      studentClass: typeof roster.studentClass === 'string' ? roster.studentClass : String(classSnapshot.data()?.name || ''),
      teacherId: uid,
      classId: session.classId,
      route,
    });
  }

  let bridgeResults;
  try {
    bridgeResults = buildProgressBridgeResults({
      session,
      definition,
      submissions: [...responsesByParticipant.entries()]
        .filter(([participantUid]) => !invalidParticipantUids.has(participantUid))
        .map(([participantUid, responses]): NormalizedLiveStudentSubmission => ({ participantUid, responses })),
      participantMetadata,
    });
  } catch (error) {
    if (error instanceof ProgressBridgeInputError) return res.status(400).json({ error: error.message });
    throw error;
  }

  const readyResults = bridgeResults.filter((result): result is Extract<typeof result, { kind: 'ready' }> => result.kind === 'ready');
  let saved = 0;
  let failed = invalidParticipantUids.size;
  for (const result of readyResults) {
    const metadata = participantMetadata.find(item => item.studentId === result.record.studentId);
    if (!metadata) continue;
    try {
      await saveLiveLessonRecord({
        db,
        record: result.record,
        metadata: { ...metadata, route: result.record.route === 'foundation' ? 'M' : result.record.route === 'challenge' ? 'C' : 'S' },
        closedAt: new Date(session.updatedAt).toISOString(),
      });
      saved += 1;
    } catch (error) {
      console.error('[adaptive-progress] live lesson record save failed:', error);
      failed += 1;
    }
  }
  const incomplete = bridgeResults.filter(result => result.kind === 'not_ready').length;
  return res.status(200).json({
    ok: true,
    eligible: readyResults.length,
    saved,
    failed,
    incomplete,
  });
};

const hasReasonableAdaptivePayloadShape = ({ progressRecord, profileRecord }: { progressRecord: any; profileRecord: any }) => (
  isNonEmptyString(progressRecord?.lessonTitle, 300)
  && isNonEmptyString(progressRecord?.studentName, 120)
  && (progressRecord?.studentClass === undefined || typeof progressRecord.studentClass === 'string')
  && isValidLearningRoute(progressRecord?.route)
  && isValidProgressStatus(progressRecord?.status)
  && progressRecord?.diagnosticAttempt && typeof progressRecord.diagnosticAttempt === 'object'
  && Array.isArray(progressRecord?.quickCheckAttempts) && progressRecord.quickCheckAttempts.length <= 20
  && Array.isArray(progressRecord?.objectiveStates) && progressRecord.objectiveStates.length <= 80
  && typeof progressRecord?.remediationAttempts === 'number'
  && isNonEmptyString(progressRecord?.startedAt, 40)
  && isNonEmptyString(progressRecord?.updatedAt, 40)
  && (progressRecord?.completedAt === undefined || isNonEmptyString(progressRecord.completedAt, 40))
  && isNonEmptyString(profileRecord?.studentName, 120)
  && (profileRecord?.studentClass === undefined || typeof profileRecord.studentClass === 'string')
  && typeof profileRecord?.totalSessions === 'number'
  && typeof profileRecord?.averageMastery === 'number'
  && Array.isArray(profileRecord?.routeHistory) && profileRecord.routeHistory.length <= 20
  && Array.isArray(profileRecord?.objectiveMemory) && profileRecord.objectiveMemory.length <= 80
  && profileRecord?.misconceptionCounts && typeof profileRecord.misconceptionCounts === 'object' && !Array.isArray(profileRecord.misconceptionCounts)
  && isNonEmptyString(profileRecord?.lastLessonId, 128)
  && isNonEmptyString(profileRecord?.lastActiveAt, 40)
  && isNonEmptyString(profileRecord?.createdAt, 40)
  && isNonEmptyString(profileRecord?.updatedAt, 40)
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const teacherId = typeof req.query.teacherId === 'string' ? req.query.teacherId : '';
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : '';

    if (!isNonEmptyString(teacherId, 128) || !isNonEmptyString(studentId, 256) || !studentId.startsWith(`${teacherId}_`)) {
      return res.status(400).json({ error: 'Invalid adaptive profile lookup' });
    }

    try {
      const db = getAdminDb();
      const profileSnapshot = await db.collection('studentLearningProfiles').doc(studentId).get();
      if (!profileSnapshot.exists) {
        return res.status(200).json({ ok: true, profile: null });
      }

      const profile = profileSnapshot.data() || {};
      if (profile.teacherId !== teacherId || profile.studentId !== studentId) {
        return res.status(403).json({ error: 'Adaptive profile lookup denied' });
      }

      const adaptiveLesson = await findAdaptiveLessonDocument(db, teacherId, profile.lastLessonId);
      if (!adaptiveLesson) {
        return res.status(403).json({ error: 'Student portal is not enabled for this profile' });
      }

      return res.status(200).json({ ok: true, profile });
    } catch (err: any) {
      console.error('Adaptive profile API failed:', err);
      return res.status(500).json({ error: err?.message || 'Adaptive profile lookup failed' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  if (body.action === 'saveLiveLessonProgress') {
    try {
      return await handleLiveLessonProgressClose(getAdminDb(), body, res);
    } catch (err: any) {
      console.error('Adaptive live lesson progress API failed:', err);
      return res.status(500).json({ error: err?.message || 'Adaptive live lesson progress save failed' });
    }
  }

  const { teacherId, lessonId, progressId, studentId, progressRecord, profileRecord } = body;

  if (
    typeof teacherId !== 'string'
    || typeof lessonId !== 'string'
    || typeof progressId !== 'string'
    || typeof studentId !== 'string'
    || !progressRecord
    || !profileRecord
  ) {
    return res.status(400).json({ error: 'Missing adaptive progress payload' });
  }

  const normalizedStudentCode = normalizeStudentCode(progressRecord.studentCode);
  const expectedStudentId = `${teacherId}_${normalizedStudentCode}`;
  const expectedProgressId = `${teacherId}_${lessonId}_${normalizedStudentCode}`;

  if (
    !isNonEmptyString(teacherId, 128)
    || !isNonEmptyString(lessonId, 128)
    || !isNonEmptyString(normalizedStudentCode, 64)
    || progressId !== expectedProgressId
    || studentId !== expectedStudentId
    || progressRecord.id !== progressId
    || profileRecord.id !== studentId
    || progressRecord.teacherId !== teacherId
    || progressRecord.lessonId !== lessonId
    || progressRecord.studentId !== studentId
    || profileRecord.teacherId !== teacherId
    || profileRecord.studentId !== studentId
    || profileRecord.lastLessonId !== lessonId
    || normalizeStudentCode(profileRecord.studentCode) !== normalizedStudentCode
    || !hasReasonableAdaptivePayloadShape({ progressRecord, profileRecord })
  ) {
    return res.status(400).json({ error: 'Invalid adaptive progress payload' });
  }

  try {
    const db = getAdminDb();
    const adaptiveLesson = await findAdaptiveLessonDocument(db, teacherId, lessonId);

    if (!adaptiveLesson) {
      return res.status(404).json({ error: 'Adaptive lesson not found' });
    }

    const profileRef = db.collection('studentLearningProfiles').doc(studentId);
    const progressRef = db.collection('adaptiveSessionProgress').doc(progressId);
    let mergedProfile: any = null;

    await db.runTransaction(async transaction => {
      const existingProfileSnapshot = await transaction.get(profileRef);
      const existingProfile = existingProfileSnapshot.exists ? existingProfileSnapshot.data() : null;
      mergedProfile = mergeProfileWithExisting({ existingProfile, incomingProfile: profileRecord, progressRecord });

      transaction.set(progressRef, {
        ...progressRecord,
        savedViaAdminApi: true,
        serverSyncedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(profileRef, {
        ...mergedProfile,
        savedViaAdminApi: true,
        serverSyncedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return res.status(200).json({ ok: true, profile: mergedProfile });
  } catch (err: any) {
    console.error('Adaptive progress API failed:', err);
    return res.status(500).json({ error: err?.message || 'Adaptive progress save failed' });
  }
}
