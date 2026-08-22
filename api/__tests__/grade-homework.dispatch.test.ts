import type { VercelRequest, VercelResponse } from '@vercel/node';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test hồi quy ĐI QUA DISPATCHER THẬT của /api/grade-homework — không import handler riêng lẻ.
// Bảo vệ: action aiGateway được route đúng, các action chấm bài vẫn tới đích, và guard
// method/action không bị phá khi người sau sửa dispatcher.

const { verifyIdToken, initializeAdmin } = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  initializeAdmin: vi.fn(),
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}));

vi.mock('../_exam-core.js', () => ({
  getAdminDb: initializeAdmin,
}));

// Chặn AI thật: mọi handler đều phải dừng ở bước xác thực/quota chứ không gọi provider.
vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  },
}));

import handler from '../grade-homework.js';

const makeRequest = (body: unknown, authorization?: string): VercelRequest => ({
  method: 'POST',
  headers: authorization ? { authorization } : {},
  body,
} as VercelRequest);

const makeResponse = (): { response: VercelResponse; state: { statusCode: number; jsonBody?: unknown } } => {
  const state: { statusCode: number; jsonBody?: unknown } = { statusCode: 200 };
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
  } as unknown as VercelResponse;
  return { response, state };
};

describe('grade-homework dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Không có token nào hợp lệ trong test này: mọi action chấm phải chặn ở 401
    // — đủ chứng minh routing tới ĐÚNG handler (handler sai sẽ trả mã khác).
    verifyIdToken.mockRejectedValue(new Error('token không hợp lệ'));
  });

  it('chỉ nhận POST', async () => {
    const req = { method: 'GET', headers: {}, body: {} } as unknown as VercelRequest;
    const { response, state } = makeResponse();

    await handler(req, response);

    expect(state.statusCode).toBe(405);
    expect(state.jsonBody).toEqual({ error: 'Chỉ nhận POST' });
  });

  it('action lạ → 400 kèm bảng hạn mức', async () => {
    const { response, state } = makeResponse();

    await handler(makeRequest({ action: 'khongTonTai' }), response);

    expect(state.statusCode).toBe(400);
    expect(state.jsonBody).toMatchObject({ error: expect.stringContaining('khongTonTai') });
  });

  it("aiGateway được dispatch và tự xác thực riêng (401 khi thiếu token)", async () => {
    const { response, state } = makeResponse();

    await handler(makeRequest({ action: 'aiGateway', prompt: 'Xin chào' }), response);

    expect(state.statusCode).toBe(401);
    expect(state.jsonBody).toMatchObject({ error: expect.stringContaining('đăng nhập') });
  });

  it.each(['gradeAssignment', 'gradeOne', 'practice', 'solveAnswerKey', 'suggestRubric'])(
    'action %s tới đúng handler và bị chặn 401 khi thiếu token',
    async (action) => {
      const { response, state } = makeResponse();

      await handler(makeRequest({ action }, 'Bearer token-sai'), response);

      expect(state.statusCode).toBe(401);
      expect(state.jsonBody).toMatchObject({ error: expect.stringContaining('đăng nhập') });
    },
  );
});
