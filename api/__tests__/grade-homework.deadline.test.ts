import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Hồi quy cho sự cố thật ngày 06–08/09/2026: cả lớp treo nhãn "Đang chấm" từ 20h, giáo viên
 * không gỡ được, vài em hiện "Lỗi".
 *
 * Hai nguyên nhân gốc được khoá lại ở đây:
 *   1. Lượt chấm không có trần thời gian → Vercel giết hàm ở 60s → không nhánh nào kịp mở khoá
 *      → bài nộp nằm lại `status='grading'` vĩnh viễn.
 *   2. `maxOutputTokens` quá chật → câu trả lời bị cắt (`MAX_TOKENS`) → hỏng cả lượt chấm.
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
    }),
  });
  const runTransaction = async (work: (transaction: {
    get: (ref: { get: () => Promise<{ exists: boolean; data: () => DocData | undefined }> }) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
    update: (ref: { update: (patch: DocData) => Promise<void> }, patch: DocData) => void;
  }) => Promise<unknown>) => {
    const pending: Promise<void>[] = [];
    const result = await work({
      get: ref => ref.get(),
      update: (ref, patch) => { pending.push(ref.update(patch)); },
    });
    await Promise.all(pending);
    return result;
  };
  return { collection, runTransaction };
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

/** Bài chưa từng có điểm — đúng tình huống học sinh vừa nộp rồi nhờ máy chấm. */
const seed = (): Harness => ({
  state: {
    submissions: {
      'sub-1': {
        id: 'sub-1', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: null,
        fileUrls: [], textContent: 'Bài làm của em', note: '', status: 'submitted',
        createdAt: '2026-09-07T13:00:00.000Z', updatedAt: '2026-09-07T13:00:00.000Z',
      },
    },
    gradingQuota: {
      'gv-1': { day: quotaDay, teacherCount: 0, selfCount: 0, gatewayCount: 0, byStudent: {} },
    },
  },
});

const geminiOk = (text: string, finishReason = 'STOP') => ({
  ok: true,
  json: async () => ({ candidates: [{ finishReason, ...(text ? { content: { parts: [{ text }] } } : {}) }] }),
  text: async () => '',
});

const validGradeJson = JSON.stringify({
  score: 6,
  maxScore: 10,
  feedbackForStudent: 'Em cần trình bày rõ hơn.',
  noteForTeacher: 'Soát lại câu cuối.',
  strengths: ['Biết lập luận'],
  weaknesses: ['Thiếu kết luận'],
  weakTopics: ['Trình bày kết luận'],
  questionResults: [],
});

describe('gradeOne · trần thời gian và trần token', () => {
  beforeEach(() => {
    process.env.GRADING_GEMINI_API_KEY = 'test-key';
    h.uid = 'gv-1';
  });

  it('Gemini treo quá lâu thì bài nộp MỞ KHOÁ chứ không nằm lại "Đang chấm"', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    vi.stubGlobal('fetch', vi.fn(async () => {
      // Đúng thứ AbortSignal.timeout ném ra khi hết giờ chờ.
      throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    }));

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(422);
    expect(harness.state.submissions['sub-1']).toMatchObject({ status: 'error', gradingRunId: null });
    expect(harness.state.submissions['sub-1'].status).not.toBe('grading');
    expect(String(harness.state.submissions['sub-1'].errorMessage)).toMatch(/quá lâu/i);
  });

  it('mọi lần gọi Gemini đều mang trần thời gian, không chờ vô hạn', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    const fetchMock = vi.fn(async () => geminiOk(validGradeJson));
    vi.stubGlobal('fetch', fetchMock);

    await call({ action: 'gradeOne', submissionId: 'sub-1' });

    const init = fetchMock.mock.calls[0][1] as { signal?: AbortSignal } | undefined;
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('trần token đủ rộng để bài nhiều câu không bị cắt giữa chừng', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    const fetchMock = vi.fn(async () => geminiOk(validGradeJson));
    vi.stubGlobal('fetch', fetchMock);

    await call({ action: 'gradeOne', submissionId: 'sub-1' });

    const init = fetchMock.mock.calls[0][1] as { body?: string };
    const request = JSON.parse(String(init.body)) as { generationConfig?: { maxOutputTokens?: number } };
    // 8192 là mức đã gây lỗi "AI trả lời dài quá trần cho phép" trên lớp thật.
    expect(request.generationConfig?.maxOutputTokens).toBeGreaterThan(8192);
  });

  it('bị cắt vì MAX_TOKENS thì lượt thử lại được nới trần và yêu cầu viết gọn', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    let lan = 0;
    const fetchMock = vi.fn(async () => (lan++ === 0 ? geminiOk('', 'MAX_TOKENS') : geminiOk(validGradeJson)));
    vi.stubGlobal('fetch', fetchMock);

    const result = await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const lanDau = JSON.parse(String((fetchMock.mock.calls[0][1] as { body?: string }).body)) as {
      generationConfig?: { maxOutputTokens?: number };
    };
    const lanHai = JSON.parse(String((fetchMock.mock.calls[1][1] as { body?: string }).body)) as {
      generationConfig?: { maxOutputTokens?: number };
      contents?: Array<{ parts?: Array<{ text?: string }> }>;
    };
    expect(lanHai.generationConfig?.maxOutputTokens)
      .toBeGreaterThan(Number(lanDau.generationConfig?.maxOutputTokens));
    expect(String(lanHai.contents?.[0]?.parts?.[0]?.text)).toMatch(/viết GỌN|quá dài/i);
  });

  it('Gemini trả lỗi HTTP thì thông điệp có mã trạng thái để còn lần ra nguyên nhân', async () => {
    const harness = seed();
    h.db = makeDb(harness);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, text: async () => '' })));

    await call({ action: 'gradeOne', submissionId: 'sub-1' });

    expect(String(harness.state.submissions['sub-1'].errorMessage)).toContain('429');
  });
});
