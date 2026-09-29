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

import { handleTimetableAction } from '../_timetable';

const ID = '059862c7-e590-4ced-9619-69a3e3a406c1';
const LINK = `https://primetimetable.com/publish/?id=${ID}#id=${ID}&view=1`;

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

describe('handleTimetableAction', () => {
  it('bỏ qua action khác', async () => {
    expect(await handleTimetableAction({ action: 'x' }, mockRes() as never)).toBe(false);
  });

  it('chưa đăng nhập / ẩn danh → 401', async () => {
    h.claims = null;
    const res = mockRes();
    await handleTimetableAction({ action: 'fetchPrimeTimetable', link: LINK, idToken: 't' }, res as never);
    expect(res.code).toBe(401);
    h.claims = { firebase: { sign_in_provider: 'anonymous' } };
    const res2 = mockRes();
    await handleTimetableAction({ action: 'fetchPrimeTimetable', link: LINK, idToken: 't' }, res2 as never);
    expect(res2.code).toBe(401);
  });

  it('link lạ → 422, không gọi mạng', async () => {
    const res = mockRes();
    await handleTimetableAction({ action: 'fetchPrimeTimetable', link: 'https://evil.example/?id=' + ID, idToken: 't' }, res as never);
    expect(res.code).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('link hợp lệ → gọi đúng API, chỉ trả phần cần dùng', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => JSON.stringify({ id: ID, name: 'TKB', days: [], periods: [], subjects: [], teachers: [], classes: [], activities: [], rooms: [1], views: [2] }) });
    const res = mockRes();
    await handleTimetableAction({ action: 'fetchPrimeTimetable', link: LINK, idToken: 't' }, res as never);
    expect(res.code).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://primetimetable.com/api/v2/timetables/${ID}/`);
    const tt = (res.body as { timetable: Record<string, unknown> }).timetable;
    expect(tt.name).toBe('TKB');
    expect(tt).not.toHaveProperty('rooms');
    expect(tt).not.toHaveProperty('views');
  });

  it('không công khai → 404 báo rõ; lỗi khác → 502', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404 });
    const res = mockRes();
    await handleTimetableAction({ action: 'fetchPrimeTimetable', link: LINK, idToken: 't' }, res as never);
    expect(res.code).toBe(404);
    fetchMock.mockResolvedValue({ ok: false, status: 500 });
    const res2 = mockRes();
    await handleTimetableAction({ action: 'fetchPrimeTimetable', link: LINK, idToken: 't' }, res2 as never);
    expect(res2.code).toBe(502);
  });
});
