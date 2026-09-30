import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DocData = Record<string, any>;

const h = vi.hoisted(() => ({
  store: {} as Record<string, DocData>,
  claims: {} as Record<string, unknown>,
  verifyFails: false,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => {
      if (h.verifyFails) throw new Error('bad token');
      return h.claims;
    },
  }),
}));

vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: (n: number) => ({ __inc: n }) } }));

const applyMerge = (current: DocData, patch: DocData): DocData => {
  const next = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && '__inc' in v) next[k] = (Number(current[k]) || 0) + v.__inc;
    else if (v && typeof v === 'object' && !Array.isArray(v)) next[k] = applyMerge(current[k] && typeof current[k] === 'object' ? current[k] : {}, v);
    else next[k] = v;
  }
  return next;
};

const fakeDb = () => {
  const docRef = (path: string): any => ({
    id: path.split('/').pop(),
    get: async () => ({ exists: h.store[path] !== undefined, id: path.split('/').pop(), data: () => (h.store[path] ? { ...h.store[path] } : undefined) }),
    set: async (data: DocData, opts?: { merge?: boolean }) => { h.store[path] = opts?.merge ? applyMerge(h.store[path] ?? {}, data) : applyMerge({}, data); },
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

import { handleAiRelay } from '../_ai-relay-handler';
import { RELAY_MAX_DURATION_S, RELAY_MODELS, parseRelayBody } from '../_ai-relay-core';
import { priceFor } from '../../src/lib/admin/aiPricing';

const OWNER_KEY = 'OWNER-KEY';
const OWN_KEY = 'AIza' + 'b'.repeat(35);
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
const IMG = 'data:image/png;base64,iVBORw0KGgo=';

const call = async (body: unknown, opts: { method?: string; token?: string | null } = {}) => {
  const res: any = {
    statusCode: 0, payload: null, headers: {} as Record<string, string>,
    status(c: number) { res.statusCode = c; return res; },
    json(p: unknown) { res.payload = p; return res; },
    setHeader(k: string, v: string) { res.headers[k] = v; },
  };
  const token = opts.token === undefined ? 't' : opts.token;
  await handleAiRelay({ method: opts.method ?? 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body } as never, res);
  return res;
};

const geminiOk = (text = 'Giáo án mẫu', finishReason = 'STOP', usage = { promptTokenCount: 1_000_000, candidatesTokenCount: 0, totalTokenCount: 1_000_000 }) =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason, content: { parts: text ? [{ text }] : [] } }], usageMetadata: usage }) }));

describe('relay Gemini cho ví web — kiểm đầu vào', () => {
  it('chỉ nhận model đã có giá (model chưa có giá sẽ bị tính 0đ = tặng miễn phí)', () => {
    for (const model of RELAY_MODELS) expect(priceFor(model, today), model).not.toBeNull();
    expect(parseRelayBody({ prompt: 'x', model: 'gemini-3.5-flash' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ prompt: 'x', model: 'gpt-6-luna' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ prompt: 'x' })).toMatchObject({ ok: true, value: { model: 'gemini-3.8-flash', images: [] } });
  });

  it('lời nhắc, chỉ dẫn, ảnh phải hợp lệ; ảnh chỉ nhận data URL PNG/JPEG/WebP/GIF và có trần dung lượng', () => {
    expect(parseRelayBody({ prompt: '   ' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ prompt: 'x', system: 'a'.repeat(8_001) })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ prompt: 'x', images: ['https://evil.example/x.png'] })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ prompt: 'x', images: ['data:application/pdf;base64,AAAA'] })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ prompt: 'x', images: Array(9).fill(IMG) })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ prompt: 'x', images: [`data:image/png;base64,${'A'.repeat(3_700_000)}`] })).toMatchObject({ ok: false, status: 413 });
    expect(parseRelayBody({ prompt: 'x', images: [IMG] })).toMatchObject({ ok: true, value: { images: [{ mimeType: 'image/png', data: 'iVBORw0KGgo=' }] } });
  });

  it('thời gian tối đa khai ở vercel.json khớp hằng số trong mã (hai nơi lệch nhau là hàm bị cắt giữa chừng)', () => {
    const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as { functions: Record<string, { maxDuration: number }> };
    expect(config.functions['api/ai-relay.ts'].maxDuration).toBe(RELAY_MAX_DURATION_S);
  });
});

