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
const studentHomeworkUrl = (fileName: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(`homework/hs-uid/${fileName}`)}?alt=media&token=test`;

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
    where: (field: string, _op: string, value: unknown) => {
      const query = (constraints: Array<{ field: string; value: unknown }>) => ({
        where: (nextField: string, _nextOp: string, nextValue: unknown) => query([
          ...constraints,
          { field: nextField, value: nextValue },
        ]),
        limit: (count: number) => ({
          get: async () => {
            const col = harness.store[colName] || {};
            const docs = Object.entries(col)
              .filter(([, d]) => constraints.every(item => d[item.field] === item.value))
              .slice(0, count)
              .map(([id, data]) => ({ id, data: () => ({ ...data }) }));
            return { empty: docs.length === 0, docs };
          },
        }),
        get: async () => {
          const col = harness.store[colName] || {};
          const docs = Object.entries(col)
            .filter(([, d]) => constraints.every(item => d[item.field] === item.value))
            .map(([id, data]) => ({ id, data: () => ({ ...data }) }));
          return { empty: docs.length === 0, docs };
        },
      });
      return query([{ field, value }]);
    },
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
    harness.store['studentSkillEvidence'] = {
      'hs-1__sub-1%3Amath.line-equation': {
        studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1',
        evidenceId: 'sub-1:math.line-equation', submissionId: 'sub-1', skillId: 'math.line-equation',
      },
    };

    const res = await call({ action: 'deleteSubmission', submissionId: 'sub-1' });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ deleted: true, deletedFiles: 1 });
    // File dọn TRƯỚC, document xoá SAU — lỗi giữa chừng thì bài nộp còn để thử lại.
    expect(harness.events).toEqual([
      `storage:homework/hs-uid/sub-1-0.jpg`,
      'set:studentProfiles/hs-1',
      'delete:studentSkillEvidence/hs-1__sub-1%3Amath.line-equation',
      'set:studentProfiles/hs-1',
      'delete:submissions/sub-1',
    ]);
    expect(harness.store['studentSkillEvidence']['hs-1__sub-1%3Amath.line-equation']).toBeUndefined();
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

  it('xoá bài đã duyệt chỉ gỡ evidence của đúng assignment, giữ bằng chứng assignment khác', async () => {
    const harness = buildHarness();
    harness.store['submissions'] = {
      'sub-1': {
        teacherId: 'gv-1',
        classId: 'lop-1',
        studentId: 'hs-1',
        assignmentId: 'asg-1',
        grade: { score: 8, maxScore: 10, teacherApproved: true },
        fileUrls: [baiLamUrl],
        attachments: [],
      },
    };
    harness.store['studentProfiles'] = {
      'hs-1': {
        studentId: 'hs-1',
        classId: 'lop-1',
        topics: [{
          topic: 'Phân số',
          level: 'weak',
          evidenceSubmissionIds: ['sub-1', 'sub-2'],
          evidenceRefs: [
            { submissionId: 'sub-1', assignmentId: 'asg-1', evidenceType: 'homework', assessedAt: '2026-08-20T10:00:00.000Z' },
            { submissionId: 'sub-2', assignmentId: 'asg-2', evidenceType: 'homework', assessedAt: '2026-08-21T10:00:00.000Z' },
          ],
          updatedAt: '2026-08-21T10:00:00.000Z',
        }],
      },
    };

    const res = await call({ action: 'deleteSubmission', submissionId: 'sub-1' });

    expect(res.statusCode).toBe(200);
    expect(harness.store['studentProfiles']['hs-1'].topics).toEqual([
      expect.objectContaining({
        topic: 'Phân số',
        level: 'developing',
        evidenceSubmissionIds: ['sub-2'],
        evidenceRefs: [expect.objectContaining({ assignmentId: 'asg-2', submissionId: 'sub-2' })],
      }),
    ]);
  });

  it('giữ file còn được revision con tham chiếu khi xóa submission cha', async () => {
    const harness = buildHarness();
    const sharedUrl = baiLamUrl;
    const parentOnlyUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/homework%2Fhs-uid%2Fsub-1-only.jpg?alt=media&token=t3`;
    harness.store['submissions'] = {
      'sub-parent': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        fileUrls: [sharedUrl, parentOnlyUrl], attachments: [], status: 'graded',
      },
      'sub-child': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        supplementOf: 'sub-parent', fileUrls: [sharedUrl], attachments: [], status: 'submitted',
      },
    };

    const res = await call({ action: 'deleteSubmission', submissionId: 'sub-parent' });

    expect(res.statusCode).toBe(200);
    expect(harness.deletedPaths).toEqual(['homework/hs-uid/sub-1-only.jpg']);
    expect(harness.store['submissions']['sub-parent']).toBeUndefined();
    expect(harness.store['submissions']['sub-child']).toBeDefined();
  });
});

