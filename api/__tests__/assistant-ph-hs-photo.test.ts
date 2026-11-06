import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import {
  listPendingReply, pickAssignmentByNumber, revisionReply, requestPhotoCancellation, MAX_PHOTOS, PHOTO_REPLIES, assistChooseReply, assistFreeTextReply, assistOpenReply, assistStartReply,
  assistTargetReply, cancelPhotoSession, finishPhotoSession, hasExpiredAssignmentSession,
  hasLiveAssignmentSession, hasPhotoSubmissionIntent, isCongratulation, isPendingListQuestion, openPhotoSession,
  parsePhotoCommand, pendingAssignmentsForStudent, photoListReply, photoReceivedReply,
} from '../_assistant-ph-hs-photo.js';
import { emptyQuota, chayNgam, getGradingChain } from '../_grading-core';
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
      delete: async () => { h.files.delete(path); },
      setMetadata: async (meta: any) => { const cur = h.files.get(path)!; cur.meta = { ...cur.meta, ...meta }; },
    }),
  }),
}));
vi.mock('../_grading-core', async () => ({
  ...await vi.importActual<typeof import('../_grading-core')>('../_grading-core'),
  chayNgam: vi.fn((work: Promise<unknown>) => false),
  // 30/10: khoá chấm bài do MÁY CHỦ giữ (chuỗi lớp dự phòng), không lấy khoá riêng của GV nữa.
  getGradingChain: vi.fn(() => [{ name: 'fake', tier: 're', call: async () => '{}' }]),
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
  h.db.put('classes/c1/students/s1', { name: 'Học sinh thử' });
  h.db.put('assignments/a1', { classId: 'c1', teacherId: 'gv1', title: 'BTVN tuần 5', maxScore: 10, dueAt: '2026-10-27' });
};
const openSessionForA1 = async () => {
  await openPhotoSession(BOT, USER, { studentId: 's1', classId: 'c1', teacherId: 'gv1' }, { id: 'a1', title: 'BTVN tuần 5' });
};
let photoSequence = 0;
const putPhoto = async () => await photoReceivedReply(BOT, USER, `https://photo.zalo/${++photoSequence}.jpg`);

beforeEach(() => {
  vi.clearAllMocks();
  h.db = new FakeDb();
  h.files.clear();
  photoBytes = Buffer.from('anh-bai-lam');
  photoMime = 'image/jpeg';
  fetchMock = vi.fn(async (url: unknown) => {
    const u = String(url);
    if (u.includes('bot-api.zaloplatforms.com')) return { ok: true, json: async () => ({ ok: true }) };
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
  // Khoá chấm do máy chủ giữ: mặc định "có lớp" để luồng đi tiếp, ca thiếu khoá tự set [].
  vi.mocked(getGradingChain).mockReset();
  vi.mocked(getGradingChain).mockReturnValue([{ name: 'fake', tier: 're', call: async () => '{}' } as any]);
  // Bắt TẤT CẢ promise nền (chấm + báo tin, push GV...) để test await được —
  // push HS vừa nộp (GV-1) là chayNgam thứ 2, phải await cả hai chứ không ghi đè nhau.
  const bgAll: Promise<unknown>[] = [];
  vi.mocked(chayNgam).mockImplementation((work: Promise<unknown>) => { bgAll.push(work); return false; });
  (globalThis as any).__photoBg = () => Promise.all(bgAll);
});

it('commit ảnh thành công nhưng mất xác nhận không được xóa ảnh đã gắn vào phiên', async () => {
  seedClass();
  await openSessionForA1();
  const transaction = h.db.runTransaction.bind(h.db);
  let calls = 0;
  h.db.runTransaction = async (work: any) => {
    const result = await transaction(work);
    if (++calls === 2) throw new Error('Commit acknowledgement lost');
    return result;
  };
  const url = 'https://photo.zalo/uncertain-commit.jpg';
  await photoReceivedReply(BOT, USER, url);
  expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
  expect(h.files.size).toBe(1);
  expect(await photoReceivedReply(BOT, USER, url)).toContain('đã được nhận');
  expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
});

describe('parsePhotoCommand', () => {
  it('nhận chấm / chấm N / xong, bỏ dấu và hoa/thường', () => {
    expect(parsePhotoCommand('chấm')).toEqual({ kind: 'list' });
    expect(parsePhotoCommand('chấm 2')).toEqual({ kind: 'pick', n: 2 });
    expect(parsePhotoCommand('cham 2')).toEqual({ kind: 'pick', n: 2 });
    expect(parsePhotoCommand('CHẤM 12')).toEqual({ kind: 'pick', n: 12 });
    expect(parsePhotoCommand('chấm 100')).toEqual({ kind: 'pick', n: 100 });
    expect(parsePhotoCommand('nộp hộ 100')).toEqual({ kind: 'assistPick', n: 100 });
    expect(parsePhotoCommand('chọn 100')).toEqual({ kind: 'assistChoose', n: 100 });
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
  it('chỉ trả bài thường chờ nộp của đúng lớp; bài QUÁ HẠN có nhãn; tối đa 10 bài kèm tổng số', async () => {
    seed();
    const out = await pendingAssignmentsForStudent('c1', 's1');
    expect(out.teacherId).toBe('gv1');
    // Cả a1 (hạn 27/10) và a6 (hạn 26/10) đều đã quá hạn → sắp theo hạn tăng dần, kèm nhãn quá hạn.
    expect(out.items.map(i => i.id)).toEqual(['a1', 'a6']);
    expect(out.items.every(i => i.overdue)).toBe(true);
    expect(out.total).toBe(2);
  });
  it('bài CÒN HẠN đứng trước bài quá hạn; quá hạn gắn cờ overdue', async () => {
    seed();
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    h.db.put('assignments/soon', { classId: 'c1', teacherId: 'gv1', title: 'Còn hạn', createdAt: '2026-11-06', maxScore: 10, dueAt: future, targetStudentIds: ['s1'] });
    const out = await pendingAssignmentsForStudent('c1', 's1');
    expect(out.items.map(i => i.id)).toEqual(['soon', 'a1', 'a6']);
    expect(out.items[0].overdue).toBe(false);
    expect(out.total).toBe(3);
  });
  it('lớp nhiều bài chờ nộp → trả ĐỦ mọi bài (không cắt), bài hạn gần nhất lên đầu', async () => {
    seed();
    const today = new Date();
    for (let i = 1; i <= 12; i++) {
      const due = new Date(today.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      h.db.put(`assignments/bulk-${i}`, { classId: 'c1', teacherId: 'gv1', title: `Bài số ${i}`, createdAt: String(i).padStart(3, '0'), maxScore: 10, dueAt: due });
    }
    const out = await pendingAssignmentsForStudent('c1', 's1');
    expect(out.total).toBe(14); // 12 bài mới + a1 + a6 (cả hai đã quá hạn nhưng vẫn tính vào tổng)
    expect(out.items).toHaveLength(14);
    expect(out.items[0].title).toBe('Bài số 12'); // hạn gần nhất lên đầu
    expect(out.items.filter(i => i.overdue).map(i => i.id)).toEqual(['a1', 'a6']); // quá hạn xếp sau bài còn hạn
  });
  it('lớp không tồn tại → danh sách rỗng, teacherId rỗng', async () => {
    expect(await pendingAssignmentsForStudent('nope', 's1')).toEqual({ teacherId: '', items: [], total: 0 });
  });
  it('danh sách rỗng → câu trả lời tử tế', async () => {
    h.db.put('classes/c-empty', { name: 'Lớp trống', teacherId: 'gv9' });
    expect(photoListReply((await pendingAssignmentsForStudent('c-empty', 's1')).items)).toContain('không có bài nào đang chờ');
    expect(photoListReply([])).toContain('Nhắn 0 để xem lại menu.');
  });

  it('bài có file đính kèm (PDF/Word/Ảnh) → trả về attachments kèm link', async () => {
    seedClass();
    h.db.put('assignments/a-pdf', {
      classId: 'c1', teacherId: 'gv1', title: 'Bài có PDF', maxScore: 10, dueAt: '2026-11-10',
      attachments: [
        { name: 'de-thi.pdf', url: 'https://firebasestorage.../de-thi.pdf', type: 'pdf' },
        { name: 'huong-dan.docx', url: 'https://firebasestorage.../huong-dan.docx', type: 'word' },
        { name: 'hinh-minh-hoa.jpg', url: 'https://firebasestorage.../hinh.jpg', type: 'image' },
      ],
    });
    const out = await pendingAssignmentsForStudent('c1', 's1');
    expect(out.items).toHaveLength(2); // a1 + a-pdf
    const pdfItem = out.items.find(i => i.id === 'a-pdf');
    expect(pdfItem).toBeDefined();
    expect(pdfItem!.attachments).toHaveLength(3);
    expect(pdfItem!.attachments[0].name).toBe('de-thi.pdf');
    expect(pdfItem!.attachments[0].type).toBe('pdf');
    expect(pdfItem!.attachments[0].url).toContain('de-thi.pdf');
  });

  it('photoListReply hiển thị link file đính kèm kèm icon', async () => {
    const items = [{
      id: 'a1',
      title: 'Bài có file',
      dueAt: '2026-11-10',
      overdue: false,
      attachments: [
        { name: 'de.pdf', url: 'https://example.com/de.pdf', type: 'pdf' },
        { name: 'anh.jpg', url: 'https://example.com/anh.jpg', type: 'image' },
      ],
    }];
    const reply = photoListReply(items);
    expect(reply).toContain('Đề bài: 2 tệp');
    expect(reply).not.toContain('https://example.com');
    expect(reply).not.toContain('mục nữa');
  });
});

describe('phiên nhận ảnh', () => {
  it('mở phiên: ghi doc bot_user, câu trả lời kèm tên bài và cú pháp', async () => {
    seedClass();
    const reply = await openPhotoSession(BOT, USER, { studentId: 's1', classId: 'c1', teacherId: 'gv1' }, { id: 'a1', title: 'BTVN tuần 5' });
    expect(reply).toContain('BTVN tuần 5');
    expect(reply).toContain('HƯỚNG DẪN NỘP BÀI');
    expect(reply).toContain('LƯU Ý');
    expect(reply).toContain('Nhắn 0 để xem lại menu.');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.photos).toEqual([]);
    expect(session.assignmentId).toBe('a1');
    expect(session.studentId).toBe('s1');
  });

  it('mở phiên với file đính kèm → tên tệp gọn, không lộ URL Storage', async () => {
    seedClass();
    const reply = await openPhotoSession(BOT, USER, { studentId: 's1', classId: 'c1', teacherId: 'gv1' }, {
      id: 'a1',
      title: 'Bài có PDF',
      attachments: [
        { name: 'de-thi.pdf', url: 'https://firebasestorage.../de-thi.pdf', type: 'pdf' },
        { name: 'anh.jpg', url: 'https://firebasestorage.../anh.jpg', type: 'image' },
      ],
    });
    expect(reply).toContain('Bài có PDF');
    expect(reply).toContain('Đề bài: 2 tệp đính kèm.');
    expect(reply).toContain('📄 de-thi.pdf');
    expect(reply).not.toContain('https://firebasestorage');
    expect(reply).toContain('🖼️ anh.jpg');
    expect(reply).toContain('HƯỚNG DẪN NỘP BÀI');
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

  // Sự cố 3–4/11: HS chọn bài, làm bài quá 10 phút, gửi ảnh thì phiên đã hết hạn → ảnh bị coi là
  // "đề nhờ giải", web không có bài nộp nào. Giờ phải nhận ra "vừa hết hạn" để nhắc chọn lại bài.
  it('phiên nộp vừa hết hạn → hasExpiredAssignmentSession = true (nhắc chọn lại bài)', async () => {
    seedClass();
    await openSessionForA1();
    h.db.put(SESSION_PATH, { ...h.db.rows.get(SESSION_PATH), expiresAt: Date.now() - 60_000 });
    expect(await hasExpiredAssignmentSession(BOT, USER)).toBe(true);
    expect(await hasLiveAssignmentSession(BOT, USER)).toBe(false);
  });

  it('không có phiên / hết hạn quá lâu / phiên chờ chọn bài → không coi là "vừa hết hạn"', async () => {
    expect(await hasExpiredAssignmentSession(BOT, USER)).toBe(false);
    seedClass();
    await openSessionForA1();
    // Quá 6 giờ: coi như phiên cũ, không nhắc nữa.
    h.db.put(SESSION_PATH, { ...h.db.rows.get(SESSION_PATH), expiresAt: Date.now() - 7 * 60 * 60 * 1000 });
    expect(await hasExpiredAssignmentSession(BOT, USER)).toBe(false);
    // Phiên chờ chọn bài (chưa có assignment) không tính.
    h.db.put(SESSION_PATH, { botId: BOT, userId: USER, studentId: 's1', classId: 'c1', assignmentId: '', expiresAt: Date.now() - 1, photos: [], awaitingPick: true });
    expect(await hasExpiredAssignmentSession(BOT, USER)).toBe(false);
  });
  it('nhận ảnh hợp lệ: tải về, đẩy Storage đúng đường + token, cập nhật phiên', async () => {
    seedClass();
    await openSessionForA1();
    const reply = await putPhoto();
    expect(reply).toContain(`Đã nhận ảnh 1/${MAX_PHOTOS}`);
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
  it(`đủ ${MAX_PHOTOS} ảnh → chặn ảnh tiếp theo`, async () => {
    seedClass();
    await openSessionForA1();
    h.db.put(SESSION_PATH, { ...h.db.rows.get(SESSION_PATH), photos: Array.from({ length: MAX_PHOTOS }, (_, i) => ({
      url: `u${i + 1}`, name: `zalo-${String(i + 1).padStart(2, '0')}.jpg`, mimeType: 'image/jpeg', size: 1,
    })) });
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
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
  });
  it('hết hạn mức theo em → câu từ chối y hệt web, hủy phiên', async () => {
    seedClass();
    h.db.put('gradingQuota/gv1', { ...emptyQuota(new Date().toISOString().slice(0, 10)), byStudent: { s1: 5 } });
    await openSessionForA1();
    await putPhoto();
    expect(await finishPhotoSession(BOT, USER)).toContain('Mỗi ngày em chỉ nhờ chấm được 5 bài');
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
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
    // Chấm đi đúng lõi web: actorUid = teacherId, mode quick, ngân sách bot. KHÔNG truyền khoá
    // riêng của GV (khoá chấm do máy chủ giữ; khoá Gemini của GV có thể đã cạn hạn mức).
    const call = vi.mocked(gradeOneSubmission).mock.calls[0];
    expect(call[2]).toEqual({ contextTitle: 'CTX' });
    expect(call[3]).toBe('');
    expect(call[4]).toBe('gv1');
    expect(call[5]).toBe(false);
    expect(call[6]).toBe('quick');
    expect(call[8]).toBe(55_000);
    expect(call[9]).toBe(10_000);
    expect(lastSentText()).toContain('Đã xử lý bài "BTVN tuần 5": 8/10 điểm');
    expect(lastSentText()).toContain('Nhắn 0 để xem lại menu.');
  });
  it('chưa cấu hình khoá chấm (chuỗi rỗng) → bài vẫn lưu, tin báo tử tế', async () => {
    seedClass();
    await openSessionForA1();
    await putPhoto();
    vi.mocked(getGradingChain).mockReturnValue([]);
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
  h.db.put('classes/c1/students/s1', { name: 'Học sinh thử' });
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
    expect(reply).toContain('NỘP HỘ BẠN CÙNG LỚP');
    expect(reply).toContain('HƯỚNG DẪN');
    expect(reply).toContain('LƯU Ý');
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
    expect(lastSentText()).toContain('Đã xử lý bài "BTVN tuần 5" của Cường Đẹp');
    expect(lastSentText()).not.toContain('7/10');
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
    expect(reply).toContain('xác nhận hủy');
    const session = h.db.rows.get(SESSION_PATH);
    expect(session.photos).toHaveLength(1);
    expect(session.assistState).toBeUndefined();
    expect(session.assist).toBeUndefined();
  });

  it('A2 — phiên nộp thường chưa có ảnh → nộp hộ đè được (không mất gì)', async () => {
    seedAssistClass();
    await openSessionForA1();
    const reply = await assistStartReply(BOT, USER, 'c1', 's1');
    expect(reply).toContain('NỘP HỘ BẠN CÙNG LỚP');
    expect(h.db.rows.get(SESSION_PATH).assistState).toBe('name');
  });

  it('A2 — giữa luồng nộp hộ gõ lại nộp hộ → làm lại được (đường hồi phục giữ nguyên)', async () => {
    seedAssistClass();
    await assistStartReply(BOT, USER, 'c1', 's1');
    await assistTargetReply(BOT, USER, 'c1', 'cuong dep');
    const reply = await assistStartReply(BOT, USER, 'c1', 's1');
    expect(reply).toContain('NỘP HỘ BẠN CÙNG LỚP');
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

  it('A1 — finish giữ ảnh nhận thêm sau lần đọc phiên đầu tiên', async () => {
    seedClass();
    await openSessionForA1();
    await putPhoto();
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    const snap = h.db.snap.bind(h.db);
    let paused = false;
    vi.spyOn(h.db, 'snap').mockImplementation((path: string) => {
      const value = snap(path);
      if (path === 'assignments/a1' && !paused) {
        paused = true;
        started();
        return resume.then(() => value);
      }
      return value;
    });
    const finishing = finishPhotoSession(BOT, USER);
    await ready;
    expect(await putPhoto()).toContain(`Đã nhận ảnh 2/${MAX_PHOTOS}`);
    const photos = h.db.rows.get(SESSION_PATH).photos;
    release();
    const reply = await finishing;
    await (globalThis as any).__photoBg();
    const subs = [...h.db.rows.entries()].filter(([path]) => path.startsWith('submissions/'));
    expect(subs).toHaveLength(1);
    expect(subs[0][1].fileUrls).toEqual(photos.map((photo: any) => photo.url));
    expect(subs[0][1].attachments).toHaveLength(2);
    expect(reply).toContain('(2 ảnh)');
    expect(h.db.rows.has(SESSION_PATH)).toBe(false);
    expect(h.db.rows.get('gradingQuota/gv1').selfCount).toBe(1);
  });

  it('A1 — finish phiên cũ không nộp bài hoặc xóa ảnh của phiên mở lại', async () => {
    seedClass();
    await openSessionForA1();
    await putPhoto();
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    const snap = h.db.snap.bind(h.db);
    let paused = false;
    vi.spyOn(h.db, 'snap').mockImplementation((path: string) => {
      const value = snap(path);
      if (path === 'assignments/a1' && !paused) {
        paused = true;
        started();
        return resume.then(() => value);
      }
      return value;
    });
    const finishing = finishPhotoSession(BOT, USER);
    await ready;
    await cancelPhotoSession(BOT, USER);
    await openSessionForA1();
    expect(await putPhoto()).toContain(`Đã nhận ảnh 1/${MAX_PHOTOS}`);
    const reopened = structuredClone(h.db.rows.get(SESSION_PATH));
    release();
    const reply = await finishing;
    await (globalThis as any).__photoBg();
    expect(reply).not.toContain('Đã nhận bài');
    expect([...h.db.rows.keys()].filter(path => path.startsWith('submissions/'))).toHaveLength(0);
    expect(h.db.rows.get(SESSION_PATH)).toEqual(reopened);
    expect(h.db.rows.has('gradingQuota/gv1')).toBe(false);
    expect(gradeOneSubmission).not.toHaveBeenCalled();
  });

  it.each(['graded', 'error'])('A1 — phiên cũ không nộp trùng sau khi bài đầu chuyển %s', async status => {
    seedAssistClass();
    await startAssist();
    await assistOpenReply(BOT, USER, 'c1', 's1', 1);
    await putPhoto();
    const other = 'user-2';
    h.db.put('classes/c1/students/s4', { name: 'Người nộp hộ thứ hai' });
    await assistStartReply(BOT, other, 'c1', 's4');
    await assistTargetReply(BOT, other, 'c1', 'cuong dep');
    await assistOpenReply(BOT, other, 'c1', 's4', 1);
    await photoReceivedReply(BOT, other, 'https://photo.zalo/abc.jpg');
    await finishPhotoSession(BOT, USER);
    await (globalThis as any).__photoBg();
    const path = [...h.db.rows.keys()].find(k => k.startsWith('submissions/'))!;
    h.db.put(path, { ...h.db.rows.get(path), status });
    const reply = await finishPhotoSession(BOT, other);
    expect(reply).toContain('không nộp trùng');
    expect(reply).toContain('tài khoản của Cường Đẹp');
    expect(reply).not.toContain('nhắn 2');
    expect([...h.db.rows.keys()].filter(k => k.startsWith('submissions/'))).toHaveLength(1);
    expect(h.db.rows.get('gradingQuota/gv1').selfCount).toBe(1);
  });

  it('A2 — ảnh được nhận giữa lúc đọc và thay phiên nộp hộ vẫn được giữ', async () => {
    seedAssistClass();
    await openSessionForA1();
    const snap = h.db.snap.bind(h.db);
    let injected = false;
    vi.spyOn(h.db, 'snap').mockImplementation((path: string) => {
      const value = snap(path);
      if (path === SESSION_PATH && !injected) {
        injected = true;
        h.db.put(path, { ...value.data(), photos: [{ url: 'received-photo', name: 'photo.jpg', mimeType: 'image/jpeg', size: 10 }] });
      }
      return value;
    });
    const reply = await assistStartReply(BOT, USER, 'c1', 's1');
    expect(reply).toContain('1 ảnh chưa gửi xong');
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
    expect(h.db.rows.get(SESSION_PATH).assistState).toBeUndefined();
  });

  it('A2 — ảnh tải chậm không được ghép vào phiên nộp hộ vừa thay', async () => {
    seedAssistClass();
    await openSessionForA1();
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    fetchMock.mockImplementationOnce(async () => {
      started();
      await resume;
      return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => photoBytes };
    });
    const receiving = putPhoto();
    await ready;
    await assistStartReply(BOT, USER, 'c1', 's1');
    release();
    expect(await receiving).toContain('Đã nhận ảnh');
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
    expect(h.db.rows.get(SESSION_PATH).assistState).toBeUndefined();
  });

  it('A2 — đổi từ phiên nộp hộ có ảnh sang chấm thường không xóa ảnh', async () => {
    seedAssistClass();
    await startAssist();
    await assistOpenReply(BOT, USER, 'c1', 's1', 1);
    await putPhoto();
    const reply = await openPhotoSession(BOT, USER, { studentId: 's1', classId: 'c1', teacherId: 'gv1' }, { id: 'a1', title: 'BTVN tuần 5' });
    expect(reply).toContain('1 ảnh chưa gửi xong');
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
    expect(h.db.rows.get(SESSION_PATH).assist.targetStudentId).toBe('s3');
  });

  it('A2 — ảnh tải chậm từ phiên đã hủy không ghép vào phiên mở lại cùng bài', async () => {
    seedAssistClass();
    await openSessionForA1();
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    fetchMock.mockImplementationOnce(async () => {
      started();
      await resume;
      return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => photoBytes };
    });
    const receiving = putPhoto();
    await ready;
    await cancelPhotoSession(BOT, USER);
    await openSessionForA1();
    release();
    expect(await receiving).not.toContain('Đã nhận ảnh');
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(0);
  });

  it('A2 — callback tên cũ không làm kẹt phiên mới có ảnh', async () => {
    seedAssistClass();
    await assistStartReply(BOT, USER, 'c1', 's1');
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    const collection = h.db.collection.bind(h.db);
    let paused = false;
    vi.spyOn(h.db, 'collection').mockImplementation((path: string) => {
      const query = collection(path);
      if (path === 'classes/c1/students' && !paused) {
        paused = true;
        const get = query.get;
        query.get = async () => { started(); await resume; return get(); };
      }
      return query;
    });
    const naming = assistTargetReply(BOT, USER, 'c1', 'cuong dep');
    await ready;
    await cancelPhotoSession(BOT, USER);
    await openSessionForA1();
    expect(await putPhoto()).toContain(`Đã nhận ảnh 1/${MAX_PHOTOS}`);
    const reopened = structuredClone(h.db.rows.get(SESSION_PATH));
    release();
    await naming;
    expect(h.db.rows.get(SESSION_PATH)).toEqual(reopened);
    expect(await finishPhotoSession(BOT, USER)).toContain('Đã nhận bài');
    await (globalThis as any).__photoBg();
    const submission = [...h.db.rows.entries()].find(([path]) => path.startsWith('submissions/'))![1];
    expect(submission.studentId).toBe('s1');
    expect(submission.fileUrls).toEqual(reopened.photos.map((photo: any) => photo.url));
  });

  it('A2 — callback mở bài cũ không đè phiên nộp hộ bạn khác chưa có ảnh', async () => {
    seedAssistClass();
    h.db.put('classes/c1/students/s4', { name: 'Bảo Châu' });
    await startAssist();
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const resume = new Promise<void>(resolve => { release = resolve; });
    const collection = h.db.collection.bind(h.db);
    let paused = false;
    vi.spyOn(h.db, 'collection').mockImplementation((path: string) => {
      const query = collection(path);
      if (path === 'assignments' && !paused) {
        paused = true;
        const get = query.get;
        query.get = async () => { started(); await resume; return get(); };
      }
      return query;
    });
    const opening = assistOpenReply(BOT, USER, 'c1', 's1', 1);
    await ready;
    await cancelPhotoSession(BOT, USER);
    await assistStartReply(BOT, USER, 'c1', 's1');
    await assistTargetReply(BOT, USER, 'c1', 'bao chau');
    const reopened = structuredClone(h.db.rows.get(SESSION_PATH));
    expect(reopened.assist.targetStudentId).toBe('s4');
    expect(reopened.photos).toHaveLength(0);
    release();
    expect(await opening).toBe(PHOTO_REPLIES.sessionChanged);
    expect(h.db.rows.get(SESSION_PATH)).toEqual(reopened);
    expect([...h.db.rows.keys()].filter(path => path.startsWith('submissions/'))).toHaveLength(0);
  });
});

describe('isCongratulation — sticker chúc mừng chỉ khi điểm cao đã duyệt', () => {
  it('đã duyệt + đạt ≥ 80% → chúc mừng', () => {
    expect(isCongratulation(8, 10, true)).toBe(true);
    expect(isCongratulation(10, 10, true)).toBe(true);
    expect(isCongratulation(16, 20, true)).toBe(true);
  });
  it('chưa duyệt → KHÔNG chúc mừng (điểm chưa chính thức)', () => {
    expect(isCongratulation(10, 10, false)).toBe(false);
  });
  it('điểm thấp hoặc dữ liệu hỏng → KHÔNG chúc mừng', () => {
    expect(isCongratulation(7.5, 10, true)).toBe(false);
    expect(isCongratulation(0, 10, true)).toBe(false);
    expect(isCongratulation(5, 0, true)).toBe(false);
    expect(isCongratulation(Number.NaN, 10, true)).toBe(false);
  });
});

describe('isPendingListQuestion — "tay chân" cho AI (hướng A)', () => {
  it('nhận câu hỏi tự nhiên về bài chưa nộp (có dấu và không dấu)', () => {
    for (const q of [
      'còn bài nào chưa nộp không ạ',
      'con bai nao chua nop',
      'bài nào chưa nộp vậy',
      'em chưa nộp bài nào',
      'hạn nộp bài tuần này là khi nào',
      'deadline bài tập',
      'con phải nộp gì',
      'em phải nộp bài gì',
    ]) expect(isPendingListQuestion(q)).toBe(true);
  });

  it('không nhận câu hỏi khác (để câu đi tiếp luồng AI)', () => {
    for (const q of [
      'điểm bài tuần 5 của em bao nhiêu',
      'học phân số sao cho giỏi',
      'chào bot',
      '',
      'x'.repeat(200),
    ]) expect(isPendingListQuestion(q)).toBe(false);
  });
});


describe('2026-11-06 reliable intake and immutable revisions', () => {
  it('finish waits for in-flight download and preserves all received photos', async () => {
    seedClass(); await openSessionForA1(); await putPhoto();
    let release!: () => void; let started!: () => void;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const wait = new Promise<void>(resolve => { release = resolve; });
    fetchMock.mockImplementationOnce(async () => { started(); await wait; return { ok: true, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => photoBytes }; });
    const receiving = putPhoto(); await ready;
    expect(await finishPhotoSession(BOT, USER)).toContain('Ảnh đang tải');
    expect([...h.db.rows.keys()].filter(k => k.startsWith('submissions/'))).toHaveLength(0);
    release(); await receiving;
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(2);
    expect(await finishPhotoSession(BOT, USER)).toContain('Đã nhận bài');
    expect([...h.db.rows.entries()].find(([k]) => k.startsWith('submissions/'))![1].fileUrls).toHaveLength(2);
    await (globalThis as any).__photoBg();
  });
  it('duplicate photo URL reserves and stores only once under concurrent delivery', async () => {
    seedClass(); await openSessionForA1();
    const replies = await Promise.all([photoReceivedReply(BOT, USER, 'https://photo.zalo/same.jpg'), photoReceivedReply(BOT, USER, 'https://photo.zalo/same.jpg')]);
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
    expect(h.files.size).toBe(1);
    expect(replies.some(r => r.includes('đang tải') || r.includes('đã được nhận'))).toBe(true);
  });
  it('explicit cancellation needs confirmation before discarding photos', async () => {
    seedClass(); await openSessionForA1(); await putPhoto();
    expect(await requestPhotoCancellation(BOT, USER, false)).toContain('xác nhận hủy');
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
    await requestPhotoCancellation(BOT, USER, true);
    expect(h.db.rows.has(SESSION_PATH)).toBe(false);
  });
  it('new assignment cannot silently change the displayed selection number', async () => {
    seedClass();
    await listPendingReply(BOT, USER, 'c1', 's1');
    h.db.put('assignments/newer', { classId: 'c1', teacherId: 'gv1', title: 'New', createdAt: '2099-01-01' });
    await pickAssignmentByNumber(BOT, USER, 'c1', 's1', 1);
    expect(h.db.rows.get(SESSION_PATH).assignmentId).toBe('a1');
  });
  it('list includes all assignments in newest-first order without raw attachment URLs', async () => {
    seedClass();
    for (let i = 0; i < 35; i++) h.db.put(`assignments/a${i+10}`, { classId: 'c1', teacherId: 'gv1', title: `Unique ${i}`, createdAt: String(i).padStart(3,'0'), attachments: [{ url: 'https://example.com/long', name: 'PDF', type: 'pdf' }] });
    const { items } = await pendingAssignmentsForStudent('c1','s1');
    expect(items[0].title).toBe('Unique 34');
    const reply = photoListReply(items);
    for (let i=0;i<35;i++) expect(reply).toContain(`Unique ${i}`);
    expect(reply).not.toContain('mục nữa'); expect(reply).not.toContain('https://example.com');
  });
  const seedOld = () => {
    seedClass();
    h.db.put('submissions/old', { id: 'old', classId: 'c1', teacherId: 'gv1', studentId: 's1', assignmentId: 'a1', status: 'graded', createdAt: '2026-01-01', textContent: 'old text', fileUrls: ['https://old/image.jpg'], attachments: [{ url:'https://old/image.jpg', name:'old', kind:'image' }], grade: { score:9,maxScore:10,teacherApproved:true } });
  };
  it.each(['supplement','replace'] as const)('%s creates a new attempt; official score remains unchanged', async mode => {
    seedOld();
    await revisionReply(BOT,USER,'c1','s1','student',mode);
    await revisionReply(BOT,USER,'c1','s1','student',mode,1);
    await putPhoto(); await finishPhotoSession(BOT,USER);
    const rows = [...h.db.rows.entries()].filter(([k])=>k.startsWith('submissions/'));
    expect(rows).toHaveLength(2);
    const fresh = rows.find(([k])=>k!=='submissions/old')![1];
    expect(fresh.supplementOf).toBe('old');
    expect(fresh.fileUrls).toHaveLength(mode==='supplement'?2:1);
    expect(fresh.fileUrls.includes('https://old/image.jpg')).toBe(mode==='supplement');
    expect(h.db.rows.get('submissions/old').grade.teacherApproved).toBe(true);
    expect(h.db.rows.get('submissions/old').grade.score).toBe(9);
    await (globalThis as any).__photoBg();
  });
  it('revision is rejected when another attempt appeared during upload; images retained', async () => {
    seedOld(); await revisionReply(BOT,USER,'c1','s1','student','supplement');
    await revisionReply(BOT,USER,'c1','s1','student','supplement',1); await putPhoto();
    h.db.put('submissions/newer', { classId:'c1',teacherId:'gv1',studentId:'s1',assignmentId:'a1',status:'submitted',createdAt:'2099' });
    expect(await finishPhotoSession(BOT,USER)).toContain('đã có lượt mới');
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
  });
  it('student cannot select a different student revision', async () => {
    seedOld();
    await revisionReply(BOT,USER,'c1','s2','student','replace');
    expect(await revisionReply(BOT,USER,'c1','s2','student','replace',1)).toContain('Chưa có bài');
    expect([...h.db.rows.keys()].filter(k=>k.startsWith('submissions/'))).toHaveLength(1);
  });
});


describe('submission selection and scope races', () => {
  it.each(['awaitingPick', 'assistState', 'revisionChoices'])('photo during %s stays in submission flow', async kind => {
    seedClass();
    h.db.put(SESSION_PATH, { botId: BOT, userId: USER, studentId: 's1', classId: 'c1', assignmentId: '', photos: [], expiresAt: Date.now() + 60000, [kind]: kind === 'assistState' ? 'name' : kind === 'revisionChoices' ? ['old'] : true });
    expect(await hasPhotoSubmissionIntent(BOT, USER)).toBe(true);
    const reply = await putPhoto();
    expect(reply).toBe(kind === 'assistState' ? PHOTO_REPLIES.assistIncomplete : PHOTO_REPLIES.pickFirst);
    expect(h.files.size).toBe(0);
  });
  it('switching linked profile cannot finish or append to previous student session', async () => {
    seedClass(); await openSessionForA1(); await putPhoto();
    const actor = { classId: 'c1', studentId: 'other', role: 'student' as const };
    expect(await photoReceivedReply(BOT, USER, 'https://photo.zalo/wrong.jpg', actor)).toContain('hồ sơ trước');
    expect(await finishPhotoSession(BOT, USER, actor)).toContain('hồ sơ trước');
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
    expect([...h.db.rows.keys()].filter(k => k.startsWith('submissions/'))).toHaveLength(0);
  });
  it('expired upload cleanup cannot clear a fresh reservation with the same key', async () => {
    seedClass(); await openSessionForA1(); await putPhoto();
    const old = { ...h.db.rows.get(SESSION_PATH), pendingUploads: { image: Date.now() - 200000 } };
    h.db.put(SESSION_PATH, old);
    h.db.beforeTransaction = () => h.db.put(SESSION_PATH, { ...old, pendingUploads: { image: Date.now() } });
    expect(await finishPhotoSession(BOT, USER)).toContain('Chưa nộp bài');
    expect(h.db.rows.get(SESSION_PATH).pendingUploads.image).toBeGreaterThan(old.pendingUploads.image);
    expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
  });
  it('refreshing an assignment list rotates its selection key', async () => {
    seedClass(); await listPendingReply(BOT, USER, 'c1', 's1');
    const first = h.db.rows.get(SESSION_PATH).sessionKey;
    await listPendingReply(BOT, USER, 'c1', 's1');
    expect(h.db.rows.get(SESSION_PATH).sessionKey).not.toBe(first);
  });
});


it('unlink during grading suppresses old profile results in the chat', async () => {
  seedClass(); await openSessionForA1(); await putPhoto();
  const actor = { classId: 'c1', studentId: 's1', role: 'student' as const, linkId: 'current' };
  h.db.put('channelLinks/current', { active: true, ...actor });
  vi.mocked(gradeOneSubmission).mockImplementationOnce(async (_db, submissionId) => {
    h.db.put('channelLinks/current', { active: false, ...actor });
    h.db.put(`submissions/${submissionId}`, { ...h.db.rows.get(`submissions/${submissionId}`), status: 'graded', grade: { score: 9, maxScore: 10, teacherApproved: true } });
    return { success: true };
  });
  await finishPhotoSession(BOT, USER, actor); await (globalThis as any).__photoBg();
  expect(sent().some(call => String(JSON.parse(call[1].body).text).includes('9/10'))).toBe(false);
});


it('removed student cannot finish a lingering photo session; photos and quota preserved', async () => {
  seedClass(); await openSessionForA1(); await putPhoto();
  h.db.rows.delete('classes/c1/students/s1');
  expect(await finishPhotoSession(BOT, USER)).toContain('không còn trong lớp');
  expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
  expect(h.db.rows.has('gradingQuota/gv1')).toBe(false);
  expect([...h.db.rows.keys()].filter(k => k.startsWith('submissions/'))).toHaveLength(0);
});


it('removed proxy target cannot receive a new submission', async () => {
  seedClass(); h.db.put('classes/c1/students/target', { name: 'Bạn thử' });
  await openSessionForA1(); await putPhoto();
  h.db.put(SESSION_PATH, { ...h.db.rows.get(SESSION_PATH), assist: { targetStudentId: 'target', targetName: 'Bạn thử' } });
  h.db.rows.delete('classes/c1/students/target');
  expect(await finishPhotoSession(BOT, USER)).toContain('không còn trong lớp');
  expect(h.db.rows.get(SESSION_PATH).photos).toHaveLength(1);
  expect(h.db.rows.has('gradingQuota/gv1')).toBe(false);
});


it('deduplicates identical assignment attachment URLs without hiding distinct files', async () => {
  seedClass();
  h.db.put('assignments/a1', { ...h.db.rows.get('assignments/a1'), attachments: [
    { name: 'Đề.pdf', url: 'https://example.com/de.pdf', type: 'pdf' },
    { name: 'Đề lặp.pdf', url: 'https://example.com/de.pdf', type: 'pdf' },
    { name: 'Tài liệu.pdf', url: 'https://example.com/tai-lieu.pdf', type: 'pdf' },
  ] });
  const { items } = await pendingAssignmentsForStudent('c1', 's1');
  expect(items[0].attachments.map(item => item.name)).toEqual(['Đề.pdf', 'Tài liệu.pdf']);
  expect(photoListReply(items)).toContain('Đề bài: 2 tệp');
});
