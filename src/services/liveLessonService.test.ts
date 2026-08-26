import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => {
  let autoId = 0;
  const db = { name: 'test-db' };
  const serverTimestamp = vi.fn(() => ({ __type: 'serverTimestamp' }));
  const Timestamp = {
    now: vi.fn(() => ({ toMillis: () => 1000 })),
    fromMillis: vi.fn((millis: number) => ({ toMillis: () => millis })),
  };
  const collection = vi.fn((_: unknown, ...segments: string[]) => ({
    kind: 'collection',
    path: segments.join('/'),
  }));
  const doc = vi.fn((parent: { path: string; kind?: string }, ...segments: string[]) => {
    if (segments.length === 0 && parent.kind === 'collection') {
      autoId += 1;
      return { kind: 'doc', id: `auto-${autoId}`, path: `${parent.path}/auto-${autoId}` };
    }
    const id = segments[segments.length - 1];
    return { kind: 'doc', id, path: [parent.path, ...segments].join('/') };
  });
  return {
    db,
    collection,
    doc,
    getDoc: vi.fn(),
    getDocFromServer: vi.fn(),
    getDocs: vi.fn(),
    onSnapshot: vi.fn(),
    query: vi.fn((target, ...constraints) => ({ kind: 'query', target, constraints })),
    serverTimestamp,
    Timestamp,
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    where: vi.fn((field, operator, value) => ({ field, operator, value })),
  };
});

vi.mock('firebase/firestore', () => ({
  collection: firestoreMocks.collection,
  doc: firestoreMocks.doc,
  getDoc: firestoreMocks.getDoc,
  getDocFromServer: firestoreMocks.getDocFromServer,
  getDocs: firestoreMocks.getDocs,
  onSnapshot: firestoreMocks.onSnapshot,
  query: firestoreMocks.query,
  serverTimestamp: firestoreMocks.serverTimestamp,
  setDoc: firestoreMocks.setDoc,
  Timestamp: firestoreMocks.Timestamp,
  updateDoc: firestoreMocks.updateDoc,
  where: firestoreMocks.where,
}));

vi.mock('../lib/firebase', () => ({ db: firestoreMocks.db }));

import { getPilotLiveLessonDefinition } from '../lib/liveLesson/definition';
import { toPublicStats } from '../lib/liveLesson/aggregate';
import {
  closeLiveLessonSession,
  createLiveLessonSession,
  getLiveLessonSession,
  publishLivePublicStats,
  submitLiveResponse,
  subscribeToLivePublicState,
  subscribeToLivePublicStats,
  subscribeToTeacherSession,
  subscribeToTeacherResponses,
  updateLiveLessonState,
} from './liveLessonService';
import { listTeacherClasses } from '../lib/classroom/classroomService';
import {
  clearStudentLoginSession,
  getStudentLoginSession,
  saveStudentLoginSession,
  type LoginResponse,
} from './studentPortalApi';

class FakeTimestamp {
  constructor(private readonly millis: number) {}

  toMillis(): number {
    return this.millis;
  }
}

const responseData = (overrides: Record<string, unknown> = {}) => ({
  participantUid: 'student-1',
  classId: 'class-1',
  stepId: 'warmup',
  responseType: 'choice',
  value: 'A',
  clientNonce: 'nonce-1',
  submittedAt: new FakeTimestamp(1000),
  updatedAt: 2000,
  ...overrides,
});

const sessionData = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  lessonId: 'lesson-1',
  title: 'Lesson',
  classId: 'class-1',
  teacherUid: 'teacher-1',
  allowedStepIds: ['warmup'],
  expiresAt: new FakeTimestamp(9000),
  status: 'lobby',
  currentCueId: 'P00',
  currentTvScreenId: 'S0',
  publicStateEnabled: true,
  publicStatsEnabled: true,
  createdAt: new FakeTimestamp(1000),
  updatedAt: 1000,
  ...overrides,
});

