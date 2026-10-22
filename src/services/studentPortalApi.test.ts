import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getIdToken: vi.fn(async () => 'id-token'),
  fetchMock: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  auth: { currentUser: { isAnonymous: true, getIdToken: mocks.getIdToken } },
}));

import {
  fetchStudentAdaptiveAssignments,
  fetchStudentDiscoverCatalog,
  openStudentAdaptiveAssignment,
  submitStudentAdaptiveAssessment,
} from './studentPortalApi';

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

describe('bài học phân hoá được giao cho lớp — client contract', () => {
  beforeEach(() => {
    mocks.fetchMock.mockReset();
    mocks.getIdToken.mockClear();
    vi.stubGlobal('fetch', mocks.fetchMock);
  });

  it('liệt kê bài được giao qua action chuyên dụng', async () => {
    const assignments = [{ assignmentId: 'ad-1', lessonId: 'lesson-1', title: 'Tiết 2', discoverSeedId: 'seed-1', createdAt: '2026-10-22' }];
    mocks.fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ assignments }) });

    await expect(fetchStudentAdaptiveAssignments()).resolves.toEqual(assignments);
    expect(mocks.fetchMock).toHaveBeenCalledWith('/api/classroom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'studentAdaptiveList', idToken: 'id-token' }),
    });
  });

  it('mở bài: máy chủ trả bản đã bỏ đáp án', async () => {
    const lesson = { id: 'lesson-1', title: 'Tiết 2' };
    mocks.fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ assignmentId: 'ad-1', lesson }) });

    await expect(openStudentAdaptiveAssignment('ad-1')).resolves.toEqual({ assignmentId: 'ad-1', lesson });
    const body = JSON.parse(String(mocks.fetchMock.mock.calls[0][1].body));
    expect(body).toMatchObject({ action: 'studentAdaptiveOpen', idToken: 'id-token', assignmentId: 'ad-1' });
  });

  it('nộp bài: chỉ gửi câu trả lời, KHÔNG gửi điểm (máy chủ chấm)', async () => {
    mocks.fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ assignmentId: 'ad-1', kind: 'diagnostic', scored: true, status: 'in_progress', attempt: { id: 'a1' } }) });

    await expect(submitStudentAdaptiveAssessment('ad-1', { kind: 'diagnostic', answers: { q1: 'A' } })).resolves.toMatchObject({ scored: true });
    const body = JSON.parse(String(mocks.fetchMock.mock.calls[0][1].body));
    expect(body).toMatchObject({ action: 'studentAdaptiveSubmit', idToken: 'id-token', assignmentId: 'ad-1', kind: 'diagnostic', answers: { q1: 'A' } });
    expect(body).not.toHaveProperty('score');
    expect(body).not.toHaveProperty('isCorrect');
  });
});
