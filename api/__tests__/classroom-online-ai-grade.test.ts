import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleClassroomOnlineAction } from '../_classroom-online';

const h = vi.hoisted(() => ({ uid: 'gv-1', db: null as unknown, aiRaw: '' }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }) }),
}));

vi.mock('../_exam-core.js', () => ({
  stripAnswerKey: <T extends { correctAnswer?: unknown; explanation?: unknown }>(question: T) => {
    const { correctAnswer: _correctAnswer, explanation: _explanation, ...safe } = question;
    return safe;
  },
}));

vi.mock('../_grading-core.js', () => ({
  GRADING_MODEL: 'test-model',
  getGradingApiKey: () => 'test-key',
  callGeminiVision: vi.fn(async () => h.aiRaw),
  reserveQuota: vi.fn(async () => ({ quota: {}, verdict: { allowed: 1, reason: '' } })),
}));

type Doc = Record<string, unknown>;

interface Harness { store: Record<string, Record<string, Doc>>; }

const makeDb = (harness: Harness) => {
  const ensure = (collectionName: string) => {
    harness.store[collectionName] ||= {};
    return harness.store[collectionName];
  };
  const collection = (collectionName: string) => ({
    doc: (id: string) => ({
      id,
      get: async () => ({ exists: ensure(collectionName)[id] !== undefined, data: () => ensure(collectionName)[id] ? { ...ensure(collectionName)[id] } : undefined }),
      set: async (payload: Doc, options?: { merge?: boolean }) => {
        ensure(collectionName)[id] = options?.merge ? { ...ensure(collectionName)[id], ...payload } : { ...payload };
      },
      update: async (payload: Doc) => { ensure(collectionName)[id] = { ...ensure(collectionName)[id], ...payload }; },
    }),
    where: (field: string, _operator: string, value: unknown) => ({
      get: async () => ({
        docs: Object.entries(ensure(collectionName))
          .filter(([, data]) => data[field] === value)
          .map(([id, data]) => ({ id, data: () => ({ ...data }) })),
      }),
    }),
  });
  return {
    collection,
    runTransaction: async (work: (transaction: {
      get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
      set: (ref: { set: (payload: Doc, options?: { merge?: boolean }) => Promise<void> }, payload: Doc, options?: { merge?: boolean }) => void;
    }) => Promise<unknown>) => {
      const operations: Array<() => Promise<void>> = [];
      const result = await work({
        get: ref => ref.get(),
        set: (ref, payload, options) => operations.push(() => ref.set(payload, options)),
      });
      for (const operation of operations) await operation();
      return result;
    },
  };
};

const makeResponse = () => {
  const response = {
    statusCode: 0,
    payload: null as Doc | null,
    status(code: number) { response.statusCode = code; return response; },
    json(payload: Doc) { response.payload = payload; return response; },
  };
  return response;
};

const seed = (): Harness => {
  const harness: Harness = { store: {} };
  h.db = makeDb(harness);
  harness.store.classes = { 'lop-1': { id: 'lop-1', teacherId: 'gv-1', ownerId: 'gv-1', name: '11 Columbus' } };
  harness.store.assignments = { 'asg-1': { id: 'asg-1', teacherId: 'gv-1', classId: 'lop-1', type: 'exam', examId: 'exam-1', title: 'Bài online', maxScore: 5, isOpen: true, gradingPolicy: 'mixed', skillIds: ['math.line-equation'] } };
  harness.store.exams = { 'exam-1': { id: 'exam-1', teacherId: 'gv-1', title: 'Đề Toán', maxScore: 5, questions: [
    { id: 'q1', type: 'multiple_choice', content: 'Chọn A', options: ['A', 'B'], correctAnswer: 'A', points: 2 },
    { id: 'q2', type: 'essay', content: 'Giải $x=1$.', correctAnswer: 'x=1', points: 3 },
  ] } };
  harness.store.examSubmissions = { 'attempt-1': {
    id: 'attempt-1', examId: 'exam-1', classId: 'lop-1', assignmentId: 'asg-1', studentId: 'hs-1', status: 'submitted',
    updatedAt: '2026-08-28T09:20:00.000Z', maxScore: 5, answers: [{ questionId: 'q1', answer: 'A' }, { questionId: 'q2', answer: 'x = 1' }],
  } };
  return harness;
};

describe('teacher online AI grade', () => {
  beforeEach(() => {
    h.uid = 'gv-1';
    h.aiRaw = JSON.stringify({
      score: 4.5,
      maxScore: 5,
      feedbackForStudent: 'Em làm đúng ý chính; cần trình bày đủ bước.',
      noteForTeacher: 'Câu tự luận cần duyệt.',
      strengths: ['Nắm được ý chính.'],
      weaknesses: ['Thiếu bước trình bày.'],
      weakTopics: ['Trình bày lời giải'],
      questionResults: [
        { questionNumber: 'Câu 1', status: 'correct', score: 2, maxScore: 2, studentAnswer: 'A', expectedAnswer: 'A', errorType: 'Không có', explanation: 'Chọn đúng.', correction: '', nextPractice: 'Làm câu vận dụng.', needsTeacherReview: false },
        { questionNumber: 'Câu 2', status: 'partially_correct', score: 2.5, maxScore: 3, studentAnswer: 'x = 1', expectedAnswer: 'x=1', errorType: 'Thiếu bước', explanation: 'Kết quả đúng nhưng thiếu bước.', correction: 'Viết đủ biến đổi.', nextPractice: 'Làm bài tương tự.', needsTeacherReview: false },
      ],
    });
  });

  it('AI chỉ tạo provisional, giữ answers và ghi history khi thay grade cũ', async () => {
    const harness = seed();
    const response = makeResponse();
    await handleClassroomOnlineAction(h.db as never, { action: 'teacherOnlineAiRegrade', idToken: 'token', attemptId: 'attempt-1' }, response as never);

    expect(response.statusCode).toBe(200);
    expect(harness.store.examSubmissions['attempt-1']).toMatchObject({
      status: 'graded',
      gradeState: 'provisional',
      gradingSource: 'ai',
      grade: expect.objectContaining({ score: 4.5, teacherApproved: false, noteForTeacher: 'Câu tự luận cần duyệt.' }),
      answers: expect.arrayContaining([expect.objectContaining({ questionId: 'q2', answer: 'x = 1', aiScore: 2.5 })]),
    });
  });
});
