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

const docsOf = (path: string, filter?: (data: DocData) => boolean) =>
  Object.entries(h.store[path] ?? {})
    .filter(([, data]) => !filter || filter(data))
    .map(([id]) => snapOf(path, id));

const snapOf = (path: string, id: string): Record<string, any> => {
  const data = h.store[path]?.[id];
  return { id, exists: data !== undefined, data: () => (data ? structuredClone(data) : undefined), ref: docRef(path, id) };
};

const queryOf = (path: string, filter?: (data: DocData) => boolean): Record<string, any> => ({
  where: (field: string, _op: string, value: unknown) => queryOf(path, data => data[field] === value && (!filter || filter(data))),
  limit: () => queryOf(path, filter),
  get: async () => { const docs = docsOf(path, filter); return { docs, empty: docs.length === 0, size: docs.length }; },
});

const docRef = (path: string, id: string): Record<string, any> => ({
  id,
  get: async () => snapOf(path, id),
  set: async (data: DocData, options?: { merge?: boolean }) => {
    (h.store[path] ||= {})[id] = options?.merge ? { ...h.store[path]?.[id], ...structuredClone(data) } : structuredClone(data);
  },
  delete: async () => { delete h.store[path]?.[id]; },
  collection: (sub: string) => collectionRef(`${path}/${id}/${sub}`),
});

const collectionRef = (path: string): Record<string, any> => ({
  ...queryOf(path),
  doc: (id: string) => docRef(path, id),
});

// Giao dịch giả: xếp hàng tuần tự như Firestore thật khi tranh chấp cùng một tài liệu.
let txChain: Promise<unknown> = Promise.resolve();

const fakeDb = () => ({
  ...collectionRefRoot(),
  runTransaction: <T,>(fn: (tx: { get: (ref: Record<string, any>) => Promise<unknown>; set: (ref: Record<string, any>, data: DocData, options?: { merge?: boolean }) => void }) => Promise<T>): Promise<T> => {
    const writes: Array<() => Promise<void>> = [];
    const run = txChain.then(async () => {
      const result = await fn({ get: ref => ref.get(), set: (ref, data, options) => { writes.push(() => ref.set(data, options)); } });
      for (const write of writes) await write();
      return result;
    });
    txChain = run.catch(() => undefined);
    return run;
  },
  batch: () => {
    const ops: Array<() => Promise<void>> = [];
    return {
      set: (ref: Record<string, any>, data: DocData) => { ops.push(() => ref.set(data)); },
      delete: (ref: Record<string, any>) => { ops.push(() => ref.delete()); },
      commit: async () => { for (const op of ops) await op(); },
    };
  },
});
const collectionRefRoot = () => ({ collection: (path: string) => collectionRef(path) });

import handler from '../classroom';
import { hashPin } from '../_classroom-core';

const call = async (body: DocData) => {
  const res = { statusCode: 0, payload: null as any, status(c: number) { res.statusCode = c; return res; }, json(p: unknown) { res.payload = p; return res; } };
  await handler({ method: 'POST', body: { idToken: 't', ...body } } as never, res as never);
  return res;
};

const TEACHER = { uid: 'gv-cuong', email: 'congapro60@gmail.com' };
const OTHER_TEACHER = { uid: 'gv-khac', email: 'khac@gmail.com' };
const INPUT = (name: string) => ({ studentName: name, className: '10Olinda', period: { title: 'Báo cáo tháng 9/2026 — 10Olinda', range: '01/09/2026 – 30/09/2026', kind: 'month' }, report: { overallSummary: 'x' } });
const PUBLISH = { action: 'publishParentReports', classId: 'lop-1', kind: 'month', from: '2026-09-01', to: '2026-09-30' };

beforeEach(() => {
  h.claims = TEACHER;
  h.store = {
    classes: { 'lop-1': { name: '10Olinda', teacherId: 'gv-cuong', joinCode: 'ABCD23' } },
    'classes/lop-1/students': { a: { name: 'An' }, b: { name: 'Bình' } },
    // PIN học sinh của An — KHÔNG được dùng để vào cổng phụ huynh.
    'classes/lop-1/studentSecrets': { a: { pinPlain: '1111' } },
  };
});

