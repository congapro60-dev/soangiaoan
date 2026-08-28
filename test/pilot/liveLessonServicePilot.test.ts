import { afterEach, describe, expect, it } from 'vitest';
import {
  createUserWithEmailAndPassword,
  connectAuthEmulator,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { connectFirestoreEmulator, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../../src/lib/firebase';
import type { LiveLessonDefinition, LivePublicState, LivePublicStats } from '../../src/lib/liveLesson/types';

connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

const {
  createLiveLessonSession,
  updateLiveLessonState,
  submitLiveResponse,
  publishLivePublicStats,
  subscribeToLivePublicState,
  subscribeToLivePublicStats,
} = await import('../../src/services/liveLessonService');

const CLASS_A = 'pilot-class-a';
const PROJECT_ID = db.app.options.projectId;
const ROOT_URL = `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const CLEAR_URL = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const OWNER_HEADERS = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

const pass = (message: string) => console.log(`PASS ${message}`);

const toRestFields = (data: Record<string, unknown>): Record<string, unknown> => {
  const convert = (value: unknown): Record<string, unknown> => {
    if (value === null) return { nullValue: null };
    if (typeof value === 'string') return { stringValue: value };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (Number.isInteger(value)) return { integerValue: String(value) };
    if (typeof value === 'number') return { doubleValue: value };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(convert) } };
    if (typeof value === 'object') return { mapValue: { fields: toRestFields(value as Record<string, unknown>) } };
    throw new Error(`Unsupported REST seed value: ${String(value)}`);
  };
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, convert(value)]));
};

const restWrite = async (path: string, data: Record<string, unknown>) => {
  const response = await fetch(`${ROOT_URL}/${path}`, {
    method: 'PATCH',
    headers: OWNER_HEADERS,
    body: JSON.stringify({ fields: toRestFields(data) }),
  });
  if (!response.ok) throw new Error(`REST seed failed for ${path}: ${response.status} ${await response.text()}`);
};

const clearFirestore = async () => {
  const response = await fetch(CLEAR_URL, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
  if (!response.ok) throw new Error(`REST clear failed: ${response.status} ${await response.text()}`);
};

const buildDefinition = (): LiveLessonDefinition => ({
  id: 'pilot-definition',
  lessonId: 'g10-w5-p31',
  title: 'Pilot',
  durationSeconds: 2400,
  allowedStepIds: ['warmup', 'notice-wonder', 'goals', 'model', 'ai-error-w01', 'quick-check', 'exit-ticket'],
  aiErrorStepId: 'ai-error-w01',
  aiErrorOfTheWeek: {
    id: 'ai-error-w01',
    category: 'Conceptual',
    correction: 'Kiểm tra điều kiện trước khi kết luận.',
    proof: 'Sai lầm mẫu đã được sửa bằng cách đối chiếu giả thiết.',
  },
  cues: [{
    id: 'cue-1',
    atSeconds: 0,
    label: 'Warmup',
    tvScreenId: 'tv-1',
    teacher: 'Open the pilot.',
    student: 'Choose one option',
    boardLarge: 'Pilot',
    boardSide: '',
    notebook: '',
    observerEvidence: 'Students pick an option.',
    responseStepId: 'warmup',
  }],
  tvScreens: [{ id: 'tv-1', label: 'TV 1', title: 'Pilot TV', body: 'Public prompt' }],
  studentScreens: [{ id: 'student-1', label: 'Student 1', title: 'Pilot Student', body: 'Choose one option' }],
  responseSteps: [{ id: 'warmup', label: 'Warmup', screenId: 'student-1', responseTypes: ['choice'] }],
});

const waitForSnapshot = <T>(subscribe: (onValue: (value: T | null) => void, onError: (error: Error) => void) => () => void) => {
  let unsubscribe = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for first non-empty snapshot')), 8000);
    unsubscribe = subscribe((value) => {
      if (value) {
        clearTimeout(timeout);
        resolve(value);
      }
    }, (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  return { promise, unsubscribe: () => unsubscribe() };
};

const expectPermissionDenied = async (operation: Promise<unknown>) => {
  try {
    await operation;
    throw new Error('Expected PERMISSION_DENIED but operation succeeded');
  } catch (error) {
    expect((error as { code?: string }).code).toBe('permission-denied');
  }
};

const expectNoPrivateData = (payload: unknown, forbidden: string[]) => {
  const text = JSON.stringify(payload);
  for (const needle of forbidden) expect(text).not.toContain(needle);
  expect(text).not.toContain('"value"');
};

afterEach(async () => {
  await signOut(auth).catch(() => {});
});

describe('LiveLessonService V4 local service pilot', () => {
  it('drives real service calls against current Firestore rules on the emulator', async () => {
    await clearFirestore();

    const teacherCredential = await createUserWithEmailAndPassword(auth, 'teacher@pilot.test', 'pilotpass');
    const teacherUid = teacherCredential.user.uid;
    await restWrite(`classes/${CLASS_A}`, { teacherId: teacherUid, name: 'Pilot Class A' });

    // A successful ALLOW operation proves that path had no fatal rules evaluator error:
    // Firestore evaluator errors on allow paths force DENY, which would throw here.
    const session = await createLiveLessonSession({ definition: buildDefinition(), teacherUid, classId: CLASS_A });
    expect(session.id).toBeTruthy();
    pass('GV create live lesson session');

    await updateLiveLessonState(session.id, { status: 'running', publicStatsEnabled: true });
    pass('GV update live lesson state');

    const studentUids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      await signOut(auth);
      const studentCredential = await signInAnonymously(auth);
      const studentUid = studentCredential.user.uid;
      studentUids.push(studentUid);
      await restWrite(`studentLinks/${studentUid}`, { classId: CLASS_A });
      await submitLiveResponse({
        sessionId: session.id,
        participantUid: studentUid,
        classId: CLASS_A,
        stepId: 'warmup',
        responseType: 'choice',
        value: 'A',
        clientNonce: `n-${i}`,
      });
      pass(`HS ${i + 1} submit live response`);
    }

    await signOut(auth);
    await signInWithEmailAndPassword(auth, 'teacher@pilot.test', 'pilotpass');
    await publishLivePublicStats(session.id, {
      stepId: 'warmup',
      participantCount: 3,
      submittedCount: 3,
      choiceCounts: { A: 3 },
      routeCounts: { M: 0, S: 0, C: 0 },
      errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
      hintUseCount: 0,
      updatedAt: Date.now(),
    });
    pass('GV publish public stats');

    await signOut(auth);
    const stateListener = waitForSnapshot<LivePublicState>((onValue, onError) => subscribeToLivePublicState(session.id, onValue, onError));
    const statsListener = waitForSnapshot<LivePublicStats>((onValue, onError) => subscribeToLivePublicStats(session.id, onValue, onError));
    const [publicState, publicStats] = await Promise.all([stateListener.promise, statsListener.promise]);
    stateListener.unsubscribe();
    statsListener.unsubscribe();
    expect(publicState).toBeTruthy();
    expect(publicStats).toBeTruthy();
    pass('TV unauthenticated realtime public state/stats read');

    const forbidden = [
      teacherUid,
      ...studentUids,
      'Pilot Student Name',
      'rawText',
      'privateReason',
      'languageSupportPlan',
      'teacherScript',
    ];
    expectNoPrivateData(publicState, forbidden);
    expectNoPrivateData(publicStats, [teacherUid, ...studentUids, 'Pilot Student Name', 'rawText', 'privateReason', 'languageSupportPlan', 'teacherScript']);
    pass('TV public payload privacy check');

    await signInAnonymously(auth);
    const deniedStudentUid = auth.currentUser?.uid;
    expect(deniedStudentUid).toBeTruthy();
    await restWrite(`studentLinks/${deniedStudentUid}`, { classId: CLASS_A });
    await expectPermissionDenied(getDoc(doc(db, `liveLessonSessions/${session.id}/responses/${studentUids[0]}__warmup`)));
    pass('DENY student reads another response');
    await expectPermissionDenied(getDoc(doc(db, `liveLessonSessions/${session.id}/evidence/${studentUids[0]}__warmup`)));
    await expectPermissionDenied(getDoc(doc(db, `liveLessonSessions/${session.id}/groupProposals/current`)));
    pass('DENY student reads evidence/group proposals');
    await expectPermissionDenied(setDoc(doc(db, `liveLessonSessions/student-forged-session`), {
      schemaVersion: 1,
      lessonId: 'g10-w5-p31',
      title: 'Student forged session',
      classId: CLASS_A,
      teacherUid: deniedStudentUid,
      allowedStepIds: ['warmup'],
      expiresAt: new Date(Date.now() + 60_000),
      status: 'lobby',
      currentCueId: 'cue-1',
      currentTvScreenId: 'tv-1',
      publicStateEnabled: true,
      publicStatsEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    pass('DENY student creates parent session');

    await signOut(auth);
    await expectPermissionDenied(getDoc(doc(db, `liveLessonSessions/${session.id}/responses/${studentUids[0]}__warmup`)));
    pass('DENY unauthenticated TV reads response');

    pass('All allow-path operations succeeded -> no evaluator error on any allow-path (an allow-path evaluator error would have forced DENY). Deny-path evaluator traces are expected and accepted.');
  });
});
