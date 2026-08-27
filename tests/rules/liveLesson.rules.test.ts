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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const TEACHER_A = 'teacher-A';
const TEACHER_B = 'teacher-B';
const STUDENT_A = 'student-A';
const STUDENT_B = 'student-B';
const CLASS_A = 'class-A';
const CLASS_B = 'class-B';
const SESSION_A = 'session-A';
const SESSION_THINK = 'session-think';
const SESSION_CLOSED = 'session-closed';
const SESSION_EXPIRED = 'session-expired';
const SESSION_DISABLED = 'session-disabled';
const ALL_CHOICE_KEYS = [
  'A', 'B', 'C', 'D', 'G1', 'G2', 'G3', 'Yes', 'No', 'Unsure',
  'true', 'false',
] as const;
const PILOT_ALLOWED_STEP_IDS = [
  'warmup', 'notice-wonder', 'goals', 'route', 'model',
  'ai-think-w01', 'ai-error-w01', 'quick-check', 'exit-ticket',
] as const;

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

const assertRuleDenied = async (operation: Promise<unknown>) => {
  try {
    await operation;
    throw new Error('Expected operation to be denied by Firestore Rules');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    expect(message).not.toContain('maximum of 1000 expressions');
    expect((error as { code?: string }).code).toBe('permission-denied');
  }
};

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

  it('owner can create the canonical G10 P31 pilot session with all 9 response steps → ALLOW', async () => {
    await assertSucceeds(setDoc(sessionRef(dbTeacherA(), 'session-g10-p31-pilot'), sessionData('session-g10-p31-pilot', {
      lessonId: 'tds-g10-30-pilot',
      title: 'Bất phương trình bậc nhất hai ẩn — Tiết 1',
      allowedStepIds: [...PILOT_ALLOWED_STEP_IDS],
      currentCueId: 'P00',
      currentTvScreenId: 'TV0',
    })));
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

  it('requires the THINK response before the student can write the AI Error response → DENY/ALLOW', async () => {
    await assertSucceeds(setDoc(sessionRef(dbTeacherA(), SESSION_THINK), sessionData(SESSION_THINK, {
      allowedStepIds: [...PILOT_ALLOWED_STEP_IDS],
    })));

    await assertFails(setDoc(responseRef(dbStudentA(), SESSION_THINK, `${STUDENT_A}__ai-error-w01`), responseData({
      stepId: 'ai-error-w01', value: 'Logical',
    })));
    await assertSucceeds(setDoc(responseRef(dbStudentA(), SESSION_THINK, `${STUDENT_A}__ai-think-w01`), responseData({
      stepId: 'ai-think-w01', value: 'Unsure',
    })));
    await assertSucceeds(setDoc(responseRef(dbStudentA(), SESSION_THINK, `${STUDENT_A}__ai-error-w01`), responseData({
      stepId: 'ai-error-w01', value: 'Logical',
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

  it('unauthenticated TV can keep a stats listener open before the first aggregate exists → ALLOW', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await deleteDoc(publicRef(ctx.firestore(), SESSION_A, 'stats'));
    });
    await assertSucceeds(getDoc(publicRef(dbTv(), SESSION_A, 'stats')));
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

  it('owner can write the full allowlisted choice-count map → ALLOW', async () => {
    const fullChoiceCounts = Object.fromEntries(
      ALL_CHOICE_KEYS.map((key, index) => [key, index]),
    );

    await assertSucceeds(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: fullChoiceCounts,
    })));
  });

  it('public aggregate counts reject fractional high-level values → DENY', async () => {
    for (const field of ['participantCount', 'submittedCount', 'hintUseCount']) {
      await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
        [field]: 1.5,
      })));
    }
  });

  it('public count maps reject fractional choice, route and error values → DENY', async () => {
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { A: 1.5 },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      routeCounts: { M: 1.5 },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      errorCategoryCounts: { Conceptual: 1.5 },
    })));
  });

  it('public count maps reject unknown keys and negative counts → DENY', async () => {
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { A: -1 },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { PII: 1 },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { A: Number.NaN },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { A: Number.POSITIVE_INFINITY },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { A: Number.NEGATIVE_INFINITY },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { A: 10001 },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      choiceCounts: { A: '1' },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      routeCounts: { M: -1 },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      routeCounts: { M: 1, S: 0, C: 0, X: 1 },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      errorCategoryCounts: { Conceptual: -1 },
    })));
    await assertRuleDenied(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), publicStatsData({
      errorCategoryCounts: { Conceptual: 1, PII: 1 },
    })));
  });

  it('full stats map with all allowed choice keys and valid route/error maps does NOT cause evaluation error → ALLOW', async () => {
    const fullChoiceCounts: Record<string, number> = {};
    for (const key of ALL_CHOICE_KEYS) fullChoiceCounts[key] = 1;
    const fullStatsData = {
      stepId: 'model',
      participantCount: 30,
      submittedCount: 28,
      choiceCounts: fullChoiceCounts,
      routeCounts: { M: 10, S: 8, C: 10 },
      errorCategoryCounts: { Conceptual: 7, Algebraic: 6, Logical: 8, 'Missing condition': 7 },
      hintUseCount: 4,
      updatedAt: serverTimestamp(),
    };
    await assertSucceeds(setDoc(publicRef(dbTeacherA(), SESSION_A, 'stats'), fullStatsData));
  });
});