describe('POST /api/classroom · createSupplementSubmission', () => {
  beforeEach(() => { h.uid = 'hs-uid'; });

  it('tạo revision ghép file cũ và file mới, giữ revision cũ nguyên trạng', async () => {
    const harness = buildHarness();
    harness.store['studentLinks'] = {
      'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' },
    };
    harness.store['assignments'] = {
      'asg-1': { teacherId: 'gv-1', classId: 'lop-1', isOpen: true },
    };
    harness.store['submissions'] = {
      'sub-old': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        fileUrls: [studentHomeworkUrl('old-1.jpg'), studentHomeworkUrl('old-2.jpg')],
        attachments: [{ name: 'old-1.jpg', url: studentHomeworkUrl('old-1.jpg'), kind: 'image' }],
        textContent: 'Phần cũ', status: 'graded', grade: { score: 4, teacherApproved: false },
      },
    };

    const res = await call({
      action: 'createSupplementSubmission',
      submission: {
        id: 'sub-new', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        supplementOf: 'sub-old', fileUrls: [studentHomeworkUrl('new-1.jpg'), studentHomeworkUrl('old-2.jpg')],
        attachments: [{ name: 'new-1.jpg', url: studentHomeworkUrl('new-1.jpg'), kind: 'image' }],
        textContent: 'Phần bổ sung', note: '',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({ submission: expect.objectContaining({
      id: 'sub-new', status: 'submitted', supplementOf: 'sub-old',
      fileUrls: [studentHomeworkUrl('old-1.jpg'), studentHomeworkUrl('old-2.jpg'), studentHomeworkUrl('new-1.jpg')],
      textContent: 'Phần cũ\n\nPhần bổ sung',
    }) });
    expect((harness.store['submissions']['sub-old'] as DocData).status).toBe('graded');
    expect((harness.store['submissions']['sub-new'] as DocData).grade).toBeUndefined();
  });

  it('từ chối parent không thuộc đúng học sinh/lớp/bài', async () => {
    const harness = buildHarness();
    harness.store['studentLinks'] = {
      'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' },
    };
    harness.store['assignments'] = {
      'asg-1': { teacherId: 'gv-1', classId: 'lop-1', isOpen: true },
    };
    harness.store['submissions'] = {
      'sub-other': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-khac', assignmentId: 'asg-1',
        fileUrls: [studentHomeworkUrl('other.jpg')], status: 'graded',
      },
    };

    const res = await call({
      action: 'createSupplementSubmission',
      submission: {
        id: 'sub-new', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        supplementOf: 'sub-other', fileUrls: [studentHomeworkUrl('new.jpg')], attachments: [], note: '',
      },
    });

    expect(res.statusCode).toBe(403);
    expect(harness.store['submissions']['sub-new']).toBeUndefined();
  });

  it('không âm thầm cắt evidence khi ghép vượt giới hạn 12 tệp', async () => {
    const harness = buildHarness();
    harness.store['studentLinks'] = {
      'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' },
    };
    harness.store['assignments'] = {
      'asg-1': { teacherId: 'gv-1', classId: 'lop-1', isOpen: true },
    };
    harness.store['submissions'] = {
      'sub-old': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        fileUrls: Array.from({ length: 12 }, (_, index) => studentHomeworkUrl(`old-${index}.jpg`)), status: 'graded',
      },
    };

    const res = await call({
      action: 'createSupplementSubmission',
      submission: {
        id: 'sub-new', teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        supplementOf: 'sub-old', fileUrls: [studentHomeworkUrl('new.jpg')], attachments: [], note: '',
      },
    });

    expect(res.statusCode).toBe(422);
    expect(harness.store['submissions']['sub-new']).toBeUndefined();
  });

  it('từ chối bổ sung khi bài giao đã đóng', async () => {
    const harness = buildHarness();
    harness.store['studentLinks'] = {
      'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' },
    };
    harness.store['assignments'] = {
      'asg-1': { teacherId: 'gv-1', classId: 'lop-1', isOpen: false },
    };
    harness.store['submissions'] = {
      'sub-old': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        fileUrls: [studentHomeworkUrl('old.jpg')], status: 'graded',
      },
    };

    const res = await call({
      action: 'createSupplementSubmission',
      submission: {
        id: 'sub-new', assignmentId: 'asg-1', supplementOf: 'sub-old',
        fileUrls: [studentHomeworkUrl('new.jpg')], attachments: [], note: '',
      },
    });

    expect(res.statusCode).toBe(409);
    expect(harness.store['submissions']['sub-new']).toBeUndefined();
  });
});

