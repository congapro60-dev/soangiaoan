import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';

/**
 * Lỗi chủ dự án báo 29/10: HS gửi ẢNH ĐỀ nhờ giải → bot trả "dữ liệu chưa có trên hệ thống".
 * Nguyên nhân: mọi ảnh đều bị coi là ảnh NỘP BÀI; không có phiên nộp thì bot trả
 * PHOTO_REPLIES.noSession. Nay ảnh ngoài phiên nộp = ĐỀ BÀI → vision giải.
 */

const h = vi.hoisted(() => ({ db: null as any, vision: vi.fn(), photo: vi.fn() }));

vi.mock('../_exam-core', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({ name: 'b', file: () => ({ save: async () => undefined, setMetadata: async () => undefined }) }),
}));
vi.mock('../_grading-core', async () => ({
  ...await vi.importActual<typeof import('../_grading-core')>('../_grading-core'),
  callOpenAiCompatibleVision: (...args: unknown[]) => h.vision(...(args as [])),
  chayNgam: vi.fn(() => false),
  getGradingApiKey: vi.fn(() => 'k'),
}));
vi.mock('../_ai-keys', async () => ({
  ...await vi.importActual<typeof import('../_ai-keys')>('../_ai-keys'),
  ensureGeminiKey: vi.fn(async () => ({ key: 'k', source: 'shared' })),
}));

const BOT = 'bot-1', USER = 'user-1';
const SESSION_PATH = `assistantPhotoSessions/${BOT}_${USER}`;

// Import module (kèm firebase-admin + grading-core) mất 3–4s trong môi trường test,
// sát ngưỡng 5s mặc định → tăng để test không chập chờn (không phải lỗi logic).
vi.setConfig({ testTimeout: 30_000 });

beforeEach(() => {
  const db = new FakeDb();
  db.put('classes/c', { joinCode: 'ACDF47', name: '11A1', teacherId: 't1' });
  db.put('classes/c/students/s', { name: 'Nguyễn Hoàng Bách' });
  h.db = db;
  h.vision.mockReset();
  h.photo.mockReset();
  process.env.PH_CHAT_VILAO_KEY = 'test-key';
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    headers: new Map([['content-type', 'image/jpeg']]),
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  })) as any;
});

