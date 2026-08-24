import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  uid: 'gv-1',
  db: null as unknown,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }) }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ name: 'unused.firebasestorage.app', file: () => ({ delete: async () => undefined }) }),
}));

import handler from '../classroom';

type DocData = Record<string, unknown>;

interface Harness {
  store: Record<string, Record<string, DocData>>;
  events: string[];
}

const makeDb = (harness: Harness) => {
  const ensure = (name: string) => {
    harness.store[name] ||= {};
    return harness.store[name];
  };
  const makeQuery = (name: string, constraints: Array<{ field: string; value: unknown }>) => ({
    where: (field: string, _operator: string, value: unknown) => makeQuery(name, [...constraints, { field, value }]),
    get: async () => {
      const docs = Object.entries(ensure(name))
        .filter(([, data]) => constraints.every(item => data[item.field] === item.value))
        .map(([id, data]) => ({ id, data: () => ({ ...data }) }));
      return { empty: docs.length === 0, docs };
    },
  });

  const collection = (name: string) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = ensure(name)[id];
          return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
        },
        set: async (payload: DocData, options?: { merge?: boolean }) => {
          harness.events.push(`set:${name}/${id}`);
          ensure(name)[id] = options?.merge ? { ...ensure(name)[id], ...payload } : { ...payload };
        },
        update: async (payload: DocData) => {
          harness.events.push(`update:${name}/${id}`);
          ensure(name)[id] = { ...ensure(name)[id], ...payload };
        },
        delete: async () => {
          harness.events.push(`delete:${name}/${id}`);
          delete ensure(name)[id];
        },
      }),
      where: (field: string, _operator: string, value: unknown) => makeQuery(name, [{ field, value }]),
    });
  const runTransaction = async (work: (transaction: {
    get: (ref: { get: () => Promise<{ exists: boolean; data: () => DocData | undefined }> }) => Promise<{ exists: boolean; data: () => DocData | undefined }>;
    set: (ref: { set: (payload: DocData, options?: { merge?: boolean }) => Promise<void> }, payload: DocData, options?: { merge?: boolean }) => void;
  }) => Promise<unknown>) => {
    const operations: Array<() => Promise<void>> = [];
    const result = await work({
      get: ref => ref.get(),
      set: (ref, payload, options) => { operations.push(() => ref.set(payload, options)); },
    });
    for (const operation of operations) await operation();
    return result;
  };
  return { collection, runTransaction };
};

const call = async (body: DocData) => {
  const state = { statusCode: 0, payload: null as DocData | null };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(payload: DocData) { state.payload = payload; return response; },
  };
  await handler({ method: 'POST', body: { idToken: 'token', ...body } } as never, response as never);
  return state;
};

const oldGrade = {
  score: 8,
  maxScore: 10,
  feedback: 'Nhận xét cũ',
  strengths: ['Biết đặt ẩn'],
  weaknesses: ['Nhầm dấu'],
  weakTopics: ['Dấu trong phương trình'],
  teacherApproved: true,
  gradedAt: '2026-08-24T10:00:00.000Z',
};

const seed = (): Harness => {
  const harness: Harness = { store: {}, events: [] };
  h.db = makeDb(harness);
  harness.store.submissions = {
    'sub-1': {
      id: 'sub-1', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
      fileUrls: ['https://storage.test/homework/sub-1.jpg'],
      attachments: [{ name: 'sub-1.jpg', url: 'https://storage.test/homework/sub-1.jpg', kind: 'image' }],
      textContent: 'Bài làm nguyên bản', note: 'Ghi chú của em', status: 'graded', grade: oldGrade,
      createdAt: '2026-08-24T09:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z',
    },
  };
  harness.store.assignments = {
    'asg-1': { id: 'asg-1', teacherId: 'gv-1', classId: 'lop-1', title: 'Bài kiểm tra' },
  };
  harness.store.studentProfiles = {
    'hs-1': {
      studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1',
      topics: [{ topic: 'Dấu trong phương trình', level: 'weak', evidenceSubmissionIds: ['sub-1'], updatedAt: '2026-08-24T10:00:00.000Z' }],
    },
  };
  harness.store.studentSkillEvidence = {
    'hs-1__sub-1%3Amath.line-equation': {
      studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1', submissionId: 'sub-1', skillId: 'math.line-equation',
      evidenceId: 'sub-1:math.line-equation', source: 'homework', approved: true,
    },
  };
  return harness;
};

