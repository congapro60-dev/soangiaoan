import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleClassroomOnlineAction } from '../_classroom-online';
import handler from '../classroom';

type Doc = Record<string, unknown>;
const h = vi.hoisted(() => ({ uid: 'student-uid-1', db: null as unknown }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }) }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ name: 'unused.firebasestorage.app', file: () => ({ delete: async () => undefined }) }),
  stripAnswerKey: (question: Doc) => question,
}));

const makeDb = (store: Record<string, Record<string, Doc>>) => {
  const collection = (name: string) => ({
    doc: (id: string) => ({
      id,
      get: async () => ({ exists: Boolean(store[name]?.[id]), data: () => store[name]?.[id] }),
      set: async (payload: Doc, options?: { merge?: boolean }) => {
        store[name][id] = options?.merge ? { ...store[name][id], ...payload } : { ...payload };
      },
      update: async (payload: Doc) => {
        const next = { ...store[name][id] };
        for (const [key, value] of Object.entries(payload)) {
          if (!key.includes('.')) {
            next[key] = value;
            continue;
          }
          const [parent, child] = key.split('.', 2);
          next[parent] = { ...(next[parent] as Doc || {}), [child]: value };
        }
        store[name][id] = next;
      },
      delete: async () => { delete store[name][id]; },
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
  const runTransaction = async (work: (transaction: {
    get: (ref: { get: () => Promise<{ exists: boolean; data: () => Doc | undefined }> }) => Promise<{ exists: boolean; data: () => Doc | undefined }>;
    update: (ref: { update: (payload: Doc) => Promise<void> }, payload: Doc) => void;
    set: (ref: { set: (payload: Doc, options?: { merge?: boolean }) => Promise<void> }, payload: Doc, options?: { merge?: boolean }) => void;
  }) => Promise<unknown>) => {
    const operations: Array<() => Promise<void>> = [];
    const result = await work({
      get: ref => ref.get(),
      update: (ref, payload) => { operations.push(() => ref.update(payload)); },
      set: (ref, payload, options) => { operations.push(() => ref.set(payload, options)); },
    });
    for (const operation of operations) await operation();
    return result;
  };
  return { collection, runTransaction };
};

const callOnline = async (body: Doc) => {
  const state = { statusCode: 0, payload: null as Doc | null };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(payload: Doc) { state.payload = payload; return response; },
  };
  await handleClassroomOnlineAction(h.db as never, { idToken: 'student-token', ...body }, response as never);
  return state;
};

const callClassroom = async (body: Doc) => {
  const state = { statusCode: 0, payload: null as Doc | null };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(payload: Doc) { state.payload = payload; return response; },
  };
  await handler({ method: 'POST', body: { idToken: 'student-token', ...body } } as never, response as never);
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
        provisional: {
          studentId: 'student-1', classId: 'class-1', assignmentId: 'assignment-2', examId: 'exam-2',
          status: 'graded', startedAt: '2026-08-27T08:00:00.000Z', submittedAt: '2026-08-27T08:20:00.000Z',
          totalScore: 6, maxScore: 10, gradeState: 'provisional', gradingSource: 'ai',
          grade: { score: 6, maxScore: 10, feedback: 'AI tạm', strengths: [], weaknesses: [], teacherApproved: false, gradedAt: '2026-08-27T08:21:00.000Z', questionResults: [] },
        },
        outsider: { studentId: 'student-2', classId: 'class-1', assignmentId: 'assignment-1', status: 'graded', startedAt: '2026-08-28T08:00:00.000Z' },
      },
    };
    h.db = makeDb(store);
  });

  it('chỉ trả lượt của chính học sinh và loại ghi chú/đáp án nội bộ', async () => {
    const result = await callOnline({ action: 'studentOnlineSubmissions' });
    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as Doc[];
    expect(submissions).toHaveLength(2);
    expect(submissions[0]).toEqual(expect.objectContaining({ id: 'own', totalScore: 8, gradeState: 'official' }));
    // Điểm AI tạm (chưa duyệt): điểm và kết quả không rời máy chủ, em chỉ biết bài đang chờ duyệt.
    expect(submissions[1]).toEqual(expect.objectContaining({ id: 'provisional', gradeState: 'provisional', status: 'graded' }));
    expect(submissions[1]).not.toHaveProperty('totalScore');
    expect(submissions[1]).not.toHaveProperty('grade');
    expect(submissions[0].answers).toEqual([]);
    expect(submissions[0].grade).toEqual(expect.objectContaining({ feedback: 'Em đã tiến bộ.' }));
    expect(submissions[0].grade).not.toHaveProperty('noteForTeacher');
    expect(submissions[0].grade).not.toHaveProperty('teacherNote');
    expect((submissions[0].grade as Doc).questionResults).toEqual([
      expect.objectContaining({ expectedAnswer: '', explanation: '' }),
    ]);
  });
});

