import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mergeProfileWithExisting } from '../adaptive-progress-profile';

const adminFakes = vi.hoisted(() => {
  const docs = new Map<string, any>();
  const writes: Array<{ path: string; value: any }> = [];
  const verifyIdToken = vi.fn();
  const ref = (path: string): any => ({
    id: path.split('/').at(-1),
    path,
    collection: (name: string) => ref(`${path}/${name}`),
    doc: (id: string) => ref(`${path}/${id}`),
    get: vi.fn(async () => {
      if (path.endsWith('/responses')) {
        return {
          docs: [...docs.entries()]
            .filter(([docPath]) => docPath.startsWith(`${path}/`))
            .map(([docPath, value]) => ({ id: docPath.split('/').at(-1), data: () => value })),
        };
      }
      const value = docs.get(path);
      return { exists: value !== undefined, data: () => value, id: path.split('/').at(-1), ref: ref(path) };
    }),
  });
  const db = {
    collection: (name: string) => ref(name),
    runTransaction: vi.fn(async (callback: (transaction: any) => Promise<void>) => callback({
      get: async (target: any) => {
        const value = docs.get(target.path);
        return { exists: value !== undefined, data: () => value };
      },
      set: (target: any, value: any, options?: { merge?: boolean }) => {
        const next = options?.merge ? { ...(docs.get(target.path) || {}), ...value } : value;
        docs.set(target.path, next);
        writes.push({ path: target.path, value: next });
      },
    })),
  };
  return { docs, writes, verifyIdToken, db };
});

vi.mock('firebase-admin/app', () => ({
  cert: vi.fn(),
  getApps: () => [{}],
  initializeApp: vi.fn(),
}));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: adminFakes.verifyIdToken }) }));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => ({ __type: 'serverTimestamp' })) },
  getFirestore: () => adminFakes.db,
}));

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPilotLiveLessonDefinition } from '../../src/lib/liveLesson/definition';
import handler from '../adaptive-progress';

const makeIncomingProfile = (suffix: string, averageMastery = 0.8) => ({
  id: 'student-1',
  teacherId: 'teacher-1',
  studentId: 'student-1',
  studentCode: 'S1',
  studentName: 'Student 1',
  studentClass: '11A1',
  totalSessions: 1,
  averageMastery,
  routeHistory: [`core-${suffix}`],
  objectiveMemory: [
    {
      objectiveId: 'obj-ap',
      status: 'mastered',
      attempts: 1,
      lastScore: averageMastery,
      lastUpdatedAt: `2026-05-18T13:0${suffix}:00.000Z`,
    },
  ],
  misconceptionCounts: { 'common-difference': 1 },
  createdAt: '2026-05-18T13:00:00.000Z',
  updatedAt: `2026-05-18T13:0${suffix}:00.000Z`,
});

const makeProgressRecord = (route = 'core', masteryEstimate = 0.8) => ({
  id: `progress-${route}`,
  teacherId: 'teacher-1',
  lessonId: 'lesson-1',
  studentId: 'student-1',
  studentCode: 'S1',
  studentName: 'Student 1',
  route,
  diagnosticAttempt: {
    objectiveScores: [{ objectiveId: 'obj-ap', masteryEstimate }],
  },
  quickCheckAttempts: [],
});

