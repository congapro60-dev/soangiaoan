import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(async () => 'id-token'),
  fetchMock: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { isAnonymous: true, getIdToken: mocks.getIdToken } },
}));

import { fetchStudentDiscoverCatalog } from './studentPortalApi';

describe('student Discover catalog client contract', () => {
  beforeEach(() => {
    mocks.fetchMock.mockReset();
    mocks.getIdToken.mockClear();
    vi.stubGlobal('fetch', mocks.fetchMock);
  });

  it('sends only the authenticated student action and returns the safe catalog', async () => {
    const catalog = [{ id: 'tds-discover-g10-p2', title: 'Mệnh đề', grade: '10', week: 1, period: 2, status: 'available' }];
    mocks.fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ catalog }) });

    await expect(fetchStudentDiscoverCatalog()).resolves.toEqual(catalog);
    expect(mocks.fetchMock).toHaveBeenCalledWith('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'studentDiscoverCatalog', idToken: 'id-token' }),
    });
  });
});
