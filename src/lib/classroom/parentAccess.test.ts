import { describe, expect, it } from 'vitest';
import { DEFAULT_PARENT_MESSAGE, parentPortalLink, parentReportDocId, renderParentMessage, isValidParentPin, normalizeParentPin } from './parentAccess';

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

  it('PIN phụ huynh: đúng 4 ký tự bất kỳ (số, chữ, ký tự đặc biệt), không dấu cách; chữ có dấu tính 1 ký tự', () => {
    for (const ok of ['2580', 'abcd', 'Ab#9', '!@#$', 'ắẹ12', '1111', '1234']) expect(isValidParentPin(ok)).toBe(true);
    for (const bad of ['123', '12345', '12 4', ' 123', '', 'ab\t1']) expect(isValidParentPin(bad)).toBe(false);
    expect(isValidParentPin(1234)).toBe(false);
    expect(normalizeParentPin('e\u0301')).toBe('\u00e9');
    expect(isValidParentPin('e\u0301ab1')).toBe(true);
  });
});
