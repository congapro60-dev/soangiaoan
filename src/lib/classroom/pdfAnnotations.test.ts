import { describe, expect, it } from 'vitest';
import { NHAN_BAI_LAM_CHU_THICH, docChuThichPdf, ghepChuTrongVung, moTaChuThich, type HopChu } from './pdfAnnotations';

// Bài làm in sẵn: học sinh trả lời bằng bôi màu lên phương án. Máy cần biết CHÍNH XÁC em bôi chữ
// gì, vì ảnh render có thể mất dấu (annotation không kèm appearance stream).
describe('đọc dấu bôi màu trên tờ đề in sẵn', () => {
  const items: HopChu[] = [
    { str: 'Câu', x1: 50, y1: 700, x2: 78, y2: 712 },
    { str: '1.', x1: 82, y1: 700, x2: 94, y2: 712 },
    { str: 'A.', x1: 50, y1: 680, x2: 62, y2: 692 },
    { str: '2', x1: 66, y1: 680, x2: 72, y2: 692 },
    { str: 'B.', x1: 120, y1: 680, x2: 132, y2: 692 },
    { str: '3', x1: 136, y1: 680, x2: 142, y2: 692 },
    { str: 'C.', x1: 190, y1: 680, x2: 202, y2: 692 },
    { str: '4', x1: 206, y1: 680, x2: 212, y2: 692 },
  ];

  it('ghép đúng chữ nằm dưới vùng bôi, không lẫn phương án bên cạnh hay dòng trên', () => {
    // Vùng bôi trùm phương án B (cao hơn dòng chữ một chút như highlight thật).
    const chu = ghepChuTrongVung(items, { x1: 116, y1: 676, x2: 146, y2: 696 });
    expect(chu).toBe('B. 3');
  });

  it('không dấu nào → chuỗi rỗng (máy phải coi là chưa làm, không lấy đáp án in sẵn)', () => {
    expect(ghepChuTrongVung(items, { x1: 320, y1: 676, x2: 340, y2: 696 })).toBe('');
  });

  it('vùng bôi trùm cả dòng thì đọc theo thứ tự trái sang phải, gộp khoảng trắng', () => {
    const chu = ghepChuTrongVung(items, { x1: 40, y1: 676, x2: 220, y2: 696 });
    expect(chu).toBe('A. 2 B. 3 C. 4');
  });

  it('dựng dòng mô tả theo trang, bỏ trùng và cắt chú thích quá dài', () => {
    const text = moTaChuThich([
      { page: 2, nhan: 'bôi màu', text: 'B. 3' },
      { page: 2, nhan: 'bôi màu', text: 'B. 3' },
      { page: 3, nhan: 'chữ gõ thêm', text: 'x = 2' },
      { page: 3, nhan: 'ghi chú', text: 'a'.repeat(400) },
    ]);
    expect(text.split('\n')).toHaveLength(3);
    expect(text).toContain('- Trang 2 · bôi màu: "B. 3"');
    expect(text).toContain('- Trang 3 · chữ gõ thêm: "x = 2"');
    expect(text).not.toContain('a'.repeat(181));
  });

  it('nhãn gửi sang máy chấm khớp với mục prompt đang dặn', () => {
    expect(NHAN_BAI_LAM_CHU_THICH).toBe('BÀI LÀM ĐÁNH DẤU TRÊN FILE ĐỀ (máy đọc từ chú thích PDF)');
  });
});

/**
 * pdf.js thật (legacy build, kiểm trên PDF có highlight KHÔNG kèm appearance stream) trả dữ liệu
 * theo hình dạng dưới đây — chữ chú thích nằm trong `contentsObj` chứ KHÔNG phải `contents`,
 * chữ nằm dưới vùng bôi nằm trong `overlaidText`, chữ em gõ thêm nằm trong `textContent`.
 */
const pdfjsGia = (annotations: Array<Record<string, unknown>>, items: unknown[] = []) => ({
  getDocument: () => ({ promise: Promise.resolve({
    numPages: 1,
    getPage: async () => ({
      getViewport: () => ({ transform: [1, 0, 0, 1, 0, 0], convertToViewportRectangle: (rect: [number, number, number, number]) => rect }),
      getAnnotations: async () => annotations,
      getTextContent: async () => ({ items }),
    }),
    destroy: async () => undefined,
  }) }),
  Util: { transform: (_m1: number[], m2: number[]) => m2 },
});

describe('docChuThichPdf — ghép kết quả pdf.js thành chữ cho máy chấm', () => {
  const file = new File(['x'], 'baidoc.pdf', { type: 'application/pdf' });

  it('đọc chữ trong contentsObj (KHÔNG phải contents) và chữ gõ tay trong textContent', async () => {
    const text = await docChuThichPdf(file, { pdfjs: pdfjsGia([
      { subtype: 'Highlight', rect: [100, 100, 200, 120], overlaidText: 'B. 3', contentsObj: { str: 'Em chon B' } },
      { subtype: 'FreeText', rect: [50, 50, 300, 80], textContent: ['x', '=', '2'] },
      // Chú thích không phải dấu làm bài (link của đề in sẵn) → bỏ.
      { subtype: 'Link', rect: [0, 0, 10, 10] },
    ]) as never });
    expect(text).toBe([
      '- Trang 1 · bôi màu: "B. 3"',
      '- Trang 1 · bôi màu · ghi chú: "Em chon B"',
      '- Trang 1 · chữ gõ thêm: "x = 2"',
    ].join('\n'));
  });

  it('highlight thiếu overlaidText thì tự ghép chữ nằm dưới vùng bôi', async () => {
    const text = await docChuThichPdf(file, { pdfjs: pdfjsGia(
      [{ subtype: 'Highlight', rect: [100, 100, 200, 120] }],
      [
        { str: 'B.', transform: [10, 0, 0, 10, 105, 118], width: 12, height: 10 },
        { str: '3', transform: [10, 0, 0, 10, 120, 118], width: 6, height: 10 },
      ],
    ) as never });
    expect(text).toBe('- Trang 1 · bôi màu: "B. 3"');
  });

  it('PDF không có dấu nào → chuỗi rỗng, không bịa', async () => {
    expect(await docChuThichPdf(file, { pdfjs: pdfjsGia([]) as never })).toBe('');
  });
});
