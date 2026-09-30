import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  claims: null as Record<string, unknown> | null,
  minted: [] as Array<{ uid: string; claims: unknown }>,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: async () => {
      if (!h.claims) throw new Error('bad token');
      return h.claims;
    },
    getUserByEmail: async (email: string) => ({ uid: email === 'congapro60@gmail.com' ? 'uid-chinh' : 'uid-khac' }),
    createCustomToken: async (uid: string, claims: unknown) => { h.minted.push({ uid, claims }); return 'custom-token'; },
  }),
}));

import { handleAdminLinkAction } from '../_admin-link';

const mockRes = () => {
  const r: { code: number; body: unknown; status: (c: number) => typeof r; json: (b: unknown) => void } = {
    code: 0, body: null,
    status(c) { r.code = c; return r; },
    json(b) { r.body = b; },
  };
  return r;
};

const SCHOOL = { uid: 'uid-truong', email: 'cuong.vuviet@thedeweyschools.edu.vn', email_verified: true, firebase: { sign_in_provider: 'google.com' } };

beforeEach(() => {
  h.claims = { ...SCHOOL };
  h.minted = [];
});

describe('handleAdminLinkAction', () => {
  it('bỏ qua action khác', async () => {
    expect(await handleAdminLinkAction({ action: 'x' }, mockRes() as never)).toBe(false);
  });

  it('mail admin phụ → custom token của uid chính, kèm claim mail thật', async () => {
    const res = mockRes();
    expect(await handleAdminLinkAction({ action: 'linkAdminSession', idToken: 't' }, res as never)).toBe(true);
    expect(res.code).toBe(200);
    expect(res.body).toMatchObject({ customToken: 'custom-token', linkedEmail: SCHOOL.email, primaryEmail: 'congapro60@gmail.com' });
    expect(h.minted).toEqual([{ uid: 'uid-chinh', claims: { linkedEmail: SCHOOL.email } }]);
  });

  it.each([
    ['mail không thuộc nhóm admin', { email: 'gv.la@truong.vn' }],
    ['mail chưa xác minh', { email_verified: false }],
    ['không đăng nhập bằng Google', { firebase: { sign_in_provider: 'custom' } }],
    ['khách ẩn danh', { email: undefined, firebase: { sign_in_provider: 'anonymous' } }],
    ['chính là tài khoản chính', { email: 'congapro60@gmail.com' }],
  ])('từ chối: %s', async (_name, override) => {
    h.claims = { ...SCHOOL, ...override };
    const res = mockRes();
    await handleAdminLinkAction({ action: 'linkAdminSession', idToken: 't' }, res as never);
    expect(res.code).toBe(403);
    expect(h.minted).toEqual([]);
  });

  it('token sai → 401, không cấp gì', async () => {
    h.claims = null;
    const res = mockRes();
    await handleAdminLinkAction({ action: 'linkAdminSession', idToken: 'x' }, res as never);
    expect(res.code).toBe(401);
    expect(h.minted).toEqual([]);
  });
});
