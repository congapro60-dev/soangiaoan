import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import {
  PHOTO_REPLIES, listPendingReply, parsePhotoCommand, photoReceivedReply, pickAssignmentByNumber,
} from '../_assistant-ph-hs-photo.js';

/**
 * 2 lỗi chủ dự án báo sau buổi test bằng máy HS (29/10):
 *
 * L1. Liên kết xong chỉ báo "thành công", KHÔNG gửi menu — HS phải tự nhắn 0.
 * L2. Nhắn 8 thấy danh sách bài, chọn số "1" lại nhận "Tổng quan học tập" (menu mục 1)
 *     thay vì mở phiên nhận ảnh cho bài 1.
 *
 * Harness giống assistant-ph-hs-photo.test.ts (FakeDb + mock exam-core/grading/AI).
 */
const h = vi.hoisted(() => ({ db: null as any }));

vi.mock('../_exam-core', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({
    name: 'test-bucket',
    file: () => ({ save: async () => undefined, setMetadata: async () => undefined }),
  }),
}));
vi.mock('../_grading-core', async () => ({
  ...await vi.importActual<typeof import('../_grading-core')>('../_grading-core'),
  chayNgam: vi.fn(() => false),
  getGradingApiKey: vi.fn(() => 'test-grading-key'),
}));
vi.mock('../_ai-keys', async () => ({
  ...await vi.importActual<typeof import('../_ai-keys')>('../_ai-keys'),
  ensureGeminiKey: vi.fn(async () => ({ key: 'test-grading-key', source: 'shared' })),
}));
vi.mock('../grade-homework', () => ({
  gradeContextFor: vi.fn(async () => ({ contextTitle: 'CTX' })),
  gradeOneSubmission: vi.fn(async () => ({ success: true })),
}));

const BOT = 'bot-1', USER = 'user-1';
const SESSION_PATH = `assistantPhotoSessions/${BOT}_${USER}`;

const seed = () => {
  const db = new FakeDb();
  db.put('classes/c', { joinCode: 'ACDF47', name: '11A1', teacherId: 't1' });
  db.put('classes/c/students/s', { name: 'Nguyễn Hoàng Bách' });
  db.put('assignments/a1', { classId: 'c', title: 'Bài tập tuần 3', dueAt: '2026-11-05' });
  db.put('assignments/a2', { classId: 'c', title: 'Bài tập tuần 4', dueAt: '2026-11-12' });
  h.db = db;
  return db;
};

beforeEach(() => { seed(); });

describe('L2 — chọn bài bằng số thuần (không rơi vào menu mục 1)', () => {
  it('parsePhotoCommand vẫn nhận "chấm 1"; số thuần để dispatcher xử lý theo phiên', () => {
    expect(parsePhotoCommand('chấm 1')).toEqual({ kind: 'pick', n: 1 });
    expect(parsePhotoCommand('1')).toBeNull();
  });

  it('listPendingReply ghi cờ awaitingPick + trả danh sách bài chờ nộp', async () => {
    const reply = await listPendingReply(BOT, USER, 'c', 's');
    expect(reply).toContain('Bài tập tuần 3');
    expect(reply).toContain('Nhắn SỐ THỨ TỰ bài');
    expect(h.db.rows.get(SESSION_PATH)?.awaitingPick).toBe(true);
  });

  it('pickAssignmentByNumber trả null khi KHÔNG ở trạng thái chờ chọn (để menu xử lý)', async () => {
    h.db.put(SESSION_PATH, { expiresAt: Date.now() + 60_000, photos: [], assignmentId: 'a1', assignmentTitle: 'Bài 1' });
    expect(await pickAssignmentByNumber(BOT, USER, 'c', 's', 1)).toBeNull();
  });

  it('CHỌN BÀI 1 → mở phiên nhận ảnh đúng bài 1 (không phải menu mục 1)', async () => {
    await listPendingReply(BOT, USER, 'c', 's');
    const reply = await pickAssignmentByNumber(BOT, USER, 'c', 's', 1);
    expect(reply).toContain('Bài: Bài tập tuần 3');
    expect(reply).toContain('xong');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session?.assignmentId).toBe('a1');
    expect(session?.awaitingPick).toBeUndefined();
  });

  it('chọn số 2 → đúng bài thứ 2', async () => {
    await listPendingReply(BOT, USER, 'c', 's');
    const reply = await pickAssignmentByNumber(BOT, USER, 'c', 's', 2);
    expect(reply).toContain('Bài tập tuần 4');
  });

  it('số vượt danh sách → nhắc chọn lại, GIỮ trạng thái chờ chọn', async () => {
    await listPendingReply(BOT, USER, 'c', 's');
    const reply = await pickAssignmentByNumber(BOT, USER, 'c', 's', 9);
    expect(reply).toContain('Số không khớp');
    expect(h.db.rows.get(SESSION_PATH)?.awaitingPick).toBe(true);
  });

  it('gửi ảnh khi đang chờ chọn bài → nhắc chọn bài trước, KHÔNG nhận ảnh', async () => {
    h.db.put(SESSION_PATH, { expiresAt: Date.now() + 60_000, photos: [], awaitingPick: true });
    expect(await photoReceivedReply(BOT, USER, 'https://x/y.jpg')).toBe(PHOTO_REPLIES.pickFirst);
  });

  it('bài đã nộp không còn trong danh sách chờ (không cho nộp trùng)', async () => {
    h.db.put('submissions/sub1', { classId: 'c', studentId: 's', assignmentId: 'a1' });
    const reply = await listPendingReply(BOT, USER, 'c', 's');
    expect(reply).not.toContain('Bài tập tuần 3');
    expect(reply).toContain('Bài tập tuần 4');
  });
});
