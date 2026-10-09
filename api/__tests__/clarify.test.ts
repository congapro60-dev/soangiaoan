import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyClarification, handleClarifyAction } from '../_clarify';
import handler from '../classroom';

type Doc = Record<string, unknown>;
const h = vi.hoisted(() => ({ uid: 'student-uid-1', db: null as unknown, sync: vi.fn(async () => undefined) }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }) }),
}));
vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ name: 'unused.firebasestorage.app', file: () => ({ delete: async () => undefined }) }),
  stripAnswerKey: (question: Doc) => question,
}));
vi.mock('../_skill-profile.js', () => ({ syncApprovedGradeEvidence: h.sync }));

const makeDb = (store: Record<string, Record<string, Doc>>) => {
  const collection = (name: string) => ({
    doc: (id: string) => ({
      id,
      get: async () => ({ exists: Boolean(store[name]?.[id]), data: () => (store[name]?.[id] ? structuredClone(store[name][id]) : undefined) }),
      update: async (payload: Doc) => { store[name][id] = { ...store[name][id], ...payload }; },
    }),
    where: (field: string, _operator: string, value: unknown) => ({
      limit: (count: number) => ({
        get: async () => ({
          docs: Object.entries(store[name] || {})
            .filter(([, item]) => item[field] === value)
            .slice(0, count)
            .map(([id, item]) => ({ id, data: () => structuredClone(item) })),
        }),
      }),
    }),
  });
  const runTransaction = async (work: (tx: {
    get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
    update: (ref: { update: (payload: Doc) => Promise<void> }, payload: Doc) => void;
  }) => Promise<unknown>) => {
    const operations: Array<() => Promise<void>> = [];
    const result = await work({ get: ref => ref.get(), update: (ref, payload) => { operations.push(() => ref.update(payload)); } });
    for (const operation of operations) await operation();
    return result;
  };
  return { collection, runTransaction };
};

const row = (over: Doc = {}) => ({
  questionNumber: 'Phần I – Câu 1', status: 'correct', score: 0.25, maxScore: 0.25, studentAnswer: 'B', expectedAnswer: 'B',
  errorType: '', explanation: 'Vì …', correction: '', nextPractice: '', needsTeacherReview: false, ...over,
});

const mcqOpen = (over: Doc = {}) => row({
  questionNumber: 'Phần I – Câu 2', status: 'unreadable', score: 0, studentAnswer: 'B hoặc D', expectedAnswer: 'D', needsTeacherReview: true,
  clarify: { kind: 'mcq', state: 'open', reading: 'B hoặc D' }, ...over,
});
const tfOpen = () => row({
  questionNumber: 'Phần II – Câu 1', status: 'unreadable', score: 0, maxScore: 1, studentAnswer: 'không rõ', expectedAnswer: 'a) Đ; b) S; c) Đ; d) S', needsTeacherReview: true,
  clarify: { kind: 'true_false', state: 'open', reading: 'không rõ', parts: ['a', 'b', 'c', 'd'] },
});

const seed = (extra: Doc = {}): Record<string, Record<string, Doc>> => ({
  studentLinks: {
    'student-uid-1': { studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1' },
    'student-uid-2': { studentId: 'student-2', classId: 'class-1', teacherId: 'teacher-1' },
  },
  classes: { 'class-1': { teacherId: 'teacher-1', askStudentClarification: true } },
  submissions: {
    'sub-1': {
      teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1', assignmentId: 'asg-1', fileUrls: [], note: '', status: 'graded',
      grade: {
        score: 0.25, maxScore: 1.5, feedback: 'Bài làm tốt', strengths: ['Cẩn thận'], weaknesses: [], weakTopics: [],
        teacherApproved: true, approvalSource: 'student_ai', gradedAt: '2026-10-09T00:00:00.000Z',
        questionResults: [row(), mcqOpen(), tfOpen()],
      },
      createdAt: '2026-10-09T00:00:00.000Z', updatedAt: '2026-10-09T00:00:00.000Z',
      ...extra,
    },
  },
});

const call = async (body: Doc) => {
  const state = { statusCode: 0, payload: null as Doc | null };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(payload: Doc) { state.payload = payload; return response; },
  };
  const handled = await handleClarifyAction(h.db as never, { idToken: 't', action: 'clarifyAnswers', ...body }, response as never);
  return { ...state, handled };
};

