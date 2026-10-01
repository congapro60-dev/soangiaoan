import { beforeEach, describe, expect, it, vi } from 'vitest';

// Chi phí AI của chính học sinh: chỉ lượt của ĐÚNG em + ĐÚNG lớp/giáo viên của phiên; không nhận studentId từ client.

type DocData = Record<string, any>;

const h = vi.hoisted(() => ({ store: {} as Record<string, DocData>, uid: 'anon-1' as string | null }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => {
      if (!h.uid) throw new Error('bad token');
      return { uid: h.uid };
    },
  }),
}));
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: (n: number) => ({ __inc: n }) } }));
vi.mock('../_exam-core.js', () => ({ getAdminDb: () => { throw new Error('không dùng'); } }));

import { handleStudentAiCostAction } from '../_student-ai-cost';

const getPath = (data: DocData, path: string): unknown => path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), data);

const fakeDb = (): any => {
  const docRef = (path: string): any => ({
    get: async () => ({ exists: h.store[path] !== undefined, id: path.split('/').pop(), data: () => (h.store[path] ? { ...h.store[path] } : undefined) }),
  });
  const query = (col: string, filters: Array<[string, unknown]>, cap: number): any => ({
    where: (field: string, _op: string, value: unknown) => query(col, [...filters, [field, value]], cap),
    limit: (n: number) => query(col, filters, n),
    get: async () => {
      const docs = Object.keys(h.store)
        .filter(p => p.startsWith(`${col}/`) && p.split('/').length === 2)
        .filter(p => filters.every(([field, value]) => getPath(h.store[p], field) === value))
        .slice(0, cap)
        .map(p => ({ id: p.split('/')[1], data: () => ({ ...h.store[p] }) }));
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  });
  return { collection: (col: string) => ({ ...query(col, [], 1000), doc: (id: string) => docRef(`${col}/${id}`) }) };
};

const call = async (body: DocData = { idToken: 't' }) => {
  const res: any = { statusCode: 0, payload: null, status(c: number) { res.statusCode = c; return res; }, json(p: unknown) { res.payload = p; return res; } };
  const handled = await handleStudentAiCostAction(fakeDb(), { action: 'studentAiCost', ...body }, res);
  return { res, handled };
};

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const usage = (over: DocData = {}): DocData => ({
  at: new Date().toISOString(),
  day: today,
  model: 'gemini-3.8-flash',
  feature: 'autoGrade',
  inputTokens: 1_000_000,
  outputTokens: 0,
  thoughtsTokens: 0,
  cachedTokens: 0,
  keyOwnerUid: 'gv-1',
  refs: { studentId: 'hs-1', classId: 'lop-1', assignmentId: 'bt-1' },
  ...over,
});

beforeEach(() => {
  h.uid = 'anon-1';
  h.store = {
    'adminSettings/billing': { usdVnd: 26_000 },
    'studentLinks/anon-1': { studentId: 'hs-1', classId: 'lop-1', teacherId: 'gv-1' },
    'assignments/bt-1': { classId: 'lop-1', title: 'BTVN Bài 5' },
    'assignments/bt-khac': { classId: 'lop-khac', title: 'Bài của lớp khác' },
  };
});

describe('POST /api/classroom · studentAiCost', () => {
  it('không phải action này thì bỏ qua (để các handler khác xử lý)', async () => {
    const res: any = { status() { return res; }, json() { return res; } };
    expect(await handleStudentAiCostAction(fakeDb(), { action: 'khac' }, res)).toBe(false);
  });

  it('chưa đăng nhập 401; có phiên nhưng không phải học sinh (không có studentLinks) 403', async () => {
    h.uid = null;
    expect((await call()).res.statusCode).toBe(401);
    expect((await call({})).res.statusCode).toBe(401);
    h.uid = 'giao-vien';
    expect((await call()).res.statusCode).toBe(403);
  });

  it('chỉ tính lượt của ĐÚNG em: không lẫn em khác, không lẫn lớp khác dù trùng mã học sinh', async () => {
    h.store['aiUsage/a'] = usage();
    h.store['aiUsage/b'] = usage({ inputTokens: 500_000, feature: 'practice', refs: { studentId: 'hs-1', classId: 'lop-1' } });
    h.store['aiUsage/em-khac'] = usage({ refs: { studentId: 'hs-2', classId: 'lop-1', assignmentId: 'bt-1' } });
    h.store['aiUsage/lop-khac'] = usage({ keyOwnerUid: 'gv-khac', refs: { studentId: 'hs-1', classId: 'lop-khac', assignmentId: 'bt-khac' } });
    const { res } = await call();
    expect(res.statusCode).toBe(200);
    // 1 triệu token × $0,75 × 26.000 = 19.500đ; 500.000 token = 9.750đ
    expect(res.payload.totals.all).toEqual({ calls: 2, tokens: 1_500_000, vnd: 29_250 });
    expect(res.payload.totals.today).toEqual({ calls: 2, tokens: 1_500_000, vnd: 29_250 });
    expect(res.payload.recent.map((item: any) => item.label).sort()).toEqual(['AI chấm bài nộp', 'AI soạn bài luyện thêm cho em']);
  });

  it('kèm tên bài tập của đúng lớp; không trả mã nội bộ, ví, khoá hay uid', async () => {
    h.store['aiUsage/a'] = usage();
    h.store['aiUsage/b'] = usage({ refs: { studentId: 'hs-1', classId: 'lop-1', assignmentId: 'bt-khac' } }); // bài thuộc lớp khác: không lộ tên
    const { res } = await call();
    const titles = res.payload.recent.map((item: any) => item.assignmentTitle).filter(Boolean);
    expect(titles).toEqual(['BTVN Bài 5']);
    const text = JSON.stringify(res.payload);
    for (const secret of ['keyOwnerUid', 'gv-1', 'anon-1', 'balance', 'uid']) expect(text).not.toContain(secret);
    expect(Object.keys(res.payload.recent[0]).sort()).toEqual(['assignmentTitle', 'at', 'id', 'inputTokens', 'label', 'outputTokens', 'tokens', 'vnd'].filter(k => k in res.payload.recent[0]).sort());
  });

  it('lượt không bị trừ ví (khoá riêng, chủ dự án) vẫn hiện giá gốc để em thấy cùng một thước đo', async () => {
    h.store['aiUsage/own'] = usage({ keySource: 'own', costUsd: 0 });
    const { res } = await call();
    expect(res.payload.totals.all.vnd).toBe(19_500);
  });

  it('chưa dùng AI lần nào: toàn số 0, danh sách rỗng', async () => {
    const { res } = await call();
    expect(res.statusCode).toBe(200);
    expect(res.payload.totals.all).toEqual({ calls: 0, tokens: 0, vnd: 0 });
    expect(res.payload.recent).toEqual([]);
  });
});