// ────────────────────────────────────────────────────────────────────
// V4: evidence / groupProposals / groups subcollections
// ────────────────────────────────────────────────────────────────────

const evidenceRef = (db: ReturnType<typeof dbTeacherA>, id = SESSION_A, evidenceId = `${STUDENT_A}__warmup`) => (
  doc(db, `liveLessonSessions/${id}/evidence/${evidenceId}`)
);

const proposalRef = (db: ReturnType<typeof dbTeacherA>, id = SESSION_A) => (
  doc(db, `liveLessonSessions/${id}/groupProposals/current`)
);

const groupRef = (db: ReturnType<typeof dbTeacherA>, id = SESSION_A, groupId = 'group-1') => (
  doc(db, `liveLessonSessions/${id}/groups/${groupId}`)
);

const evidenceData = (overrides: Record<string, unknown> = {}) => ({
  studentId: STUDENT_A,
  stepId: 'warmup',
  confidence: 0.8,
  signal: 'choice_correct',
  privateReason: 'Identified boundary concept',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

const proposalData = (overrides: Record<string, unknown> = {}) => ({
  proposals: [
    {
      groupId: 'group-1',
      purpose: 'same_need_workshop',
      memberIds: [STUDENT_A, STUDENT_B],
      scaffold: 'Scaffold card for boundary concept',
      reason: 'Both students showed emerging evidence',
      checkpointId: 'cp-1',
    },
  ],
  updatedAt: serverTimestamp(),
  ...overrides,
});

const groupData = (overrides: Record<string, unknown> = {}) => ({
  groupId: 'group-1',
  memberIds: [STUDENT_A, STUDENT_B],
  scaffold: 'Same_need_workshop scaffold',
  startedAt: Date.now(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

describe('V4 · evidence · teacher-only private data', () => {
  it('session teacher can read and write evidence → ALLOW', async () => {
    await assertSucceeds(setDoc(evidenceRef(dbTeacherA()), evidenceData()));
    await assertSucceeds(getDoc(evidenceRef(dbTeacherA())));
  });

  it('other teacher cannot read or write evidence → DENY', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(evidenceRef(ctx.firestore()), evidenceData());
    });
    await assertFails(getDoc(evidenceRef(dbTeacherB())));
    await assertFails(setDoc(evidenceRef(dbTeacherB()), evidenceData()));
  });

  it('student cannot read or write evidence → DENY', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(evidenceRef(ctx.firestore()), evidenceData());
    });
    await assertFails(getDoc(evidenceRef(dbStudentA())));
    await assertFails(setDoc(evidenceRef(dbStudentA()), evidenceData()));
  });

  it('TV (unauthenticated) cannot read evidence → DENY', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(evidenceRef(ctx.firestore()), evidenceData());
    });
    await assertFails(getDoc(evidenceRef(dbTv())));
  });

  it('evidence with extra fields is denied → DENY', async () => {
    await assertFails(setDoc(evidenceRef(dbTeacherA()), evidenceData({ leakedField: 'secret' })));
  });
});

