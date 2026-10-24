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

// Khoá dùng chung mọi lần `getAdminDb()` (mỗi lần gọi tạo một fakeDb mới nhưng Firestore thật chỉ có một).
let lock: Promise<unknown> = Promise.resolve();

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
  // Giao dịch chạy NỐI TIẾP nhau (mô phỏng tính tuần tự của Firestore transaction): đọc-rồi-ghi của lượt này không bị lượt khác chen vào.
  const runTransaction = <T,>(work: (tx: { get: (ref: any) => Promise<any>; set: (ref: any, data: DocData, opts?: { merge?: boolean }) => void }) => Promise<T>): Promise<T> => {
    const run = lock.then(async () => {
      const writes: Array<() => Promise<unknown>> = [];
      const result = await work({ get: ref => ref.get(), set: (ref, data, opts) => { writes.push(() => ref.set(data, opts)); } });
      for (const write of writes) await write();
      return result;
    });
    lock = run.catch(() => undefined);
    return run;
  };
  return {
    runTransaction,
    collection: (col: string) => ({ ...query(col, []), doc: (id: string) => docRef(`${col}/${id}`), add: async (d: DocData) => { h.store[`${col}/auto${Object.keys(h.store).length}`] = d; } }),
  };
};

vi.mock('../_exam-core.js', () => ({ getAdminDb: () => fakeDb() }));

import { handleAiRelay } from '../_ai-relay-handler';
import { RELAY_MAX_DURATION_S, RELAY_MODELS, RELAY_VENDOR_MODELS, enabledRelayVendors, parseRelayBody } from '../_ai-relay-core';
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

const vilaoOk = (text = 'Giáo án mẫu', finishReason = 'stop', usage = { prompt_tokens: 1_000_000, completion_tokens: 0, total_tokens: 1_000_000 }) =>
  vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text }, finish_reason: finishReason }], usage }) }));

