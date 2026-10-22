import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../classroom';

type DocData = Record<string, unknown>;

const h = vi.hoisted(() => ({ uid: 'owner-1', email: 'owner@example.com', db: null as unknown }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => ({ uid: h.uid, email: h.email }),
    getUserByEmail: async (email: string) => ({ uid: email === 'co@example.com' ? 'co-1' : 'unknown', email }),
    getUser: async (uid: string) => ({ uid, email: uid === 'owner-1' ? 'owner@example.com' : `${uid}@example.com` }),
  }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ name: 'bucket', file: () => ({ delete: async () => undefined }) }),
}));

interface Harness { store: Record<string, Record<string, DocData>> }

const makeDb = (harness: Harness) => {
  const makeCollection = (collectionName: string) => {
    const ensure = () => { harness.store[collectionName] ||= {}; return harness.store[collectionName]; };
    const makeDoc = (id: string) => {
      const data = () => ensure()[id];
      const ref = {
        id,
        get: async () => ({ exists: data() !== undefined, data: () => data() ? { ...data() } : undefined }),
        set: async (payload: DocData, options?: { merge?: boolean }) => { ensure()[id] = options?.merge ? { ...ensure()[id], ...payload } : { ...payload }; },
        update: async (payload: DocData) => { ensure()[id] = { ...ensure()[id], ...payload }; },
        delete: async () => { delete ensure()[id]; },
        collection: (sub: string) => makeCollection(`${collectionName}/${id}/${sub}`),
      };
      return ref;
    };
    const makeQuery = (constraints: Array<{ field: string; value: unknown }>) => ({
      where: (field: string, _op: string, value: unknown) => makeQuery([...constraints, { field, value }]),
      get: async () => {
        const docs = Object.entries(ensure())
          .filter(([, value]) => constraints.every(c => value[c.field] === c.value))
          .map(([id, value]) => ({ id, data: () => ({ ...value }) }));
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    });
    return { doc: makeDoc, where: (f: string, _o: string, v: unknown) => makeQuery([{ field: f, value: v }]), get: async () => makeQuery([]).get() };
  };
  return {
    collection: (name: string) => makeCollection(name),
    runTransaction: async (callback: (tx: any) => Promise<unknown>) => {
      const transaction = {
        get: (ref: any) => ref.get(),
        set: (ref: any, payload: DocData, options?: { merge?: boolean }) => ref.set(payload, options),
        update: (ref: any, payload: DocData) => ref.update(payload),
        create: (ref: any, payload: DocData) => ref.set(payload),
      };
      await callback(transaction);
    },
  };
};

const buildHarness = (): Harness => {
  const harness: Harness = { store: {} };
  h.db = makeDb(harness);
  harness.store.classes = { 'lop-1': { teacherId: 'owner-1', name: '12 Toán LT1', grade: '12' } };
  harness.store['classes/lop-1/students'] = { 'hs-1': { name: 'Em A' } };
  harness.store.assignments = {
    'kt-1': { classId: 'lop-1', teacherId: 'owner-1', type: 'upload', title: 'Thi giữa HK1', isOpen: true, periodicTest: { sheetLabel: 'GHKI' }, examVariants: [{ code: '101', sourceText: 'Câu 1: ...', answerKey: 'Phần I – Câu 1: A' }] },
    'bvt-1': { classId: 'lop-1', teacherId: 'owner-1', type: 'upload', title: 'Bài vở nhà', isOpen: true },
  };
  harness.store.submissions = {
    'sub-1': { classId: 'lop-1', teacherId: 'owner-1', studentId: 'hs-1', assignmentId: 'kt-1', fileUrls: [], note: '', status: 'graded', handMarkedPaper: true, grade: { score: 8, maxScore: 10, teacherApproved: true, feedback: '', strengths: [], weaknesses: [], gradedAt: '' } },
  };
  return harness;
};

const call = async (body: DocData) => {
  const res = {
    statusCode: 0,
    payload: null as DocData | null,
    setHeader: () => undefined,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: DocData) { res.payload = payload; return res; },
  };
  await handler({ method: 'POST', body: { idToken: 'id-token', ...body } } as never, res as never);
  return res;
};

describe('bài kiểm tra định kì: sửa/thêm mã đề + đáp án', () => {
  beforeEach(() => { h.uid = 'owner-1'; h.email = 'owner@example.com'; });

  it('GV sửa được đáp án và thêm mã đề sau khi đã giao', async () => {
    const harness = buildHarness();
    const res = await call({
      action: 'updateAssignmentContent',
      assignmentId: 'kt-1',
      patch: {
        examVariants: [
          { code: '101', sourceText: 'Câu 1: ...', answerKey: 'Phần I – Câu 1: B' },
          { code: '102', sourceText: 'Câu 1: ...', answerKey: 'Phần I – Câu 1: A' },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    const variants = harness.store.assignments['kt-1'].examVariants as DocData[];
    expect(variants).toHaveLength(2);
    expect(variants[0]).toMatchObject({ code: '101', answerKey: 'Phần I – Câu 1: B' });
    expect(variants[1]).toMatchObject({ code: '102' });
  });

  it('mã đề thiếu đáp án thì từ chối; bài không phải kiểm tra định kì thì không có mã đề', async () => {
    buildHarness();
    const thieu = await call({ action: 'updateAssignmentContent', assignmentId: 'kt-1', patch: { examVariants: [{ code: '101', answerKey: '' }] } });
    expect(thieu.statusCode).toBe(422);
    const khongPhaiKT = await call({ action: 'updateAssignmentContent', assignmentId: 'bvt-1', patch: { examVariants: [{ code: '101', answerKey: 'A' }] } });
    expect(khongPhaiKT.statusCode).toBe(422);
  });

  it('bài chấm tay: GV bật/ẩn ảnh bài nộp cho phụ huynh', async () => {
    const harness = buildHarness();
    const bat = await call({ action: 'setSubmissionPhotosVisibility', role: 'teacher', submissionId: 'sub-1', classId: 'lop-1', studentId: 'hs-1', published: true });
    if (bat.statusCode !== 200) console.log('LOI 500 payload:', JSON.stringify(bat.payload));
    expect(bat.statusCode).toBe(200);
    expect(harness.store.submissions['sub-1'].handMarkedPublished).toBe(true);
    const an = await call({ action: 'setSubmissionPhotosVisibility', role: 'teacher', submissionId: 'sub-1', classId: 'lop-1', studentId: 'hs-1', published: false });
    expect(an.statusCode).toBe(200);
    expect(harness.store.submissions['sub-1'].handMarkedPublished).toBe(false);
  });

  it('học sinh không tự công bố được bài chấm tay', async () => {
    const harness = buildHarness();
    harness.store.studentLinks = { 'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'owner-1' } };
    h.uid = 'hs-uid';
    const res = await call({ action: 'setSubmissionPhotosVisibility', role: 'student', submissionId: 'sub-1', classId: 'lop-1', studentId: 'hs-1', published: true });
    expect(res.statusCode).toBe(403);
  });
});
