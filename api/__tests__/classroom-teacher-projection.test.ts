import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../classroom';

type DocData = Record<string, unknown>;

const h = vi.hoisted(() => ({
  uid: 'gv-1',
  db: null as unknown,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => ({ uid: h.uid, email: 'gv-1@example.com' }),
    getUser: async (uid: string) => ({ uid, email: `${uid}@example.com`, displayName: 'Giáo viên Test' }),
  }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ name: 'unused.firebasestorage.app', file: () => ({ delete: async () => undefined }) }),
}));

interface Harness {
  store: Record<string, Record<string, DocData>>;
}

const makeDb = (harness: Harness) => {
  const ensure = (name: string) => {
    harness.store[name] ||= {};
    return harness.store[name];
  };
  const makeQuery = (name: string, constraints: Array<{ field: string; value: unknown }>) => ({
    where: (field: string, _operator: string, value: unknown) => makeQuery(name, [...constraints, { field, value }]),
    get: async () => {
      const docs = Object.entries(ensure(name))
        .filter(([, data]) => constraints.every(item => data[item.field] === item.value))
        .map(([id, data]) => ({ id, data: () => ({ ...data }) }));
      return { empty: docs.length === 0, docs };
    },
  });

  const collection = (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const data = ensure(name)[id];
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
      },
      set: async (payload: DocData, options?: { merge?: boolean }) => {
        ensure(name)[id] = options?.merge ? { ...ensure(name)[id], ...payload } : { ...payload };
      },
      update: async (payload: DocData) => {
        const next = { ...ensure(name)[id] };
        for (const [key, value] of Object.entries(payload)) {
          if (!key.includes('.')) {
            next[key] = value;
            continue;
          }
          const [parent, child] = key.split('.', 2);
          next[parent] = { ...(next[parent] as DocData || {}), [child]: value };
        }
        ensure(name)[id] = next;
      },
      delete: async () => {
        delete ensure(name)[id];
      },
    }),
    where: (field: string, _operator: string, value: unknown) => makeQuery(name, [{ field, value }]),
  });
  const runTransaction = async (work: (transaction: {
    get: (ref: { get: () => Promise<{ exists: boolean; data: () => DocData | undefined }> }) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
    update: (ref: { update: (payload: DocData) => Promise<void> }, payload: DocData) => void;
    set: (ref: { set: (payload: DocData, options?: { merge?: boolean }) => Promise<void> }, payload: DocData, options?: { merge?: boolean }) => void;
  }) => Promise<unknown>) => {
    const operations: Array<() => Promise<void>> = [];
    const result = await work({
      get: ref => ref.get(),
      update: (ref, payload) => { operations.push(() => ref.update(payload)); },
      set: (ref, payload, options) => { operations.push(() => ref.set(payload, options)); },
    });
    for (const operation of operations) await operation();
    return result;
  };
  return { collection, runTransaction };
};

const call = async (body: DocData) => {
  const state = { statusCode: 0, payload: null as DocData | null };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(payload: DocData) { state.payload = payload; return response; },
  };
  await handler({ method: 'POST', body: { idToken: 'token', ...body } } as never, response as never);
  return state;
};

const oldGrade = {
  score: 8,
  maxScore: 10,
  feedback: 'Nhận xét cũ',
  strengths: ['Biết đặt ẩn'],
  weaknesses: ['Nhầm dấu'],
  weakTopics: ['Dấu trong phương trình'],
  teacherApproved: true,
  gradedAt: '2026-08-24T10:00:00.000Z',
};