describe('adaptive-progress profile merge', () => {
  it('keeps a new incoming profile unchanged when no existing profile exists', () => {
    const incomingProfile = makeIncomingProfile('1', 0.75);
    const merged = mergeProfileWithExisting({
      existingProfile: null,
      incomingProfile,
      progressRecord: makeProgressRecord('core', 0.75),
    });

    expect(merged).toEqual(incomingProfile);
  });

  it('increments totalSessions for the second saved session', () => {
    const existingProfile = {
      ...makeIncomingProfile('1', 0.7),
      totalSessions: 1,
      averageMastery: 0.7,
      routeHistory: ['core-1'],
    };
    const incomingProfile = makeIncomingProfile('2', 0.9);

    const merged = mergeProfileWithExisting({
      existingProfile,
      incomingProfile,
      progressRecord: makeProgressRecord('extension', 0.9),
    });

    expect(merged.totalSessions).toBe(2);
    expect(merged.averageMastery).toBe(0.8);
    expect(merged.routeHistory).toEqual(['core-1', 'core-2']);
  });

  it('accumulates misconception counts and objective attempts across sessions', () => {
    const existingProfile = {
      ...makeIncomingProfile('1', 0.6),
      totalSessions: 3,
      averageMastery: 0.6,
      objectiveMemory: [{ objectiveId: 'obj-ap', attempts: 3, status: 'developing' }],
      misconceptionCounts: { 'common-difference': 2, 'sum-vs-term': 1 },
    };
    const incomingProfile = {
      ...makeIncomingProfile('2', 0.9),
      misconceptionCounts: { 'common-difference': 1, 'formula-selection': 2 },
    };

    const merged = mergeProfileWithExisting({
      existingProfile,
      incomingProfile,
      progressRecord: makeProgressRecord('core', 0.9),
    });

    expect(merged.totalSessions).toBe(4);
    expect(merged.objectiveMemory[0].attempts).toBe(4);
    expect(merged.misconceptionCounts).toEqual({
      'common-difference': 3,
      'sum-vs-term': 1,
      'formula-selection': 2,
    });
  });

  it('demonstrates two sequential transaction-style merges preserve totalSessions === 2', () => {
    const first = mergeProfileWithExisting({
      existingProfile: null,
      incomingProfile: makeIncomingProfile('1', 0.7),
      progressRecord: makeProgressRecord('core', 0.7),
    });

    const second = mergeProfileWithExisting({
      existingProfile: first,
      incomingProfile: makeIncomingProfile('2', 0.9),
      progressRecord: makeProgressRecord('extension', 0.9),
    });

    expect(second.totalSessions).toBe(2);
    expect(second.averageMastery).toBe(0.8);
    expect(second.misconceptionCounts['common-difference']).toBe(2);
  });

  it('keeps profile reads inside the Firestore transaction to prevent lost updates', () => {
    const source = readFileSync(resolve(process.cwd(), 'api/adaptive-progress.ts'), 'utf8');
    const transactionBlock = source.match(/await db\.runTransaction\(async transaction => \{[\s\S]*?\n    \}\);/)?.[0] || '';
    const beforeTransaction = source.split('await db.runTransaction(async transaction => {')[0];

    expect(transactionBlock).toContain('const existingProfileSnapshot = await transaction.get(profileRef);');
    expect(beforeTransaction).not.toContain('profileRef.get(');
  });

  it('does not erase existing objective evidence when a live lesson adds no mastery scores', () => {
    const existingProfile = makeIncomingProfile('1', 0.7);
    const merged = mergeProfileWithExisting({
      existingProfile,
      incomingProfile: { ...existingProfile, objectiveMemory: [], misconceptionCounts: {}, routeHistory: ['standard'] },
      progressRecord: makeProgressRecord('standard', 0),
    });

    expect(merged.objectiveMemory).toEqual(existingProfile.objectiveMemory);
    expect(merged.misconceptionCounts).toEqual(existingProfile.misconceptionCounts);
  });
});

const makeResponse = (): { response: VercelResponse; state: { statusCode: number; body?: unknown } } => {
  const state: { statusCode: number; body?: unknown } = { statusCode: 200 };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(body: unknown) { state.body = body; return response; },
  } as unknown as VercelResponse;
  return { response, state };
};

const makeRequest = (body: unknown): VercelRequest => ({ method: 'POST', body } as VercelRequest);

