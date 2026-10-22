import { describe, expect, it } from 'vitest';
import { detectAnswers, detectAnswersFromFiles } from '../imageCompress';

function sheet(options: { missing?: number[]; gap?: number; top?: number; faint?: boolean; double?: boolean; skew?: number } = {}) {
  const width = 1152, height = 1536, data = new Uint8ClampedArray(width * height * 4).fill(255);
  const gap = options.gap ?? 48;
  for (let block = 0; block < 4; block++) for (let row = 0; row < 10; row++) {
    if (options.missing?.includes(row)) continue;
    for (let col = 0; col < 4; col++) {
      const x = 110 + block * 245 + col * gap + row * (options.skew ?? 0);
      const y = (options.top ?? 580) + row * 24 + col * (options.skew ?? 0);
      for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
        const radius = Math.hypot(dx, dy);
        const filled = row === 0 && (col === 1 || (options.double && col === 2));
        let color = radius >= 8 && radius <= 10 ? 40 : filled && radius < 8 ? (options.faint && dx > 0 ? 180 : 90) : 255;
        if (radius > 10) color = 255;
        const i = (Math.round(y + dy) * width + Math.round(x + dx)) * 4;
        data[i] = color; data[i + 1] = color; data[i + 2] = color;
        // Nét đỏ ở D không được thành đáp án.
        if (col === 3 && Math.abs(dx - dy) < 2 && radius < 8) { data[i] = 220; data[i + 1] = 35; data[i + 2] = 30; }
      }
    }
  }
  return { width, height, data };
}

describe('OMR lưới A–D', () => {
  it('bỏ đỏ, khóa 4 khối × 10 hàng, ô trắng trả null', () => {
    const answers = detectAnswers(sheet());
    expect(answers).toHaveLength(40);
    expect(answers[0]).toEqual({ questionNo: 1, answer: 'B', confidence: .95 });
    expect(answers[10]).toEqual({ questionNo: 11, answer: 'B', confidence: .95 });
    expect(answers[1]).toEqual({ questionNo: 2, answer: null, confidence: 0 });
  });
  it('nội suy hàng trong khối, kể cả hai hàng cuối thiếu', () => {
    const answers = detectAnswers(sheet({ missing: [3, 5, 8, 9] }));
    expect(answers).toHaveLength(40);
    expect(answers[9]).toEqual({ questionNo: 10, answer: null, confidence: 0 });
  });
  it('chịu nghiêng nhẹ', () => {
    expect(detectAnswers(sheet({ skew: .4 }))[0]?.answer).toBe('B');
  });
  it('nhiều bóng hoặc bóng mờ không được chắc chắn', () => {
    expect(detectAnswers(sheet({ double: true }))[0]?.confidence).toBe(0);
    expect(detectAnswers(sheet({ faint: true }))[0]?.confidence).toBe(0);
  });
  it('loại vùng đầu trang, bước ngang sai, khối thiếu quá nhiều hàng', () => {
    expect(detectAnswers(sheet({ top: 100 }))).toEqual([]);
    expect(detectAnswers(sheet({ gap: 30 }))).toEqual([]);
    expect(detectAnswers(sheet({ missing: [3, 4, 5, 6, 7] }))).toEqual([]);
  });
  it('File không giải mã được hoặc không có ảnh vẫn fallback, không làm mất lượt nộp', async () => {
    expect(await detectAnswersFromFiles([new File(['broken'], 'paper.jpg', { type: 'image/jpeg' })])).toEqual([]);
    expect(await detectAnswersFromFiles([new File(['pdf'], 'paper.pdf', { type: 'application/pdf' })])).toEqual([]);
  });
});
