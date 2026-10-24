import type { VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Không gọi Vilao / Storage / ví thật: kiểm luồng của handler — xác thực, chặn hình Toán,
// cache, sinh đúng qua api.vilao.ai/v1/images/generations (env AI_IMAGE_MODEL), ghi tiền đúng một ảnh
// khi sinh thật, và không ghi tiền khi sinh lỗi.

const m = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  save: vi.fn(),
  ensureGeminiKey: vi.fn(),
  recordImageUsage: vi.fn(),
  setAiKeyOwner: vi.fn(),
  acquireCallHoldWaiting: vi.fn(),
  releaseWalletHold: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: m.verifyIdToken }) }));
vi.mock('../_exam-core.js', () => ({
  getAdminStorage: () => ({ name: 'demo.appspot.com', file: () => ({ save: m.save }) }),
}));
vi.mock('../_ai-usage.js', () => ({
  recordImageUsage: m.recordImageUsage,
  setAiKeyOwner: m.setAiKeyOwner,
  acquireCallHoldWaiting: m.acquireCallHoldWaiting,
  releaseWalletHold: m.releaseWalletHold,
}));
vi.mock('../_ai-keys.js', () => ({
  ensureGeminiKey: m.ensureGeminiKey,
  AiKeyRequiredError: class AiKeyRequiredError extends Error {
    constructor(public reason: string, public ownerUid?: string | null) { super(reason); }
  },
}));

import { handleGenerateImage } from '../_ai-image-handler.js';

const makeResponse = () => {
  const state: { statusCode: number; jsonBody?: any } = { statusCode: 200 };
  const response = {
    status(code: number) { state.statusCode = code; return response; },
    json(body: unknown) { state.jsonBody = body; return response; },
  } as unknown as VercelResponse;
  return { response, state };
};

/** Firestore giả: một collection `aiImages`, nhớ doc đã ghi. */
const makeDb = (cached: Record<string, unknown> | null = null) => {
  const set = vi.fn();
  const db = {
    collection: () => ({ doc: () => ({ get: async () => ({ exists: !!cached, data: () => cached }), set }) }),
  } as unknown as FirebaseFirestore.Firestore;
  return { db, set };
};

/** Fetch giả: Vilao trả b64_json như gpt-image-2. */
const vilaoOk = (fetchMock = vi.fn()) => {
  fetchMock.mockImplementation(async (_url: unknown, init?: { body?: string }) => {
    expect(String(_url)).toContain('api.vilao.ai/v1/images/generations');
    expect((init?.body && JSON.parse(init.body)) ?? {}).toMatchObject({ model: 'gpt-image-2', n: 1 });
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [{ b64_json: Buffer.from('png').toString('base64') }] }),
    };
  });
  return fetchMock;
};

let uidSeq = 0;
let fetchMock = vilaoOk();
beforeEach(() => {
  vi.clearAllMocks();
  process.env.GRADING_VILAO_API_KEY = 'sk-shared-vilao';
  // Mỗi test một uid để hạn mức 10 lượt/phút (map trong module) không dính giữa các test.
  m.verifyIdToken.mockResolvedValue({ uid: `gv-${++uidSeq}` });
  m.ensureGeminiKey.mockResolvedValue({ key: 'sk-shared-vilao', source: 'shared', ownerUid: 'gv', billing: null });
  m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 0 });
  m.releaseWalletHold.mockResolvedValue(undefined);
  fetchMock = vilaoOk();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  delete process.env.GRADING_VILAO_API_KEY;
  delete process.env.AI_IMAGE_MODEL;
  delete process.env.GRADING_VILAO_BASE_URL;
  vi.unstubAllGlobals();
});

const body = (over: Record<string, unknown> = {}) => ({ idToken: 'tok', directive: 'khu chợ ngoài trời có ba quầy bánh', ...over });

