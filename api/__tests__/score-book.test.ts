import { beforeEach, describe, expect, it, vi } from 'vitest';

type DocData = Record<string, unknown>;

const h = vi.hoisted(() => ({
  claims: {} as Record<string, unknown>,
  store: {} as Record<string, Record<string, DocData>>,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => h.claims,
    getUser: async (uid: string) => ({ uid, email: h.claims.email }),
  }),
}));

vi.mock('../_exam-core.js', () => ({ getAdminDb: () => fakeDb(), getAdminStorage: () => ({}) }));

const snapOf = (col: string, id: string) => {
  const data = h.store[col]?.[id];
  return { id, exists: data !== undefined, data: () => (data ? structuredClone(data) : undefined) };
};

const fakeDb = () => {
  const docRef = (col: string, id: string): Record<string, any> => ({
    id,
    get: async () => snapOf(col, id),
    set: async (data: DocData) => { (h.store[col] ||= {})[id] = structuredClone(data); },
    update: async (data: DocData) => { h.store[col][id] = { ...h.store[col][id], ...data }; },
    collection: (sub: string) => ({
      get: async () => ({ docs: Object.keys(h.store[`${col}/${id}/${sub}`] ?? {}).map(subId => snapOf(`${col}/${id}/${sub}`, subId)) }),
      doc: (subId: string) => docRef(`${col}/${id}/${sub}`, subId),
    }),
  });
  const queryOf = (col: string, filter: (data: DocData) => boolean = () => true): Record<string, any> => ({
    where: (field: string, _op: string, value: unknown) => queryOf(col, data => filter(data) && data[field] === value),
    select: () => queryOf(col, filter),
    get: async () => ({ docs: Object.entries(h.store[col] ?? {}).filter(([, data]) => filter(data)).map(([id]) => snapOf(col, id)) }),
  });
  return {
    collection: (col: string) => ({ ...queryOf(col), doc: (id: string) => docRef(col, id) }),
    getAll: async (...refs: Array<{ get: () => Promise<unknown> }>) => Promise.all(refs.map(ref => ref.get())),
  };
};

import handler from '../classroom';

const call = async (body: DocData) => {
  const res = { statusCode: 0, payload: null as DocData | null, status(c: number) { res.statusCode = c; return res; }, json(p: DocData) { res.payload = p; return res; } };
  await handler({ method: 'POST', body: { idToken: 't', ...body } } as never, res as never);
  return res;
};

const TEACHER = { uid: 'gv-cuong', email: 'congapro60@gmail.com' };
const STUDENT_A = { uid: 'anon-a', firebase: { sign_in_provider: 'anonymous' } };

