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

const queryOf = (path: string, filter?: (data: DocData) => boolean, order?: { field: string; dir: string }, max?: number): Record<string, any> => ({
  where: (field: string, _op: string, value: unknown) => queryOf(path, data => data[field] === value && (!filter || filter(data)), order, max),
  select: () => queryOf(path, filter, order, max),
  orderBy: (field: string, dir = 'asc') => queryOf(path, filter, { field, dir }, max),
  limit: (n: number) => queryOf(path, filter, order, n),
  get: async () => {
    let docs = docsOf(path, filter);
    if (order) {
      const key = (d: Record<string, any>) => String(d.data()?.[order.field] ?? '');
      docs = [...docs].sort((a, b) => key(a).localeCompare(key(b)) * (order.dir === 'desc' ? -1 : 1));
    }
    if (max !== undefined) docs = docs.slice(0, max);
    return { docs, empty: docs.length === 0, size: docs.length };
  },
});

const docRef = (path: string, id: string): Record<string, any> => ({
  id,
  get: async () => snapOf(path, id),
  set: async (data: DocData, options?: { merge?: boolean }) => {
    (h.store[path] ||= {})[id] = options?.merge ? { ...h.store[path]?.[id], ...structuredClone(data) } : structuredClone(data);
  },
  update: async (data: DocData) => { (h.store[path] ||= {})[id] = { ...h.store[path]?.[id], ...structuredClone(data) }; },
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
  getAll: async (...refs: Array<Record<string, any>>) => Promise.all(refs.map(ref => ref.get())),
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

const call = async (body: DocData): Promise<any> => {
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
    // Lần đầu vào phụ huynh phải tự đặt PIN riêng mới xem được báo cáo → các em còn lại dùng PIN do phụ huynh đặt.
    const own: Record<string, string> = { a: '2580', b: '7413' };
    for (const row of pins) {
      expect((await call({ action: 'changeParentPin', idToken: undefined, joinCode: 'ABCD23', studentId: row.studentId, pin: row.pin, newPin: own[row.studentId] })).statusCode).toBe(200);
    }
    return own;
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

  it('bản chỉnh tay của giáo viên áp lên báo cáo đã công bố mỗi lần phụ huynh mở; bản hỏng thì dùng bản gốc', async () => {
    const pins = await setup();
    const docs = h.store['classes/lop-1/parentReports'];
    const idA = Object.keys(docs).find(id => docs[id].studentId === 'a')!;
    docs[idA].overridesJson = JSON.stringify({ studentName: 'An (đã sửa)', teacherComment: 'Thầy nhận xét' });
    const edited = (await parentCall({ studentId: 'a', pin: pins.a })).payload.reports[0].input;
    expect(edited.studentName).toBe('An (đã sửa)');
    expect(edited.teacherComment).toBe('Thầy nhận xét');
    docs[idA].overridesJson = '{hỏng';
    expect((await parentCall({ studentId: 'a', pin: pins.a })).payload.reports[0].input.studentName).toBe('An');
  });

  it('PIN học sinh hoặc PIN của em khác không vào được; sai bao nhiêu lần cũng KHÔNG bị khoá', async () => {
    const pins = await setup();
    // PIN học sinh (1111) không phải PIN phụ huynh.
    expect((await parentCall({ studentId: 'a', pin: '1111' })).statusCode).toBe(401);
    expect((await parentCall({ studentId: 'a', pin: pins.b })).statusCode).toBe(401);
    for (let i = 0; i < 20; i += 1) expect((await parentCall({ studentId: 'b', pin: 'zzzz' })).statusCode).toBe(401);
    const ok = await parentCall({ studentId: 'b', pin: pins.b });
    expect(ok.statusCode).toBe(200);
    expect(ok.payload.reports).toHaveLength(1);
  });

  it('chưa cấp PIN → 409; lớp/em không có → 404; PIN sai dạng (không đủ 4 ký tự / có dấu cách) → 400', async () => {
    expect((await parentCall({ studentId: 'a', pin: '1234' })).statusCode).toBe(409);
    expect((await parentCall({ joinCode: 'ZZZZZZ', studentId: 'a', pin: '1234' })).statusCode).toBe(404);
    expect((await parentCall({ studentId: 'khong-co', pin: '1234' })).statusCode).toBe(404);
    expect((await parentCall({ studentId: 'a', pin: '12' })).statusCode).toBe(400);
    expect((await parentCall({ studentId: 'a', pin: '12 4' })).statusCode).toBe(400);
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

describe('phụ huynh tự đặt PIN', () => {
  const parentCall = (extra: DocData) => call({ action: 'parentReports', idToken: undefined, joinCode: 'ABCD23', ...extra });
  const change = (extra: DocData) => call({ action: 'changeParentPin', idToken: undefined, joinCode: 'ABCD23', ...extra });
  const issue = async () => Object.fromEntries(((await call({ action: 'issueParentPins', classId: 'lop-1' })).payload.rows as Array<{ studentId: string; pin: string }>).map(r => [r.studentId, r.pin]));

  it('lần đầu vào bằng PIN thầy cô cấp → mustChange, CHƯA thấy báo cáo; đặt PIN riêng xong mới thấy', async () => {
    const pins = await issue();
    await call({ ...PUBLISH, reports: [{ studentId: 'a', input: INPUT('An') }] });
    const first = await parentCall({ studentId: 'a', pin: pins.a });
    expect(first.statusCode).toBe(200);
    expect(first.payload).toMatchObject({ mustChange: true, reports: [], studentName: 'An' });

    expect((await change({ studentId: 'a', pin: pins.a, newPin: '2580' })).statusCode).toBe(200);
    const after = await parentCall({ studentId: 'a', pin: '2580' });
    expect(after.payload.mustChange).toBe(false);
    expect(after.payload.reports).toHaveLength(1);
    // PIN cũ do thầy cô cấp không còn dùng được.
    expect((await parentCall({ studentId: 'a', pin: pins.a })).statusCode).toBe(401);
  });

  it('PIN mới đồng bộ ngay lên bảng PIN của giáo viên (đánh dấu PH tự đặt); đặt lại thì bắt phụ huynh đặt PIN mới', async () => {
    const pins = await issue();
    await change({ studentId: 'a', pin: pins.a, newPin: '2580' });
    const table = (await call({ action: 'issueParentPins', classId: 'lop-1' })).payload.rows;
    expect(table.find((r: any) => r.studentId === 'a')).toMatchObject({ pin: '2580', parentSet: true });
    expect(table.find((r: any) => r.studentId === 'b')).toMatchObject({ pin: pins.b, parentSet: false });

    const reset = await call({ action: 'resetParentPin', classId: 'lop-1', studentId: 'a' });
    const again = await parentCall({ studentId: 'a', pin: reset.payload.pin });
    expect(again.payload.mustChange).toBe(true);
    expect((await parentCall({ studentId: 'a', pin: '2580' })).statusCode).toBe(401);
  });

  it('PH đã đặt PIN riêng vẫn đổi lại được bất cứ lúc nào (nút đổi PIN trong màn xem báo cáo)', async () => {
    const pins = await issue();
    await change({ studentId: 'a', pin: pins.a, newPin: '2580' });
    expect((await change({ studentId: 'a', pin: '2580', newPin: '7413' })).statusCode).toBe(200);
    expect((await parentCall({ studentId: 'a', pin: '7413' })).payload.mustChange).toBe(false);
    expect(h.store['classes/lop-1/parentSecrets'].a.pinPlain).toBe('7413');
  });

  it('PIN mới là 4 ký tự bất kỳ: chữ, ký tự đặc biệt, chữ có dấu đều được; đăng nhập đúng chữ hoa/thường', async () => {
    const pins = await issue();
    expect((await change({ studentId: 'a', pin: pins.a, newPin: 'aB#9' })).statusCode).toBe(200);
    expect(h.store['classes/lop-1/parentSecrets'].a.pinPlain).toBe('aB#9');
    expect((await parentCall({ studentId: 'a', pin: 'aB#9' })).payload.mustChange).toBe(false);
    expect((await parentCall({ studentId: 'a', pin: 'ab#9' })).statusCode).toBe(401);
    // Chữ có dấu gõ ở dạng tổ hợp (NFD) vẫn khớp bản đã đặt (NFC).
    expect((await change({ studentId: 'a', pin: 'aB#9', newPin: 'ắẹ1!' })).statusCode).toBe(200);
    expect((await parentCall({ studentId: 'a', pin: 'ắẹ1!'.normalize('NFD') })).statusCode).toBe(200);
    // Số giống nhau / dãy số không còn bị chặn.
    expect((await change({ studentId: 'a', pin: 'ắẹ1!', newPin: '1111' })).statusCode).toBe(200);
    expect((await change({ studentId: 'a', pin: '1111', newPin: '1234' })).statusCode).toBe(200);
  });

  it('từ chối: PIN hiện tại sai (nhập lại thoải mái, không khoá), PIN mới trùng cũ / sai độ dài / có dấu cách, chưa cấp PIN', async () => {
    expect((await change({ studentId: 'a', pin: '1357', newPin: '2580' })).statusCode).toBe(409);
    const pins = await issue();
    const sai = pins.a === '1357' ? '1358' : '1357';
    for (let i = 0; i < 10; i += 1) expect((await change({ studentId: 'a', pin: sai, newPin: '2580' })).statusCode).toBe(401);
    expect((await change({ studentId: 'a', pin: pins.a, newPin: pins.a })).statusCode).toBe(400);
    expect((await change({ studentId: 'a', pin: pins.a, newPin: '123' })).statusCode).toBe(400);
    expect((await change({ studentId: 'a', pin: pins.a, newPin: '12345' })).statusCode).toBe(400);
    expect((await change({ studentId: 'a', pin: pins.a, newPin: '12 4' })).statusCode).toBe(400);
    expect(h.store['classes/lop-1/parentSecrets'].a.pinSetBy).toBe('teacher');
    expect((await change({ studentId: 'a', pin: pins.a, newPin: '2580' })).statusCode).toBe(200);
  });

  it('giáo viên đặt lại → PIN ngẫu nhiên 4 số để gửi lại cho phụ huynh', async () => {
    await issue();
    const reset = await call({ action: 'resetParentPin', classId: 'lop-1', studentId: 'a' });
    expect(reset.payload.pin).toMatch(/^\d{4}$/);
    expect(h.store['classes/lop-1/parentSecrets'].a).toMatchObject({ pinPlain: reset.payload.pin, pinSetBy: 'teacher' });
  });
});

describe('đoán PIN học sinh song song không né được khoá (giao dịch)', () => {
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

describe('thống kê hoạt động phụ huynh', () => {
  const parentCall = (extra: DocData) => call({ idToken: undefined, joinCode: 'ABCD23', ...extra });
  const issue = async () => Object.fromEntries(((await call({ action: 'issueParentPins', classId: 'lop-1' })).payload.rows as Array<{ studentId: string; pin: string }>).map(r => [r.studentId, r.pin]));
  const stats = async () => (await call({ action: 'parentActivity', classId: 'lop-1' })).payload.rows as Array<Record<string, any>>;

  it('đếm lần vào (chỉ sau khi đặt PIN riêng), lần sai, lần đổi PIN; em chưa vào vẫn có dòng với số 0', async () => {
    const pins = await issue();
    await parentCall({ action: 'parentReports', studentId: 'a', pin: '9999', device: 'mobile' });
    await parentCall({ action: 'parentReports', studentId: 'a', pin: pins.a, device: 'mobile' }); // mã tạm: chưa tính là đã vào
    expect((await stats())[0]).toMatchObject({ loginCount: 0, wrongCount: 1, lastSeenAt: '', online: false });
    await parentCall({ action: 'changeParentPin', studentId: 'a', pin: pins.a, newPin: '2580', device: 'desktop' });
    await parentCall({ action: 'parentReports', studentId: 'a', pin: '2580', device: 'desktop' });
    const [an, binh] = await stats();
    expect(an).toMatchObject({ name: 'An', loginCount: 1, wrongCount: 1, lastDevice: 'desktop', online: true });
    expect(an.firstLoginAt).toBeTruthy();
    expect(binh).toMatchObject({ name: 'Bình', loginCount: 0, wrongCount: 0, lastSeenAt: '', online: false });
  });

  it('đợt dò mã: các lần sai dồn dập chỉ ghi tối đa 1 lần mỗi 2 giây (không nghẽn tài liệu thống kê); sau 2 giây ghi tiếp', async () => {
    await issue();
    for (let i = 0; i < 25; i += 1) await parentCall({ action: 'parentReports', studentId: 'a', pin: `x${i % 10}zz` });
    expect((await stats())[0].wrongCount).toBe(1);
    h.store['classes/lop-1/parentStats'].a.lastWrongAt = new Date(Date.now() - 5_000).toISOString();
    await parentCall({ action: 'parentReports', studentId: 'a', pin: 'qqqq' });
    expect((await stats())[0].wrongCount).toBe(2);
  });

  it('parentEvent: PIN sai cũng được đếm; mã tạm của thầy cô (chưa đặt PIN riêng) không ghi được sự kiện', async () => {
    const pins = await issue();
    expect((await parentCall({ action: 'parentEvent', studentId: 'a', pin: '0001', type: 'ping' })).statusCode).toBe(401);
    expect((await stats())[0].wrongCount).toBe(1);
    const gate = await parentCall({ action: 'parentEvent', studentId: 'a', pin: pins.a, type: 'ping' });
    expect(gate.statusCode).toBe(403);
    expect((await stats())[0].lastSeenAt).toBe('');
  });

  it('dòng thời gian: vào, mở báo cáo, tải PDF, đổi PIN — mới nhất trước; "còn đây" và sai PIN không thành dòng', async () => {
    const pins = await issue();
    await parentCall({ action: 'changeParentPin', studentId: 'a', pin: pins.a, newPin: '2580' });
    await parentCall({ action: 'parentReports', studentId: 'a', pin: '2580' });
    await parentCall({ action: 'parentEvent', studentId: 'a', pin: '2580', type: 'open', detail: 'Báo cáo tháng 9/2026' });
    for (let i = 0; i < 130; i += 1) h.store['classes/lop-1/parentStats/a/events'][`2026-01-01T00:00:${String(i).padStart(3, '0')}_x`] = { type: 'open', at: `2026-01-01T00:00:${String(i).padStart(3, '0')}Z`, device: 'mobile', detail: 'cũ' };
    await parentCall({ action: 'parentEvent', studentId: 'a', pin: '2580', type: 'ping' });
    await parentCall({ action: 'parentEvent', studentId: 'a', pin: '2580', type: 'pdf', detail: 'Báo cáo tháng 9/2026' });
    await parentCall({ action: 'parentReports', studentId: 'a', pin: '0001' });
    const detail = await call({ action: 'parentActivityDetail', classId: 'lop-1', studentId: 'a' });
    // Chỉ trả 100 dòng MỚI NHẤT: 4 sự kiện thật đều còn, phần dư là các dòng cũ nhất bị bỏ.
    expect(detail.payload.events).toHaveLength(100);
    expect(detail.payload.events.filter((e: any) => e.detail !== 'cũ').map((e: any) => e.type).sort()).toEqual(['login', 'open', 'pdf', 'pinChanged']);
    expect(detail.payload.events.find((e: any) => e.type === 'open' && e.detail !== 'cũ').detail).toBe('Báo cáo tháng 9/2026');
    const times = detail.payload.events.map((e: any) => e.at);
    expect([...times].sort().reverse()).toEqual(times);
    expect((await stats())[0]).toMatchObject({ openCount: 1, pdfCount: 1, wrongCount: 1 });
  });

  it('không có PIN đúng thì không ghi được sự kiện; loại sự kiện lạ bị từ chối; GV lớp khác không xem được', async () => {
    await issue();
    expect((await parentCall({ action: 'parentEvent', studentId: 'a', pin: '0001', type: 'ping' })).statusCode).toBe(401);
    expect((await parentCall({ action: 'parentEvent', studentId: 'a', pin: '0001', type: 'xoa' })).statusCode).toBe(400);
    expect((await stats())[0].lastSeenAt).toBe('');
    h.claims = OTHER_TEACHER;
    expect((await call({ action: 'parentActivity', classId: 'lop-1' })).statusCode).toBe(403);
    expect((await call({ action: 'parentActivityDetail', classId: 'lop-1', studentId: 'a' })).statusCode).toBe(403);
  });

  it('"đang xem" hết hạn khi quá 75 giây không có tín hiệu', async () => {
    await issue();
    h.store['classes/lop-1/parentStats'] = { a: { studentId: 'a', lastSeenAt: new Date(Date.now() - 120_000).toISOString(), loginCount: 1 }, b: { studentId: 'b', lastSeenAt: new Date().toISOString(), loginCount: 1 } };
    const rows = await stats();
    expect(rows.map(r => r.online)).toEqual([false, true]);
  });
});

/** Giả lập thời gian trôi qua: lùi mốc dựng của bản đệm để lần gọi kế không vướng giới hạn tần suất. */
const ageCache = (ms: number) => {
  for (const doc of Object.values(h.store['classes/lop-1/parentCache'] ?? {})) doc.at = new Date(Date.parse(String(doc.at)) - ms).toISOString();
};

describe('phụ huynh tự chọn khoảng ngày', () => {
  const custom = (extra: DocData = {}) => call({ action: 'parentCustomReport', idToken: undefined, joinCode: 'ABCD23', studentId: 'a', from: '2026-09-01', to: '2026-09-30', ...extra });
  const grade = (score: number, approved: boolean) => ({ score, maxScore: 10, feedback: 'GHI-CHU-NOI-BO', strengths: [], weaknesses: [], teacherApproved: approved, gradedAt: '2026-09-20T01:00:00Z' });

  beforeEach(async () => {
    h.store.assignments = {
      b1: { teacherId: 'gv-cuong', classId: 'lop-1', title: 'Hàm số', type: 'homework', dueAt: '2026-09-15T10:00:00Z', maxScore: 10, answerKey: 'DAP-AN-BI-MAT', createdAt: '2026-09-10T00:00:00Z' },
      b2: { teacherId: 'gv-cuong', classId: 'lop-1', title: 'Xác suất', type: 'homework', dueAt: '2026-11-15T10:00:00Z', maxScore: 10, createdAt: '2026-11-10T00:00:00Z' },
    };
    h.store.submissions = {
      s1: { teacherId: 'gv-cuong', classId: 'lop-1', studentId: 'a', assignmentId: 'b1', status: 'graded', createdAt: '2026-09-16T01:00:00Z', grade: grade(8, true) },
      s2: { teacherId: 'gv-cuong', classId: 'lop-1', studentId: 'a', assignmentId: 'b2', status: 'graded', createdAt: '2026-11-16T01:00:00Z', grade: grade(5, true) },
      // Bài của em khác và bài chưa duyệt không được lọt vào báo cáo của em A.
      s3: { teacherId: 'gv-cuong', classId: 'lop-1', studentId: 'b', assignmentId: 'b1', status: 'graded', createdAt: '2026-09-16T01:00:00Z', grade: grade(2, true) },
    };
    const pins = Object.fromEntries(((await call({ action: 'issueParentPins', classId: 'lop-1' })).payload.rows as Array<{ studentId: string; pin: string }>).map(r => [r.studentId, r.pin]));
    await call({ action: 'changeParentPin', idToken: undefined, joinCode: 'ABCD23', studentId: 'a', pin: pins.a, newPin: '2580' });
  });

  it('dựng đúng báo cáo của khoảng ngày đã chọn, chỉ bài đã duyệt của chính em, không lộ đáp án/ghi chú nội bộ', async () => {
    const res = await custom({ pin: '2580' });
    expect(res.statusCode).toBe(200);
    const { input } = res.payload;
    expect(input.period).toMatchObject({ title: 'Báo cáo học tập từ 01/09/2026 đến 30/09/2026', range: 'Từ 01/09/2026 đến 30/09/2026' });
    expect(input.report.results.map((r: any) => r.title)).toEqual(['Hàm số']);
    expect(input.report.results[0]).toMatchObject({ status: 'official', score: 8, maxScore: 10 });
    expect(input.teacherComment).toBeUndefined();
    const text = JSON.stringify(res.payload);
    expect(text).not.toContain('DAP-AN-BI-MAT');
    expect(text).not.toContain('GHI-CHU-NOI-BO');
  });

  it('khoảng khác → bài khác; chọn khoảng không có bài thì trả báo cáo trống chứ không lỗi', async () => {
    ageCache(10_000);
    const nov = await custom({ pin: '2580', from: '2026-11-01', to: '2026-11-30' });
    expect(nov.payload.input.report.results.map((r: any) => r.title)).toEqual(['Xác suất']);
    ageCache(10_000);
    const empty = await custom({ pin: '2580', from: '2026-01-01', to: '2026-01-31' });
    expect(empty.statusCode).toBe(200);
    expect(empty.payload.input.report.results).toEqual([]);
  });

  it('lấy nhận diện trường từ báo cáo giáo viên đã công bố gần nhất; ghi nhận vào thống kê', async () => {
    await call({ ...PUBLISH, reports: [{ studentId: 'a', input: { ...INPUT('An'), branding: { schoolName: 'Trường A', teacherName: 'Thầy B' } } }] });
    const res = await custom({ pin: '2580', device: 'mobile' });
    expect(res.payload.input.branding).toEqual({ schoolName: 'Trường A', teacherName: 'Thầy B' });
    const detail = await call({ action: 'parentActivityDetail', classId: 'lop-1', studentId: 'a' });
    expect(detail.payload.events[0]).toMatchObject({ type: 'custom', detail: '01/09/2026 – 30/09/2026', device: 'mobile' });
  });

  it('từ chối: PIN sai, PIN còn là mã GV cấp, ngày sai/đảo/quá dài, em khác', async () => {
    expect((await custom({ pin: '0001' })).statusCode).toBe(401);
    expect((await custom({ pin: '2580', from: '2026-09-30', to: '2026-09-01' })).statusCode).toBe(400);
    expect((await custom({ pin: '2580', from: 'abc' })).statusCode).toBe(400);
    expect((await custom({ pin: '2580', from: '2024-01-01', to: '2026-09-30' })).statusCode).toBe(400);
    // Em B chưa tự đặt PIN (còn mã GV cấp) → chưa được xem gì, kể cả báo cáo tự chọn.
    const binhPin = h.store['classes/lop-1/parentSecrets'].b.pinPlain as string;
    expect((await custom({ studentId: 'b', pin: binhPin })).statusCode).toBe(403);
    // PIN của em A không mở được dữ liệu em B.
    expect((await custom({ studentId: 'b', pin: '2580' })).statusCode).toBe(401);
  });
});

describe('sửa lỗi sau đợt QA 06–07/10', () => {
  const custom = (extra: DocData = {}) => call({ action: 'parentCustomReport', idToken: undefined, joinCode: 'ABCD23', studentId: 'a', from: '2026-09-01', to: '2026-09-30', ...extra });
  const parentCall = (extra: DocData) => call({ idToken: undefined, joinCode: 'ABCD23', ...extra });
  const graded = (score: number) => ({ score, maxScore: 10, feedback: '', strengths: [], weaknesses: [], teacherApproved: true, gradedAt: '2026-09-20T01:00:00Z' });
  const onboard = async (studentId = 'a') => {
    const rows = (await call({ action: 'issueParentPins', classId: 'lop-1' })).payload.rows as Array<{ studentId: string; pin: string }>;
    const pin = rows.find(r => r.studentId === studentId)!.pin;
    await parentCall({ action: 'changeParentPin', studentId, pin, newPin: '2580' });
    return '2580';
  };

  it('ngày không có thật (tháng 13, 30/02) bị từ chối 400 TRƯỚC khi tải dữ liệu; một ngày không có so sánh "nửa đầu/nửa sau" ngược', async () => {
    const pin = await onboard();
    for (const bad of [{ from: '2026-13-45' }, { to: '2026-02-30' }, { from: '2026-00-10' }]) {
      expect((await custom({ pin, ...bad })).statusCode).toBe(400);
    }
    h.store.assignments = { b1: { teacherId: 'gv-cuong', classId: 'lop-1', title: 'Hàm số', type: 'homework', dueAt: '2026-09-19T10:00:00Z', maxScore: 10, createdAt: '2026-09-10T00:00:00Z' } };
    h.store.submissions = { s1: { teacherId: 'gv-cuong', classId: 'lop-1', studentId: 'a', assignmentId: 'b1', status: 'graded', createdAt: '2026-09-19T01:00:00Z', grade: graded(8) } };
    const oneDay = await custom({ pin, from: '2026-09-19', to: '2026-09-19' });
    expect(oneDay.statusCode).toBe(200);
    expect(oneDay.payload.input.comparison ?? null).toBeNull();
    expect(oneDay.payload.input.period).toMatchObject({ kind: 'custom', title: 'Báo cáo học tập từ 19/09/2026 đến 19/09/2026' });
  });

  it('năng lực lọc theo học kì mà khoảng ngày chạm tới: khoảng tháng 9 không liệt kê năng lực của học kì II (mẫu số theo HK I)', async () => {
    h.store.classes['lop-1'].grade = '10';
    h.store.assignments = { b1: { teacherId: 'gv-cuong', classId: 'lop-1', title: 'Hàm số bậc hai', type: 'homework', dueAt: '2026-09-15T10:00:00Z', maxScore: 10, createdAt: '2026-09-10T00:00:00Z', competencyTags: [{ competencyId: 'g10-ham-so-bac-hai' }], competencyTagsApproved: true } };
    h.store.submissions = { s1: { teacherId: 'gv-cuong', classId: 'lop-1', studentId: 'a', assignmentId: 'b1', status: 'graded', createdAt: '2026-09-16T01:00:00Z', grade: graded(8) } };
    const pin = await onboard();
    const sept = (await custom({ pin })).payload.input.competency;
    ageCache(10_000);
    const whole = (await custom({ pin, from: '2026-09-01', to: '2027-05-31' })).payload.input.competency;
    expect(sept.total).toBeLessThan(whole.total);
    expect(sept.items.map((i: any) => i.topic)).not.toContain('Hàm số bậc hai');
  });

  it('bài giao riêng cho nhóm khác (targetStudentIds) không bị tính "chưa nộp" cho em không thuộc nhóm', async () => {
    h.store.assignments = {
      b1: { teacherId: 'gv-cuong', classId: 'lop-1', title: 'Bài cả lớp', type: 'homework', dueAt: '2026-09-15T10:00:00Z', maxScore: 10, createdAt: '2026-09-10T00:00:00Z' },
      b2: { teacherId: 'gv-cuong', classId: 'lop-1', title: 'Bài nhóm B', type: 'homework', dueAt: '2026-09-15T10:00:00Z', maxScore: 10, createdAt: '2026-09-10T00:00:00Z', targetStudentIds: ['b'] },
    };
    h.store.submissions = {};
    const pin = await onboard();
    const titles = (await custom({ pin })).payload.input.report.results.map((r: any) => r.title);
    expect(titles).toEqual(['Bài cả lớp']);
  });

  it('nhận diện trường: chỉ giữ chữ + logo ảnh an toàn; lưu ở tài liệu nhỏ, lần sau không quét báo cáo đã công bố; không chép trường lạ', async () => {
    const pin = await onboard();
    await call({ ...PUBLISH, reports: [{ studentId: 'a', input: { ...INPUT('An'), branding: { schoolName: ' Trường A ', teacherName: 'Thầy B', logoDataUrl: 'javascript:alert(1)', evil: '<script>' } } }] });
    expect(h.store['classes/lop-1/parentConfig'].branding).toMatchObject({ schoolName: 'Trường A', teacherName: 'Thầy B' });
    expect(h.store['classes/lop-1/parentConfig'].branding).not.toHaveProperty('logoDataUrl');
    expect(h.store['classes/lop-1/parentConfig'].branding).not.toHaveProperty('evil');
    h.store['classes/lop-1/parentReports'] = {};
    expect((await custom({ pin })).payload.input.branding).toEqual({ schoolName: 'Trường A', teacherName: 'Thầy B' });
  });

  it('báo cáo đã công bố: kì MỚI NHẤT (theo ngày kết thúc) hiện đầu, dù kì cũ vừa được công bố lại', async () => {
    const pin = await onboard();
    await call({ ...PUBLISH, from: '2026-10-01', to: '2026-10-31', reports: [{ studentId: 'a', input: INPUT('An') }] });
    await call({ ...PUBLISH, reports: [{ studentId: 'a', input: INPUT('An') }] }); // công bố lại tháng 9 SAU tháng 10
    const res = await parentCall({ action: 'parentReports', studentId: 'a', pin });
    expect(res.payload.reports.map((r: any) => r.to)).toEqual(['2026-10-31', '2026-09-30']);
  });

  it('thu hồi học sinh / cả lớp gỡ luôn PIN đọc được, thống kê, dòng thời gian, báo cáo đã công bố; tạo lại cùng mã không "sống lại"', async () => {
    const pin = await onboard();
    await call({ ...PUBLISH, reports: [{ studentId: 'a', input: INPUT('An') }, { studentId: 'b', input: INPUT('Bình') }] });
    await parentCall({ action: 'parentReports', studentId: 'a', pin });
    expect(Object.keys(h.store['classes/lop-1/parentStats/a/events'] ?? {}).length).toBeGreaterThan(0);

    expect((await call({ action: 'revokeStudentAccess', classId: 'lop-1', studentId: 'a' })).statusCode).toBe(200);
    expect(h.store['classes/lop-1/parentSecrets'].a).toBeUndefined();
    expect(h.store['classes/lop-1/parentStats'].a).toBeUndefined();
    expect(Object.keys(h.store['classes/lop-1/parentStats/a/events'] ?? {})).toEqual([]);
    expect(Object.values(h.store['classes/lop-1/parentReports']).every((r: any) => r.studentId !== 'a')).toBe(true);
    expect(h.store['classes/lop-1/parentSecrets'].b).toBeDefined();
    h.store['classes/lop-1/students'].a = { name: 'An' };
    expect((await parentCall({ action: 'parentReports', studentId: 'a', pin })).statusCode).toBe(409);

    expect((await call({ action: 'revokeClass', classId: 'lop-1' })).statusCode).toBe(200);
    for (const sub of ['parentSecrets', 'parentReports', 'parentStats', 'parentConfig']) expect(Object.keys(h.store[`classes/lop-1/${sub}`] ?? {})).toEqual([]);
  });
});

describe('báo cáo tự chọn: bộ nhớ đệm + giới hạn tần suất', () => {
  const custom = (extra: DocData = {}) => call({ action: 'parentCustomReport', idToken: undefined, joinCode: 'ABCD23', studentId: 'a', from: '2026-09-01', to: '2026-09-30', pin: '2580', ...extra });
  const graded = (approvalSource: string) => ({ score: 8, maxScore: 10, feedback: '', strengths: [], weaknesses: [], teacherApproved: true, approvalSource, gradedAt: '2026-09-20T01:00:00Z' });
  const seed = (approvalSource = 'teacher') => {
    h.store.assignments = { b1: { teacherId: 'gv-cuong', classId: 'lop-1', title: 'Hàm số', type: 'homework', dueAt: '2026-09-15T10:00:00Z', maxScore: 10, createdAt: '2026-09-10T00:00:00Z' } };
    h.store.submissions = { s1: { teacherId: 'gv-cuong', classId: 'lop-1', studentId: 'a', assignmentId: 'b1', status: 'graded', createdAt: '2026-09-16T01:00:00Z', grade: graded(approvalSource) } };
  };
  beforeEach(async () => {
    const rows = (await call({ action: 'issueParentPins', classId: 'lop-1' })).payload.rows as Array<{ studentId: string; pin: string }>;
    await call({ action: 'changeParentPin', idToken: undefined, joinCode: 'ABCD23', studentId: 'a', pin: rows.find(r => r.studentId === 'a')!.pin, newPin: '2580' });
  });

  it('cùng khoảng ngày xem lại trong 5 phút → trả bản đã dựng (không đọc lại dữ liệu); quá 5 phút → dựng lại thấy dữ liệu mới', async () => {
    seed();
    const first = await custom();
    expect(first.payload.input.report.results[0]).toMatchObject({ status: 'official', score: 8 });
    expect(h.store['classes/lop-1/parentCache'].a).toMatchObject({ from: '2026-09-01', to: '2026-09-30' });
    h.store.submissions.s1.grade.score = 3; // dữ liệu đổi sau khi đã dựng
    const again = await custom();
    expect(again.statusCode).toBe(200);
    expect(again.payload.input.report.results[0].score).toBe(8); // vẫn là bản đệm
    ageCache(6 * 60_000);
    expect((await custom()).payload.input.report.results[0].score).toBe(3);
  });

  it('khoảng KHÁC bấm liên tiếp trong vài giây → 429 (chặn bấm liên tục); sau vài giây thì cho', async () => {
    seed();
    expect((await custom()).statusCode).toBe(200);
    const fast = await custom({ from: '2026-08-01', to: '2026-08-31' });
    expect(fast.statusCode).toBe(429);
    expect(fast.payload.error).toContain('đợi vài giây');
    ageCache(10_000);
    expect((await custom({ from: '2026-08-01', to: '2026-08-31' })).statusCode).toBe(200);
  });

  it('thu hồi học sinh gỡ luôn bản đệm báo cáo tự chọn', async () => {
    seed();
    await custom();
    expect(h.store['classes/lop-1/parentCache'].a).toBeDefined();
    await call({ action: 'revokeStudentAccess', classId: 'lop-1', studentId: 'a' });
    expect(h.store['classes/lop-1/parentCache'].a).toBeUndefined();
  });
});

describe('mã lớp bị dùng chung bởi hai lớp: từ chối, không đoán', () => {
  beforeEach(() => {
    h.store.classes['lop-gia'] = { name: 'Lớp trùng mã', teacherId: 'gv-khac', joinCode: 'ABCD23' };
  });

  it('roster (cổng học sinh) và cổng phụ huynh trả 409 kèm lời nhắn báo thầy cô; mã duy nhất thì vẫn vào', async () => {
    const roster = await call({ action: 'roster', idToken: undefined, joinCode: 'ABCD23' });
    expect(roster.statusCode).toBe(409);
    expect(roster.payload.error).toContain('trùng');
    const parent = await call({ action: 'parentReports', idToken: undefined, joinCode: 'ABCD23', studentId: 'a', pin: '2580' });
    expect(parent.statusCode).toBe(409);
    expect(parent.payload.error).toContain('trùng');
    const student = await call({ action: 'login', idToken: 't', joinCode: 'ABCD23', studentId: 'a', pin: '1234' });
    expect(student.statusCode).toBe(409);

    delete h.store.classes['lop-gia'];
    expect((await call({ action: 'roster', idToken: undefined, joinCode: 'ABCD23' })).statusCode).toBe(200);
  });
});

