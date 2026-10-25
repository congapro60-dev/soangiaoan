import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { parsePinLinkMessage } from '../_assistant-ph-hs-link.js';
import { linkByPin } from '../_assistant-ph-hs-link.js';
import { hashPin } from '../_classroom-core.js';
import { consumeLinkCode, hashLinkCode } from '../_assistant-auth.js';
import { PIN_LINK_REPLIES } from '../_assistant-ph-hs-link.js';
import { recordBotPinFailure, checkBotPinGuard, canReplyToStranger, resetBotPinGuard } from '../_bot-pin-guard.js';
import { FakeDb } from './_fake-db.js';
import { isUsableChannelLink } from '../_assistant-types.js';

const now = new Date('2026-10-24T10:00:00Z');
const secretPath = 'classes/c/studentSecrets/s';
const fixture = () => {
  const db = new FakeDb(); db.put('classes/c', { joinCode: 'ACDF47' });
  db.put(secretPath, { pinHash: hashPin('5678'), failedAttempts: 0, lockedUntil: null });
  db.put('classes/c/parentSecrets/s', { pinHash: hashPin('1234') }); return db;
};

it('liên kết lại sau thu hồi xóa revokedAt và resolver dùng được', async () => {
  const f = fixture();
  const first = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
  const path = `channelLinks/${first.linkId}`;
  f.put(path, { ...f.rows.get(path), active: false, revokedAt: +now });
  const second = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', new Date(+now + 1000));
  expect(second.status).toBe('linked');
  expect(isUsableChannelLink(f.rows.get(path) as any, +now + 1000)).toBe(true);
  expect(f.rows.get(path)?.createdAt).toBe(+now);
});

describe('sliding-window guard', () => {
  it('cho 20 lần thử/giờ mỗi người, cách ly bot, hết cửa sổ thì thử lại được', async () => {
    const f = fixture();
    for (let i = 0; i < 20; i++) expect((await recordBotPinFailure(f.db, 'b', 'u', undefined, now)).allowed).toBe(true);
    const blocked = await recordBotPinFailure(f.db, 'b', 'u', undefined, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.minutes).toBeGreaterThan(0);
    expect((await checkBotPinGuard(f.db, 'b', 'u', now)).allowed).toBe(false);
    // Bot khác không bị ảnh hưởng.
    expect((await checkBotPinGuard(f.db, 'other', 'u', now)).allowed).toBe(true);
    // Cửa sổ trượt: qua 1 giờ thì mở lại.
    const later = new Date(+now + 60 * 60_000 + 1);
    expect((await checkBotPinGuard(f.db, 'b', 'u', later)).allowed).toBe(true);
  });

  it('burst song song không vượt trần 20 — đúng 20 lần được ghi', async () => {
    const f = fixture();
    const results = await Promise.all(Array.from({ length: 40 }, () => recordBotPinFailure(f.db, 'b', 'u', undefined, now)));
    expect(results.filter(r => r.allowed).length).toBeLessThanOrEqual(20);
    expect(f.retries).toBeGreaterThan(0);
    expect((f.rows.get('botPinAttempts/b_u')?.attempts as number[]).length).toBe(20);
  });

  it('trần lớp: 100 lần thử rải rác rồi chặn, không khóa tài khoản', async () => {
    const f = fixture();
    for (let i = 0; i < 100; i++) await recordBotPinFailure(f.db, 'b', `u${i}`, 'c', now);
    expect((await recordBotPinFailure(f.db, 'b', 'next', 'c', now)).allowed).toBe(false);
    f.scans = [];
    expect((await linkByPin(f.db, 'b', 'new', 'ACDF47 5678 hoc sinh', now)).status).toBe('throttled');
    expect(f.scans).not.toContain('classes/c/studentSecrets');
  });

  it('throttles strangers atomically and preserves cooldown on reset', async () => {
    const f = fixture();
    expect((await Promise.all([canReplyToStranger(f.db, 'b', 'u', now), canReplyToStranger(f.db, 'b', 'u', now)])).filter(Boolean)).toHaveLength(1);
    await resetBotPinGuard(f.db, 'b', 'u', now);
    expect(await canReplyToStranger(f.db, 'b', 'u', new Date(+now + 299_999))).toBe(false);
    expect(await canReplyToStranger(f.db, 'b', 'u', new Date(+now + 300_000))).toBe(true);
  });
});

