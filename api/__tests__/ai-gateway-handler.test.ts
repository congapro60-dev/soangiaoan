import type { VercelRequest, VercelResponse } from '@vercel/node';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { verifyIdToken, createCompletion, initializeAdmin } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  createCompletion: vi.fn(),
  initializeAdmin: vi.fn(),
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

import handler from '../ai-gateway';

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
    verifyIdToken.mockResolvedValue({ uid: 'teacher-1' });
  });

  it('rejects requests without a Firebase Bearer token', async () => {
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: 'Xin chào' }), response);

    expect(state.statusCode).toBe(401);
    expect(state.jsonBody).toEqual({ error: 'Bạn cần đăng nhập để dùng GLM 5.2.' });
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

  it('forwards valid text requests to the fixed GLM 5.2 model', async () => {
    createCompletion.mockResolvedValue({
      choices: [{ message: { content: 'Xin chào từ GLM.' }, finish_reason: 'stop' }],
    });
    const { response, state } = makeResponse();

    await handler(makeRequest({ prompt: '  Xin chào  ' }, 'Bearer firebase-token'), response);

    expect(initializeAdmin).toHaveBeenCalledTimes(1);
    expect(verifyIdToken).toHaveBeenCalledWith('firebase-token');
    expect(createCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: 'zai/glm-5.2',
      messages: [{ role: 'user', content: 'Xin chào' }],
      stream: false,
    }));
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

  it('returns text chunks as SSE and closes the stream', async () => {
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
    expect(state.streamBody).toEqual([
      'data: {"text":"Xin "}\n\n',
      'data: {"text":"chào."}\n\n',
      'data: {"done":true}\n\n',
      'data: "[DONE]"\n\n',
    ]);
    expect(state.ended).toBe(true);
  });
});
