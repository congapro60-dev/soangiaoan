import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

type DocData = Record<string, any>;

const h = vi.hoisted(() => {
  const bucket = {
    name: 'demo.appspot.com',
    saved: [] as Array<{ path: string; metadata: any }>,
    deleted: [] as string[],
    file: (path: string) => ({
      save: async (_bytes: Buffer, opts: any) => { bucket.saved.push({ path, metadata: opts.metadata }); },
      delete: async () => { bucket.deleted.push(path); },
    }),
  };
  return { store: {} as Record<string, DocData>, seq: 0, bucket };
});

vi.mock('../_exam-core.js', () => ({ getAdminStorage: () => h.bucket }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUserByEmail: async (email: string) => {
      if (email === 'co.hanh@truong.vn') return { uid: 'gv-hanh' };
      throw new Error('not found');
    },
    getUser: async (uid: string) => ({ uid, email: `${uid}@x.vn` }),
  }),
}));

vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: (n: number) => ({ __inc: n }) } }));

const applyMerge = (current: DocData, patch: DocData): DocData => {
  const next = { ...current };
  for (const [k, v] of Object.entries(patch)) next[k] = v && typeof v === 'object' && '__inc' in v ? (Number(current[k]) || 0) + v.__inc : v;
  return next;
};

const fakeDb = (): any => {
  const docRef = (path: string): any => ({
    id: path.split('/').pop(),
    path,
    get: async () => ({ exists: h.store[path] !== undefined, id: path.split('/').pop(), data: () => (h.store[path] ? { ...h.store[path] } : undefined) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => { h.store[path] = opts?.merge ? applyMerge(h.store[path] ?? {}, data) : applyMerge({}, data); },
    update: async (data: DocData) => { h.store[path] = applyMerge(h.store[path] ?? {}, data); },
    create: async (data: DocData) => {
      if (h.store[path]) throw new Error('ALREADY_EXISTS');
      h.store[path] = data;
    },
  });
  const query = (col: string, filters: Array<[string, unknown]>): any => ({
    where: (f: string, _op: string, v: unknown) => query(col, [...filters, [f, v]]),
    get: async () => {
      const docs = Object.keys(h.store)
        .filter(p => p.startsWith(`${col}/`) && p.split('/').length === 2 && filters.every(([f, v]) => h.store[p][f] === v))
        .map(p => ({ id: p.split('/')[1], data: () => ({ ...h.store[p] }) }));
      return { docs, empty: docs.length === 0 };
    },
  });
  return {
    collection: (col: string) => ({ ...query(col, []), doc: (id: string) => docRef(`${col}/${id}`), add: async (d: DocData) => { h.store[`${col}/auto${(h.seq += 1)}`] = d; } }),
    doc: (path: string) => docRef(path),
    getAll: async (...refs: any[]) => Promise.all(refs.map(r => r.get())),
    runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
      const writes: Array<() => Promise<void>> = [];
      const result = await fn({
        get: (ref: any) => ref.get(),
        set: (ref: any, data: DocData, opts?: { merge?: boolean }) => writes.push(() => ref.set(data, opts)),
        update: (ref: any, data: DocData) => writes.push(() => ref.update(data)),
      });
      for (const write of writes) await write();
      return result;
    },
  };
};

import { adminWalletAction, handleSepayWebhook, loadPaymentAccount, redeemVoucher } from '../_ai-wallet';
import { statementFor } from '../_ai-billing';

const webhook = async (body: DocData, auth = 'Apikey bi-mat') => {
  const res: any = { statusCode: 0, payload: null, status(c: number) { res.statusCode = c; return res; }, json(p: any) { res.payload = p; return res; } };
  await handleSepayWebhook(fakeDb(), { headers: { authorization: auth }, body } as never, res);
  return res;
};

const giaoDich = (id: number, amount: number, content: string) => ({
  id, gateway: 'Vietcombank', transactionDate: '2026-10-05 09:12:00', accountNumber: '0123456789', code: null,
  content, transferType: 'in', transferAmount: amount, accumulated: 0, referenceCode: `FT${id}`, description: content,
});

describe('ví AI trả trước', () => {
  beforeEach(() => {
    h.store = { 'aiWallets/gv-lan': { uid: 'gv-lan', topupCode: 'SPAI7K2QX9', balanceVnd: 0 } };
    process.env.SEPAY_WEBHOOK_KEY = 'bi-mat';
  });
  afterEach(() => { delete process.env.SEPAY_WEBHOOK_KEY; });

  it('webhook: chưa cấu hình khoá thì từ chối; sai khoá 401; tiền ra thì bỏ qua', async () => {
    delete process.env.SEPAY_WEBHOOK_KEY;
    expect((await webhook(giaoDich(1, 100_000, 'SPAI7K2QX9'))).statusCode).toBe(503);
    process.env.SEPAY_WEBHOOK_KEY = 'bi-mat';
    expect((await webhook(giaoDich(1, 100_000, 'SPAI7K2QX9'), 'Apikey sai')).statusCode).toBe(401);
    const out = await webhook({ ...giaoDich(2, 50_000, 'SPAI7K2QX9'), transferType: 'out' });
    expect(out.payload).toMatchObject({ success: true, ignored: true });
    expect(h.store['aiWallets/gv-lan'].balanceVnd).toBe(0);
  });

  it('webhook: cộng đúng ví theo mã trong nội dung; SePay gửi lại cùng giao dịch KHÔNG cộng lần hai', async () => {
    const first = await webhook(giaoDich(9001, 100_000, 'LE THI LAN chuyen tien SPAI 7K2QX9 FT26'));
    expect(first.payload).toEqual({ success: true, matched: true });
    await webhook(giaoDich(9001, 100_000, 'LE THI LAN chuyen tien SPAI 7K2QX9 FT26'));
    expect(h.store['aiWallets/gv-lan'].balanceVnd).toBe(100_000);
    expect(h.store['aiTopups/9001']).toMatchObject({ uid: 'gv-lan', amountVnd: 100_000, referenceCode: 'FT9001', gateway: 'Vietcombank' });
  });

  it('webhook: không đọc được mã → vào hàng chờ, chủ dự án gán tay thì mới cộng ví', async () => {
    const res = await webhook(giaoDich(9002, 200_000, 'chuyen tien AI'));
    expect(res.payload).toEqual({ success: true, matched: false });
    expect(h.store['aiTopupsUnmatched/9002']).toMatchObject({ amountVnd: 200_000 });
    const assigned = await adminWalletAction(fakeDb(), 'adminAssignUnmatchedTopup', { id: '9002', uid: 'gv-lan' }, 'chu');
    expect(assigned?.payload).toMatchObject({ credited: true });
    expect(h.store['aiWallets/gv-lan'].balanceVnd).toBe(200_000);
    expect(h.store['aiTopupsUnmatched/9002']).toMatchObject({ assignedTo: 'gv-lan' });
  });

  it('mã giảm giá: chủ dự án tạo + gán cho cô; mã sai % bị từ chối; không dùng hai lần', async () => {
    const bad = await adminWalletAction(fakeDb(), 'adminSaveVoucher', { voucher: { code: 'GIAM5', percent: 5, validFrom: '2026-10-01', validTo: '2026-10-31' } }, 'chu');
    expect(bad?.status).toBe(422);
    const ok = await adminWalletAction(fakeDb(), 'adminSaveVoucher', { voucher: { code: 'thang10', percent: 100, validFrom: '2026-01-01', validTo: '2099-10-31', allowedEmails: ['co.hanh@truong.vn'] } }, 'chu');
    expect(ok?.status).toBe(200);
    expect(h.store['aiVouchers/THANG10']).toMatchObject({ percent: 100, usedCount: 0 });

    const assigned = await adminWalletAction(fakeDb(), 'adminAssignVoucher', { email: 'co.hanh@truong.vn', code: 'THANG10' }, 'chu');
    expect(assigned?.status).toBe(200);
    expect(h.store['aiVoucherRedemptions/gv-hanh_THANG10']).toMatchObject({ percent: 100, assignedBy: 'chu' });
    expect(h.store['aiVouchers/THANG10'].usedCount).toBe(1);
    expect(await redeemVoucher(fakeDb(), 'gv-hanh', 'co.hanh@truong.vn', 'thang10')).toMatchObject({ ok: false });
    expect(await redeemVoucher(fakeDb(), 'gv-lan', 'lan@x.vn', 'THANG10')).toMatchObject({ ok: false });
  });

  it('điều chỉnh tay phải có lý do; sao kê khớp: đầu kỳ + nạp + điều chỉnh − trừ = cuối kỳ', async () => {
    expect((await adminWalletAction(fakeDb(), 'adminAdjustWallet', { uid: 'gv-lan', amountVnd: 5_000, reason: '' }, 'chu'))?.status).toBe(422);
    h.store['aiTopups/1'] = { uid: 'gv-lan', month: '2026-10', amountVnd: 100_000, at: '2026-10-02T01:00:00Z', referenceCode: 'FT1' };
    h.store['aiTopups/2'] = { uid: 'gv-lan', month: '2026-11', amountVnd: 50_000, at: '2026-11-02T01:00:00Z', referenceCode: 'FT2' };
    h.store['aiAdjustments/a'] = { uid: 'gv-lan', month: '2026-10', amountVnd: -2_000, reason: 'Hoàn lượt chấm lỗi', at: '2026-10-20T00:00:00Z' };
    h.store['aiUsage/u1'] = { keyOwnerUid: 'gv-lan', month: '2026-10', at: '2026-10-05T01:00:00Z', feature: 'gradeOne', model: 'gemini-3.8-flash', refs: {}, grossVnd: 1_000, discountPct: 30, voucherCode: 'GIAM30', chargeVnd: 700, usdVnd: 26_000 };
    h.store['aiUsage/u2'] = { keyOwnerUid: 'gv-lan', month: '2026-11', at: '2026-11-05T01:00:00Z', feature: 'practice', model: 'gemini-3.8-flash', refs: {}, grossVnd: 500, discountPct: 0, chargeVnd: 500, usdVnd: 26_000 };
    h.store['aiUsage/u3'] = { keyOwnerUid: 'gv-lan', month: '2026-11', keySource: 'own', feature: 'gradeOne', model: 'x', refs: {} };

    const oct = await statementFor(fakeDb(), 'gv-lan', '2026-10');
    expect(oct).toMatchObject({ openingVnd: 0, topupVnd: 100_000, adjustVnd: -2_000, chargeVnd: 700, closingVnd: 97_300, grossVnd: 1_000, discountVnd: 300 });
    const nov = await statementFor(fakeDb(), 'gv-lan', '2026-11');
    expect(nov).toMatchObject({ openingVnd: 97_300, topupVnd: 50_000, chargeVnd: 500, closingVnd: 146_800, ownKeyCalls: 1 });
    expect((nov.items as unknown[]).length).toBe(1);
  });
});

describe('tài khoản nhận tiền nạp (quản trị)', () => {
  beforeEach(() => {
    h.store = {};
    h.bucket.saved = [];
    h.bucket.deleted = [];
  });
  const pay = async (body: DocData) => (await adminWalletAction(fakeDb(), 'adminPaymentAccount', body, 'chu'))!;
  const PNG = `data:image/png;base64,${Buffer.from('anh-qr').toString('base64')}`;

  it('nhiều tài khoản kèm ảnh QR, chọn tài khoản đang dùng, xoá thì dọn ảnh', async () => {
    const first = await pay({ op: 'save', account: { bank: 'MBBank', accountNumber: '0123 456 789', accountName: 'NGUYEN VAN A' }, qrDataUrl: PNG });
    expect(first.status).toBe(200);
    const a = first.payload.accounts[0];
    expect(a).toMatchObject({ bank: 'MBBank', accountNumber: '0123456789' });
    expect(a.qrImageUrl).toMatch(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/demo\.appspot\.com\/o\/payment-qr%2F.+\.png\?alt=media&token=/);
    expect(h.bucket.saved[0].metadata.metadata.firebaseStorageDownloadTokens).toBeTruthy();
    expect(first.payload.activeId).toBe(a.id);

    const second = await pay({ op: 'save', account: { bank: 'Vietcombank', accountNumber: '9988776655' } });
    expect(second.payload.accounts).toHaveLength(2);
    expect(second.payload.activeId).toBe(a.id);
    const b = second.payload.accounts[1];
    expect((await pay({ op: 'activate', id: b.id })).payload.activeId).toBe(b.id);
    expect(await loadPaymentAccount(fakeDb())).toMatchObject({ bank: 'Vietcombank', accountNumber: '9988776655' });

    expect((await pay({ op: 'save', account: { bank: 'MBBank', accountNumber: '0123456789' } })).status).toBe(422);
    expect((await pay({ op: 'save', account: { bank: 'MBBank', accountNumber: '12ab' } })).status).toBe(422);
    expect((await pay({ op: 'save', account: { bank: 'ACB', accountNumber: '1234567' }, qrDataUrl: 'data:text/html;base64,PGgxPg==' })).status).toBe(422);
    expect(h.bucket.saved).toHaveLength(1);

    expect((await pay({ op: 'delete', id: b.id })).payload.activeId).toBe(a.id);
    await pay({ op: 'delete', id: a.id });
    expect(h.bucket.deleted).toEqual([h.bucket.saved[0].path]);
    expect(await loadPaymentAccount(fakeDb())).toBeNull();
  });

  it('thay ảnh QR thì xoá ảnh cũ; bỏ ảnh thì tài khoản không còn ảnh', async () => {
    const created = await pay({ op: 'save', account: { bank: 'ACB', accountNumber: '1234567' }, qrDataUrl: PNG });
    const id = created.payload.accounts[0].id;
    await pay({ op: 'save', account: { id, bank: 'ACB', accountNumber: '1234567' }, qrDataUrl: PNG });
    expect(h.bucket.deleted).toEqual([h.bucket.saved[0].path]);
    const cleared = await pay({ op: 'save', account: { id, bank: 'ACB', accountNumber: '1234567' }, removeQr: true });
    expect(cleared.payload.accounts[0].qrImageUrl).toBe('');
    expect(h.bucket.deleted).toEqual([h.bucket.saved[0].path, h.bucket.saved[1].path]);
  });
});
