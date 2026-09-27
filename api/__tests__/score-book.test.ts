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
  return { collection: (col: string) => ({ doc: (id: string) => docRef(col, id) }) };
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
    expect(book.hs1Columns).toEqual([{ id: columnId, label: 'KT 15 phút lần 1', date: '2026-09-20' }]);
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
    expect(res.payload?.scores).toEqual({ exams: { moet: [], tds: [] }, hs1: [{ label: 'Miệng', date: '2026-09-20', score: 9 }] });
    // Phiên học sinh không dùng được action của giáo viên
    expect((await call({ action: 'teacherScoreBook', classId: 'lop-1' })).statusCode).toBe(403);
    // Phiên không gắn học sinh nào
    h.claims = { uid: 'anon-la', firebase: { sign_in_provider: 'anonymous' } };
    expect((await call({ action: 'studentScoreBook' })).statusCode).toBe(403);
  });
});
