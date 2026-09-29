import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ claims: null as Record<string, unknown> | null }));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => {
      if (!h.claims) throw new Error('bad token');
      return h.claims;
    },
  }),
}));

import { handleSsmTemplateAction } from '../_ssm-template';

const CDN = 'https://cdn-ssm.edufit.vn/export/evaluation/Template_Export_Score_11Columbus_VN%20TO%C3%81N_F1.xlsx';

const mockRes = () => {
  const r: { code: number; body: unknown; status: (c: number) => typeof r; json: (b: unknown) => void } = {
    code: 0, body: null,
    status(c) { r.code = c; return r; },
    json(b) { r.body = b; },
  };
  return r;
};

const fetchMock = vi.fn();

beforeEach(() => {
  h.claims = { firebase: { sign_in_provider: 'google.com' } };
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('handleSsmTemplateAction', () => {
  it('bỏ qua action khác', async () => {
    const res = mockRes();
    expect(await handleSsmTemplateAction({ action: 'x' }, res as never)).toBe(false);
  });

  it('chưa đăng nhập / ẩn danh → 401', async () => {
    h.claims = null;
    const res = mockRes();
    await handleSsmTemplateAction({ action: 'ssmFetchTemplate', link: CDN, idToken: 't' }, res as never);
    expect(res.code).toBe(401);

    h.claims = { firebase: { sign_in_provider: 'anonymous' } };
    const res2 = mockRes();
    await handleSsmTemplateAction({ action: 'ssmFetchTemplate', link: CDN, idToken: 't' }, res2 as never);
    expect(res2.code).toBe(401);
  });

  it('link host lạ → 422, KHÔNG gọi fetch', async () => {
    const res = mockRes();
    await handleSsmTemplateAction({ action: 'ssmFetchTemplate', link: 'https://evil.example/a.xlsx', idToken: 't' }, res as never);
    expect(res.code).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('link hợp lệ → tải, trả base64 + tên file', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new TextEncoder().encode('PK-fake').buffer });
    const res = mockRes();
    await handleSsmTemplateAction({ action: 'ssmFetchTemplate', link: CDN, idToken: 't' }, res as never);
    expect(res.code).toBe(200);
    const body = res.body as { base64: string; filename: string };
    expect(Buffer.from(body.base64, 'base64').toString()).toBe('PK-fake');
    expect(body.filename).toContain('F1.xlsx');
    // fetch đúng URL CDN đã lọc (không kèm query)
    expect(fetchMock.mock.calls[0][0]).toBe(CDN);
  });

  it('CDN 403 (chưa xuất) → 404 báo rõ', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const res = mockRes();
    await handleSsmTemplateAction({ action: 'ssmFetchTemplate', link: CDN, idToken: 't' }, res as never);
    expect(res.code).toBe(404);
    expect(String((res.body as { error: string }).error)).toMatch(/Xuất Excel/);
  });

  it('file quá lớn → 413', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, arrayBuffer: async () => new Uint8Array(5_000_001).buffer });
    const res = mockRes();
    await handleSsmTemplateAction({ action: 'ssmFetchTemplate', link: CDN, idToken: 't' }, res as never);
    expect(res.code).toBe(413);
  });
});