const seedLiveLesson = (withMapping = true, withProfile = true) => {
  const definition = getPilotLiveLessonDefinition();
  adminFakes.docs.clear();
  adminFakes.writes.length = 0;
  adminFakes.verifyIdToken.mockResolvedValue({ uid: 'teacher-1' });
  adminFakes.docs.set('liveLessonSessions/session-1', {
    schemaVersion: 1,
    lessonId: definition.lessonId,
    title: definition.title,
    classId: 'class-1',
    teacherUid: 'teacher-1',
    allowedStepIds: [...definition.allowedStepIds],
    expiresAt: 9_000,
    status: 'closed',
    currentCueId: 'P40',
    currentTvScreenId: 'S10',
    publicStateEnabled: false,
    publicStatsEnabled: false,
    createdAt: 1_000,
    updatedAt: 2_000,
  });
  adminFakes.docs.set('classes/class-1', { teacherId: 'teacher-1', name: '10A1' });
  adminFakes.docs.set(`adaptiveLessons/teacher-1`, { portalEnabled: true, lesson: { id: definition.lessonId, title: definition.title, status: 'published' } });
  adminFakes.docs.set('liveLessonSessions/session-1/responses/anon-1__ai-error-w01', {
    participantUid: 'anon-1', classId: 'class-1', stepId: 'ai-error-w01', responseType: 'choice', value: 'Conceptual', clientNonce: 'a', submittedAt: 1_100, updatedAt: 1_100,
  });
  adminFakes.docs.set('liveLessonSessions/session-1/responses/anon-1__quick-check', {
    participantUid: 'anon-1', classId: 'class-1', stepId: 'quick-check', responseType: 'choice', value: 'B', clientNonce: 'b', submittedAt: 1_200, updatedAt: 1_200,
  });
  adminFakes.docs.set('liveLessonSessions/session-1/responses/anon-1__route', {
    participantUid: 'anon-1', classId: 'class-1', stepId: 'route', responseType: 'route', value: 'S', clientNonce: 'r', submittedAt: 1_250, updatedAt: 1_250,
  });
  adminFakes.docs.set('liveLessonSessions/session-1/responses/anon-1__exit-ticket', {
    participantUid: 'anon-1', classId: 'class-1', stepId: 'exit-ticket', responseType: 'text', value: 'x > 2', clientNonce: 'c', submittedAt: 1_300, updatedAt: 1_300,
  });
  if (withMapping) {
    adminFakes.docs.set('studentLinks/anon-1', { uid: 'anon-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1' });
    adminFakes.docs.set('classes/class-1/students/student-1', { code: 'NGUYEN-A', name: 'Nguyễn A', classId: 'class-1', teacherId: 'teacher-1' });
    if (withProfile) adminFakes.docs.set('studentLearningProfiles/teacher-1_NGUYEN-A', {
      id: 'teacher-1_NGUYEN-A', teacherId: 'teacher-1', studentId: 'teacher-1_NGUYEN-A', studentCode: 'NGUYEN-A', studentName: 'Nguyễn A',
      totalSessions: 1, averageMastery: 0.4, routeHistory: ['standard'], objectiveMemory: [], misconceptionCounts: {},
      lastLessonId: definition.lessonId, lastActiveAt: '2026-08-25T15:00:00.000Z', createdAt: '2026-08-25T15:00:00.000Z', updatedAt: '2026-08-25T15:00:00.000Z',
    });
  }
  return definition;
};

