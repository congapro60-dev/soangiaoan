import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import { parsePinLinkMessage, linkByPin, switchRoleGuideReply, deactivateStudentParentLinks, PIN_LINK_REPLIES } from '../_assistant-ph-hs-link.js';
import { hashPin } from '../_classroom-core.js';
import { parseMenuChoice, menuText } from '../_assistant-ph-hs-menu.js';
import { FakeDb } from './_fake-db.js';

/**
 * Mục 9 "Đổi vai trò" (chốt chủ dự án 29/10, phương án A):
 * - Tin có tiền tố "đổi vai" → được chuyển vai, NHƯNG bắt xác thực PIN vai ĐÍCH.
 * - Không tiền tố → giữ nguyên luật 1 tài khoản 1 vai (roleConflict).
 * - Chuyển vai thành công → gỡ vai cũ trong cùng transaction, chỉ 1 vai active.
 * - GV: /link <mã web> → deactivateStudentParentLinks gỡ vai PH/HS.
 */
const now = new Date('2026-10-29T10:00:00Z');
const secretPath = 'classes/c/studentSecrets/s';
const fixture = () => {
  const db = new FakeDb(); db.put('classes/c', { joinCode: 'ACDF47' });
  db.put(secretPath, { pinHash: hashPin('5678'), failedAttempts: 0, lockedUntil: null });
  db.put('classes/c/parentSecrets/s', { pinHash: hashPin('1234') }); return db;
};
const pinLink = async (db: FakeDb, message: string, userId = 'u') => {
  const parsed = parsePinLinkMessage(message);
  if (parsed.status !== 'ok') return { status: 'invalid', reply: 'Cú pháp chưa đúng.' };
  return linkByPin(db.db, 'b', userId, message, now, { allowSwitch: parsed.switch === true });
};

describe('parser — tiền tố "đổi vai" là ý định chuyển vai', () => {
  it('đổi vai + PIN HS → switch: true', () => {
    expect(parsePinLinkMessage('đổi vai ACDF47 5678')).toEqual({ status: 'ok', joinCode: 'ACDF47', pin: '5678', role: 'student', switch: true });
  });
  it('đổi vai + PIN PH → switch: true, role parent', () => {
    expect(parsePinLinkMessage('Đổi vai ACDF47 1234 phụ huynh')).toEqual({ status: 'ok', joinCode: 'ACDF47', pin: '1234', role: 'parent', switch: true });
  });
  it('không tiền tố → KHÔNG có key switch (giữ hành vi cũ)', () => {
    const parsed = parsePinLinkMessage('ACDF47 5678');
    expect(parsed.status === 'ok' && parsed.switch === true).toBe(false);
  });
  it('đổi vai nhưng thiếu PIN → invalid', () => {
    expect(parsePinLinkMessage('đổi vai ACDF47').status).toBe('invalid');
  });
});

describe('chuyển vai PH ↔ HS qua PIN vai đích', () => {
  it('PH đang active + "đổi vai" PIN HS → chuyển thành công, vai PH bị gỡ', async () => {
    const f = fixture();
    await pinLink(f, 'ACDF47 1234 phu huynh');
    const parentId = crypto.createHash('sha256').update('b|u|parent|c|s').digest('hex');
    expect(f.rows.get(`channelLinks/${parentId}`)?.active).toBe(true);

    const result = await pinLink(f, 'đổi vai ACDF47 5678');
    expect(result.status).toBe('switched');
    expect(result.reply).toContain('HỌC SINH');
    const studentId = crypto.createHash('sha256').update('b|u|student|c|s').digest('hex');
    expect(f.rows.get(`channelLinks/${studentId}`)?.active).toBe(true);
    expect(f.rows.get(`channelLinks/${parentId}`)?.active).toBe(false);
  });

  it('không tiền tố "đổi vai" → vẫn bị chặn roleConflict (bảo vệ cũ giữ nguyên)', async () => {
    const f = fixture();
    await pinLink(f, 'ACDF47 1234 phu huynh');
    const result = await pinLink(f, 'ACDF47 5678');
    expect(result.status).toBe('roleConflict');
    expect(result.reply).toBe(PIN_LINK_REPLIES.roleConflict);
  });

  it('đổi vai nhưng PIN sai → wrong, vai cũ VẪN active (không đổi gì)', async () => {
    const f = fixture();
    await pinLink(f, 'ACDF47 1234 phu huynh');
    const result = await pinLink(f, 'đổi vai ACDF47 9999');
    expect(result.status).toBe('wrong');
    const parentId = crypto.createHash('sha256').update('b|u|parent|c|s').digest('hex');
    expect(f.rows.get(`channelLinks/${parentId}`)?.active).toBe(true);
  });

  it('đổi lại vai cũ (link inactive) → kích hoạt lại được, không kẹt ở vai mới', async () => {
    const f = fixture();
    await pinLink(f, 'ACDF47 1234 phu huynh');
    await pinLink(f, 'đổi vai ACDF47 5678');
    const back = await pinLink(f, 'đổi vai ACDF47 1234 phu huynh');
    expect(back.status).toBe('switched');
    const parentId = crypto.createHash('sha256').update('b|u|parent|c|s').digest('hex');
    const studentId = crypto.createHash('sha256').update('b|u|student|c|s').digest('hex');
    expect(f.rows.get(`channelLinks/${parentId}`)?.active).toBe(true);
    expect(f.rows.get(`channelLinks/${studentId}`)?.active).toBe(false);
  });

  it('đổi vai nhưng PIN trùng vai ĐANG có → idempotent, không báo switched', async () => {
    const f = fixture();
    await pinLink(f, 'ACDF47 1234 phu huynh');
    const again = await pinLink(f, 'đổi vai ACDF47 1234 phu huynh');
    expect(again.status).toBe('linked');
  });
});

describe('mục 9 trên menu', () => {
  it('parseMenuChoice: 9 và "đổi vai" → kind switchRole', () => {
    expect(parseMenuChoice('9')).toEqual({ kind: 'switchRole' });
    expect(parseMenuChoice('Đổi vai')).toEqual({ kind: 'switchRole' });
    expect(parseMenuChoice('8')).toEqual({ kind: 'section', key: '8' });
  });
  it('menu có dòng "9. Đổi vai trò (HS/PH/GV)" cho cả PH và HS', () => {
    expect(menuText('Nam', '11A1', 'parent')).toContain('9. Đổi vai trò (HS/PH/GV)');
    expect(menuText('Nam', '11A1', 'student')).toContain('9. Đổi vai trò (HS/PH/GV)');
  });
  it('hướng dẫn đổi vai nêu đủ 3 mẫu + cảnh báo giới hạn nhập sai', () => {
    const guide = switchRoleGuideReply('student');
    expect(guide).toContain('HỌC SINH');
    expect(guide).toContain('đổi vai <mã lớp> <mã PIN> phụ huynh');
    expect(guide).toContain('/link <mã liên kết>');
    expect(guide).toContain('20 lần');
  });
});

describe('chuyển sang GIÁO VIÊN qua /link', () => {
  it('deactivateStudentParentLinks gỡ vai PH/HS active, trả true; không có thì trả false', async () => {
    const f = fixture();
    await pinLink(f, 'ACDF47 1234 phu huynh');
    expect(await deactivateStudentParentLinks(f.db, 'b', 'u', now)).toBe(true);
    const parentId = crypto.createHash('sha256').update('b|u|parent|c|s').digest('hex');
    expect(f.rows.get(`channelLinks/${parentId}`)?.active).toBe(false);
    expect(await deactivateStudentParentLinks(f.db, 'b', 'u', now)).toBe(false);
  });
});
