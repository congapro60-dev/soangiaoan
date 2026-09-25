import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DocData = Record<string, any>;

const h = vi.hoisted(() => ({
  store: {} as Record<string, DocData>,
  claims: {} as Record<string, unknown>,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => h.claims,
    getUserByEmail: async (email: string) => {
      if (email === 'co.lan@truong.vn') return { uid: 'gv-lan' };
      throw new Error('not found');
    },
  }),
}));

vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: (n: number) => ({ __inc: n }) } }));

const applyMerge = (current: DocData, patch: DocData): DocData => {
  const next = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    next[k] = v && typeof v === 'object' && '__inc' in v ? (Number(current[k]) || 0) + v.__inc : v;
  }
  return next;
};

const fakeDb = () => {
  const docRef = (path: string): any => ({
    id: path.split('/').pop(),
    get: async () => ({ exists: h.store[path] !== undefined, id: path.split('/').pop(), data: () => (h.store[path] ? { ...h.store[path] } : undefined) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => { h.store[path] = opts?.merge ? applyMerge(h.store[path] ?? {}, data) : applyMerge({}, data); },
    update: async (data: DocData) => { h.store[path] = applyMerge(h.store[path] ?? {}, data); },
  });
  const query = (col: string, filters: Array<[string, unknown]>): any => ({
    where: (f: string, _op: string, v: unknown) => query(col, [...filters, [f, v]]),
    get: async () => {
      const docs = Object.keys(h.store)
        .filter(p => p.startsWith(`${col}/`) && p.split('/').length === 2)
        .filter(p => filters.every(([f, v]) => h.store[p][f] === v))
        .map(p => ({ id: p.split('/')[1], data: () => ({ ...h.store[p] }) }));
      return { docs, empty: docs.length === 0 };
    },
  });
  return {
    collection: (col: string) => ({ ...query(col, []), doc: (id: string) => docRef(`${col}/${id}`), add: async (d: DocData) => { h.store[`${col}/auto${Object.keys(h.store).length}`] = d; } }),
  };
};

vi.mock('../_exam-core.js', () => ({ getAdminDb: () => fakeDb() }));

import { createAiUsageContext, runWithAiUsage, setAiKeyOwner } from '../_ai-usage';
import { AiKeyRequiredError, ensureGeminiKey, handleAiKeyAction } from '../_ai-keys';
import { callGeminiVision } from '../_grading-core';

const OWNER_KEY = 'OWNER-KEY';
const OWN_KEY = 'AIza' + 'b'.repeat(35);
const inRequest = <T>(owner: string, fn: () => Promise<T>) => {
  const ctx = createAiUsageContext('t', 'gradeOne', {}, async () => ({ uid: owner, email: `${owner}@x.vn`, anonymous: false }));
  return runWithAiUsage(ctx, async () => { setAiKeyOwner(owner); return fn(); });
};

const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0, 7);

describe('khoá AI + trần chi tiêu', () => {
  beforeEach(() => {
    h.store = {};
    h.claims = { uid: 'gv-ngoai', email: 'ngoai@x.vn', firebase: { sign_in_provider: 'google.com' } };
  });
  afterEach(() => vi.unstubAllGlobals());

  it('chưa bật kiểm soát: ai cũng dùng khoá chung như cũ, vẫn biết người chịu phí', async () => {
    const choice = await inRequest('gv-ngoai', () => ensureGeminiKey(OWNER_KEY));
    expect(choice).toEqual({ key: OWNER_KEY, source: 'shared', ownerUid: 'gv-ngoai', billing: null });
  });

  it('bật kiểm soát: nhóm dùng khoá chung; người ngoài dùng khoá riêng; không khoá + chưa đồng ý thì chặn', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: ['gv-nhom'], exemptUids: [] };
    h.store['aiWallets/gv-nhom'] = { balanceVnd: 10_000 };
    expect((await inRequest('gv-nhom', () => ensureGeminiKey(OWNER_KEY))).source).toBe('shared');
    await expect(inRequest('gv-ngoai', () => ensureGeminiKey(OWNER_KEY))).rejects.toMatchObject({ reason: 'no_key' });
    h.store['teacherAiKeys/gv-ngoai'] = { geminiKey: OWN_KEY, keyStatus: 'ok' };
    expect(await inRequest('gv-ngoai', () => ensureGeminiKey(OWNER_KEY))).toMatchObject({ key: OWN_KEY, source: 'own' });
  });

  it('chạm trần tự đặt thì dừng (kể cả khi chưa bật kiểm soát)', async () => {
    h.store['adminSettings/billing'] = { usdVnd: 26_000 };
    h.store['teacherAiKeys/gv-nhom'] = { monthlyCapVnd: 20_000 };
    h.store[`aiSpend/gv-nhom_${month}`] = { costUsd: 0.5, calls: 10 };
    expect((await inRequest('gv-nhom', () => ensureGeminiKey(OWNER_KEY))).source).toBe('shared');
    h.store[`aiSpend/gv-nhom_${month}`] = { costUsd: 1, calls: 20 };
    const error = await inRequest('gv-nhom', () => ensureGeminiKey(OWNER_KEY)).catch(e => e);
    expect(error).toBeInstanceOf(AiKeyRequiredError);
    expect(error.reason).toBe('cap_reached');
  });

  it('khoá riêng bị Google báo hết hạn mức: đã đồng ý thì tự chuyển khoá chung (tính phí, cộng sổ); chưa thì chặn', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: [], exemptUids: [] };
    h.store['adminSettings/billing'] = { usdVnd: 26_000 };
    h.store['teacherAiKeys/gv-ngoai'] = { geminiKey: OWN_KEY, keyStatus: 'ok', consent: { accepted: true } };
    h.store['aiWallets/gv-ngoai'] = { balanceVnd: 50_000 };
    const fetchMock = vi.fn(async (url: string) => (String(url).includes(encodeURIComponent(OWN_KEY))
      ? { ok: false, status: 429, clone: () => ({ text: async () => 'RESOURCE_EXHAUSTED' }) }
      : { ok: true, status: 200, json: async () => ({
        candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'đã chấm' }] } }],
        usageMetadata: { promptTokenCount: 1_000_000, candidatesTokenCount: 0, totalTokenCount: 1_000_000 },
      }) }));
    vi.stubGlobal('fetch', fetchMock);

    const text = await inRequest('gv-ngoai', () => callGeminiVision('chấm', [], OWNER_KEY, 'gemini-3.8-flash'));
    expect(text).toBe('đã chấm');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(h.store['teacherAiKeys/gv-ngoai']).toMatchObject({ keyStatus: 'exhausted' });
    const usage = Object.entries(h.store).find(([p]) => p.startsWith('aiUsage/'))?.[1];
    // 1.000.000 token vào × $0.75/1M × 26.000 = 19.500đ, không mã giảm giá → trừ đủ
    expect(usage).toMatchObject({ keySource: 'owner_consent', keyOwnerUid: 'gv-ngoai', usdVnd: 26_000, grossVnd: 19_500, discountPct: 0, chargeVnd: 19_500 });
    expect(h.store['aiWallets/gv-ngoai'].balanceVnd).toBe(30_500);
    expect(h.store[`aiSpend/gv-ngoai_${month}`]).toMatchObject({ calls: 1 });
    expect(h.store[`aiSpend/gv-ngoai_${month}`].costUsd).toBeCloseTo(0.75, 6);

    // Chưa đồng ý: khoá "hết" đang trong thời gian nghỉ → chặn ngay, không gọi Google
    h.store['teacherAiKeys/gv-ngoai'].consent = { accepted: false };
    fetchMock.mockClear();
    await expect(inRequest('gv-ngoai', () => callGeminiVision('chấm', [], OWNER_KEY))).rejects.toMatchObject({ reason: 'exhausted' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ví: hết số dư thì chặn; mã 100% đang hiệu lực thì dùng miễn phí (0đ); chủ dự án được miễn', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: ['gv-nhom', 'chu'], exemptUids: ['chu'] };
    h.store['aiWallets/gv-nhom'] = { balanceVnd: 0 };
    await expect(inRequest('gv-nhom', () => ensureGeminiKey(OWNER_KEY))).rejects.toMatchObject({ reason: 'no_balance' });
    expect(await inRequest('chu', () => ensureGeminiKey(OWNER_KEY))).toMatchObject({ source: 'shared', billing: null });

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    h.store['aiVoucherRedemptions/gv-nhom_MIENPHI'] = { uid: 'gv-nhom', code: 'MIENPHI', percent: 100, validFrom: today, validTo: today };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'ok' }] } }],
      usageMetadata: { promptTokenCount: 1_000_000, candidatesTokenCount: 0, totalTokenCount: 1_000_000 },
    }) })));
    await inRequest('gv-nhom', () => callGeminiVision('chấm', [], OWNER_KEY, 'gemini-3.8-flash'));
    const usage = Object.entries(h.store).find(([p]) => p.startsWith('aiUsage/'))?.[1];
    expect(usage).toMatchObject({ discountPct: 100, voucherCode: 'MIENPHI', chargeVnd: 0 });
    expect(usage?.grossVnd).toBeGreaterThan(0);
    expect(h.store['aiWallets/gv-nhom'].balanceVnd).toBe(0);
  });

  it('lượt dùng khoá riêng KHÔNG cộng vào sổ chi tiêu', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: [] };
    h.store['teacherAiKeys/gv-ngoai'] = { geminiKey: OWN_KEY, keyStatus: 'ok' };
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'ok' }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10, totalTokenCount: 110 },
    }) })));
    await inRequest('gv-ngoai', () => callGeminiVision('chấm', [], OWNER_KEY));
    expect(Object.values(h.store).find(d => d.keySource)?.keySource).toBe('own');
    expect(h.store[`aiSpend/gv-ngoai_${month}`]).toBeUndefined();
  });

  it('API giáo viên: lưu khoá (sai dạng / Google từ chối / hợp lệ), đặt trần, đồng ý; không bao giờ trả khoá', async () => {
    const call = async (body: DocData) => {
      const res: any = { statusCode: 0, payload: null, status(c: number) { res.statusCode = c; return res; }, json(p: any) { res.payload = p; return res; } };
      await handleAiKeyAction(fakeDb() as never, { idToken: 't', ...body }, res);
      return res;
    };
    expect((await call({ action: 'saveAiKey', key: 'sk-123' })).statusCode).toBe(422);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 400 })));
    expect((await call({ action: 'saveAiKey', key: OWN_KEY })).statusCode).toBe(422);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })));
    const saved = await call({ action: 'saveAiKey', key: OWN_KEY });
    expect(saved.statusCode).toBe(200);
    expect(JSON.stringify(saved.payload)).not.toContain(OWN_KEY);
    expect(saved.payload).toMatchObject({ hasKey: true, last4: 'bbbb', keyStatus: 'ok', capVnd: null, spentVnd: 0 });

    expect((await call({ action: 'setAiSpendCap', capVnd: -5 })).statusCode).toBe(422);
    expect((await call({ action: 'setAiSpendCap', capVnd: 200_000 })).payload).toMatchObject({ capVnd: 200_000 });
    expect((await call({ action: 'setAiSpendCap', capVnd: null })).payload).toMatchObject({ capVnd: null });
    expect((await call({ action: 'setAiConsent', accepted: true })).payload).toMatchObject({ consent: true });

    h.claims = { uid: 'hs', firebase: { sign_in_provider: 'anonymous' } };
    expect((await call({ action: 'aiKeyStatus' })).statusCode).toBe(401);
  });
});
