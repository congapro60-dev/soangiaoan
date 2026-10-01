import type { VercelResponse } from '@vercel/node';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Không gọi Imagen / Storage / ví thật: kiểm luồng của handler — xác thực, chặn hình Toán,
// cache, ghi tiền đúng một ảnh khi sinh thật, và không ghi tiền khi sinh lỗi.

const m = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  generateImages: vi.fn(),
  save: vi.fn(),
  ensureGeminiKey: vi.fn(),
  onOwnKeyFailure: vi.fn(),
  recordImageUsage: vi.fn(),
  setAiKeyOwner: vi.fn(),
  acquireCallHoldWaiting: vi.fn(),
  releaseWalletHold: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: m.verifyIdToken }) }));
vi.mock('@google/genai', () => ({
  PersonGeneration: { DONT_ALLOW: 'DONT_ALLOW' },
  GoogleGenAI: class { models = { generateImages: m.generateImages }; },
}));
vi.mock('../_exam-core.js', () => ({
  getAdminStorage: () => ({ name: 'demo.appspot.com', file: () => ({ save: m.save }) }),
}));
vi.mock('../_grading-core.js', () => ({ getGradingApiKey: () => 'shared-key' }));
vi.mock('../_ai-usage.js', () => ({
  recordImageUsage: m.recordImageUsage,
  setAiKeyOwner: m.setAiKeyOwner,
  acquireCallHoldWaiting: m.acquireCallHoldWaiting,
  releaseWalletHold: m.releaseWalletHold,
}));
vi.mock('../_ai-keys.js', () => ({
  ensureGeminiKey: m.ensureGeminiKey,
  onOwnKeyFailure: m.onOwnKeyFailure,
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

let uidSeq = 0;
beforeEach(() => {
  vi.clearAllMocks();
  // Mỗi test một uid để hạn mức 10 lượt/phút (map trong module) không dính giữa các test.
  m.verifyIdToken.mockResolvedValue({ uid: `gv-${++uidSeq}` });
  m.ensureGeminiKey.mockResolvedValue({ key: 'k', source: 'shared', ownerUid: 'gv', billing: null });
  m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 0 });
  m.releaseWalletHold.mockResolvedValue(undefined);
  m.generateImages.mockResolvedValue({ generatedImages: [{ image: { imageBytes: Buffer.from('png').toString('base64') } }] });
});

const body = (over: Record<string, unknown> = {}) => ({ idToken: 'tok', directive: 'khu chợ ngoài trời có ba quầy bánh', ...over });

describe('handleGenerateImage', () => {
  it('thiếu token → 401, không gọi Imagen', async () => {
    const { db } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body({ idToken: undefined }), response);
    expect(state.statusCode).toBe(401);
    expect(m.generateImages).not.toHaveBeenCalled();
  });

  it('directive là hình Toán chính xác → 422 USE_TIKZ, không tốn tiền', async () => {
    const { db } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body({ directive: 'đồ thị hàm số bậc hai' }), response);
    expect(state.statusCode).toBe(422);
    expect(state.jsonBody.code).toBe('USE_TIKZ');
    expect(m.generateImages).not.toHaveBeenCalled();
    expect(m.recordImageUsage).not.toHaveBeenCalled();
  });

  it('đã có trong cache → trả URL cũ, không sinh lại, không tính tiền', async () => {
    const { db } = makeDb({ url: 'https://cached/a.png' });
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body(), response);
    expect(state.jsonBody).toEqual({ ok: true, url: 'https://cached/a.png', cached: true });
    expect(m.generateImages).not.toHaveBeenCalled();
    expect(m.recordImageUsage).not.toHaveBeenCalled();
  });

  it('sinh mới: khoá theo người gọi, Imagen chặn người thật, ghi đúng 1 ảnh, lưu Storage + cache', async () => {
    const { db, set } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body(), response);

    expect(m.setAiKeyOwner).toHaveBeenCalledWith(`gv-${uidSeq}`);
    const call = m.generateImages.mock.calls[0][0];
    expect(call.model).toBe('imagen-4.0-generate-001');
    expect(call.prompt).toContain('khu chợ ngoài trời có ba quầy bánh');
    expect(call.config).toMatchObject({ numberOfImages: 1, aspectRatio: '4:3', personGeneration: 'DONT_ALLOW' });
    expect(m.recordImageUsage).toHaveBeenCalledWith('imagen-4.0-generate-001', 1, { holdVnd: 0 });
    expect(m.save).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledTimes(1);
    expect(state.statusCode).toBe(200);
    expect(state.jsonBody.url).toMatch(/^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/demo\.appspot\.com\/o\/ai-images%2F[0-9a-f]{32}\.png\?alt=media&token=/);
  });

  it('Imagen lỗi với khoá chung → 502, KHÔNG ghi tiền, không lưu', async () => {
    m.generateImages.mockRejectedValue(new Error('quota'));
    const { db, set } = makeDb();
    const { response, state } = makeResponse();
    await handleGenerateImage(db, body(), response);
    expect(state.statusCode).toBe(502);
    expect(m.recordImageUsage).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  describe('giữ chỗ tiền ví (QA F3)', () => {
    it('lượt trừ ví: giữ chỗ TRƯỚC khi gọi Imagen và chuyển phần giữ cho recordImageUsage (không tự trả lại)', async () => {
      m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 1_000 });
      const { db } = makeDb();
      const { response, state } = makeResponse();
      await handleGenerateImage(db, body(), response);
      expect(m.acquireCallHoldWaiting.mock.invocationCallOrder[0]).toBeLessThan(m.generateImages.mock.invocationCallOrder[0]);
      expect(m.recordImageUsage).toHaveBeenCalledWith('imagen-4.0-generate-001', 1, { holdVnd: 1_000 });
      expect(m.releaseWalletHold).not.toHaveBeenCalled();
      expect(state.statusCode).toBe(200);
    });

    it('Imagen lỗi sau khi đã giữ chỗ → TRẢ LẠI phần giữ, không ghi tiền', async () => {
      m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 1_000 });
      m.generateImages.mockRejectedValue(new Error('quota'));
      const { db } = makeDb();
      const { response, state } = makeResponse();
      await handleGenerateImage(db, body(), response);
      expect(state.statusCode).toBe(502);
      expect(m.recordImageUsage).not.toHaveBeenCalled();
      expect(m.releaseWalletHold).toHaveBeenCalledWith(db, 'gv', 1_000);
    });

    it('hết số dư hoặc chạm trần → không gọi Imagen (ném AiKeyRequiredError để tầng ngoài trả 402)', async () => {
      m.acquireCallHoldWaiting.mockResolvedValue({ ok: false, reason: 'no_balance', contended: false });
      const { db } = makeDb();
      const { response } = makeResponse();
      await expect(handleGenerateImage(db, body(), response)).rejects.toMatchObject({ reason: 'no_balance' });
      expect(m.generateImages).not.toHaveBeenCalled();
    });
  });
});
