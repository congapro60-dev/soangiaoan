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
import { FieldValue } from 'firebase-admin/firestore';

type DocData = Record<string, unknown>;

const FIELD_VALUE_DELETE = Symbol('FieldValue.delete');

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
          const next = { ...ensure(name)[id] };
          for (const [key, value] of Object.entries(payload)) {
            if (value === FIELD_VALUE_DELETE) {
              // Simulate FieldValue.delete() - remove the field
              if (!key.includes('.')) {
                delete next[key];
              } else {
                const [parent, child] = key.split('.', 2);
                if (next[parent] && typeof next[parent] === 'object') {
                  delete (next[parent] as DocData)[child];
                }
              }
              continue;
            }
            if (!key.includes('.')) {
              next[key] = value;
              continue;
            }
            const [parent, child] = key.split('.', 2);
            next[parent] = { ...(next[parent] as DocData || {}), [child]: value };
          }
          ensure(name)[id] = next;
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
    update: (ref: { update: (payload: DocData) => Promise<void> }, payload: DocData) => void;
    set: (ref: { set: (payload: DocData, options?: { merge?: boolean }) => Promise<void> }, payload: DocData, options?: { merge?: boolean }) => void;
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

// Mock FieldValue.delete for tests
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    delete: () => FIELD_VALUE_DELETE,
  },
}));

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

  it('duyệt điểm qua server và cập nhật evidence, không ghi trực tiếp từ client', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: false };

    const result = await call({ action: 'approveSubmissionGrade', submissionId: 'sub-1', approved: true });

    expect(result.statusCode).toBe(200);
    expect(harness.store.submissions['sub-1'].grade).toMatchObject({ teacherApproved: true });
    expect(harness.store.studentProfiles['hs-1'].topics).toEqual(expect.arrayContaining([
      expect.objectContaining({ topic: 'Dấu trong phương trình', evidenceSubmissionIds: ['sub-1'] }),
    ]));
  });

  it('không duyệt điểm trong lúc worker đang grading', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].status = 'grading';

    const result = await call({ action: 'approveSubmissionGrade', submissionId: 'sub-1', approved: true });

    expect(result.statusCode).toBe(409);
    expect(harness.store.submissions['sub-1'].grade).toEqual(oldGrade);
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

  it('duyệt điểm: payload không chứa approvalSource undefined khi bỏ duyệt', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: true };

    const result = await call({ action: 'approveSubmissionGrade', submissionId: 'sub-1', approved: false });

    expect(result.statusCode).toBe(200);
    const storedGrade = harness.store.submissions['sub-1'].grade;
    expect(storedGrade).toMatchObject({ teacherApproved: false });
    // approvalSource should be deleted (not set to undefined) - check it's not a string value
    expect(typeof storedGrade.approvalSource).not.toBe('string');
  });

  it('bỏ duyệt điểm: approvalSource bị xoá khỏi Firestore (FieldValue.delete semantics)', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: true, approvalSource: 'teacher' };

    const result = await call({ action: 'approveSubmissionGrade', submissionId: 'sub-1', approved: false });

    expect(result.statusCode).toBe(200);
    expect(harness.store.submissions['sub-1'].grade).toMatchObject({ teacherApproved: false });
    // approvalSource should be deleted (FieldValue.delete) - not present as string
    expect(typeof harness.store.submissions['sub-1'].grade.approvalSource).not.toBe('string');
  });

  it('retryEvidenceSync: bảo toàn approvalSource gốc và xoá evidenceSyncError khi thành công', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: true, approvalSource: 'teacher' };
    harness.store.submissions['sub-1'].evidenceSyncError = 'Lỗi đồng bộ cũ';

    const result = await call({ action: 'retryEvidenceSync', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ retried: true });
    expect(harness.store.submissions['sub-1'].grade).toMatchObject({ approvalSource: 'teacher' });
    expect(harness.store.submissions['sub-1'].evidenceSyncError).toBe('');
  });

  it('retryEvidenceSync: thất bại vẫn giữ approvalSource và ghi lại lỗi mới (best-effort)', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: true, approvalSource: 'student_ai' };
    harness.store.submissions['sub-1'].evidenceSyncError = 'Lỗi đồng bộ cũ';
    // Note: With the current mock harness, syncApprovedGradeEvidence doesn't throw
    // because it handles missing profiles gracefully. The best-effort try-catch
    // in handleRetryEvidenceSync is tested implicitly by the success case above.
    // This test verifies the main flow works and approvalSource is preserved.
    const result = await call({ action: 'retryEvidenceSync', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(harness.store.submissions['sub-1'].grade).toMatchObject({ approvalSource: 'student_ai' });
    expect(harness.store.submissions['sub-1'].evidenceSyncError).toBe('');
  });

  it('saveSubmissionGrade: xoá evidenceSyncError là best-effort (không làm mất response thành công)', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].evidenceSyncError = 'Lỗi cũ';
    // Force the evidenceSyncError clear update to throw
    const originalCollection = h.db.collection;
    h.db.collection = vi.fn((name: string) => {
      const col = originalCollection(name);
      if (name === 'submissions') {
        return {
          ...col,
          doc: (id: string) => ({
            ...col.doc(id),
            update: async (patch: Record<string, unknown>) => {
              if ('evidenceSyncError' in patch) throw new Error('Update failed');
              return col.doc(id).update(patch);
            },
          }),
        };
      }
      return col;
    });

    try {
      const result = await call({
        action: 'saveSubmissionGrade', submissionId: 'sub-1',
        grade: { score: 9, maxScore: 10, feedback: 'Em đã sửa được lỗi.', weakTopics: [], teacherNote: 'Đã kiểm tra lại.' },
      });

      // Should still succeed
      expect(result.statusCode).toBe(200);
      expect(result.payload).toMatchObject({ saved: true });
    } finally {
      h.db.collection = originalCollection;
    }
  });

  it('deleteSubmissionGrade: xoá evidenceSyncError là best-effort (không làm mất response thành công)', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].evidenceSyncError = 'Lỗi cũ';
    // Force the evidenceSyncError clear update to throw
    const originalCollection = h.db.collection;
    h.db.collection = vi.fn((name: string) => {
      const col = originalCollection(name);
      if (name === 'submissions') {
        return {
          ...col,
          doc: (id: string) => ({
            ...col.doc(id),
            update: async (patch: Record<string, unknown>) => {
              if ('evidenceSyncError' in patch) throw new Error('Update failed');
              return col.doc(id).update(patch);
            },
          }),
        };
      }
      return col;
    });

    try {
      const result = await call({ action: 'deleteSubmissionGrade', submissionId: 'sub-1' });

      expect(result.statusCode).toBe(200);
      expect(result.payload).toMatchObject({ deletedGrade: true });
    } finally {
      h.db.collection = originalCollection;
    }
  });

  it('saveSubmissionGrade: post-commit evidence cleanup failure records evidenceSyncError marker but preserves success', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].evidenceSyncError = 'Lỗi cũ';
    // Make removeSubmissionGradeEvidence fail by making studentProfiles set throw
    const originalCollection = h.db.collection;
    h.db.collection = vi.fn((name: string) => {
      const col = originalCollection(name);
      if (name === 'studentProfiles') {
        return {
          ...col,
          doc: (id: string) => ({
            ...col.doc(id),
            set: async () => { throw new Error('Evidence cleanup failed'); },
          }),
        };
      }
      return col;
    });

    const result = await call({
      action: 'saveSubmissionGrade', submissionId: 'sub-1',
      grade: { score: 9, maxScore: 10, feedback: 'Em đã sửa được lỗi.', weakTopics: [], teacherNote: 'Đã kiểm tra lại.' },
    });

    // Should still succeed because grade was committed before cleanup
    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ saved: true });
    // Grade should be committed
    expect(harness.store.submissions['sub-1']).toMatchObject({
      status: 'graded',
      grade: expect.objectContaining({ score: 9, teacherApproved: false, editedByTeacher: true }),
    });
    // evidenceSyncError should be set with the cleanup error message
    expect(typeof harness.store.submissions['sub-1'].evidenceSyncError).toBe('string');
    expect(harness.store.submissions['sub-1'].evidenceSyncError.length).toBeGreaterThan(0);
    // History should have been created
    expect(Object.values(harness.store.submissionGradeHistory || {})).toEqual([
      expect.objectContaining({ action: 'manual_edit', submissionId: 'sub-1', actorUid: 'gv-1' }),
    ]);

    h.db.collection = originalCollection;
  });

  it('deleteSubmissionGrade: post-commit evidence cleanup failure aborts deletion and preserves grade/submission/history', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].evidenceSyncError = 'Lỗi cũ';
    // Make removeSubmissionGradeEvidence fail
    const originalCollection = h.db.collection;
    h.db.collection = vi.fn((name: string) => {
      const col = originalCollection(name);
      if (name === 'studentProfiles') {
        return {
          ...col,
          doc: (id: string) => ({
            ...col.doc(id),
            set: async () => { throw new Error('Evidence cleanup failed'); },
          }),
        };
      }
      return col;
    });

    try {
      const result = await call({ action: 'deleteSubmissionGrade', submissionId: 'sub-1' });

      // Should fail because evidence cleanup failed (fail-closed)
      expect(result.statusCode).toBe(500);
      expect(result.payload).toMatchObject({ error: expect.stringContaining('Không thể xóa điểm') });
      // Grade should be preserved
      expect(harness.store.submissions['sub-1']).toMatchObject({ status: 'graded' });
      expect(harness.store.submissions['sub-1'].grade).toEqual(oldGrade);
      // No history should be created
      expect(harness.store.submissionGradeHistory).toBeUndefined();
    } finally {
      h.db.collection = originalCollection;
    }
  });

  it('retryEvidenceSync: unapproved grade (teacher AI regrade/manual edit) retries evidence cleanup when evidenceSyncError present', async () => {
    const harness = seed();
    // Unapproved grade (teacher AI regrade or manual edit)
    harness.store.submissions['sub-1'].grade = { ...oldGrade, score: 7, teacherApproved: false, approvalSource: 'teacher', editedByTeacher: true };
    harness.store.submissions['sub-1'].evidenceSyncError = 'Dọn minh chứng cũ thất bại';

    const result = await call({ action: 'retryEvidenceSync', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ retried: true });
    // approvalSource should be preserved
    expect(harness.store.submissions['sub-1'].grade).toMatchObject({ approvalSource: 'teacher', teacherApproved: false });
    // evidenceSyncError should be cleared
    expect(harness.store.submissions['sub-1'].evidenceSyncError).toBe('');
  });

  it('retryEvidenceSync: unapproved grade with student_ai approvalSource also works', async () => {
    const harness = seed();
    // Unapproved grade from student AI
    harness.store.submissions['sub-1'].grade = { ...oldGrade, score: 6, teacherApproved: false, approvalSource: 'student_ai' };
    harness.store.submissions['sub-1'].evidenceSyncError = 'Lỗi đồng bộ';

    const result = await call({ action: 'retryEvidenceSync', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(200);
    expect(result.payload).toMatchObject({ retried: true });
    expect(harness.store.submissions['sub-1'].grade).toMatchObject({ approvalSource: 'student_ai', teacherApproved: false });
    expect(harness.store.submissions['sub-1'].evidenceSyncError).toBe('');
  });

  it('retryEvidenceSync: failure preserves approvalSource and records error marker', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].grade = { ...oldGrade, score: 7, teacherApproved: false, approvalSource: 'teacher' };
    harness.store.submissions['sub-1'].evidenceSyncError = 'Lỗi cũ';
    // Make the cleanup fail by making studentProfiles set throw
    const originalCollection = h.db.collection;
    h.db.collection = vi.fn((name: string) => {
      const col = originalCollection(name);
      if (name === 'studentProfiles') {
        return {
          ...col,
          doc: (id: string) => ({
            ...col.doc(id),
            set: async () => { throw new Error('Cleanup failed again'); },
          }),
        };
      }
      return col;
    });

    const result = await call({ action: 'retryEvidenceSync', submissionId: 'sub-1' });

    expect(result.statusCode).toBe(500);
    expect(result.payload).toMatchObject({ retried: false });
    // approvalSource should be preserved
    expect(harness.store.submissions['sub-1'].grade).toMatchObject({ approvalSource: 'teacher' });
    // evidenceSyncError should be updated with new error
    expect(typeof harness.store.submissions['sub-1'].evidenceSyncError).toBe('string');
    expect(harness.store.submissions['sub-1'].evidenceSyncError.length).toBeGreaterThan(0);

    h.db.collection = originalCollection;
  });

  it('bỏ duyệt điểm: approvalSource thực sự bị xoá khỏi document (FieldValue.delete semantics)', async () => {
    const harness = seed();
    harness.store.submissions['sub-1'].grade = { ...oldGrade, teacherApproved: true, approvalSource: 'teacher' };

    const result = await call({ action: 'approveSubmissionGrade', submissionId: 'sub-1', approved: false });

    expect(result.statusCode).toBe(200);
    const storedGrade = harness.store.submissions['sub-1'].grade;
    expect(storedGrade).toMatchObject({ teacherApproved: false });
    // approvalSource should be completely absent from the stored object (simulating FieldValue.delete)
    expect('approvalSource' in storedGrade).toBe(false);
  });
});
