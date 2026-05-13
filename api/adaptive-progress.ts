/// <reference types="node" />
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

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

const getAverageMasteryFromAttempts = (attempts: any[]) => {
  const scores = attempts.flatMap(attempt => (
    Array.isArray(attempt?.objectiveScores)
      ? attempt.objectiveScores.map((score: any) => Number(score?.masteryEstimate)).filter(Number.isFinite)
      : []
  ));

  if (scores.length === 0) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
};

const mergeProfileWithExisting = ({ existingProfile, incomingProfile, progressRecord }: {
  existingProfile: any | null;
  incomingProfile: any;
  progressRecord: any;
}) => {
  if (!existingProfile) return incomingProfile;

  const diagnosticAttempt = progressRecord?.diagnosticAttempt;
  const quickCheckAttempts = Array.isArray(progressRecord?.quickCheckAttempts) ? progressRecord.quickCheckAttempts : [];
  const attempts = [diagnosticAttempt, ...quickCheckAttempts].filter(Boolean);
  const sessionMastery = getAverageMasteryFromAttempts(attempts);
  const previousSessions = Number(existingProfile.totalSessions || 0);
  const totalSessions = previousSessions + 1;
  const previousAverage = Number(existingProfile.averageMastery || 0);
  const averageMastery = Number((((previousAverage * previousSessions) + sessionMastery) / Math.max(totalSessions, 1)).toFixed(2));

  const currentMemory = Array.isArray(existingProfile.objectiveMemory) ? existingProfile.objectiveMemory : [];
  const incomingMemory = Array.isArray(incomingProfile.objectiveMemory) ? incomingProfile.objectiveMemory : [];
  const objectiveMemory = incomingMemory.map((incoming: any) => {
    const previous = currentMemory.find((item: any) => item?.objectiveId === incoming?.objectiveId);
    return {
      ...previous,
      ...incoming,
      attempts: Number(previous?.attempts || 0) + Math.max(Number(incoming?.attempts || 0), 1),
      lastUpdatedAt: incoming?.lastUpdatedAt || new Date().toISOString(),
    };
  });

  const misconceptionCounts = { ...(existingProfile.misconceptionCounts || {}) };
  Object.entries(incomingProfile.misconceptionCounts || {}).forEach(([key, value]) => {
    misconceptionCounts[key] = Number(misconceptionCounts[key] || 0) + Number(value || 0);
  });

  return {
    ...existingProfile,
    ...incomingProfile,
    totalSessions,
    averageMastery,
    routeHistory: [...(existingProfile.routeHistory || []), incomingProfile.routeHistory?.at?.(-1) || progressRecord.route].filter(Boolean).slice(-20),
    objectiveMemory,
    misconceptionCounts,
    createdAt: existingProfile.createdAt || incomingProfile.createdAt || new Date().toISOString(),
    updatedAt: incomingProfile.updatedAt || new Date().toISOString(),
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

  if (
    progressRecord.teacherId !== teacherId
    || progressRecord.lessonId !== lessonId
    || progressRecord.studentId !== studentId
    || profileRecord.teacherId !== teacherId
    || profileRecord.studentId !== studentId
    || normalizeStudentCode(progressRecord.studentCode) !== normalizeStudentCode(profileRecord.studentCode)
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
    const existingProfileSnapshot = await profileRef.get();
    const existingProfile = existingProfileSnapshot.exists ? existingProfileSnapshot.data() : null;
    const mergedProfile = mergeProfileWithExisting({ existingProfile, incomingProfile: profileRecord, progressRecord });

    await db.runTransaction(async transaction => {
      transaction.set(db.collection('adaptiveSessionProgress').doc(progressId), {
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
