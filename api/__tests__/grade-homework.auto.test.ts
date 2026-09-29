import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ db: null as unknown }));

vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async () => ({ uid: 'x' }) }) }));
vi.mock('../_exam-core.js', () => ({ getAdminDb: () => h.db }));

import handler from '../grade-homework';

type DocData = Record<string, unknown>;
type State = Record<string, Record<string, DocData>>;

const getPath = (data: DocData, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as DocData)[key] : undefined), data);

const setPath = (data: DocData, path: string, value: unknown): DocData => {
  const [head, ...rest] = path.split('.');
  if (rest.length === 0) return { ...data, [head]: value };
  return { ...data, [head]: setPath((data[head] as DocData) ?? {}, rest.join('.'), value) };
};

const makeDb = (state: State) => {
  const ensure = (name: string) => (state[name] ||= {});
  const ref = (name: string, id: string) => ({
    id,
    get: async () => ({ id, exists: ensure(name)[id] !== undefined, data: () => (ensure(name)[id] ? { ...ensure(name)[id] } : undefined) }),
    update: async (patch: DocData) => {
      let next = { ...ensure(name)[id] };
      for (const [key, value] of Object.entries(patch)) next = setPath(next, key, value);
      ensure(name)[id] = next;
    },
    set: async (payload: DocData, options?: { merge?: boolean }) => {
      ensure(name)[id] = options?.merge ? { ...ensure(name)[id], ...payload } : { ...payload };
    },
    delete: async () => { delete ensure(name)[id]; },
  });
  const query = (name: string, filters: Array<[string, string, unknown]>) => ({
    where: (field: string, op: string, value: unknown) => query(name, [...filters, [field, op, value]]),
    limit: () => query(name, filters),
    get: async () => {
      const docs = Object.entries(ensure(name))
        .filter(([, data]) => filters.every(([field, op, value]) => (op === 'in'
          ? Array.isArray(value) && value.includes(getPath(data, field))
          : getPath(data, field) === value)))
        .map(([id, data]) => ({ id, data: () => ({ ...data }) }));
      return { docs, empty: docs.length === 0 };
    },
  });
  return {
    collection: (name: string) => ({ ...query(name, []), doc: (id: string) => ref(name, id), add: async (d: DocData) => { ensure(name)[`auto${Object.keys(ensure(name)).length}`] = d; } }),
    runTransaction: async (work: (tx: unknown) => Promise<unknown>) => {
      const ops: Array<() => Promise<void>> = [];
      const result = await work({
        get: (r: { get: () => Promise<unknown> }) => r.get(),
        update: (r: { update: (p: DocData) => Promise<void> }, p: DocData) => { ops.push(() => r.update(p)); },
        set: (r: { set: (p: DocData, o?: { merge?: boolean }) => Promise<void> }, p: DocData, o?: { merge?: boolean }) => { ops.push(() => r.set(p, o)); },
        delete: () => undefined,
      });
      for (const op of ops) await op();
      return result;
    },
    batch: () => {
      const ops: Array<() => Promise<void>> = [];
      return {
        set: (r: { set: (p: DocData, o?: { merge?: boolean }) => Promise<void> }, p: DocData, o?: { merge?: boolean }) => { ops.push(() => r.set(p, o)); },
        update: (r: { update: (p: DocData) => Promise<void> }, p: DocData) => { ops.push(() => r.update(p)); },
        delete: () => undefined,
        commit: async () => { for (const op of ops) await op(); },
      };
    },
  };
};

const call = async (authorization?: string) => {
  const state: { statusCode: number; body?: DocData } = { statusCode: 0 };
  const res = {
    status(code: number) { state.statusCode = code; return res; },
    json(body: DocData) { state.body = body; return res; },
    setHeader() { return res; },
  };
  await handler({ method: 'POST', query: { cron: 'auto' }, headers: authorization ? { authorization } : {}, body: {} } as never, res as never);
  return state;
};

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const grade = (gradedAt: string, confidence = 0.95) => ({
  score: 7, maxScore: 10, feedback: 'ok', strengths: [], weaknesses: [], weakTopics: [],
  teacherApproved: false, approvalSource: 'teacher', gradedAt, questionResults: [{ confidence }],
});
const sub = (id: string, studentId: string, extra: DocData): DocData => ({
  id, teacherId: 'gv', classId: 'lop', studentId, assignmentId: 'bai', fileUrls: [], textContent: 'Bài làm', note: '', ...extra,
});

