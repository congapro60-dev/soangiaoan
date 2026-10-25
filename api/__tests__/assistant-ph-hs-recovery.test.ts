import { describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { FakeDb } from './_fake-db.js';
import { hashPin, verifyPin } from '../_classroom-core.js';
import { RECOVERY_REPLIES, recoveryReply, normalizePhone, issueRecoveryPin } from '../_assistant-ph-hs-recovery.js';
import { linkByPin, PIN_LINK_REPLIES } from '../_assistant-ph-hs-link.js';

const now = new Date('2026-10-25T10:00:00Z');
const strangerSent: string[] = [];
const strangerReplyFor = async (uid: string) => { strangerSent.push(uid); return 'HƯỚNG DẪN NGƯỜI LẠ'; };
const linkId = (botId: string, userId: string, role: string, classId: string, studentId: string) =>
  crypto.createHash('sha256').update(`${botId}|${userId}|${role}|${classId}|${studentId}`).digest('hex');

const setup = (linkActive = true) => {
  const db = new FakeDb();
  db.put('classes/c', { joinCode: 'ACDF47', name: '10 Olinda' });
  db.put('classes/c/studentContacts/s', { code: 'HS001', codeNorm: 'hs001', name: 'Nguyễn Văn A', parentPhones: ['84902388588'] });
  db.put('channelLinks/l1', { channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'u', role: 'parent', classId: 'c', active: linkActive });
  return db;
};
const send = (db: FakeDb, text: string, uid = 'u', at = now) =>
  recoveryReply(db.db, 'bot-1', uid, text.split(/\s+/).slice(1), strangerReplyFor, at);

describe('khoiphuc — cấp PIN tạm', () => {
  it('R1: cú pháp sai thì chỉ trả câu hướng dẫn, không đụng counter chống dò', async () => {
    const db = setup();
    expect(await send(db, '/khoiphuc')).toBe(RECOVERY_REPLIES.syntax);
    expect(await send(db, '/khoiphuc HS001')).toBe(RECOVERY_REPLIES.syntax);
    expect(await send(db, '/khoiphuc HS001 abcxyz')).toBe(RECOVERY_REPLIES.syntax);
    expect(db.rows.get('botPinAttempts/bot-1_u')).toBeUndefined();
  });

  it('R2: chưa từng liên kết coi như người lạ — cooldown 5 phút/lần, có audit', async () => {
    const db = setup();
    expect(await send(db, '/khoiphuc HS001 0902388588', 'stranger')).toBe('HƯỚNG DẪN NGƯỜI LẠ');
    expect(await send(db, '/khoiphuc HS001 0902388588', 'stranger')).toBe('');
    expect(strangerSent).toEqual(['stranger']);
    expect([...db.rows.keys()].filter(k => k.startsWith('recoveryAudit/'))).toHaveLength(1);
  });

  it('R3: sai mã HS hoặc sai SĐT → câu chung, tính lượt chống dò', async () => {
    const db = setup();
    expect(await send(db, '/khoiphuc HS999 0902388588')).toBe(RECOVERY_REPLIES.wrong);
    expect(await send(db, '/khoiphuc HS001 0911222333')).toBe(RECOVERY_REPLIES.wrong);
    expect((db.rows.get('botPinAttempts/bot-1_u')?.attempts as number[]).length).toBe(2);
  });

  it('R4: đúng cặp mã HS + SĐT → PIN 6 số, recoveryPins còn hạn, kèm mã lớp trong hướng dẫn', async () => {
    const db = setup();
    const reply = await send(db, '/khoiphuc HS001 0902388588');
    const pin = /(\d{4})/.exec(reply)?.[1];
    expect(pin).toBeTruthy();
    expect(reply).toContain('ACDF47');
    expect(reply).toContain('phụ huynh');
    const rec = db.rows.get('classes/c/recoveryPins/s') as any;
    expect(verifyPin(pin!, rec.pinHash)).toBe(true);
    expect(rec.used).toBe(false);
    expect(rec.issuedTo).toEqual({ botId: 'bot-1', userId: 'u' });
    expect(new Date(rec.expiresAt).getTime() - now.getTime()).toBe(15 * 60_000);
  });

  it('R5: mọi kiểu gõ SĐT (0x / 84x / +84 có khoảng trắng) đều khớp', async () => {
    expect(normalizePhone('0902388588')).toBe('84902388588');
    expect(normalizePhone('84902388588')).toBe('84902388588');
    expect(normalizePhone('+84 902 388 588')).toBe('84902388588');
    for (const phone of ['0902388588', '84902388588', '+84902388588']) {
      const fresh = setup();
      expect(await send(fresh, `/khoiphuc HS001 ${phone}`)).toMatch(/\d{4}/);
    }
  });

  it('R6: tối đa 3 lần cấp/giờ — lần 4 bị chặn', async () => {
    const db = setup();
    for (let i = 0; i < 3; i++) expect(await send(db, '/khoiphuc HS001 0902388588', 'u', new Date(+now + i * 60_000))).toMatch(/\d{4}/);
    expect(await send(db, '/khoiphuc HS001 0902388588', 'u', new Date(+now + 3 * 60_000))).toBe(RECOVERY_REPLIES.throttled);
  });

  it('R7: 2 con trùng thông tin ở 2 lớp → bắt chỉ lớp; chỉ lớp khớp được cấp', async () => {
    const db = setup();
    db.put('classes/c2', { joinCode: 'BBBB22', name: '11 Columbus' });
    db.put('classes/c2/studentContacts/s2', { codeNorm: 'hs001', name: 'Trần Thị B', parentPhones: ['84902388588'] });
    db.put('channelLinks/l2', { channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'u', role: 'parent', classId: 'c2', active: true });
    expect(await send(db, '/khoiphuc HS001 0902388588')).toBe(RECOVERY_REPLIES.ambiguous);
    const reply = await send(db, '/khoiphuc 11Columbus HS001 0902388588');
    expect(reply).toMatch(/\d{4}/);
    expect(reply).toContain('BBBB22');
  });

  it('R8: lớp kê khai không nằm trong các lớp đã liên kết → câu chung', async () => {
    const db = setup();
    expect(await send(db, '/khoiphuc LopKhac HS001 0902388588')).toBe(RECOVERY_REPLIES.wrong);
  });

  it('R9: cấp 2 lần — chỉ PIN tạm mới nhất có hiệu lực', async () => {
    const db = setup();
    const p1 = /(\d{4})/.exec((await send(db, '/khoiphuc HS001 0902388588')) as string)![1];
    const p2 = /(\d{4})/.exec((await send(db, '/khoiphuc HS001 0902388588')) as string)![1];
    const rec = db.rows.get('classes/c/recoveryPins/s') as any;
    expect(verifyPin(p2, rec.pinHash)).toBe(true);
    expect(verifyPin(p1, rec.pinHash)).toBe(p1 === p2);
  });
});

describe('PIN tạm đi qua linkByPin', () => {
  it('PIN tạm của người gửi ưu tiên hơn PIN thường trùng của em khác', async () => {
    const db = setup(false);
    const pin = /: (\d{4})/.exec(await send(db, '/khoiphuc HS001 0902388588'))![1];
    db.put('classes/c/parentSecrets/other', { pinHash: hashPin(pin) });
    db.put('channelLinks/other', { channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'u', role: 'parent', classId: 'c', studentId: 'other', active: true });
    const out = await linkByPin(db.db, 'bot-1', 'u', `ACDF47 ${pin} phu huynh`, now);
    expect(out.status).toBe('linked');
    expect(db.rows.get(`channelLinks/${out.linkId}`)?.studentId).toBe('s');
    expect(db.rows.get('classes/c/recoveryPins/s')?.used).toBe(true);
    const replay = await linkByPin(db.db, 'bot-1', 'u', `ACDF47 ${pin} phu huynh`, now);
    expect(replay.status).toBe('wrong');
    expect(replay.reply).toBe(PIN_LINK_REPLIES.wrong);
    expect([...db.rows.values()].filter(value => value.role === 'parent' && value.studentId === 'other')).toHaveLength(1);
  });

  it('sinh lại khi PIN trùng PIN thường hoặc PIN khôi phục cũ của người gửi', async () => {
    const db = setup(false);
    db.put('classes/c/parentSecrets/other', { pinHash: hashPin('1234') });
    db.put('classes/c/recoveryPins/s', { pinHash: hashPin('2345'), used: true, expiresAt: new Date(+now + 60_000).toISOString(), issuedTo: { botId: 'bot-1', userId: 'u' } });
    const random = vi.spyOn(crypto, 'randomInt').mockReturnValueOnce(1234 as never).mockReturnValueOnce(2345 as never).mockReturnValue(3456 as never);
    try {
      expect(await issueRecoveryPin(db.db, 'bot-1', 'u', 'c', 's', 'Synthetic', now)).toBe('3456');
      expect(random).toHaveBeenCalledTimes(3);
    } finally { random.mockRestore(); }
  });

  it('4 yêu cầu đồng thời chỉ cấp tối đa 3 PIN trong giờ', async () => {
    const db = setup();
    const replies = await Promise.all(Array.from({ length: 4 }, () => send(db, '/khoiphuc HS001 0902388588')));
    expect(replies.filter(reply => reply.startsWith('Mã PIN tạm'))).toHaveLength(3);
    expect(replies.filter(reply => reply === RECOVERY_REPLIES.throttled)).toHaveLength(1);
    expect(db.rows.get('recoveryIssues/bot-1_u')?.issuedAt).toHaveLength(3);
  });

  it('đổi issuedTo trong lúc transaction phải từ chối sau retry', async () => {
    const db = setup(false);
    const pin = /: (\d{4})/.exec(await send(db, '/khoiphuc HS001 0902388588'))![1];
    const runTransaction = db.runTransaction.bind(db);
    let changed = false;
    db.runTransaction = fn => runTransaction(tx => fn({ ...tx, get: async (ref: any) => {
      const snap = await tx.get(ref);
      if (!changed && ref.path === 'classes/c/recoveryPins/s') {
        changed = true;
        db.put(ref.path, { ...db.rows.get(ref.path), issuedTo: { botId: 'bot-1', userId: 'other' } });
      }
      return snap;
    } }));
    const out = await linkByPin(db.db, 'bot-1', 'u', `ACDF47 ${pin} phu huynh`, now);
    expect(changed).toBe(true);
    expect(out.status).toBe('wrong');
    expect(db.rows.get('classes/c/recoveryPins/s')?.used).toBe(false);
    expect(db.retries).toBeGreaterThan(0);
  });

  it('R10: PH mất link (đã revoke) vẫn /khoiphuc được; PIN tạm dùng đúng 1 lần, chặn kẻ đánh cắp', async () => {
    const db = setup(false); // link đã bị revoke
    const reply = await send(db, '/khoiphuc HS001 0902388588');
    const pin = /(\d{4})/.exec(reply as string)![1];
    const out = await linkByPin(db.db, 'bot-1', 'u', `ACDF47 ${pin} phu huynh`, now);
    expect(out.status).toBe('linked');
    expect(db.rows.get('classes/c/recoveryPins/s')?.used).toBe(true);
    const link = db.rows.get(`channelLinks/${linkId('bot-1', 'u', 'parent', 'c', 's')}`);
    expect(link?.active).toBe(true);
    // Tài khoản Zalo khác lấy trộm PIN tạm → không dùng được.
    const stolen = await linkByPin(db.db, 'bot-1', 'thief', `ACDF47 ${pin} phu huynh`, now);
    expect(stolen.reply).toBe(PIN_LINK_REPLIES.wrong);
  });

  it('R11: PIN tạm hết hạn không link được', async () => {
    const db = setup(false);
    const reply = await send(db, '/khoiphuc HS001 0902388588');
    const pin = /(\d{4})/.exec(reply as string)![1];
    const out = await linkByPin(db.db, 'bot-1', 'u', `ACDF47 ${pin} phu huynh`, new Date(+now + 16 * 60_000));
    expect(out.reply).toBe(PIN_LINK_REPLIES.wrong);
    expect([...db.rows.keys()].filter(k => k.startsWith('channelLinks/'))).toHaveLength(1); // không tạo link mới
  });

  it('R12: 2 lượt dùng PIN tạm song song — đúng 1 lượt thắng (slot chống nhân đôi)', async () => {
    const db = setup(false);
    const reply = await send(db, '/khoiphuc HS001 0902388588');
    const pin = /(\d{4})/.exec(reply as string)![1];
    const results = await Promise.all([
      linkByPin(db.db, 'bot-1', 'u', `ACDF47 ${pin} phu huynh`, now),
      linkByPin(db.db, 'bot-1', 'u', `ACDF47 ${pin} phu huynh`, now),
    ]);
    expect(results.filter(r => r.status === 'linked')).toHaveLength(1);
    expect(db.rows.get('classes/c/recoveryPins/s')?.used).toBe(true);
  });
});
