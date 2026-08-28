import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleClassroomOnlineAction } from '../_classroom-online';

type DocData = Record<string, unknown>;

const h = vi.hoisted(() => ({
  uid: 'student-uid-1',
  db: null as unknown,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => ({ uid: h.uid }),
  }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  stripAnswerKey: (question: DocData) => {
    const { correctAnswer: _correctAnswer, explanation: _explanation, ...safe } = question;
    return safe;
  },
}));

interface Harness {
  store: Record<string, Record<string, DocData>>;
  writes: string[];
}

const collectionKey = (parent: string, id: string, child: string): string => `${parent}/${id}/${child}`;

const makeDb = (harness: Harness) => {
  const makeCollection = (name: string) => {
    const ensure = () => { harness.store[name] ||= {}; return harness.store[name]; };
    const makeQuery = (constraints: Array<{ field: string; value: unknown }>) => ({
      where: (field: string, _operator: string, value: unknown) => makeQuery([...constraints, { field, value }]),
      limit: (count: number) => ({
        get: async () => {
          const docs = Object.entries(ensure())
            .filter(([, value]) => constraints.every(item => value[item.field] === item.value))
            .slice(0, count)
            .map(([id, value]) => ({ id, data: () => ({ ...value }) }));
          return { docs, empty: docs.length === 0, size: docs.length };
        },
      }),
      get: async () => {
        const docs = Object.entries(ensure())
          .filter(([, value]) => constraints.every(item => value[item.field] === item.value))
          .map(([id, value]) => ({ id, data: () => ({ ...value }) }));
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    });

    return {
      doc: (id: string) => {
        const ref = {
          id,
          get: async () => ({
            exists: ensure()[id] !== undefined,
            data: () => ensure()[id] ? { ...ensure()[id] } : undefined,
          }),
          set: async (payload: DocData, options?: { merge?: boolean }) => {
            harness.writes.push(`set:${name}/${id}`);
            ensure()[id] = options?.merge ? { ...ensure()[id], ...payload } : { ...payload };
          },
          update: async (payload: DocData) => {
            harness.writes.push(`update:${name}/${id}`);
            ensure()[id] = { ...ensure()[id], ...payload };
          },
          delete: async () => {
            harness.writes.push(`delete:${name}/${id}`);
            delete ensure()[id];
          },
          collection: (child: string) => makeCollection(collectionKey(name, id, child)),
        };
        return ref;
      },
      where: (field: string, _operator: string, value: unknown) => makeQuery([{ field, value }]),
      get: async () => makeQuery([]).get(),
    };
  };

  return {
    collection: (name: string) => makeCollection(name),
    runTransaction: async (callback: (transaction: {
      get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
      set: (ref: { set: (payload: DocData, options?: { merge?: boolean }) => Promise<void> }, payload: DocData, options?: { merge?: boolean }) => Promise<void>;
      update: (ref: { update: (payload: DocData) => Promise<void> }, payload: DocData) => Promise<void>;
    }) => Promise<unknown>) => {
      const transaction = {
        get: (ref: { get: () => Promise<unknown> }) => ref.get(),
        set: (ref: { set: (payload: DocData, options?: { merge?: boolean }) => Promise<void> }, payload: DocData, options?: { merge?: boolean }) => ref.set(payload, options),
        update: (ref: { update: (payload: DocData) => Promise<void> }, payload: DocData) => ref.update(payload),
      };
      return callback(transaction);
    },
  };
};

const buildHarness = (): Harness => {
  const harness: Harness = { store: {}, writes: [] };
  h.db = makeDb(harness);
  return harness;
};

const makeResponse = () => {
  const res = {
    statusCode: 0,
    payload: null as DocData | null,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: DocData) { res.payload = payload; return res; },
    setHeader() { return res; },
  };
  return res;
};

const call = async (body: DocData) => {
  const res = makeResponse();
  await handleClassroomOnlineAction(h.db as never, { idToken: 'student-token', ...body }, res as never);
  return res;
};

