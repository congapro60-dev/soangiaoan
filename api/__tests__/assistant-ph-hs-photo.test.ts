import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import {
  PHOTO_REPLIES, assistChooseReply, assistFreeTextReply, assistOpenReply, assistStartReply,
  assistTargetReply, cancelPhotoSession, finishPhotoSession, openPhotoSession,
  parsePhotoCommand, pendingAssignmentsForStudent, photoListReply, photoReceivedReply,
} from '../_assistant-ph-hs-photo.js';
import { emptyQuota, chayNgam } from '../_grading-core';
import { gradeContextFor, gradeOneSubmission } from '../grade-homework';
import { AiKeyRequiredError, ensureGeminiKey } from '../_ai-keys';

/**
 * Việc 4 — test luồng HS nộp bài bằng ảnh qua bot Zalo.
 * DB: FakeDb dùng chung. Storage: fake file().save/setMetadata. Chấm: mock grade-homework.
 * Key AI: mock _ai-keys (giữ AiKeyRequiredError thật). chayNgam: bắt promise nền để await.
 */
const h = vi.hoisted(() => ({ db: null as any, files: new Map<string, { buffer: Buffer; meta: any }>() }));

vi.mock('../_exam-core', () => ({
  getAdminDb: () => h.db,
  getAdminStorage: () => ({
    name: 'test-bucket',
    file: (path: string) => ({
      save: async (buffer: Buffer, opts: any) => { h.files.set(path, { buffer, meta: opts }); },
      setMetadata: async (meta: any) => { const cur = h.files.get(path)!; cur.meta = { ...cur.meta, ...meta }; },
    }),
  }),
}));
vi.mock('../_grading-core', async () => ({
  ...await vi.importActual<typeof import('../_grading-core')>('../_grading-core'),
  chayNgam: vi.fn((work: Promise<unknown>) => false),
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
let fetchMock: ReturnType<typeof vi.fn>;
let photoBytes: Buffer;
let photoMime = 'image/jpeg';
const sent = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('/sendMessage'));
const lastSentText = () => JSON.parse(sent().at(-1)![1].body).text as string;

const seedClass = () => {
  h.db.put('classes/c1', { name: 'Lớp 1', teacherId: 'gv1' });
  h.db.put('assignments/a1', { classId: 'c1', teacherId: 'gv1', title: 'BTVN tuần 5', maxScore: 10, dueAt: '2026-10-27' });
};
const openSessionForA1 = async () => {
  await openPhotoSession(BOT, USER, { studentId: 's1', classId: 'c1', teacherId: 'gv1' }, { id: 'a1', title: 'BTVN tuần 5' });
};
const putPhoto = async () => await photoReceivedReply(BOT, USER, 'https://photo.zalo/abc.jpg');

beforeEach(() => {
  vi.clearAllMocks();
  h.db = new FakeDb();
  h.files.clear();
  photoBytes = Buffer.from('anh-bai-lam');
  photoMime = 'image/jpeg';
  fetchMock = vi.fn(async (url: unknown) => {
    const u = String(url);
    if (u.includes('bot-api.zaloplatforms.com')) return { ok: true, json: async () => ({}) };
    return { ok: true, headers: { get: (k: string) => k === 'content-type' ? photoMime : null }, arrayBuffer: async () => photoBytes };
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('ZALO_BOT_TOKEN', 'bot-token');
  // Mock rõ ràng trở lại (clearAllMocks không xóa implementation của test trước).
  vi.mocked(gradeContextFor).mockReset();
  vi.mocked(gradeContextFor).mockImplementation(async () => ({ contextTitle: 'CTX' } as any));
  vi.mocked(gradeOneSubmission).mockReset();
  vi.mocked(gradeOneSubmission).mockImplementation(async () => ({ success: true }));
  vi.mocked(ensureGeminiKey).mockReset();
  vi.mocked(ensureGeminiKey).mockResolvedValue({ key: 'test-grading-key', source: 'shared' } as any);
  // Bắt promise nền (chấm + báo tin) để test await được.
  let bg: Promise<unknown> | undefined;
  vi.mocked(chayNgam).mockImplementation((work: Promise<unknown>) => { bg = work; return false; });
  (globalThis as any).__photoBg = () => bg;
});

describe('parsePhotoCommand', () => {
  it('nhận chấm / chấm N / xong, bỏ dấu và hoa/thường', () => {
    expect(parsePhotoCommand('chấm')).toEqual({ kind: 'list' });
    expect(parsePhotoCommand('chấm 2')).toEqual({ kind: 'pick', n: 2 });
    expect(parsePhotoCommand('cham 2')).toEqual({ kind: 'pick', n: 2 });
    expect(parsePhotoCommand('CHẤM 12')).toEqual({ kind: 'pick', n: 12 });
    expect(parsePhotoCommand('xong')).toEqual({ kind: 'done' });
    expect(parsePhotoCommand('gui')).toEqual({ kind: 'done' });
    expect(parsePhotoCommand('gửi')).toEqual({ kind: 'done' });
  });
  it('trả null cho tin lạ', () => {
    expect(parsePhotoCommand('8')).toBeNull();
    expect(parsePhotoCommand('chấm abc')).toBeNull();
    expect(parsePhotoCommand('chấm')).not.toBeNull();
    expect(parsePhotoCommand('')).toBeNull();
    expect(parsePhotoCommand('xin chào')).toBeNull();
  });
});

describe('pendingAssignmentsForStudent', () => {
  const seed = () => {
    seedClass();
    h.db.put('assignments/a2', { classId: 'c1', teacherId: 'gv1', title: 'Thi giữa kỳ', maxScore: 10, type: 'exam' });
    h.db.put('assignments/a3', { classId: 'c1', teacherId: 'gv1', title: 'Online', maxScore: 10, deliveryMode: 'online' });
    h.db.put('assignments/a4', { classId: 'c1', teacherId: 'gv1', title: 'Đã khóa', maxScore: 10, submissionLocked: true });
    h.db.put('assignments/a5', { classId: 'c1', teacherId: 'gv1', title: 'Cho em khác', maxScore: 10, targetStudentIds: ['other'] });
    h.db.put('assignments/a6', { classId: 'c1', teacherId: 'gv1', title: 'Giao riêng', maxScore: 10, targetStudentIds: ['s1'], dueAt: '2026-10-26' });
    h.db.put('assignments/a7', { classId: 'c1', teacherId: 'gv1', title: 'Đã nộp', maxScore: 10, dueAt: '2026-10-25' });
    h.db.put('assignments/a8', { classId: 'c2', teacherId: 'gv2', title: 'Lớp khác', maxScore: 10 });
    h.db.put('submissions/sub1', { classId: 'c1', studentId: 's1', assignmentId: 'a7', status: 'graded' });
  };
  it('chỉ trả bài thường chờ nộp của đúng lớp, sắp theo hạn, tối đa 5 bài', async () => {
    seed();
    const out = await pendingAssignmentsForStudent('c1', 's1');
    expect(out.teacherId).toBe('gv1');
    expect(out.items.map(i => i.id)).toEqual(['a6', 'a1']);
    expect(out.items[0].title).toBe('Giao riêng');
  });
  it('lớp không tồn tại → danh sách rỗng, teacherId rỗng', async () => {
    expect(await pendingAssignmentsForStudent('nope', 's1')).toEqual({ teacherId: '', items: [] });
  });
  it('danh sách rỗng → câu trả lời tử tế', async () => {
    h.db.put('classes/c-empty', { name: 'Lớp trống', teacherId: 'gv9' });
    expect(photoListReply((await pendingAssignmentsForStudent('c-empty', 's1')).items)).toContain('không có bài nào đang chờ');
    expect(photoListReply([])).toContain('Nhắn 0 để xem lại menu.');
  });
});

describe('phiên nhận ảnh', () => {
  it('mở phiên: ghi doc bot_user, câu trả lời kèm tên bài và cú pháp', async () => {
    seedClass();
    const reply = await openPhotoSession(BOT, USER, { studentId: 's1', classId: 'c1', teacherId: 'gv1' }, { id: 'a1', title: 'BTVN tuần 5' });
    expect(reply).toContain('BTVN tuần 5');
    expect(reply).toContain('xong');
    expect(reply).toContain('Nhắn 0 để xem lại menu.');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.photos).toEqual([]);
    expect(session.assignmentId).toBe('a1');
    expect(session.studentId).toBe('s1');
  });
  it('nhắn 0 hủy phiên: có phiên thì xóa, không phiên thì vô hại', async () => {
    seedClass();
    await openSessionForA1();
    await cancelPhotoSession(BOT, USER);
    expect(h.db.rows.has(SESSION_PATH)).toBe(false);
    await expect(cancelPhotoSession(BOT, USER)).resolves.toBeUndefined();
  });
  it('không có phiên / phiên hết hạn → câu nhắc mở phiên, không nhận ảnh', async () => {
    expect(await photoReceivedReply(BOT, USER, 'https://photo.zalo/x.jpg')).toBe(PHOTO_REPLIES.noSession);
    seedClass();
    await openSessionForA1();
    h.db.put(SESSION_PATH, { ...h.db.rows.get(SESSION_PATH), expiresAt: Date.now() - 1 });
    expect(await photoReceivedReply(BOT, USER, 'https://photo.zalo/x.jpg')).toBe(PHOTO_REPLIES.noSession);
  });
  it('nhận ảnh hợp lệ: tải về, đẩy Storage đúng đường + token, cập nhật phiên', async () => {
    seedClass();
    await openSessionForA1();
    const reply = await putPhoto();
    expect(reply).toContain('Đã nhận ảnh 1/3');
    const [path, file] = [...h.files.entries()][0];
    expect(path).toMatch(/^accepted-homework\/c1\/s1\/[0-9a-f-]+-0$/);
    expect(file.meta.contentType).toBe('image/jpeg');
    expect(file.meta.metadata.firebaseStorageDownloadTokens).toBeTruthy();
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.photos).toHaveLength(1);
    const url: string = session.photos[0].url;
    expect(url).toContain('https://firebasestorage.googleapis.com/v0/b/test-bucket/o/');
    expect(url).toContain(encodeURIComponent(path));
    expect(url).toContain(`token=${file.meta.metadata.firebaseStorageDownloadTokens}`);
    expect(session.photos[0].name).toMatch(/^zalo-01\.jpeg$/);
  });
  it.each([
    ['mime sai', 'text/html', 'anh-bai-lam'],
    ['rỗng', 'image/jpeg', Buffer.alloc(0)],
    ['quá 10MB', 'image/jpeg', Buffer.alloc(10 * 1024 * 1024)],
  ])('ảnh %s → từ chối, phiên giữ nguyên', async (_name, mime, bytes) => {
    seedClass();
    await openSessionForA1();
    photoMime = mime; photoBytes = bytes as Buffer;
    expect(await putPhoto()).toBe(PHOTO_REPLIES.badImage);
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(0);
    expect(h.files.size).toBe(0);
  });
  it('tải ảnh lỗi mạng → từ chối', async () => {
    seedClass();
    await openSessionForA1();
    fetchMock.mockImplementation(async () => { throw new Error('network down'); });
    expect(await putPhoto()).toBe(PHOTO_REPLIES.badImage);
  });
  it('đủ 3 ảnh → chặn ảnh thứ 4', async () => {
    seedClass();
    await openSessionForA1();
    h.db.put(SESSION_PATH, { ...h.db.rows.get(SESSION_PATH), photos: [
      { url: 'u1', name: 'zalo-01.jpg', mimeType: 'image/jpeg', size: 1 },
      { url: 'u2', name: 'zalo-02.jpg', mimeType: 'image/jpeg', size: 1 },
      { url: 'u3', name: 'zalo-03.jpg', mimeType: 'image/jpeg', size: 1 },
    ] });
    expect(await putPhoto()).toBe(PHOTO_REPLIES.max);
  });
});

describe('finishPhotoSession — hợp lệ hoá trước khi chấm', () => {
  it('không có phiên → câu nhắc; phiên trống ảnh → nhắc gửi ảnh', async () => {
    expect(await finishPhotoSession(BOT, USER)).toBe(PHOTO_REPLIES.noSession);
    seedClass();
    await openSessionForA1();
    expect(await finishPhotoSession(BOT, USER)).toContain('Em chưa gửi ảnh nào');
  });
  it('bài không còn hợp lệ (thi / khóa) → hủy phiên, không tạo submission', async () => {
    seedClass();
    h.db.put('assignments/a1', { classId: 'c1', teacherId: 'gv1', title: 'Thi', maxScore: 10, type: 'exam' });
    await openSessionForA1();
    await putPhoto();
    expect(await finishPhotoSession(BOT, USER)).toContain('không còn nhận nộp');
    expect(h.db.rows.has(SESSION_PATH)).toBe(false);
    expect([...h.db.rows.keys()].filter(k => k.startsWith('submissions/'))).toHaveLength(0);
  });
  it('bài đang chờ chấm → không nộp trùng, hủy phiên', async () => {
    seedClass();
    h.db.put('submissions/sub-old', { classId: 'c1', studentId: 's1', assignmentId: 'a1', status: 'submitted' });
    await openSessionForA1();
    await putPhoto();
    expect(await finishPhotoSession(BOT, USER)).toContain('đang chờ chấm');
    expect(h.db.rows.has(SESSION_PATH)).toBe(false);
  });
  it('hết hạn mức theo em → câu từ chối y hệt web, hủy phiên', async () => {
    seedClass();
    h.db.put('gradingQuota/gv1', { ...emptyQuota(new Date().toISOString().slice(0, 10)), byStudent: { s1: 5 } });
    await openSessionForA1();
    await putPhoto();
    expect(await finishPhotoSession(BOT, USER)).toContain('Mỗi ngày em chỉ nhờ chấm được 5 bài');
    expect(h.db.rows.has(SESSION_PATH)).toBe(false);
  });
});

describe('finishPhotoSession — tạo bài nộp + chấm + báo tin', () => {
  it('chuẩn: tạo submission (khớp luồng web), xóa phiên, trừ hạn mức NGAY, báo điểm qua Zalo', async () => {
    seedClass();
    await openSessionForA1();
    await putPhoto();
    vi.mocked(gradeOneSubmission).mockImplementation(async (_db: any, submissionId: string) => {
      h.db.put(`submissions/${submissionId}`, { status: 'graded', grade: { score: 8, maxScore: 10, teacherApproved: true } });
      return { success: true };
    });
    const reply = await finishPhotoSession(BOT, USER);
    expect(reply).toContain('Đã nhận bài "BTVN tuần 5"');
    const subs = [...h.db.rows.entries()].filter(([k]) => k.startsWith('submissions/'));
    expect(subs).toHaveLength(1);
    const [subPath, sub] = subs[0];
    expect(sub.status).toBe('submitted');
    expect(sub.teacherId).toBe('gv1');
    expect(sub.classId).toBe('c1');
    expect(sub.studentId).toBe('s1');
    expect(sub.assignmentId).toBe('a1');
    expect(sub.fileUrls).toHaveLength(1);
    expect(sub.attachments[0].kind).toBe('image');
    expect(sub.textContent).toBe('');
    expect(sub.submittedBy).toMatchObject({ role: 'student', studentId: 's1' });
    expect(h.db.rows.has(SESSION_PATH)).toBe(false);
    const quota = h.db.rows.get('gradingQuota/gv1');
    expect(quota.selfCount).toBe(1);
    expect(quota.byStudent.s1).toBe(1);
    // Chấm chạy nền qua chayNgam: đợi xong rồi mới kiểm được tham số gọi.
    await (globalThis as any).__photoBg();
    // Chấm đi đúng lõi web: key pool, actorUid = teacherId, mode quick, ngân sách bot.
    const call = vi.mocked(gradeOneSubmission).mock.calls[0];
    expect(call[2]).toEqual({ contextTitle: 'CTX' });
    expect(call[3]).toBe('test-grading-key');
    expect(call[4]).toBe('gv1');
    expect(call[5]).toBe(false);
    expect(call[6]).toBe('quick');
    expect(call[8]).toBe(55_000);
    expect(call[9]).toBe(10_000);
    expect(lastSentText()).toContain('Chấm xong bài "BTVN tuần 5": 8/10 điểm');
    expect(lastSentText()).toContain('Nhắn 0 để xem lại menu.');
  });
  it('AI khoá tạm dừng (AiKeyRequiredError) → bài vẫn lưu, tin báo tử tế', async () => {
    seedClass();
    await openSessionForA1();
    await putPhoto();
    vi.mocked(ensureGeminiKey).mockRejectedValue(new AiKeyRequiredError('no_key', 'gv1'));
    await finishPhotoSession(BOT, USER);
    await (globalThis as any).__photoBg();
    expect([...h.db.rows.keys()].some(k => k.startsWith('submissions/'))).toBe(true);
    expect(lastSentText()).toContain('tạm dừng');
  });
  it('chấm xong nhưng bài lỗi → báo lỗi gốc (cắt ngắn) và hướng dẫn nhờ thầy cô', async () => {
    seedClass();
    await openSessionForA1();
    await putPhoto();
    vi.mocked(gradeOneSubmission).mockImplementation(async (_db: any, submissionId: string) => {
      h.db.put(`submissions/${submissionId}`, { status: 'error', errorMessage: 'Hết thời gian chấm.' });
      return { success: false };
    });
    await finishPhotoSession(BOT, USER);
    await (globalThis as any).__photoBg();
    expect(lastSentText()).toContain('Chưa chấm được bài');
    expect(lastSentText()).toContain('Hết thời gian chấm.');
  });
  it('lỗi bất ngờ khi chấm → tin chung, không lộ chi tiết kỹ thuật', async () => {
    seedClass();
    await openSessionForA1();
    await putPhoto();
    vi.mocked(gradeOneSubmission).mockRejectedValue(new Error('SECRET_FIREBASE_CREDENTIAL'));
    await finishPhotoSession(BOT, USER);
    await (globalThis as any).__photoBg();
    expect(lastSentText()).toContain('Có lỗi khi chấm');
    expect(lastSentText()).not.toContain('SECRET_FIREBASE_CREDENTIAL');
  });
  it('chấm xong nhưng trạng thái không rõ (không graded/error) → câu chung, không lộ lỗi kỹ thuật', async () => {
    seedClass();
    await openSessionForA1();
    await putPhoto();
    // gradeOneSubmission trả success nhưng không ghi grade (trạng thái giữ 'submitted') → nhánh dự phòng.
    await finishPhotoSession(BOT, USER);
    await (globalThis as any).__photoBg();
    expect(lastSentText()).toContain('Chưa chấm được bài');
    expect(lastSentText()).toContain('tạm dừng');
    expect(lastSentText()).not.toContain('undefined');
  });
});

describe('nộp hộ — HS gửi bài hộ bạn cùng lớp', () => {
  const seedAssistClass = () => {
    h.db.put('classes/c1', { name: 'Lớp 1', teacherId: 'gv1' });
    h.db.put('classes/c1/students/s1', { name: 'An Bình' }); // người nộp hộ
    h.db.put('classes/c1/students/s2', { name: 'An Bình' }); // trùng tên
    h.db.put('classes/c1/students/s3', { name: 'Cường Đẹp' });
    h.db.put('assignments/a1', { classId: 'c1', teacherId: 'gv1', title: 'BTVN tuần 5', maxScore: 10, dueAt: '2026-10-27' });
  };
  /** nộp hộ → gõ tên (bỏ dấu vẫn khớp) → tới bước danh sách bài của target s3. */
  const startAssist = async () => {
    await assistStartReply(BOT, USER, 'c1', 's1');
    return assistTargetReply(BOT, USER, 'c1', 'cuong dep');
  };

  it('parse: nộp hộ / nộp hộ N / chọn N, bỏ dấu; tin lạ vẫn null', () => {
    expect(parsePhotoCommand('nộp hộ')).toEqual({ kind: 'assist' });
    expect(parsePhotoCommand('nop ho 2')).toEqual({ kind: 'assistPick', n: 2 });
    expect(parsePhotoCommand('chọn 3')).toEqual({ kind: 'assistChoose', n: 3 });
    expect(parsePhotoCommand('chon 3')).toEqual({ kind: 'assistChoose', n: 3 });
    expect(parsePhotoCommand('nộp hộ abc')).toBeNull();
    expect(parsePhotoCommand('chọn')).toBeNull();
  });

  it('nộp hộ → hỏi tên, lưu pre-session chờ tên', async () => {
    seedAssistClass();
    const reply = await assistStartReply(BOT, USER, 'c1', 's1');
    expect(reply).toContain('Muốn nộp hộ bạn nào');
    expect(reply).toContain('Nhắn 0 để xem lại menu.');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.assistState).toBe('name');
    expect(session.studentId).toBe('s1');
  });

  it('gõ tên khớp 1 bạn → liệt kê bài CỦA BẠN ĐÓ + lưu target', async () => {
    seedAssistClass();
    const reply = await startAssist();
    expect(reply).toContain('Bài đang chờ nộp của Cường Đẹp');
    expect(reply).toContain('nộp hộ <số>');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.assistState).toBe('list');
    expect(session.assist).toEqual({ targetStudentId: 's3', targetName: 'Cường Đẹp' });
  });

  it('tên không có trong lớp → mời gõ lại, giữ nguyên luồng', async () => {
    seedAssistClass();
    await assistStartReply(BOT, USER, 'c1', 's1');
    const reply = await assistTargetReply(BOT, USER, 'c1', 'người lạ');
    expect(reply).toContain('Chưa thấy bạn nào');
    expect(h.db.rows.get(SESSION_PATH).assistState).toBe('name');
  });

  it('trùng tên → liệt kê chọn số; chọn 2 → đúng bạn số 2', async () => {
    seedAssistClass();
    await assistStartReply(BOT, USER, 'c1', 's1');
    const list = await assistTargetReply(BOT, USER, 'c1', 'an bình');
    expect(list).toContain('Có 2 bạn khớp');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.assistState).toBe('pick');
    expect(session.targetCandidates).toHaveLength(2);
    const reply = await assistChooseReply(BOT, USER, 'c1', 2);
    expect(reply).toContain('Bài đang chờ nộp của An Bình');
    expect(h.db.rows.get(SESSION_PATH).assist).toEqual({ targetStudentId: 's2', targetName: 'An Bình' });
  });

  it('nộp hộ <số> → mở phiên assist cho bài của bạn đó', async () => {
    seedAssistClass();
    await startAssist();
    const reply = await assistOpenReply(BOT, USER, 'c1', 's1', 1);
    expect(reply).toContain('BTVN tuần 5');
    expect(reply).toContain('nộp hộ bạn Cường Đẹp');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.assistState).toBeUndefined();
    expect(session.assist).toEqual({ targetStudentId: 's3', targetName: 'Cường Đẹp' });
    expect(session.assignmentId).toBe('a1');
  });

  it('assistFreeTextReply: ngoài luồng → null; giữa luồng → tra tên; state list → nhắc lệnh', async () => {
    expect(await assistFreeTextReply(BOT, USER, 'c1', 'xin chào')).toBeNull();
    seedAssistClass();
    await startAssist();
    expect(await assistFreeTextReply(BOT, USER, 'c1', 'hỏng biết làm')).toContain('Đang nộp hộ Cường Đẹp');
  });

  it('ảnh gửi khi đang giữa luồng nộp hộ → bị chặn, không lưu Storage', async () => {
    seedAssistClass();
    await assistStartReply(BOT, USER, 'c1', 's1');
    expect(await photoReceivedReply(BOT, USER, 'https://photo.zalo/abc.jpg')).toBe(PHOTO_REPLIES.assistIncomplete);
    expect(h.files.size).toBe(0);
    expect(await finishPhotoSession(BOT, USER)).toBe(PHOTO_REPLIES.assistIncomplete);
  });

  it('nộp hộ đầy đủ: submission tính cho bạn, submittedBy là người gửi, assistBy ghi dấu, Storage theo target, quota trừ target, tin kèm tên', async () => {
    seedAssistClass();
    await startAssist();
    await assistOpenReply(BOT, USER, 'c1', 's1', 1);
    await putPhoto();
    vi.mocked(gradeOneSubmission).mockImplementation(async (_db: any, submissionId: string) => {
      h.db.put(`submissions/${submissionId}`, { status: 'graded', grade: { score: 7, maxScore: 10, teacherApproved: false } });
      return { success: true };
    });
    const reply = await finishPhotoSession(BOT, USER);
    expect(reply).toContain('Đã nhận bài "BTVN tuần 5" của Cường Đẹp');
    const subs = [...h.db.rows.entries()].filter(([k]) => k.startsWith('submissions/'));
    expect(subs).toHaveLength(1);
    const [, sub] = subs[0];
    expect(sub.studentId).toBe('s3');
    expect(sub.submittedBy).toMatchObject({ role: 'student', studentId: 's1' });
    expect(sub.assistBy).toEqual({ studentId: 's1', name: 'An Bình', via: 'zalo_bot' });
    const [path] = [...h.files.keys()];
    expect(path).toMatch(/^accepted-homework\/c1\/s3\//);
    const quota = h.db.rows.get('gradingQuota/gv1');
    expect(quota.byStudent.s3).toBe(1);
    expect(quota.byStudent.s1).toBeUndefined();
    await (globalThis as any).__photoBg();
    expect(lastSentText()).toContain('Chấm xong bài "BTVN tuần 5" của Cường Đẹp: 7/10 điểm');
  });

  it('bạn được nộp hộ đã nộp bài rồi → chặn ngay bước tra tên, hủy luồng', async () => {
    seedAssistClass();
    h.db.put('submissions/sub-target', { classId: 'c1', studentId: 's3', assignmentId: 'a1', status: 'submitted' });
    const reply = await startAssist();
    expect(reply).toContain('không có bài nào đang chờ nộp');
    expect(h.db.rows.has(SESSION_PATH)).toBe(false);
  });

  it('nộp thường (không assist) → KHÔNG có assistBy, mọi thứ theo người gửi (regression)', async () => {
    seedAssistClass();
    await openSessionForA1();
    await putPhoto();
    await finishPhotoSession(BOT, USER);
    const [, sub] = [...h.db.rows.entries()].find(([k]) => k.startsWith('submissions/'))!;
    expect(sub.studentId).toBe('s1');
    expect(sub.assistBy).toBeUndefined();
    expect(sub.submittedBy).toMatchObject({ studentId: 's1' });
  });

  it('A2 — đang có phiên nộp thường có ảnh → chặn nộp hộ, giữ nguyên phiên', async () => {
    seedAssistClass();
    await openSessionForA1();
    await putPhoto();
    const reply = await assistStartReply(BOT, USER, 'c1', 's1');
    expect(reply).toContain('đang nộp bài "BTVN tuần 5" với 1 ảnh');
    expect(reply).toContain('0 để hủy');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.photos).toHaveLength(1);
    expect(session.assistState).toBeUndefined();
    expect(session.assist).toBeUndefined();
  });

  it('A2 — phiên nộp thường chưa có ảnh → nộp hộ đè được (không mất gì)', async () => {
    seedAssistClass();
    await openSessionForA1();
    const reply = await assistStartReply(BOT, USER, 'c1', 's1');
    expect(reply).toContain('Muốn nộp hộ bạn nào');
    expect(h.db.rows.get(SESSION_PATH).assistState).toBe('name');
  });

  it('A2 — giữa luồng nộp hộ gõ lại nộp hộ → làm lại được (đường hồi phục giữ nguyên)', async () => {
    seedAssistClass();
    await assistStartReply(BOT, USER, 'c1', 's1');
    await assistTargetReply(BOT, USER, 'c1', 'cuong dep');
    const reply = await assistStartReply(BOT, USER, 'c1', 's1');
    expect(reply).toContain('Muốn nộp hộ bạn nào');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.assistState).toBe('name');
    expect(session.assist).toBeUndefined();
  });

  it('A3 — nộp hộ: tin hoàn tất + tin điểm dẫn về tài khoản bạn được nộp hộ, không dẫn "nhắn 2"', async () => {
    seedAssistClass();
    await startAssist();
    await assistOpenReply(BOT, USER, 'c1', 's1', 1);
    await putPhoto();
    vi.mocked(gradeOneSubmission).mockImplementation(async (_db: any, submissionId: string) => {
      h.db.put(`submissions/${submissionId}`, { status: 'graded', grade: { score: 7, maxScore: 10, teacherApproved: false } });
      return { success: true };
    });
    const reply = await finishPhotoSession(BOT, USER);
    expect(reply).toContain('tài khoản của Cường Đẹp');
    expect(reply).not.toContain('nhắn 2 để xem kết quả');
    await (globalThis as any).__photoBg();
    expect(lastSentText()).toContain('Điểm và nhận xét hiện trên tài khoản của Cường Đẹp.');
    expect(lastSentText()).not.toContain('nhắn 2');
  });

  it('A1 — 2 HS nộp hộ cùng bạn cùng lúc: transaction chặn, chỉ 1 submission, quota trừ đúng 1', async () => {
    seedAssistClass();
    h.db.put('classes/c1/students/s4', { name: 'Bảo Châu' }); // người gửi thứ 2
    await startAssist(); // user-1 (s1) → target s3
    await assistOpenReply(BOT, USER, 'c1', 's1', 1);
    await putPhoto();
    const U2 = 'user-2'; // user-2 (s4) → cùng nộp hộ s3, cùng bài a1
    await assistStartReply(BOT, U2, 'c1', 's4');
    await assistTargetReply(BOT, U2, 'c1', 'cuong dep');
    await assistOpenReply(BOT, U2, 'c1', 's4', 1);
    await photoReceivedReply(BOT, U2, 'https://photo.zalo/abc.jpg');
    const replies = await Promise.all([finishPhotoSession(BOT, USER), finishPhotoSession(BOT, U2)]);
    expect(replies.filter(r => r.includes('Đã nhận bài'))).toHaveLength(1);
    expect(replies.filter(r => r.includes('không nộp trùng'))).toHaveLength(1);
    const subs = [...h.db.rows.keys()].filter(k => k.startsWith('submissions/'));
    expect(subs).toHaveLength(1);
    const quota = h.db.rows.get('gradingQuota/gv1');
    expect(quota.selfCount).toBe(1);
    expect(quota.byStudent.s3).toBe(1);
    expect(quota.byStudent.s1).toBeUndefined();
  });
});
