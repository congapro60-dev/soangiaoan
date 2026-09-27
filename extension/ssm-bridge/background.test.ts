import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (message: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean;

const EXT_ID = 'ext-ssm';
let listener: Listener;
const tabsQuery = vi.fn();
const tabsSendMessage = vi.fn();
const fetchMock = vi.fn();

const appSender = { id: EXT_ID, origin: 'https://giaoandewey.vercel.app' };

const ask = (message: Record<string, unknown>, sender: object = appSender) =>
  new Promise<Record<string, unknown>>(resolve => {
    listener({ kind: 'ssm-request', ...message }, sender, r => resolve(r as Record<string, unknown>));
  });

const jsonResponse = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => JSON.stringify(body),
});

beforeAll(async () => {
  vi.stubGlobal('chrome', {
    runtime: {
      id: EXT_ID,
      getManifest: () => ({ version: '0.1.0' }),
      onMessage: { addListener: (fn: Listener) => { listener = fn; } },
    },
    tabs: { query: tabsQuery, sendMessage: tabsSendMessage },
  });
  vi.stubGlobal('fetch', fetchMock);
  await import('./background.js');
});

beforeEach(() => {
  tabsQuery.mockReset().mockResolvedValue([{ id: 7, status: 'complete' }]);
  tabsSendMessage.mockReset().mockResolvedValue({ token: 'tok-abc', workspace: 'branch_23' });
  fetchMock.mockReset().mockResolvedValue(jsonResponse(200, { data: [{ id: 1, name: '11Columbus' }] }));
});

describe('cầu nối SSM — service worker', () => {
  it('gọi đúng API với vé SSM + header workspace như trang SSM', async () => {
    const res = await ask({ op: 'teacherClasses', params: { schoolYearId: 6 } });
    expect(res).toEqual({ ok: true, data: { data: [{ id: 1, name: '11Columbus' }] } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api-ssm.edufit.vn/api/v1/class-teacher?school_year_id=6');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok-abc', workspace: 'branch_23' });
  });

  it('không bao giờ trả vé về cho app', async () => {
    const res = await ask({ op: 'profile' });
    expect(JSON.stringify(res)).not.toContain('tok-abc');
  });

  it('chỉ nhận yêu cầu từ trang app', async () => {
    const res = await ask({ op: 'profile' }, { id: EXT_ID, origin: 'https://evil.example' });
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bỏ qua tin không phải từ chính tiện ích', () => {
    expect(listener({ kind: 'ssm-request', op: 'profile' }, { id: 'other-ext', origin: appSender.origin }, () => {})).toBe(false);
  });

  it('từ chối lệnh lạ và tham số hỏng, không gọi mạng', async () => {
    expect((await ask({ op: 'deleteEverything' })).ok).toBe(false);
    expect((await ask({ op: 'classStudents', params: { classId: '1/../../v1/logout' } })).ok).toBe(false);
    expect((await ask({ op: 'teacherClasses', params: { schoolYearId: -1 } })).ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ping trả phiên bản, không cần tab SSM', async () => {
    tabsQuery.mockResolvedValue([]);
    expect(await ask({ op: 'ping' })).toEqual({ ok: true, data: { version: '0.1.0' } });
  });

  it('báo rõ khi chưa mở SSM / tab chưa có tiện ích / chưa đăng nhập', async () => {
    tabsQuery.mockResolvedValue([]);
    expect((await ask({ op: 'profile' })).error).toMatch(/Chưa mở SSM/);
    tabsQuery.mockResolvedValue([{ id: 7, status: 'complete' }]);
    tabsSendMessage.mockRejectedValue(new Error('no receiver'));
    expect((await ask({ op: 'profile' })).error).toMatch(/tải lại \(F5\) tab SSM/);
    tabsSendMessage.mockResolvedValue({ token: '', workspace: '' });
    expect((await ask({ op: 'profile' })).error).toMatch(/chưa đăng nhập/);
  });

  it('401 → báo phiên hết hạn', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' }));
    const res = await ask({ op: 'profile' });
    expect(res).toMatchObject({ ok: false, status: 401 });
    expect(res.error).toMatch(/hết hạn/);
  });

  it('đường dẫn học sinh theo lớp', async () => {
    await ask({ op: 'classStudents', params: { classId: 9681 } });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api-ssm.edufit.vn/api/v1/students/class/9681?skipPagination=true&page=1&limit=500');
  });
});