const seed = (classExtra: DocData = {}): State => ({
  classes: { lop: { teacherId: 'gv', name: '10A', ...classExtra } },
  assignments: { bai: { teacherId: 'gv', classId: 'lop', type: 'homework', title: 'BTVN', answerKey: 'x = 2', maxScore: 10 } },
  submissions: {
    'cho-duyet': sub('cho-duyet', 'A', { status: 'graded', grade: grade(ago(70)), createdAt: ago(200), updatedAt: ago(70) }),
    'chua-chac': sub('chua-chac', 'B', { status: 'graded', grade: grade(ago(70), 0.2), createdAt: ago(200), updatedAt: ago(70) }),
    'moi-cham': sub('moi-cham', 'C', { status: 'graded', grade: grade(ago(5)), createdAt: ago(200), updatedAt: ago(5) }),
    'cho-cham': sub('cho-cham', 'D', { status: 'submitted', createdAt: ago(90), updatedAt: ago(90) }),
    'moi-nop': sub('moi-nop', 'E', { status: 'submitted', createdAt: ago(10), updatedAt: ago(10) }),
  },
});

describe('quét tự chấm + tự duyệt sau 60 phút', () => {
  beforeEach(() => {
    process.env.GRADING_GEMINI_API_KEY = 'test-key';
    process.env.AUTO_GRADE_CRON_SECRET = 'bi-mat';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({
        score: 8, maxScore: 10, feedbackForStudent: 'Tốt', noteForTeacher: '', strengths: [], weaknesses: [], weakTopics: [], questionResults: [],
      }) }] } }] }),
      text: async () => '',
    })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.AUTO_GRADE_CRON_SECRET;
  });

  it('chưa cấu hình khoá thì 503, sai khoá thì 401', async () => {
    h.db = makeDb(seed());
    delete process.env.AUTO_GRADE_CRON_SECRET;
    expect((await call('Bearer bi-mat')).statusCode).toBe(503);
    process.env.AUTO_GRADE_CRON_SECRET = 'bi-mat';
    expect((await call('Bearer sai')).statusCode).toBe(401);
  });

  it('duyệt bài chờ duyệt quá 60 phút, chấm + duyệt bài chờ chấm quá 60 phút; bài chưa chắc / mới thì giữ nguyên', async () => {
    const state = seed();
    h.db = makeDb(state);
    const result = await call('Bearer bi-mat');
    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ approved: 2, graded: 1, failed: 0, remaining: 0 });
    const s = state.submissions;
    expect(s['cho-duyet'].grade).toMatchObject({ teacherApproved: true, approvalSource: 'auto_timeout' });
    expect(s['cho-cham']).toMatchObject({ status: 'graded', grade: expect.objectContaining({ score: 8, teacherApproved: true, approvalSource: 'auto_timeout' }) });
    expect(s['chua-chac'].grade).toMatchObject({ teacherApproved: false });
    expect(s['moi-cham'].grade).toMatchObject({ teacherApproved: false });
    expect(s['moi-nop'].status).toBe('submitted');
  });

  it('lớp giáo viên đã tắt thì không đụng bài nào', async () => {
    const state = seed({ autoGradeAfterHour: false });
    h.db = makeDb(state);
    const result = await call('Bearer bi-mat');
    expect(result.body).toMatchObject({ approved: 0, graded: 0 });
    expect(state.submissions['cho-cham'].status).toBe('submitted');
    expect(state.submissions['cho-duyet'].grade).toMatchObject({ teacherApproved: false });
  });
});
