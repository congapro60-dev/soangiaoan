import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleClassroomOnlineAction } from '../_classroom-online';

type Doc = Record<string, unknown>;
const h = vi.hoisted(() => ({ uid: 'student-uid-1', db: null as unknown }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }) }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  stripAnswerKey: (question: Doc) => question,
}));

const makeDb = (store: Record<string, Record<string, Doc>>) => {
  const collection = (name: string) => ({
    doc: (id: string) => ({
      id,
      get: async () => ({ exists: Boolean(store[name]?.[id]), data: () => store[name]?.[id] }),
    }),
    where: (field: string, _operator: string, value: unknown) => ({
      limit: (count: number) => ({
        get: async () => ({
          docs: Object.entries(store[name] || {})
            .filter(([, item]) => item[field] === value)
            .slice(0, count)
            .map(([id, item]) => ({ id, data: () => item })),
        }),
      }),
    }),
  });
  return { collection };
};

const call = async (body: Doc) => {
  const state = { statusCode: 0, payload: null as Doc | null };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(payload: Doc) { state.payload = payload; return response; },
  };
  await handleClassroomOnlineAction(h.db as never, { idToken: 'student-token', ...body }, response as never);
  return state;
};

describe('student online projection', () => {
  beforeEach(() => {
    const store: Record<string, Record<string, Doc>> = {
      studentLinks: {
        'student-uid-1': { studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1' },
      },
      examSubmissions: {
        own: {
          studentId: 'student-1', classId: 'class-1', assignmentId: 'assignment-1', examId: 'exam-1',
          status: 'graded', startedAt: '2026-08-28T08:00:00.000Z', submittedAt: '2026-08-28T08:20:00.000Z',
          totalScore: 8, maxScore: 10,
          answers: [{ questionId: 'q1', answer: 'A', teacherScore: 8 }],
          gradeState: 'official', gradingSource: 'teacher',
          grade: {
            score: 8, maxScore: 10, feedback: 'Em đã tiến bộ.', noteForTeacher: 'Không gửi cho học sinh.',
            teacherNote: 'Ghi chú nội bộ.', strengths: [], weaknesses: [], teacherApproved: true,
            gradedAt: '2026-08-28T08:21:00.000Z',
            questionResults: [{ questionNumber: 'Câu 1', status: 'correct', score: 8, maxScore: 10, studentAnswer: 'A', expectedAnswer: 'B', explanation: 'Nội bộ', errorType: '', correction: '', nextPractice: '', needsTeacherReview: false }],
          },
        },
        outsider: { studentId: 'student-2', classId: 'class-1', assignmentId: 'assignment-1', status: 'graded', startedAt: '2026-08-28T08:00:00.000Z' },
      },
    };
    h.db = makeDb(store);
  });

  it('chỉ trả lượt của chính học sinh và loại ghi chú/đáp án nội bộ', async () => {
    const result = await call({ action: 'studentOnlineSubmissions' });
    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as Doc[];
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toEqual(expect.objectContaining({ id: 'own', totalScore: 8, gradeState: 'official' }));
    expect(submissions[0].answers).toEqual([]);
    expect(submissions[0].grade).toEqual(expect.objectContaining({ feedback: 'Em đã tiến bộ.' }));
    expect(submissions[0].grade).not.toHaveProperty('noteForTeacher');
    expect(submissions[0].grade).not.toHaveProperty('teacherNote');
    expect((submissions[0].grade as Doc).questionResults).toEqual([
      expect.objectContaining({ expectedAnswer: '', explanation: '' }),
    ]);
  });
});
