import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  uid: 'gv-1',
  db: null as unknown,
  fetch: null as unknown,
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
  const query = (name: string, constraints: Array<{ field: string; operator: string; value: unknown }>) => ({
    where: (field: string, operator: string, value: unknown) => query(name, [...constraints, { field, operator, value }]),
    limit: (_count: number) => query(name, constraints),
    get: async () => ({
      docs: Object.entries(ensure(name))
        .filter(([, data]) => constraints.every(item => item.operator === 'in'
          ? Array.isArray(item.value) && item.value.includes(data[item.field])
          : data[item.field] === item.value))
        .map(([id, data]) => ({ id, data: () => ({ ...data }) })),
    }),
  });
  const collection = (name: string) => ({
    doc: (id: string) => ({
      get: async () => {
        const data = ensure(name)[id];
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
      },
      update: async (patch: DocData) => { ensure(name)[id] = { ...ensure(name)[id], ...patch }; },
      set: async (payload: DocData, options?: { merge?: boolean }) => {
        ensure(name)[id] = options?.merge ? { ...ensure(name)[id], ...payload } : { ...payload };
      },
      delete: async () => { delete ensure(name)[id]; },
    }),
    where: (field: string, operator: string, value: unknown) => query(name, [{ field, operator, value }]),
  });
  const runTransaction = async (work: (transaction: {
    get: (ref: { get: () => Promise<{ exists: boolean; data: () => DocData | undefined }> }) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
    update: (ref: { update: (patch: DocData) => Promise<void> }, patch: DocData) => void;
    set: (ref: { set: (payload: DocData, options?: { merge?: boolean }) => Promise<void> }, payload: DocData, options?: { merge?: boolean }) => void;
  }) => Promise<unknown>) => {
    const operations: Array<() => Promise<void>> = [];
    const result = await work({
      get: ref => ref.get(),
      update: (ref, patch) => { operations.push(() => ref.update(patch)); },
      set: (ref, payload, options) => { operations.push(() => ref.set(payload, options)); },
    });
    for (const operation of operations) await operation();
    return result;
  };
  return {
    collection,
    runTransaction,
  };
};

