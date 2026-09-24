import { beforeEach, describe, expect, it, vi } from 'vitest';

type DocData = Record<string, unknown>;

const h = vi.hoisted(() => ({
  claims: {} as Record<string, unknown>,
  store: {} as Record<string, Record<string, DocData>>,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => h.claims,
    listUsers: async () => ({
      users: [
        { uid: 'gv-cuong', email: 'congapro60@gmail.com', displayName: 'Cường', disabled: false, providerData: [{ providerId: 'google.com' }], metadata: { creationTime: 'c', lastSignInTime: 's', lastRefreshTime: 'r' } },
        { uid: 'hs-1', providerData: [], metadata: {} },
      ],
      pageToken: undefined,
    }),
  }),
}));

vi.mock('../_exam-core.js', () => ({ getAdminDb: () => fakeDb(), getAdminStorage: () => ({}) }));

const getPath = (obj: DocData, path: string): unknown => path.split('.').reduce<unknown>((acc, key) => (acc as DocData | undefined)?.[key], obj);

const snapOf = (col: string, id: string) => {
  const data = h.store[col]?.[id];
  return { id, exists: data !== undefined, data: () => (data ? { ...data } : undefined), get: (p: string) => (data ? getPath(data, p) : undefined) };
};

const fakeDb = () => {
  const query = (col: string, filters: Array<[string, string, unknown]>) => ({
    where: (f: string, op: string, v: unknown) => query(col, [...filters, [f, op, v]]),
    select: () => query(col, filters),
    get: async () => {
      const docs = Object.keys(h.store[col] ?? {}).map(id => snapOf(col, id)).filter(s => filters.every(([f, op, v]) => {
        const value = s.get(f) as string;
        return op === '>=' ? value >= (v as string) : op === '<=' ? value <= (v as string) : value === v;
      }));
      return { docs, size: docs.length };
    },
  });
  const docRef = (col: string, id: string) => ({
    id, _col: col,
    get: async () => snapOf(col, id),
    set: async (data: DocData) => { (h.store[col] ||= {})[id] = data; },
  });
  return {
    collection: (col: string) => ({ ...query(col, []), doc: (id: string) => docRef(col, id) }),
    doc: (path: string) => { const [col, id] = path.split('/'); return docRef(col, id); },
    getAll: async (...refs: Array<{ _col: string; id: string }>) => refs.map(r => snapOf(r._col, r.id)),
  };
};

import handler from '../classroom';
import { parseVcbUsdSell } from '../_admin';

const call = async (body: DocData) => {
  const res = { statusCode: 0, payload: null as DocData | null, status(c: number) { res.statusCode = c; return res; }, json(p: DocData) { res.payload = p; return res; } };
  await handler({ method: 'POST', body: { idToken: 't', ...body } } as never, res as never);
  return res;
};

const ADMIN = { uid: 'gv-cuong', email: 'congapro60@gmail.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } };

describe('trang quản trị', () => {
  beforeEach(() => {
    h.claims = ADMIN;
    h.store = {
      classes: { 'lop-1': { name: '10Olinda', teacherId: 'gv-cuong', studentCount: 19 }, 'lop-h': { name: '10Victoria', teacherId: 'gv-hanh', studentCount: 20 } },
      assignments: { 'bai-1': { classId: 'lop-1', teacherId: 'gv-cuong' } },
      submissions: {
        'sub-1': { classId: 'lop-1', teacherId: 'gv-cuong', grade: { gradedAt: '2026-09-10T03:00:00Z' } },
        'sub-2': { classId: 'lop-h', teacherId: 'gv-hanh', grade: { gradedAt: '2026-09-25T03:00:00Z' } },
      },
      submissionGradeHistory: { 'h1': { teacherId: 'gv-hanh', action: 'ai_regrade', createdAt: '2026-09-01T00:00:00Z' } },
      aiUsage: {
        u1: { day: '2026-09-25', model: 'gemini-3.8-flash', uid: 'hs-1', anonymous: true, refs: { submissionId: 'sub-2' }, inputTokens: 1_000_000, outputTokens: 0, thoughtsTokens: 0, cachedTokens: 0 },
        u2: { day: '2026-08-01', model: 'gemini-3.8-flash', uid: 'gv-cuong', anonymous: false, refs: {}, inputTokens: 5, outputTokens: 0, thoughtsTokens: 0, cachedTokens: 0 },
      },
    };
  });

  it('người không phải admin, hoặc email chưa xác minh, bị chặn 403', async () => {
    h.claims = { ...ADMIN, email: 'someone@gmail.com' };
    expect((await call({ action: 'adminOverview' })).statusCode).toBe(403);
    h.claims = { ...ADMIN, email_verified: false };
    expect((await call({ action: 'adminOverview' })).statusCode).toBe(403);
  });

  it('tổng quan: giáo viên chi tiết, học sinh ẩn danh chỉ đếm; lượt AI chia trước/sau bộ đếm', async () => {
    const res = await call({ action: 'adminOverview' });
    expect(res.statusCode).toBe(200);
    expect(res.payload?.users).toHaveLength(1);
    expect(res.payload?.anonymousCount).toBe(1);
    expect(res.payload?.aiEventsBefore).toEqual({ 'gv-cuong': 1, 'gv-hanh': 1 });
    expect(res.payload?.aiEventsAfter).toEqual({ 'gv-hanh': 1 });
    const lop = (res.payload?.classes as DocData[]).find(c => c.id === 'lop-1');
    expect(lop).toMatchObject({ assignmentCount: 1, submissionCount: 1, gradedCount: 1 });
  });

  it('tiền theo giáo viên: lượt học sinh ẩn danh tính cho GV chủ lớp, chỉ trong khoảng ngày', async () => {
    const res = await call({ action: 'adminUsage', fromDay: '2026-09-24', toDay: '2026-09-30' });
    expect(res.statusCode).toBe(200);
    const rows = res.payload?.rows as Array<DocData>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ billTo: 'gv-hanh', calls: 1 });
    expect(rows[0].costUsd as number).toBeCloseTo(0.75, 10);
  });

  it('lưu tỷ giá / tổng Google trước bộ đếm, từ chối số vô lý', async () => {
    expect((await call({ action: 'adminSaveSettings', usdVnd: 5, preMeteringVnd: 0 })).statusCode).toBe(422);
    const ok = await call({ action: 'adminSaveSettings', usdVnd: 26_190, usdVndNote: 'VCB', preMeteringVnd: 356_000, preMeteringNote: 'AI Studio 27/6–23/9' });
    expect(ok.statusCode).toBe(200);
    expect(h.store.adminSettings.billing).toMatchObject({ usdVnd: 26_190, preMeteringVnd: 356_000 });
  });

  it('đọc tỷ giá USD bán ra từ feed Vietcombank', () => {
    const xml = '<ExrateList><DateTime>9/24/2026 7:26:02 AM</DateTime><Exrate CurrencyCode="USD" CurrencyName="US DOLLAR" Buy="25,780.00" Transfer="25,810.00" Sell="26,190.00" /></ExrateList>';
    expect(parseVcbUsdSell(xml)).toEqual({ sell: 26_190, dateTime: '9/24/2026 7:26:02 AM' });
    expect(parseVcbUsdSell('<x/>')).toBeNull();
  });
});
