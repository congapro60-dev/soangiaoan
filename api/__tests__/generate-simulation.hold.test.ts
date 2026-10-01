import type { VercelRequest, VercelResponse } from '@vercel/node';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mô phỏng HTML: chỉ kiểm phần giữ chỗ tiền ví (QA F3) — giữ chỗ trước khi gọi Gemini, chuyển phần giữ cho
// recordAiUsage khi xong, trả lại khi lượt hỏng, và chặn khi hết số dư.

const m = vi.hoisted(() => ({
  generateContent: vi.fn(),
  ensureGeminiKey: vi.fn(),
  onOwnKeyFailure: vi.fn(),
  acquireCallHoldWaiting: vi.fn(),
  releaseWalletHold: vi.fn(),
  recordAiUsage: vi.fn(),
  set: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({ cert: vi.fn(), getApps: () => [{}], initializeApp: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: async () => ({ uid: 'gv-sim', email: 'gv@example.com' }) }) }));
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'ts' },
  getFirestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false }), set: m.set }) }) }),
}));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: m.generateContent }; } }));
vi.mock('../_ai-usage.js', () => ({
  acquireCallHoldWaiting: m.acquireCallHoldWaiting,
  releaseWalletHold: m.releaseWalletHold,
  recordAiUsage: m.recordAiUsage,
  createAiUsageContext: () => ({}),
  geminiUsageCounts: () => ({ inputTokens: 1, outputTokens: 1 }),
  runWithAiUsage: (_context: unknown, fn: () => Promise<unknown>) => fn(),
}));
vi.mock('../_ai-keys.js', () => ({
  ensureGeminiKey: m.ensureGeminiKey,
  onOwnKeyFailure: m.onOwnKeyFailure,
  aiKeyRequiredPayload: (error: { reason: string }) => ({ code: 'AI_KEY_REQUIRED', reason: error.reason }),
  AiKeyRequiredError: class AiKeyRequiredError extends Error {
    constructor(public reason: string, public ownerUid?: string | null) { super(reason); }
  },
}));

import handler from '../generate-simulation.js';

const HTML = '<!DOCTYPE html><html><body>ok</body></html>';

const call = async () => {
  const state: { statusCode: number; jsonBody?: any } = { statusCode: 200 };
  const res = {
    status(code: number) { state.statusCode = code; return res; },
    json(body: unknown) { state.jsonBody = body; return res; },
  } as unknown as VercelResponse;
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer tok' },
    body: { lessonId: 'l1', unitId: `u${Math.random()}`, exampleId: 'e1', problemText: 'Cho hàm số y = x^2' },
  } as unknown as VercelRequest;
  await handler(req, res);
  return state;
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GEMINI_API_KEY = 'shared-key';
  m.ensureGeminiKey.mockResolvedValue({ key: 'k', source: 'shared', ownerUid: 'gv-sim', billing: {} });
  m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 1_000 });
  m.releaseWalletHold.mockResolvedValue(undefined);
  m.recordAiUsage.mockResolvedValue(undefined);
  m.generateContent.mockResolvedValue({ text: HTML, usageMetadata: {} });
});

describe('POST /api/generate-simulation — giữ chỗ tiền ví', () => {
  it('giữ chỗ TRƯỚC khi gọi Gemini và chuyển phần giữ cho recordAiUsage (không tự trả lại)', async () => {
    const state = await call();
    expect(state.statusCode).toBe(200);
    expect(m.acquireCallHoldWaiting.mock.invocationCallOrder[0]).toBeLessThan(m.generateContent.mock.invocationCallOrder[0]);
    expect(m.recordAiUsage).toHaveBeenCalledWith('gemini', 'gemini-3.8-flash', expect.anything(), { holdVnd: 1_000 });
    expect(m.releaseWalletHold).not.toHaveBeenCalled();
  });

  it('Gemini lỗi sau khi đã giữ chỗ → TRẢ LẠI phần giữ, không ghi tiền', async () => {
    m.generateContent.mockRejectedValue(new Error('boom'));
    const state = await call();
    expect(state.statusCode).toBe(500);
    expect(m.recordAiUsage).not.toHaveBeenCalled();
    expect(m.releaseWalletHold).toHaveBeenCalledWith(expect.anything(), 'gv-sim', 1_000);
  });

  it('hết số dư → 402, không gọi Gemini', async () => {
    m.acquireCallHoldWaiting.mockResolvedValue({ ok: false, reason: 'no_balance', contended: false });
    const state = await call();
    expect(state.statusCode).toBe(402);
    expect(state.jsonBody).toMatchObject({ code: 'AI_KEY_REQUIRED', reason: 'no_balance' });
    expect(m.generateContent).not.toHaveBeenCalled();
  });

  it('khoá riêng: không giữ chỗ (holdVnd 0) và không trả lại gì', async () => {
    m.ensureGeminiKey.mockResolvedValue({ key: 'own', source: 'own', ownerUid: 'gv-sim', billing: null });
    m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 0 });
    const state = await call();
    expect(state.statusCode).toBe(200);
    expect(m.recordAiUsage).toHaveBeenCalledWith('gemini', 'gemini-3.8-flash', expect.anything(), { holdVnd: 0 });
    expect(m.releaseWalletHold).not.toHaveBeenCalled();
  });
});
