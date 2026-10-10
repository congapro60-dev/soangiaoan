import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ db: null as unknown }));

vi.mock('../_exam-core.js', async original => ({
  ...(await original<typeof import('../_exam-core.js')>()),
  getAdminDb: () => h.db,
}));

import handler, { publicResultProjection } from '../exam';

type Doc = Record<string, unknown>;

const makeDb = (state: Record<string, Record<string, Doc>>) => ({
  collection: (name: string) => ({
    doc: (id: string) => ({
      get: async () => ({ exists: Boolean(state[name]?.[id]), data: () => state[name]?.[id] }),
      update: async (patch: Doc) => { state[name][id] = { ...state[name][id], ...patch }; },
    }),
    where: (field: string, _op: string, value: unknown) => ({
      get: async () => ({
        docs: Object.entries(state[name] || {}).filter(([, data]) => data[field] === value).map(([id, data]) => ({ id, data: () => data })),
      }),
    }),
  }),
});

const call = async (method: 'GET' | 'POST', query: Doc, body: Doc = {}) => {
  const out: { status: number; body?: Doc } = { status: 0 };
  const res = {
    setHeader: () => res,
    status(code: number) { out.status = code; return res; },
    json(payload: Doc) { out.body = payload; return res; },
  };
  await handler({ method, query, body } as never, res as never);
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
  beforeEach(() => { state = seed(); h.db = makeDb(state); });

  it('trả bài + bảng xếp hạng (chỉ tên + điểm, không có bài đang làm / bài trong lớp); không lộ nonce', async () => {
    const out = await call('GET', { submissionId: 'bai-1' });
    expect(out.status).toBe(200);
    expect(out.body?.submission).toMatchObject({ id: 'bai-1', totalScore: 8, answers: [answer] });
    expect(out.body?.submission).not.toHaveProperty('clientNonce');
    expect(out.body?.leaderboard).toEqual([
      { id: 'bai-2', studentName: 'Bình', studentClass: '', totalScore: 9 },
      { id: 'bai-1', studentName: 'An', studentClass: '', totalScore: 8 },
    ]);
  });

  it('bài đang làm / không có → 404; bài trong lớp → 403 (xem ở cổng học sinh), kể cả đường chấm công khai', async () => {
    expect((await call('GET', { submissionId: 'dang-lam' })).status).toBe(404);
    expect((await call('GET', { submissionId: 'khong-co' })).status).toBe(404);
    expect((await call('GET', { submissionId: 'bai-lop' })).status).toBe(403);
    expect((await call('POST', {}, { submissionId: 'bai-lop' })).status).toBe(403);
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
    const sub = { status: 'submitted', totalScore: 5, answers: [] };
    expect(publicResultProjection('x', sub, exam, Date.parse('2026-10-10T09:00:00.000Z'))).toMatchObject({ resultHidden: true });
    expect(publicResultProjection('x', sub, exam, Date.parse('2026-10-10T11:00:00.000Z'))).toMatchObject({ totalScore: 5 });
  });
});
