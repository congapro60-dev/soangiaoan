import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';

/**
 * Chấm lại (29/10): HS thấy điểm lượt đầu sai thì nhắn "chấm lại".
 * Chốt an toàn: 1 lần/bài, khoá nếu GV đã duyệt, không chạy song song.
 */
const h = vi.hoisted(() => ({ db: null as any, grade: vi.fn(), send: vi.fn() }));

vi.mock('../_exam-core', () => ({ getAdminDb: () => h.db, getAdminStorage: () => ({}) }));
vi.mock('../_grading-core', async () => ({
  ...await vi.importActual<typeof import('../_grading-core')>('../_grading-core'),
  getGradingApiKey: vi.fn(() => 'k'),
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

const BOT = 'bot-1', USER = 'user-1';
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
});

describe('requestRegrade — chặn đúng trường hợp, không đốt tiền', () => {
  it('không có bài nào đã chấm → báo chưa có bài', async () => {
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's');
    expect(out.kind).toBe('rejected');
    expect(out.kind === 'rejected' && out.reply).toContain('chưa có bài nào đã chấm');
  });

  it('GV đã duyệt → KHÔNG cho chấm lại (điểm đã chính thức)', async () => {
    h.db.put('submissions/sub1', {
      classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài kiểm tra 15 phút',
      status: 'graded', grade: { score: 8, maxScore: 10, gradedAt: 1000, teacherApproved: true },
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's');
    expect(out.kind).toBe('rejected');
    expect(out.kind === 'rejected' && out.reply).toContain('đã duyệt');
  });

  it('đã dùng lượt chấm lại → chặn lần 2', async () => {
    h.db.put('submissions/sub1', {
      classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài 1',
      status: 'graded', grade: { score: 8, maxScore: 10, gradedAt: 1000, teacherApproved: false },
      regradeRequestedAt: 5000,
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's');
    expect(out.kind).toBe('rejected');
    expect(out.kind === 'rejected' && out.reply).toContain('đã dùng lượt chấm lại');
  });

  it('bài đã chấm, chưa duyệt, chưa dùng lượt → BẮT ĐẦU chấm lại và đặt cờ', async () => {
    h.db.put('submissions/sub1', {
      classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài 1',
      status: 'graded', grade: { score: 8, maxScore: 10, gradedAt: 1000, teacherApproved: false },
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's');
    expect(out.kind).toBe('started');
    expect(h.db.rows.get('submissions/sub1')?.regradeRequestedAt).toBeGreaterThan(0);
  });

  it('bài mới nhất đã duyệt nhưng còn bài cũ CHƯA duyệt → chọn bài còn chấm lại được', async () => {
    // Lỗi thật 29/10: code cũ chọn bài MỚI NHẤT tuyệt đối; bài đó thường đã GV duyệt nên
    // HS bị từ chối oan dù vẫn còn bài khác chưa duyệt.
    h.db.put('submissions/old', {
      classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài cũ chưa duyệt',
      status: 'graded', grade: { score: 5, maxScore: 10, gradedAt: '2026-10-20T10:00:00.000Z', teacherApproved: false },
    });
    h.db.put('submissions/new', {
      classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài mới đã duyệt',
      status: 'graded', grade: { score: 9, maxScore: 10, gradedAt: '2026-10-26T10:00:00.000Z', teacherApproved: true },
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's');
    expect(out.kind).toBe('started');
    expect(out.kind === 'started' && out.submissionId).toBe('old');
  });

  it('chọn bài GẦN NHẤT khi có nhiều bài đã chấm', async () => {
    h.db.put('submissions/old', {
      classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài cũ',
      status: 'graded', grade: { score: 5, maxScore: 10, gradedAt: '2026-10-20T10:00:00.000Z', teacherApproved: false },
    });
    h.db.put('submissions/new', {
      classId: 'c', studentId: 's', assignmentId: 'a1', assignmentTitle: 'Bài mới',
      status: 'graded', grade: { score: 9, maxScore: 10, gradedAt: '2026-10-26T10:00:00.000Z', teacherApproved: false },
    });
    const mod = await import('../_assistant-ph-hs-regrade.js');
    const out = await mod.requestRegrade(BOT, USER, USER, 'c', 's');
    expect(out.kind).toBe('started');
    expect(out.kind === 'started' && out.submissionId).toBe('new');
  });
});
