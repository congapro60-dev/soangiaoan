import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Danh mục câu hỏi phải do MÁY CHỦ đọc một lần rồi lưu vào bài giao.
 *
 * Trước đây nội dung câu hỏi không được lưu ở đâu: mỗi lần giáo viên bấm xem một câu trong báo
 * cáo, trình duyệt mới tải đề gốc về rồi OCR tại chỗ — hỏng ngay ở bước tải file nên màn hình
 * chỉ hiện "Failed to fetch" kèm một khối chữ dài.
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
}));

import handler from '../grade-homework';

type DocData = Record<string, unknown>;

interface Harness {
  state: Record<string, Record<string, DocData>>;
}

const makeDb = (harness: Harness) => {
  const ensure = (name: string) => {
    harness.state[name] ||= {};
    return harness.state[name];
  };
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
        teacherId: 'gv-1',
        classId: 'lop-1',
        title: 'BTVN Hình học',
        maxScore: 10,
        sourceText: 'Bài 3.5 – Ý 1: Tính cos A.\nBài 3.9: Tính chiều cao toà nhà.',
        ...assignment,
      },
    },
    gradingQuota: {
      'gv-1': { day: quotaDay, teacherCount: 0, selfCount: 0, gatewayCount: 0, byStudent: {} },
    },
  },
});

const geminiOk = (text: string) => ({
  ok: true,
  json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] }),
  text: async () => '',
});

const catalogJson = JSON.stringify({
  questions: [
    { questionNumber: 'Bài 3.5 – Ý 1', content: 'Tính $\\cos A$ của tam giác $ABC$.', maxScore: 2 },
    { questionNumber: 'Bài 3.9', content: 'Tính chiều cao toà nhà.' },
  ],
});

describe('gradeOne · buildQuestionCatalog', () => {
  beforeEach(() => {
    process.env.GRADING_GEMINI_API_KEY = 'test-key';
    h.uid = 'gv-1';
  });

  it('đọc đề một lần rồi LƯU danh mục vào bài giao', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    vi.stubGlobal('fetch', vi.fn(async () => geminiOk(catalogJson)));

    const result = await call({ action: 'buildQuestionCatalog', assignmentId: 'bai-1' });

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ cached: false });
    // Lưu lại mới là điểm mấu chốt: lần sau khỏi đọc đề nữa.
    expect(harness.state.assignments['bai-1'].questionCatalog).toEqual([
      { questionNumber: 'Bài 3.5 – Ý 1', content: 'Tính $\\cos A$ của tam giác $ABC$.', maxScore: 2 },
      { questionNumber: 'Bài 3.9', content: 'Tính chiều cao toà nhà.' },
    ]);
  });

  it('đã có danh mục thì dùng lại, không tốn thêm lượt gọi AI', async () => {
    const harness = seed({ questionCatalog: [{ questionNumber: 'Bài 1', content: 'Đề cũ đã lưu.' }] });
    h.db = makeDb(harness);
    const fetchMock = vi.fn(async () => geminiOk(catalogJson));
    vi.stubGlobal('fetch', fetchMock);

    const result = await call({ action: 'buildQuestionCatalog', assignmentId: 'bai-1' });

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ cached: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('giáo viên bấm đọc lại thì force đọc đề mới, ghi đè danh mục cũ', async () => {
    const harness = seed({ questionCatalog: [{ questionNumber: 'Bài 1', content: 'Đề cũ đã lưu.' }] });
    h.db = makeDb(harness);
    vi.stubGlobal('fetch', vi.fn(async () => geminiOk(catalogJson)));

    const result = await call({ action: 'buildQuestionCatalog', assignmentId: 'bai-1', force: true });

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ cached: false });
    expect((harness.state.assignments['bai-1'].questionCatalog as DocData[])).toHaveLength(2);
  });

  it('giáo viên lớp khác không đọc được đề của lớp này', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    h.uid = 'gv-khac';
    vi.stubGlobal('fetch', vi.fn(async () => geminiOk(catalogJson)));

    const result = await call({ action: 'buildQuestionCatalog', assignmentId: 'bai-1' });

    expect(result.statusCode).toBe(403);
    expect(harness.state.assignments['bai-1'].questionCatalog).toBeUndefined();
  });

  it('bài chưa có đề đọc được thì báo rõ, không lưu danh mục rỗng', async () => {
    const harness = seed({ sourceText: '', sourceImageUrls: [] });
    h.db = makeDb(harness);
    vi.stubGlobal('fetch', vi.fn(async () => geminiOk(catalogJson)));

    const result = await call({ action: 'buildQuestionCatalog', assignmentId: 'bai-1' });

    expect(result.statusCode).toBe(400);
    expect(String((result.body as DocData).error)).toMatch(/chưa có đề đọc được/i);
    expect(harness.state.assignments['bai-1'].questionCatalog).toBeUndefined();
  });
});
