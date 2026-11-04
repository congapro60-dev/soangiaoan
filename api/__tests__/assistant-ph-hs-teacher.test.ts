import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import {
  notifyTeacherNewSubmission,
  parseTeacherCommand,
  teacherBotReply,
  teacherClassDetailReply,
  teacherClassesReply,
  teacherMenuReply,
  teacherSwitchBackReply,
  teacherSwitchRole,
} from '../_assistant-ph-hs-teacher.js';

/**
 * GV-1 & GV-2 — vai thầy cô trên bot Zalo.
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
const seedClass = (studentIds: string[]) => {
  h.db.put('classes/c1', { name: '11Columbus', grade: '11', teacherId: 'gv1', joinCode: 'R6RCFC' });
  for (const s of studentIds) h.db.put(`classes/c1/students/${s}`, { name: s === 's1' ? 'Tuệ Minh' : `Học sinh ${s}`, status: 'active' });
};

beforeEach(() => {
  h.db = new FakeDb();
  sendStyled.mockClear();
});

describe('parseTeacherCommand', () => {
  it('nhận lệnh có/không dấu, hoa thường', () => {
    expect(parseTeacherCommand('gv')).toEqual({ kind: 'menu' });
    expect(parseTeacherCommand('/gv')).toEqual({ kind: 'menu' });
    expect(parseTeacherCommand('LỚP')).toEqual({ kind: 'classes' });
    expect(parseTeacherCommand('Chưa nộp')).toEqual({ kind: 'pending' });
    expect(parseTeacherCommand('xem chua nop')).toEqual({ kind: 'pending' });
    expect(parseTeacherCommand('web')).toEqual({ kind: 'web' });
    expect(parseTeacherCommand('hello')).toBeNull();
    expect(parseTeacherCommand('R6RCFC 1234 hoc sinh')).toBeNull();
  });

  it('nhận chọn số lớp và lệnh đổi vai', () => {
    expect(parseTeacherCommand('1')).toEqual({ kind: 'classDetail', classIndex: 1, isBareNumber: true });
    expect(parseTeacherCommand('lop 2')).toEqual({ kind: 'classDetail', classIndex: 2, isBareNumber: false });
    expect(parseTeacherCommand('đổi vai Tuệ Minh')).toEqual({ kind: 'switch', query: 'tue minh', role: 'student' });
    expect(parseTeacherCommand('đổi vai ph Tuệ Minh')).toEqual({ kind: 'switch', query: 'tue minh', role: 'parent' });
    expect(parseTeacherCommand('đổi vai gv')).toEqual({ kind: 'switchBack' });
    expect(parseTeacherCommand('ve gv')).toEqual({ kind: 'switchBack' });
    expect(parseTeacherCommand('đổi vai')).toEqual({ kind: 'switchGuide', isBare: true });
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

describe('teacherBotReply — lệnh đọc & tương tác', () => {
  beforeEach(() => { teacherLink(GV); });

  it('gv → menu thầy cô', async () => {
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'gv');
    expect(reply).toBe('');
    expect(teacherMenuReply()).toContain('MENU GIÁO VIÊN');
    expect(sendStyled.mock.calls[0]?.[0]).toBe('token');
    expect(String(sendStyled.mock.calls[0]?.[2])).toContain('lop');
  });

  it('lop → danh sách lớp kèm sĩ số và hướng dẫn bấm số', async () => {
    seedClass(['s1', 's2', 's3']);
    h.db.put('classes/c2', { name: '12Newton', teacherId: 'gv1' });
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'lop');
    expect(reply).toBe('');
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('11Columbus');
    expect(text).toContain('12Newton — 0 HS');
    expect(text).toContain('Nhắn số thứ tự lớp');
    expect(text).not.toContain('c1'); // không lộ document id
  });

  it('bấm 1 → xem chi tiết lớp 1 kèm mã PIN và joinCode', async () => {
    seedClass(['s1', 's2']);
    h.db.put('classes/c1/studentSecrets/s1', { pinPlain: '1234' });
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', '1');
    expect(reply).toBe('');
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('LỚP: 11Columbus');
    expect(text).toContain('R6RCFC');
    expect(text).toContain('Tuệ Minh — PIN: 1234');
    expect(text).toContain('ĐỔI VAI ĐỂ THỬ BOT');
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
    expect(sendStyled.mock.calls[0]?.[3]).toBe(false);
  });
});

describe('teacherSwitchRole & teacherSwitchBackReply', () => {
  beforeEach(() => {
    teacherLink(GV);
    seedClass(['s1', 's2']);
  });

  it('đổi vai theo tên học sinh thành công, kích hoạt link role student', async () => {
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'đổi vai Tuệ Minh');
    expect(reply).toBe('');
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('ĐÃ CHUYỂN SANG VAI HỌC SINH: Tuệ Minh');

    // Kiểm tra link student được tạo
    const links = await h.db.db.collection('channelLinks')
      .where('channelUserId', '==', GV)
      .where('role', '==', 'student')
      .get();
    expect(links.docs.length).toBe(1);
    expect(links.docs[0]?.data().active).toBe(true);
    expect(links.docs[0]?.data().studentName).toBe('Tuệ Minh');
  });

  it('đổi vai ph theo tên học sinh thành công, kích hoạt link role parent', async () => {
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'đổi vai ph Tuệ Minh');
    expect(reply).toBe('');
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('ĐÃ CHUYỂN SANG VAI PHỤ HUYNH: Tuệ Minh');

    const links = await h.db.db.collection('channelLinks')
      .where('channelUserId', '==', GV)
      .where('role', '==', 'parent')
      .get();
    expect(links.docs.length).toBe(1);
    expect(links.docs[0]?.data().active).toBe(true);
  });

  it('gv hoặc ve gv hủy vai đóng và trở về vai giáo viên', async () => {
    // Đang đóng vai HS
    await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'đổi vai Tuệ Minh');
    sendStyled.mockClear();

    // Nhắn gv để quay về
    const reply = await teacherBotReply(h.db.db as never, BOT, GV, GV, 'token', 'gv');
    expect(reply).toBe('');
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('QUAY TRỞ LẠI vai GIÁO VIÊN');

    // Link student đã deactivated
    const links = await h.db.db.collection('channelLinks')
      .where('channelUserId', '==', GV)
      .where('role', '==', 'student')
      .get();
    expect(links.docs[0]?.data().active).toBe(false);
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
    expect(text).toContain('Tuệ Minh');
    expect(text).toContain('11Columbus');
    expect(text).toContain('BTVN tuần 5');
    expect(text).toContain('2 ảnh');
  });
  it('GV chưa link bot → không push, không lỗi', async () => {
    seedClass(['s1']);
    await notifyTeacherNewSubmission(h.db.db as never, 'token', {
      teacherId: 'gv-khac', classId: 'c1', studentId: 's1', assignmentTitle: 'BTVN', photoCount: 1, fromUserId: 'ai-do',
    });
    expect(sendStyled).not.toHaveBeenCalled();
  });
  it('lấy tên HS thật từ roster', async () => {
    teacherLink(GV);
    seedClass(['s1']);
    await notifyTeacherNewSubmission(h.db.db as never, 'token', {
      teacherId: 'gv1', classId: 'c1', studentId: 's1', assignmentTitle: 'BTVN tuần 5', photoCount: 1, fromUserId: 'hs-khac',
    });
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('Tuệ Minh');
  });
});
