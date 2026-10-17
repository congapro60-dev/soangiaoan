import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ db: null as unknown, uid: 'gv' }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async (token: string) => {
  if (token === 'bad') throw new Error('invalid');
  return { uid: h.uid, firebase: { sign_in_provider: token === 'anon' ? 'anonymous' : 'google.com' } };
} }) }));

vi.mock('../_exam-core.js', async original => ({
  ...(await original<typeof import('../_exam-core.js')>()),
  getAdminDb: () => h.db,
}));

import handler, { examPasswordMatches, publicResultProjection } from '../exam';

type Doc = Record<string, unknown>;

describe('examPasswordMatches', () => {
  it('requires an exact password and rejects missing/non-string values', () => {
    expect(examPasswordMatches('Toan10!', 'Toan10!')).toBe(true);
    expect(examPasswordMatches('Toan10!', 'toan10!')).toBe(false);
    expect(examPasswordMatches('Toan10!', '')).toBe(false);
    expect(examPasswordMatches('Toan10!', undefined)).toBe(false);
  });
});

const makeDb = (state: Record<string, Record<string, Doc>>) => {
  const collection = (name: string, filters: [string, unknown][] = [], count = Infinity, ordered = false, cursor = ''): any => ({
    doc: (id: string) => ({ get: async () => ({ exists: Boolean(state[name]?.[id]), data: () => structuredClone(state[name]?.[id]) }),
      update: async (patch: Doc) => { state[name][id] = { ...state[name][id], ...patch }; },
      set: async (data: Doc) => { (state[name] ||= {})[id] = structuredClone(data); } }),
    where: (field: string, _op: string, value: unknown) => collection(name, [...filters, [field, value]], count, ordered, cursor),
    limit: (value: number) => collection(name, filters, value, ordered, cursor),
    orderBy: () => collection(name, filters, count, true, cursor),
    startAfter: (doc: { id: string }) => collection(name, filters, count, ordered, doc.id),
    get: async () => { let rows = Object.entries(state[name] || {}).filter(([, data]) => filters.every(([field,value]) => data[field] === value) && (!ordered || typeof data.totalScore === 'number'));
      if (ordered) rows.sort((a,b) => Number(b[1].totalScore) - Number(a[1].totalScore) || a[0].localeCompare(b[0]));
      if (cursor) rows = rows.slice(rows.findIndex(([id]) => id === cursor) + 1);
      const docs = rows.slice(0,count).map(([id,data]) => ({ id, data: () => structuredClone(data) })); return { docs, empty: !docs.length }; },
  });
  return { collection, runTransaction: async (work: any) => { const writes: (() => Promise<void>)[] = [];
    const result = await work({ get: (ref: any) => ref.get(), update: (ref: any, patch: Doc) => writes.push(() => ref.update(patch)), set: (ref: any, data: Doc) => writes.push(() => ref.set(data)) });
    for (const write of writes) await write(); return result; } };
};

const call = async (method: 'GET' | 'POST', query: Doc, body: Doc = {}, headers: Doc = {}) => {
  const out: { status: number; body?: Doc } = { status: 0 };
  const res = {
    setHeader: () => res,
    status(code: number) { out.status = code; return res; },
    json(payload: Doc) { out.body = payload; return res; },
  };
  await handler({ method, query, body, headers } as never, res as never);
  return out;
};

const answer = { questionId: 'q1', answer: 'A', autoScore: 2, correctAnswer: 'A', explanation: 'Vì A.' };
const seed = (exam: Doc = {}) => ({
  exams: { 'de-1': { teacherId: 'gv', code: 'ABC', maxScore: 10, showResultWhen: 'submit', allowReview: true, ...exam } },
  examSubmissions: {
    'bai-1': { examId: 'de-1', studentName: 'An', status: 'graded', totalScore: 8, maxScore: 10, startedAt: 's', clientNonce: 'bi-mat', answers: [answer] },
    'bai-2': { examId: 'de-1', studentName: 'Bình', status: 'graded', totalScore: 9, maxScore: 10, startedAt: 's', answers: [] },
    'dang-lam': { examId: 'de-1', studentName: 'Chi', status: 'in_progress', totalScore: 10, startedAt: 's', answers: [] },
    'bai-lop': { examId: 'de-1', studentName: 'Dũng', status: 'graded', totalScore: 10, classId: 'lop', assignmentId: 'asg', startedAt: 's', answers: [], gradeState: 'provisional' },
  },
} as Record<string, Record<string, Doc>>);