describe('POST /api/classroom · studentAssignments', () => {
  beforeEach(() => { h.uid = 'hs-uid'; });

  it('chỉ trả assignment mở của đúng student link và loại toàn bộ trường chấm nội bộ', async () => {
    const harness = buildHarness();
    harness.store['studentLinks'] = {
      'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' },
    };
    harness.store['assignments'] = {
      'asg-open': {
        id: 'asg-open', teacherId: 'gv-1', classId: 'lop-1', title: 'Columbus', description: 'Làm bài',
        type: 'upload', isOpen: true, maxScore: 10,
        attachments: [{ name: 'de.pdf', url: 'https://storage/de.pdf' }],
        answerKey: 'x = 2', rubric: 'Mỗi bước 1 điểm', gradingInstructions: 'Chấm câu 1-3',
        answerKeyImageUrls: ['https://storage/key.jpg'], sourceText: 'Đề nội bộ',
        createdAt: '2026-08-24T02:00:00.000Z', updatedAt: '2026-08-24T02:00:00.000Z',
      },
      'asg-closed': {
        id: 'asg-closed', teacherId: 'gv-1', classId: 'lop-1', title: 'Đã đóng', description: '',
        type: 'upload', isOpen: false, answerKey: 'không trả',
        createdAt: '2026-08-24T01:00:00.000Z', updatedAt: '2026-08-24T01:00:00.000Z',
      },
      'asg-other-class': {
        id: 'asg-other-class', teacherId: 'gv-1', classId: 'lop-khac', title: 'Lớp khác', description: '',
        type: 'upload', isOpen: true, answerKey: 'không trả',
        createdAt: '2026-08-24T03:00:00.000Z', updatedAt: '2026-08-24T03:00:00.000Z',
      },
    };

    const res = await call({ action: 'studentAssignments' });

    expect(res.statusCode).toBe(200);
    expect(res.payload?.assignments).toEqual([expect.objectContaining({
      id: 'asg-open', title: 'Columbus', hasAnswerKey: true,
    })]);
    expect(JSON.stringify(res.payload)).not.toContain('x = 2');
    expect(JSON.stringify(res.payload)).not.toContain('Mỗi bước 1 điểm');
    expect(JSON.stringify(res.payload)).not.toContain('Chấm câu 1-3');
    expect(JSON.stringify(res.payload)).not.toContain('https://storage/key.jpg');
  });

  it('không để 100 assignment đóng che mất assignment mở phía sau', async () => {
    const harness = buildHarness();
    harness.store['studentLinks'] = {
      'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' },
    };
    harness.store['assignments'] = Object.fromEntries([
      ...Array.from({ length: 100 }, (_, index) => [`closed-${index}`, {
        teacherId: 'gv-1', classId: 'lop-1', title: `Đóng ${index}`, description: '', type: 'upload', isOpen: false,
        createdAt: `2026-08-24T00:${String(index).padStart(2, '0')}:00.000Z`, updatedAt: '',
      }]),
      ['open-late', {
        teacherId: 'gv-1', classId: 'lop-1', title: 'Columbus 11', description: '', type: 'upload', isOpen: true,
        createdAt: '2026-08-24T23:00:00.000Z', updatedAt: '2026-08-24T23:00:00.000Z',
      }],
    ]);

    const res = await call({ action: 'studentAssignments' });

    expect(res.statusCode).toBe(200);
    expect(res.payload?.assignments).toEqual([expect.objectContaining({ id: 'open-late', title: 'Columbus 11' })]);
  });
});

