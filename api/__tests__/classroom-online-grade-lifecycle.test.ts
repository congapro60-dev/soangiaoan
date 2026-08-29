import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ uid: 'gv-1', db: null as unknown }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid, email: `${h.uid}@example.test` }) }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ name: 'unused.firebasestorage.app', file: () => ({ delete: async () => undefined }) }),
  stripAnswerKey: <T extends { correctAnswer?: unknown; explanation?: unknown }>(question: T) => {
    const { correctAnswer: _correctAnswer, explanation: _explanation, ...safe } = question;
    return safe;
  },
}));

import handler from '../classroom';

type Doc = Record<string, unknown>;

interface Harness {
  store: Record<string, Record<string, Doc>>;
  events: string[];
}

const makeDb = (harness: Harness) => {
  const ensure = (collectionName: string) => {
    harness.store[collectionName] ||= {};
    return harness.store[collectionName];
  };
  const collection = (collectionName: string) => ({
    doc: (id: string) => ({
      id,
      get: async () => {
        const data = ensure(collectionName)[id];
        return { exists: data !== undefined, data: () => data ? { ...data } : undefined };
      },
      set: async (payload: Doc, options?: { merge?: boolean }) => {
        harness.events.push(`set:${collectionName}/${id}`);
        ensure(collectionName)[id] = options?.merge ? { ...ensure(collectionName)[id], ...payload } : { ...payload };
      },
      update: async (payload: Doc) => {
        harness.events.push(`update:${collectionName}/${id}`);
        ensure(collectionName)[id] = { ...ensure(collectionName)[id], ...payload };
      },
      delete: async () => {
        harness.events.push(`delete:${collectionName}/${id}`);
        delete ensure(collectionName)[id];
      },
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
      get: (ref: { get: () => Promise<{ exists: boolean; data: () => Doc | undefined }> }) => Promise<{ exists: boolean; data: () => Doc | undefined }>;
      set: (ref: { set: (payload: Doc, options?: { merge?: boolean }) => Promise<void> }, payload: Doc, options?: { merge?: boolean }) => void;
      update: (ref: { update: (payload: Doc) => Promise<void> }, payload: Doc) => void;
    }) => Promise<unknown>) => {
      const operations: Array<() => Promise<void>> = [];
      const result = await work({
        get: ref => ref.get(),
        set: (ref, payload, options) => operations.push(() => ref.set(payload, options)),
        update: (ref, payload) => operations.push(() => ref.update(payload)),
      });
      for (const operation of operations) await operation();
      return result;
    },
  };
};

const call = async (body: Doc) => {
  const state = { statusCode: 0, payload: null as Doc | null };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(payload: Doc) { state.payload = payload; return response; },
  };
  await handler({ method: 'POST', body: { idToken: 'token', ...body } } as never, response as never);
  return state;
};

const seed = (overrides: Doc = {}): Harness => {
  const harness: Harness = { store: {}, events: [] };
  h.db = makeDb(harness);
  harness.store.classes = { 'lop-1': { id: 'lop-1', teacherId: 'gv-1', ownerId: 'gv-1', name: '11 Columbus' } };
  harness.store.assignments = {
    'asg-1': {
      id: 'asg-1', teacherId: 'gv-1', classId: 'lop-1', type: 'exam', examId: 'exam-1',
      title: 'Bài online', maxScore: 5, isOpen: true, gradingPolicy: 'mixed', skillIds: ['math.line-equation'],
    },
  };
  harness.store.exams = {
    'exam-1': {
      id: 'exam-1', teacherId: 'gv-1', code: 'ABC123', title: 'Đề Toán', maxScore: 5,
      isActive: true, allowReview: true, questions: [
        { id: 'q1', type: 'multiple_choice', content: 'Chọn A', options: ['A', 'B'], correctAnswer: 'A', points: 2, explanation: 'Vì A đúng.' },
        { id: 'q2', type: 'essay', content: 'Giải $x=1$.', correctAnswer: 'x=1', points: 3, explanation: 'Cần nêu đủ bước.' },
      ],
    },
  };
  harness.store.examSubmissions = {
    'attempt-1': {
      id: 'attempt-1', examId: 'exam-1', examCode: 'ABC123', classId: 'lop-1', assignmentId: 'asg-1',
      studentId: 'hs-1', studentName: 'Nguyễn An', studentClass: '11 Columbus', status: 'submitted',
      startedAt: '2026-08-28T09:00:00.000Z', submittedAt: '2026-08-28T09:20:00.000Z', maxScore: 5,
      answers: [{ questionId: 'q1', answer: 'A' }, { questionId: 'q2', answer: 'x = 1' }],
      ...overrides,
    },
  };
  return harness;
};