describe('V4 · groupProposals · teacher-only private data', () => {
  it('session teacher can read and write groupProposals → ALLOW', async () => {
    await assertSucceeds(setDoc(proposalRef(dbTeacherA()), proposalData()));
    await assertSucceeds(getDoc(proposalRef(dbTeacherA())));
  });

  it('student cannot read groupProposals → DENY', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(proposalRef(ctx.firestore()), proposalData());
    });
    await assertFails(getDoc(proposalRef(dbStudentA())));
  });

  it('other teacher cannot write groupProposals → DENY', async () => {
    await assertFails(setDoc(proposalRef(dbTeacherB()), proposalData()));
  });

  it('TV (unauthenticated) cannot read groupProposals → DENY', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(proposalRef(ctx.firestore()), proposalData());
    });
    await assertFails(getDoc(proposalRef(dbTv())));
  });
});

describe('V4 · groups · teacher writes, assigned student reads', () => {
  it('session teacher can read and write groups → ALLOW', async () => {
    await assertSucceeds(setDoc(groupRef(dbTeacherA()), groupData()));
    await assertSucceeds(getDoc(groupRef(dbTeacherA())));
  });

  it('unassigned student cannot read group → DENY', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(groupRef(ctx.firestore()), groupData());
    });
    await assertFails(getDoc(groupRef(dbStudentA())));
  });

  it('assigned student can read their own group subcollection → ALLOW', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      const groupPath = `liveLessonSessions/${SESSION_A}/groups/group-1`;
      await setDoc(doc(db, groupPath), groupData());
      // Write student assignment with realistic payload (no peer data)
      await setDoc(doc(db, `${groupPath}/students/${STUDENT_A}`), {
        groupId: 'group-1',
        scaffold: 'Same_need_workshop scaffold',
        startedAt: Date.now(),
      });
    });
    const assignedStudentRef = doc(dbStudentA(), `liveLessonSessions/${SESSION_A}/groups/group-1/students/${STUDENT_A}`);
    await assertSucceeds(getDoc(assignedStudentRef));
  });

  it('other student cannot read assigned student group subcollection → DENY', async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const db = ctx.firestore();
      const groupPath = `liveLessonSessions/${SESSION_A}/groups/group-1`;
      await setDoc(doc(db, groupPath), groupData());
      await setDoc(doc(db, `${groupPath}/students/${STUDENT_A}`), {
        groupId: 'group-1',
        scaffold: 'Same_need_workshop scaffold',
        startedAt: Date.now(),
      });
    });
    const otherStudentRef = doc(dbStudentB(), `liveLessonSessions/${SESSION_A}/groups/group-1/students/${STUDENT_A}`);
    await assertFails(getDoc(otherStudentRef));
  });

  it('student cannot write to groups → DENY', async () => {
    await assertFails(setDoc(groupRef(dbStudentA()), groupData()));
  });

  it('groups with extra fields are denied → DENY', async () => {
    await assertFails(setDoc(groupRef(dbTeacherA()), groupData({ privateReason: 'secret' })));
  });
});

describe('V4 · closed/expired session blocks V4 writes', () => {
  it('teacher cannot write evidence in closed session → DENY', async () => {
    await assertFails(setDoc(evidenceRef(dbTeacherA(), SESSION_CLOSED), evidenceData()));
  });

  it('teacher cannot write groupProposals in expired session → DENY', async () => {
    await assertFails(setDoc(proposalRef(dbTeacherA(), SESSION_EXPIRED), proposalData()));
  });

  it('teacher CAN write groups in active session with disabled public state → ALLOW', async () => {
    // SESSION_DISABLED has publicStateEnabled:false but status=running and expires in future
    // Private teacher data (groups/evidence) is not affected by public projection flags
    await assertSucceeds(setDoc(groupRef(dbTeacherA(), SESSION_DISABLED), groupData()));
  });
});
