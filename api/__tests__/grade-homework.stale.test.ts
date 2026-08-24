import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const { verifyIdToken, initializeAdmin } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  initializeAdmin: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: initializeAdmin,
}));

import handler from '../grade-homework.js';

type Row = Record<string, unknown>;

const makeDb = (seed: Record<string, Record<string, Row>>) => {
  const state = seed;
  const collection = (name: string) => {
    const docsFor = (constraints: Array<{ field: string; value: unknown }>) => Object.entries(state[name] || {})
      .filter(([, data]) => constraints.every(item => data[item.field] === item.value));
    const buildDocs = (constraints: Array<{ field: string; value: unknown }>, count?: number) => {
      const rows = typeof count === 'number' ? docsFor(constraints).slice(0, count) : docsFor(constraints);
      return {
      empty: rows.length === 0,
      docs: rows.map(([id, data]) => ({
        id,
        data: () => ({ ...data }),
      })),
      };
    };
    const chain = (constraints: Array<{ field: string; value: unknown }>) => ({
      where: (field: string, _operator: string, value: unknown) => chain([...constraints, { field, value }]),
      limit: (count: number) => ({ get: async () => buildDocs(constraints, count) }),
      get: async () => buildDocs(constraints),
    });

    return {
      doc: (id: string) => ({
        get: async () => ({ exists: state[name]?.[id] !== undefined, data: () => state[name]?.[id] ? { ...state[name][id] } : undefined }),
        update: async (patch: Row) => { state[name][id] = { ...state[name][id], ...patch }; },
      }),
      where: (field: string, _operator: string, value: unknown) => chain([{ field, value }]),
    };
  };
  const runTransaction = async (work: (transaction: {
    get: (ref: { get: () => Promise<{ exists: boolean; data: () => Row | undefined }> }) => Promise<{ exists: boolean; data: () => Row | undefined }>;
    update: (ref: { update: (patch: Row) => Promise<void> }, patch: Row) => void;
  }) => Promise<unknown>) => {
    const updates: Promise<void>[] = [];
    const result = await work({
      get: ref => ref.get(),
      update: (ref, patch) => { updates.push(ref.update(patch)); },
    });
    await Promise.all(updates);
    return result;
  };
  return { collection, runTransaction, state };
};

const makeResponse = (): { response: VercelResponse; state: { statusCode: number; jsonBody?: unknown } } => {
  const state: { statusCode: number; jsonBody?: unknown } = { statusCode: 200 };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(body: unknown) { state.jsonBody = body; return response; },
  } as unknown as VercelResponse;
  return { response, state };
};

const makeRequest = (body: Record<string, unknown>): VercelRequest => ({
  method: 'POST', headers: {}, body,
} as VercelRequest);

describe('gradeAssignment · stale grading recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: 'teacher-1' });
  });

  it('grading mới được giữ nguyên, grading quá 10 phút chuyển error và không bị auto-grade cùng lượt', async () => {
    const now = Date.now();
    const db = makeDb({
      assignments: {
        'assignment-1': { teacherId: 'teacher-1', classId: 'class-1', title: 'Bài 11 Columbus', answerKey: 'x = 2', maxScore: 10 },
      },
      submissions: {
        'stale-1': {
          assignmentId: 'assignment-1', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1',
          status: 'grading', updatedAt: new Date(now - 11 * 60 * 1000).toISOString(), fileUrls: [],
        },
        'fresh-1': {
          assignmentId: 'assignment-1', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-2',
          status: 'grading', updatedAt: new Date(now - 60 * 1000).toISOString(), fileUrls: [],
        },
      },
    });
    initializeAdmin.mockReturnValue(db);
    const { response, state } = makeResponse();

    await handler(makeRequest({ action: 'gradeAssignment', idToken: 'teacher-token', assignmentId: 'assignment-1' }), response);

    expect(state.statusCode).toBe(200);
    expect(db.state.submissions['stale-1']).toMatchObject({ status: 'error' });
    expect(String(db.state.submissions['stale-1'].errorMessage)).toMatch(/quá lâu|thử lại/i);
    expect(db.state.submissions['fresh-1']).toMatchObject({ status: 'grading' });
    expect(state.jsonBody).toEqual({ graded: 0, failed: 0, remaining: 0 });
  });
});
