import { describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({ auth: {} }));

import { needsAdminLink } from './adminLink';

const user = (email: string | null, over: Record<string, unknown> = {}) =>
  ({ email, isAnonymous: false, providerData: [{ providerId: 'google.com' }], ...over }) as never;

describe('needsAdminLink', () => {
  it('mail admin phụ đăng nhập Google → cần gộp', () => {
    expect(needsAdminLink(user('cuong.vuviet@thedeweyschools.edu.vn'))).toBe(true);
    expect(needsAdminLink(user('Cuong.Vuviet@TheDeweySchools.edu.vn'))).toBe(true);
  });

  it('tài khoản chính, GV thường, khách, chưa đăng nhập → không gộp', () => {
    expect(needsAdminLink(user('congapro60@gmail.com'))).toBe(false);
    expect(needsAdminLink(user('gv.la@truong.vn'))).toBe(false);
    expect(needsAdminLink(user(null, { isAnonymous: true }))).toBe(false);
    expect(needsAdminLink(null)).toBe(false);
  });

  it('phiên không phải Google (vd custom token) → không gộp lại, tránh vòng lặp', () => {
    expect(needsAdminLink(user('cuong.vuviet@thedeweyschools.edu.vn', { providerData: [] }))).toBe(false);
  });
});
