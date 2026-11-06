import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import { emptyQuota, getGradingChain, today } from '../_grading-core.js';

/**
 * Chấm lại (29/10): HS thấy điểm lượt đầu sai thì nhắn "chấm lại".
 * Chốt an toàn: 1 lần/bài, khoá nếu GV đã duyệt, không chạy song song.
 */
const h = vi.hoisted(() => ({ db: null as any, grade: vi.fn(), send: vi.fn() }));

vi.mock('../_exam-core', () => ({ getAdminDb: () => h.db, getAdminStorage: () => ({}) }));
vi.mock('../_grading-core', async () => ({
  ...await vi.importActual<typeof import('../_grading-core')>('../_grading-core'),
  // Khoá chấm bài do máy chủ giữ (chuỗi lớp dự phòng) — test chỉ cần "có lớp" để đi tiếp.
  getGradingChain: vi.fn(() => [{ name: 'fake', tier: 're', call: async () => '{}' }]),
  chayNgam: vi.fn((p: Promise<unknown>) => { void p; return false; }),
}));
vi.mock('../_ai-keys', async () => ({
  ...await vi.importActual<typeof import('../_ai-keys')>('../_ai-keys'),
  ensureGeminiKey: vi.fn(async () => ({ key: 'k', source: 'shared' })),
  AiKeyRequiredError: class extends Error {},
}));
vi.mock('../grade-homework', () => ({
  gradeContextFor: vi.fn(async () => ({})),
  gradeOneSubmission: (...args: unknown[]) => h.grade(...(args as [])),
}));
vi.mock('../_assistant-zalo-send', () => ({
  sendStyled: (...args: unknown[]) => h.send(...(args as [])),
}));

const BOT = 'bot-1', USER = 'user-1', TOKEN = 'server-bot-token';

// Import module (firebase-admin + grading-core) mất 3–5s trong môi trường test, sát ngưỡng 5s
// mặc định → tăng để không fail chập chờn (không phải lỗi logic).
vi.setConfig({ testTimeout: 30_000 });
const seed = () => {
  const db = new FakeDb();
  db.put('classes/c', { name: '11A1', teacherId: 't1' });
  db.put('assignments/a1', { classId: 'c', title: 'Bài kiểm tra 15 phút' });
  h.db = db;
  return db;
};

beforeEach(() => {
  seed();
  h.grade.mockReset();
  h.send.mockReset();
  h.grade.mockResolvedValue({ success: true });
  vi.mocked(getGradingChain).mockReturnValue([{ name: 'fake', tier: 're', call: async () => '{}' }] as never);
});