describe('adaptive-progress live lesson close action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminFakes.docs.clear();
    adminFakes.writes.length = 0;
  });

  it('rejects a missing or non-owner teacher token before writing', async () => {
    const definition = seedLiveLesson();
    adminFakes.verifyIdToken.mockRejectedValueOnce(new Error('invalid'));
    const missing = makeResponse();
    await handler(makeRequest({ action: 'saveLiveLessonProgress', sessionId: 'session-1', definition, idToken: 'bad' }), missing.response);
    expect(missing.state.statusCode).toBe(401);

    seedLiveLesson();
    adminFakes.verifyIdToken.mockResolvedValueOnce({ uid: 'teacher-2' });
    const wrongOwner = makeResponse();
    await handler(makeRequest({ action: 'saveLiveLessonProgress', sessionId: 'session-1', definition, idToken: 'other' }), wrongOwner.response);
    expect(wrongOwner.state.statusCode).toBe(403);
    expect(adminFakes.writes).toHaveLength(0);
  });

  it('verifies studentLinks and roster, then saves a ready record without returning raw responses', async () => {
    const definition = seedLiveLesson();
    const first = makeResponse();
    await handler(makeRequest({ action: 'saveLiveLessonProgress', sessionId: 'session-1', definition, idToken: 'teacher-token' }), first.response);

    expect(first.state.statusCode).toBe(200);
    expect(first.state.body).toEqual({ ok: true, eligible: 1, saved: 1, failed: 0, incomplete: 0 });
    expect(JSON.stringify(first.state.body)).not.toContain('x > 2');
    expect(adminFakes.docs.has('adaptiveSessionProgress/teacher-1_' + definition.lessonId + '_NGUYEN-A')).toBe(true);

    const second = makeResponse();
    await handler(makeRequest({ action: 'saveLiveLessonProgress', sessionId: 'session-1', definition, idToken: 'teacher-token' }), second.response);
    expect(second.state.body).toEqual({ ok: true, eligible: 1, saved: 1, failed: 0, incomplete: 0 });
    expect(adminFakes.writes.filter(write => write.path.startsWith('studentLearningProfiles/'))).toHaveLength(1);
  });

  it('accepts the canonical lesson document stored under lessonId', async () => {
    const definition = seedLiveLesson();
    adminFakes.docs.delete('adaptiveLessons/teacher-1');
    adminFakes.docs.set(`adaptiveLessons/${definition.lessonId}`, {
      id: definition.lessonId,
      teacherId: 'teacher-1',
      title: definition.title,
      status: 'published',
      portalEnabled: true,
    });

    const result = makeResponse();
    await handler(makeRequest({ action: 'saveLiveLessonProgress', sessionId: 'session-1', definition, idToken: 'teacher-token' }), result.response);

    expect(result.state.statusCode).toBe(200);
    expect(result.state.body).toEqual({ ok: true, eligible: 1, saved: 1, failed: 0, incomplete: 0 });
  });

  it('fails closed with incomplete when server mapping is absent', async () => {
    const definition = seedLiveLesson(false);
    const result = makeResponse();
    await handler(makeRequest({ action: 'saveLiveLessonProgress', sessionId: 'session-1', definition, idToken: 'teacher-token' }), result.response);

    expect(result.state.statusCode).toBe(200);
    expect(result.state.body).toEqual({ ok: true, eligible: 0, saved: 0, failed: 0, incomplete: 1 });
    expect([...adminFakes.docs.keys()].some(path => path.startsWith('adaptiveSessionProgress/'))).toBe(false);
  });

  it('fails closed when the server has no trusted adaptive route', async () => {
    const definition = seedLiveLesson();
    adminFakes.docs.delete('liveLessonSessions/session-1/responses/anon-1__route');
    adminFakes.docs.set('studentLearningProfiles/teacher-1_NGUYEN-A', {
      id: 'teacher-1_NGUYEN-A', teacherId: 'teacher-1', studentId: 'teacher-1_NGUYEN-A', studentCode: 'NGUYEN-A', studentName: 'Nguyễn A',
      totalSessions: 1, averageMastery: 0, routeHistory: [], objectiveMemory: [], misconceptionCounts: {},
      lastLessonId: definition.lessonId, lastActiveAt: '2026-08-25T15:00:00.000Z', createdAt: '2026-08-25T15:00:00.000Z', updatedAt: '2026-08-25T15:00:00.000Z',
    });
    const result = makeResponse();
    await handler(makeRequest({ action: 'saveLiveLessonProgress', sessionId: 'session-1', definition, idToken: 'teacher-token' }), result.response);

    expect(result.state.body).toEqual({ ok: true, eligible: 0, saved: 0, failed: 0, incomplete: 1 });
  });

  it('uses a server-confirmed route response when no prior adaptive profile exists', async () => {
    const definition = seedLiveLesson(true, false);
    const result = makeResponse();
    await handler(makeRequest({ action: 'saveLiveLessonProgress', sessionId: 'session-1', definition, idToken: 'teacher-token' }), result.response);

    expect(result.state.body).toEqual({ ok: true, eligible: 1, saved: 1, failed: 0, incomplete: 0 });
    expect(adminFakes.docs.has(`adaptiveSessionProgress/teacher-1_${definition.lessonId}_NGUYEN-A`)).toBe(true);
  });
});
