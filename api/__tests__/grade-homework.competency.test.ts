import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Nhãn năng lực (GĐ2b + GĐ3b): AI gắn theo khung khối khi đọc đề, và giáo viên duyệt/sửa rồi khoá.
 * Nhãn đã duyệt là chuẩn — đọc đề lại KHÔNG được đè.
 */

const h = vi.hoisted(() => ({ uid: 'gv-1', db: null as unknown }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }) }),
}));
vi.mock('../_exam-core.js', () => ({ getAdminDb: () => h.db }));

import handler from '../grade-homework';

type DocData = Record<string, unknown>;
interface Harness { state: Record<string, Record<string, DocData>>; }

const makeDb = (harness: Harness) => {
  const ensure = (name: string) => { harness.state[name] ||= {}; return harness.state[name]; };
  return {
    collection: (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = ensure(name)[id];
          return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
        },
        update: async (patch: DocData) => { ensure(name)[id] = { ...ensure(name)[id], ...patch }; },
        set: async (payload: DocData, options?: { merge?: boolean }) => {
          ensure(name)[id] = options?.merge ? { ...ensure(name)[id], ...payload } : { ...payload };
        },
      }),
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

const quotaDay = new Date().toISOString().slice(0, 10);

const seed = (assignment: DocData = {}): Harness => ({
  state: {
    assignments: {
      'bai-1': {
        teacherId: 'gv-1', classId: 'lop-1', title: 'BTVN Hình học', maxScore: 10,
        sourceText: 'Bài 1: Tính cos A.', ...assignment,
      },
    },
    classes: { 'lop-1': { teacherId: 'gv-1', name: '10Olinda', grade: '10' } },
    gradingQuota: { 'gv-1': { day: quotaDay, teacherCount: 0, selfCount: 0, gatewayCount: 0, byStudent: {} } },
  },
});

const geminiOk = (text: string) => ({
  ok: true,
  json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }),
  text: async () => '',
});

describe('buildQuestionCatalog · gắn nhãn năng lực theo khung khối', () => {
  beforeEach(() => { process.env.GRADING_GEMINI_API_KEY = 'test-key'; h.uid = 'gv-1'; });

  it('đọc đề sinh nhãn hợp lệ, loại id ngoài khung, lưu vào bài', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    vi.stubGlobal('fetch', vi.fn(async () => geminiOk(JSON.stringify({
      questions: [{ questionNumber: 'Bài 1', content: 'Tính $\\cos A$.' }],
      competencyTags: [
        { competencyId: 'g10-he-thuc-luong-tam-giac', confidence: 0.9, reason: 'định lý cos' },
        { competencyId: 'g99-khong-co-that', confidence: 0.8, reason: 'bịa' },
      ],
    }))));

    const result = await call({ action: 'buildQuestionCatalog', assignmentId: 'bai-1' });

    expect(result.statusCode).toBe(200);
    expect(harness.state.assignments['bai-1'].competencyTags).toEqual([
      { competencyId: 'g10-he-thuc-luong-tam-giac', confidence: 0.9, reason: 'định lý cos' },
    ]);
  });
});

describe('setAssignmentCompetencyTags · giáo viên duyệt', () => {
  beforeEach(() => { h.uid = 'gv-1'; });

  it('lưu nhãn tay hợp lệ, mặc định confidence 1, khoá approved; loại id ngoài khung', async () => {
    const harness = seed();
    h.db = makeDb(harness);

    const result = await call({ action: 'setAssignmentCompetencyTags', assignmentId: 'bai-1', tags: [
      { competencyId: 'g10-vecto-va-phep-toan' },
      { competencyId: 'g99-bia' },
    ] });

    expect(result.statusCode).toBe(200);
    expect(harness.state.assignments['bai-1'].competencyTags).toEqual([
      { competencyId: 'g10-vecto-va-phep-toan', confidence: 1, reason: '' },
    ]);
    expect(harness.state.assignments['bai-1'].competencyTagsApproved).toBe(true);
  });

  it('giáo viên lớp khác bị chặn', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    h.uid = 'gv-khac';

    const result = await call({ action: 'setAssignmentCompetencyTags', assignmentId: 'bai-1', tags: [{ competencyId: 'g10-vecto-va-phep-toan' }] });

    expect(result.statusCode).toBe(403);
    expect(harness.state.assignments['bai-1'].competencyTags).toBeUndefined();
  });

  it('nhãn đã duyệt thì đọc lại đề KHÔNG đè', async () => {
    const harness = seed({
      competencyTags: [{ competencyId: 'g10-vecto-va-phep-toan', confidence: 1, reason: '' }],
      competencyTagsApproved: true,
    });
    h.db = makeDb(harness);
    process.env.GRADING_GEMINI_API_KEY = 'test-key';
    vi.stubGlobal('fetch', vi.fn(async () => geminiOk(JSON.stringify({
      questions: [{ questionNumber: 'Bài 1', content: 'Tính $\\cos A$.' }],
      competencyTags: [{ competencyId: 'g10-he-thuc-luong-tam-giac', confidence: 0.9, reason: 'khác' }],
    }))));

    const result = await call({ action: 'buildQuestionCatalog', assignmentId: 'bai-1', force: true });

    expect(result.statusCode).toBe(200);
    expect(harness.state.assignments['bai-1'].competencyTags).toEqual([
      { competencyId: 'g10-vecto-va-phep-toan', confidence: 1, reason: '' },
    ]);
    // danh mục câu vẫn được làm mới.
    expect((harness.state.assignments['bai-1'].questionCatalog as DocData[])).toHaveLength(1);
  });
});
