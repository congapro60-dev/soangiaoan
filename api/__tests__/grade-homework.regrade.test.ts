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
import { classMemberId } from '../_classroom-access';

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

  it('mode quick chấm trực tiếp và không lưu bản chép bài làm', async () => {
    const harness = seed();
    harness.state.submissions['sub-1'].fileUrls = ['https://storage.test/sub-1.jpg'];
    h.db = makeDb(harness);
    stubImageThenGeminiResponses(makeGeminiResponse(validGradeJson(6)));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });

    expect(result.statusCode).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({ score: 6, teacherApproved: false }),
    });
    expect((harness.state.submissions['sub-1'].grade as DocData).transcription).toBeUndefined();
  });

  it('mode thorough chạy pha chép và lưu transcription vào grade', async () => {
    const harness = seed();
    harness.state.submissions['sub-1'].fileUrls = ['https://storage.test/sub-1.jpg'];
    h.db = makeDb(harness);
    stubImageThenGeminiResponses(
      makeGeminiResponse(JSON.stringify({ transcription: 'Bản chép bài làm.' })),
      makeGeminiResponse(validGradeJson(7)),
    );

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'thorough' });

    expect(result.statusCode).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(3);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({ score: 7, transcription: 'Bản chép bài làm.' }),
    });
  });

  it('học sinh gửi mode thorough vẫn bị ép chấm nhanh', async () => {
    const harness = seed();
    harness.state.studentLinks = { 'student-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' } };
    harness.state.submissions['sub-1'] = {
      ...harness.state.submissions['sub-1'],
      status: 'submitted',
      grade: undefined,
      fileUrls: ['https://storage.test/sub-1.jpg'],
    };
    h.uid = 'student-uid';
    h.db = makeDb(harness);
    stubImageThenGeminiResponses(makeGeminiResponse(validGradeJson(8)));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'thorough' });

    expect(result.statusCode).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(2);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'graded',
      // Học sinh tự nộp cũng KHÔNG được tự duyệt: điểm chỉ tới em sau khi thầy cô duyệt.
      grade: expect.objectContaining({ score: 8, teacherApproved: false }),
    });
    expect((harness.state.submissions['sub-1'].grade as DocData).transcription).toBeUndefined();
  });

  it('học sinh chỉ được quét bài một lần: đã có kết quả (chưa duyệt) thì gọi lại bị chặn, không xoá câu em đã xác nhận', async () => {
    const harness = seed();
    harness.state.studentLinks = { 'student-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' } };
    harness.state.submissions['sub-1'] = {
      ...harness.state.submissions['sub-1'],
      status: 'graded',
      fileUrls: ['https://storage.test/sub-1.jpg'],
      grade: { score: 5, maxScore: 10, feedback: '', strengths: [], weaknesses: [], gradedAt: '2026-09-01T00:00:00.000Z', teacherApproved: false },
    };
    h.uid = 'student-uid';
    h.db = makeDb(harness);
    stubImageThenGeminiResponses(makeGeminiResponse(validGradeJson(9)));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(403);
    expect(h.fetch).not.toHaveBeenCalled();
    expect(harness.state.submissions['sub-1']).toMatchObject({ grade: expect.objectContaining({ score: 5 }) });
  });

  it('co-owner được chấm lại bằng AI trong namespace của chủ lớp', async () => {
    const harness = seed();
    harness.state.classes = {
      'lop-1': { teacherId: 'gv-1', ownerId: 'gv-1', originalOwnerId: 'gv-1', name: '11 Columbus' },
    };
    harness.state.classMembers = {
      [classMemberId('lop-1', 'co-1')]: { classId: 'lop-1', uid: 'co-1', role: 'co_owner', status: 'active' },
    };
    h.uid = 'co-1';
    h.db = makeDb(harness);
    stubGeminiResponses(makeGeminiResponse(validGradeJson(6)));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(harness.state.submissions['sub-1']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({ score: 6, teacherApproved: false }),
    });
    expect(Object.values(harness.state.submissionGradeHistory || {})).toEqual([
      expect.objectContaining({ action: 'ai_regrade', actorUid: 'co-1' }),
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

  describe('bài chưa từng có điểm mà chấm hỏng', () => {
    const seedChuaCham = (): Harness => {
      const harness = seed();
      const { grade: _bo, ...khongDiem } = harness.state.submissions['sub-1'];
      harness.state.submissions['sub-1'] = { ...khongDiem, status: 'submitted' };
      return harness;
    };

    it('hai response schema-invalid: nhãn định dạng đúng chỗ, lỗi thô được giữ và có log', async () => {
      const harness = seedChuaCham();
      h.db = makeDb(harness);
      const logLoi = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      stubGeminiResponses(
        makeGeminiResponse(JSON.stringify({ score: 6, maxScore: 10, noteForTeacher: 'Thiếu feedback.' })),
        makeGeminiResponse(JSON.stringify({ score: 6, maxScore: 10, noteForTeacher: 'Vẫn thiếu feedback.' })),
      );

      const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

      expect(result.statusCode).toBe(422);
      expect(harness.state.submissions['sub-1']).toMatchObject({
        status: 'error',
        errorMessage: expect.stringMatching(/lỗi định dạng/),
        lastGradingErrorRaw: expect.stringContaining('feedbackForStudent'),
      });
      expect(logLoi).toHaveBeenCalledWith('[grade-homework] lượt chấm hỏng', expect.objectContaining({ submissionId: 'sub-1', hadPreviousGrade: false }));
      logLoi.mockRestore();
    });

    it('RECITATION lần đầu thì thử lại kèm lời dặn riêng và chấm được', async () => {
      const harness = seedChuaCham();
      h.db = makeDb(harness);
      const promptTexts = stubGeminiResponses(makeGeminiResponse('', 'RECITATION'), makeGeminiResponse(validGradeJson(7)));

      const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

      expect(result.statusCode).toBe(200);
      expect(h.fetch).toHaveBeenCalledTimes(2);
      expect(promptTexts[0]).not.toContain('NGHI NỘI DUNG GIỐNG TÀI LIỆU CÓ SẴN');
      expect(promptTexts[1]).toContain('NGHI NỘI DUNG GIỐNG TÀI LIỆU CÓ SẴN');
      expect(harness.state.submissions['sub-1']).toMatchObject({
        status: 'graded',
        grade: expect.objectContaining({
          score: 7,
          gradingRecovery: expect.objectContaining({ retryCount: 1, repairKinds: expect.arrayContaining(['recitation_retry']) }),
        }),
      });
    });

    it('RECITATION cả hai lần: báo đúng mã, trả lỗi thô cho giáo viên, không chấm bừa', async () => {
      const harness = seedChuaCham();
      h.db = makeDb(harness);
      const logLoi = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      stubGeminiResponses(makeGeminiResponse('', 'RECITATION'), makeGeminiResponse('', 'RECITATION'));

      const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

      expect(result.statusCode).toBe(422);
      expect(h.fetch).toHaveBeenCalledTimes(2);
      expect(String(result.body?.error)).toMatch(/RECITATION/);
      expect(String(result.body?.lastGradingErrorRaw)).toMatch(/RECITATION/);
      expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'error' });
      expect((harness.state.submissions['sub-1'] as DocData).grade).toBeUndefined();
      logLoi.mockRestore();
    });

    it('lỗi mạng khi gọi Gemini: lỗi thô giữ nguyên nhân gốc, thông báo vẫn là câu an toàn', async () => {
      const harness = seedChuaCham();
      h.db = makeDb(harness);
      const logLoi = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const canhBao = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      h.fetch = vi.fn(async () => { throw new TypeError('getaddrinfo ENOTFOUND generativelanguage.googleapis.com'); });
      vi.stubGlobal('fetch', h.fetch);

      const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

      expect(result.statusCode).toBe(422);
      const luu = harness.state.submissions['sub-1'];
      expect(luu).toMatchObject({
        status: 'error',
        errorMessage: 'Không gọi được Gemini lúc này. Thử lại sau ít phút.',
        lastGradingErrorRaw: expect.stringContaining('ENOTFOUND'),
      });
      logLoi.mockRestore();
      canhBao.mockRestore();
    });

    it('lỗi hệ thống ngoài AI không bị gắn nhãn lỗi định dạng', async () => {
      const harness = seedChuaCham();
      const db = makeDb(harness);
      let soGiaoDich = 0;
      h.db = {
        ...db,
        runTransaction: async (work: Parameters<typeof db.runTransaction>[0]) => {
          soGiaoDich += 1;
          if (soGiaoDich === 2) throw new Error('10 ABORTED: Too much contention');
          return db.runTransaction(work);
        },
      };
      const logLoi = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      stubGeminiResponses(makeGeminiResponse(validGradeJson(7)));

      const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

      expect(result.statusCode).toBe(422);
      const luu = harness.state.submissions['sub-1'];
      expect(luu).toMatchObject({ status: 'error', lastGradingErrorRaw: expect.stringContaining('ABORTED') });
      expect(String(luu.errorMessage)).toMatch(/lỗi hệ thống/);
      expect(String(luu.errorMessage)).not.toMatch(/định dạng/);
      logLoi.mockRestore();
    });
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

  it('gradeAssignment: bài đầu chậm tới mức bài sau không còn đủ giờ thì dừng lô, không bắt đầu bài mới', async () => {
    const baiNop = (id: string, hs: string, gio: string) => ({
      id, teacherId: 'gv-1', classId: 'lop-1', studentId: hs, assignmentId: 'asg-1',
      fileUrls: [], textContent: 'Bài làm', note: '', status: 'submitted',
      createdAt: `2026-08-25T${gio}:00.000Z`, updatedAt: `2026-08-25T${gio}:00.000Z`,
    });
    const harness: Harness = {
      state: {
        assignments: { 'asg-1': { id: 'asg-1', teacherId: 'gv-1', classId: 'lop-1', title: 'Bài kiểm tra', maxScore: 10 } },
        submissions: { 'sub-cham': baiNop('sub-cham', 'hs-1', '09:00'), 'sub-sau': baiNop('sub-sau', 'hs-2', '09:01') },
        gradingQuota: { 'gv-1': { day: quotaDay, teacherCount: 0, selfCount: 0, gatewayCount: 0, byStudent: {} } },
      },
    };
    h.db = makeDb(harness);
    // Bài đầu "mất" 60s: hàm đã dùng quá phần giờ cho phép bắt đầu thêm một bài tốn tới GRADING_BUDGET_MS.
    let troiQua = 0;
    const thatNow = Date.now.bind(Date);
    const dongHo = vi.spyOn(Date, 'now').mockImplementation(() => thatNow() + troiQua);
    h.fetch = vi.fn(async () => { troiQua += 60_000; return makeGeminiResponse(validGradeJson(7)); });
    vi.stubGlobal('fetch', h.fetch);

    const result = await call({ action: 'gradeAssignment', assignmentId: 'asg-1' });
    dongHo.mockRestore();

    expect(result.statusCode).toBe(200);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(result.body).toMatchObject({ graded: 1, failed: 0, remaining: 1 });
    expect(harness.state.submissions['sub-cham']).toMatchObject({ status: 'graded' });
    expect(harness.state.submissions['sub-sau']).toMatchObject({ status: 'submitted' });
    expect(harness.state.gradingQuota?.['gv-1']).toMatchObject({ teacherCount: 1 });
  });

it('co-owner được chấm AI cả lớp và quota ghi theo actor đang thao tác', async () => {
    const harness: Harness = {
      state: {
        classes: {
          'lop-1': { teacherId: 'gv-1', ownerId: 'gv-1', originalOwnerId: 'gv-1', name: '11 Columbus' },
        },
        classMembers: {
          [classMemberId('lop-1', 'co-1')]: { classId: 'lop-1', uid: 'co-1', role: 'co_owner', status: 'active' },
        },
        assignments: {
          'asg-1': {
            id: 'asg-1', teacherId: 'gv-1', classId: 'lop-1', title: 'Bài kiểm tra', maxScore: 10,
          },
        },
        submissions: {
          'sub-1': {
            id: 'sub-1', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
            fileUrls: [], textContent: 'Bài làm hợp lệ', note: '', status: 'submitted',
            createdAt: '2026-08-25T09:00:00.000Z', updatedAt: '2026-08-25T09:00:00.000Z',
          },
        },
        gradingQuota: {
          'co-1': {
            day: quotaDay,
            teacherCount: 0,
            selfCount: 0,
            gatewayCount: 0,
            byStudent: {},
          },
        },
      },
    };
    h.uid = 'co-1';
    h.db = makeDb(harness);
    stubGeminiResponses(makeGeminiResponse(validGradeJson(7)));

    const result = await call({ action: 'gradeAssignment', assignmentId: 'asg-1' });

    expect(result.statusCode).toBe(200);
    expect(result.body).toMatchObject({ graded: 1, failed: 0, remaining: 0 });
    expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'graded' });
    expect(harness.state.gradingQuota?.['co-1']).toMatchObject({ teacherCount: 1 });
  });

it('teacher regrade: removeSubmissionGradeEvidence failure does NOT turn committed grade into failure', async () => {
    const harness = seed();
    harness.state.studentProfiles = {
      'hs-1': {
        studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1',
        topics: [{ topic: 'Chủ đề cũ', level: 'weak', evidenceSubmissionIds: ['sub-1'], updatedAt: '2026-08-24T10:00:00.000Z' }],
      },
    };
    harness.state.studentSkillEvidence = {
      'hs-1__sub-1%3Amath.line-equation': {
        studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1', submissionId: 'sub-1', skillId: 'math.line-equation',
        evidenceId: 'sub-1:math.line-equation', source: 'homework', approved: true,
      },
    };
    h.db = makeDb(harness);
    stubGeminiResponses(makeGeminiResponse(validGradeJson(7)));

    // Force removeSubmissionGradeEvidence to fail by making the studentProfiles collection's set throw
    const originalCollection = h.db.collection;
    h.db.collection = vi.fn((name: string) => {
      const col = originalCollection(name);
      if (name === 'studentProfiles') {
        return {
          ...col,
          doc: (id: string) => ({
            ...col.doc(id),
            set: async () => { throw new Error('Evidence cleanup failed'); },
            get: async () => ({ exists: true, data: () => harness.state.studentProfiles['hs-1'] }),
          }),
        };
      }
      return col;
    });

    try {
      const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

      // Should still succeed because grade was committed before evidence cleanup
      expect(result.statusCode).toBe(200);
      expect(result.body).toMatchObject({ graded: 1, failed: 0, remaining: 0 });
      // Grade should be committed with teacherApproved=false (teacher regrade)
      expect(harness.state.submissions['sub-1']).toMatchObject({
        status: 'graded',
        grade: expect.objectContaining({ score: 7, teacherApproved: false }),
      });
      // History should have been created
      expect(Object.values(harness.state.submissionGradeHistory || {})).toEqual([
        expect.objectContaining({ action: 'ai_regrade', actorUid: 'gv-1', grade: oldGrade }),
      ]);
      // evidenceSyncError should be set with the cleanup error
      expect(typeof harness.state.submissions['sub-1'].evidenceSyncError).toBe('string');
      expect(harness.state.submissions['sub-1'].evidenceSyncError.length).toBeGreaterThan(0);
    } finally {
      h.db.collection = originalCollection;
    }
  });
});
