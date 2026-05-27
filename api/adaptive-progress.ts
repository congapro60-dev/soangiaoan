/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { mergeProfileWithExisting } from './adaptive-progress-profile.js';

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

      const lessonSnapshot = await db.collection('adaptiveLessons').doc(teacherId).get();
      const lessonData = lessonSnapshot.data() || {};
      if (!lessonSnapshot.exists || lessonData.portalEnabled !== true || lessonData.lesson?.id !== profile.lastLessonId) {
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

  const { teacherId, lessonId, progressId, studentId, progressRecord, profileRecord } = req.body || {};

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
    const lessonSnapshot = await db.collection('adaptiveLessons').doc(teacherId).get();

    if (!lessonSnapshot.exists) {
      return res.status(404).json({ error: 'Adaptive lesson not found' });
    }

    const lessonData = lessonSnapshot.data() || {};
    if (lessonData.portalEnabled !== true || lessonData.lesson?.id !== lessonId) {
      return res.status(403).json({ error: 'Student portal is not enabled for this lesson' });
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