describe('GET /api/exam?submissionId= · trang kết quả thí sinh tự do', () => {
  let state: Record<string, Record<string, Doc>>;
  beforeEach(() => { state = seed(); h.db = makeDb(state); h.uid = 'gv'; });

  it('trả bài + bảng xếp hạng (chỉ tên + điểm, không có bài đang làm / bài trong lớp); không lộ nonce', async () => {
    const out = await call('GET', { submissionId: 'bai-1' });
    expect(out.status).toBe(200);
    expect(out.body?.submission).toMatchObject({ id: 'bai-1', totalScore: 8, answers: [answer] });
    expect(out.body?.submission).not.toHaveProperty('clientNonce');
    expect(out.body?.leaderboard).toEqual([
      { isMe: false, studentName: 'Bình', studentClass: '', totalScore: 9 },
      { isMe: true, studentName: 'An', studentClass: '', totalScore: 8 },
    ]);
  });

  it('bài đang làm / không có → 404; bài trong lớp → 403 (xem ở cổng học sinh), kể cả đường chấm công khai', async () => {
    expect((await call('GET', { submissionId: 'dang-lam' })).status).toBe(404);
    expect((await call('GET', { submissionId: 'khong-co' })).status).toBe(404);
    expect((await call('GET', { submissionId: 'bai-lop' })).status).toBe(403);
    expect((await call('POST', {}, { submissionId: 'bai-lop' }, { authorization: 'Bearer valid' })).status).toBe(403);
    expect(state.examSubmissions['bai-lop'].gradeState).toBe('provisional');
  });

  it('giáo viên chưa cho hiện điểm → máy chủ bỏ điểm, đáp án và bảng xếp hạng', async () => {
    state.exams['de-1'].showResultWhen = 'never';
    const out = await call('GET', { submissionId: 'bai-1' });
    expect(out.body?.submission).toMatchObject({ resultHidden: true, answers: [{ questionId: 'q1', answer: 'A' }] });
    expect(out.body?.submission).not.toHaveProperty('totalScore');
    expect(out.body?.leaderboard).toEqual([]);
  });

  it('không cho xem lại → bỏ đáp án/giải thích, vẫn có điểm; ẩn bảng xếp hạng → không trả', async () => {
    state.exams['de-1'].allowReview = false;
    state.exams['de-1'].hideLeaderboard = true;
    const out = await call('GET', { submissionId: 'bai-1' });
    expect(out.body?.submission).toMatchObject({ totalScore: 8, answers: [{ questionId: 'q1', answer: 'A', autoScore: 2 }] });
    expect((out.body?.submission as Doc).answers).toEqual([{ questionId: 'q1', answer: 'A', autoScore: 2 }]);
    expect(out.body?.leaderboard).toEqual([]);
  });

  it('"hiện khi xong hết": trước giờ đóng đề và chưa chấm xong → ẩn; sau giờ đóng → hiện', () => {
    const exam = { showResultWhen: 'all_done', endAt: '2026-10-10T10:00:00.000Z' };
    const sub = { status: 'submitted', totalScore: 5, answers: [], publicAutoGradedAt: 'server' };
    expect(publicResultProjection('x', sub, exam, Date.parse('2026-10-10T09:00:00.000Z'))).toMatchObject({ resultHidden: true });
    expect(publicResultProjection('x', sub, exam, Date.parse('2026-10-10T11:00:00.000Z'))).toMatchObject({ totalScore: 5 });
    expect(publicResultProjection('x', { ...sub, status: 'graded' }, exam, Date.parse('2026-10-10T09:00:00.000Z'))).toHaveProperty('resultHidden', true);
    expect(publicResultProjection('x', sub, { ...exam, isActive: false }, Date.parse('2026-10-10T09:00:00.000Z'))).toHaveProperty('totalScore', 5);
  });
  const nonce = '0123456789abcdef0123456789abcdef01234567';
  const pending = () => {
    state.exams['de-1'].questions = [{ id: 'q1', type: 'multiple_choice', correctAnswer: 'A', points: 2 }, { id: 'q2', type: 'essay', points: 8 }];
    state.examSubmissions['bai-1'] = { ...state.examSubmissions['bai-1'], status: 'submitted', clientNonce: nonce,
      answers: [{ questionId: 'q1', answer: 'A', autoScore: 99 }, { questionId: 'q1', answer: 'B' },
        { questionId: 'q2', answer: 'bài viết' }, { questionId: 'unknown', answer: 'x' }] };
  };
  it('student nonce grades raw answers once, ignores forged grades and preserves later teacher edits', async () => {
    pending();
    const first = await call('POST', {}, { submissionId: 'bai-1', clientNonce: nonce });
    expect(first.status).toBe(200); expect(first.body?.totalScore).toBe(2);
    expect(state.examSubmissions['bai-1'].answers).toEqual([{ questionId: 'q1', answer: 'A', autoScore: 2, correctAnswer: 'A' }, { questionId: 'q2', answer: 'bài viết' }]);
    expect(state.examSubmissions['bai-1'].publicAutoGradedAt).toEqual(expect.any(String));
    state.examSubmissions['bai-1'].totalScore = 9;
    const before = structuredClone(state.examSubmissions['bai-1']);
    expect((await call('POST', {}, { submissionId: 'bai-1', clientNonce: nonce })).body?.totalScore).toBe(9);
    expect(state.examSubmissions['bai-1']).toEqual(before);
  });
  it('student cannot grade before submission, use another nonce, or access a classroom attempt', async () => {
    pending(); expect((await call('POST', {}, { submissionId: 'bai-1', clientNonce: 'wrong' })).status).toBe(401);
    state.examSubmissions['bai-1'].status = 'in_progress';
    expect((await call('POST', {}, { submissionId: 'bai-1', clientNonce: nonce })).status).toBe(409);
    state.examSubmissions['bai-1'].status = 'submitted'; state.examSubmissions['bai-1'].classId = 'class';
    expect((await call('POST', {}, { submissionId: 'bai-1', clientNonce: nonce })).status).toBe(403);
  });
  it('ambiguous old essay grades require explicit teacher review without overwriting stored data', async () => {
    pending(); (state.examSubmissions['bai-1'].answers as Doc[])[2].aiScore = 8;
    const before = structuredClone(state.examSubmissions['bai-1']);
    expect((await call('POST', {}, { submissionId: 'bai-1', clientNonce: nonce })).status).toBe(409);
    expect((await call('POST', {}, { submissionId: 'bai-1' }, { authorization: 'Bearer valid' })).status).toBe(409);
    expect(state.examSubmissions['bai-1']).toEqual(before);
  });
  it('teacher requires valid nonanonymous token and exact nonempty exam owner', async () => {
    pending();
    for (const authorization of ['', 'Bearer bad', 'Bearer anon']) expect((await call('POST', {}, { submissionId: 'bai-1' }, { authorization })).status).toBe(401);
    h.uid = 'stranger'; expect((await call('POST', {}, { submissionId: 'bai-1' }, { authorization: 'Bearer valid' })).status).toBe(403);
    h.uid = 'gv'; delete state.exams['de-1'].teacherId;
    expect((await call('POST', {}, { submissionId: 'bai-1' }, { authorization: 'Bearer valid' })).status).toBe(403);
    state.exams['de-1'].teacherId = 'gv';
    expect((await call('POST', {}, { submissionId: 'bai-1' }, { authorization: 'Bearer valid' })).status).toBe(200);
  });
  it('POST hides scores and review fields when teacher disables results; no review leaks aiFeedback', async () => {
    pending(); state.exams['de-1'].showResultWhen = 'never';
    const graded = await call('POST', {}, { submissionId: 'bai-1', clientNonce: nonce });
    expect(graded.status).toBe(200); expect(graded.body).toHaveProperty('resultHidden', true); expect(graded.body).not.toHaveProperty('totalScore');
    state.exams['de-1'].allowReview = false; state.exams['de-1'].showResultWhen = 'submit';
    state.examSubmissions['bai-1'].answers = [{ ...answer, aiFeedback: 'PRIVATE SOLUTION' }];
    const result = await call('GET', { submissionId: 'bai-1' }); expect(JSON.stringify(result.body)).not.toContain('PRIVATE SOLUTION');
  });
  it('ungraded raw client data never becomes a public score or answer-key source', async () => {
    pending();
    const result = await call('GET', { submissionId: 'bai-1' }); expect(result.body?.submission).not.toHaveProperty('totalScore');
    expect(JSON.stringify(result.body?.submission)).not.toContain('autoScore'); expect(JSON.stringify(result.body?.submission)).not.toContain('aiScore');
  });
  it('top ten skips higher-score private and unfinished rows before filling public places, without peer IDs', async () => {
    for (let i = 0; i < 105; i++) state.examSubmissions['private-' + i] = { examId: 'de-1', classId: 'class', totalScore: 100, status: 'graded' };
    for (let i = 0; i < 12; i++) state.examSubmissions['public-' + i] = { examId: 'de-1', totalScore: 20 - i, status: 'graded', studentName: 'HS ' + i };
    const result = await call('GET', { submissionId: 'bai-1' }); const rows = result.body?.leaderboard as Doc[];
    expect(rows).toHaveLength(10); expect(rows[0].totalScore).toBe(20); expect(rows[9].totalScore).toBe(11); expect(rows.every(row => !('id' in row))).toBe(true);
  });
  it('bounded leaderboard reports incomplete coverage instead of pretending there are no public results', async () => {
    for (let i = 0; i < 501; i++) state.examSubmissions['private-' + i] = { examId: 'de-1', classId: 'class', totalScore: 100, status: 'graded' };
    const result = await call('GET', { submissionId: 'bai-1' }); expect(result.body).toHaveProperty('leaderboardLimited', true); expect(result.body?.leaderboard).toEqual([]);
  });
  it('code throttle does not throttle result URLs for students sharing an IP', async () => {
    const headers = { 'x-forwarded-for': '192.0.2.17' };
    for (let i = 0; i < 300; i++) expect((await call('GET', { code: 'ABC' }, {}, headers)).status).toBe(404);
    expect((await call('GET', { code: 'ABC' }, {}, headers)).status).toBe(429);
    // Bộ đếm nằm ở Firestore (dùng chung mọi instance), không ở bộ nhớ từng instance.
    expect(Object.values(state.rateLimits)[0]).toMatchObject({ count: 300, scope: 'exam-code' });
    expect((await call('GET', { code: 'ABC' }, {}, { 'x-forwarded-for': '198.51.100.9' })).status).toBe(404);
    for (let i = 0; i < 35; i++) expect((await call('GET', { submissionId: 'bai-1' }, {}, headers)).status).toBe(200);
  });
});

