import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mô phỏng HTML: chỉ kiểm phần giữ chỗ tiền ví (QA F3) — gọi chợ Vilao qua fetch toàn cục, giữ chỗ trước khi gọi,
// chuyển phần giữ cho recordAiUsage khi xong, trả lại khi lượt hỏng, và chặn khi hết số dư.

const m = vi.hoisted(() => ({
  fetch: vi.fn(),
  ensureGeminiKey: vi.fn(),
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
vi.mock('../_ai-usage.js', () => ({
  acquireCallHoldWaiting: m.acquireCallHoldWaiting,
  releaseWalletHold: m.releaseWalletHold,
  recordAiUsage: m.recordAiUsage,
  createAiUsageContext: () => ({}),
  openAiUsageCounts: (usage: unknown) => usage,
  runWithAiUsage: (_context: unknown, fn: () => Promise<unknown>) => fn(),
}));
vi.mock('../_ai-keys.js', () => ({
  ensureGeminiKey: m.ensureGeminiKey,
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
  process.env.GRADING_VILAO_API_KEY = 'sk-test-vilao';
  vi.stubGlobal('fetch', m.fetch);
  m.ensureGeminiKey.mockResolvedValue({ key: 'sk-test', source: 'shared', ownerUid: 'gv-sim' });
  m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 1_000 });
  m.releaseWalletHold.mockResolvedValue(undefined);
  m.recordAiUsage.mockResolvedValue(undefined);
  m.fetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: HTML }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GRADING_VILAO_API_KEY;
});

describe('POST /api/generate-simulation — giữ chỗ tiền ví', () => {
  it('giữ chỗ TRƯỚC khi gọi Vilao và chuyển phần giữ cho recordAiUsage (không tự trả lại)', async () => {
    const state = await call();
    expect(state.statusCode).toBe(200);
    expect(m.acquireCallHoldWaiting.mock.invocationCallOrder[0]).toBeLessThan(m.fetch.mock.invocationCallOrder[0]);
    expect(m.recordAiUsage).toHaveBeenCalledWith('vilao', 'vilao/gemini-3.8-flash', expect.anything(), { holdVnd: 1_000 });
    expect(m.releaseWalletHold).not.toHaveBeenCalled();
    expect(m.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = m.fetch.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toContain('api.vilao.ai/v1/chat/completions');
    expect(init.headers.Authorization).toBe('Bearer sk-test');
  });

  it('Vilao lỗi sau khi đã giữ chỗ → TRẢ LẠI phần giữ, không ghi tiền', async () => {
    m.fetch.mockRejectedValue(new Error('boom'));
    const state = await call();
    expect(state.statusCode).toBe(500);
    expect(m.recordAiUsage).not.toHaveBeenCalled();
    expect(m.releaseWalletHold).toHaveBeenCalledWith(expect.anything(), 'gv-sim', 1_000);
  });

  it('hết số dư → 402, không gọi Vilao', async () => {
    m.acquireCallHoldWaiting.mockResolvedValue({ ok: false, reason: 'no_balance', contended: false });
    const state = await call();
    expect(state.statusCode).toBe(402);
    expect(state.jsonBody).toMatchObject({ code: 'AI_KEY_REQUIRED', reason: 'no_balance' });
    expect(m.fetch).not.toHaveBeenCalled();
  });

  it('khoá chung, holdVnd 0: không giữ tiền và không trả lại gì', async () => {
    m.ensureGeminiKey.mockResolvedValue({ key: 'sk-shared', source: 'shared', ownerUid: 'gv-sim' });
    m.acquireCallHoldWaiting.mockResolvedValue({ ok: true, holdVnd: 0 });
    const state = await call();
    expect(state.statusCode).toBe(200);
    expect(m.recordAiUsage).toHaveBeenCalledWith('vilao', 'vilao/gemini-3.8-flash', expect.anything(), { holdVnd: 0 });
    expect(m.releaseWalletHold).not.toHaveBeenCalled();
  });
});
