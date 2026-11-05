import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeDb } from './_fake-db.js';
import { notifyParentGraded, notifyParentSubmission } from '../_assistant-ph-hs-parent-notify.js';

const sendStyled = vi.fn(async () => {});
const sendSticker = vi.fn(async () => {});
vi.mock('../_assistant-zalo-send', () => ({
  sendStyled: (...args: unknown[]) => sendStyled(...(args as [])),
  sendSticker: (...args: unknown[]) => sendSticker(...(args as [])),
  sendTyping: () => {},
  secretEqual: () => false,
}));

const h = vi.hoisted(() => ({ db: null as unknown as FakeDb }));

const BOT = 'bot-1', PH_USER = 'user-ph', HS_USER = 'user-hs', PH2_USER = 'user-ph-2';

const parentLink = (user: string, classId = 'c1', studentId = 's1') =>
  h.db.put(`channelLinks/l_${user}`, {
    role: 'parent',
    channel: 'zalo_bot',
    channelAccountId: BOT,
    channelUserId: user,
    channelChatId: user,
    classId,
    studentId,
    active: true,
  });

const studentLink = (user: string, classId = 'c1', studentId = 's1') =>
  h.db.put(`channelLinks/l_${user}`, {
    role: 'student',
    channel: 'zalo_bot',
    channelAccountId: BOT,
    channelUserId: user,
    channelChatId: user,
    classId,
    studentId,
    active: true,
  });

const seedStudent = (classId = 'c1', studentId = 's1', name = 'Đặng Tuệ Minh') => {
  h.db.put(`classes/${classId}`, { name: '11Columbus' });
  h.db.put(`classes/${classId}/students/${studentId}`, { name });
};

beforeEach(() => {
  h.db = new FakeDb();
  sendStyled.mockClear();
  sendSticker.mockClear();
});

describe('notifyParentSubmission — thông báo con vừa nộp bài', () => {
  it('gửi thông báo tới tài khoản phụ huynh đã liên kết', async () => {
    parentLink(PH_USER);
    seedStudent();

    await notifyParentSubmission(h.db.db as never, 'token', {
      classId: 'c1',
      studentId: 's1',
      assignmentTitle: 'BTVN Tuần 5',
      photoCount: 3,
      fromUserId: HS_USER,
    });

    expect(sendStyled).toHaveBeenCalledTimes(1);
    expect(sendStyled.mock.calls[0]?.[1]).toBe(PH_USER);
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('THÔNG BÁO NỘP BÀI TẬP VỀ NHÀ');
    expect(text).toContain('Đặng Tuệ Minh');
    expect(text).toContain('11Columbus');
    expect(text).toContain('BTVN Tuần 5');
    expect(text).toContain('3 ảnh');
  });

  it('bỏ qua chính người gửi nếu chính phụ huynh đó nộp bài hộ con', async () => {
    parentLink(PH_USER);
    parentLink(PH2_USER);
    seedStudent();

    await notifyParentSubmission(h.db.db as never, 'token', {
      classId: 'c1',
      studentId: 's1',
      assignmentTitle: 'BTVN Tuần 5',
      photoCount: 2,
      fromUserId: PH_USER, // PH_USER là người vừa nộp
    });

    // Chỉ PH2_USER nhận được, PH_USER không bị spam lại
    expect(sendStyled).toHaveBeenCalledTimes(1);
    expect(sendStyled.mock.calls[0]?.[1]).toBe(PH2_USER);
  });

  it('không có phụ huynh nào liên kết → không gửi gì, không lỗi', async () => {
    studentLink(HS_USER);
    seedStudent();

    await notifyParentSubmission(h.db.db as never, 'token', {
      classId: 'c1',
      studentId: 's1',
      assignmentTitle: 'BTVN',
      photoCount: 1,
      fromUserId: HS_USER,
    });

    expect(sendStyled).not.toHaveBeenCalled();
  });
});

describe('notifyParentGraded — thông báo kết quả chấm bài của con', () => {
  it('gửi điểm và kết quả bài làm cho phụ huynh', async () => {
    parentLink(PH_USER);
    seedStudent();

    await notifyParentGraded(h.db.db as never, 'token', {
      classId: 'c1',
      studentId: 's1',
      assignmentTitle: 'BTVN Tuần 5',
      score: 9,
      maxScore: 10,
      approved: true,
      fromUserId: HS_USER,
    });

    expect(sendStyled).toHaveBeenCalledTimes(1);
    expect(sendStyled.mock.calls[0]?.[1]).toBe(PH_USER);
    const text = String(sendStyled.mock.calls[0]?.[2]);
    expect(text).toContain('KẾT QUẢ BÀI TẬP CỦA CON');
    expect(text).toContain('Đặng Tuệ Minh');
    expect(text).toContain('9/10');
    expect(text).toContain('Giáo viên đã duyệt');
    expect(text).toContain('Chúc mừng em đã hoàn thành bài tập xuất sắc');
  });

  it('điểm cao kèm sticker chúc mừng', async () => {
    process.env.ZALO_BOT_CONGRA_STICKER = 'sticker-congrats-123';
    parentLink(PH_USER);
    seedStudent();

    await notifyParentGraded(h.db.db as never, 'token', {
      classId: 'c1',
      studentId: 's1',
      assignmentTitle: 'BTVN Tuần 5',
      score: 8.5,
      maxScore: 10,
      approved: true,
      fromUserId: HS_USER,
    });

    expect(sendSticker).toHaveBeenCalledTimes(1);
    expect(sendSticker.mock.calls[0]?.[1]).toBe(PH_USER);
    expect(sendSticker.mock.calls[0]?.[2]).toBe('sticker-congrats-123');
  });
});
