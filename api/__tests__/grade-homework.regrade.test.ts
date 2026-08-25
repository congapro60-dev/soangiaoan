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

type GeminiRequestBody = {
  contents?: Array<{ parts?: Array<{ text?: unknown }> }>;
};

const stubGeminiResponses = (...responses: ReturnType<typeof makeGeminiResponse>[]) => {
  let index = 0;
  const promptTexts: string[] = [];
  h.fetch = vi.fn(async (_url: unknown, init?: { body?: unknown }) => {
    const request = JSON.parse(String(init?.body || '{}')) as GeminiRequestBody;
    const prompt = request.contents?.[0]?.parts?.find(part => typeof part.text === 'string')?.text;
    promptTexts.push(typeof prompt === 'string' ? prompt : '');
    return responses[Math.min(index++, responses.length - 1)];
  });
  vi.stubGlobal('fetch', h.fetch);
  return promptTexts;
};

const validGradeJson = (score = 6) => JSON.stringify({
  score,
  maxScore: 10,
  feedbackForStudent: 'Em cần trình bày rõ hơn.',
  noteForTeacher: 'AI chưa chắc ở câu cuối.',
  strengths: ['Biết lập luận'],
  weaknesses: ['Thiếu kết luận'],
  weakTopics: ['Trình bày kết luận'],
  questionResults: [],
});

const oldGrade = {
  score: 8,
  maxScore: 10,
  feedback: 'Nhận xét cũ',
  strengths: [],
  weaknesses: [],
  weakTopics: ['Chủ đề cũ'],
  teacherApproved: false,
  gradedAt: '2026-08-24T10:00:00.000Z',
};

const quotaDay = new Date().toISOString().slice(0, 10);

const seed = (): Harness => ({
  state: {
    submissions: {
      'sub-1': {
        id: 'sub-1', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: null,
        fileUrls: [], textContent: 'Bài làm của em', note: '', status: 'graded', grade: oldGrade,
        createdAt: '2026-08-24T09:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z',
      },
    },
    gradingQuota: {
      'gv-1': {
        day: quotaDay,
        teacherCount: 0,
        selfCount: 0,
        gatewayCount: 0,
        byStudent: {},
      },
    },
  },
});