describe('relay Gemini cho ví web — kiểm đầu vào', () => {
  it('chỉ nhận model đã có giá (model chưa có giá sẽ bị tính 0đ = tặng miễn phí)', () => {
for (const model of RELAY_MODELS) expect(priceFor(`vilao/${model}`, today), model).not.toBeNull();
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
    process.env.GRADING_VILAO_API_KEY = OWNER_KEY;
    delete process.env.AI_RELAY_DAILY_LIMIT;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GRADING_VILAO_API_KEY;
  });

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

it('đầu vào sai thì 400, không gọi Vilao', async () => {
    const fetchMock = vilaoOk();
    vi.stubGlobal('fetch', fetchMock);
    expect((await call({ prompt: '', model: 'gemini-3.8-flash' })).statusCode).toBe(400);
    expect((await call({ prompt: 'x', model: 'gemini-9' })).statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

    it('chưa bật kiểm soát: chạy bằng khoá chung, chuyển đúng chỉ dẫn + ảnh sang Vilao, ghi lượt "aiRelay" cho giáo viên', async () => {
    const fetchMock = vilaoOk('Giáo án Toán 10');
    vi.stubGlobal('fetch', fetchMock);
    const res = await call({ prompt: 'Soạn bài mệnh đề', system: 'Bạn là trợ lý soạn bài.', images: [IMG] });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ text: 'Giáo án Toán 10', model: 'gemini-3.8-flash', truncated: false });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.vilao.ai/v1/chat/completions');
    expect(init.headers.authorization).toBe(`Bearer ${OWNER_KEY}`);
    const sent = JSON.parse(init.body);
    expect(sent.messages[0]).toEqual({ role: 'system', content: 'Bạn là trợ lý soạn bài.' });
    expect(sent.messages[1].content).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgo=' } },
      { type: 'text', text: 'Soạn bài mệnh đề' },
    ]);
    expect(sent.max_tokens).toBe(16_000);
    const usage = Object.entries(h.store).find(([p]) => p.startsWith('aiUsage/'))?.[1];
    expect(usage).toMatchObject({ feature: 'aiRelay', keyOwnerUid: 'gv-1', keySource: 'shared', provider: 'vilao', model: 'vilao/gemini-3.8-flash' });
  });

  it('đã bật kiểm soát + đã đồng ý + chọn "chỉ ví web": dùng khoá chung dù có khoá riêng, TRỪ VÍ đúng giá, cộng "hôm nay"', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: [], exemptUids: [] };
    h.store['adminSettings/billing'] = { usdVnd: 26_000 };
    h.store['aiWallets/gv-1'] = { balanceVnd: 50_000 };
    h.store['teacherAiKeys/gv-1'] = { geminiKey: OWN_KEY, keyStatus: 'ok', consent: { accepted: true }, mode: 'wallet' };
        const fetchMock = vilaoOk();
    vi.stubGlobal('fetch', fetchMock);

    const res = await call({ prompt: 'Soạn bài' });
    expect(res.statusCode).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://api.vilao.ai/v1/chat/completions');
    expect(init.headers.authorization).toBe(`Bearer ${OWNER_KEY}`); // không phải khoá riêng
    // 1.000.000 token vào × (400/26190) USD × 26.000 VND ≈ 397đ
    expect(h.store['aiWallets/gv-1'].balanceVnd).toBe(49_603);
    const usage = Object.entries(h.store).find(([p]) => p.startsWith('aiUsage/'))?.[1];
    expect(usage).toMatchObject({ keySource: 'owner_consent', chargeVnd: 397, feature: 'aiRelay' });
    const month = today.slice(0, 7);
    expect(h.store[`aiSpend/gv-1_${month}`].days[today]).toMatchObject({ calls: 1, chargeVnd: 397 });
  });

  it('chưa có khoá và chưa đồng ý tính phí: 402 AI_KEY_REQUIRED, không gọi Vilao, không tốn hạn mức ngày', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: [], exemptUids: [] };
    const fetchMock = vilaoOk();
    vi.stubGlobal('fetch', fetchMock);
    const res = await call({ prompt: 'Soạn bài' });
    expect(res.statusCode).toBe(402);
    expect(res.payload).toMatchObject({ code: 'AI_KEY_REQUIRED', reason: 'no_key' });
    expect(fetchMock).not.toHaveBeenCalled();
    // Đã giữ chỗ rồi hoàn lại: hạn mức ngày không bị tính, không còn lượt "đang chạy"
    expect(h.store['aiRelayQuota/gv-1']).toMatchObject({ count: 0, inflight: 0 });
  });

  it('hết số dư: 402 no_balance', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: ['gv-1'], exemptUids: [] };
    h.store['aiWallets/gv-1'] = { balanceVnd: 0 };
