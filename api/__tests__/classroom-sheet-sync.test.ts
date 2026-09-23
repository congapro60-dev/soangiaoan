import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Máy chủ chỉ LƯU tab Google Sheet đã nối cho lớp. Đọc và ghi sheet chạy bằng quyền Google của
 * chính giáo viên trong trình duyệt, nên ở đây chỉ cần giữ: đúng người, đúng lớp, dữ liệu hợp lệ.
 */

const h = vi.hoisted(() => ({ uid: 'owner-1', db: null as unknown }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => ({ uid: h.uid, email: `${h.uid}@example.com` }),
    // identityFromIdToken gọi thêm getUser; thiếu hàm này là mọi request thành 401.
    getUser: async (uid: string) => ({ uid, email: `${uid}@example.com` }),
  }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ file: () => ({ delete: async () => undefined }) }),
}));

import handler from '../classroom';

type DocData = Record<string, unknown>;

const makeDb = (store: Record<string, Record<string, DocData>>) => {
  const makeCollection = (name: string): Record<string, unknown> => {
    const ensure = () => { store[name] ||= {}; return store[name]; };
    const makeQuery = (constraints: Array<{ field: string; value: unknown }>) => ({
      where: (field: string, _op: string, value: unknown) => makeQuery([...constraints, { field, value }]),
      get: async () => {
        const docs = Object.entries(ensure())
          .filter(([, value]) => constraints.every(item => value[item.field] === item.value))
          .map(([id, value]) => ({ id, data: () => ({ ...value }) }));
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    });
    return {
      doc: (id: string) => ({
        id,
        get: async () => ({ exists: ensure()[id] !== undefined, data: () => (ensure()[id] ? { ...ensure()[id] } : undefined) }),
        set: async (payload: DocData) => { ensure()[id] = { ...payload }; },
        update: async (payload: DocData) => { ensure()[id] = { ...ensure()[id], ...payload }; },
        collection: (sub: string) => makeCollection(`${name}/${id}/${sub}`),
      }),
      where: (field: string, _op: string, value: unknown) => makeQuery([{ field, value }]),
      get: async () => makeQuery([]).get(),
    };
  };
  return { collection: makeCollection };
};

const call = async (body: DocData) => {
  const res = {
    statusCode: 0,
    payload: null as DocData | null,
    status(code: number) { res.statusCode = code; return res; },
    json(payload: DocData) { res.payload = payload; return res; },
  };
  await handler({ method: 'POST', body: { idToken: 'token', ...body } } as never, res as never);
  return res;
};

const validSheet = {
  spreadsheetId: '1INWzPGXY158_iyEZLWVpK3qNzTyiO6sISu67afRGbig',
  spreadsheetTitle: '11 Columbus | Quản lý lớp 2026–2027',
  sheetId: 559729920,
  sheetTitle: '02. BTVN',
};

describe('setClassSheetSync', () => {
  let store: Record<string, Record<string, DocData>>;

  beforeEach(() => {
    h.uid = 'owner-1';
    store = { classes: { 'lop-1': { teacherId: 'owner-1', name: '11 Columbus' } } };
    h.db = makeDb(store);
  });

  it('chủ lớp nối được tab, lưu kèm người nối và thời điểm', async () => {
    const res = await call({ action: 'setClassSheetSync', classId: 'lop-1', sheetSync: validSheet });

    expect(res.statusCode).toBe(200);
    expect(store.classes['lop-1'].sheetSync).toMatchObject({ ...validSheet, linkedBy: 'owner-1' });
    expect(typeof (store.classes['lop-1'].sheetSync as DocData).linkedAt).toBe('string');
  });

  it('giáo viên ngoài lớp không nối được', async () => {
    h.uid = 'nguoi-khac';

    const res = await call({ action: 'setClassSheetSync', classId: 'lop-1', sheetSync: validSheet });

    expect(res.statusCode).toBe(403);
    expect(store.classes['lop-1'].sheetSync).toBeUndefined();
  });

  it('mã file hoặc tab không hợp lệ thì từ chối, không lưu gì', async () => {
    const res = await call({ action: 'setClassSheetSync', classId: 'lop-1', sheetSync: { ...validSheet, spreadsheetId: 'ngan' } });
    const resTab = await call({ action: 'setClassSheetSync', classId: 'lop-1', sheetSync: { ...validSheet, sheetId: -1 } });

    expect(res.statusCode).toBe(422);
    expect(resTab.statusCode).toBe(422);
    expect(store.classes['lop-1'].sheetSync).toBeUndefined();
  });

  it('bỏ nối thì xoá cấu hình', async () => {
    await call({ action: 'setClassSheetSync', classId: 'lop-1', sheetSync: validSheet });

    const res = await call({ action: 'setClassSheetSync', classId: 'lop-1', sheetSync: null });

    expect(res.statusCode).toBe(200);
    expect(store.classes['lop-1'].sheetSync).toBeNull();
  });

  it('danh sách lớp trả cấu hình đã nối về cho giao diện', async () => {
    await call({ action: 'setClassSheetSync', classId: 'lop-1', sheetSync: validSheet });

    const res = await call({ action: 'listAccessibleClasses' });

    const classes = res.payload?.classes as DocData[];
    expect(classes[0].sheetSync).toMatchObject(validSheet);
  });
});

describe('setClassExamSheet (file điểm thi, tách khỏi file BTVN)', () => {
  let store: Record<string, Record<string, DocData>>;
  const examSheet = { spreadsheetId: '1W-gEc8_UW1Y7ktmsNm15IW0R7hNvkXbpGb_JHupAy4o', spreadsheetTitle: '26-27-12 VN Toán 1-Vũ Việt Cường' };

  beforeEach(() => {
    h.uid = 'owner-1';
    store = { classes: { 'lop-1': { teacherId: 'owner-1', name: '12LoTrinh1', sheetSync: validSheet } } };
    h.db = makeDb(store);
  });

  it('lưu file điểm riêng, không đụng cấu hình đồng bộ BTVN', async () => {
    const res = await call({ action: 'setClassExamSheet', classId: 'lop-1', examSheet });

    expect(res.statusCode).toBe(200);
    expect(store.classes['lop-1'].examSheet).toMatchObject({ ...examSheet, linkedBy: 'owner-1' });
    expect(store.classes['lop-1'].sheetSync).toMatchObject(validSheet);
  });

  it('giáo viên ngoài lớp không nối được; mã file sai bị từ chối', async () => {
    const bad = await call({ action: 'setClassExamSheet', classId: 'lop-1', examSheet: { ...examSheet, spreadsheetId: 'ngan' } });
    h.uid = 'nguoi-khac';
    const other = await call({ action: 'setClassExamSheet', classId: 'lop-1', examSheet });

    expect(bad.statusCode).toBe(422);
    expect(other.statusCode).toBe(403);
    expect(store.classes['lop-1'].examSheet).toBeUndefined();
  });

  it('bỏ nối thì xoá; danh sách lớp trả file điểm về giao diện', async () => {
    await call({ action: 'setClassExamSheet', classId: 'lop-1', examSheet });
    const list = await call({ action: 'listAccessibleClasses' });
    expect((list.payload?.classes as DocData[])[0].examSheet).toMatchObject(examSheet);

    await call({ action: 'setClassExamSheet', classId: 'lop-1', examSheet: null });
    expect(store.classes['lop-1'].examSheet).toBeNull();
  });
});