describe('POST /api/classroom · online grade lifecycle', () => {
  beforeEach(() => { h.uid = 'gv-1'; });

  it('giáo viên sửa điểm theo câu, giữ bài làm và buộc duyệt lại', async () => {
    const harness = seed();
    const result = await call({
      action: 'teacherOnlineSaveGrade', attemptId: 'attempt-1',
      edit: { questionScores: { q1: 1.5, q2: 2.5 }, questionFeedback: { q2: 'Cần trình bày đủ bước.' }, feedback: 'Cần hoàn thiện phần trình bày.', weakTopics: ['Trình bày lời giải'] },
    });

    expect(result.statusCode).toBe(200);
    expect(harness.store.examSubmissions['attempt-1']).toMatchObject({
      status: 'graded',
      answers: expect.arrayContaining([expect.objectContaining({ questionId: 'q2', answer: 'x = 1', teacherScore: 2.5 })]),
      grade: expect.objectContaining({ score: 4, teacherApproved: false, editedByTeacher: true }),
      gradeState: 'pending_teacher_review',
    });
    expect(Object.values(harness.store.submissionGradeHistory || {})).toEqual([
      expect.objectContaining({ action: 'manual_edit', submissionId: 'attempt-1', actorUid: 'gv-1' }),
    ]);
  });

  it('duyệt rồi xóa điểm: history giữ nguyên, answers gốc vẫn còn', async () => {
    const harness = seed({ grade: { score: 4, maxScore: 5, feedback: 'Tạm', strengths: [], weaknesses: [], questionResults: [], teacherApproved: false, gradedAt: '2026-08-28T09:30:00.000Z' }, gradeState: 'pending_teacher_review', status: 'graded' });
    const approved = await call({ action: 'teacherOnlineApproveGrade', attemptId: 'attempt-1' });
    expect(approved.statusCode).toBe(200);
    expect(harness.store.examSubmissions['attempt-1']).toMatchObject({ grade: expect.objectContaining({ teacherApproved: true }), gradeState: 'official' });
    expect(harness.store.studentSkillEvidence['hs-1__attempt-1%3Amath.line-equation']).toEqual(expect.objectContaining({ source: 'homework', approved: true }));

    const removed = await call({ action: 'teacherOnlineDeleteGrade', attemptId: 'attempt-1' });
    expect(removed.statusCode).toBe(200);
    expect(harness.store.examSubmissions['attempt-1']).toMatchObject({ status: 'submitted', answers: [{ questionId: 'q1', answer: 'A' }, { questionId: 'q2', answer: 'x = 1' }] });
    expect(harness.store.examSubmissions['attempt-1'].grade).toBeUndefined();
    expect(harness.store.studentSkillEvidence['hs-1__attempt-1%3Amath.line-equation']).toBeUndefined();
    expect(Object.values(harness.store.submissionGradeHistory || {})).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'approve', submissionId: 'attempt-1' }),
      expect.objectContaining({ action: 'delete', submissionId: 'attempt-1' }),
    ]));
  });

  it('regrade objective trên server thành official; giáo viên khác không được sửa', async () => {
    const harness = seed({
      assignmentId: 'asg-objective',
      answers: [{ questionId: 'q1', answer: 'A' }],
    });
    harness.store.assignments['asg-objective'] = { id: 'asg-objective', teacherId: 'gv-1', classId: 'lop-1', type: 'exam', examId: 'exam-1', maxScore: 2, isOpen: true, gradingPolicy: 'automatic', skillIds: ['math.line-equation'] };
    harness.store.exams['exam-1'].questions = [harness.store.exams['exam-1'].questions[0]];
    harness.store.examSubmissions['attempt-1'].assignmentId = 'asg-objective';
    harness.store.examSubmissions['attempt-1'].maxScore = 2;
    h.uid = 'gv-khac';
    const denied = await call({ action: 'teacherOnlineSaveGrade', attemptId: 'attempt-1', edit: { questionScores: { q1: 0 } } });
    expect(denied.statusCode).toBe(403);

    h.uid = 'gv-1';
    const result = await call({ action: 'teacherOnlineRegrade', attemptId: 'attempt-1' });
    expect(result.statusCode).toBe(200);
    expect(harness.store.examSubmissions['attempt-1']).toMatchObject({ status: 'graded', gradeState: 'official', grade: expect.objectContaining({ score: 2, teacherApproved: true }) });
    expect(harness.store.studentSkillEvidence['hs-1__attempt-1%3Amath.line-equation']).toEqual(expect.objectContaining({ source: 'homework', approved: true }));
    expect(Object.values(harness.store.submissionGradeHistory || {})).toEqual(expect.arrayContaining([
      expect.objectContaining({ action: 'automatic_regrade', submissionId: 'attempt-1' }),
    ]));
  });
});
