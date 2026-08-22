import type { VercelRequest, VercelResponse } from '@vercel/node';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyIdToken, createCompletion, initializeAdmin, loadQuotaDoc, remainingQuota, quotaRefSet } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createCompletion: vi.fn(),
  initializeAdmin: vi.fn(),
  loadQuotaDoc: vi.fn(),
  remainingQuota: vi.fn(),
  quotaRefSet: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: initializeAdmin,
}));

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: createCompletion } };
  },
}));

// Hạn mức được mock để test tập trung hành vi gateway; ca quota riêng nằm ở grading-core.test.
// bumpQuota phải TĂNG thật để khẳng định handler đã cộng lượt gọi vào bộ đếm.
vi.mock('../_grading-core.js', () => ({
  loadQuotaDoc,
  remainingQuota,
  bumpQuota: (quota: { gatewayCount: number }) => ({ ...quota, gatewayCount: quota.gatewayCount + 1 }),
}));

import { handleAiGateway as handler } from '../_ai-gateway-handler.js';

interface ResponseState {
  statusCode: number;
  jsonBody?: unknown;
  streamBody: string[];
  ended: boolean;
}

const makeResponse = (): { response: VercelResponse; state: ResponseState } => {
  const state: ResponseState = { statusCode: 200, streamBody: [], ended: false };
  const response = {
    status(code: number) {
      state.statusCode = code;
      return response;
    },
    json(body: unknown) {
      state.jsonBody = body;
      return response;
    },
    setHeader() {
      return response;
    },
    write(chunk: string) {
      state.streamBody.push(chunk);
      return true;
    },
    end() {
      state.ended = true;
      return response;
    },
  } as unknown as VercelResponse;
  return { response, state };
};

const makeRequest = (body: unknown, authorization?: string): VercelRequest => ({
  method: 'POST',
  headers: authorization ? { authorization } : {},
  body,
} as VercelRequest);

describe('AI Gateway handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_GATEWAY_API_KEY = 'test-gateway-key';
    verifyIdToken.mockResolvedValue({ uid: 'teacher-1', firebase: { sign_in_provider: 'google.com' } });
    loadQuotaDoc.mockResolvedValue([
      { day: '2026-08-22', teacherCount: 0, selfCount: 0, gatewayCount: 0, byStudent: {} },
      { set: quotaRefSet },
    ]);
    remainingQuota.mockReturnValue({ allowed: 5, reason: '' });
  });

  it('rejects requests without a Firebase Bearer token', async () => {
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: 'Xin chào' }), response);

    expect(state.statusCode).toBe(401);
    expect(state.jsonBody).toEqual({ error: 'Bạn cần đăng nhập để dùng GLM 5.2.' });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('blocks anonymous tokens (student portal) from burning the server key', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'anon-1', firebase: { sign_in_provider: 'anonymous' } });
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: 'Xin chào' }, 'Bearer anon-token'), response);

    expect(state.statusCode).toBe(403);
    expect(state.jsonBody).toMatchObject({ error: expect.stringContaining('tài khoản giáo viên') });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('returns 429 when the daily gateway quota is exhausted', async () => {
    remainingQuota.mockReturnValue({ allowed: 0, reason: 'Hôm nay tài khoản này đã dùng hết 100 lượt GLM.' });
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: 'Xin chào' }, 'Bearer firebase-token'), response);

    expect(state.statusCode).toBe(429);
    expect(state.jsonBody).toEqual({ error: 'Hôm nay tài khoản này đã dùng hết 100 lượt GLM.' });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('fails clearly when the server key is not configured', async () => {
    delete process.env.AI_GATEWAY_API_KEY;
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: 'Xin chào' }, 'Bearer firebase-token'), response);

    expect(state.statusCode).toBe(500);
    expect(state.jsonBody).toEqual({ error: 'AI Gateway chưa được cấu hình trên Vercel.' });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('forwards valid text requests to the fixed GLM 5.2 model and bumps the quota', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Xin chào từ GLM.' }, finish_reason: 'stop' }],
    });
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: '  Xin chào  ' }, 'Bearer firebase-token'), response);

    expect(initializeAdmin).toHaveBeenCalled();
    expect(verifyIdToken).toHaveBeenCalledWith('firebase-token');
    expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: 'zai/glm-5.2',
      messages: [{ role: 'user', content: 'Xin chào' }],
      stream: false,
    }));
    expect(quotaRefSet).toHaveBeenCalledWith(expect.objectContaining({ gatewayCount: 1 }));
    expect(state.statusCode).toBe(200);
    expect(state.jsonBody).toEqual({
      text: 'Xin chào từ GLM.',
      model: 'zai/glm-5.2',
      truncated: false,
    });
  });

  it('rejects an empty prompt before calling the provider', async () => {
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: '  ' }, 'Bearer firebase-token'), response);

    expect(state.statusCode).toBe(400);
    expect(state.jsonBody).toEqual({ error: 'Nội dung gửi đến GLM 5.2 không hợp lệ.' });
    expect(createCompletion).not.toHaveBeenCalled();
  });

  it('returns text chunks as SSE with a RAW [DONE] sentinel the client parser understands', async () => {
    createCompletion.mockResolvedValue((async function* () {
      yield { choices: [{ delta: { content: 'Xin ' } }] };
      yield { choices: [{ delta: { content: 'chào.' } }] };
    })());
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: 'Xin chào', stream: true }, 'Bearer firebase-token'), response);

    expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: 'zai/glm-5.2',
      stream: true,
    }));
    expect(state.statusCode).toBe(200);
    // Sentinel phải THÔ "data: [DONE]" — bản stringify '"[DONE]"' làm parser client trả null
    // và luồng đứt giữa chừng bị coi là hoàn tất.
    expect(state.streamBody).toEqual([
      'data: {"text":"Xin "}\n\n',
      'data: {"text":"chào."}\n\n',
      'data: {"done":true}\n\n',
      'data: [DONE]\n\n',
    ]);
    expect(state.ended).toBe(true);

    // WIRE TEST server → parser client: import LAZY trong test — import tĩnh ở đầu file kéo
    // thêm cây module src vào graph và làm vi.mock('openai') mất tác dụng (đã bắt được thực tế).
    const { parseGatewaySseEvent } = await import('../../src/lib/vercelGateway');
    const parsed = state.streamBody.map(raw => raw.replace(/^data:\s*/, '').trim()).map(parseGatewaySseEvent);
    expect(parsed[0]).toEqual({ text: 'Xin ' });
    expect(parsed[1]).toEqual({ text: 'chào.' });
    expect(parsed[parsed.length - 1]).toEqual({ done: true });
  });
});
