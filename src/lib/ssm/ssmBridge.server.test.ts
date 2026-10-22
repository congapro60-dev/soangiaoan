import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const memoryStore: Record<string, string> = {};

const mockStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, val: string) => { memoryStore[key] = String(val); },
  removeItem: (key: string) => { delete memoryStore[key]; },
  clear: () => { for (const k in memoryStore) delete memoryStore[k]; },
};

vi.stubGlobal('localStorage', mockStorage);

import {
  getStoredSsmSession,
  parseSsmConnectionInput,
  saveStoredSsmSession,
  ssmRequest,
  testAndSaveSsmConnection,
} from './ssmBridge';

const fetchMock = vi.fn();

beforeEach(() => {
  mockStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  mockStorage.clear();
});

describe('ssmBridge — Server Proxy mode', () => {
  it('parseSsmConnectionInput nhận JSON {token, workspace}', () => {
    const res = parseSsmConnectionInput('{"token": "my-tok-123", "workspace": "branch_23"}');
    expect(res).toEqual({ token: 'my-tok-123', workspace: 'branch_23' });

    const res2 = parseSsmConnectionInput('{"access_token": "my-tok-456"}');
    expect(res2).toEqual({ token: 'my-tok-456' });
  });

  it('parseSsmConnectionInput nhận URL hash #access_token=...&workspace=...', () => {
    const res = parseSsmConnectionInput('https://ssm.edufit.vn/user/login#access_token=abc-xyz-token&workspace=branch_99');
    expect(res).toEqual({ token: 'abc-xyz-token', workspace: 'branch_99' });
  });

  it('parseSsmConnectionInput nhận token thô dài', () => {
    const raw = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
    expect(parseSsmConnectionInput(raw)?.token).toBe(raw);
  });

  it('lưu và đọc phiên SSM vào localStorage', () => {
    expect(getStoredSsmSession()).toBe(null);
    saveStoredSsmSession({ token: 'tok-1', workspace: 'branch_1', savedAt: new Date().toISOString() });
    expect(getStoredSsmSession()?.token).toBe('tok-1');
    expect(getStoredSsmSession()?.workspace).toBe('branch_1');
    saveStoredSsmSession(null);
    expect(getStoredSsmSession()).toBe(null);
  });

  it('khi có phiên lưu: ssmRequest gọi thẳng API server proxy /api/classroom', async () => {
    saveStoredSsmSession({ token: 'tok-server', workspace: 'branch_23', savedAt: new Date().toISOString() });

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { data: [{ id: 1, name: '11Columbus' }] } }),
    });

    const data = await ssmRequest('teacherClasses', { schoolYearId: 6 });
    expect(data).toEqual({ data: [{ id: 1, name: '11Columbus' }] });

    expect(fetchMock).toHaveBeenCalledWith('/api/classroom', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        action: 'ssmProxy',
        op: 'teacherClasses',
        params: { schoolYearId: 6 },
        token: 'tok-server',
        workspace: 'branch_23',
        idToken: '',
      }),
    }));
  });

  it('testAndSaveSsmConnection: xác minh thành công thì lưu phiên', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: { data: { name: 'Thầy Cường', email: 'cuong@edufit.vn', workspace: 'branch_23' } },
      }),
    });

    const res = await testAndSaveSsmConnection('{"token": "tok-valid-123456789012345", "workspace": "branch_23"}');
    expect(res).toEqual({ name: 'Thầy Cường', email: 'cuong@edufit.vn', workspace: 'branch_23' });

    const stored = getStoredSsmSession();
    expect(stored?.token).toBe('tok-valid-123456789012345');
    expect(stored?.userName).toBe('Thầy Cường');
  });
});
