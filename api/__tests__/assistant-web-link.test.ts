import { describe, expect, it } from 'vitest';
import { MENU_HINT, webPortalUrl, withWebPortalLink } from '../_assistant-ph-hs-menu.js';

/**
 * Link cổng web gửi kèm câu trả lời AI.
 * RÀNG BUỘC CỐT LÕI (chủ dự án nhấn mạnh): link phải là của ĐÚNG lớp HS đang nhắn,
 * không bao giờ lẫn mã lớp khác. `joinCode` luôn lấy từ `classes/{classId}` của chính
 * link người nhắn — không đọc từ nội dung tin nhắn.
 */
describe('link cổng web — đúng lớp, đúng vai', () => {
  it('L1: HS nhận link /lop/<mã lớp> của chính lớp mình', () => {
    expect(webPortalUrl('student', 'R6RCFC')).toBe('https://giaoandewey.vercel.app/lop/R6RCFC');
  });

  it('L2: PH nhận link /ph/<mã lớp>, không phải /lop', () => {
    expect(webPortalUrl('parent', 'R6RCFC')).toBe('https://giaoandewey.vercel.app/ph/R6RCFC');
    expect(webPortalUrl('parent', 'R6RCFC')).not.toContain('/lop/');
  });

  it('L3: không có mã lớp thì KHÔNG gửi link (thà thiếu còn hơn link sai)', () => {
    expect(webPortalUrl('student', '')).toBe('');
    expect(webPortalUrl('student', '   ')).toBe('');
    const text = `Em làm bài tốt.\n\n${MENU_HINT}`;
    expect(withWebPortalLink(text, 'student', '')).toBe(text);
  });

  it('L4: link nằm NGAY TRƯỚC câu nhắc menu, không sau', () => {
    const out = withWebPortalLink(`Em làm bài tốt.\n\n${MENU_HINT}`, 'student', 'R6RCFC');
    const linkIdx = out.indexOf('https://giaoandewey.vercel.app/lop/R6RCFC');
    const hintIdx = out.indexOf(MENU_HINT);
    expect(linkIdx).toBeGreaterThan(-1);
    expect(hintIdx).toBeGreaterThan(linkIdx);
    // và là dòng cuối cùng trước câu nhắc menu
    expect(out.endsWith(MENU_HINT)).toBe(true);
  });

  it('L5: hai lớp khác nhau → mỗi HS chỉ thấy mã lớp của mình (không lẫn)', () => {
    const lop11 = withWebPortalLink(`Câu trả lời.\n\n${MENU_HINT}`, 'student', 'R6RCFC');
    const lop10 = withWebPortalLink(`Câu trả lời.\n\n${MENU_HINT}`, 'student', 'X9ABCD');

    expect(lop11).toContain('/lop/R6RCFC');
    expect(lop11).not.toContain('X9ABCD');

    expect(lop10).toContain('/lop/X9ABCD');
    expect(lop10).not.toContain('R6RCFC');
  });

  it('L6: câu trả lời không có nhắc menu vẫn được gắn link (không nuốt mất link)', () => {
    const out = withWebPortalLink('Em cần cố gắng thêm.', 'student', 'R6RCFC');
    expect(out).toContain('https://giaoandewey.vercel.app/lop/R6RCFC');
    expect(out).toContain('Em cần cố gắng thêm.');
  });

  it('L7: mã lớp có ký tự đặc biệt được encode, không phá URL', () => {
    expect(webPortalUrl('student', 'A B/C')).toBe('https://giaoandewey.vercel.app/lop/A%20B%2FC');
  });

  it('L8: chỉ gắn link MỘT lần dù câu trả lời có nhiều dòng', () => {
    const out = withWebPortalLink(`Dòng 1.\nDòng 2.\n\n${MENU_HINT}`, 'student', 'R6RCFC');
    expect(out.match(/https:\/\/giaoandewey\.vercel\.app\/lop\/R6RCFC/g)).toHaveLength(1);
  });

  it('L9: câu trả lời dài không được cắt mất link (trần 2000 ký tự của Zalo)', () => {
    const long = `${'Em cần ôn lại phần đạo hàm. '.repeat(120)}\n\n${MENU_HINT}`;
    expect(long.length).toBeGreaterThan(2000);
    const out = withWebPortalLink(long, 'student', 'R6RCFC');
    expect(out.length).toBeLessThanOrEqual(2000);
    expect(out).toContain('https://giaoandewey.vercel.app/lop/R6RCFC');
    expect(out.endsWith(MENU_HINT)).toBe(true);
  });
});