describe('student clarification · projection', () => {
  beforeEach(() => { h.uid = 'student-uid-1'; h.db = makeDb(seed()); });

  it('bài còn câu chờ: học sinh CHỈ thấy câu chờ, không đáp án đúng / giải thích / điểm / nhận xét', async () => {
    const state = { payload: null as Doc | null };
    const response = { status() { return response; }, json(payload: Doc) { state.payload = payload; return response; } };
    await handler({ method: 'POST', body: { idToken: 't', action: 'studentSubmissions' } } as never, response as never);
    const sub = (state.payload?.submissions as Doc[])[0];
    const grade = sub.grade as Doc;
    expect(grade.awaitingClarification).toBe(true);
    expect(grade.score).toBe(0);
    expect(grade.feedback).toBe('');
    expect(grade.strengths).toEqual([]);
    const rows = grade.questionResults as Doc[];
    expect(rows.map(r => r.questionNumber)).toEqual(['Phần I – Câu 2', 'Phần II – Câu 1']);
    expect(JSON.stringify(rows)).not.toContain('"D"');
    for (const r of rows) {
      expect(r.expectedAnswer).toBe('');
      expect(r.explanation).toBe('');
      expect(r.score).toBe(0);
    }
    expect(rows[0].clarify).toMatchObject({ kind: 'mcq', state: 'open', reading: 'B hoặc D' });
  });
});