const makeResponse = () => {
  const state: { statusCode: number; body?: DocData } = { statusCode: 0 };
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

const makeGeminiResponse = (text: string, finishReason = 'STOP') => ({
  ok: true,
  json: async () => ({
    candidates: [{
      finishReason,
      ...(text ? { content: { parts: [{ text }] } } : {}),
    }],
  }),
  text: async () => '',
});

const makeImageResponse = () => ({
  ok: true,
  headers: { get: (name: string) => name.toLowerCase() === 'content-type' ? 'image/jpeg' : null },
  arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
});

type GeminiRequestBody = {
  contents?: Array<{ parts?: Array<{ text?: unknown }> }>;
};

const stubImageThenGeminiResponses = (...responses: ReturnType<typeof makeGeminiResponse>[]) => {
  let geminiIndex = 0;
  const promptTexts: string[] = [];
  h.fetch = vi.fn(async (url: unknown, init?: { body?: unknown }) => {
    if (typeof url === 'string' && url.startsWith('https://storage.test/')) {
      return makeImageResponse();
    }
    const request = JSON.parse(String(init?.body || '{}')) as GeminiRequestBody;
    const prompt = request.contents?.[0]?.parts?.find(part => typeof part.text === 'string')?.text;
    promptTexts.push(typeof prompt === 'string' ? prompt : '');
    return responses[Math.min(geminiIndex++, responses.length - 1)];
  });
  vi.stubGlobal('fetch', h.fetch);
  return promptTexts;
};

const gradeJson = (score: number) => JSON.stringify({
  score,
  maxScore: 10,
  feedbackForStudent: 'Em làm tốt phần trắc nghiệm.',
  noteForTeacher: '',
  strengths: ['Góc lượng giác'],
  weaknesses: [],
  weakTopics: [],
  questionResults: [{
    questionNumber: 'Phần I – Câu 1', status: 'correct', score: 0.25, maxScore: 0.25, studentAnswer: 'C', expectedAnswer: 'C',
    errorType: 'Không có', explanation: 'Đúng.', correction: '', nextPractice: '', needsTeacherReview: false, confidence: 0.95,
  }],
});

const quotaDay = new Date().toISOString().slice(0, 10);

const seed = (submission: DocData = {}, assignment: DocData = {}): Harness => ({
  state: {
    assignments: {
      'kt-1': {
        teacherId: 'gv-1', classId: 'lop-12', title: 'Kiểm tra giữa kì I', maxScore: 10,
        periodicTest: { sheetLabel: 'Giữa học kì I' },
        examVariants: [
          { code: '1201', sourceText: 'Mã đề 1201\nCâu 1. Đề mã 1201.', answerKey: 'Phần I – Câu 1: A' },
          { code: '1202', sourceText: 'Mã đề 1202\nCâu 1. Đề mã 1202.', answerKey: 'Phần I – Câu 1: C' },
        ],
        ...assignment,
      },
    },
    submissions: {
      'sub-1': {
        id: 'sub-1', teacherId: 'gv-1', classId: 'lop-12', studentId: 'hs-1', assignmentId: 'kt-1',
        fileUrls: ['https://storage.test/sub-1.jpg'], note: '', status: 'submitted',
        createdAt: '2026-10-06T09:00:00.000Z', updatedAt: '2026-10-06T09:00:00.000Z',
        ...submission,
      },
    },
    scoreBooks: { 'lop-12': { classId: 'lop-12', hs1Columns: [], hs1: {}, exams: { 'hs-1': { moet: [{ label: 'Giữa học kì I', score: 8 }], tds: [] } } } },
    gradingQuota: { 'gv-1': { day: quotaDay, teacherCount: 0, selfCount: 0, gatewayCount: 0, byStudent: {} } },
  },
});

describe('POST /api/grade-homework · bài kiểm tra định kì nhiều mã đề', () => {
  beforeEach(() => {
    process.env.GRADING_GEMINI_API_KEY = 'test-key';
    h.uid = 'gv-1';
  });

  it('AI đọc mã đề trên ảnh → chấm theo đúng đề + đáp án của mã đó, dặn bỏ qua nét chấm của giáo viên; lưu mã', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse('{"maDe": "1202"}'), makeGeminiResponse(gradeJson(8)));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });

    expect(result.statusCode).toBe(200);
    expect(prompts[0]).toContain('MỘT trong các mã: 1201, 1202');
    expect(prompts[1]).toContain('MÃ ĐỀ CỦA BÀI NÀY: 1202');
    expect(prompts[1]).toContain('Phần I – Câu 1: C');
    expect(prompts[1]).toContain('Đề mã 1202.');
    expect(prompts[1]).not.toContain('Phần I – Câu 1: A');
    expect(prompts[1]).toContain('BÀI KIỂM TRA ĐÃ ĐƯỢC GIÁO VIÊN CHẤM TAY TRƯỚC');
    expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'graded', examCode: '1202', examCodeSource: 'ai' });
  });

  it('không đọc được mã đề → KHÔNG đoán, không chấm; báo rõ để thầy cô chọn mã', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse('{"maDe": null}'), makeGeminiResponse(gradeJson(8)));

    await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });

    expect(prompts).toHaveLength(1);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'error',
      errorMessage: 'Máy chưa đọc được mã đề trên ảnh bài làm. Thầy cô chọn mã đề cho bài này rồi chấm lại.',
    });
    expect(harness.state.submissions['sub-1'].grade).toBeUndefined();
  });

  it('thầy cô đã chọn mã → không đọc lại trên ảnh, chấm theo mã đã chọn', async () => {
    const harness = seed({ examCode: '1201', examCodeSource: 'teacher' });
    h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(8)));

    await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('MÃ ĐỀ CỦA BÀI NÀY: 1201');
    expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'graded', examCode: '1201', examCodeSource: 'teacher' });
  });

  it('đối chiếu sổ điểm: lệch > 0,5 → gắn cờ lệch (không tự duyệt); khớp → ghi khớp', async () => {
    const lech = seed({ examCode: '1201', examCodeSource: 'teacher' });
    h.db = makeDb(lech);
    stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(6)));
    await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });
    expect((lech.state.submissions['sub-1'].grade as DocData).examCheck).toEqual({ sheetLabel: 'Giữa học kì I', sheetScore: 8, diff: 2, mismatch: true });

    const khop = seed({ examCode: '1201', examCodeSource: 'teacher' });
    h.db = makeDb(khop);
    stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(8)));
    await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });
    expect((khop.state.submissions['sub-1'].grade as DocData).examCheck).toMatchObject({ mismatch: false, diff: 0 });
  });

  it('đáp án đã sửa chỉ áp cho bài cùng mã đề', async () => {
    const harness = seed({ examCode: '1202', examCodeSource: 'teacher' }, {
      answerKeyFixes: [{ questionNumber: 'Phần I – Câu 2', expectedAnswer: 'B-MA-1201', fixedAt: '2026-10-06', examCode: '1201' }],
    });
    h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(8)));

    await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });

    expect(prompts[0]).not.toContain('B-MA-1201');
  });

  it('bài định kì: không tách danh mục câu chung, không gắn nhãn năng lực', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    harness.state.classes = { 'lop-12': { teacherId: 'gv-1', name: '12A', grade: '12' } };
    stubImageThenGeminiResponses(makeGeminiResponse('{}'));

    const catalog = await call({ action: 'buildQuestionCatalog', assignmentId: 'kt-1', force: true });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.body).toMatchObject({ questionCatalog: [], competencyTags: [], periodic: true });
    expect(h.fetch).not.toHaveBeenCalled();

    const tags = await call({ action: 'setAssignmentCompetencyTags', assignmentId: 'kt-1', tags: [{ competencyId: 'g12-dao-ham' }] });
    expect(tags.statusCode).toBe(400);
    expect(harness.state.assignments['kt-1'].competencyTags).toBeUndefined();
  });
});