vi.stubGlobal('fetch', vilaoOk());
    const res = await call({ prompt: 'Soạn bài' });
    expect(res.statusCode).toBe(402);
    expect(res.payload).toMatchObject({ reason: 'no_balance' });
  });

  it('bị cắt vì hết trần token thì trả phần đã có kèm cờ truncated để trình duyệt tự viết tiếp', async () => {
    vi.stubGlobal('fetch', vilaoOk('Phần đầu của giáo án…', 'length'));
    const res = await call({ prompt: 'Soạn bài dài' });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ text: 'Phần đầu của giáo án…', model: 'gemini-3.8-flash', truncated: true });
  });

  it('AI từ chối hoặc không trả chữ: 422 với câu giải thích, không giả vờ thành công', async () => {
    vi.stubGlobal('fetch', vilaoOk('', 'content_filter'));
    const blocked = await call({ prompt: 'x' });
    expect(blocked.statusCode).toBe(422);
    expect(String(blocked.payload.error)).toContain('từ chối');
    vi.stubGlobal('fetch', vilaoOk('', 'stop'));
    expect((await call({ prompt: 'x' })).statusCode).toBe(422);
  });

  it('Google lỗi thì 502 kèm mã HTTP, vẫn tính vào hạn mức ngày (lượt đã gọi)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, clone: () => ({ text: async () => 'overloaded' }) })));
    const res = await call({ prompt: 'x' });
    expect(res.statusCode).toBe(502);
    expect(String(res.payload.error)).toContain('503');
    expect(h.store['aiRelayQuota/gv-1']).toMatchObject({ day: today, count: 1, inflight: 0 });
  });

  it('hạn mức lượt mỗi ngày: đủ thì 429, sang ngày mới thì về 0', async () => {
    process.env.AI_RELAY_DAILY_LIMIT = '2';
    const fetchMock = vilaoOk();
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

  it('QA F2: ba lượt cùng lúc khi chỉ còn 1 lượt/ngày → đúng MỘT lượt gọi Vilao, hai lượt kia 429', async () => {
    process.env.AI_RELAY_DAILY_LIMIT = '1';
    const fetchMock = vilaoOk();
    vi.stubGlobal('fetch', fetchMock);
    const results = await Promise.all([call({ prompt: 'a' }), call({ prompt: 'b' }), call({ prompt: 'c' })]);
    expect(results.map(r => r.statusCode).sort()).toEqual([200, 429, 429]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(h.store['aiRelayQuota/gv-1']).toMatchObject({ day: today, count: 1, inflight: 0 });
  });

  it('giới hạn số lượt chạy CÙNG LÚC (chặn ví âm sâu): 5 lượt song song chỉ 3 lượt được chạy, xong thì chỗ được trả', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const fetchMock = vi.fn(async () => {
      await gate;
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const running = Array.from({ length: 5 }, (_, i) => call({ prompt: `p${i}` }));
    await vi.waitFor(() => expect(h.store['aiRelayQuota/gv-1']?.inflight).toBe(3));
    release();
    const results = await Promise.all(running);
    expect(results.map(r => r.statusCode).sort()).toEqual([200, 200, 200, 429, 429]);
    expect(results.find(r => r.statusCode === 429)?.payload.error).toContain('cùng lúc');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(h.store['aiRelayQuota/gv-1'].inflight).toBe(0);
    expect((await call({ prompt: 'sau đó' })).statusCode).toBe(200);
  });

  it('lượt "đang chạy" bị treo quá lâu (hàm bị giết) thì hết hiệu lực, không khoá giáo viên mãi', async () => {
    h.store['aiRelayQuota/gv-1'] = { day: today, count: 5, inflight: 3, inflightAt: Date.now() - 20 * 60_000 };
vi.stubGlobal('fetch', vilaoOk());
    expect((await call({ prompt: 'x' })).statusCode).toBe(200);
    expect(h.store['aiRelayQuota/gv-1']).toMatchObject({ count: 6, inflight: 0 });
  });
});

describe('relay cho Claude / ChatGPT (ví web trả cho hãng khác Gemini)', () => {
  const ANTHROPIC_KEY = 'sk-ant-OWNER';
  const OPENAI_KEY = 'sk-OWNER-OPENAI';
  const anthropicOk = (text = 'Xin chào', stop = 'end_turn', usage: Record<string, number> = { input_tokens: 500_000, output_tokens: 0 }) =>
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: text ? [{ type: 'text', text }] : [], stop_reason: stop, usage }) }));
  const openaiOk = (text = 'Xin chào', finish = 'stop', usage: Record<string, number> = { prompt_tokens: 1_000_000, completion_tokens: 0, total_tokens: 1_000_000 }) =>
    vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text }, finish_reason: finish }], usage }) }));
  const wallet = (mode: string, extra: DocData = {}) => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: [], exemptUids: [] };
    h.store['adminSettings/billing'] = { usdVnd: 26_000 };
    h.store['aiWallets/gv-1'] = { balanceVnd: 50_000 };
    h.store['teacherAiKeys/gv-1'] = { consent: { accepted: true }, mode, ...extra };
  };

  beforeEach(() => {
    h.store = {};
    h.verifyFails = false;
    h.claims = { uid: 'gv-1', email: 'gv1@x.vn', firebase: { sign_in_provider: 'google.com' } };
    process.env.GRADING_GEMINI_API_KEY = OWNER_KEY;
    process.env.ANTHROPIC_API_KEY = ANTHROPIC_KEY;
    process.env.OPENAI_API_KEY = OPENAI_KEY;
    delete process.env.AI_RELAY_DAILY_LIMIT;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it('kiểm đầu vào: model phải thuộc đúng hãng và có giá; hãng lạ bị từ chối; vắng provider = Gemini như cũ', () => {
    for (const [vendor, models] of Object.entries(RELAY_VENDOR_MODELS)) {
      for (const model of models) {
        expect(priceFor(model, today), model).not.toBeNull();
        expect(parseRelayBody({ provider: vendor, model, prompt: 'x' })).toMatchObject({ ok: true, value: { provider: vendor, model } });
      }
    }
    expect(parseRelayBody({ provider: 'claude', prompt: 'x' })).toMatchObject({ ok: true, value: { provider: 'claude', model: 'claude-sonnet-5-5' } });
    expect(parseRelayBody({ provider: 'openai', prompt: 'x' })).toMatchObject({ ok: true, value: { provider: 'openai', model: 'gpt-6.1-sol' } });
    expect(parseRelayBody({ provider: 'claude', model: 'gemini-3.8-flash', prompt: 'x' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ provider: 'claude', model: 'claude-fable-5-1', prompt: 'x' })).toMatchObject({ ok: false, status: 400 }); // đắt nhất: cố ý chưa nhận
    expect(parseRelayBody({ provider: 'grok', model: 'grok-4', prompt: 'x' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRelayBody({ prompt: 'x' })).toMatchObject({ ok: true, value: { provider: 'gemini' } });
  });

  it('chỉ hãng đã đặt khoá trên máy chủ mới được bật', () => {
    expect(enabledRelayVendors({ ANTHROPIC_API_KEY: ' k ' } as never)).toEqual(['claude']);
    expect(enabledRelayVendors({ OPENAI_API_KEY: 'k', ANTHROPIC_API_KEY: '' } as never)).toEqual(['openai']);
    expect(enabledRelayVendors({} as never)).toEqual([]);
  });

  it('chưa đặt khoá của hãng trên máy chủ: 503, không gọi hãng, không tốn hạn mức ngày', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const fetchMock = anthropicOk();
    vi.stubGlobal('fetch', fetchMock);
    const res = await call({ provider: 'claude', prompt: 'x' });
    expect(res.statusCode).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.store['aiRelayQuota/gv-1']).toBeUndefined();
  });

  it('Claude: gọi đúng API Anthropic bằng KHOÁ MÁY CHỦ (không phải khoá Gemini riêng), chuyển chỉ dẫn + ảnh, TRỪ VÍ đúng giá, ghi lượt provider "claude"', async () => {
    wallet('both', { geminiKey: OWN_KEY, keyStatus: 'ok' }); // có khoá Gemini riêng nhưng nó không dùng được cho Claude
    const fetchMock = anthropicOk('Giáo án Toán');
    vi.stubGlobal('fetch', fetchMock);

    const res = await call({ provider: 'claude', model: 'claude-sonnet-5-5', prompt: 'Soạn bài', system: 'Trợ lý soạn bài', images: [IMG] });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ text: 'Giáo án Toán', model: 'claude-sonnet-5-5', truncated: false });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe(ANTHROPIC_KEY);
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ model: 'claude-sonnet-5-5', max_tokens: 16_000, system: 'Trợ lý soạn bài' });
    expect(sent.messages[0].content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } },
      { type: 'text', text: 'Soạn bài' },
    ]);
    // 500.000 token vào × $2/1M × 26.000 = 26.000đ
    expect(h.store['aiWallets/gv-1']).toMatchObject({ balanceVnd: 24_000 });
    expect(h.store['aiWallets/gv-1'].heldVnd ?? 0).toBe(0);
    const usage = Object.entries(h.store).find(([path]) => path.startsWith('aiUsage/'))?.[1];
    expect(usage).toMatchObject({ provider: 'claude', model: 'claude-sonnet-5-5', keySource: 'owner_consent', chargeVnd: 26_000, feature: 'aiRelay' });
  });

  it('Claude bị cắt vì hết trần đầu ra → truncated để trình duyệt tự viết tiếp; hãng từ chối → 422', async () => {
    vi.stubGlobal('fetch', anthropicOk('Phần đầu…', 'max_tokens'));
    expect((await call({ provider: 'claude', prompt: 'x' })).payload).toMatchObject({ truncated: true });
    vi.stubGlobal('fetch', anthropicOk('', 'refusal'));
    expect((await call({ provider: 'claude', prompt: 'x' })).statusCode).toBe(422);
  });

  it('ChatGPT: gọi đúng API OpenAI, token vào/ra tính theo bảng giá, finish "length" → truncated', async () => {
    wallet('wallet');
    const fetchMock = openaiOk('Đề kiểm tra', 'length');
    vi.stubGlobal('fetch', fetchMock);
    const res = await call({ provider: 'openai', model: 'gpt-6-luna', prompt: 'Ra đề', system: 'Trợ lý ra đề' });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({ text: 'Đề kiểm tra', model: 'gpt-6-luna', truncated: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.headers.authorization).toBe(`Bearer ${OPENAI_KEY}`);
    const sent = JSON.parse(init.body);
    expect(sent).toMatchObject({ model: 'gpt-6-luna', max_completion_tokens: 16_384 });
    expect(sent.messages[0]).toEqual({ role: 'system', content: 'Trợ lý ra đề' });
    // 1.000.000 token vào × $0,1/1M × 26.000 = 2.600đ
    expect(h.store['aiWallets/gv-1']).toMatchObject({ balanceVnd: 47_400 });
    const usage = Object.entries(h.store).find(([path]) => path.startsWith('aiUsage/'))?.[1];
    expect(usage).toMatchObject({ provider: 'openai', chargeVnd: 2_600 });
  });

  it('chế độ "chỉ khoá riêng" thì ví không trả cho hãng khác: 402, không gọi hãng; chưa đồng ý tính phí cũng 402', async () => {
    wallet('own');
    const fetchMock = anthropicOk();
    vi.stubGlobal('fetch', fetchMock);
    expect((await call({ provider: 'claude', prompt: 'x' })).statusCode).toBe(402);
    h.store['teacherAiKeys/gv-1'] = { mode: 'wallet' }; // chưa đồng ý
    expect((await call({ provider: 'claude', prompt: 'x' })).statusCode).toBe(402);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(h.store['aiRelayQuota/gv-1']).toMatchObject({ count: 0, inflight: 0 });
  });

  it('hết số dư: 402 no_balance, không gọi hãng', async () => {
    wallet('wallet');
    h.store['aiWallets/gv-1'] = { balanceVnd: 0 };
    const fetchMock = openaiOk();
    vi.stubGlobal('fetch', fetchMock);
    const res = await call({ provider: 'openai', prompt: 'x' });
    expect(res.statusCode).toBe(402);
    expect(res.payload).toMatchObject({ reason: 'no_balance' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('hãng lỗi (529 quá tải): 502 kèm mã, ví không đổi và phần giữ chỗ được TRẢ LẠI', async () => {
    wallet('wallet');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 529 })));
    const res = await call({ provider: 'claude', prompt: 'x' });
    expect(res.statusCode).toBe(502);
    expect(String(res.payload.error)).toContain('529');
    expect(h.store['aiWallets/gv-1']).toMatchObject({ balanceVnd: 50_000, heldVnd: 0 });
    expect(Object.keys(h.store).filter(path => path.startsWith('aiUsage/'))).toEqual([]);
  });

  it('chủ dự án (miễn ví) dùng khoá máy chủ không bị trừ ví', async () => {
    h.store['adminSettings/aiAccess'] = { enabled: true, sharedUids: [], exemptUids: ['gv-1'] };
    h.store['teacherAiKeys/gv-1'] = { consent: { accepted: true }, mode: 'wallet' };
    h.store['aiWallets/gv-1'] = { balanceVnd: 0 };
    vi.stubGlobal('fetch', anthropicOk());
    const res = await call({ provider: 'claude', prompt: 'x' });
    expect(res.statusCode).toBe(200);
    expect(h.store['aiWallets/gv-1'].balanceVnd).toBe(0);
  });
});