describe('student homework projection (projectStudentSubmission)', () => {
  beforeEach(() => {
    const store: Record<string, Record<string, Doc>> = {
      studentLinks: {
        'student-uid-1': { studentId: 'student-1', classId: 'class-1', teacherId: 'teacher-1' },
      },
      submissions: {
        'sub-1': {
          id: 'sub-1', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1', assignmentId: 'asg-1',
          fileUrls: [], textContent: 'Bài làm', note: '', status: 'graded',
          grade: {
            score: 8, maxScore: 10, feedback: 'Tốt', strengths: [], weaknesses: [], weakTopics: [],
            teacherApproved: false, approvalSource: 'student_ai', gradedAt: '2026-08-28T08:21:00.000Z',
            questionResults: [],
          },
          lastGradingError: 'Provider timeout raw error',
          evidenceSyncError: 'Sync failed internal error',
          createdAt: '2026-08-28T08:00:00.000Z', updatedAt: '2026-08-28T08:21:00.000Z',
        },
        'sub-2': {
          id: 'sub-2', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1', assignmentId: 'asg-1',
          fileUrls: [], textContent: 'Bài làm 2', note: '', status: 'error',
          errorMessage: 'AI provider down',
          createdAt: '2026-08-28T08:00:00.000Z', updatedAt: '2026-08-28T08:21:00.000Z',
        },
        'sub-photo': {
          id: 'sub-photo', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1', assignmentId: 'asg-1',
          fileUrls: [], note: '', status: 'error', errorReason: 'photo', errorMessage: 'Không đọc được bài làm (lỗi thô)',
          createdAt: '2026-08-28T08:00:00.000Z', updatedAt: '2026-08-28T08:21:00.000Z',
        },
        'sub-photo-cu': {
          id: 'sub-photo-cu', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1', assignmentId: 'asg-1',
          fileUrls: [], note: '', status: 'error', errorMessage: 'AI đọc chưa rõ bài này nên chưa chấm để tránh chấm sai.',
          createdAt: '2026-08-28T08:00:00.000Z', updatedAt: '2026-08-28T08:21:00.000Z',
        },
        'sub-code': {
          id: 'sub-code', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1', assignmentId: 'asg-1',
          fileUrls: [], note: '', status: 'error', errorReason: 'exam_code', examCodeAsk: ['101', '102'], errorMessage: 'Máy chưa đọc được mã đề (cho GV)',
          createdAt: '2026-08-28T08:00:00.000Z', updatedAt: '2026-08-28T08:21:00.000Z',
        },
        'sub-self': {
          id: 'sub-self', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1', assignmentId: null,
          fileUrls: [], note: '', status: 'graded',
          grade: { score: 6, maxScore: 10, feedback: 'Chấm thử', strengths: [], weaknesses: [], teacherApproved: false, gradedAt: '2026-08-28T08:21:00.000Z', questionResults: [] },
          createdAt: '2026-08-28T08:00:00.000Z', updatedAt: '2026-08-28T08:21:00.000Z',
        },
        'sub-3': {
          id: 'sub-3', teacherId: 'teacher-1', classId: 'class-1', studentId: 'student-1', assignmentId: 'asg-1',
          fileUrls: [], textContent: 'Bài làm 3', note: '', status: 'graded',
          grade: {
            score: 9, maxScore: 10, feedback: 'Rất tốt', strengths: [], weaknesses: [], weakTopics: [],
            teacherApproved: true, approvalSource: 'teacher', gradedAt: '2026-08-28T08:21:00.000Z',
            questionResults: [],
          },
          createdAt: '2026-08-28T08:00:00.000Z', updatedAt: '2026-08-28T08:21:00.000Z',
        },
      },
    };
    h.db = makeDb(store);
  });

  it('học sinh thấy lastGradingError an toàn (không lộ raw provider error) khi status graded có grade hợp lệ', async () => {
    const result = await callClassroom({ action: 'studentSubmissions' });
    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as Doc[];
    const gradedWithError = submissions.find(s => s.id === 'sub-1');
    expect(gradedWithError).toBeDefined();
    expect(gradedWithError!.status).toBe('graded');
    expect(gradedWithError!.lastGradingError).toBe('Lần chấm lại trước chưa thành công; điểm hiện tại vẫn được giữ nguyên.');
    // Không được lộ evidenceSyncError (teacher-only)
    expect(gradedWithError).not.toHaveProperty('evidenceSyncError');
    // Grade vẫn giữ nguyên
    // Chưa duyệt: điểm 8 không rời máy chủ, học sinh chỉ biết bài đang chờ duyệt.
    expect(gradedWithError!.grade).toMatchObject({ score: 0, teacherApproved: false, scoreHidden: true });
  });

  it('học sinh thấy errorMessage an toàn khi status error không có grade', async () => {
    const result = await callClassroom({ action: 'studentSubmissions' });
    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as Doc[];
    const errorNoGrade = submissions.find(s => s.id === 'sub-2');
    expect(errorNoGrade).toBeDefined();
    expect(errorNoGrade!.status).toBe('error');
    expect(errorNoGrade!.errorMessage).toBe('Bài đã được nhận nhưng máy chưa đọc xong. Em không cần nộp lại; thầy cô sẽ xử lý giúp em.');
    expect(errorNoGrade!.errorReason).toBe('system');
    expect(errorNoGrade).not.toHaveProperty('grade');
  });

  it('lỗi ảnh chưa rõ → bảo em chụp lại; chưa đọc được mã đề → gửi các mã để em chọn; không lộ câu gốc cho GV', async () => {
    const result = await callClassroom({ action: 'studentSubmissions' });
    const submissions = result.payload?.submissions as Doc[];
    const photo = submissions.find(s => s.id === 'sub-photo')!;
    expect(photo).toMatchObject({ errorReason: 'photo' });
    expect(String(photo.errorMessage)).toMatch(/chụp lại/);
    expect(photo).not.toHaveProperty('examCodeAsk');
    expect(submissions.find(s => s.id === 'sub-photo-cu')).toMatchObject({ errorReason: 'photo' });
    const code = submissions.find(s => s.id === 'sub-code')!;
    expect(code).toMatchObject({ errorReason: 'exam_code', examCodeAsk: ['101', '102'] });
    expect(String(code.errorMessage)).toMatch(/Em chọn đúng mã đề/);
  });

  it('học sinh KHÔNG thấy evidenceSyncError (teacher/internal-only)', async () => {
    const result = await callClassroom({ action: 'studentSubmissions' });
    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as Doc[];
    const gradedWithError = submissions.find(s => s.id === 'sub-1');
    expect(gradedWithError).not.toHaveProperty('evidenceSyncError');
  });

  it('học sinh không thấy lastGradingError khi grade đã duyệt và không có lỗi', async () => {
    const result = await callClassroom({ action: 'studentSubmissions' });
    expect(result.statusCode).toBe(200);
    const submissions = result.payload?.submissions as Doc[];
    const gradedApproved = submissions.find(s => s.id === 'sub-3');
    expect(gradedApproved).toBeDefined();
    expect(gradedApproved!.status).toBe('graded');
    expect(gradedApproved!.grade).toMatchObject({ score: 9, teacherApproved: true, approvalSource: 'teacher' });
    expect(gradedApproved).not.toHaveProperty('lastGradingError');
    expect(gradedApproved).not.toHaveProperty('evidenceSyncError');
  });

  it('bài "Chấm thử" (không gắn bài giao) không phải chờ duyệt: em thấy điểm và nhận xét ngay', async () => {
    const result = await callClassroom({ action: 'studentSubmissions' });
    const self = (result.payload?.submissions as Doc[]).find(s => s.id === 'sub-self');
    expect(self!.grade).toMatchObject({ score: 6, feedback: 'Chấm thử', teacherApproved: false });
    expect(self!.grade).not.toHaveProperty('scoreHidden');
  });
});
