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

import { handleSsmProxyAction } from '../_ssm-proxy';

const mockRes = () => {
  const r: { code: number; body: unknown; status: (c: number) => typeof r; json: (b: unknown) => void } = {
    code: 0,
    body: null,
    status(c) {
      r.code = c;
      return r;
    },
    json(b) {
      r.body = b;
    },
  };
  return r;
};

const fetchMock = vi.fn();

beforeEach(() => {
  h.claims = { firebase: { sign_in_provider: 'google.com' } };
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('handleSsmProxyAction', () => {
  it('bỏ qua action khác', async () => {
    const res = mockRes();
    expect(await handleSsmProxyAction({ action: 'other' }, res as never)).toBe(false);
  });

  it('chưa đăng nhập giáo viên → 401', async () => {
    h.claims = null;
    const res = mockRes();
    await handleSsmProxyAction({ action: 'ssmProxy', idToken: 'bad' }, res as never);
    expect(res.code).toBe(401);
  });

  it('thiếu token SSM → 400', async () => {
    const res = mockRes();
    await handleSsmProxyAction({ action: 'ssmProxy', idToken: 'valid', token: '' }, res as never);
    expect(res.code).toBe(400);
    expect((res.body as { error: string }).error).toContain('Thiếu mã kết nối');
  });

  it('gọi profile: đúng path v1/profile và headers', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { name: 'Teacher A', email: 'teacher@edufit.vn' } }),
    });
    const res = mockRes();
    const handled = await handleSsmProxyAction(
      { action: 'ssmProxy', idToken: 'valid', token: 'tok-123', workspace: 'branch_23', op: 'profile' },
      res as never,
    );
    expect(handled).toBe(true);
    expect(res.code).toBe(200);
    expect((res.body as { ok: boolean }).ok).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api-ssm.edufit.vn/api/v1/profile');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer tok-123',
      workspace: 'branch_23',
      Accept: 'application/json',
    });
  });

  it('gọi writeLoGrades: POST đúng endpoint và body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Grading updated' }),
    });
    const bodyPayload = {
      class_id: 9681,
      criteria_id: 7,
      quarter_has_branch_id: 5871,
      students: [{ id: 551, name: 'Minh', result: [{ learning_outcome_id: 34745, scoring_setting_id: 902, is_number: true, point: '4' }] }],
    };
    const res = mockRes();
    await handleSsmProxyAction(
      {
        action: 'ssmProxy',
        idToken: 'valid',
        token: 'tok-123',
        workspace: 'branch_23',
        op: 'writeLoGrades',
        params: { assessmentFormId: 42, body: bodyPayload },
      },
      res as never,
    );
    expect(res.code).toBe(200);
    expect((res.body as { ok: boolean }).ok).toBe(true);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api-ssm.edufit.vn/api/v2/evaluation/grading-student-by-assessment-form/42');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual(bodyPayload);
  });

  it('SSM trả 401 → thông báo phiên hết hạn', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Unauthenticated' }),
    });
    const res = mockRes();
    await handleSsmProxyAction(
      { action: 'ssmProxy', idToken: 'valid', token: 'expired-tok', op: 'profile' },
      res as never,
    );
    expect(res.code).toBe(200);
    expect((res.body as { ok: boolean; status: number }).status).toBe(401);
    expect((res.body as { error: string }).error).toContain('hết hạn');
  });
});
