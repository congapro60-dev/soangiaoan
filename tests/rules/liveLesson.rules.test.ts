import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const TEACHER_A = 'teacher-A';
const TEACHER_B = 'teacher-B';
const STUDENT_A = 'student-A';
const STUDENT_B = 'student-B';
const CLASS_A = 'class-A';
const CLASS_B = 'class-B';
const SESSION_A = 'session-A';
const SESSION_CLOSED = 'session-closed';
const SESSION_EXPIRED = 'session-expired';
const SESSION_DISABLED = 'session-disabled';

const now = Date.now();
const FUTURE = Timestamp.fromMillis(now + 60 * 60 * 1000);
const PAST = Timestamp.fromMillis(now - 60 * 60 * 1000);
const CREATED = Timestamp.fromMillis(now - 60 * 60 * 1000);

let testEnv: RulesTestEnvironment;

const sessionData = (sessionId: string, overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  lessonId: 'g10-w5-p31',
  title: 'Bài toán chuyển động',
  classId: CLASS_A,
  teacherUid: TEACHER_A,
  allowedStepIds: ['warmup', 'notice-wonder', 'goals', 'model', 'ai-error-w01', 'quick-check', 'exit-ticket'],
  expiresAt: FUTURE,
  status: 'running',
  currentCueId: 'cue-1',
  currentTvScreenId: 'tv-1',
  publicStateEnabled: true,
  publicStatsEnabled: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const responseData = (overrides: Record<string, unknown> = {}) => ({
  participantUid: STUDENT_A,
  classId: CLASS_A,
  stepId: 'warmup',
  responseType: 'choice',
  value: 'A',
  clientNonce: 'nonce-123',
  submittedAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const publicStateData = (overrides: Record<string, unknown> = {}) => ({
  cueId: 'cue-1',
  tvScreenId: 'tv-1',
  status: 'running',
  showStats: true,
  updatedAt: serverTimestamp(),
  ...overrides,
});

const publicStatsData = (overrides: Record<string, unknown> = {}) => ({
  stepId: 'warmup',
  participantCount: 2,
  submittedCount: 1,
  choiceCounts: { A: 1, B: 0 },
  routeCounts: { M: 1, S: 0, C: 0 },
  errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
  hintUseCount: 0,
  updatedAt: serverTimestamp(),
  ...overrides,
});

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'live-lesson-rules-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();

    await setDoc(doc(db, `classes/${CLASS_A}`), { id: CLASS_A, teacherId: TEACHER_A, name: 'Lớp A' });
    await setDoc(doc(db, `classes/${CLASS_B}`), { id: CLASS_B, teacherId: TEACHER_B, name: 'Lớp B' });
    await setDoc(doc(db, `studentLinks/${STUDENT_A}`), {
      uid: STUDENT_A, studentId: 'student-code-A', classId: CLASS_A, teacherId: TEACHER_A,
    });
    await setDoc(doc(db, `studentLinks/${STUDENT_B}`), {
      uid: STUDENT_B, studentId: 'student-code-B', classId: CLASS_B, teacherId: TEACHER_B,
    });

    await setDoc(doc(db, `liveLessonSessions/${SESSION_A}`), sessionData(SESSION_A));
    await setDoc(doc(db, `liveLessonSessions/${SESSION_CLOSED}`), sessionData(SESSION_CLOSED, {
      status: 'closed',
    }));
    await setDoc(doc(db, `liveLessonSessions/${SESSION_EXPIRED}`), sessionData(SESSION_EXPIRED, {
      expiresAt: PAST,
    }));
    await setDoc(doc(db, `liveLessonSessions/${SESSION_DISABLED}`), sessionData(SESSION_DISABLED, {
      publicStateEnabled: false,
      publicStatsEnabled: false,
    }));

    for (const sessionId of [SESSION_A, SESSION_CLOSED, SESSION_EXPIRED, SESSION_DISABLED]) {
      await setDoc(doc(db, `liveLessonSessions/${sessionId}/public/state`), {
        cueId: 'cue-1', tvScreenId: 'tv-1', status: sessionId === SESSION_CLOSED ? 'closed' : 'running',
        showStats: true, updatedAt: CREATED,
      });
      await setDoc(doc(db, `liveLessonSessions/${sessionId}/public/stats`), {
        stepId: 'warmup', participantCount: 2, submittedCount: 1,
        choiceCounts: { A: 1, B: 0 }, routeCounts: { M: 1, S: 0, C: 0 },
        errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
        hintUseCount: 0, updatedAt: CREATED,
      });
    }
  });
});

const dbTeacherA = () => testEnv.authenticatedContext(TEACHER_A).firestore();
const dbTeacherB = () => testEnv.authenticatedContext(TEACHER_B).firestore();
const dbStudentA = () => testEnv.authenticatedContext(STUDENT_A).firestore();
const dbStudentB = () => testEnv.authenticatedContext(STUDENT_B).firestore();
const dbTv = () => testEnv.unauthenticatedContext().firestore();

