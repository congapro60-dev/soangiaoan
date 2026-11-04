import { describe, expect, it } from 'vitest';
import { DEFAULT_PARENT_MESSAGE, parentPortalLink, parentReportDocId, renderParentMessage, isValidParentPin, isSafeDocId, normalizeParentPin, sanitizeBranding, compareParentReports } from './parentAccess';

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
    expect(text).toContain('mã PIN tạm: 4821');
    expect(text).toContain('tự đặt mã PIN riêng');
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

  it('PIN: chặn ký tự vô hình / surrogate lẻ, vẫn cho emoji hợp lệ', () => {
    for (const bad of ['ab\u200bc', 'a\u200eb1', 'a\ufeffbc', 'ab\ud800c', 'a\udc00bc', 'ab\u00adc']) expect(isValidParentPin(bad)).toBe(false);
    expect(isValidParentPin('😀😀😀😀')).toBe(true);
    expect(isValidParentPin('a😀b1')).toBe(true);
  });

  it('mã học sinh làm id Firestore: chặn dấu /, ., .., __x__, quá dài, ký tự điều khiển; cho mã thường kể cả có dấu cách', () => {
    for (const bad of ['', '.', '..', 'a/b', '__id__', 'x'.repeat(151), 'a\u0000b', 5, null]) expect(isSafeDocId(bad)).toBe(false);
    for (const ok of ['student-a', 'GB0120040234', '10OLINDA-19', 'Nguyễn A', 'S22070256']) expect(isSafeDocId(ok)).toBe(true);
  });

  it('nhận diện: chỉ giữ chữ đã cắt + logo data URL ảnh; không có gì hợp lệ thì null', () => {
    expect(sanitizeBranding({ schoolName: ' T ', teacherName: 'G', logoDataUrl: 'data:image/png;base64,AAAA', x: 1 })).toEqual({ schoolName: 'T', teacherName: 'G', logoDataUrl: 'data:image/png;base64,AAAA' });
    expect(sanitizeBranding({ logoDataUrl: 'data:text/html;base64,AAAA' })).toBeNull();
    expect(sanitizeBranding('x')).toBeNull();
    expect(sanitizeBranding({ schoolName: 'x'.repeat(500) })?.schoolName).toHaveLength(120);
  });

  it('sắp báo cáo: ngày kết thúc mới nhất trước, cùng kì thì công bố sau xếp trước', () => {
    const list = [{ to: '2026-09-30', publishedAt: '2026-11-01' }, { to: '2026-10-31', publishedAt: '2026-10-05' }, { to: '2026-10-31', publishedAt: '2026-10-09' }];
    expect([...list].sort(compareParentReports)).toEqual([list[2], list[1], list[0]]);
  });
});
