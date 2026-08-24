import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../classroom';

/**
 * Test hồi quy cho hai action xoá bài (057cd7b): quyền giáo viên, thứ tự dọn file
 * Storage trước khi xoá document, và việc lỗi dữ liệu URL phải trả message cụ thể
 * thay vì bị catch tổng che thành 500 "thử lại sau" vô vọng.
 *
 * Firestore/Admin được thay bằng stub tối thiểu đủ cho luồng đọc/ghi của hai handler,
 * nên test chạy nhanh và không cần emulator hay credential thật.
 */

const h = vi.hoisted(() => ({
  uid: 'gv-1',
  db: null as unknown,
  bucket: null as unknown,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken: async () => ({ uid: h.uid }) }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => h.bucket,
}));

const BUCKET = 'smartplan-ai-14200.firebasestorage.app';
const deUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/assignments%2Fgv-1%2Fde-1.pdf?alt=media&token=t1`;
const baiLamUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/homework%2Fhs-uid%2Fsub-1-0.jpg?alt=media&token=t2`;

type DocData = Record<string, unknown>;

interface Harness {
  store: Record<string, Record<string, DocData>>;
  deletedPaths: string[];
  events: string[];
}

const makeBucket = (harness: Harness) => ({
  name: BUCKET,
  file: (path: string) => ({
    delete: async () => {
      harness.events.push(`storage:${path}`);
      harness.deletedPaths.push(path);
    },
  }),
});

const makeDb = (harness: Harness) => ({
  collection: (colName: string) => ({
    doc: (docId: string) => {
      const touch = (col: string, id: string) => {
        harness.store[col] = harness.store[col] || {};
        return harness.store[col];
      };
      return {
        get: async () => {
          const col = touch(colName, docId);
          const data = col[docId];
          return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
        },
        delete: async () => {
          const col = touch(colName, docId);
          harness.events.push(`delete:${colName}/${docId}`);
          delete col[docId];
        },
        set: async (payload: DocData, opts?: { merge?: boolean }) => {
          const col = touch(colName, docId);
          harness.events.push(`set:${colName}/${docId}`);
          col[docId] = opts?.merge ? { ...col[docId], ...payload } : payload;
        },
      };
    },
    where: (field: string, _op: string, value: unknown) => ({
      limit: (_n: number) => ({
        get: async () => {
          const col = harness.store[colName] || {};
          const docs = Object.entries(col)
            .filter(([, d]) => d[field] === value)
            .map(([id]) => ({ id }));
          return { empty: docs.length === 0, docs };
        },
      }),
    }),
  }),
});

const buildHarness = (): Harness => {
  const harness: Harness = { store: {}, deletedPaths: [], events: [] };
  h.db = makeDb(harness);
  h.bucket = makeBucket(harness);
  return harness;
};

const call = async (body: DocData) => {
  const res = {
    statusCode: 0,
    payload: null as DocData | null,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: DocData) { res.payload = payload; return res; },
  };
  await handler({ method: 'POST', body: { idToken: 'id-token-thu-nghiem', ...body } } as never, res as never);
  return res;
};

