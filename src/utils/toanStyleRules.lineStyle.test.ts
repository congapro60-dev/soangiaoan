/**
 * Bộ màu phân loại dòng cho giáo án ban Toán (chốt 2026-07).
 * Các ca dưới đây lấy TRỰC TIẾP từ 3 giáo án định hướng Bài 19 đang dùng thật.
 *
 * Hai bẫy đã mắc khi viết regex, giữ test để không tái phạm:
 *  - `\b` sau chữ tiếng Việt có dấu KHÔNG tạo ranh giới từ ("ý" không phải \w ASCII)
 *    → /gợi\s*ý\b/ trượt hết mọi dòng "Gợi ý: ...".
 *  - Emoji ngoài BMP (💡 U+1F4A1) nằm trong char class không bật cờ `u` bị tách đôi
 *    thành 2 nửa surrogate → không bao giờ khớp.
 */
import { describe, it, expect } from 'vitest';
import { matchToanLineKind, matchToanLineStyle, TOAN_LINE_STYLES } from './toanStyleRules';

describe('matchToanLineKind — cảnh báo lỗi (đỏ đậm)', () => {
  it.each([
    '⚠ Lỗi phổ biến: nhầm dấu c',
    '⚠️ Lỗi phổ biến: biến thể có VS16',
    '→ Dự kiến khó khăn: HS nhầm dấu c. GV chuẩn bị bẫy sớm.',
    '→ Dự kiến nhầm lẫn Bài 2: HS lấy VCP thay vì VPT.',
    '⚠ Lỗi cần tránh: VPT ⊥ AB (không phải // AB).',
  ])('nhận diện: %s', (line) => {
    expect(matchToanLineKind(line)).toBe('warning');
  });
});

describe('matchToanLineKind — gợi ý phân hóa (cam nghiêng)', () => {
  it.each([
    '↳ Gợi ý từng bước: GV để sẵn thẻ trên bàn nhóm TB',
    '💡 Gợi ý: BC = ? → đó chính là VTPT của AH.',
    'Gợi ý (HS có thể lật thẻ nếu bí sau 2 phút): thay a=5, b=1',
  ])('nhận diện: %s', (line) => {
    expect(matchToanLineKind(line)).toBe('hint');
  });
});

describe('matchToanLineKind — ghi chú điều hành (xám nghiêng)', () => {
  it.each([
    '→ Chờ ≥ 3 giây sau mỗi câu. Gọi ngẫu nhiên.',
    '→ Chờ 5 giây. Yêu cầu HS dùng định nghĩa để phản bác.',
  ])('nhận diện: %s', (line) => {
    expect(matchToanLineKind(line)).toBe('wait');
  });
});

describe('matchToanLineKind — câu hỏi cốt lõi (xanh nghiêng)', () => {
  it('chỉ nhận khi dòng in nghiêng + trong ngoặc kép + có dấu hỏi', () => {
    const q = '"Làm thế nào biểu diễn một đường thẳng bất kỳ bằng một đẳng thức đại số duy nhất?"';
    expect(matchToanLineKind(q, { isQuotedItalic: true })).toBe('core_q');
    // Không in nghiêng thì là lời thoại thường, giữ đen.
    expect(matchToanLineKind(q)).toBeUndefined();
  });
});

describe('matchToanLineKind — kịch bản thường phải GIỮ ĐEN', () => {
  it.each([
    'GV vẽ đường thẳng Δ lên bảng. Vẽ một vectơ n có giá vuông góc với Δ.',
    'HS: "Giá của n vuông góc với Δ."',
    '[PHÁT HIỆN] Một đường thẳng có bao nhiêu vectơ pháp tuyến?',
    '- (Phút 1) GV đứng ở trung tâm lớp, chiếu bản đồ quy hoạch.',
    'Lời giải: thay A(2;3) vào PT',
    'GV gợi ý cho nhóm yếu nếu cần', // "gợi ý" giữa câu — KHÔNG phải dòng gợi ý
    'Bước 2: Tìm hướng giải',
  ])('không tô màu: %s', (line) => {
    expect(matchToanLineKind(line)).toBeUndefined();
  });

  it('dòng rỗng trả về undefined', () => {
    expect(matchToanLineKind('')).toBeUndefined();
    expect(matchToanLineKind('   ')).toBeUndefined();
  });
});

describe('matchToanLineStyle', () => {
  it('trả đúng bộ style theo loại dòng', () => {
    expect(matchToanLineStyle('⚠ Lỗi phổ biến: sai dấu')).toEqual(TOAN_LINE_STYLES.warning);
    expect(matchToanLineStyle('💡 Gợi ý: dùng công thức trung điểm')).toEqual(TOAN_LINE_STYLES.hint);
    expect(matchToanLineStyle('→ Chờ ≥ 3 giây, gọi ngẫu nhiên')).toEqual(TOAN_LINE_STYLES.wait);
    expect(matchToanLineStyle('GV chiếu bài toán mở đầu')).toBeUndefined();
  });

  it('cảnh báo là đỏ đậm, gợi ý là cam nghiêng, ghi chú là xám nghiêng', () => {
    expect(TOAN_LINE_STYLES.warning).toEqual({ color: 'C00000', bold: true });
    expect(TOAN_LINE_STYLES.hint).toEqual({ color: 'C55A11', italic: true });
    expect(TOAN_LINE_STYLES.wait).toEqual({ color: '7F7F7F', italic: true });
    expect(TOAN_LINE_STYLES.core_q).toEqual({ color: '2E75B6', italic: true });
  });
});
