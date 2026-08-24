import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const { verifyIdToken, initializeAdmin } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  initializeAdmin: vi.fn(),
}));
let practiceGradingAiCalls = 0;

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: initializeAdmin,
}));

import handler from '../grade-homework.js';

type Stored = Record<string, Record<string, Record<string, unknown>>>;

const makeDb = (seed: Stored = {}) => {
  const state: Stored = { ...seed };
  const collection = (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const data = state[name]?.[id];
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
      },
      set: async (payload: Record<string, unknown>, options?: { merge?: boolean }) => {
        state[name] ||= {};
        state[name][id] = options?.merge ? { ...state[name][id], ...payload } : { ...payload };
      },
      update: async (payload: Record<string, unknown>) => {
        state[name] ||= {};
        state[name][id] = { ...state[name][id], ...payload };
      },
    }),
    where: (field: string, _operator: string, value: unknown) => ({
      get: async () => {
        const docs = Object.entries(state[name] || {})
          .filter(([, data]) => data[field] === value)
          .map(([id, data]) => ({ id, data: () => ({ ...data }) }));
        return { docs, empty: docs.length === 0 };
      },
    }),
  });
  const runTransaction = async (work: (transaction: {
    get: (ref: { get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }> }) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
    set: (ref: { set: (payload: Record<string, unknown>, options?: { merge?: boolean }) => Promise<void> }, payload: Record<string, unknown>) => void;
  }) => Promise<unknown>) => {
    const operations: Promise<void>[] = [];
    const result = await work({
      get: ref => ref.get(),
      set: (ref, payload) => { operations.push(ref.set(payload)); },
    });
    await Promise.all(operations);
    return result;
  };
  return { collection, runTransaction, state };
};

const makeRequest = (body: Record<string, unknown>): VercelRequest => ({
  method: 'POST',
  headers: {},
  body,
} as VercelRequest);

const makeResponse = (): { response: VercelResponse; state: { statusCode: number; jsonBody?: unknown } } => {
  const state: { statusCode: number; jsonBody?: unknown } = { statusCode: 200 };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(body: unknown) { state.jsonBody = body; return response; },
  } as unknown as VercelResponse;
  return { response, state };
};