const login: LoginResponse = {
  studentId: 'student-1',
  classId: 'class-1',
  teacherId: 'teacher-1',
  className: '10A1',
  studentName: 'An',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('liveLessonService Firestore boundary', () => {
  it('creates an auto-id session with metadata, allowed steps, lobby state, and timestamps', async () => {
    const definition = getPilotLiveLessonDefinition();
    firestoreMocks.getDoc.mockResolvedValue({
      id: 'auto-1',
      exists: () => true,
      data: () => sessionData({
        lessonId: definition.lessonId,
        title: definition.title,
        allowedStepIds: [...definition.allowedStepIds],
        currentCueId: definition.cues[0].id,
        currentTvScreenId: definition.cues[0].tvScreenId,
        publicStatsEnabled: false,
      }),
    });

    const result = await createLiveLessonSession({ definition, teacherUid: 'teacher-1', classId: 'class-1' });
    const payload = firestoreMocks.setDoc.mock.calls[0][1] as Record<string, unknown>;
    const publicStatePayload = firestoreMocks.setDoc.mock.calls[1][1] as Record<string, unknown>;

    expect(firestoreMocks.doc).toHaveBeenCalledWith(expect.objectContaining({ path: 'liveLessonSessions' }));
    expect(Object.keys(payload).sort()).toEqual([
      'allowedStepIds', 'classId', 'createdAt', 'currentCueId', 'currentTvScreenId', 'expiresAt',
      'lessonId', 'publicStateEnabled', 'publicStatsEnabled', 'schemaVersion', 'status', 'teacherUid',
      'title', 'updatedAt',
    ].sort());
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('mode');
    expect(payload.schemaVersion).toBe(1);
    expect(payload.allowedStepIds).toEqual(definition.allowedStepIds);
    expect(payload.status).toBe('lobby');
    expect(payload.publicStatsEnabled).toBe(false);
    expect(payload.currentCueId).toBe(definition.cues[0].id);
    expect(payload.currentTvScreenId).toBe(definition.cues[0].tvScreenId);
    expect(publicStatePayload).toEqual({
      cueId: definition.cues[0].id,
      tvScreenId: definition.cues[0].tvScreenId,
      status: 'lobby',
      showStats: false,
      updatedAt: { __type: 'serverTimestamp' },
    });
    expect(result.createdAt).toBe(1000);
    expect(result.expiresAt).toBe(9000);
  });

  it('gets and maps Firestore timestamps while returning null for an absent session', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({ exists: () => true, id: 'session-1', data: () => sessionData() });
    await expect(getLiveLessonSession('session-1')).resolves.toMatchObject({
      id: 'session-1',
      createdAt: 1000,
      updatedAt: 1000,
      expiresAt: 9000,
    });

    firestoreMocks.getDoc.mockResolvedValueOnce({ exists: () => false, id: 'missing', data: () => undefined });
    await expect(getLiveLessonSession('missing')).resolves.toBeNull();

    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'bad-version',
      data: () => sessionData({ schemaVersion: 2 }),
    });
    await expect(getLiveLessonSession('bad-version')).rejects.toThrow(/schemaVersion/i);
  });

  it('writes only a validated session patch and closes public flags', async () => {
    firestoreMocks.getDocFromServer
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'session-1',
        data: () => sessionData({ status: 'running', currentCueId: 'P01', currentTvScreenId: 'S1', publicStatsEnabled: true }),
      })
      .mockResolvedValueOnce({
        exists: () => true,
        id: 'session-1',
        data: () => sessionData({ status: 'closed', currentCueId: 'P01', currentTvScreenId: 'S1', publicStatsEnabled: false }),
      });
    await updateLiveLessonState('session-1', { status: 'running', currentCueId: 'P01', currentTvScreenId: 'S1' });
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/liveLessonSessions/session-1' }),
      { status: 'running', currentCueId: 'P01', currentTvScreenId: 'S1', updatedAt: { __type: 'serverTimestamp' } },
    );
    expect(firestoreMocks.setDoc).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      {
        cueId: 'P01',
        tvScreenId: 'S1',
        status: 'running',
        showStats: true,
        updatedAt: { __type: 'serverTimestamp' },
      },
    );

    await closeLiveLessonSession('session-1');
    expect(firestoreMocks.updateDoc).toHaveBeenLastCalledWith(
      expect.objectContaining({ path: '/liveLessonSessions/session-1' }),
      { status: 'closed', publicStateEnabled: false, publicStatsEnabled: false, updatedAt: { __type: 'serverTimestamp' } },
    );
    expect(firestoreMocks.setDoc).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      {
        cueId: 'P01',
        tvScreenId: 'S1',
        status: 'closed',
        showStats: false,
        updatedAt: { __type: 'serverTimestamp' },
      },
    );
    await expect(updateLiveLessonState('session-1', { unknown: 'field' } as never)).rejects.toThrow(/unknown/i);
    await expect(updateLiveLessonState('session-1', { status: undefined })).rejects.toThrow(/undefined/i);
  });

  it('reads the server-acknowledged timestamp after a state patch', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'session-1',
      data: () => sessionData({ updatedAt: null, publicStatsEnabled: false }),
    });
    firestoreMocks.getDocFromServer.mockResolvedValueOnce({
      exists: () => true,
      id: 'session-1',
      data: () => sessionData({ updatedAt: 3000, publicStatsEnabled: true }),
    });

    await expect(updateLiveLessonState('session-1', { publicStatsEnabled: true })).resolves.toMatchObject({
      updatedAt: 3000,
      publicStatsEnabled: true,
    });
    expect(firestoreMocks.getDocFromServer).toHaveBeenCalledTimes(1);
  });

  it('creates a deterministic response after the merge-update probe and writes no client timestamp or PIN', async () => {
    firestoreMocks.setDoc.mockRejectedValueOnce(Object.assign(new Error('missing response document'), { code: 'permission-denied' }));
    await submitLiveResponse({
      sessionId: 'session-1',
      participantUid: 'student-1',
      classId: 'class-1',
      stepId: 'warmup',
      responseType: 'choice',
      value: 'A',
      clientNonce: 'nonce-1',
    });
    const updateProbe = firestoreMocks.setDoc.mock.calls[0][1] as Record<string, unknown>;
    const payload = firestoreMocks.setDoc.mock.calls[1][1] as Record<string, unknown>;

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      firestoreMocks.db,
      'liveLessonSessions',
      'session-1',
      'responses',
      'student-1__warmup',
    );
    expect(updateProbe).toEqual({
      responseType: 'choice', value: 'A', clientNonce: 'nonce-1', updatedAt: { __type: 'serverTimestamp' },
    });
    expect(firestoreMocks.setDoc.mock.calls[0][2]).toEqual({ merge: true });
    expect(Object.keys(payload).sort()).toEqual([
      'classId', 'clientNonce', 'participantUid', 'responseType', 'stepId', 'submittedAt', 'updatedAt', 'value',
    ].sort());
    expect(JSON.stringify(payload)).not.toContain('pin');
    expect(payload.submittedAt).toEqual({ __type: 'serverTimestamp' });
    expect(payload.updatedAt).toEqual({ __type: 'serverTimestamp' });
  });

  it('updates an existing response without replacing its original submittedAt or clientNonce', async () => {
    firestoreMocks.setDoc.mockResolvedValueOnce(undefined);
    await submitLiveResponse({
      sessionId: 'session-1', participantUid: 'student-1', classId: 'class-1', stepId: 'warmup',
      responseType: 'choice', value: 'B', clientNonce: 'nonce-1',
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledOnce();
    expect(firestoreMocks.setDoc.mock.calls[0][1]).toEqual({
      responseType: 'choice', value: 'B', clientNonce: 'nonce-1', updatedAt: { __type: 'serverTimestamp' },
    });
    expect(firestoreMocks.setDoc.mock.calls[0][1]).not.toHaveProperty('submittedAt');
    expect(firestoreMocks.setDoc.mock.calls[0][2]).toEqual({ merge: true });
  });

  it('uses the same response path and nonce for create then update-compatible resubmission', async () => {
    firestoreMocks.setDoc
      .mockRejectedValueOnce(Object.assign(new Error('missing response document'), { code: 'permission-denied' }))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const base = {
      sessionId: 'session-1', participantUid: 'student-1', classId: 'class-1', stepId: 'warmup',
      responseType: 'choice' as const, clientNonce: 'stable-nonce',
    };

    await submitLiveResponse({ ...base, value: 'A' });
    await submitLiveResponse({ ...base, value: 'B' });

    expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(3);
    expect(firestoreMocks.setDoc.mock.calls[0][0].path).toBe(firestoreMocks.setDoc.mock.calls[1][0].path);
    expect(firestoreMocks.setDoc.mock.calls[1][0].path).toBe(firestoreMocks.setDoc.mock.calls[2][0].path);
    expect(firestoreMocks.setDoc.mock.calls[1][1]).toMatchObject({ clientNonce: 'stable-nonce', value: 'A' });
    expect(firestoreMocks.setDoc.mock.calls[2][1]).toMatchObject({ clientNonce: 'stable-nonce', value: 'B' });
    expect(firestoreMocks.setDoc.mock.calls[2][1]).not.toHaveProperty('submittedAt');
    expect(firestoreMocks.setDoc.mock.calls[2][2]).toEqual({ merge: true });
  });

  it('rejects unsafe response inputs before writing', async () => {
    const input = {
      sessionId: 'session-1', participantUid: 'student-1', classId: 'class-1', stepId: 'warmup',
      responseType: 'text', value: 'x'.repeat(2001), clientNonce: 'nonce-1',
    } as const;
    await expect(submitLiveResponse(input)).rejects.toThrow(/2000/);
    await expect(submitLiveResponse({ ...input, value: 'ok', responseType: 'unsafe' as never })).rejects.toThrow(/response type/i);
    await expect(submitLiveResponse({ ...input, value: 'ok', clientNonce: '' })).rejects.toThrow(/nonce/i);
    await expect(submitLiveResponse({ ...input, value: 'ok', stepId: 'bad/step' })).rejects.toThrow(/identifier/i);
    expect(firestoreMocks.setDoc).not.toHaveBeenCalled();
  });

  it('publishes only the exact sanitized public stats contract', async () => {
    await publishLivePublicStats('session-1', {
      stepId: 'warmup',
      participantCount: 2,
      submittedCount: 2,
      choiceCounts: { A: 2, secretAnswer: 99 },
      routeCounts: { M: 1, S: 1, C: 0 },
      errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
      hintUseCount: 1,
      updatedAt: 123,
      participantUid: 'must-not-leak',
    } as never);
    const payload = firestoreMocks.setDoc.mock.calls[0][1] as Record<string, unknown>;

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      firestoreMocks.db,
      'liveLessonSessions',
      'session-1',
      'public',
      'stats',
    );
    expect(Object.keys(payload).sort()).toEqual([
      'choiceCounts', 'errorCategoryCounts', 'hintUseCount', 'participantCount', 'routeCounts',
      'stepId', 'submittedCount', 'updatedAt',
    ].sort());
    expect(payload.choiceCounts).toEqual({ A: 2 });
    expect(JSON.stringify(payload)).not.toContain('participantUid');
    expect(payload.updatedAt).toEqual({ __type: 'serverTimestamp' });
  });

  it('maps teacher response snapshots and returns a usable unsubscribe', () => {
    const unsubscribe = vi.fn();
    firestoreMocks.onSnapshot.mockImplementationOnce((_, onChange) => {
      onChange({ docs: [{ id: 'student-1__warmup', data: () => responseData() }] });
      return unsubscribe;
    });
    const onChange = vi.fn();
    const stop = subscribeToTeacherResponses('session-1', 'warmup', onChange, vi.fn());

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: 'student-1__warmup', submittedAt: 1000, updatedAt: 2000 })]);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(firestoreMocks.query.mock.calls[0][1]).toEqual({ field: 'stepId', operator: '==', value: 'warmup' });
  });

  it('subscribes to the normalized owner session and rejects malformed snapshots', () => {
    const unsubscribe = vi.fn();
    const onChange = vi.fn();
    const onError = vi.fn();
    firestoreMocks.onSnapshot.mockImplementationOnce((_, onSnapshotChange, onSnapshotError) => {
      onSnapshotChange({ exists: () => true, data: () => sessionData({ updatedAt: new FakeTimestamp(3000) }) });
      onSnapshotChange({ exists: () => true, data: () => ({ schemaVersion: 2 }) });
      expect(onSnapshotError).toBeTypeOf('function');
      return unsubscribe;
    });

    const stop = subscribeToTeacherSession('session-1', onChange, onError);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'session-1', updatedAt: 3000 }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/lessonId|schemaVersion/i) }));
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('maps public state and public stats snapshots without throwing synchronously', () => {
    const stateChange = vi.fn();
    const statsChange = vi.fn();
    const stateStop = vi.fn();
    const statsStop = vi.fn();
    firestoreMocks.onSnapshot
      .mockImplementationOnce((_, onChange) => {
        onChange({ exists: () => true, data: () => ({
          cueId: 'P01', tvScreenId: 'S1', status: 'running', showStats: false,
          updatedAt: new FakeTimestamp(3000), teacherCue: 'secret', lessonId: 'must-not-leak',
        }) });
        return stateStop;
      })
      .mockImplementationOnce((_, onChange) => {
        onChange({ exists: () => true, data: () => ({
          stepId: 'warmup', participantCount: 1, submittedCount: 1, choiceCounts: { A: 1 },
          routeCounts: { M: 0, S: 0, C: 0 },
          errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
          hintUseCount: 0, updatedAt: new FakeTimestamp(4000), participantUid: 'secret',
        }) });
        return statsStop;
      });

    const stopState = subscribeToLivePublicState('session-1', stateChange, vi.fn());
    const stopStats = subscribeToLivePublicStats('session-1', statsChange, vi.fn());

    expect(stateChange).toHaveBeenCalledWith({
      cueId: 'P01', tvScreenId: 'S1', status: 'running', showStats: false, updatedAt: 3000,
    });
    expect(stateChange.mock.calls[0][0]).not.toHaveProperty('teacherCue');
    expect(stateChange.mock.calls[0][0]).not.toHaveProperty('lessonId');
    expect(statsChange).toHaveBeenCalledWith(expect.objectContaining({ updatedAt: 4000 }));
    expect(statsChange.mock.calls[0][0]).not.toHaveProperty('participantUid');
    stopState();
    stopStats();
    expect(stateStop).toHaveBeenCalledOnce();
    expect(statsStop).toHaveBeenCalledOnce();
  });
});