const sessionRef = (db: ReturnType<typeof dbTeacherA>, id = SESSION_A) => doc(db, `liveLessonSessions/${id}`);
const responseRef = (db: ReturnType<typeof dbTeacherA>, id = SESSION_A, responseId = `${STUDENT_A}__warmup`) => (
  doc(db, `liveLessonSessions/${id}/responses/${responseId}`)
);
const publicRef = (db: ReturnType<typeof dbTeacherA>, id: string, name: 'state' | 'stats') => (
  doc(db, `liveLessonSessions/${id}/public/${name}`)
);

describe('liveLessonSessions · parent session', () => {
  it('owner creates a valid session → ALLOW', async () => {
    await assertSucceeds(setDoc(sessionRef(dbTeacherA(), 'session-new'), sessionData('session-new')));
  });

  it('other teacher cannot create in owner class → DENY', async () => {
    await assertFails(setDoc(sessionRef(dbTeacherB(), 'session-other'), sessionData('session-other', {
      teacherUid: TEACHER_B,
    })));
  });

  it('forged teacherUid cannot create → DENY', async () => {
    await assertFails(setDoc(sessionRef(dbTeacherA(), 'session-forged'), sessionData('session-forged', {
      teacherUid: TEACHER_B,
    })));
  });

  it('owner of another class cannot create in that class → DENY', async () => {
    await assertFails(setDoc(sessionRef(dbTeacherA(), 'session-wrong-class'), sessionData('session-wrong-class', {
      classId: CLASS_B,
    })));
  });

  it('legacy id/mode fields, wrong schema version and client timestamps → DENY', async () => {
    await assertFails(setDoc(sessionRef(dbTeacherA(), 'session-schema'), sessionData('session-schema', {
      schemaVersion: 2,
    })));
    await assertFails(setDoc(sessionRef(dbTeacherA(), 'session-id'), sessionData('session-id', {
      id: 'session-id',
    })));
    await assertFails(setDoc(sessionRef(dbTeacherA(), 'session-mode'), sessionData('session-mode', {
      mode: 'teacher',
    })));
    await assertFails(setDoc(sessionRef(dbTeacherA(), 'session-time'), sessionData('session-time', {
      createdAt: CREATED,
      updatedAt: CREATED,
    })));
  });

  it('unknown or non-string allowed step values → DENY', async () => {
    await assertFails(setDoc(sessionRef(dbTeacherA(), 'session-bad-step'), sessionData('session-bad-step', {
      allowedStepIds: ['not-a-pilot-step'],
    })));
    await assertFails(setDoc(sessionRef(dbTeacherA(), 'session-bad-step-type'), sessionData('session-bad-step-type', {
      allowedStepIds: [{ id: 'warmup' }],
    })));
  });

  it('owner can update state and delete; student and other teacher cannot mutate → ALLOW/DENY', async () => {
    await assertSucceeds(updateDoc(sessionRef(dbTeacherA()), {
      status: 'paused', currentCueId: 'cue-2', updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(sessionRef(dbTeacherA()), {
      status: 'running', updatedAt: CREATED,
    }));
    await assertFails(updateDoc(sessionRef(dbTeacherB()), { status: 'closed', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(sessionRef(dbStudentA()), { status: 'closed', updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(sessionRef(dbTeacherA())));
  });

  it('owner cannot mutate immutable session identity → DENY', async () => {
    await assertFails(updateDoc(sessionRef(dbTeacherA()), {
      title: 'title changed', updatedAt: serverTimestamp(),
    }));
  });

  it('only owner can get/list parent sessions; linked student cannot list → ALLOW/DENY', async () => {
    await assertSucceeds(getDoc(sessionRef(dbTeacherA())));
    await assertSucceeds(getDocs(query(collection(dbTeacherA(), 'liveLessonSessions'), where('teacherUid', '==', TEACHER_A))));
    await assertFails(getDoc(sessionRef(dbTeacherB())));
    await assertFails(getDocs(collection(dbStudentA(), 'liveLessonSessions')));
  });
});

describe('liveLessonSessions/{sessionId}/responses · student writes, teacher reads', () => {
  it('linked student writes route, choice and text responses in own class → ALLOW', async () => {
    await assertSucceeds(setDoc(responseRef(dbStudentA()), responseData({ responseType: 'route', value: 'M' })));
    await assertSucceeds(setDoc(responseRef(dbStudentA(), SESSION_A, `${STUDENT_A}__goals`), responseData({
      stepId: 'goals', responseType: 'choice', value: 'B',
    })));
    await assertSucceeds(setDoc(responseRef(dbStudentA(), SESSION_A, `${STUDENT_A}__notice-wonder`), responseData({
      stepId: 'notice-wonder', responseType: 'text', value: 'Em nhận thấy hai đại lượng cùng thay đổi.',
    })));
  });

  it('student can retry-update the same deterministic response → ALLOW', async () => {
    await setDoc(responseRef(dbStudentA()), responseData());
    await assertSucceeds(updateDoc(responseRef(dbStudentA()), {
      value: 'B', updatedAt: serverTimestamp(),
    }));
  });

  it('wrong-class, forged participant, wrong step, closed and expired writes → DENY', async () => {
    await assertFails(setDoc(responseRef(dbStudentB()), responseData({ participantUid: STUDENT_B, classId: CLASS_B })));
    await assertFails(setDoc(responseRef(dbStudentA()), responseData({ participantUid: STUDENT_B })));
    await assertFails(setDoc(responseRef(dbStudentA()), responseData({ stepId: 'unknown-step' })));
    await assertFails(setDoc(responseRef(dbStudentA(), SESSION_CLOSED, `${STUDENT_A}__warmup`), responseData()));
    await assertFails(setDoc(responseRef(dbStudentA(), SESSION_EXPIRED, `${STUDENT_A}__warmup`), responseData()));
  });

  it('oversized text, extra field and changed submittedAt → DENY', async () => {
    await assertFails(setDoc(responseRef(dbStudentA()), responseData({ responseType: 'text', value: 'x'.repeat(2001) })));
    await assertFails(setDoc(responseRef(dbStudentA()), { ...responseData(), rawPii: 'secret' }));
    await assertFails(setDoc(responseRef(dbStudentA()), responseData({ submittedAt: CREATED, updatedAt: CREATED })));
    await setDoc(responseRef(dbStudentA()), responseData());
    await assertFails(updateDoc(responseRef(dbStudentA()), {
      submittedAt: Timestamp.fromMillis(now), updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(responseRef(dbStudentA()), {
      clientNonce: 'nonce-changed', updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(responseRef(dbStudentA()), {
      updatedAt: CREATED,
    }));
  });

  it('only teacher owner can read raw responses; student, TV and other teacher cannot → ALLOW/DENY', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(responseRef(ctx.firestore()), responseData());
    });
    await assertSucceeds(getDoc(responseRef(dbTeacherA())));
    await assertSucceeds(getDocs(collection(dbTeacherA(), `liveLessonSessions/${SESSION_A}/responses`)));
    await assertFails(getDoc(responseRef(dbStudentA())));
    await assertFails(getDoc(responseRef(dbTv())));
    await assertFails(getDoc(responseRef(dbTeacherB())));
  });
});

describe('liveLessonSessions/{sessionId}/public · safe public documents', () => {
  it('unauthenticated TV and linked student read enabled active state/stats → ALLOW', async () => {
    await assertSucceeds(getDoc(publicRef(dbTv(), SESSION_A, 'state')));
    await assertSucceeds(getDoc(publicRef(dbTv(), SESSION_A, 'stats')));
    await assertSucceeds(getDoc(publicRef(dbStudentA(), SESSION_A, 'state')));
    await assertSucceeds(getDoc(publicRef(dbStudentA(), SESSION_A, 'stats')));
  });

  it('disabled, closed and expired sessions deny public state/stats reads → DENY', async () => {
    for (const sessionId of [SESSION_DISABLED, SESSION_CLOSED, SESSION_EXPIRED]) {
      await assertFails(getDoc(publicRef(dbTv(), sessionId, 'state')));
      await assertFails(getDoc(publicRef(dbTv(), sessionId, 'stats')));
      await assertFails(getDoc(publicRef(dbStudentA(), sessionId, 'state')));
      await assertFails(getDoc(publicRef(dbStudentA(), sessionId, 'stats')));
    }
  });

  it('teacher owner writes exact state/stats; student, TV and other teacher cannot → ALLOW/DENY', async () => {
    await assertSucceeds(setDoc(publicRef(dbTeacherA(), SESSION_A, 'state'), publicStateData()));
    await assertSucceeds(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData()));
    await assertFails(setDoc(publicRef(dbStudentA(), SESSION_A, 'state'), publicStateData()));
    await assertFails(setDoc(publicRef(dbTv(), SESSION_A, 'stats'), publicStatsData()));
    await assertFails(setDoc(publicRef(dbTeacherB(), SESSION_A, 'state'), publicStateData()));
  });

  it('extra public PII fields are denied → DENY', async () => {
    await assertFails(setDoc(publicRef(dbTeacherA(), SESSION_A, 'state'), publicStateData({ teacherCue: 'secret' })));
    await assertFails(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({ participantUid: STUDENT_A })));
    await assertFails(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({ rawResponse: 'secret' })));
  });

  it('public count maps reject unknown keys and negative counts → DENY', async () => {
    await assertFails(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { PII: 1 },
    })));
    await assertFails(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      routeCounts: { M: 1, S: 0, C: 0, X: 1 },
    })));
    await assertFails(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      errorCategoryCounts: { Conceptual: 1, PII: 1 },
    })));
  });
});
