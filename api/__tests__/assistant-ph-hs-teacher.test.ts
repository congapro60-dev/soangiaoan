import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import { notifyTeacherNewSubmission, parseTeacherCommand, teacherBotReply, teacherMenuReply } from '../_assistant-ph-hs-teacher.js';

/**
 * GV-1 — vai thầy cô trên bot Zalo, phạm vi CHỈ ĐỌC.
 * DB: FakeDb; resolveChannelActor THẬT chạy trên FakeDb (link GV không có field role = teacher).
 * sendStyled: mock ghi calls — không fetch Zalo thật.
 */
vi.mock('../_exam-core', () => ({ getAdminDb: () => h.db.db, getAdminStorage: () => ({ name: 'b', file: () => ({ save: async () => {}, setMetadata: async () => {} }) }) }));
const sendStyled = vi.fn(async () => {});
vi.mock('../_assistant-zalo-send', () => ({ sendStyled: (...args: unknown[]) => sendStyled(...(args as [])), sendTyping: () => {}, secretEqual: () => false }));

const h = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

const BOT = 'bot-1', GV = 'user-gv', PH = 'user-ph', GV2 = 'user-gv2';
const teacherLink = (user: string) => h.db.put(`channelLinks/l_${user}`, { firebaseUid: 'gv1', channel: 'zalo_bot', channelAccountId: BOT, channelUserId: user, channelChatId: user, active: true, createdAt: 1, updatedAt: 1 });
const parentLink = (user: string) => h.db.put(`channelLinks/p_${user}`, { firebaseUid: 'pinlink:parent:c1:s1', channel: 'zalo_bot', channelAccountId: BOT, channelUserId: user, channelChatId: user, active: true, createdAt: 1, updatedAt: 1, role: 'parent', classId: 'c1', studentId: 's1' });
const seedClass = (roster: string[]) => {
  h.db.put('classes/c1', { name: '11Columbus', grade: '11', teacherId: 'gv1' });
  roster.forEach(id => h.db.put(`classes/c1/students/${id}`, { name: `HS ${id}`, classId: 'c1', teacherId: 'gv1' }));
};

beforeEach(() => {
  h.db = new FakeDb();
  sendStyled.mockClear();
});

describe('parseTeacherCommand', () => {
  it('nhận lệnh có/không dấu, hoa thường', () => {
    expect(parseTeacherCommand('gv')).toBe('menu');
    expect(parseTeacherCommand('/gv')).toBe('menu');
    expect(parseTeacherCommand('LỚP')).toBe('classes');
    expect(parseTeacherCommand('Chưa nộp')).toBe('pending');
    expect(parseTeacherCommand('xem chua nop')).toBe('pending');
    expect(parseTeacherCommand('web')).toBe('web');
    expect(parseTeacherCommand('hello')).toBeNull();
    expect(parseTeacherCommand('R6RCFC 1234 hoc sinh')).toBeNull();
  });
});

describe('teacherBotReply — quyền', () => {
  it('không có link nào → câu chặn, không gửi gì', async () => {
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'lop');
    expect(reply).toBe('Chỉ thầy cô mới dùng được lệnh này.');
    expect(sendStyled).not.toHaveBeenCalled();
  });
  it('link PH gõ lệnh GV → câu chặn (link teacher không tồn tại)', async () => {
    parentLink(PH);
    const reply = await teacherBotReply(h.db.db as never, BOT, PH, PH, 'token', 'lop');
    expect(reply).toBe('Chỉ thầy cô mới dùng được lệnh này.');
    expect(sendStyled).not.toHaveBeenCalled();
  });
  it('tin thường (không khớp lệnh GV) → null, luồng cũ chạy tiếp', async () => {
    teacherLink(GV);
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'xin chào');
    expect(reply).toBeNull();
    expect(sendStyled).not.toHaveBeenCalled();
  });
});

