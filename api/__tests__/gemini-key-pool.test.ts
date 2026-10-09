import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Doc = Record<string, unknown>;
const h = vi.hoisted(() => ({ store: {} as Record<string, Record<string, Doc>>, record: vi.fn(async () => undefined) }));

vi.mock('../_exam-core.js', () => ({ getAdminDb: () => fakeDb() }));
vi.mock('../_ai-usage.js', async importOriginal => ({ ...(await importOriginal<typeof import('../_ai-usage.js')>()), recordAiUsage: h.record }));

const fakeDb = () => {
  const docRef = (col: string, id: string) => ({
    get: async () => ({ exists: Boolean(h.store[col]?.[id]), data: () => structuredClone(h.store[col]?.[id]) }),
    set: async (data: Doc) => { (h.store[col] ??= {})[id] = structuredClone(data); },
  });
  return {
    collection: (col: string) => ({ doc: (id: string) => docRef(col, id) }),
    runTransaction: async (work: (tx: { get: (r: { get: () => Promise<unknown> }) => Promise<unknown>; set: (r: { set: (d: Doc) => Promise<void> }, d: Doc) => void }) => Promise<unknown>) => {
      const writes: Array<() => Promise<void>> = [];
      const result = await work({ get: r => r.get(), set: (r, d) => { writes.push(() => r.set(d)); } });
      for (const write of writes) await write();
      return result;
    },
  };
};

import { callGeminiRaw } from '../_grading-core';
import { handleGeminiPoolAdmin, resetGeminiPoolCache } from '../_gemini-key-pool';

const KEY_A = `AIza${'A'.repeat(35)}`;
const KEY_B = `AIza${'B'.repeat(35)}`;
const KEY_P = `AIza${'P'.repeat(35)}`;
const KEY_ENV = `AIza${'E'.repeat(35)}`;
const MODEL = 'gemini-3.8-flash';
const entry = (id: string, key: string, tier: 'free' | 'paid' = 'free') => ({ id, label: id, key, tier, enabled: true });
const seedPool = (...keys: Doc[]) => { h.store.adminSettings = { geminiKeyPool: { keys } }; };
const okBody = { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'xong' }] } }], usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 } };
const keyOf = (call: unknown[]) => new URL(String(call[0])).searchParams.get('key');

describe('danh sách nhiều khoá Gemini — chọn khoá khi gọi', () => {
  beforeEach(() => { h.store = {}; h.record.mockClear(); resetGeminiPoolCache(); vi.spyOn(console, 'info').mockImplementation(() => undefined); vi.spyOn(console, 'error').mockImplementation(() => undefined); });
  afterEach(() => vi.unstubAllGlobals());

  it('khoá free hết hạn mức ngày → cho nghỉ, sang khoá free kế tiếp; lượt sau không thử lại khoá đã nghỉ', async () => {
    seedPool(entry('a', KEY_A), entry('b', KEY_B));
    const fetchMock = vi.fn(async (url: string) => (String(url).includes(KEY_A)
      ? new Response('{"error":{"status":"RESOURCE_EXHAUSTED","details":[{"quotaId":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}}', { status: 429 })
      : new Response(JSON.stringify(okBody), { status: 200 })));
    vi.stubGlobal('fetch', fetchMock);

    const first = await callGeminiRaw('hi', [], KEY_ENV, MODEL);
    expect(first.text).toBe('xong');
    expect(fetchMock.mock.calls.map(keyOf)).toEqual([KEY_A, KEY_B]);
    const saved = (h.store.adminSettings.geminiKeyPool.keys as Array<{ id: string; status?: string; cooldowns?: Record<string, string> }>);
    expect(saved[0]).toMatchObject({ id: 'a', status: 'exhausted' });
    expect(Date.parse(saved[0].cooldowns![MODEL])).toBeGreaterThan(Date.now());
    expect(h.record).toHaveBeenCalledWith('gemini', MODEL, expect.anything(), expect.objectContaining({ poolKey: { id: 'b', tier: 'free' } }));

    fetchMock.mockClear();
    await callGeminiRaw('hi', [], KEY_ENV, MODEL);
    expect(fetchMock.mock.calls.map(keyOf)).toEqual([KEY_B]);
  });

  it('hết free thì sang paid, hết nữa thì lùi về khoá môi trường (chốt cuối), ghi đúng hạng để chủ dự án biết', async () => {
    seedPool(entry('a', KEY_A), entry('p', KEY_P, 'paid'));
    const fetchMock = vi.fn(async (url: string) => (String(url).includes(KEY_ENV)
      ? new Response(JSON.stringify(okBody), { status: 200 })
      : new Response('RESOURCE_EXHAUSTED', { status: 429 })));
    vi.stubGlobal('fetch', fetchMock);
    await callGeminiRaw('hi', [], KEY_ENV, MODEL);
    expect(fetchMock.mock.calls.map(keyOf)).toEqual([KEY_A, KEY_P, KEY_ENV]);
    expect(h.record).toHaveBeenCalledWith('gemini', MODEL, expect.anything(), expect.objectContaining({ poolKey: { tier: 'env' } }));
  });

  it('khoá sai/bị thu hồi bị loại hẳn (status invalid); lỗi KHÔNG do khoá (503, 400 payload) thì không đổi khoá', async () => {
    seedPool(entry('a', KEY_A), entry('b', KEY_B));
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes(KEY_A)
      ? new Response('{"error":{"message":"API key not valid"}}', { status: 400 })
      : new Response(JSON.stringify(okBody), { status: 200 }))));
    await callGeminiRaw('hi', [], KEY_ENV, MODEL);
    expect((h.store.adminSettings.geminiKeyPool.keys as Array<{ status?: string }>)[0].status).toBe('invalid');

    resetGeminiPoolCache();
    seedPool(entry('a', KEY_A), entry('b', KEY_B));
    const down = vi.fn(async () => new Response('overloaded', { status: 503 }));
    vi.stubGlobal('fetch', down);
    await expect(callGeminiRaw('hi', [], KEY_ENV, MODEL)).rejects.toMatchObject({ kind: 'http' });
    expect(down).toHaveBeenCalledTimes(1);
    expect((h.store.adminSettings.geminiKeyPool.keys as Array<{ status?: string }>)[0].status).toBeUndefined();
  });

  it('danh sách trống / đọc hỏng → vẫn chạy bằng khoá môi trường như trước', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(okBody), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await callGeminiRaw('hi', [], KEY_ENV, MODEL);
    expect(fetchMock.mock.calls.map(keyOf)).toEqual([KEY_ENV]);
    resetGeminiPoolCache();
    h.store.adminSettings = { geminiKeyPool: { keys: 'rác' } };
    fetchMock.mockClear();
    await callGeminiRaw('hi', [], KEY_ENV, MODEL);
    expect(fetchMock.mock.calls.map(keyOf)).toEqual([KEY_ENV]);
  });
});

