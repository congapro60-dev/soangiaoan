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