describe('listTeacherClasses', () => {
  it('maps document ids and sorts classes by name', async () => {
    firestoreMocks.getDocs.mockResolvedValue({
      docs: [
        { id: 'class-z', data: () => ({ id: 'wrong-id', name: 'Zulu' }) },
        { id: 'class-a', data: () => ({ name: 'Alpha' }) },
      ],
    });

    await expect(listTeacherClasses('teacher-1')).resolves.toEqual([
      expect.objectContaining({ id: 'class-a', name: 'Alpha' }),
      expect.objectContaining({ id: 'class-z', name: 'Zulu' }),
    ]);
    await expect(listTeacherClasses('')).resolves.toEqual([]);
    expect(firestoreMocks.getDocs).toHaveBeenCalledOnce();
  });
});

describe('student login session storage', () => {
  it('stores the anonymous Firebase uid with LoginResponse fields and never a PIN or join code', () => {
    let stored = '';
    const storage = {
      getItem: vi.fn(() => stored || null),
      setItem: vi.fn((_: string, value: string) => { stored = value; }),
      removeItem: vi.fn(() => { stored = ''; }),
    };
    vi.stubGlobal('sessionStorage', storage);

    saveStudentLoginSession({ ...login, pin: '1234', joinCode: 'JOIN' } as never, 'anon-1');
    expect(stored).not.toContain('1234');
    expect(stored).not.toContain('joinCode');
    expect(JSON.parse(stored)).toMatchObject({ ...login, anonymousUid: 'anon-1' });
    expect(getStudentLoginSession('anon-1')).toMatchObject({ ...login, anonymousUid: 'anon-1' });
    expect(getStudentLoginSession('stale-anon')).toBeNull();
    clearStudentLoginSession();
    expect(getStudentLoginSession('anon-1')).toBeNull();
  });

  it('returns null for malformed or invalid storage and tolerates unavailable storage', () => {
    const storage = {
      getItem: vi.fn(() => '{not-json'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('sessionStorage', storage);
    expect(getStudentLoginSession('anon-1')).toBeNull();
    storage.getItem.mockReturnValue(JSON.stringify({ ...login, studentId: '' }));
    expect(getStudentLoginSession('anon-1')).toBeNull();
    storage.getItem.mockReturnValue(JSON.stringify({ ...login, anonymousUid: 'other-anon' }));
    expect(getStudentLoginSession('anon-1')).toBeNull();
    vi.stubGlobal('sessionStorage', undefined);
    expect(getStudentLoginSession('anon-1')).toBeNull();
    expect(() => saveStudentLoginSession(login, 'anon-1')).not.toThrow();
    expect(() => clearStudentLoginSession()).not.toThrow();
  });
});

describe('aggregate integration contract', () => {
  it('keeps the service public stats expectation aligned with aggregate sanitization', () => {
    expect(toPublicStats({
      stepId: 'warmup', participantCount: 1, submittedCount: 1, choiceCounts: { A: 1, secret: 3 },
      routeCounts: { M: 0, S: 0, C: 0 },
      errorCategoryCounts: { Conceptual: 0, Algebraic: 0, Logical: 0, 'Missing condition': 0 },
      hintUseCount: 0, updatedAt: 0,
    })).toMatchObject({ choiceCounts: { A: 1 } });
  });
});