describe('ảnh đề nhờ giải — KHÔNG bị coi là ảnh nộp bài', () => {
  it('hasLiveAssignmentSession = false khi không có phiên nộp', async () => {
    const photo = await import('../_assistant-ph-hs-photo.js');
    expect(await photo.hasLiveAssignmentSession(BOT, USER)).toBe(false);
  });

  it('hasLiveAssignmentSession = true khi ĐÃ chọn bài (đang nộp)', async () => {
    const photo = await import('../_assistant-ph-hs-photo.js');
    h.db.put(SESSION_PATH, { expiresAt: Date.now() + 60_000, photos: [], assignmentId: 'a1', assignmentTitle: 'Bài 1' });
    expect(await photo.hasLiveAssignmentSession(BOT, USER)).toBe(true);
  });

  it('hasLiveAssignmentSession = false khi đang chờ CHỌN bài (chưa có assignment)', async () => {
    const photo = await import('../_assistant-ph-hs-photo.js');
    h.db.put(SESSION_PATH, { expiresAt: Date.now() + 60_000, photos: [], awaitingPick: true });
    expect(await photo.hasLiveAssignmentSession(BOT, USER)).toBe(false);
  });

  it('fetchPhotoBuffer tải ảnh đúng mime; ảnh sai định dạng → null', async () => {
    const mod = await import('../_assistant-ph-hs-image-solve.js');
    const ok = await mod.fetchPhotoBuffer('https://photo.zalo/a.jpg');
    expect(ok?.mimeType).toBe('image/jpeg');
    globalThis.fetch = vi.fn(async () => ({ ok: true, headers: new Map([['content-type', 'text/html']]), arrayBuffer: async () => new ArrayBuffer(3) })) as any;
    expect(await mod.fetchPhotoBuffer('https://photo.zalo/a.html')).toBeNull();
  });

  it('solveProblemFromImage trả lời giải từ vision (không phải câu "chưa có dữ liệu")', async () => {
    const mod = await import('../_assistant-ph-hs-image-solve.js');
    h.vision.mockResolvedValue('Đề: Tính thể tích chóp. Giải: V = ⅓a³.');
    const report: any = { studentName: 'Bách', className: '11A1', results: [], officialCount: 0, pendingCount: 0, missingCount: 0, progress: { trend: 'flat' }, strengths: [], areasToPractice: [], parentActions: [] };
    const answer = await mod.solveProblemFromImage({ buffer: Buffer.from([1, 2, 3]), mimeType: 'image/jpeg' }, report, new Set());
    expect(answer?.text).toContain('thể tích');
    expect(answer?.text).not.toContain('chưa có');
    // Cặp đầu tiên chạy được là dừng — không thử hết chuỗi.
    expect(h.vision).toHaveBeenCalledTimes(1);
  });

  it('403 ở cặp đầu (key chưa đăng ký model) → TỰ THỬ cặp sau, vẫn ra lời giải', async () => {
    const mod = await import('../_assistant-ph-hs-image-solve.js');
    // Lỗi thật 29/10: PH_CHAT_VILAO_KEY chưa đăng ký gemini-3.8-flash → 403 FORBIDDEN.
    h.vision.mockRejectedValueOnce(new Error('kênh rẻ trả lỗi 403: Please subscribe to model in the API Key: gemini-3.8-flash'));
    h.vision.mockResolvedValueOnce('Giải: V = a³/3.');
    const report: any = { studentName: 'B', className: 'C', results: [], officialCount: 0, pendingCount: 0, missingCount: 0, progress: { trend: 'flat' }, strengths: [], areasToPractice: [], parentActions: [] };
    const answer = await mod.solveProblemFromImage({ buffer: Buffer.from([1]), mimeType: 'image/jpeg' }, report, new Set());
    expect(answer?.text).toContain('Giải');
    expect(h.vision).toHaveBeenCalledTimes(2);
  });

  it('solveProblemFromImage trả null khi vision lỗi → caller gửi câu "bận"', async () => {
    const mod = await import('../_assistant-ph-hs-image-solve.js');
    h.vision.mockRejectedValue(new Error('boom'));
    const report: any = { studentName: 'B', className: 'C', results: [], officialCount: 0, pendingCount: 0, missingCount: 0, progress: { trend: 'flat' }, strengths: [], areasToPractice: [], parentActions: [] };
    expect(await mod.solveProblemFromImage({ buffer: Buffer.from([1]), mimeType: 'image/jpeg' }, report, new Set())).toBeNull();
    expect(mod.IMAGE_SOLVE_REPLIES.busy).toContain('bận');
  });

  it('thiếu key AI → null (không gọi vision, không crash)', async () => {
    const mod = await import('../_assistant-ph-hs-image-solve.js');
    delete process.env.PH_CHAT_VILAO_KEY;
    const report: any = { studentName: 'B', className: 'C', results: [], officialCount: 0, pendingCount: 0, missingCount: 0, progress: { trend: 'flat' }, strengths: [], areasToPractice: [], parentActions: [] };
    expect(await mod.solveProblemFromImage({ buffer: Buffer.from([1]), mimeType: 'image/jpeg' }, report, new Set())).toBeNull();
    expect(h.vision).not.toHaveBeenCalled();
  });

  it('prompt gửi vision có quy tắc ĐỌC ĐỀ TRONG ẢNH + không bịa dữ kiện', async () => {
    const mod = await import('../_assistant-ph-hs-image-solve.js');
    h.vision.mockResolvedValue('ok');
    const report: any = { studentName: 'B', className: 'C', results: [], officialCount: 0, pendingCount: 0, missingCount: 0, progress: { trend: 'flat' }, strengths: [], areasToPractice: [], parentActions: [] };
    await mod.solveProblemFromImage({ buffer: Buffer.from([1]), mimeType: 'image/jpeg' }, report, new Set());
    const prompt = String(h.vision.mock.calls[0][0]);
    expect(prompt).toContain('ẢNH HỌC SINH GỬI LÀ ĐỀ BÀI');
    expect(prompt).toContain('KHÔNG bịa thêm dữ kiện');
    expect(prompt).toContain('ảnh mờ');
  });
});
