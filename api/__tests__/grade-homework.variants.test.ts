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
  harness.state.classes ||= {};
  for (const submission of Object.values(harness.state.submissions || {})) { const classId = String(submission.classId || ''); if (classId) { harness.state.classes[classId] ||= { teacherId: submission.teacherId }; harness.state[`classes/${classId}/students`] ||= {}; harness.state[`classes/${classId}/students`][String(submission.studentId)] ||= { name: 'HS' }; } }
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
      collection: (sub: string) => collection(`${name}/${id}/${sub}`),
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
    const prompt = request.contents?.[0]?.parts?.filter(part => typeof part.text === 'string').map(part => part.text).join('\n');
    promptTexts.push(typeof prompt === 'string' ? prompt : '');
    return responses[Math.min(geminiIndex++, responses.length - 1)];
  });
  vi.stubGlobal('fetch', h.fetch);
  return promptTexts;
};

// Luồng bài kiểm tra định kì: model đọc TỔNG điểm (field score) và bảng câu có thể KHÔNG phủ
// thang (rowMax 0,25 ≪ maxScore 10) → chính sách giữ điểm model đọc, không cộng dòng khuyết thang
// (cùng nguyên tắc với recomputeTotal khi sai khác thang).
const gradeJson = (score: number) => JSON.stringify({
  score,
  maxScore: 10,
  feedbackForStudent: 'Em làm tốt phần trắc nghiệm.',
  noteForTeacher: '',
  strengths: ['Góc lượng giác'],
  weaknesses: [],
  weakTopics: [],
  questionResults: [{
    questionNumber: 'Phần I - Câu 1', status: 'correct', score: 0.25, maxScore: 0.25, studentAnswer: 'C', expectedAnswer: 'C',
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

  it('HS không chọn mã khi khóa chốt; lượt đã nhận vẫn được đọc tiếp', async () => {
    const harness = seed({ status: 'error', errorReason: 'exam_code', examCodeAsk: ['1201', '1202'] }, { isOpen: false, submissionLocked: true });
    harness.state.studentLinks = { 'hs-uid': { studentId: 'hs-1', classId: 'lop-12', teacherId: 'gv-1' } };
    h.db = makeDb(harness); h.uid = 'hs-uid';
    const original = structuredClone(harness.state.submissions['sub-1']);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(8)));
    expect((await call({ action: 'answerExamCode', submissionId: 'sub-1', examCode: '1202' })).statusCode).toBe(409);
    expect(harness.state.submissions['sub-1']).toEqual(original);
    expect(prompts).toHaveLength(0);
    expect(h.fetch).not.toHaveBeenCalled();
  });

  it('GV vẫn chấm bài đóng theo mã đã chọn', async () => {
    const harness = seed({ examCode: '1201', examCodeSource: 'teacher' }, { isOpen: false, submissionLocked: true });
    h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(8)));
    expect((await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' })).statusCode).toBe(200);
    // Một lượt chấm thôi — không còn lượt vẽ dấu tự động sau khi chấm.
    expect(prompts).toHaveLength(1);
  });

  it('OMR chắc thay đáp án AI trước hậu kiểm tất định', async () => {
    const harness = seed({ examCode: '1202', examCodeSource: 'teacher', detectedAnswers: [{ questionNo: 1, answer: 'B', confidence: .95 }] });
    h.db = makeDb(harness);
    stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(8)));
    expect((await call({ action: 'gradeOne', submissionId: 'sub-1' })).statusCode).toBe(200);
    expect(harness.state.submissions['sub-1'].grade).toMatchObject({ questionResults: [{ studentAnswer: 'B', score: 0, status: 'incorrect' }] });
  });

  it.each([[], [{ questionNo: 1, answer: null, confidence: 0 }], [{ questionNo: 1, answer: 'B', confidence: .4 }]].map(value => [value]))('OMR không chắc giữ đáp án cũ, báo GV: %j', async detectedAnswers => {
    const harness = seed({ examCode: '1202', examCodeSource: 'teacher', detectedAnswers });
    h.db = makeDb(harness);
    stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(8)));
    expect((await call({ action: 'gradeOne', submissionId: 'sub-1' })).statusCode).toBe(200);
    expect(harness.state.submissions['sub-1'].grade).toMatchObject({ noteForTeacher: expect.stringContaining('Máy dò bóng không chắc'), questionResults: [{ studentAnswer: 'C', needsTeacherReview: true }] });
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
    // Lượt đọc đầu: hỏi lại em mã đề (chỉ trong các mã của bài).
    expect(harness.state.submissions['sub-1']).toMatchObject({ errorReason: 'exam_code', examCodeAsk: ['1201', '1202'] });
  });

  it('em chọn mã đề máy chưa đọc được → máy đọc tiếp ngay theo mã đó, ghi "HS chọn"; mã lạ / bài người khác bị chặn', async () => {
    const harness = seed({ status: 'error', errorReason: 'exam_code', examCodeAsk: ['1201', '1202'] });
    harness.state.studentLinks = {
      'hs-uid': { studentId: 'hs-1', classId: 'lop-12', teacherId: 'gv-1' },
      'hs-khac': { studentId: 'hs-2', classId: 'lop-12', teacherId: 'gv-1' },
    };
    h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse(gradeJson(8)));

    h.uid = 'hs-khac';
    expect((await call({ action: 'answerExamCode', submissionId: 'sub-1', examCode: '1202' })).statusCode).toBe(403);
    h.uid = 'hs-uid';
    expect((await call({ action: 'answerExamCode', submissionId: 'sub-1', examCode: '9999' })).statusCode).toBe(409);
    expect(prompts).toHaveLength(0);

    const result = await call({ action: 'answerExamCode', submissionId: 'sub-1', examCode: '1202' });
    expect([200, 202]).toContain(result.statusCode);
    await vi.waitFor(() => expect(harness.state.submissions['sub-1'].status).toBe('graded'));
    expect(prompts[0]).toContain('MÃ ĐỀ CỦA BÀI NÀY: 1202');
    expect(harness.state.submissions['sub-1']).toMatchObject({ examCode: '1202', examCodeSource: 'student', examCodeAsk: [] });
    // Đã có kết quả → không chọn lại được nữa.
    expect((await call({ action: 'answerExamCode', submissionId: 'sub-1', examCode: '1201' })).statusCode).toBe(409);
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

  it('sổ chưa có điểm: AI đọc tổng điểm GV ghi trên bài → lưu paperScore, đối chiếu với chính số đó; lệch thì cờ lệch', async () => {
    const harness = seed({ examCode: '1201', examCodeSource: 'teacher' });
    (harness.state.scoreBooks as any)['lop-12'].exams = {};
    h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse(JSON.stringify({ ...JSON.parse(gradeJson(6)), teacherMarkedScore: { score: 16, maxScore: 20 } })));
    await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });
    const grade = harness.state.submissions['sub-1'].grade as DocData;
    expect(grade.score).toBe(6);
    expect(grade.paperScore).toEqual({ score: 16, maxScore: 20 });
    expect(grade.examCheck).toMatchObject({ sheetLabel: 'Điểm ghi trên bài', sheetScore: 8, mismatch: true });
    expect(prompts.some(text => text.includes('teacherMarkedScore'))).toBe(true);
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

  it('AI giải đề định kì: câu lệnh có khuôn đáp án + bỏ bước giải câu khách quan; đề thường thì không; trả đáp án + chỗ chưa chắc', async () => {
    const harness = seed();
    harness.state.classes = { 'lop-12': { teacherId: 'gv-1', name: '12A', grade: '12' } };
    h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse(JSON.stringify({ answerKey: 'Phần I – Câu 1: C', uncertainties: ['CHƯA CHẮC: Câu 6 hình khác chữ'] })));

    const periodic = await call({ action: 'solveAnswerKey', classId: 'lop-12', examText: 'Câu 1. Đề.', examImages: [], maxScore: 10, periodic: true });
    expect(periodic.statusCode).toBe(200);
    expect(periodic.body).toMatchObject({ answerKey: 'Phần I – Câu 1: C', uncertainties: ['CHƯA CHẮC: Câu 6 hình khác chữ'] });
    expect(prompts[0]).toContain('ĐÂY LÀ ĐỀ KIỂM TRA ĐỊNH KÌ');
    expect(prompts[0]).toContain('Phần II – Câu 1: a) Đ; b) S; c) Đ; d) S');
    expect(prompts[0]).toContain('KHÔNG nêu các bước giải cho ba dạng này');

    await call({ action: 'solveAnswerKey', classId: 'lop-12', examText: 'Câu 1. Đề.', examImages: [], maxScore: 10 });
    expect(prompts[1]).not.toContain('ĐÂY LÀ ĐỀ KIỂM TRA ĐỊNH KÌ');
  });  it('teacher creates one shared solution cache for periodic code, fetch attaches without regrading or extra AI', async () => {
    const harness = seed({ status: 'graded', examCode: '1202', grade: JSON.parse(gradeJson(8)) }); h.db = makeDb(harness);
    const prompts = stubImageThenGeminiResponses(
      makeGeminiResponse(JSON.stringify({ questions: [{ questionNumber: 'Phần I – Câu 1', content: 'Tính 1+1.', expectedAnswer: 'C' }] })),
      makeGeminiResponse(JSON.stringify({ questions: [{ questionNumber: 'Phần I – Câu 1', workedSolution: 'Ta cộng hai số: $1+1=2$. Vì vậy đáp án C phù hợp.', status: 'ready' }] })),
    );
    const result = await call({ action: 'prepareWorkedSolutions', assignmentId: 'kt-1', examCode: '1202' });
    expect(result.statusCode).toBe(200); expect(result.body?.cache).toMatchObject({ status: 'ready' }); expect(prompts).toHaveLength(2);
    expect(prompts[0]).toContain('không tách câu Đúng/Sai thành 4 câu');
    const before = structuredClone(harness.state.submissions['sub-1']);
    const again = await call({ action: 'prepareWorkedSolutions', assignmentId: 'kt-1', examCode: '1202' }); expect(again.statusCode).toBe(200); expect(prompts).toHaveLength(2);
    expect(harness.state.submissions['sub-1']).toEqual(before);
    const assignment = harness.state.assignments['kt-1']; expect(assignment.questionCatalogByExamCode).toHaveProperty('1202'); expect(assignment.workedSolutionsByExamCode).toHaveProperty('1202');
  });
  it('teacher cannot overlap a paid same-version solution run or persist changed answer key', async () => {
    const harness = seed(); h.db = makeDb(harness);
    harness.state.assignments['kt-1'].workedSolutionsClaims = { '1202': { id: 'other', expiresAt: Date.now() + 10000 } };
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse('{}'));
    expect((await call({ action: 'prepareWorkedSolutions', assignmentId: 'kt-1', examCode: '1202' })).statusCode).toBe(409); expect(prompts).toHaveLength(0);
  });
  it('solution commit refuses concurrent catalog edits and retains teacher data', async () => {
    const harness = seed({}, { questionCatalogByExamCode: { '1202': [{ questionNumber: 'Phần I – Câu 1', content: 'Câu gốc', expectedAnswer: 'C' }] } }); h.db = makeDb(harness);
    const original = [{ questionNumber: 'Phần I – Câu 1', content: 'GV sửa đề trong lúc tạo lời giải', expectedAnswer: 'C' }];
    const prompts = stubImageThenGeminiResponses(makeGeminiResponse(JSON.stringify({ questions: [{ questionNumber: 'Phần I – Câu 1', workedSolution: 'Ta xét quy tắc rồi tính ra kết quả phù hợp với C.', status: 'ready' }] })));
    const fetch = h.fetch as (url: unknown, init?: { body?: unknown }) => Promise<unknown>;
    vi.stubGlobal('fetch', async (url: unknown, init?: { body?: unknown }) => { const result = await fetch(url, init); harness.state.assignments['kt-1'].questionCatalogByExamCode = { '1202': original }; return result; });
    expect((await call({ action: 'prepareWorkedSolutions', assignmentId: 'kt-1', examCode: '1202' })).statusCode).toBe(409);
    expect(harness.state.assignments['kt-1'].questionCatalogByExamCode).toEqual({ '1202': original }); expect(harness.state.assignments['kt-1'].workedSolutionsByExamCode).toBeUndefined(); expect(prompts).toHaveLength(1);
  });

  it('solution catalog allows a heavy image source more than 45s while solve keeps the total deadline', async () => {
    const harness = seed(); h.db = makeDb(harness);
    const startedAt = Date.now(); let now = startedAt;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => new AbortController().signal);
    let calls = 0;
    vi.stubGlobal('fetch', async () => {
      calls++;
      if (calls === 1) { now += 90000; return makeGeminiResponse(JSON.stringify({ questions: [{ questionNumber: 'Phần I – Câu 1', content: 'Tính 1+1', expectedAnswer: 'C' }] })); }
      return makeGeminiResponse(JSON.stringify({ questions: [{ questionNumber: 'Phần I – Câu 1', workedSolution: 'Ta cộng hai số: $1+1=2$. Vì vậy chọn C.', status: 'ready' }] }));
    });
    try { expect((await call({ action: 'prepareWorkedSolutions', assignmentId: 'kt-1', examCode: '1202' })).statusCode).toBe(200); expect(timeout.mock.calls[0][0]).toBe(120000); expect(timeout.mock.calls[1][0]).toBeLessThanOrEqual(195000); }
    finally { clock.mockRestore(); timeout.mockRestore(); }
  });

  it('bài chấm tay (handMarkedPaper: true): AI đọc điểm GV ghi trên bài -> gán làm điểm bài, tự duyệt và công bố bản chấm tay', async () => {
    const harness = seed({ examCode: '1201', examCodeSource: 'teacher', handMarkedPaper: true });
    h.db = makeDb(harness);
    stubImageThenGeminiResponses(
      makeGeminiResponse(JSON.stringify({ ...JSON.parse(gradeJson(5)), teacherMarkedScore: { score: 9, maxScore: 10 } })),
    );

    const res = await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });
    expect(res.statusCode).toBe(200);

    const sub = harness.state.submissions['sub-1'];
    const grade = sub.grade as DocData;
    expect(grade.score).toBe(9);
    expect(grade.maxScore).toBe(10);
    expect(grade.teacherApproved).toBe(true);
    expect(grade.approvalSource).toBe('teacher');
    expect(sub.handMarkedPublished).toBe(true);
  });

  it('HS tự khai bài thầy đã chấm tay: điểm GV đọc được nhưng KHÔNG tự thành điểm bài, chờ thầy xác nhận', async () => {
    const harness = seed({ examCode: '1201', examCodeSource: 'teacher', handMarkedPaper: true, handMarkedDeclaredBy: 'student' });
    h.db = makeDb(harness);
    stubImageThenGeminiResponses(
      makeGeminiResponse(JSON.stringify({ ...JSON.parse(gradeJson(5)), teacherMarkedScore: { score: 9, maxScore: 10 } })),
    );

    const res = await call({ action: 'gradeOne', submissionId: 'sub-1', mode: 'quick' });
    expect(res.statusCode).toBe(200);

    const sub = harness.state.submissions['sub-1'];
    const grade = sub.grade as DocData;
    // Điểm bài vẫn là điểm máy chấm; điểm thầy ghi nằm ở paperScore để thầy bấm "Dùng điểm GV".
    expect(grade.score).toBe(5);
    expect(grade.paperScore).toMatchObject({ score: 9, maxScore: 10 });
    expect(grade.teacherApproved).toBe(false);
    expect(grade.noteForTeacher).toContain('9/10');
  });
});