describe('GET /api/exam password-protected exam access', () => {
  it('does not disclose exam id/content through the locked code or unproved examId path', async () => {
    const state = seed();
    state.exams['de-1'] = {
      ...state.exams['de-1'],
      id: 'de-1',
      isActive: true,
      password: 'secret',
      questions: [{ id: 'q1', type: 'multiple_choice', content: 'Câu hỏi bí mật', correctAnswer: 'A', points: 1 }],
    };
    h.db = makeDb(state);

    const locked = await call('GET', { code: 'ABC' });
    expect(locked.status).toBe(200);
    expect(locked.body?.passwordRequired).toBe(true);
    expect(locked.body?.exam).not.toHaveProperty('id');

    const bypass = await call('GET', { examId: 'de-1' });
    expect(bypass.status).toBe(403);
  });

  it('allows a submitted result page to load the protected exam with a matching proof submission', async () => {
    const state = seed();
    state.exams['de-1'] = {
      ...state.exams['de-1'],
      id: 'de-1',
      password: 'secret',
      questions: [{ id: 'q1', type: 'multiple_choice', content: 'Câu hỏi bí mật', correctAnswer: 'A', points: 1 }],
    };
    state.examSubmissions['proof'] = { examId: 'de-1', status: 'graded', answers: [] };
    h.db = makeDb(state);

    const out = await call('GET', { examId: 'de-1', proofSubmissionId: 'proof' });
    expect(out.status).toBe(200);
    expect((out.body?.exam as Doc).questions).toHaveLength(1);
  });
});