const seed = (harness: Harness, assignment: DocData = {}) => {
  harness.store.classes = {
    'class-1': { teacherId: 'teacher-1', name: '11 Columbus' },
  };
  harness.store[collectionKey('classes', 'class-1', 'students')] = {
    'student-1': { name: 'Nguyễn An' },
  };
  harness.store.studentLinks = {
    'student-uid-1': { uid: 'student-uid-1', studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1' },
  };
  harness.store.assignments = {
    'assignment-1': {
      id: 'assignment-1', classId: 'class-1', teacherId: 'teacher-1', type: 'exam', examId: 'exam-1',
      title: 'Luyện tập Hình học', isOpen: true, maxScore: 10, ...assignment,
    },
  };
  harness.store.exams = {
    'exam-1': {
      id: 'exam-1', code: 'HINH01', teacherId: 'teacher-1', title: 'Luyện tập Hình học',
      isActive: true, allowReview: true, maxScore: 10, durationMinutes: 30,
      questions: [{ id: 'q1', type: 'multiple_choice', content: 'Một cộng một bằng mấy?', options: ['1', '2'], correctAnswer: 'B', explanation: 'Đếm hai đơn vị.', points: 10 }],
    },
  };
};

describe('classroom online student actions', () => {
  beforeEach(() => { h.uid = 'student-uid-1'; });

  it('không lộ đáp án và tự gắn identity từ studentLink khi bắt đầu', async () => {
    const harness = buildHarness();
    seed(harness);

    const res = await call({ action: 'studentExamStart', assignmentId: 'assignment-1' });

    expect(res.statusCode).toBe(200);
    expect(res.payload?.exam).toEqual(expect.objectContaining({ id: 'exam-1' }));
    expect((res.payload?.exam as DocData).questions).toEqual([
      expect.not.objectContaining({ correctAnswer: 'B', explanation: 'Đếm hai đơn vị.' }),
    ]);
    expect(res.payload?.attempt).toEqual(expect.objectContaining({
      studentId: 'student-1', studentName: 'Nguyễn An', classId: 'class-1', assignmentId: 'assignment-1', attemptNumber: 1, status: 'in_progress',
    }));
  });

  it('từ chối assignment khác lớp/không phải đề online và target không thuộc nhóm', async () => {
    const cases: Array<{ assignment: DocData; status: number }> = [
      { assignment: { classId: 'class-other' }, status: 403 },
      { assignment: { type: 'upload' }, status: 403 },
      { assignment: { targetStudentIds: ['student-other'] }, status: 403 },
    ];

    for (const item of cases) {
      const harness = buildHarness();
      seed(harness, item.assignment);
      const res = await call({ action: 'studentExamStart', assignmentId: 'assignment-1' });
      expect(res.statusCode).toBe(item.status);
      expect(harness.store.examSubmissions || {}).toEqual({});
    }
  });

  it('resume cùng lượt đang làm và không tạo attempt thứ hai khi gọi lại', async () => {
    const harness = buildHarness();
    seed(harness);

    const first = await call({ action: 'studentExamStart', assignmentId: 'assignment-1' });
    const second = await call({ action: 'studentExamStart', assignmentId: 'assignment-1' });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect((second.payload?.attempt as DocData).id).toBe((first.payload?.attempt as DocData).id);
    expect(Object.keys(harness.store.examSubmissions || {})).toHaveLength(1);
  });

  it('save/submit chỉ nhận câu thuộc đề và submit lặp không nhân bản', async () => {
    const harness = buildHarness();
    seed(harness);
    const started = await call({ action: 'studentExamStart', assignmentId: 'assignment-1' });
    const attemptId = String((started.payload?.attempt as DocData).id);

    const saved = await call({ action: 'studentExamSave', attemptId, answers: [{ questionId: 'q1', answer: 'B' }, { questionId: 'other', answer: 'leak' }] });
    expect(saved.statusCode).toBe(200);
    expect((harness.store.examSubmissions[attemptId].answers as DocData[])).toEqual([{ questionId: 'q1', answer: 'B' }]);

    const submitted = await call({ action: 'studentExamSubmit', attemptId, answers: [{ questionId: 'q1', answer: 'B' }], nonce: 'nonce-1' });
    const repeated = await call({ action: 'studentExamSubmit', attemptId, answers: [{ questionId: 'q1', answer: 'B' }], nonce: 'nonce-1' });
    expect(submitted.statusCode).toBe(200);
    expect(repeated.statusCode).toBe(200);
    expect(harness.store.examSubmissions[attemptId]).toEqual(expect.objectContaining({ status: 'submitted', submittedAt: expect.any(String) }));
    expect(Object.keys(harness.store.examSubmissions)).toHaveLength(1);
  });

  it('từ chối khi đã hết số lần, nhưng không xóa lượt cũ', async () => {
    const harness = buildHarness();
    seed(harness);
    harness.store.exams['exam-1'].maxAttempts = 1;
    harness.store.examSubmissions = {
      'old-attempt': { id: 'old-attempt', studentId: 'student-1', classId: 'class-1', assignmentId: 'assignment-1', examId: 'exam-1', status: 'submitted', submittedAt: '2026-08-28T08:00:00.000Z' },
    };

    const res = await call({ action: 'studentExamStart', assignmentId: 'assignment-1' });

    expect(res.statusCode).toBe(409);
    expect(harness.store.examSubmissions['old-attempt']).toBeDefined();
  });
});
