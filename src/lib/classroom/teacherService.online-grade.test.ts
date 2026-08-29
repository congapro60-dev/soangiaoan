import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveOnlineGrade,
  deleteOnlineGrade,
  listOnlineAssignmentSubmissions,
  regradeOnlineGrade,
  saveOnlineGrade,
} from './teacherService.js';

const authMock = vi.hoisted(() => ({
  currentUser: {
    isAnonymous: false,
    getIdToken: vi.fn(async () => 'teacher-token'),
  },
}));

vi.mock('../firebase.js', () => ({ auth: authMock }));

describe('teacherService online grade', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => ({
      ok: true,
      status: 200,
      json: async () => ({ submissions: [], attempt: { id: 'attempt-1' } }),
      requestBody: JSON.parse(String(init.body)),
    })));
  });

  it('gọi đúng action chấm online và truyền idToken server', async () => {
    await saveOnlineGrade('attempt-1', { questionScores: { q1: 1 } }, 'lop-1');
    const request = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      action: 'teacherOnlineSaveGrade',
      attemptId: 'attempt-1',
      classId: 'lop-1',
      idToken: 'teacher-token',
    });
  });

  it('có đủ các thao tác review và danh sách submission online', async () => {
    await listOnlineAssignmentSubmissions('lop-1', 'asg-1');
    await approveOnlineGrade('attempt-1', 'lop-1');
    await deleteOnlineGrade('attempt-1', 'lop-1');
    await regradeOnlineGrade('attempt-1', 'lop-1');
    const actions = vi.mocked(fetch).mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)).action);
    expect(actions).toEqual([
      'teacherOnlineSubmissions',
      'teacherOnlineApproveGrade',
      'teacherOnlineDeleteGrade',
      'teacherOnlineAiRegrade',
    ]);
  });
});
