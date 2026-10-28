import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Phục vụ ảnh cho Zalo mobile qua route health (Vercel Hobby giới hạn 12 function).
 * Lý do tồn tại (lỗi 28/10): URL Firebase Storage làm Zalo trên điện thoại hiện nút
 * tải xuống thay vì render ảnh. Endpoint này trả URL sạch + header cache/inline đúng.
 */
const state = vi.hoisted(() => ({
  exists: true,
  onlyJpg: false,
  bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  contentType: 'image/png',
  filePath: '',
}));

vi.mock('firebase-admin', () => {
  const makeFile = (path: string) => {
    state.filePath = path;
    const isJpg = path.endsWith('.jpg');
    return {
      exists: async () => [state.onlyJpg ? isJpg : state.exists],
      getMetadata: async () => [{ contentType: state.contentType }],
      download: async () => [state.bytes],
    };
  };
  const app = { name: '[DEFAULT]' };
  return {
    apps: [app],
    getApps: () => [app],
    getApp: () => app,
    app: () => app,
    initializeApp: () => app,
    credential: { cert: () => ({}) },
    storage: () => ({ bucket: () => ({ file: makeFile }) }),
  };
});

vi.mock('firebase-admin/app', () => {
  const app = { name: '[DEFAULT]' };
  return {
    getApps: () => [app],
    getApp: () => app,
    initializeApp: () => app,
    cert: () => ({}),
  };
});

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: () => ({
      file: (path: string) => {
        state.filePath = path;
        const isJpg = path.endsWith('.jpg');
        return {
          exists: async () => [state.onlyJpg ? isJpg : state.exists],
          getMetadata: async () => [{ contentType: state.contentType }],
          download: async () => [state.bytes],
        };
      },
    }),
  }),
}));

import handler from '../health/firebase-admin';

const call = async (query: Record<string, unknown>, method = 'GET') => {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    setHeader: (k: string, v: string) => { headers[k] = v; },
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
    send(payload: unknown) { this.body = payload; return this; },
    end() { return this; },
  };
  await handler({ method, query } as never, res as never);
  return { code: res.statusCode, body: res.body, headers };
};

const UUID = 'ac225e51-468e-400b-ae7c-a8e2b49d62a6';

beforeEach(() => {
  state.exists = true;
  state.onlyJpg = false;
  state.contentType = 'image/png';
  state.filePath = '';
  // Route ảnh cần service account để khởi tạo app (chỉ là chuỗi giả trong test).
  vi.stubEnv('FIREBASE_SERVICE_ACCOUNT_KEY', JSON.stringify({
    project_id: 'demo-project',
    client_email: 'demo@example.com',
    private_key: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
  }));
});

describe('GET /api/health/firebase-admin?image=<uuid>', () => {
  it('I1: id hợp lệ → trả ảnh với header để Zalo render trực tiếp', async () => {
    const r = await call({ image: UUID });
    expect(r.code).toBe(200);
    expect(r.headers['Content-Type']).toBe('image/png');
    // Zalo mobile cần: cache được + hiển thị trực tiếp (không tải xuống).
    expect(r.headers['Cache-Control']).toContain('public');
    expect(r.headers['Content-Disposition']).toBe('inline');
    expect(r.headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('I2: chỉ đọc trong tiền tố geometry/ — không nhận path tuỳ ý', async () => {
    await call({ image: UUID });
    expect(state.filePath).toBe(`geometry/${UUID}.png`);
  });

  it('I3: id sai định dạng (path traversal, rỗng) → 400, không chạm Storage', async () => {
    for (const bad of ['', '../../secret', 'abc', `${UUID}/../x`, 'geometry%2Fsecret']) {
      const r = await call({ image: bad });
      expect(r.code, `id="${bad}" phải bị chặn`).toBe(400);
      expect(state.filePath).toBe('');
    }
  });

  it('I5: file không tồn tại → 404', async () => {
    state.exists = false;
    const r = await call({ image: UUID });
    expect(r.code).toBe(404);
  });

  it('I6: ảnh cũ đuôi .jpg vẫn đọc được (tương thích ảnh đã gửi trước đây)', async () => {
    state.onlyJpg = true;
    state.contentType = 'image/jpeg';
    const r = await call({ image: UUID });
    expect(r.code).toBe(200);
    expect(state.filePath).toBe(`geometry/${UUID}.jpg`);
  });

  it('I7: method khác GET/HEAD → 405', async () => {
    const r = await call({ image: UUID }, 'POST');
    expect(r.code).toBe(405);
  });

  it('I8: KHÔNG có tham số image → vẫn là health check như cũ (không phá hành vi cũ)', async () => {
    const r = await call({});
    // Không cấu hình service account trong test → health trả 503, không phải ảnh.
    expect(r.code).toBe(503);
    expect(state.filePath).toBe('');
  });
});