describe('PIN phụ huynh', () => {
  it('cấp cho cả lớp, gọi lại giữ nguyên PIN cũ, regenerate thì đổi; không đụng PIN học sinh', async () => {
    const first = await call({ action: 'issueParentPins', classId: 'lop-1' });
    expect(first.statusCode).toBe(200);
    expect(first.payload.joinCode).toBe('ABCD23');
    expect(first.payload.rows.map((r: any) => r.name)).toEqual(['An', 'Bình']);
    expect(first.payload.rows.every((r: any) => /^\d{4}$/.test(r.pin))).toBe(true);
    expect(h.store['classes/lop-1/studentSecrets'].a.pinPlain).toBe('1111');

    const again = await call({ action: 'issueParentPins', classId: 'lop-1' });
    expect(again.payload.rows).toEqual(first.payload.rows);

    const reset = await call({ action: 'resetParentPin', classId: 'lop-1', studentId: 'a' });
    expect(reset.statusCode).toBe(200);
    expect(h.store['classes/lop-1/parentSecrets'].a.pinPlain).toBe(reset.payload.pin);
    expect(h.store['classes/lop-1/parentSecrets'].b.pinPlain).toBe(first.payload.rows[1].pin);
  });

  it('giáo viên lớp khác không cấp/công bố được', async () => {
    h.claims = OTHER_TEACHER;
    expect((await call({ action: 'issueParentPins', classId: 'lop-1' })).statusCode).toBe(403);
    expect((await call({ ...PUBLISH, reports: [{ studentId: 'a', input: INPUT('An') }] })).statusCode).toBe(403);
  });
});

describe('công bố + phụ huynh xem', () => {
  const setup = async () => {
    const pins = (await call({ action: 'issueParentPins', classId: 'lop-1' })).payload.rows as Array<{ studentId: string; pin: string }>;
    await call({ ...PUBLISH, reports: [{ studentId: 'a', input: INPUT('An') }, { studentId: 'b', input: INPUT('Bình') }, { studentId: 'lạ', input: INPUT('Ai đó') }] });
    return Object.fromEntries(pins.map(p => [p.studentId, p.pin]));
  };
  const parentCall = (extra: DocData) => call({ action: 'parentReports', idToken: undefined, joinCode: 'abcd23', ...extra });

  it('chỉ công bố em thuộc lớp; kì/ngày sai thì 400', async () => {
    const res = await call({ ...PUBLISH, reports: [{ studentId: 'a', input: INPUT('An') }, { studentId: 'lạ', input: INPUT('Ai đó') }] });
    expect(res.payload).toEqual({ saved: 1, skipped: ['lạ'] });
    expect(Object.keys(h.store['classes/lop-1/parentReports'])).toEqual(['a__month__2026-09-01__2026-09-30']);
    expect((await call({ ...PUBLISH, kind: 'tuan', reports: [{ studentId: 'a', input: INPUT('An') }] })).statusCode).toBe(400);
    expect((await call({ ...PUBLISH, from: '1/9', reports: [{ studentId: 'a', input: INPUT('An') }] })).statusCode).toBe(400);
  });

  it('đúng PIN → thấy báo cáo của CHÍNH em, không thấy của em khác', async () => {
    const pins = await setup();
    const res = await parentCall({ studentId: 'a', pin: pins.a });
    expect(res.statusCode).toBe(200);
    expect(res.payload.studentName).toBe('An');
    expect(res.payload.reports).toHaveLength(1);
    expect(res.payload.reports[0].input.studentName).toBe('An');
    expect(res.payload.reports[0].title).toContain('tháng 9/2026');
  });

  it('PIN học sinh hoặc PIN của em khác không vào được; sai 5 lần thì khoá, đúng PIN cũng bị chặn', async () => {
    const pins = await setup();
    // PIN học sinh (1111) không phải PIN phụ huynh: nếu tình cờ trùng số thì đổi sang số khác cho phép thử còn ý nghĩa.
    const khac = (pin: string) => (pin === '1111' ? '2222' : '1111');
    expect((await parentCall({ studentId: 'a', pin: khac(pins.a) })).statusCode).toBe(401);
    const sai = pins.b === '9999' ? '9998' : '9999';
    for (let i = 0; i < 6; i += 1) await parentCall({ studentId: 'b', pin: sai });
    const locked = await parentCall({ studentId: 'b', pin: pins.b });
    expect(locked.statusCode).toBe(429);
  });

  it('chưa cấp PIN → 409; lớp/em không có → 404; PIN sai dạng → 400', async () => {
    expect((await parentCall({ studentId: 'a', pin: '1234' })).statusCode).toBe(409);
    expect((await parentCall({ joinCode: 'ZZZZZZ', studentId: 'a', pin: '1234' })).statusCode).toBe(404);
    expect((await parentCall({ studentId: 'khong-co', pin: '1234' })).statusCode).toBe(404);
    expect((await parentCall({ studentId: 'a', pin: 'abcd' })).statusCode).toBe(400);
  });

  it('gỡ công bố: cả lớp hoặc một em; danh sách theo kì đếm đúng', async () => {
    const pins = await setup();
    const list = await call({ action: 'listParentPublished', classId: 'lop-1' });
    expect(list.payload.groups).toMatchObject([{ kind: 'month', from: '2026-09-01', to: '2026-09-30', count: 2 }]);

    await call({ action: 'unpublishParentReports', classId: 'lop-1', kind: 'month', from: '2026-09-01', to: '2026-09-30', studentId: 'a' });
    expect((await parentCall({ studentId: 'a', pin: pins.a })).payload.reports).toHaveLength(0);
    expect((await parentCall({ studentId: 'b', pin: pins.b })).payload.reports).toHaveLength(1);

    const all = await call({ action: 'unpublishParentReports', classId: 'lop-1', kind: 'month', from: '2026-09-01', to: '2026-09-30' });
    expect(all.payload.removed).toBe(1);
  });
});

