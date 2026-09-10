import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Giáo viên xoá bài của học sinh thì bài biến mất khỏi màn hình em mà không một lời giải thích —
 * em tưởng máy nuốt mất bài. Máy chủ phải ghi lại việc này ngay tại chỗ xoá, vì sau lệnh delete
 * không còn dấu vết nào để cổng học sinh dựng lại.
 */

const h = vi.hoisted(() => ({
  uid: 'gv-1',
  db: null as unknown,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }) }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  // Bài nộp trong test không có file nào nên bucket không bị chạm tới.
  getAdminStorage: () => ({ file: () => ({ delete: async () => undefined }) }),
}));


import handler from '../classroom';

type DocData = Record<string, unknown>;

interface Harness {
  state: Record<string, Record<string, DocData>>;
}

const makeDb = (harness: Harness) => {
  const ensure = (name: string) => {
    harness.state[name] ||= {};
    return harness.state[name];
  };
  const query = (name: string, constraints: Array<{ field: string; value: unknown }>) => ({
    where: (field: string, _op: string, value: unknown) => query(name, [...constraints, { field, value }]),
    limit: () => query(name, constraints),
    get: async () => ({
      docs: Object.entries(ensure(name))
        .filter(([, data]) => constraints.every(item => data[item.field] === item.value))
        .map(([id, data]) => ({ id, data: () => ({ ...data }) })),
    }),
  });
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = ensure(name)[id];
          return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
        },
        set: async (payload: DocData, options?: { merge?: boolean }) => {
          ensure(name)[id] = options?.merge ? { ...ensure(name)[id], ...payload } : { ...payload };
        },
        update: async (patch: DocData) => { ensure(name)[id] = { ...ensure(name)[id], ...patch }; },
        delete: async () => { delete ensure(name)[id]; },
      }),
      where: (field: string, _op: string, value: unknown) => query(name, [{ field, value }]),
    }),
    runTransaction: async (work: (transaction: unknown) => Promise<unknown>) => work({}),
  };
};

const makeResponse = () => {
  const state: { statusCode: number; body?: DocData } = { statusCode: 200 };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(body: DocData) { state.body = body; return response; },
  };
  return { response, state };
};

const call = async (body: DocData) => {
  const { response, state } = makeResponse();
  await handler({ method: 'POST', headers: {}, body: { idToken: 'token', ...body } } as never, response as never);
  return state;
};

const seed = (): Harness => ({
  state: {
    classes: { 'lop-1': { teacherId: 'gv-1', ownerId: 'gv-1', teacherIds: ['gv-1'] } },
    assignments: { 'asg-1': { teacherId: 'gv-1', classId: 'lop-1', title: 'BTVN Hình học 03/09' } },
    submissions: {
      'sub-1': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        status: 'submitted', fileUrls: [], createdAt: '2026-09-09T01:00:00.000Z',
      },
    },
    studentLinks: { 'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' } },
  },
});

describe('deleteSubmission · thông báo cho học sinh', () => {
  beforeEach(() => { h.uid = 'gv-1'; });

  it('ghi thông báo kèm tên bài và lý do thầy cô gõ', async () => {
    const harness = seed();
    h.db = makeDb(harness);

    const result = await call({ action: 'deleteSubmission', submissionId: 'sub-1', reason: 'Ảnh mờ quá, em chụp lại nhé' });

    expect(result.statusCode).toBe(200);
    expect(harness.state.submissions['sub-1']).toBeUndefined();
    const notifications = Object.values(harness.state.studentNotifications || {});
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      studentId: 'hs-1',
      classId: 'lop-1',
      teacherId: 'gv-1',
      type: 'submission_deleted',
      assignmentId: 'asg-1',
      assignmentTitle: 'BTVN Hình học 03/09',
      reason: 'Ảnh mờ quá, em chụp lại nhé',
    });
  });

  it('không gõ lý do thì vẫn ghi thông báo, chỉ là không có field reason', async () => {
    const harness = seed();
    h.db = makeDb(harness);

    await call({ action: 'deleteSubmission', submissionId: 'sub-1' });

    const notifications = Object.values(harness.state.studentNotifications || {}) as DocData[];
    expect(notifications).toHaveLength(1);
    expect(notifications[0].reason).toBeUndefined();
    expect(notifications[0].assignmentTitle).toBe('BTVN Hình học 03/09');
  });

  it('học sinh chỉ đọc được thông báo của chính mình', async () => {
    const harness = seed();
    harness.state.studentNotifications = {
      'del-cua-em': {
        id: 'del-cua-em', studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1',
        type: 'submission_deleted', createdAt: '2026-09-09T02:00:00.000Z',
      },
      'del-cua-ban': {
        id: 'del-cua-ban', studentId: 'hs-2', classId: 'lop-1', teacherId: 'gv-1',
        type: 'submission_deleted', createdAt: '2026-09-09T03:00:00.000Z',
      },
    };
    h.db = makeDb(harness);
    h.uid = 'hs-uid';

    const result = await call({ action: 'studentNotifications' });

    expect(result.statusCode).toBe(200);
    const notifications = (result.body as { notifications: DocData[] }).notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0].id).toBe('del-cua-em');
  });

  it('người chưa đăng nhập bằng phiên học sinh thì bị từ chối', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    h.uid = 'nguoi-la';

    const result = await call({ action: 'studentNotifications' });

    expect(result.statusCode).toBe(403);
  });
});