describe('mức suy nghĩ qua relay — mỗi mức là tham số thật gửi cho hãng', () => {
  const claudeOk = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 10, output_tokens: 10 } }) }));
  const openaiOk = vi.fn(async (..._args: unknown[]) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }) }));
  const sentBody = (mock: { mock: { calls: unknown[][] } }): any => JSON.parse(((mock.mock.calls.at(-1) as unknown[])[1] as { body: string }).body);

  beforeEach(() => {
    h.store = {};
    h.verifyFails = false;
    h.claims = { uid: 'gv-1', email: 'gv1@x.vn', firebase: { sign_in_provider: 'google.com' } };
    process.env.GRADING_GEMINI_API_KEY = OWNER_KEY;
    process.env.GRADING_VILAO_API_KEY = OWNER_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-OWNER';
    process.env.OPENAI_API_KEY = 'sk-OWNER-OPENAI';
    claudeOk.mockClear();
    openaiOk.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GRADING_VILAO_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it('Vilao (provider gemini): chỉ gửi reasoning_effort cho "none" và "low"; mức khác bị bỏ, không chọn thì không gửi', async () => {
    const fetchMock = vilaoOk();
    vi.stubGlobal('fetch', fetchMock);
    const efforts: Array<string | undefined> = [];
    for (const effort of ['none', 'low', 'medium', 'high', undefined]) {
      expect((await call({ prompt: 'x', model: 'gemini-3.8-flash', ...(effort ? { effort } : {}) })).statusCode).toBe(200);
      efforts.push(sentBody(fetchMock).reasoning_effort);
    }
    expect(efforts).toEqual([undefined, 'low', undefined, undefined, undefined]);
  });

  it('Vilao (provider gemini): mức model không nhận (3.8 Flash không có "minimal") bị bỏ, lượt vẫn chạy bình thường; model không tồn tại bị 400', async () => {
    const fetchMock = vilaoOk();
    vi.stubGlobal('fetch', fetchMock);
    expect((await call({ prompt: 'x', model: 'gemini-3.8-flash', effort: 'minimal' })).statusCode).toBe(200);
    expect(sentBody(fetchMock).reasoning_effort).toBeUndefined();
    expect((await call({ prompt: 'x', model: 'gemini-4-argon', effort: 'high' })).statusCode).toBe(400);
  });

  it('Claude: đủ 5 mức vào output_config.effort; Haiku 4.5 không nhận nên không gửi', async () => {
    vi.stubGlobal('fetch', claudeOk);
    const seen: Array<string | undefined> = [];
    for (const effort of ['low', 'medium', 'high', 'xhigh', 'max']) {
      expect((await call({ provider: 'claude', model: 'claude-opus-5-5', prompt: 'x', effort })).statusCode).toBe(200);
      seen.push(sentBody(claudeOk).output_config?.effort);
    }
    expect(seen).toEqual(['low', 'medium', 'high', 'xhigh', 'max']);
    await call({ provider: 'claude', model: 'claude-haiku-4-5-20251001', prompt: 'x', effort: 'high' });
    expect(sentBody(claudeOk).output_config).toBeUndefined();
    await call({ provider: 'claude', model: 'claude-sonnet-5-5', prompt: 'x' });
    expect(sentBody(claudeOk).output_config).toBeUndefined();
  });

  it('ChatGPT: mức vào reasoning_effort đúng theo từng model (Luna nhận "none", Sol thì không)', async () => {
    vi.stubGlobal('fetch', openaiOk);
    await call({ provider: 'openai', model: 'gpt-6-luna', prompt: 'x', effort: 'none' });
    expect(sentBody(openaiOk).reasoning_effort).toBe('none');
    await call({ provider: 'openai', model: 'gpt-6.1-sol', prompt: 'x', effort: 'none' });
    expect(sentBody(openaiOk).reasoning_effort).toBeUndefined();
    await call({ provider: 'openai', model: 'gpt-6.1-sol', prompt: 'x', effort: 'max' });
    expect(sentBody(openaiOk).reasoning_effort).toBe('max');
    await call({ provider: 'openai', model: 'gpt-6-astra', prompt: 'x', effort: 'minimal' });
    expect(sentBody(openaiOk).reasoning_effort).toBe('minimal');
  });

  it('thân request sai kiểu mức (số, mảng…) thì bỏ qua, không làm hỏng lượt', () => {
    expect(parseRelayBody({ prompt: 'x', effort: 5 })).toMatchObject({ ok: true });
    expect((parseRelayBody({ prompt: 'x', effort: ['high'] }) as any).value.effort).toBeUndefined();
  });
});