describe('PIN parser', () => {
  it.each(['ACDF47 1234', 'Nguyen 1234 phu huynh', 'ABC147 1234 phu huynh', 'ACDF47 1234 phu huynh hoc sinh', 'ACDF47 ACDG47 1234 phu huynh', 'ACDF47 1234 5678 hoc sinh'])('rejects ambiguous or invalid %s', message => {
    expect(parsePinLinkMessage(message)).toEqual({ status: 'invalid' });
  });
  it.each(['ab9!', 'Áb😀!', 'aB#9'])('preserves parent PIN %s', pin => {
    expect(parsePinLinkMessage(`acdf47 ${pin.normalize('NFD')} phu huynh`)).toEqual({ status: 'ok', joinCode: 'ACDF47', pin, role: 'parent' });
  });
  it('accepts explicit roles without treating role words as PIN', () => {
    expect(parsePinLinkMessage('ACDF47 1234 phu huynh')).toMatchObject({ role: 'parent', pin: '1234' });
    expect(parsePinLinkMessage('ACDF47 5678 học sinh')).toMatchObject({ role: 'student', pin: '5678' });
    expect(parsePinLinkMessage('ACDF47 ab9! hoc sinh')).toEqual({ status: 'invalid' });
  });
});

describe('nghiệp vụ liên kết PIN — T6', () => {
  it('CA1: link PH thành công ghi đúng doc ID sha256 và UID pinlink:{role}:{classId}:{studentId}', async () => {
    const f = fixture();
    const out = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(out.status).toBe('linked');
    const linkId = crypto.createHash('sha256').update('b|u|parent|c|s').digest('hex');
    expect(out.linkId).toBe(linkId);
    const key = [...f.rows.keys()].find(k => k.startsWith('channelLinks/'));
    expect(key).toBe(`channelLinks/${linkId}`);
    expect(f.rows.get(key!)).toMatchObject({
      firebaseUid: 'pinlink:parent:c:s', channel: 'zalo_bot', channelAccountId: 'b', channelUserId: 'u',
      channelChatId: 'u', role: 'parent', classId: 'c', studentId: 's', active: true,
    });
    expect((f.rows.get('botPinAttempts/b_u')?.attempts as number[]) ?? []).toHaveLength(0);
  });

  it('CA2: link HS thành công cùng lớp → PH và HS giữ 2 link riêng, không đè nhau', async () => {
    const f = fixture();
    await linkByPin(f.db, 'b', 'u-ph', 'ACDF47 1234 phu huynh', now);
    await linkByPin(f.db, 'b', 'u-hs', 'ACDF47 5678 hoc sinh', now);
    const links = [...f.rows.entries()].filter(([k]) => k.startsWith('channelLinks/'));
    expect(links).toHaveLength(2);
    const roles = links.map(([, v]) => (v as any).role).sort();
    expect(roles).toEqual(['parent', 'student']);
    const parent = links.find(([, v]) => (v as any).role === 'parent')![1] as any;
    const student = links.find(([, v]) => (v as any).role === 'student')![1] as any;
    expect(parent).toMatchObject({ firebaseUid: 'pinlink:parent:c:s', classId: 'c', studentId: 's', active: true });
    expect(student).toMatchObject({ firebaseUid: 'pinlink:student:c:s', classId: 'c', studentId: 's', active: true });
    const ids = links.map(([k]) => k);
    expect(new Set(ids).size).toBe(2);
  });

  it('CA3: PIN trùng 2 em → mơ hồ tính đúng 1 lần sai, không liệt kê tên em', async () => {
    const f = fixture();
    const shared = hashPin('1234');
    f.put('classes/c/parentSecrets/k1', { pinHash: shared });
    f.put('classes/c/parentSecrets/k2', { pinHash: shared });
    const out = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(out.status).toBe('ambiguous');
    expect(out.reply).not.toContain('k1');
    expect(out.reply).not.toContain('k2');
    expect((f.rows.get('botPinAttempts/b_u')?.attempts as number[]).length).toBe(1);
    expect([...f.rows.keys()].filter(k => k.startsWith('channelLinks/'))).toHaveLength(0);
  });

  it('CA4+CA9: link lại đúng bản thân không tiêu lượt, không reset bộ đếm — bypass reset bị chặn', async () => {
    const f = fixture();
    await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    for (let i = 0; i < 19; i++) await recordBotPinFailure(f.db, 'b', 'u', undefined, now);
    const out = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(out.status).toBe('linked');
    // Replay KHÔNG xoá counter — nếu xoá thì kẻ dò lách được trần.
    expect((f.rows.get('botPinAttempts/b_u')?.attempts as number[]).length).toBe(19);
    await recordBotPinFailure(f.db, 'b', 'u', undefined, now);
    const again = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(again.status).toBe('throttled');
    expect((await checkBotPinGuard(f.db, 'b', 'u', now)).allowed).toBe(false);
  });

  it('CA5: hai lượt idempotent song song → đúng 1 link, không nhân đôi', async () => {
    const f = fixture();
    await Promise.all([linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now), linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now)]);
    const links = [...f.rows.keys()].filter(k => k.startsWith('channelLinks/'));
    expect(links).toHaveLength(1);
    expect(f.rows.get(links[0])?.active).toBe(true);
  });

  it('CA6: sai PIN không đụng dữ liệu secrets (A9)', async () => {
    const f = fixture();
    const before = structuredClone(f.rows.get('classes/c/parentSecrets/s'));
    const studentBefore = structuredClone(f.rows.get('classes/c/studentSecrets/s'));
    const keysBefore = [...f.rows.keys()].sort().join('|');
    const out = await linkByPin(f.db, 'b', 'u', 'ACDF47 9999 phu huynh', now);
    expect(out.status).toBe('wrong');
    expect(f.rows.get('classes/c/parentSecrets/s')).toEqual(before);
    expect(f.rows.get('classes/c/studentSecrets/s')).toEqual(studentBefore);
    const newKeys = [...f.rows.keys()].filter(k => !keysBefore.split('|').includes(k));
    expect(newKeys.every(k => k.startsWith('botPinAttempts/'))).toBe(true);
    expect([...f.rows.keys()].some(k => k.includes('parentStats'))).toBe(false);  });

  it('CA7: chạm trần 20 lần/giờ thì báo thử lại sau, KHÔNG khóa tài khoản', async () => {
    const f = fixture();
    for (let i = 0; i < 19; i++) await recordBotPinFailure(f.db, 'b', 'u', undefined, now);
    // Lượt thứ 20 vẫn được thử (chưa chạm trần) → trả "sai" bình thường.
    const last = await linkByPin(f.db, 'b', 'u', 'ACDF47 9999 phu huynh', now);
    expect(last.status).toBe('wrong');
    expect(last.reply).toBe(PIN_LINK_REPLIES.wrong);
    // Lượt 21 trở đi bị chặn — nhưng KHÔNG khóa tài khoản.
    const blocked = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(blocked.status).toBe('throttled');
    expect(blocked.reply).toBe(PIN_LINK_REPLIES.throttled);
    expect([...f.rows.keys()].filter(k => k.startsWith('channelLinks/'))).toHaveLength(0);
    // Hết cửa sổ trượt → vào lại bình thường, không có khóa vĩnh viễn.
    const later = new Date(+now + 60 * 60_000 + 1);
    expect((await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', later)).status).toBe('linked');
  });

  it('B2 (review MAJOR): chạm trần — lượt sai và lượt ĐÚNG trả y hệt một câu, chặn oracle dò PIN', async () => {
    const f = fixture();
    for (let i = 0; i < 20; i++) await recordBotPinFailure(f.db, 'b', 'u', undefined, now);
    const wrongAtCap = await linkByPin(f.db, 'b', 'u', 'ACDF47 9999 phu huynh', now);
    const rightAtCap = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(wrongAtCap.reply).toBe(rightAtCap.reply);
    expect(wrongAtCap.reply).toBe(PIN_LINK_REPLIES.throttled);
    expect([...f.rows.keys()].filter(k => k.startsWith('channelLinks/'))).toHaveLength(0);
  });

  it('B1 (review BLOCKER): burst 40 tin sai song song — không vượt trần 20', async () => {
    const f = fixture();
    const results = await Promise.all(Array.from({ length: 40 }, () => linkByPin(f.db, 'b', 'u', 'ACDF47 9999 phu huynh', now)));
    expect(results.filter(r => r.status === 'wrong').length).toBeLessThanOrEqual(20);
    expect(results.filter(r => r.status === 'throttled').length).toBeGreaterThan(0);
    expect((f.rows.get('botPinAttempts/b_u')?.attempts as number[]).length).toBe(20);
    expect([...f.rows.keys()].filter(k => k.startsWith('channelLinks/'))).toHaveLength(0);
  }, 20_000);

  it('khóa PIN từ web xuất hiện giữa lúc kiểm và ghi vẫn chặn liên kết', async () => {
    const f = fixture();
    const runTransaction = f.runTransaction.bind(f);
    let changed = false;
    f.runTransaction = fn => runTransaction(tx => fn({ ...tx, get: async (ref: any) => {
      const snap = await tx.get(ref);
      if (!changed && ref.path === 'classes/c/parentSecrets/s') {
        changed = true;
        f.put(ref.path, { ...f.rows.get(ref.path), lockedUntil: new Date(+now + 60_000).toISOString() });
      }
      return snap;
    } }));
    const result = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(changed).toBe(true); expect(f.retries).toBeGreaterThan(0);
    expect(result.status).toBe('wrong'); expect(result.reply).toBe(PIN_LINK_REPLIES.wrong);
    expect([...f.rows.keys()].filter(path => path.startsWith('channelLinks/'))).toHaveLength(0);
  });

  it('B3 (review NIT): mã lớp không tồn tại tính 1 lần sai cấp user — chống dò mã lớp', async () => {
    const f = fixture();
    const out = await linkByPin(f.db, 'b', 'u', 'XXXX99 1234 phu huynh', now);
    expect(out.status).toBe('none');
    expect(out.reply).toBe(PIN_LINK_REPLIES.wrong);
    expect((f.rows.get('botPinAttempts/b_u')?.attempts as number[]).length).toBe(1);
  });

  it('B6 (review vòng 2 MAJOR): PH link 2 con CÙNG lớp — con thứ hai được link thật, không báo thành công giả', async () => {
    const f = fixture();
    f.put('classes/c/parentSecrets/s2', { pinHash: hashPin('2345'), failedAttempts: 0, lockedUntil: null });
    const first = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(first.status).toBe('linked');
    const second = await linkByPin(f.db, 'b', 'u', 'ACDF47 2345 phu huynh', now);
    expect(second.status).toBe('linked');
    const links = [...f.rows.entries()].filter(([k]) => k.startsWith('channelLinks/')).map(([, v]) => v as any);
    expect(links.map(l => l.studentId).sort()).toEqual(['s', 's2']);
    expect(new Set(links.map(l => l.firebaseUid)).size).toBe(2);
    // Gửi lại đúng PIN con thứ nhất → idempotent, không tiêu lượt, không tạo link thứ ba.
    const again = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(again.status).toBe('linked');
    expect(again.linkId).toBe(first.linkId);
    expect([...f.rows.keys()].filter(k => k.startsWith('channelLinks/'))).toHaveLength(2);
    // Replay không tiêu lượt: counter lớp chỉ còn phần dư của 2 lần link hợp lệ (0).
    expect((f.rows.get('botPinAttempts/class_c')?.attempts as number[]) ?? []).toHaveLength(0);
  });

  it('B8 (review vòng 3 MAJOR): PIN đổi giữa lúc quét và lúc ghi → không báo thành công giả, tạo 0 link', async () => {
    const f = fixture();
    f.beforeTransaction = () => f.put('classes/c/parentSecrets/s', { pinHash: hashPin('8888'), failedAttempts: 0, lockedUntil: null });
    const out = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(out.status).toBe('wrong');
    expect(out.reply).toBe(PIN_LINK_REPLIES.wrong);
    expect(out.linkId).toBeUndefined();
    expect([...f.rows.keys()].filter(k => k.startsWith('channelLinks/'))).toHaveLength(0);
    expect((f.rows.get('botPinAttempts/b_u')?.attempts as number[]).length).toBe(1);
  });

  it('B7 (review vòng 2 MINOR): em đang bị khóa từ web coi như không khớp — bot không thành máy xác nhận PIN', async () => {
    const f = fixture();
    f.put('classes/c/parentSecrets/s', { pinHash: hashPin('1234'), failedAttempts: 0, lockedUntil: new Date(now.getTime() + 10 * 60_000).toISOString() });
    const out = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(out.status).toBe('wrong');
    expect(out.reply).toBe(PIN_LINK_REPLIES.wrong);
    expect([...f.rows.keys()].filter(k => k.startsWith('channelLinks/'))).toHaveLength(0);
  });

  it('CA10: chạm trần KHÔNG mở được bằng link cũ — replay vẫn phải chờ hết cửa sổ', async () => {
    const f = fixture();
    await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    const linkKey = [...f.rows.keys()].find(k => k.startsWith('channelLinks/'))!;
    for (let i = 0; i < 20; i++) await recordBotPinFailure(f.db, 'b', 'u', undefined, now);
    const out = await linkByPin(f.db, 'b', 'u', 'ACDF47 1234 phu huynh', now);
    expect(out.status).toBe('throttled');
    expect(f.rows.get(linkKey)?.active).toBe(true);
    // Counter giữ nguyên 20, không bị replay xoá.
    expect((f.rows.get('botPinAttempts/b_u')?.attempts as number[]).length).toBe(20);
  });

  it('CA11: A5 — GV dùng /link CODE chỉ revoke link GV, link PH active vẫn nguyên', async () => {
    const f = new FakeDb();
    f.put('channelLinks/t1', { firebaseUid: 'gv-1', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'u', channelChatId: 'u', active: true, createdAt: +now, updatedAt: +now });
    f.put('channelLinks/ph1', { firebaseUid: 'pinlink:parent:c:s', channel: 'zalo_bot', channelAccountId: 'bot-1', channelUserId: 'u', channelChatId: 'u', role: 'parent', classId: 'c', studentId: 's', active: true, createdAt: +now, updatedAt: +now });
    f.put('assistantLinkCodes/k1', { codeHash: hashLinkCode('GV-CODE-1'), firebaseUid: 'gv-1', createdAt: +now, expiresAt: +now + 9 * 60_000 });
    await consumeLinkCode('GV-CODE-1', { channel: 'zalo_bot' as any, channelAccountId: 'bot-1', channelUserId: 'u', channelChatId: 'u', verifiedChannelAccountId: 'bot-1' }, +now, f.db);
    expect(f.rows.get('channelLinks/ph1')?.active).toBe(true);
    expect(f.rows.get('channelLinks/t1')?.active).toBe(false);
    expect(f.rows.get('channelLinks/k1')?.active).toBe(true);
    expect(f.rows.get('channelLinks/k1')?.firebaseUid).toBe('gv-1');
  });
});