describe('handleGenerateImage (Vilao G3)', () => {
  it('thiếu token → 401, không gọi Vilao', async () => {
    const { db } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body({ idToken: undefined }), response);
    expect(state.statusCode).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('directive là hình Toán chính xác → 422 USE_TIKZ, không tốn tiền', async () => {
    const { db } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body({ directive: 'đồ thị hàm số bậc hai' }), response);
    expect(state.statusCode).toBe(422);
    expect(state.jsonBody.code).toBe('USE_TIKZ');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(m.recordImageUsage).not.toHaveBeenCalled();
  });

  it('đã có trong cache → trả URL cũ, không sinh lại, không tính tiền', async () => {
    const { db } = makeDb({ url: 'https://cached/a.png' });
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body(), response);
    expect(state.jsonBody).toEqual({ ok: true, url: 'https://cached/a.png', cached: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(m.recordImageUsage).not.toHaveBeenCalled();
  });

  it('sinh mới: khoá theo người gọi, prompt gồm directive + luật an toàn, tỉ lệ 4:3 → size 1536x1024, lưu Storage + cache', async () => {
    const { db, set } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body(), response);

    expect(m.setAiKeyOwner).toHaveBeenCalledWith(`gv-${uidSeq}`);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body) as Record<string, unknown>;
    expect(sent.model).toBe('gpt-image-2');
    expect(String(sent.prompt)).toContain('khu chợ ngoài trời có ba quầy bánh');
    expect(sent.size).toBe('1536x1024');
    expect(m.recordImageUsage).toHaveBeenCalledWith('gpt-image-2', 1, { holdVnd: 0 });
    expect(m.save).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0]).toMatchObject({ model: 'gpt-image-2' });
    expect(state.statusCode).toBe(200);
    expect(state.jsonBody.url).toMatch(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/demo\.appspot\.com\/o\/ai-images%2F[0-9a-f]{32}\.png\?alt=media&token=/);
  });

  it('env AI_IMAGE_MODEL / GRADING_VILAO_BASE_URL đổi model + đích mà không sửa code', async () => {
    process.env.AI_IMAGE_MODEL = 'gemini-3.1-flash-image';
    process.env.GRADING_VILAO_BASE_URL = 'https://mirror.example/v1/';
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ url: 'https://cdn.example/a.jpg' }] }),
    }));
    // url-CDN branch: cần fetch ảnh — lần 2 là tải bytes.
    globalThis.fetch = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.indexOf('/images/generations') >= 0) return { ok: true, json: async () => ({ data: [{ url: 'https://cdn.example/a.jpg' }] }) } as Response;
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(4) } as unknown as Response;
    }) as unknown as typeof fetch;
    const { db, set } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body({ aspectRatio: '1:1' }), response);
    expect(m.recordImageUsage).toHaveBeenCalledWith('gemini-3.1-flash-image', 1, { holdVnd: 0 });
    expect(set.mock.calls[0][0]).toMatchObject({ model: 'gemini-3.1-flash-image' });
    expect(state.statusCode).toBe(200);
  });

  it('Vilao lỗi với khoá chung → 502, KHÔNG ghi tiền, không lưu', async () => {
    fetchMock.mockImplementation(async () => ({ ok: false, status: 500, text: async () => 'boom' }));
    const { db, set } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body(), response);
    expect(state.statusCode).toBe(502);
    expect(m.recordImageUsage).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  describe('giữ chỗ tiền ví (QA F3)', () => {
    it('lượt trừ ví: giữ chỗ TRƯỚC khi gọi Vilao và chuyển phần giữ cho recordImageUsage (không tự trả lại)', async () => {
      m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 1_000 });
      const { db } = makeDb();
      const { response, state } = makeResponse();
      await handleGenerateImage(db, body(), response);
      expect(m.acquireCallHoldWaiting.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
      expect(m.recordImageUsage).toHaveBeenCalledWith('gpt-image-2', 1, { holdVnd: 1_000 });
      expect(m.releaseWalletHold).not.toHaveBeenCalled();
      expect(state.statusCode).toBe(200);
    });

    it('Vilao lỗi sau khi đã giữ chỗ → TRẢ LẠI phần giữ, không ghi tiền', async () => {
      m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 1_000 });
      fetchMock.mockImplementation(async () => ({ ok: false, status: 500, text: async () => 'boom' }));
      const { db } = makeDb();
      const { response, state } = makeResponse();
      await handleGenerateImage(db, body(), response);
      expect(state.statusCode).toBe(502);
      expect(m.recordImageUsage).not.toHaveBeenCalled();
      expect(m.releaseWalletHold).toHaveBeenCalledWith(expect.anything(), 'gv', 1_000);
    });

    it('hết số dư hoặc chạm trần → không gọi Vilao (ném AiKeyRequiredError để tầng ngoài trả 402)', async () => {
      m.acquireCallHoldWaiting.mockResolvedValue({ ok: false, reason: 'no_balance', contended: false });
      const { db } = makeDb();
      const { response } = makeResponse();
      await expect(handleGenerateImage(db, body(), response)).rejects.toMatchObject({ reason: 'no_balance' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});