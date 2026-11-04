/**
 * Hướng A (gợi ý của Phát, chốt 4/11): bot nhắn như NGƯỜI THẬT — chia 2–3 tin ngắn thay vì
 * dồn một khối dài. Test khoá các ranh giới an toàn:
 *  - câu ngắn → giữ 1 tin (người thật cũng vậy);
 *  - không cắt giữa câu, không cắt giữa URL;
 *  - không để lại mảnh cụt vô nghĩa;
 *  - tôn trọng số tin tối đa.
 */
import { describe, expect, it } from 'vitest';
import { splitForChat } from '../_assistant-natural-reply.js';

const long = [
  'Bảo Trâm nè, bài tuần 5 em làm khá tốt phần phân số, được 8/10 điểm và thầy cô có ghi nhận em trình bày sạch sẽ hơn tuần trước.',
  '',
  'Phần hình học thì em cần vẽ hình ra giấy trước khi tính, đừng tính nhẩm rồi ghi kết quả luôn vì dễ sai dấu và mất điểm trình bày.',
  '',
  'Mình gửi thêm 2 bài luyện tập nhé, em làm xong nhắn mình chấm cho, làm xong trước cuối tuần là kịp ôn thi giữa kỳ.',
  '',
  'Nhắn 0 để xem lại menu.',
].join('\n');

describe('splitForChat — nhịp nhắn tự nhiên', () => {
  it('câu ngắn → giữ nguyên 1 tin', () => {
    expect(splitForChat('Dạ em chào thầy ạ.')).toEqual(['Dạ em chào thầy ạ.']);
  });

  it('chuỗi rỗng → mảng rỗng (caller không gửi tin trống)', () => {
    expect(splitForChat('')).toEqual([]);
    expect(splitForChat('   ')).toEqual([]);
  });

  it('câu dài nhiều đoạn → chia thành nhiều tin, không mất chữ nào', () => {
    const parts = splitForChat(long, 3);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.length).toBeLessThanOrEqual(3);
    // Ghép lại phải khớp nội dung gốc (chỉ khác khoảng trắng ở mối nối).
    const rejoined = parts.join(' ').replace(/\s+/g, ' ').trim();
    expect(rejoined).toBe(long.replace(/\s+/g, ' ').trim());
  });

  it('không cắt giữa URL — link web phải còn nguyên để bấm được', () => {
    const withLink = `Em xem báo cáo đầy đủ tại cổng web của lớp nhé. Điểm từng bài và nhận xét của thầy cô đều nằm trong đó, mở bằng điện thoại cũng được. https://smartplan.ai/parenthub?code=join-abc-123&lop=6A1 Thầy cô cập nhật mỗi tuần nên em xem thường xuyên nhé. Nhắn 0 để xem lại menu.`;
    const parts = splitForChat(withLink, 3);
    const joined = parts.join('');
    expect(joined).toContain('https://smartplan.ai/parenthub?code=join-abc-123&lop=6A1');
    // Không phần nào bị cụt giữa URL.
    for (const part of parts) {
      expect(part).not.toMatch(/https?:\/\/\S*$/);
    }
  });

  it('tôn trọng số tin tối đa', () => {
    const veryLong = Array.from({ length: 12 }, (_, i) => `Đây là câu số ${i + 1} trong một đoạn rất dài để thử giới hạn chia tin nhắn.`).join(' ');
    expect(splitForChat(veryLong, 2).length).toBeLessThanOrEqual(2);
    expect(splitForChat(veryLong, 3).length).toBeLessThanOrEqual(3);
  });

  it('không để lại mảnh cụt ngắn ở cuối (gộp vào tin trước)', () => {
    const text = `${'Một câu khá dài để đẩy độ dài tổng lên cho vượt ngưỡng cần chia tin nhắn. '.repeat(4)}nhé!`;
    const parts = splitForChat(text, 3);
    expect(parts[parts.length - 1].length).toBeGreaterThanOrEqual(60);
  });
});