const seed = (): Harness => {
  const harness: Harness = { store: {} };
  h.db = makeDb(harness);
  harness.store.classes = {
    'lop-1': { teacherId: 'gv-1', ownerId: 'gv-1', originalOwnerId: 'gv-1', name: '11 Columbus' },
  };
  harness.store.classMembers = {
    'lop-1__gv-1': { classId: 'lop-1', uid: 'gv-1', role: 'owner', status: 'active' },
  };
  harness.store.submissions = {
    'sub-1': {
      id: 'sub-1', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
      fileUrls: ['https://storage.test/homework/sub-1.jpg'],
      attachments: [{ name: 'sub-1.jpg', url: 'https://storage.test/homework/sub-1.jpg', kind: 'image' }],
      textContent: 'Bài làm nguyên bản', note: 'Ghi chú của em', status: 'graded', grade: oldGrade,
      createdAt: '2026-08-24T09:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z',
    },
  };
  harness.store.assignments = {
    'asg-1': { id: 'asg-1', teacherId: 'gv-1', classId: 'lop-1', title: 'Bài kiểm tra' },
  };
  harness.store.studentProfiles = {
    'hs-1': {
      studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1',
      topics: [{ topic: 'Dấu trong phương trình', level: 'weak', evidenceSubmissionIds: ['sub-1'], updatedAt: '2026-08-24T10:00:00.000Z' }],
    },
  };
  harness.store.studentSkillEvidence = {
    'hs-1__sub-1%3Amath.line-equation': {
      studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1', submissionId: 'sub-1', skillId: 'math.line-equation',
      evidenceId: 'sub-1:math.line-equation', source: 'homework', approved: true,
    },
  };
  return harness;
};

describe('POST /api/classroom · teacher projection (submissions)', () => {
  beforeEach(() => { h.uid = 'gv-1'; });

  it('giáo viên thấy lastGradingError raw khi status graded có grade hợp lệ', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].lastGradingError = 'Provider timeout raw error';
    harness.store.submissions['sub-1'].lastGradingErrorRaw = 'Raw provider error details';
    harness.store.submissions['sub-1'].evidenceSyncError = 'Sync failed internal error';
    harness.store.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: false, approvalSource: 'student_ai' };

    const result = await call({ action: 'teacherSubmissions', classId: 'lop-1', assignmentId: 'asg-1' });

    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as DocData[];
    expect(submissions).toHaveLength(1);
    const sub = submissions[0];
    expect(sub.status).toBe('graded');
    // Teacher sees raw errors
    expect(sub.lastGradingError).toBe('Provider timeout raw error');
    expect(sub.lastGradingErrorRaw).toBe('Raw provider error details');
    expect(sub.evidenceSyncError).toBe('Sync failed internal error');
    // Grade preserved
    expect(sub.grade).toMatchObject({ score: 8, teacherApproved: false, approvalSource: 'student_ai' });
  });

  it('giáo viên thấy errorMessage khi status error không có grade', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'] = {
      ...harness.store.submissions['sub-1'],
      status: 'error',
      errorMessage: 'AI provider down',
      grade: undefined,
    };

    const result = await call({ action: 'teacherSubmissions', classId: 'lop-1', assignmentId: 'asg-1' });

    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as DocData[];
    expect(submissions).toHaveLength(1);
    const sub = submissions[0];
    expect(sub.status).toBe('error');
    // Teacher sees the actual errorMessage for debugging
    expect(sub.errorMessage).toBe('AI provider down');
    expect(sub).not.toHaveProperty('grade');
  });

  it('giáo viên thấy evidenceSyncError (teacher/internal-only)', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].evidenceSyncError = 'Sync failed internal error';

    const result = await call({ action: 'teacherSubmissions', classId: 'lop-1', assignmentId: 'asg-1' });

    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as DocData[];
    expect(submissions).toHaveLength(1);
    const sub = submissions[0];
    expect(sub.evidenceSyncError).toBe('Sync failed internal error');
  });

  it('giáo viên thấy approvalSource được bảo toàn', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: true, approvalSource: 'teacher' };

    const result = await call({ action: 'teacherSubmissions', classId: 'lop-1', assignmentId: 'asg-1' });

    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as DocData[];
    expect(submissions[0].grade).toMatchObject({ approvalSource: 'teacher' });
  });
});