describe('POST /api/grade-homework · gradeOne regrade safety', () => {
  beforeEach(() => {
    process.env.GRADING_GEMINI_API_KEY = 'test-key';
    h.uid = 'gv-1';
  });

  it('AI chấm lại lưu grade cũ vào history và kết quả mới chưa duyệt', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    h.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({
        score: 6,
        maxScore: 10,
        feedbackForStudent: 'Em cần trình bày rõ hơn.',
        noteForTeacher: 'AI chưa chắc ở câu cuối.',
        strengths: ['Biết lập luận'],
        weaknesses: ['Thiếu kết luận'],
        weakTopics: ['Trình bày kết luận'],
        questionResults: [],
      }) }] } }] }),
      text: async () => '',
    }));
    vi.stubGlobal('fetch', h.fetch);

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({ score: 6, teacherApproved: false }),
      textContent: 'Bài làm của em',
    });
    expect(Object.values(harness.state.submissionGradeHistory || {})).toEqual([
      expect.objectContaining({ action: 'ai_regrade', actorUid: 'gv-1', grade: oldGrade }),
    ]);
  });

  it('AI lỗi thì giữ nguyên điểm cũ, không tạo history giả và trả lỗi để thử lại', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    h.fetch = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => 'provider down' }));
    vi.stubGlobal('fetch', h.fetch);

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(422);
    expect(result.body?.error).toMatch(/giữ nguyên|chấm lại/i);
    expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'graded', grade: oldGrade });
    expect(harness.state.submissionGradeHistory).toBeUndefined();
  });

  it('AI trả JSON có raw LaTeX \\in thì repair và vẫn commit được grade mới', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    const rawWithLatex = '{"score":6,"maxScore":10,"feedbackForStudent":"Em làm đúng: D \\in (SAB).","noteForTeacher":"Có thể duyệt sau khi xem lại.","strengths":[],"weaknesses":[],"weakTopics":[],"questionResults":[]}';
    stubGeminiResponses(makeGeminiResponse(rawWithLatex));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({
        score: 6,
        feedback: expect.stringContaining('\\in'),
        teacherApproved: false,
        gradingRecovery: expect.objectContaining({
          mode: 'syntax_repaired',
          retryCount: 0,
          repairKinds: expect.arrayContaining(['latex_backslash']),
        }),
      }),
    });
  });

  it('schema-invalid lần đầu thì retry và commit response hợp lệ lần sau', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    const rawSentinel = 'RAW_SENTINEL_123';
    const schemaInvalid = JSON.stringify({ score: 6, maxScore: 10, noteForTeacher: `Thiếu feedback ${rawSentinel}.` });
    const promptTexts = stubGeminiResponses(makeGeminiResponse(schemaInvalid), makeGeminiResponse(validGradeJson(7)));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(promptTexts).toHaveLength(2);
    expect(promptTexts[1]).not.toContain(rawSentinel);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({
        score: 7,
        teacherApproved: false,
        gradingRecovery: expect.objectContaining({
          mode: 'retry_recovered',
          retryCount: 1,
        }),
      }),
    });
    expect(harness.state.gradingQuota?.['gv-1']).toMatchObject({ teacherCount: 1, selfCount: 0 });
  });

  it('cả hai response schema-invalid thì giữ grade cũ và không tạo history giả', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    const firstInvalid = JSON.stringify({ score: 6, maxScore: 10, noteForTeacher: 'Thiếu feedback.' });
    const secondInvalid = JSON.stringify({ score: 'bảy', maxScore: 10, feedbackForStudent: 'Sai kiểu điểm.' });
    stubGeminiResponses(makeGeminiResponse(firstInvalid), makeGeminiResponse(secondInvalid));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(422);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(result.body?.error).toMatch(/giữ nguyên|chấm lại|không hợp lệ/i);
    expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'graded', grade: oldGrade });
    expect(harness.state.submissionGradeHistory).toBeUndefined();
  });

  it('Gemini SAFETY thì giữ grade cũ và trả lỗi an toàn để thử lại', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    stubGeminiResponses(makeGeminiResponse('', 'SAFETY'));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(422);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    const errorText = String(result.body?.error || '');
    expect(errorText).toMatch(/giữ nguyên|chấm lại/i);
    expect(errorText).not.toMatch(/SAFETY|provider down/i);
    expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'graded', grade: oldGrade });
    expect(harness.state.submissionGradeHistory).toBeUndefined();
  });

  it('worker AI cũ không được ghi đè điểm mới sau khi mất claim', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    let release!: (response: Response) => void;
    h.fetch = vi.fn(() => new Promise<Response>(resolve => { release = resolve; }));
    vi.stubGlobal('fetch', h.fetch);

    const pending = call({ action: 'gradeOne', submissionId: 'sub-1' });
    for (let attempt = 0; attempt < 20 && harness.state.submissions['sub-1'].status !== 'grading'; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'grading' });

    harness.state.submissions['sub-1'] = {
      ...harness.state.submissions['sub-1'],
      status: 'graded',
      grade: { ...oldGrade, score: 9, feedback: 'Điểm mới do giáo viên lưu' },
      gradingRunId: null,
      updatedAt: '2026-08-25T01:00:00.000Z',
    };
    release({
      ok: true,
      json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({
        score: 2,
        maxScore: 10,
        feedbackForStudent: 'Kết quả cũ không được dùng.',
        noteForTeacher: '',
        strengths: [],
        weaknesses: [],
        weakTopics: [],
        questionResults: [],
      }) }] } }] }),
      text: async () => '',
    } as Response);

    const result = await pending;

    expect(result.statusCode).toBe(422);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({ score: 9, feedback: 'Điểm mới do giáo viên lưu' }),
    });
    expect(harness.state.submissionGradeHistory).toBeUndefined();
  });

  it('học sinh không được tự thay thế kết quả đã giáo viên duyệt', async () => {
    const harness = seed();
    harness.state.studentLinks = { 'student-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' } };
    harness.state.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: true };
    h.uid = 'student-uid';
    h.db = makeDb(harness);

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(403);
    expect(harness.state.submissions['sub-1'].grade).toMatchObject({ score: 8, teacherApproved: true });
  });

  it('gradeAssignment không dừng batch khi submission trước thất bại', async () => {
    const harness: Harness = {
      state: {
        assignments: {
          'asg-1': {
            id: 'asg-1', teacherId: 'gv-1', classId: 'lop-1', title: 'Bài kiểm tra', maxScore: 10,
          },
        },
        submissions: {
          'sub-fail': {
            id: 'sub-fail', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
            fileUrls: [], textContent: 'Bài làm lỗi schema', note: '', status: 'submitted',
            createdAt: '2026-08-25T09:00:00.000Z', updatedAt: '2026-08-25T09:00:00.000Z',
          },
          'sub-next': {
            id: 'sub-next', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-2', assignmentId: 'asg-1',
            fileUrls: [], textContent: 'Bài làm hợp lệ', note: '', status: 'submitted',
            createdAt: '2026-08-25T09:01:00.000Z', updatedAt: '2026-08-25T09:01:00.000Z',
          },
        },
        gradingQuota: {
          'gv-1': {
            day: quotaDay,
            teacherCount: 0,
            selfCount: 0,
            gatewayCount: 0,
            byStudent: {},
          },
        },
      },
    };
    h.db = makeDb(harness);
    const firstInvalid = JSON.stringify({ score: 6, maxScore: 10, noteForTeacher: 'Thiếu feedback.' });
    stubGeminiResponses(
      makeGeminiResponse(firstInvalid),
      makeGeminiResponse(firstInvalid),
      makeGeminiResponse(validGradeJson(7)),
    );

    const result = await call({ action: 'gradeAssignment', assignmentId: 'asg-1' });

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ graded: 1, failed: 1, remaining: 0 });
    expect(h.fetch).toHaveBeenCalledTimes(3);
    expect(harness.state.submissions['sub-fail']).toMatchObject({ status: 'error' });
    expect(harness.state.submissions['sub-fail'].grade).toBeUndefined();
    expect(harness.state.submissions['sub-next']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({ score: 7, teacherApproved: false }),
    });
    expect(harness.state.gradingQuota?.['gv-1']).toMatchObject({ teacherCount: 2, selfCount: 0 });
  });
});