describe('POST /api/classroom · studentSubmissions', () => {
  beforeEach(() => { h.uid = 'hs-uid'; });

  it('project bài nộp chỉ giữ phần học sinh cần xem, loại ghi chú nội bộ của giáo viên', async () => {
    const harness = buildHarness();
    harness.store['studentLinks'] = {
      'hs-uid': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' },
    };
    harness.store['submissions'] = {
      'sub-visible': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        supplementOf: 'sub-old', fileUrls: ['https://storage/work.jpg'], note: 'Em xin nộp lại', status: 'graded',
        createdAt: '2026-08-24T02:00:00.000Z', updatedAt: '2026-08-24T03:00:00.000Z',
        grade: {
          score: 8, maxScore: 10, feedback: 'Em cần kiểm tra dấu.', noteForTeacher: 'Không cho học sinh thấy',
          teacherNote: 'Ghi chú riêng', strengths: [], weaknesses: [], gradedAt: '2026-08-24T03:00:00.000Z', teacherApproved: true,
        },
      },
      'sub-other-class': {
        teacherId: 'gv-other', classId: 'lop-khac', studentId: 'hs-1', assignmentId: 'asg-x',
        fileUrls: [], note: '', status: 'graded', createdAt: '2026-08-24T01:00:00.000Z', updatedAt: '2026-08-24T01:00:00.000Z',
        grade: { score: 10, maxScore: 10, feedback: 'Không được trả', strengths: [], weaknesses: [], gradedAt: '', teacherApproved: true },
      },
    };

    const res = await call({ action: 'studentSubmissions' });

    expect(res.statusCode).toBe(200);
    expect(res.payload?.submissions).toEqual([expect.objectContaining({
      id: 'sub-visible', supplementOf: 'sub-old', grade: expect.objectContaining({ feedback: 'Em cần kiểm tra dấu.' }),
    })]);
    expect(JSON.stringify(res.payload)).not.toContain('Không cho học sinh thấy');
    expect(JSON.stringify(res.payload)).not.toContain('Ghi chú riêng');
    expect(JSON.stringify(res.payload)).not.toContain('sub-other-class');
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

describe('POST /api/classroom · syncSkillEvidence', () => {
  beforeEach(() => { h.uid = 'gv-1'; });

  it('approved homework ghi ledger và summary canonical, không ghi raw evidence vào profile', async () => {
    const harness = buildHarness();
    harness.store['submissions'] = {
      'sub-approved': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        updatedAt: '2026-08-24T10:00:00.000Z',
        grade: {
          score: 5, maxScore: 10, weakTopics: ['phương trình bậc hai'], strengths: [],
          gradedAt: '2026-08-24T10:00:00.000Z', teacherApproved: true,
        },
      },
    };
    harness.store['studentProfiles'] = {
      'hs-1': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1', topics: [] },
    };

    const res = await call({ action: 'syncSkillEvidence', submissionId: 'sub-approved' });

    expect(res.statusCode).toBe(200);
    expect(harness.store['studentSkillEvidence']).toEqual(expect.objectContaining({
      'hs-1__sub-approved%3Amath.quadratic-equation': expect.objectContaining({ source: 'homework' }),
    }));
    expect(harness.store['studentProfiles']['hs-1'].skills).toEqual(expect.arrayContaining([
      expect.objectContaining({ skillId: 'math.quadratic-equation', evidenceCount: 1, status: 'developing' }),
    ]));
    expect(harness.store['studentProfiles']['hs-1'].skillEvidence).toBeUndefined();
  });

  it('AI draft chưa duyệt không được tạo authoritative ledger evidence', async () => {
    const harness = buildHarness();
    harness.store['submissions'] = {
      'sub-draft': {
        teacherId: 'gv-1', classId: 'lop-1', studentId: 'hs-1', assignmentId: 'asg-1',
        grade: {
          score: 5, maxScore: 10, weakTopics: ['phương trình bậc hai'], strengths: [],
          gradedAt: '2026-08-24T10:00:00.000Z', teacherApproved: false,
        },
      },
    };

    const res = await call({ action: 'syncSkillEvidence', submissionId: 'sub-draft' });

    expect(res.statusCode).toBe(200);
    expect(harness.store['studentSkillEvidence']).toBeUndefined();
  });
});