describe('sổ điểm', () => {
  beforeEach(() => {
    h.claims = TEACHER;
    h.store = {
      classes: { 'lop-1': { name: '12 VN Toán 1', teacherId: 'gv-cuong' }, 'lop-2': { name: '10Ottawa', teacherId: 'gv-hong' } },
      'classes/lop-1/students': { a: { name: 'An', code: 'S1' }, b: { name: 'Bình', code: 'S2' } },
      studentLinks: { 'anon-a': { classId: 'lop-1', studentId: 'a', teacherId: 'gv-cuong' } },
    };
  });

  it('giáo viên nhập cột điểm hệ số 1; ô trống bỏ qua; học sinh ngoài lớp không được ghi', async () => {
    const res = await call({
      action: 'saveHs1Column', classId: 'lop-1',
      column: { label: 'KT 15 phút lần 1', date: '2026-09-20' },
      scores: { a: '8,5', b: '', 'hs-la': 9 },
    });
    expect(res.statusCode).toBe(200);
    const columnId = res.payload?.columnId as string;
    const book = h.store.scoreBooks['lop-1'];
    expect(book.hs1Columns).toEqual([{ id: columnId, label: 'KT 15 phút lần 1', date: '2026-09-20', weight: 1 }]);
    expect(book.hs1).toEqual({ a: { [columnId]: 8.5 }, b: {} });
    expect(book.updatedBy).toBe('gv-cuong');

    // Sửa: đổi tên + xoá điểm của An, thêm điểm Bình
    const edit = await call({ action: 'saveHs1Column', classId: 'lop-1', columnId, column: { label: 'KT 15 phút', date: '2026-09-21' }, scores: { a: null, b: 7 } });
    expect(edit.statusCode).toBe(200);
    expect(h.store.scoreBooks['lop-1'].hs1).toEqual({ a: {}, b: { [columnId]: 7 } });
    expect((h.store.scoreBooks['lop-1'].hs1Columns as DocData[])[0]).toMatchObject({ label: 'KT 15 phút', date: '2026-09-21' });
  });

  it('điểm sai bị từ chối nguyên lô, không ghi gì', async () => {
    const res = await call({ action: 'saveHs1Column', classId: 'lop-1', column: { label: 'Miệng', date: '2026-09-20' }, scores: { a: 8, b: '11' } });
    expect(res.statusCode).toBe(422);
    expect(h.store.scoreBooks).toBeUndefined();
  });

  it('giáo viên lớp khác không đọc/ghi được sổ điểm', async () => {
    h.claims = { uid: 'gv-hong', email: 'hong@x.vn' };
    expect((await call({ action: 'teacherScoreBook', classId: 'lop-1' })).statusCode).toBe(403);
    expect((await call({ action: 'saveHs1Column', classId: 'lop-1', column: { label: 'X', date: '2026-09-20' }, scores: { a: 1 } })).statusCode).toBe(403);
  });

  it('đồng bộ điểm thi thay toàn bộ phần thi, giữ điểm hệ số 1; xoá cột xoá luôn điểm cột đó', async () => {
    const col = await call({ action: 'saveHs1Column', classId: 'lop-1', column: { label: 'Miệng', date: '2026-09-20' }, scores: { a: 9 } });
    const columnId = col.payload?.columnId as string;
    h.store.scoreBooks['lop-1'].exams = { b: { moet: [{ label: 'Cũ', score: 1 }], tds: [] } };

    const sync = await call({
      action: 'saveExamScores', classId: 'lop-1', spreadsheetTitle: '26-27-12 VN Toán 1',
      exams: { a: { moet: [{ label: 'Khảo sát đầu năm', score: 7.5 }], tds: [{ label: 'Quý 1', score: 8, letter: 'B+' }] }, 'hs-la': { moet: [{ label: 'X', score: 5 }], tds: [] } },
    });
    expect(sync.statusCode).toBe(200);
    expect(sync.payload?.studentCount).toBe(1);
    const book = h.store.scoreBooks['lop-1'];
    expect(book.exams).toEqual({ a: { moet: [{ label: 'Khảo sát đầu năm', score: 7.5 }], tds: [{ label: 'Quý 1', score: 8, letter: 'B+' }] } });
    expect(book.examsSpreadsheetTitle).toBe('26-27-12 VN Toán 1');
    expect(book.hs1).toEqual({ a: { [columnId]: 9 } });

    expect((await call({ action: 'deleteHs1Column', classId: 'lop-1', columnId })).statusCode).toBe(200);
    expect(h.store.scoreBooks['lop-1']).toMatchObject({ hs1Columns: [], hs1: { a: {} } });
  });

  it('học sinh chỉ nhận dòng của CHÍNH mình, bỏ qua studentId gửi lên', async () => {
    const col = await call({ action: 'saveHs1Column', classId: 'lop-1', column: { label: 'Miệng', date: '2026-09-20' }, scores: { a: 9, b: 3 } });
    expect(col.statusCode).toBe(200);
    h.claims = STUDENT_A;
    const res = await call({ action: 'studentScoreBook', studentId: 'b', classId: 'lop-1' });
    expect(res.statusCode).toBe(200);
    expect(res.payload?.scores).toEqual({
      exams: { moet: [], tds: [] },
      hs1: [{ label: 'Miệng', date: '2026-09-20', score: 9, weight: 1 }],
      average: 9,
      homework: { submitted: 0, total: 0, attendance: null, average: null, graded: 0 },
    });
    // Phiên học sinh không dùng được action của giáo viên
    expect((await call({ action: 'teacherScoreBook', classId: 'lop-1' })).statusCode).toBe(403);
    // Phiên không gắn học sinh nào
    h.claims = { uid: 'anon-la', firebase: { sign_in_provider: 'anonymous' } };
    expect((await call({ action: 'studentScoreBook' })).statusCode).toBe(403);
  });

  describe('đưa bài đã nộp lên sổ (liên kết sống)', () => {
    const day = (d: string) => `${d}T01:00:00.000Z`;
    beforeEach(() => {
      Object.assign(h.store, {
        assignments: {
          bt1: { classId: 'lop-1', title: 'BTVN tuần 1', createdAt: day('2026-09-01'), dueAt: day('2026-09-05') },
          bt2: { classId: 'lop-1', title: 'BTVN tuần 2', createdAt: day('2026-09-08'), dueAt: day('2026-09-12') },
          kt: { classId: 'lop-1', title: 'Giữa kì', createdAt: day('2026-09-15'), dueAt: day('2026-09-16'), periodicTest: {} },
          khac: { classId: 'lop-2', title: 'Bài lớp khác', createdAt: day('2026-09-01') },
        },
        submissions: {
          s1: { classId: 'lop-1', studentId: 'a', assignmentId: 'bt1', createdAt: day('2026-09-04'), grade: { score: 4, maxScore: 10, teacherApproved: false } },
          s2: { classId: 'lop-1', studentId: 'a', assignmentId: 'bt1', createdAt: day('2026-09-05'), grade: { score: 16, maxScore: 20, teacherApproved: false } },
          s3: { classId: 'lop-1', studentId: 'b', assignmentId: 'bt1', createdAt: day('2026-09-04'), grade: { score: 3, maxScore: 10 } },
          s4: { classId: 'lop-1', studentId: 'a', assignmentId: 'bt2', createdAt: day('2026-09-10') },
        },
        examSubmissions: {},
      });
    });

    it('chọn bài + hệ số → cột liên kết; điểm = bài nộp mới nhất (kể cả chưa duyệt) quy thang 10; chuyên cần và TB BTVN tự tính', async () => {
      const res = await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', weight: 2 }, { assignmentId: 'bt2', weight: 1 }] });
      expect(res.statusCode).toBe(200);
      const stored = h.store.scoreBooks['lop-1'];
      expect(stored.auto).toBeUndefined();
      expect((stored.hs1Columns as DocData[]).map(c => [c.label, c.weight, c.assignmentId])).toEqual([['BTVN tuần 1', 2, 'bt1'], ['BTVN tuần 2', 1, 'bt2']]);

      const book = res.payload?.scoreBook as { auto: { linked: Record<string, Record<string, number>>; homework: Record<string, DocData>; assignments: DocData[] } };
      const [c1, c2] = (stored.hs1Columns as Array<{ id: string }>).map(c => c.id);
      expect(book.auto.linked[c1]).toEqual({ a: 8, b: 3 });
      expect(book.auto.linked[c2]).toEqual({});
      // a nộp cả 2 bài (bài 2 chưa có điểm), b nộp 1/2 bài: bt2 đã quá hạn
      expect(book.auto.homework.a).toEqual({ submitted: 2, total: 2, attendance: 10, average: 8, graded: 1 });
      expect(book.auto.homework.b).toEqual({ submitted: 1, total: 2, attendance: 5, average: 3, graded: 1 });
      // bài kiểm tra định kì không nằm trong hộp chọn
      expect(book.auto.assignments.map(a => a.id).sort()).toEqual(['bt1', 'bt2']);
    });

    it('chọn lại bài đã có cột chỉ đổi hệ số, không tạo cột trùng; bài định kì / bài lớp khác bị từ chối', async () => {
      await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', weight: 1 }] });
      await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', weight: 3 }] });
      expect(h.store.scoreBooks['lop-1'].hs1Columns).toHaveLength(1);
      expect((h.store.scoreBooks['lop-1'].hs1Columns as DocData[])[0].weight).toBe(3);

      expect((await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'kt', weight: 2 }] })).statusCode).toBe(422);
      expect((await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'khac', weight: 2 }] })).statusCode).toBe(404);
      expect((await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', weight: 4 }] })).statusCode).toBe(422);
      expect((await call({ action: 'linkAssignments', classId: 'lop-1', items: [] })).statusCode).toBe(422);
    });

    it('ghi đè tay thắng điểm tự lấy; xoá ô ghi đè thì quay về điểm tự lấy; chấm lại bài thì sổ đổi theo', async () => {
      (h.store.submissions.s3.grade as DocData).teacherApproved = true; // học sinh chỉ nhận điểm đã duyệt
      const link = await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', weight: 1 }] });
      const columnId = (link.payload?.scoreBook as { hs1Columns: Array<{ id: string }> }).hs1Columns[0].id;
      const over = await call({ action: 'saveHs1Column', classId: 'lop-1', columnId, column: { label: 'BTVN tuần 1', date: '2026-09-05', weight: 1 }, scores: { b: 7 } });
      const view = (book: unknown) => (book as { auto: { linked: Record<string, Record<string, number>> }; hs1: Record<string, Record<string, number>> });
      expect(view(over.payload?.scoreBook).hs1.b[columnId]).toBe(7);

      h.claims = { uid: 'anon-b', firebase: { sign_in_provider: 'anonymous' } };
      (h.store.studentLinks as Record<string, DocData>)['anon-b'] = { classId: 'lop-1', studentId: 'b', teacherId: 'gv-cuong' };
      const asB = await call({ action: 'studentScoreBook' });
      expect((asB.payload?.scores as { hs1: DocData[] }).hs1[0]).toMatchObject({ score: 7 });

      h.claims = TEACHER;
      const cleared = await call({ action: 'saveHs1Column', classId: 'lop-1', columnId, column: { label: 'BTVN tuần 1', date: '2026-09-05' }, scores: { b: '' } });
      expect(view(cleared.payload?.scoreBook).hs1.b[columnId]).toBeUndefined();

      // giáo viên chấm lại bài của b → sổ thấy ngay
      (h.store.submissions.s3.grade as DocData).score = 6;
      h.claims = { uid: 'anon-b', firebase: { sign_in_provider: 'anonymous' } };
      const again = await call({ action: 'studentScoreBook' });
      expect((again.payload?.scores as { hs1: DocData[] }).hs1[0]).toMatchObject({ score: 6 });
    });

    it('học sinh KHÔNG thấy điểm bài máy chấm nhưng thầy cô chưa duyệt, dù bài đã liên kết lên sổ', async () => {
      await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', weight: 2 }] });
      h.claims = STUDENT_A;
      const res = await call({ action: 'studentScoreBook' });
      const scores = res.payload?.scores as DocData;
      expect(JSON.stringify(scores.hs1)).not.toContain('8');
      expect(scores.average ?? null).toBeNull();
      h.claims = TEACHER;
      const teacherView = await call({ action: 'teacherScoreBook', classId: 'lop-1' });
      // Giáo viên vẫn thấy điểm tạm (16/20 → 8/10) trong sổ.
      const linked = (teacherView.payload?.scoreBook as { auto: { linked: Record<string, Record<string, number>> } }).auto.linked;
      expect(Object.values(linked).map(column => column.a)).toContain(8);
    });

    it('học sinh chỉ thấy điểm và thống kê của mình, không thấy danh sách bài hay dữ liệu bạn khác', async () => {
      (h.store.submissions.s2.grade as DocData).teacherApproved = true;
      await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', weight: 2 }] });
      h.claims = STUDENT_A;
      const res = await call({ action: 'studentScoreBook' });
      const scores = res.payload?.scores as DocData;
      expect(scores.hs1).toEqual([{ label: 'BTVN tuần 1', date: '2026-09-05', score: 8, weight: 2 }]);
      expect(scores.average).toBe(8);
      expect(JSON.stringify(scores)).not.toContain('BTVN tuần 2');
      expect(scores).not.toHaveProperty('auto');
    });

    it('đề online đã nộp cũng tính (điểm lấy từ lượt nộp mới nhất; lượt đang làm dở bị bỏ)', async () => {
      Object.assign(h.store, {
        assignments: { ...h.store.assignments, on1: { classId: 'lop-1', title: 'Đề online', createdAt: day('2026-09-01'), dueAt: day('2026-09-02'), type: 'exam' } },
        examSubmissions: {
          e1: { classId: 'lop-1', studentId: 'a', assignmentId: 'on1', status: 'graded', submittedAt: day('2026-09-02'), totalScore: 5, maxScore: 10 },
          e2: { classId: 'lop-1', studentId: 'a', assignmentId: 'on1', status: 'graded', submittedAt: day('2026-09-03'), totalScore: 9, maxScore: 10, grade: { score: 9, maxScore: 10 } },
          e3: { classId: 'lop-1', studentId: 'a', assignmentId: 'on1', status: 'in_progress', startedAt: day('2026-09-04'), totalScore: 1, maxScore: 10 },
        },
      });
      const res = await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'on1', weight: 3 }] });
      const book = res.payload?.scoreBook as { hs1Columns: Array<{ id: string }>; auto: { linked: Record<string, Record<string, number>> } };
      expect(book.auto.linked[book.hs1Columns[0].id]).toEqual({ a: 9 });
    });

    it('chọn hệ số cho mốc thi MOET → vào điểm trung bình; bỏ chọn thì không tính', async () => {
      h.store.scoreBooks = { 'lop-1': { classId: 'lop-1', hs1Columns: [], hs1: {}, exams: { a: { moet: [{ label: 'Giữa kì', score: 6 }, { label: 'Khảo sát', score: 10 }], tds: [] } } } };
      expect((await call({ action: 'setExamWeights', classId: 'lop-1', weights: { 'Giữa kì': 2 } })).statusCode).toBe(200);
      h.claims = STUDENT_A;
      expect((await call({ action: 'studentScoreBook' })).payload?.scores).toMatchObject({ average: 6, examWeights: { 'Giữa kì': 2 } });
      h.claims = TEACHER;
      expect((await call({ action: 'setExamWeights', classId: 'lop-1', weights: { 'Giữa kì': 5 } })).statusCode).toBe(422);
      await call({ action: 'setExamWeights', classId: 'lop-1', weights: {} });
      h.claims = STUDENT_A;
      expect((await call({ action: 'studentScoreBook' })).payload?.scores).toMatchObject({ average: null });
    });
  });
});