describe('requestRegrade — chặn đúng trường hợp, không đốt tiền', () => {
  it('không có bài nào đã chấm → báo chưa có bài', async () => {
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(out.kind).toBe('rejected');
    expect(out.kind === 'rejected' && out.reply).toContain('chưa có bài nào đã chấm');
  });

  it('GV đã duyệt → KHÔNG cho chấm lại (điểm đã chính thức)', async () => {
    h.db.put('submissions/sub1', {
      teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài kiểm tra 15 phút',
      status: 'graded', grade: { score: 8, maxScore: 10, gradedAt: 1000, teacherApproved: true },
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(out.kind).toBe('rejected');
    expect(out.kind === 'rejected' && out.reply).toContain('đã duyệt');
  });

  it('đã dùng lượt chấm lại → chặn lần 2', async () => {
    h.db.put('submissions/sub1', {
      teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài 1',
      status: 'graded', grade: { score: 8, maxScore: 10, gradedAt: 1000, teacherApproved: false },
      regradeRequestedAt: 5000,
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(out.kind).toBe('rejected');
    expect(out.kind === 'rejected' && out.reply).toContain('đã dùng lượt chấm lại');
  });

  it('bài đã chấm, chưa duyệt, chưa dùng lượt → BẮT ĐẦU chấm lại và đặt cờ', async () => {
    h.db.put('submissions/sub1', {
      teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài 1',
      status: 'graded', grade: { score: 8, maxScore: 10, gradedAt: 1000, teacherApproved: false },
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(out.kind).toBe('started');
    expect(h.db.rows.get('submissions/sub1')?.regradeRequestedAt).toBeGreaterThan(0);
    expect(h.db.rows.get('gradingQuota/t1')).toMatchObject({ day: today(), selfCount: 1, byStudent: { s: 1 } });
    expect(h.grade.mock.calls[0]?.slice(6)).toEqual(['thorough']);
  });

  it('bài mới nhất đã duyệt nhưng còn bài cũ CHƯA duyệt → chọn bài còn chấm lại được', async () => {
    // Lỗi thật 29/10: code cũ chọn bài MỚI NHẤT tuyệt đối; bài đó thường đã GV duyệt nên
    // HS bị từ chối oan dù vẫn còn bài khác chưa duyệt.
    h.db.put('submissions/old', {
      teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài cũ chưa duyệt',
      status: 'graded', grade: { score: 5, maxScore: 10, gradedAt: '2026-10-20T10:00:00.000Z', teacherApproved: false },
    });
    h.db.put('submissions/new', {
      teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài mới đã duyệt',
      status: 'graded', grade: { score: 9, maxScore: 10, gradedAt: '2026-10-26T10:00:00.000Z', teacherApproved: true },
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(out.kind).toBe('started');
    expect(out.kind === 'started' && out.submissionId).toBe('old');
  });

  it('chọn bài GẦN NHẤT khi có nhiều bài đã chấm', async () => {
    h.db.put('submissions/old', {
      teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài cũ',
      status: 'graded', grade: { score: 5, maxScore: 10, gradedAt: '2026-10-20T10:00:00.000Z', teacherApproved: false },
    });
    h.db.put('submissions/new', {
      teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài mới',
      status: 'graded', grade: { score: 9, maxScore: 10, gradedAt: '2026-10-26T10:00:00.000Z', teacherApproved: false },
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(out.kind).toBe('started');
    expect(out.kind === 'started' && out.submissionId).toBe('new');
  });
  it('uses server token for delivery and never leaks the unapproved score', async () => {
    h.db.put('submissions/sub1', { teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', status: 'graded', grade: { score: 7.25, maxScore: 10, teacherApproved: false } });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    expect((await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN)).kind).toBe('started');
    expect(h.send).toHaveBeenCalled();
    for (const [token, receiver, reply] of h.send.mock.calls) {
      expect(token).toBe(TOKEN);
      expect(receiver).toBe(USER);
      expect(reply).not.toContain('7.25');
      expect(reply).not.toContain('/10');
      expect(reply).toContain('thầy cô duyệt');
    }
  });
  it('fresh grading lock cannot consume the regrade allowance after selection', async () => {
    h.db.put('submissions/sub1', { teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', status: 'graded', grade: { score: 7, maxScore: 10, teacherApproved: false } });
    const realTransaction = h.db.runTransaction.bind(h.db);
    let changed = false;
    h.db.runTransaction = async (work: unknown) => {
      if (!changed) { changed = true; h.db.put('submissions/sub1', { ...h.db.rows.get('submissions/sub1'), status: 'grading' }); }
      return realTransaction(work);
    };
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const outcome = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(outcome.kind).toBe('rejected');
    expect(outcome.kind === 'rejected' && outcome.reply).toContain('đang được chấm');
    expect(h.db.rows.get('submissions/sub1').regradeRequestedAt).toBeUndefined();
    expect(h.grade).not.toHaveBeenCalled();
  });
  it('unavailable AI does not spend the one regrade allowance', async () => {
    h.db.put('submissions/sub1', { teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', status: 'graded', grade: { score: 7, maxScore: 10, teacherApproved: false } });
    vi.mocked(getGradingChain).mockReturnValue([]);
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const outcome = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(outcome.kind).toBe('rejected');
    expect(h.db.rows.get('submissions/sub1').regradeRequestedAt).toBeUndefined();
    expect(h.grade).not.toHaveBeenCalled();
  });
  it.each(['student', 'class'])('exhausted %s quota leaves allowance unused without calling AI', async scope => {
    h.db.put('submissions/sub1', { teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', status: 'graded', grade: { score: 7, maxScore: 10, teacherApproved: false } });
    const quota = { ...emptyQuota(today()), selfCount: scope === 'class' ? 100 : 5, byStudent: { s: scope === 'student' ? 5 : 0 } };
    h.db.put('gradingQuota/t1', quota);
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const outcome = await mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN);
    expect(outcome.kind).toBe('rejected');
    expect(outcome.kind === 'rejected' && outcome.reply).toContain('Mai');
    expect(h.db.rows.get('submissions/sub1').regradeRequestedAt).toBeUndefined();
    expect(h.db.rows.get('gradingQuota/t1')).toEqual(quota);
    expect(h.grade).not.toHaveBeenCalled();
  });
  it('simultaneous requests claim exactly one regrade and quota increment for the actual teacher', async () => {
    h.db.put('submissions/sub1', { teacherId: 't1', classId: 'c', studentId: 's', assignmentId: 'a1', status: 'graded', grade: { score: 7, maxScore: 10, teacherApproved: false } });
    h.db.put('gradingQuota/t1', { ...emptyQuota(today()), selfCount: 2, byStudent: { s: 2 } });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const outcomes = await Promise.all([mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN), mod.requestRegrade(BOT, USER, USER, 'c', 's', TOKEN)]);
    expect(outcomes.filter(outcome => outcome.kind === 'started')).toHaveLength(1);
    expect(h.db.rows.get('gradingQuota/t1')).toMatchObject({ selfCount: 3, byStudent: { s: 3 } });
    expect(h.grade).toHaveBeenCalledTimes(1);
    expect(h.db.rows.has(`gradingQuota/${BOT}`)).toBe(false);
  });
});