describe('teacherBotReply — lệnh đọc', () => {
  beforeEach(() => { teacherLink(GV); });

  it('gv → menu thầy cô', async () => {
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'gv');
    expect(reply).toBe('');
    expect(teacherMenuReply()).toContain('MENU THẦY CÔ');
    expect(sendStyled.mock.calls[0]?.[0]).toBe('token');
    expect(String(sendStyled.mock.calls[0]?.[2])).toContain('lop');
  });
  it('lop → danh sách lớp kèm sĩ số', async () => {
    seedClass(['s1', 's2', 's3']);
    h.db.put('classes/c2', { name: '12Newton', teacherId: 'gv1' });
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'lop');
    expect(reply).toBe('');
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('11Columbus — 11 — 3 HS');
    expect(text).toContain('12Newton — 0 HS');
    expect(text).not.toContain('c1'); // không lộ document id
  });
  it('chua nop → đếm đã nộp/chưa nộp theo bài đang mở, bỏ bài đóng', async () => {
    seedClass(['s1', 's2', 's3']);
    h.db.put('assignments/a1', { classId: 'c1', teacherId: 'gv1', title: 'BTVN tuần 5', dueAt: '2026-10-27', isOpen: true });
    h.db.put('assignments/a2', { classId: 'c1', teacherId: 'gv1', title: 'Bài đóng', isOpen: false });
    h.db.put('submissions/sub1', { teacherId: 'gv1', classId: 'c1', studentId: 's1', assignmentId: 'a1' });
    h.db.put('submissions/sub2', { teacherId: 'gv1', classId: 'c1', studentId: 's2', assignmentId: 'a1' });
    await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'chua nop');
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('BTVN tuần 5 — hạn 2026-10-27: đã nộp 2/3 — còn 1 chưa nộp');
    expect(text).not.toContain('Bài đóng');
  });
  it('web → gửi URL thuần (markdown false) để bấm được', async () => {
    await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'web');
    expect(sendStyled).toHaveBeenCalledTimes(1);
    expect(sendStyled.mock.calls[0]?.[3]).toBe(false);
    expect(String(sendStyled.mock.calls[0]?.[2])).toMatch(/^https?:\/\//);
  });
});

describe('notifyTeacherNewSubmission — push HS vừa nộp bài', () => {
  it('push tới mọi bot-link teacher NGOẠI TRỪ tài khoản vừa nộp; link PH không nhận', async () => {
    teacherLink(GV);
    teacherLink(GV2);
    parentLink('user-ph');
    seedClass(['s1']);
    await notifyTeacherNewSubmission(h.db.db as never, 'token', {
      teacherId: 'gv1', classId: 'c1', studentId: 's1', assignmentTitle: 'BTVN tuần 5', photoCount: 2, fromUserId: GV2,
    });
    expect(sendStyled).toHaveBeenCalledTimes(1); // GV nhận, GV2 là fromUser → bỏ qua, PH → bỏ qua
    expect(sendStyled.mock.calls[0]?.[1]).toBe(GV);
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('HS s1'); // fallback tên theo studentId khi không seed tên riêng
    expect(text).toContain('11Columbus'); // tên lớp
    expect(text).toContain('BTVN tuần 5');
    expect(text).toContain('2 ảnh');
  });
  it('GV chưa link bot → không push, không lỗi', async () => {
    seedClass(['s1']);
    await notifyTeacherNewSubmission(h.db.db as never, 'token', {
      teacherId: 'gv1', classId: 'c1', studentId: 's1', assignmentTitle: 'BTVN', photoCount: 1, fromUserId: GV,
    });
    expect(sendStyled).not.toHaveBeenCalled();
  });
  it('lấy tên HS thật từ roster', async () => {
    teacherLink(GV);
    seedClass(['s1']);
    h.db.put('classes/c1/students/s1', { name: 'Nguyễn Văn A', classId: 'c1', teacherId: 'gv1' });
    await notifyTeacherNewSubmission(h.db.db as never, 'token', {
      teacherId: 'gv1', classId: 'c1', studentId: 's1', assignmentTitle: 'BTVN', photoCount: 1, fromUserId: GV2,
    });
    expect(String(sendStyled.mock.calls[0]?.[2])).toContain('Nguyễn Văn A');
  });
});