describe('đoán PIN song song không né được khoá (giao dịch)', () => {
  const guess = (pin: string) => call({ action: 'parentReports', idToken: undefined, joinCode: 'ABCD23', studentId: 'a', pin });

  it('PIN phụ huynh: 12 lượt sai gửi cùng lúc → đúng 5 lượt 401, 7 lượt còn lại bị khoá; PIN đúng cũng bị chặn', async () => {
    const pins = (await call({ action: 'issueParentPins', classId: 'lop-1' })).payload.rows as Array<{ studentId: string; pin: string }>;
    const dung = pins.find(r => r.studentId === 'a')!.pin;
    const sai = dung === '0000' ? '0001' : '0000';
    const codes = (await Promise.all(Array.from({ length: 12 }, () => guess(sai)))).map(r => r.statusCode);
    expect(codes.filter(c => c === 401)).toHaveLength(5);
    expect(codes.filter(c => c === 429)).toHaveLength(7);
    expect((await guess(dung)).statusCode).toBe(429);
  });

  it('PIN học sinh (cổng /lop): cùng lỗi đã sửa — 12 lượt sai song song vẫn khoá sau 5', async () => {
    h.claims = { uid: 'anon-x', firebase: { sign_in_provider: 'anonymous' } };
    h.store['classes/lop-1/studentSecrets'] = { a: { pinHash: hashPin('4321') } };
    const login = (pin: string) => call({ action: 'login', joinCode: 'ABCD23', studentId: 'a', pin });
    const codes = (await Promise.all(Array.from({ length: 12 }, () => login('1234')))).map(r => r.statusCode);
    expect(codes.filter(c => c === 401)).toHaveLength(5);
    expect(codes.filter(c => c === 429)).toHaveLength(7);
    expect((await login('4321')).statusCode).toBe(429);
  });
});
