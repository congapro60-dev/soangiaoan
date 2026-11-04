import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type DocData = Record<string, any>;

const h = vi.hoisted(() => ({
  store: {} as Record<string, DocData>,
  claims: {} as Record<string, unknown>,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => h.claims,
    getUserByEmail: async () => { throw new Error('not found'); },
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

let txLock: Promise<unknown> = Promise.resolve();

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
  const runTransaction = <T>(work: (tx: { get: (ref: any) => Promise<any>; set: (ref: any, data: DocData, opts?: { merge?: boolean }) => void }) => Promise<T>): Promise<T> => {
    const run = txLock.then(async () => {
      const writes: Array<() => Promise<unknown>> = [];
      const result = await work({ get: ref => ref.get(), set: (ref, data, opts) => { writes.push(() => ref.set(data, opts)); } });
      for (const write of writes) await write();
      return result;
    });
    txLock = run.catch(() => undefined);
    return run;
  };
  return {
    runTransaction,
    collection: (col: string) => ({ ...query(col, []), doc: (id: string) => docRef(`${col}/${id}`), add: async (d: DocData) => { h.store[`${col}/auto${Object.keys(h.store).length}`] = d; } }),
  };
};

vi.mock('../_exam-core.js', () => ({ getAdminDb: () => fakeDb() }));

import { createAiUsageContext, runWithAiUsage, setAiKeyOwner } from '../_ai-usage';
import { callGeminiVision, callUtilityVision, GRADING_MODEL, UTILITY_MODEL } from '../_grading-core';

const OWNER_KEY = 'OWNER-KEY';

type RequestBody = { contents?: Array<{ parts?: Array<{ text?: string; inlineData?: { data?: string } }> }> };

const inRequest = <T>(owner: string, fn: () => Promise<T>) => {
  const ctx = createAiUsageContext('t', 'gradeOne', {}, async () => ({ uid: owner, email: `${owner}@x.vn`, anonymous: false }));
  return runWithAiUsage(ctx, async () => { setAiKeyOwner(owner); return fn(); });
};

const okResponse = () => ({
  ok: true,
  status: 200,
  clone: () => ({ text: async () => '' }),
  json: async () => ({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'đã chấm' }] } }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 1, totalTokenCount: 11 },
  }),
});

describe('lượt gọi Gemini: phần cố định đứng trước phần đổi theo học sinh', () => {
  const bodies: RequestBody[] = [];
  const urls: string[] = [];

  beforeEach(() => {
    h.store = {};
    bodies.length = 0;
    urls.length = 0;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('tiền tố (chữ + ảnh đề/đáp án) đứng trước phần đổi theo em → cache tiền tố cho cả lớp', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: { body?: unknown }) => {
      urls.push(String(url));
      bodies.push(JSON.parse(String(init?.body || '{}')) as RequestBody);
      return okResponse();
    }));

    await inRequest('gv-ngoai', () => callGeminiVision(
      'prompt đầy đủ',
      [],
      OWNER_KEY,
      GRADING_MODEL,
      {},
      {
        prefix: 'ĐỀ + ĐÁP ÁN + LUẬT CHẤM (cố định)',
        prefixImages: [{ mimeType: 'image/jpeg', data: 'AAA' }],
        suffix: 'BÀI LÀM CỦA EM (đổi theo em)',
        suffixImages: [{ mimeType: 'image/jpeg', data: 'BBB' }],
      },
    ));

    const parts = bodies[0].contents?.[0]?.parts ?? [];
    expect(parts.map(part => part.text ?? `ảnh:${part.inlineData?.data}`)).toEqual([
      'ĐỀ + ĐÁP ÁN + LUẬT CHẤM (cố định)',
      'ảnh:AAA',
      'BÀI LÀM CỦA EM (đổi theo em)',
      'ảnh:BBB',
    ]);
  });

  it('không có phân đoạn thì vẫn gửi prompt + ảnh như cũ', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body?: unknown }) => {
      bodies.push(JSON.parse(String(init?.body || '{}')) as RequestBody);
      return okResponse();
    }));

    await inRequest('gv-ngoai', () => callGeminiVision('chấm bài', [{ mimeType: 'image/jpeg', data: 'CCC' }], OWNER_KEY, GRADING_MODEL));

    const parts = bodies[0].contents?.[0]?.parts ?? [];
    expect(parts.map(part => part.text ?? `ảnh:${part.inlineData?.data}`)).toEqual(['chấm bài', 'ảnh:CCC']);
  });

  it('model rẻ bị Google từ chối (mã 400) thì KHÔNG lùi sang model chấm chính — lượt gọi đã ở lớp rẻ nhất', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string, init: { body?: unknown }) => {
      urls.push(String(url));
      bodies.push(JSON.parse(String(init?.body || '{}')) as RequestBody);
      if (String(url).includes(UTILITY_MODEL)) {
        return { ok: false, status: 400, clone: () => ({ text: async () => 'model not supported' }) };
      }
      return okResponse();
    }));

    await expect(inRequest('gv-ngoai', () => callUtilityVision('đọc mã đề', [], OWNER_KEY))).rejects.toThrow();
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(UTILITY_MODEL);
  });

  it('hết hạn mức (429) thì không lùi model — lùi chỉ tốn thêm một lượt gọi đắt tiền', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      urls.push(String(url));
      return { ok: false, status: 429, clone: () => ({ text: async () => 'RESOURCE_EXHAUSTED' }) };
    }));

    await expect(inRequest('gv-ngoai', () => callUtilityVision('đọc mã đề', [], OWNER_KEY))).rejects.toThrow();
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain(UTILITY_MODEL);
  });
});