describe('POST /api/classroom · deleteSubmission', () => {
  beforeEach(() => { h.uid = 'gv-1'; });

  it('chủ lớp xoá được: dọn đúng path Storage (trùng URL chỉ xoá một lần) rồi mới xoá document', async () => {
    const harness = buildHarness();
    harness.store['submissions'] = {
      'sub-1': {
        teacherId: 'gv-1',
        classId: 'lop-1',
        studentId: 'hs-1',
        assignmentId: 'asg-1',
        grade: { score: 8, maxScore: 10, teacherApproved: true },
        fileUrls: [baiLamUrl],
        attachments: [{ name: 'Ảnh bài làm 1', url: baiLamUrl }],
      },
    };
    harness.store['studentProfiles'] = {
      'hs-1': { studentId: 'hs-1', classId: 'lop-1', topics: [
        { topic: 'Phân số', level: 'weak', evidenceSubmissionIds: ['sub-1'] },
        { topic: 'Chu vi', level: 'solid', evidenceSubmissionIds: ['sub-khac'] },
      ] },
    };

    const res = await call({ action: 'deleteSubmission', submissionId: 'sub-1' });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ deleted: true, deletedFiles: 1 });
    // File dọn TRƯỚC, document xoá SAU — lỗi giữa chừng thì bài nộp còn để thử lại.
    expect(harness.events).toEqual([
      `storage:homework/hs-uid/sub-1-0.jpg`,
      'set:studentProfiles/hs-1',
      'delete:submissions/sub-1',
    ]);
  });

  it('URL ngoài Firebase không chặn xoá document bằng lỗi chung — trả 422 kèm nguyên nhân, giữ bài nộp để sửa dữ liệu', async () => {
    const harness = buildHarness();
    harness.store['submissions'] = {
      'sub-1': {
        teacherId: 'gv-1',
        classId: 'lop-1',
        studentId: 'hs-1',
        assignmentId: null,
        fileUrls: [baiLamUrl],
        attachments: [{ url: 'https://example.com/khong-do-duoc.jpg' }],
      },
    };

    const res = await call({ action: 'deleteSubmission', submissionId: 'sub-1' });

    expect(res.statusCode).toBe(422);
    expect(res.payload).toEqual({ error: 'Không xác định được đường dẫn file Storage để dọn an toàn.' });
    // Không dọn nửa chừng: file hợp lệ vẫn nguyên, document chưa xoá.
    expect(harness.events).toEqual([]);
    expect(harness.deletedPaths).toEqual([]);
    expect(harness.store['submissions']['sub-1']).toBeDefined();
  });

  it('giáo viên khác không xoá được bài nộp của chủ lớp', async () => {
    const harness = buildHarness();
    h.uid = 'gv-xam-lang';
    harness.store['submissions'] = {
      'sub-1': { teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', fileUrls: [baiLamUrl], attachments: [] },
    };

    const res = await call({ action: 'deleteSubmission', submissionId: 'sub-1' });

    expect(res.statusCode).toBe(403);
    expect(harness.events).toEqual([]);
  });
});

describe('POST /api/classroom · deleteAssignment', () => {
  beforeEach(() => { h.uid = 'gv-1'; });

  it('chặn xoá khi đã có bài nộp: trả 409 và không đụng file đề', async () => {
    const harness = buildHarness();
    harness.store['assignments'] = {
      'asg-1': { teacherId: 'gv-1', classId: 'lop-1', attachments: [{ name: 'de.pdf', url: deUrl }] },
    };
    harness.store['submissions'] = {
      'sub-1': { teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1', fileUrls: [], attachments: [] },
    };

    const res = await call({ action: 'deleteAssignment', assignmentId: 'asg-1' });

    expect(res.statusCode).toBe(409);
    expect(harness.events).toEqual([]);
    expect(harness.store['assignments']['asg-1']).toBeDefined();
  });

  it('chưa có bài nộp thì xoá file đề rồi xoá document', async () => {
    const harness = buildHarness();
    harness.store['assignments'] = {
      'asg-1': {
        teacherId: 'gv-1',
        classId: 'lop-1',
        attachments: [{ name: 'de.pdf', url: deUrl }],
        sourceImageUrls: [],
        answerKeyImageUrls: [`gs://${BUCKET}/assignments/gv-1/dapan-1.jpg`],
      },
    };

    const res = await call({ action: 'deleteAssignment', assignmentId: 'asg-1' });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ deleted: true, deletedFiles: 2 });
    expect(harness.events).toEqual([
      'storage:assignments/gv-1/de-1.pdf',
      'storage:assignments/gv-1/dapan-1.jpg',
      'delete:assignments/asg-1',
    ]);
  });

  it('bài giao có URL hỏng thì giữ lại toàn bộ và báo đúng lý do thay vì 500 chung', async () => {
    const harness = buildHarness();
    harness.store['assignments'] = {
      'asg-1': { teacherId: 'gv-1', classId: 'lop-1', sourceImageUrls: ['not-a-url'], attachments: [] },
    };

    const res = await call({ action: 'deleteAssignment', assignmentId: 'asg-1' });

    expect(res.statusCode).toBe(422);
    expect(res.payload).toEqual({ error: 'Không xác định được đường dẫn file Storage để dọn an toàn.' });
    expect(harness.events).toEqual([]);
    expect(harness.store['assignments']['asg-1']).toBeDefined();
  });

  it('giáo viên khác không xoá được bài giao', async () => {
    const harness = buildHarness();
    h.uid = 'gv-xam-lang';
    harness.store['assignments'] = {
      'asg-1': { teacherId: 'gv-1', classId: 'lop-1', attachments: [] },
    };

    const res = await call({ action: 'deleteAssignment', assignmentId: 'asg-1' });

    expect(res.statusCode).toBe(403);
    expect(harness.events).toEqual([]);
  });
});