const seedStudentDb = () => makeDb({
  studentLinks: {
    'student-uid': { studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1' },
  },
  studentProfiles: {
    'student-1': {
      studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
      topics: [{
        topic: 'phương trình bậc hai', level: 'weak', evidenceSubmissionIds: ['homework-1'],
        updatedAt: '2026-08-24T09:00:00.000Z',
      }],
    },
  },
  classes: {
    'class-1': { grade: '10' },
  },
});

describe('practice set/attempt privacy and persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    practiceGradingAiCalls = 0;
    verifyIdToken.mockResolvedValue({ uid: 'student-uid' });
    process.env.GRADING_GEMINI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body || '{}')) as { contents?: Array<{ parts?: Array<{ text?: string }> }> };
      const prompt = body.contents?.[0]?.parts?.[0]?.text || '';
      if (prompt.includes('Đối chiếu ĐÚNG từng ID')) practiceGradingAiCalls += 1;
      const text = prompt.includes('Đối chiếu ĐÚNG từng ID')
        ? JSON.stringify({
            score: 1,
            maxScore: 1,
            feedback: 'Em đã làm đúng.',
            questionResults: [{ id: 'q1', score: 1, maxScore: 1, feedback: 'Đúng.', expectedAnswer: 'x = 2' }],
          })
        : JSON.stringify({
            questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: 'Cô lập x.', solution: 'x = 2' }],
          });
      return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }) };
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GRADING_GEMINI_API_KEY;
  });

  it('practice response không chứa solution nhưng private key vẫn được lưu server-side', async () => {
    const db = seedStudentDb();
    initializeAdmin.mockReturnValue(db);
    const { response, state } = makeResponse();

    await handler(makeRequest({ action: 'practice', idToken: 'token-dung' }), response);

    expect(state.statusCode).toBe(200);
    const payload = state.jsonBody as { setId: string; questions: Array<Record<string, unknown>> };
    expect(payload.questions).toEqual([{ id: 'q1', question: 'Giải x + 1 = 3', hint: 'Cô lập x.' }]);
    expect((payload as { skillIds?: string[] }).skillIds).toEqual(['math.quadratic-equation']);
    expect(JSON.stringify(payload)).not.toContain('x = 2');
    expect(db.state.practiceKeys[payload.setId].questions).toEqual([
      expect.objectContaining({ id: 'q1', expectedAnswer: 'x = 2' }),
    ]);
  });

  it('submitPractice ghi attempt graded và trả kết quả có evidenceType practice', async () => {
    const db = seedStudentDb();
    db.state.practiceSets = {
      'set-1': {
        id: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        topics: ['phương trình bậc hai'],
        questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: 'Cô lập x.' }],
        createdAt: '2026-08-24T10:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z',
      },
    };
    db.state.practiceKeys = {
      'set-1': {
        setId: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: 'Cô lập x.', expectedAnswer: 'x = 2', maxScore: 1 }],
        createdAt: '2026-08-24T10:00:00.000Z',
      },
    };
    initializeAdmin.mockReturnValue(db);
    const { response, state } = makeResponse();

    await handler(makeRequest({
      action: 'submitPractice', idToken: 'token-dung', setId: 'set-1', attemptId: 'attempt-1', answers: { q1: 'x = 2' },
    }), response);

    expect(state.statusCode).toBe(200);
    expect(state.jsonBody).toMatchObject({ attemptId: 'attempt-1', status: 'graded', score: 1, evidenceType: 'practice' });
    expect(db.state.practiceAttempts['attempt-1']).toMatchObject({ status: 'graded', evidenceType: 'practice', answers: { q1: 'x = 2' } });
    expect(db.state.studentProfiles['student-1'].topics[0]).toMatchObject({
      topic: 'phương trình bậc hai',
      level: 'weak',
      evidenceRefs: [
        expect.objectContaining({ submissionId: 'homework-1', evidenceType: 'homework' }),
        expect.objectContaining({ submissionId: 'attempt-1', evidenceType: 'practice', confidence: 0.5 }),
      ],
    });
    expect(db.state.studentSkillEvidence).toEqual(expect.objectContaining({
      'student-1__attempt-1%3Amath.quadratic-equation': expect.objectContaining({
        source: 'practice',
        attemptId: 'attempt-1',
      }),
    }));
    expect(db.state.studentProfiles['student-1'].skills).toEqual(expect.arrayContaining([
      expect.objectContaining({ skillId: 'math.quadratic-equation', evidenceCount: 1 }),
    ]));

    const replay = makeResponse();
    await handler(makeRequest({
      action: 'submitPractice', idToken: 'token-dung', setId: 'set-1', attemptId: 'attempt-1', answers: { q1: 'câu trả lời khác' },
    }), replay.response);
    expect(replay.state.statusCode).toBe(200);
    expect(replay.state.jsonBody).toMatchObject({ attemptId: 'attempt-1', status: 'graded', score: 1 });
    expect(practiceGradingAiCalls).toBe(1);
  });

  it('submitPractice cho retry attempt grading đã stale quá 10 phút', async () => {
    const db = seedStudentDb();
    db.state.practiceSets = {
      'set-1': {
        id: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        topics: ['phương trình bậc hai'], questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: '' }],
        createdAt: '2026-08-24T10:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z',
      },
    };
    db.state.practiceKeys = {
      'set-1': {
        setId: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: '', expectedAnswer: 'x = 2', maxScore: 1 }],
        createdAt: '2026-08-24T10:00:00.000Z',
      },
    };
    db.state.practiceAttempts = {
      'attempt-stale': {
        id: 'attempt-stale', setId: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        answers: { q1: 'x = 2' }, status: 'grading', evidenceType: 'practice',
        createdAt: '2026-08-24T10:00:00.000Z', updatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      },
    };
    initializeAdmin.mockReturnValue(db);
    const { response, state } = makeResponse();

    await handler(makeRequest({
      action: 'submitPractice', idToken: 'token-dung', setId: 'set-1', attemptId: 'attempt-stale', answers: { q1: 'x = 2' },
    }), response);

    expect(state.statusCode).toBe(200);
    expect(state.jsonBody).toMatchObject({ attemptId: 'attempt-stale', status: 'graded' });
  });

  it('submitPractice không reset attempt grading mới', async () => {
    const db = seedStudentDb();
    db.state.practiceSets = {
      'set-1': { id: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1', topics: ['x'], questions: [{ id: 'q1', question: 'Q', hint: '' }], createdAt: '2026-08-24T10:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z' },
    };
    db.state.practiceKeys = {
      'set-1': { setId: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1', questions: [{ id: 'q1', question: 'Q', hint: '', expectedAnswer: 'A', maxScore: 1 }], createdAt: '2026-08-24T10:00:00.000Z' },
    };
    db.state.practiceAttempts = {
      'attempt-fresh': {
        id: 'attempt-fresh', setId: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        answers: { q1: 'A' }, status: 'grading', evidenceType: 'practice',
        createdAt: '2026-08-24T10:00:00.000Z', updatedAt: new Date().toISOString(),
      },
    };
    initializeAdmin.mockReturnValue(db);
    const { response, state } = makeResponse();

    await handler(makeRequest({
      action: 'submitPractice', idToken: 'token-dung', setId: 'set-1', attemptId: 'attempt-fresh', answers: { q1: 'A' },
    }), response);

    expect(state.statusCode).toBe(409);
    expect(db.state.practiceAttempts['attempt-fresh']).toMatchObject({ status: 'grading' });
  });

  it('practice có thể khôi phục set và attempt sau reload mà không trả private key trước kết quả', async () => {
    const db = seedStudentDb();
    db.state.practiceSets = {
      'set-1': {
        id: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        topics: ['phương trình bậc hai'],
        questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: 'Cô lập x.' }],
        createdAt: '2026-08-24T10:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z',
      },
    };
    db.state.practiceKeys = {
      'set-1': {
        setId: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: 'Cô lập x.', expectedAnswer: 'x = 2', maxScore: 1 }],
        createdAt: '2026-08-24T10:00:00.000Z',
      },
    };
    db.state.practiceAttempts = {
      'attempt-1': {
        id: 'attempt-1', setId: 'set-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1',
        answers: { q1: 'x = 2' }, status: 'graded', score: 1, maxScore: 1,
        feedback: 'Em đã làm đúng.',
        questionResults: [{ id: 'q1', score: 1, maxScore: 1, feedback: 'Đúng.', expectedAnswer: 'x = 2' }],
        evidenceType: 'practice', createdAt: '2026-08-24T10:01:00.000Z', updatedAt: '2026-08-24T10:02:00.000Z',
      },
    };
    initializeAdmin.mockReturnValue(db);
    const { response, state } = makeResponse();

    await handler(makeRequest({
      action: 'practice', idToken: 'token-dung', setId: 'set-1', attemptId: 'attempt-1',
    }), response);

    expect(state.statusCode).toBe(200);
    expect(state.jsonBody).toMatchObject({
      setId: 'set-1',
      questions: [{ id: 'q1', question: 'Giải x + 1 = 3', hint: 'Cô lập x.' }],
      attempt: { attemptId: 'attempt-1', status: 'graded', questionResults: [{ expectedAnswer: 'x = 2' }] },
    });
    expect(JSON.stringify(state.jsonBody)).not.toContain('solution');
  });
});