describe('danh sách nhiều khoá Gemini — quản trị', () => {
  beforeEach(() => { h.store = {}; resetGeminiPoolCache(); });
  afterEach(() => vi.unstubAllGlobals());
  const call = (action: string, body: Doc = {}) => handleGeminiPoolAdmin(fakeDb() as never, action, body, MODEL, true);

  it('thêm khoá: kiểm dạng, thử gọi thật một lượt nhỏ, không nhận trùng; danh sách trả về chỉ có 4 ký tự cuối', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(okBody), { status: 200 })));
    expect((await call('adminSaveGeminiKey', { key: 'abc', tier: 'free' }))?.status).toBe(422);
    const added = await call('adminSaveGeminiKey', { key: KEY_A, label: 'TK Pro 1', tier: 'free' });
    expect(added?.status).toBe(200);
    const text = JSON.stringify(added?.payload);
    expect(text).not.toContain(KEY_A);
    expect(added?.payload).toMatchObject({ envKeyConfigured: true, keys: [{ label: 'TK Pro 1', last4: 'AAAA', tier: 'free', enabled: true, status: 'ok' }] });
    expect((await call('adminSaveGeminiKey', { key: KEY_A, tier: 'free' }))?.status).toBe(409);
    expect(JSON.stringify((await call('adminGeminiKeys'))?.payload)).not.toContain(KEY_A);
  });

  it('khoá Google từ chối khi thử thì KHÔNG được lưu; khoá chỉ đang hết hạn mức vẫn nhận', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":{"message":"API key not valid"}}', { status: 400 })));
    const bad = await call('adminSaveGeminiKey', { key: KEY_B, tier: 'free' });
    expect(bad?.status).toBe(422);
    expect(h.store.adminSettings?.geminiKeyPool).toBeUndefined();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('RESOURCE_EXHAUSTED', { status: 429 })));
    expect((await call('adminSaveGeminiKey', { key: KEY_B, tier: 'free' }))?.status).toBe(200);
  });

  it('sửa nhãn/hạng/bật-tắt, bật lại xoá dấu nghỉ, xoá khoá', async () => {
    seedPool({ ...entry('a', KEY_A), status: 'exhausted', cooldowns: { [MODEL]: new Date(Date.now() + 3600_000).toISOString() } });
    const edited = await call('adminSaveGeminiKey', { id: 'a', label: 'Mới', tier: 'paid', enabled: false, clearStatus: true });
    expect(edited?.payload).toMatchObject({ keys: [{ id: 'a', label: 'Mới', tier: 'paid', enabled: false, status: 'ok', cooldowns: {} }] });
    expect((await call('adminSaveGeminiKey', { id: 'zzz', label: 'x' }))?.status).toBe(404);
    expect((await call('adminDeleteGeminiKey', { id: 'a' }))?.payload).toMatchObject({ keys: [] });
    expect(await call('adminKhacHan')).toBeNull();
  });
});
