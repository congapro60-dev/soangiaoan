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
    runTransaction: async (work: (tx: any) => Promise<void>) => {
      const writes: Array<() => Promise<unknown>> = [];
      await work({ get: (ref: any) => ref.get(), set: (ref: any, data: DocData) => { writes.push(() => ref.set(data)); } });
      for (const write of writes) await write();
    },
  };
};

import handler from '../classroom';
import { examColumnsNeedingSheetPush, studentScoreView, type ScoreBookDoc } from '../../src/lib/classroom/scoreBook';

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

  it('bài thi đã duyệt tự vào đúng cột, thay điểm nền, GV sửa thì GV và HS nhận điểm mới', async () => {
    h.store.assignments = { kt: { classId: 'lop-1', title: 'Thi giữa HKI', createdAt: '2026-10-20T00:00:00Z', periodicTest: { sheetLabel: 'Thi giữa HKI' } } };
    h.store.scoreBooks = { 'lop-1': { examColumns: { moet: ['Thi giữa HKI'], tds: [] }, exams: { a: { moet: [{ label: 'Thi giữa HKI', score: 3 }], tds: [] } }, paperExams: { b: [{ label: 'Thi giữa HKI', score: 4, assignmentId: 'kt', confirmedAt: '2026-10-21T00:00:00Z' }] } } };
    h.store.submissions = {
      s1: { classId: 'lop-1', assignmentId: 'kt', studentId: 'a', createdAt: '2026-10-22T00:00:00Z', grade: { score: 7, maxScore: 10, teacherApproved: true, approvalSource: 'auto_timeout', gradedAt: '2026-10-23T00:00:00Z' } },
      s2: { classId: 'lop-1', assignmentId: 'kt', studentId: 'b', createdAt: '2026-10-22T00:00:00Z', grade: { score: 8, maxScore: 10, teacherApproved: true, approvalSource: 'teacher', gradedAt: '2026-10-23T00:00:00Z' } },
    };
    const first = await call({ action: 'teacherScoreBook', classId: 'lop-1' });
    const book = first.payload?.scoreBook as ScoreBookDoc;
    expect(studentScoreView(book, 'a').exams.moet).toEqual([{ label: 'Thi giữa HKI', score: 7 }]);
    expect(studentScoreView(book, 'b').exams.moet).toEqual([{ label: 'Thi giữa HKI', score: 8 }]);
    expect(book.auto?.examAssignments?.[0].periodicKey).toBe('ghki');
    (h.store.submissions.s1.grade as DocData).score = 0;
    (h.store.submissions.s1.grade as DocData).gradedAt = '2026-10-24T00:00:00Z';
    h.claims = STUDENT_A;
    const changed = await call({ action: 'studentScoreBook', studentId: 'b' });
    expect((changed.payload?.scores as any).exams.moet).toEqual([{ label: 'Thi giữa HKI', score: 0 }]);
    expect(h.store.scoreBooks['lop-1']).not.toHaveProperty('periodicAssignmentLinks');
  });

  it('cột thi chỉ nhận lượt đã duyệt mới nhất; bài thường cùng tên không tự ghép', async () => {
    h.store.assignments = {
      kt: { classId: 'lop-1', title: 'Thi giữa HKI', createdAt: '2026-10-20T00:00:00Z', periodicTest: {} },
      bt: { classId: 'lop-1', title: 'Thi giữa HKI', createdAt: '2026-10-20T00:00:00Z' },
    };
    h.store.submissions = {
      old: { classId: 'lop-1', assignmentId: 'kt', studentId: 'a', createdAt: '2026-10-21T00:00:00Z', grade: { score: 6, maxScore: 10, teacherApproved: true } },
      latest: { classId: 'lop-1', assignmentId: 'kt', studentId: 'a', createdAt: '2026-10-22T00:00:00Z', grade: { score: 9, maxScore: 10, teacherApproved: false } },
      other: { classId: 'lop-1', assignmentId: 'kt', studentId: 'b', createdAt: '2026-10-22T00:00:00Z', grade: { score: 10, maxScore: 10, teacherApproved: false } },
      homework: { classId: 'lop-1', assignmentId: 'bt', studentId: 'b', createdAt: '2026-10-23T00:00:00Z', grade: { score: 8, maxScore: 10, teacherApproved: true } },
    };
    const result = await call({ action: 'teacherScoreBook', classId: 'lop-1' });
    const book = result.payload?.scoreBook as ScoreBookDoc;
    expect(book.auto?.periodic.ghki).toEqual({ a: 6 });
    expect(studentScoreView(book, 'a').exams.moet).toEqual([{ label: 'Thi giữa HKI', score: 6 }]);
    expect(studentScoreView(book, 'b').exams.moet).toEqual([]);
  });

  it('nhập trực tiếp nhiều ô HS1/MOET rồi lưu một lần, giữ ô không sửa', async () => {
    h.store.scoreBooks = { 'lop-1': { hs1Columns: [{ id: 'c1', label: 'Hướng nghiệp', date: '2026-10-26', weight: 1 }], hs1: { a: { c1: 8 }, b: { c1: 7 } }, exams: { a: { moet: [{ label: 'Thi giữa HKI', score: 6 }], tds: [] } }, examColumns: { moet: ['Thi giữa HKI'], tds: [] } } };
    const result = await call({ action: 'saveScoreCells', classId: 'lop-1', cells: [
      { kind: 'hs1', key: 'c1', studentId: 'a', score: 0, previous: 8 },
      { kind: 'moet', key: 'Thi giữa HKI', studentId: 'a', score: 9.5, previous: 6 },
    ] });
    expect(result.statusCode).toBe(200);
    const book = result.payload?.scoreBook as ScoreBookDoc;
    expect(book.hs1).toEqual({ a: { c1: 0 }, b: { c1: 7 } });
    expect(studentScoreView(book, 'a').exams.moet[0].score).toBe(9.5);
    const before = structuredClone(h.store.scoreBooks);
    for (const invalid of [
      { kind: 'hs1', key: 'c1', studentId: 'a', score: 11, previous: 0 },
      { kind: 'hs1', key: 'c1', studentId: 'outsider', score: 8, previous: null },
      { kind: 'hs1', key: 'gone', studentId: 'a', score: 8, previous: null },
      { kind: 'hs1', key: 'c1', studentId: 'a', score: 8, previous: 7 },
    ]) {
      const rejected = await call({ action: 'saveScoreCells', classId: 'lop-1', cells: [{ kind: 'hs1', key: 'c1', studentId: 'b', score: 2, previous: 7 }, invalid] });
      expect(rejected.statusCode).toBeGreaterThanOrEqual(400);
      expect(h.store.scoreBooks).toEqual(before);
    }
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

  it('điểm chấm tay xác nhận từ ảnh: vào sổ, còn nguyên sau khi đồng bộ file điểm; file điểm có cột đó thì file thắng; null = gỡ', async () => {
    h.store.assignments = {
      gk1: { classId: 'lop-1', title: 'Kiểm tra giữa kì I', periodicTest: { sheetLabel: 'Giữa học kì I' } },
      btvn: { classId: 'lop-1', title: 'BTVN 1' },
    };
    const confirm = (body: DocData) => call({ action: 'confirmPaperExamScore', classId: 'lop-1', studentId: 'a', assignmentId: 'gk1', label: 'Giữa học kì I', score: 7.5, ...body });
    expect((await confirm({ assignmentId: 'btvn' })).statusCode).toBe(422);
    expect((await confirm({ score: 11 })).statusCode).toBe(422);
    expect((await confirm({ studentId: 'la' })).statusCode).toBe(404);
    const saved = await confirm({});
    expect(saved.statusCode).toBe(200);
    expect((saved.payload?.scoreBook as any).exams.a.moet).toEqual([{ label: 'Giữa học kì I', score: 7.5, source: 'paper' }]);
    // Firestore: điểm ảnh nằm ở paperExams, KHÔNG chép vào exams.
    expect(h.store.scoreBooks['lop-1'].exams).toEqual({ a: { moet: [], tds: [] } });

    const sync = await call({ action: 'saveExamScores', classId: 'lop-1', spreadsheetTitle: 'f', exams: { a: { moet: [{ label: 'Khảo sát', score: 6 }], tds: [] } } });
    expect((sync.payload?.scoreBook as any).exams.a.moet).toEqual([{ label: 'Khảo sát', score: 6 }, { label: 'Giữa học kì I', score: 7.5, source: 'paper' }]);

    const sheetWins = await call({ action: 'saveExamScores', classId: 'lop-1', spreadsheetTitle: 'f', exams: { a: { moet: [{ label: 'Giữa học kì I', score: 8 }], tds: [] } } });
    expect((sheetWins.payload?.scoreBook as any).exams.a.moet).toEqual([{ label: 'Giữa học kì I', score: 8 }]);

    await call({ action: 'saveExamScores', classId: 'lop-1', spreadsheetTitle: 'f', exams: {} });
    const removed = await confirm({ score: null });
    expect((removed.payload?.scoreBook as any).exams.a?.moet ?? []).toEqual([]);
  });

  it('giáo viên sửa/xóa mốc thi trong sổ; lần đồng bộ sau vẫn giữ override', async () => {
    h.store.scoreBooks = { 'lop-1': { classId: 'lop-1', hs1Columns: [], hs1: {}, exams: { a: { moet: [{ label: 'Giữa học kì I', score: 6 }], tds: [] } } } };
    const edited = await call({ action: 'saveExamColumn', classId: 'lop-1', label: 'Thi GHKI', scores: { a: 8 } });
    expect(edited.statusCode).toBe(200);
    // Chỉ xem phần điểm/tên — mark còn mang mốc thời gian sửa tay (đổi theo giờ chạy).
    expect(((edited.payload?.scoreBook as any).exams.a.moet as any[]).map(({ label, score }) => ({ label, score }))).toEqual([{ label: 'Thi GHKI', score: 8 }]);
    const synced = await call({ action: 'saveExamScores', classId: 'lop-1', spreadsheetTitle: 'f', exams: { a: { moet: [{ label: 'Giữa học kì I', score: 7 }], tds: [] } } });
    expect(((synced.payload?.scoreBook as any).exams.a.moet as any[]).map(({ label, score }) => ({ label, score }))).toEqual([{ label: 'Thi GHKI', score: 8 }]);
    const hidden = await call({ action: 'saveExamColumn', classId: 'lop-1', label: 'Giữa học kì I', scores: { a: null } });
    expect(hidden.statusCode).toBe(200);
    expect((hidden.payload?.scoreBook as any).exams.a?.moet ?? []).toEqual([]);
  });

  it('tạo cột định kì MOET/TDS khi chưa có điểm', async () => {
    h.store.scoreBooks = { 'lop-1': { classId: 'lop-1', hs1Columns: [], hs1: {}, exams: {} } };
    const created = await call({ action: 'saveExamColumn', classId: 'lop-1', label: 'Thi cuối kì I', scores: {}, kind: 'both' });
    expect(created.statusCode).toBe(200);
    // Cột nhập tay thuộc nhóm MOET; đẩy vào cả TDS sẽ sinh cột kép hiện ở hai nhóm.
    expect((created.payload?.scoreBook as any).examColumns).toEqual({ moet: ['Thi cuối kì I'], tds: [] });
  });

  it('hàng rào: không tạo được cột định kì trùng mốc đã có trong sổ', async () => {
    h.store.scoreBooks = { 'lop-1': { classId: 'lop-1', hs1Columns: [], hs1: {}, examColumns: { moet: ['Giữa học kì I'], tds: [] }, exams: { a: { moet: [{ label: 'Giữa học kì I', score: 6 }], tds: [] } } } };
    const dup = await call({ action: 'saveExamColumn', classId: 'lop-1', label: 'Thi GHKI', scores: { a: 8 }, kind: 'both' });
    expect(dup.statusCode).toBe(422);
    expect(String(dup.payload?.error)).toContain('Giữa học kì I');
    // Bị chặn thì không ghi gì cả — kể cả điểm sửa tay.
    expect(h.store.scoreBooks['lop-1'].examColumns).toEqual({ moet: ['Giữa học kì I'], tds: [] });
    expect(h.store.scoreBooks['lop-1'].examOverrides).toBeUndefined();
  });

  it('sửa tay ghi mốc thời gian để Sổ điểm biết ô nào chưa lên Google Sheet', async () => {
    h.store.scoreBooks = { 'lop-1': { classId: 'lop-1', hs1Columns: [], hs1: {}, examColumns: { moet: ['Giữa học kì I'], tds: [] }, exams: { a: { moet: [{ label: 'Giữa học kì I', score: 6 }], tds: [] } } } };
    const saved = await call({ action: 'saveExamColumn', classId: 'lop-1', label: 'Giữa học kì I', scores: { a: 6.5 } });
    expect(saved.statusCode).toBe(200);
    const override = (h.store.scoreBooks['lop-1'].examOverrides as any).a.ghki;
    expect(override.score).toBe(6.5);
    expect(typeof override.updatedAt).toBe('string');
    expect(Number.isNaN(Date.parse(override.updatedAt))).toBe(false);
    // Gợi ý đẩy Sheet đọc được ngay từ sổ máy chủ trả về.
    expect(examColumnsNeedingSheetPush(saved.payload?.scoreBook as ScoreBookDoc).map(item => item.label)).toEqual(['Giữa học kì I']);
  });

  it('đổi tên/xóa cột định kì trong sổ mà vẫn giữ nguồn để khôi phục', async () => {
    h.store.scoreBooks = { 'lop-1': { classId: 'lop-1', hs1Columns: [], hs1: {}, exams: { a: { moet: [{ label: 'Giữa học kì I', score: 6 }], tds: [] } } } };
    const renamed = await call({ action: 'saveExamColumnSettings', classId: 'lop-1', label: 'Giữa học kì I', newLabel: 'Thi giữa kỳ', hidden: false });
    expect((renamed.payload?.scoreBook as any).examColumnLabels).toEqual({ ghki: 'Thi giữa kỳ' });
    expect(h.store.scoreBooks['lop-1'].exams).toEqual({ a: { moet: [{ label: 'Giữa học kì I', score: 6 }], tds: [] } });
    const hidden = await call({ action: 'saveExamColumnSettings', classId: 'lop-1', label: 'Thi giữa kỳ', hidden: true });
    expect((hidden.payload?.scoreBook as any).hiddenExamColumns).toEqual(['ghki']);
    const restored = await call({ action: 'saveExamColumnSettings', classId: 'lop-1', label: 'Giữa học kì I', hidden: false });
    expect((restored.payload?.scoreBook as any).examColumnLabels).toEqual({ ghki: 'Thi giữa kỳ' });
    expect((restored.payload?.scoreBook as any).hiddenExamColumns).toEqual([]);
  });

  it('gán bài đã duyệt vào cột định kì; thay Sheet, giữ điểm sửa tay mới hơn', async () => {
    h.store.assignments = { bt1: { classId: 'lop-1', title: 'Bài kiểm tra giữa kì', createdAt: '2026-10-01T00:00:00Z' } };
    h.store.submissions = { sub1: { classId: 'lop-1', studentId: 'a', assignmentId: 'bt1', createdAt: '2026-10-02T00:00:00Z', grade: { score: 18, maxScore: 20, teacherApproved: true } } };
    h.store.scoreBooks = { 'lop-1': { classId: 'lop-1', hs1Columns: [], hs1: {}, examColumns: { moet: ['Giữa học kì I'], tds: [] }, exams: { a: { moet: [{ label: 'Giữa học kì I', score: 6 }], tds: [] } } } };
    const linked = await call({ action: 'linkPeriodicAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', examKey: 'ghki' }] });
    expect(linked.statusCode).toBe(200);
    expect(h.store.scoreBooks['lop-1'].periodicAssignmentLinks).toEqual({ ghki: 'bt1' });
    expect((linked.payload?.scoreBook as any).auto.periodic.ghki.a).toBe(9);
    // Điểm bài đã duyệt thay điểm Sheet cũ.
    expect(studentScoreView((linked.payload?.scoreBook as any) as ScoreBookDoc, 'a').exams.moet.map(({ label, score }) => ({ label, score }))).toEqual([{ label: 'Giữa học kì I', score: 9 }]);

    // Thầy cô sửa tay 6.5 → vẫn giữ 6.5 sau khi đồng bộ lại.
    const manual = await call({ action: 'saveExamColumn', classId: 'lop-1', label: 'Giữa học kì I', scores: { a: 6.5 } });
    expect(studentScoreView((manual.payload?.scoreBook as any) as ScoreBookDoc, 'a').exams.moet.map(({ label, score }) => ({ label, score }))).toEqual([{ label: 'Giữa học kì I', score: 6.5 }]);

    // Học sinh b chưa có điểm → bài nộp điền vào ô trống. Sổ chỉ lưu ô có điểm nên xem qua giao diện học sinh.
    h.store.submissions.sub2 = { classId: 'lop-1', studentId: 'b', assignmentId: 'bt1', createdAt: '2026-10-02T00:00:00Z', grade: { score: 14, maxScore: 20, teacherApproved: true } };
    const synced = await call({ action: 'linkPeriodicAssignments', classId: 'lop-1', items: [{ assignmentId: 'bt1', examKey: 'ghki' }] });
    const view = (studentId: string) => studentScoreView((synced.payload?.scoreBook as any) as ScoreBookDoc, studentId);
    const points = (studentId: string) => view(studentId).exams.moet.map(({ label, score }) => ({ label, score }));
    expect(points('b')).toEqual([{ label: 'Giữa học kì I', score: 7 }]);
    expect(points('a')).toEqual([{ label: 'Giữa học kì I', score: 6.5 }]);
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

    it('đề online AI chấm chưa duyệt: giáo viên thấy điểm, học sinh / phụ huynh KHÔNG thấy (cả cột liên kết lẫn TB)', async () => {
      Object.assign(h.store, {
        assignments: { ...h.store.assignments, on2: { classId: 'lop-1', title: 'Đề online 2', createdAt: day('2026-09-01'), dueAt: day('2026-09-02'), type: 'exam' } },
        examSubmissions: {
          p1: { classId: 'lop-1', studentId: 'a', assignmentId: 'on2', status: 'graded', gradeState: 'provisional', submittedAt: day('2026-09-02'), totalScore: 3, maxScore: 10, grade: { score: 3, maxScore: 10, teacherApproved: false } },
        },
      });
      const res = await call({ action: 'linkAssignments', classId: 'lop-1', items: [{ assignmentId: 'on2', weight: 2 }] });
      const book = res.payload?.scoreBook as { hs1Columns: Array<{ id: string }>; auto: { linked: Record<string, Record<string, number>> } };
      expect(book.auto.linked[book.hs1Columns[0].id]).toEqual({ a: 3 });

      h.claims = STUDENT_A;
      const scores = (await call({ action: 'studentScoreBook' })).payload?.scores as { hs1: unknown[]; average: number | null; homework: { graded: number; submitted: number } };
      expect(scores.hs1).toEqual([]);
      expect(scores.average).toBeNull();
      expect(scores.homework.graded).toBe(0);
      expect(scores.homework.submitted).toBe(3); // 2 bài ảnh + đề online vẫn tính là đã nộp

      // thầy cô duyệt → em thấy
      h.store.examSubmissions.p1 = { ...h.store.examSubmissions.p1, gradeState: 'official', grade: { score: 3, maxScore: 10, teacherApproved: true } };
      expect(((await call({ action: 'studentScoreBook' })).payload?.scores as { hs1: Array<{ score: number }> }).hs1[0].score).toBe(3);
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