describe('relay Gemini cho ví web — máy chủ', () => {
  beforeEach(() => {
    h.store = {};
    h.verifyFails = false;
    h.claims = { uid: 'gv-1', email: 'gv1@x.vn', firebase: { sign_in_provider: 'google.com' } };
    process.env.GRADING_GEMINI_API_KEY = OWNER_KEY;
    delete process.env.AI_RELAY_DAILY_LIMIT;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('chỉ nhận POST, phải đăng nhập, và học sinh (ẩn danh) không được dùng', async () => {
    expect((await call({ prompt: 'x' }, { method: 'GET' })).statusCode).toBe(405);
    expect((await call({ prompt: 'x' }, { token: null })).statusCode).toBe(401);
    h.verifyFails = true;
    expect((await call({ prompt: 'x' })).statusCode).toBe(401);
    h.verifyFails = false;
    h.claims = { uid: 'hs', firebase: { sign_in_provider: 'anonymous' } };
    expect((await call({ prompt: 'x' })).statusCode).toBe(403);
    expect((await call({ prompt: 'x', model: 'khong-co' })).statusCode).toBe(403); // ẩn danh bị chặn trước cả kiểm đầu vào
  });

  it('đầu vào sai thì 400, không gọi Google', async () => {
    const fetchMock = geminiOk();
    vi.stubGlobal('fetch', fetchMock);
    expect((await call({ prompt: '', model: 'gemini-3.8-flash' })).statusCode).toBe(400);
    expect((await call({ prompt: 'x', model: 'gemini-9' })).statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('chưa bật kiểm soát: chạy bằng khoá chung, chuyển đúng chỉ dẫn + ảnh sang Google, ghi lượt "aiRelay" cho giáo viên', async () => {
    const fetchMock = geminiOk('Giáo án Toán 10');
    vi.stubGlobal('fetch', fetchMock);
    const res = await call({ prompt: 'Soạn bài mệnh đề', system: 'Bạn là trợ lý soạn bài.', images: [IMG] });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ text: 'Giáo án Toán 10', model: 'gemini-3.8-flash', truncated: false });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toContain('models/gemini-3.8-flash:generateContent');
    expect(url).toContain(OWNER_KEY);
    const sent = JSON.parse(init.body);
    expect(sent.systemInstruction).toEqual({ parts: [{ text: 'Bạn là trợ lý soạn bài.' }] });
    expect(sent.contents[0].parts).toEqual([{ text: 'Soạn bài mệnh đề' }, { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgo=' } }]);
    expect(sent.generationConfig).toMatchObject({ temperature: 0.1, maxOutputTokens: 65_536 });
    const usage = Object.entries(h.store).find(([p]) => p.startsWith('aiUsage/'))?.[1];
    expect(usage).toMatchObject({ feature: 'aiRelay', keyOwnerUid: 'gv-1', keySource: 'shared', model: 'gemini-3.8-flash' });
  });

  it('đã bật kiểm soát + đã đồng ý + chọn "chỉ ví web": dùng khoá chung dù có khoá riêng, TRỪ VÍ đúng giá, cộng "hôm nay"', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: [], exemptUids: [] };
    h.store['adminSettings/billing'] = { usdVnd: 26_000 };
    h.store['aiWallets/gv-1'] = { balanceVnd: 50_000 };
    h.store['teacherAiKeys/gv-1'] = { geminiKey: OWN_KEY, keyStatus: 'ok', consent: { accepted: true }, mode: 'wallet' };
    const fetchMock = geminiOk();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call({ prompt: 'Soạn bài' });
    expect(res.statusCode).toBe(200);
    expect(String(fetchMock.mock.calls[0][0])).toContain(OWNER_KEY); // không phải khoá riêng
    // 1.000.000 token vào × $0,75/1M × 26.000 = 19.500đ
    expect(h.store['aiWallets/gv-1'].balanceVnd).toBe(30_500);
    const usage = Object.entries(h.store).find(([p]) => p.startsWith('aiUsage/'))?.[1];
    expect(usage).toMatchObject({ keySource: 'owner_consent', chargeVnd: 19_500, feature: 'aiRelay' });
    const month = today.slice(0, 7);
    expect(h.store[`aiSpend/gv-1_${month}`].days[today]).toMatchObject({ calls: 1, chargeVnd: 19_500 });
  });

  it('chưa có khoá và chưa đồng ý tính phí: 402 AI_KEY_REQUIRED, không gọi Google, không tốn hạn mức ngày', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: [], exemptUids: [] };
    const fetchMock = geminiOk();
    vi.stubGlobal('fetch', fetchMock);
    const res = await call({ prompt: 'Soạn bài' });
    expect(res.statusCode).toBe(402);
    expect(res.payload).toMatchObject({ code: 'AI_KEY_REQUIRED', reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.store['aiRelayQuota/gv-1']).toBeUndefined();
  });

  it('hết số dư: 402 no_balance', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: ['gv-1'], exemptUids: [] };
    h.store['aiWallets/gv-1'] = { balanceVnd: 0 };
    vi.stubGlobal('fetch', geminiOk());
    const res = await call({ prompt: 'Soạn bài' });
    expect(res.statusCode).toBe(402);
    expect(res.payload).toMatchObject({ reason: 'no_balance' });
  });

  it('bị cắt vì hết trần token thì trả phần đã có kèm cờ truncated để trình duyệt tự viết tiếp', async () => {
    vi.stubGlobal('fetch', geminiOk('Phần đầu của giáo án…', 'MAX_TOKENS'));
    const res = await call({ prompt: 'Soạn bài dài' });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ text: 'Phần đầu của giáo án…', model: 'gemini-3.8-flash', truncated: true });
  });

  it('AI từ chối hoặc không trả chữ: 422 với câu giải thích, không giả vờ thành công', async () => {
    vi.stubGlobal('fetch', geminiOk('', 'SAFETY'));
    const blocked = await call({ prompt: 'x' });
    expect(blocked.statusCode).toBe(422);
    expect(String(blocked.payload.error)).toContain('từ chối');
    vi.stubGlobal('fetch', geminiOk('', 'STOP'));
    expect((await call({ prompt: 'x' })).statusCode).toBe(422);
  });

  it('Google lỗi thì 502 kèm mã HTTP, vẫn tính vào hạn mức ngày (lượt đã gọi)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, clone: () => ({ text: async () => 'overloaded' }) })));
    const res = await call({ prompt: 'x' });
    expect(res.statusCode).toBe(502);
    expect(String(res.payload.error)).toContain('503');
    expect(h.store['aiRelayQuota/gv-1']).toMatchObject({ day: today, count: 1 });
  });

  it('hạn mức lượt mỗi ngày: đủ thì 429, sang ngày mới thì về 0', async () => {
    process.env.AI_RELAY_DAILY_LIMIT = '2';
    const fetchMock = geminiOk();
    vi.stubGlobal('fetch', fetchMock);
    expect((await call({ prompt: 'a' })).statusCode).toBe(200);
    expect((await call({ prompt: 'b' })).statusCode).toBe(200);
    expect(h.store['aiRelayQuota/gv-1']).toMatchObject({ day: today, count: 2 });
    const third = await call({ prompt: 'c' });
    expect(third.statusCode).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    h.store['aiRelayQuota/gv-1'] = { day: '2000-01-01', count: 2 };
    expect((await call({ prompt: 'd' })).statusCode).toBe(200);
    expect(h.store['aiRelayQuota/gv-1']).toMatchObject({ day: today, count: 1 });
  });
});