describe('student clarification · clarifyAnswers', () => {
  beforeEach(() => { h.uid = 'student-uid-1'; h.sync.mockClear(); h.db = makeDb(seed()); });
  const store = () => (h.db as { collection: (n: string) => { doc: (i: string) => { get: () => Promise<{ data: () => Doc }> } } }).collection('submissions').doc('sub-1').get().then(s => s.data());

  it('đáp án đúng được chấm tại chỗ, lưu ngay, điểm tính lại; chưa đủ câu thì chưa đồng bộ minh chứng', async () => {
    const result = await call({ submissionId: 'sub-1', answers: [{ questionNumber: 'Phần I – Câu 2', answer: 'd' }] });
    expect(result.handled).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ pending: 1, rejected: [] });
    const saved = (await store()).grade as { score: number; questionResults: Doc[] };
    const q = saved.questionResults[1];
    expect(q).toMatchObject({ status: 'correct', score: 0.25, studentAnswer: 'D', needsTeacherReview: false });
    expect(q.clarify).toMatchObject({ state: 'answered' });
    expect(saved.score).toBeCloseTo(0.5);
    expect(h.sync).not.toHaveBeenCalled();
  });

  it('đáp án sai vẫn chấm sai (không tự cho đúng); câu cuối xong thì đồng bộ minh chứng đúng một lần', async () => {
    await call({ submissionId: 'sub-1', answers: [{ questionNumber: 'Phần I – Câu 2', answer: 'A' }] });
    const last = await call({ submissionId: 'sub-1', answers: [{ questionNumber: 'Phần II – Câu 1', answer: 'a) Đ; b) S; c) Đ; d) S' }] });
    expect(last.payload).toMatchObject({ pending: 0, rejected: [] });
    const saved = (await store()).grade as { questionResults: Doc[] };
    expect(saved.questionResults[1]).toMatchObject({ status: 'incorrect', score: 0 });
    expect(saved.questionResults[2]).toMatchObject({ status: 'correct', score: 1 });
    expect(h.sync).toHaveBeenCalledTimes(1);
    // Gửi lại sau khi đã xong: bị từ chối, không đồng bộ lần hai
    const again = await call({ submissionId: 'sub-1', answers: [{ questionNumber: 'Phần II – Câu 1', answer: 'a) S; b) S; c) S; d) S' }] });
    expect((again.payload?.rejected as Doc[]).length).toBe(1);
    expect(h.sync).toHaveBeenCalledTimes(1);
  });

  it('đáp án sai khuôn bị từ chối và câu vẫn mở', async () => {
    const result = await call({ submissionId: 'sub-1', answers: [{ questionNumber: 'Phần I – Câu 2', answer: 'E' }, { questionNumber: 'Phần II – Câu 1', answer: 'a) Đ' }] });
    expect((result.payload?.rejected as Doc[]).map(r => r.questionNumber)).toEqual(['Phần I – Câu 2', 'Phần II – Câu 1']);
    expect(result.payload?.pending).toBe(2);
    const saved = (await store()).grade as { questionResults: Doc[] };
    expect((saved.questionResults[1].clarify as Doc).state).toBe('open');
  });

  it('"để thầy cô xem" giữ cờ soát cho giáo viên, đóng câu hỏi', async () => {
    await call({ submissionId: 'sub-1', skip: ['Phần I – Câu 2', 'Phần II – Câu 1'] });
    const saved = (await store()).grade as { questionResults: Doc[] };
    expect(saved.questionResults[1]).toMatchObject({ needsTeacherReview: true, clarify: { state: 'skipped' } });
    expect(saved.questionResults[2]).toMatchObject({ needsTeacherReview: true, clarify: { state: 'skipped' } });
    expect(h.sync).toHaveBeenCalledTimes(1);
  });

  it('em khác trong lớp không trả lời hộ được (403), không có phiên → 401', async () => {
    h.uid = 'student-uid-2';
    const other = await call({ submissionId: 'sub-1', answers: [{ questionNumber: 'Phần I – Câu 2', answer: 'D' }] });
    expect(other.statusCode).toBe(403);
    expect(((await store()).grade as { questionResults: Doc[] }).questionResults[1].clarify).toMatchObject({ state: 'open' });
    const none = await call({ idToken: '', submissionId: 'sub-1', answers: [{ questionNumber: 'x', answer: 'D' }] });
    expect(none.statusCode).toBe(401);
  });

  it('action lạ không bị nuốt', async () => {
    const response = { status() { return response; }, json() { return response; } };
    expect(await handleClarifyAction(h.db as never, { action: 'gradeOne' }, response as never)).toBe(false);
  });
});

describe('student clarification · applyClarification', () => {
  const grade = (rows: Doc[]) => ({ score: 0, maxScore: 1, feedback: '', strengths: [], weaknesses: [], questionResults: rows }) as never;
  const uncertain = row({ status: 'unreadable', needsTeacherReview: true, studentAnswer: 'B hoặc D', expectedAnswer: 'D', score: 0 });

  it('lớp tắt công tắc, hoặc GV chấm → không hỏi lại', async () => {
    const off = makeDb({ classes: { 'class-1': { askStudentClarification: false } } });
    expect((await applyClarification(off as never, { classId: 'class-1' }, grade([uncertain]), true)).asked).toBe(0);
    const on = makeDb({ classes: { 'class-1': { askStudentClarification: true } } });
    expect((await applyClarification(on as never, { classId: 'class-1' }, grade([uncertain]), false)).asked).toBe(0);
  });

  it('lớp bật + học sinh nộp → đánh dấu câu chưa chắc', async () => {
    const on = makeDb({ classes: { 'class-1': { askStudentClarification: true } } });
    const result = await applyClarification(on as never, { classId: 'class-1' }, grade([row(), uncertain]), true);
    expect(result.asked).toBe(1);
    expect(result.grade.questionResults?.[1].clarify).toMatchObject({ kind: 'mcq', state: 'open' });
  });
});