describe('POST /api/classroom · grade lifecycle', () => {
  beforeEach(() => { h.uid = 'gv-1'; });

  it('sửa tay lưu snapshot, cập nhật điểm và buộc duyệt lại', async () => {
    const harness = seed();
    const result = await call({
      action: 'saveSubmissionGrade', submissionId: 'sub-1',
      grade: { score: 9, maxScore: 10, feedback: 'Em đã sửa được lỗi.', weakTopics: [], teacherNote: 'Đã kiểm tra lại.' },
    });

    expect(result.statusCode).toBe(200);
    expect(harness.store.submissions['sub-1']).toMatchObject({
      status: 'graded',
      fileUrls: ['https://storage.test/homework/sub-1.jpg'],
      textContent: 'Bài làm nguyên bản',
      grade: expect.objectContaining({ score: 9, feedback: 'Em đã sửa được lỗi.', teacherApproved: false, editedByTeacher: true }),
    });
    expect(Object.values(harness.store.submissionGradeHistory || {})).toEqual([
      expect.objectContaining({ action: 'manual_edit', submissionId: 'sub-1', grade: oldGrade, actorUid: 'gv-1' }),
    ]);
    expect(harness.store.studentSkillEvidence['hs-1__sub-1%3Amath.line-equation']).toBeUndefined();
  });

  it('xóa riêng kết quả chấm nhưng giữ nguyên bài nộp và không dọn Storage', async () => {
    const harness = seed();
    const result = await call({ action: 'deleteSubmissionGrade', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(harness.store.submissions['sub-1']).toMatchObject({
      status: 'submitted',
      fileUrls: ['https://storage.test/homework/sub-1.jpg'],
      attachments: [{ url: 'https://storage.test/homework/sub-1.jpg' }],
      textContent: 'Bài làm nguyên bản',
      note: 'Ghi chú của em',
    });
    expect(harness.store.submissions['sub-1'].grade).toBeUndefined();
    expect(Object.values(harness.store.submissionGradeHistory || {})).toEqual([
      expect.objectContaining({ action: 'delete', grade: oldGrade, submissionId: 'sub-1' }),
    ]);
    expect(harness.events.some(event => event.startsWith('storage:'))).toBe(false);
    expect(harness.store.studentSkillEvidence['hs-1__sub-1%3Amath.line-equation']).toBeUndefined();
  });

  it('không cho giáo viên khác sửa hoặc xóa điểm', async () => {
    const harness = seed();
    h.uid = 'gv-khac';

    const save = await call({ action: 'saveSubmissionGrade', submissionId: 'sub-1', grade: { score: 4, maxScore: 10, feedback: 'x', weakTopics: [] } });
    const remove = await call({ action: 'deleteSubmissionGrade', submissionId: 'sub-1' });

    expect(save.statusCode).toBe(403);
    expect(remove.statusCode).toBe(403);
    expect(harness.store.submissions['sub-1'].grade).toEqual(oldGrade);
    expect(harness.store.submissionGradeHistory).toBeUndefined();
  });

  it('không xóa điểm trong lúc submission đang được AI chấm', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].status = 'grading';

    const result = await call({ action: 'deleteSubmissionGrade', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(409);
    expect(harness.store.submissions['sub-1'].grade).toEqual(oldGrade);
  });

  it('từ chối payload chấm tay không hợp lệ và không tạo lịch sử', async () => {
    const harness = seed();

    const result = await call({
      action: 'saveSubmissionGrade', submissionId: 'sub-1',
      grade: { score: 11, maxScore: 10, feedback: 'không hợp lệ', weakTopics: [] },
    });

    expect(result.statusCode).toBe(422);
    expect(harness.store.submissions['sub-1'].grade).toEqual(oldGrade);
    expect(harness.store.submissionGradeHistory).toBeUndefined();
  });

  it('từ chối bài nộp thiếu định danh lớp/học sinh hoặc trỏ sang bài giao khác lớp', async () => {
    const missingIdentity = seed();
    delete missingIdentity.store.submissions['sub-1'].classId;
    const missing = await call({
      action: 'saveSubmissionGrade', submissionId: 'sub-1',
      grade: { score: 9, maxScore: 10, feedback: 'x', weakTopics: [] },
    });
    expect(missing.statusCode).toBe(422);
    expect(missingIdentity.store.submissions['sub-1'].grade).toEqual(oldGrade);

    const mismatched = seed();
    mismatched.store.assignments['asg-1'] = { teacherId: 'gv-1', classId: 'lop-khac' };
    const mismatch = await call({
      action: 'deleteSubmissionGrade', submissionId: 'sub-1',
    });
    expect(mismatch.statusCode).toBe(422);
    expect(mismatched.store.submissions['sub-1'].grade).toEqual(oldGrade);
  });
});
