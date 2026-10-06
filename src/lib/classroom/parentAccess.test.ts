import { describe, expect, it } from 'vitest';
import { DEFAULT_PARENT_MESSAGE, parentPortalLink, parentReportDocId, renderParentMessage, weakParentPinReason } from './parentAccess';

describe('parentAccess', () => {
  it('link cổng phụ huynh theo mã lớp', () => {
    expect(parentPortalLink('https://giaoandewey.vercel.app', 'ABCD23')).toBe('https://giaoandewey.vercel.app/ph/ABCD23');
  });

  it('mã tài liệu báo cáo: một em + một kì = một tài liệu (công bố lại thì ghi đè)', () => {
    expect(parentReportDocId('s1', 'month', '2026-09-01', '2026-09-30')).toBe('s1__month__2026-09-01__2026-09-30');
  });

  it('tin nhắn điền đủ tên, lớp, link, PIN; biến lạ giữ nguyên', () => {
    const text = renderParentMessage(DEFAULT_PARENT_MESSAGE, { ten: 'Bảo Khánh', lop: '10Olinda', link: 'https://x/ph/ABCD23', pin: '4821' });
    expect(text).toContain('em Bảo Khánh (10Olinda)');
    expect(text).toContain('https://x/ph/ABCD23');
    expect(text).toContain('mã PIN: 4821');
    expect(text).not.toMatch(/\{(ten|lop|link|pin)\}/);
    expect(renderParentMessage('Xin chào {ten} {khac}', { ten: 'An', lop: '', link: '', pin: '' })).toBe('Xin chào An {khac}');
  });

  it('PIN phụ huynh tự chọn: chặn 4 số giống nhau và dãy liên tiếp, cho phép số thường', () => {
    expect(weakParentPinReason('0000')).toBeTruthy();
    expect(weakParentPinReason('7777')).toBeTruthy();
    expect(weakParentPinReason('1234')).toBeTruthy();
    expect(weakParentPinReason('4321')).toBeTruthy();
    expect(weakParentPinReason('2580')).toBeNull();
    expect(weakParentPinReason('1357')).toBeNull();
  });
});
