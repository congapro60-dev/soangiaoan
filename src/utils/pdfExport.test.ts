import { describe, expect, it } from 'vitest';
import { findBreakPoint } from './pdfExport';

const PAGE = 1000;

/** Cắt cả tài liệu thành các trang như exportElementToPdf, trả chiều cao từng lát. */
const slices = (height: number, zones: { start: number; end: number }[], maxStretch?: number, midZoneMax?: number): number[] => {
  const out: number[] = [];
  let start = 0;
  while (start < height) {
    const end = Math.min(findBreakPoint(start + PAGE, start, PAGE, zones, maxStretch, midZoneMax), height);
    out.push(end - start);
    start = end;
  }
  return out;
};

describe('ngắt trang PDF', () => {
  // Khối cao 1.4 trang bị đẩy sang trang sau → trang đó bắt đầu ĐÚNG đầu khối (nhánh "giữa khối").
  const zones = [{ start: 900, end: 2300 }];

  it('mặc định cũ: trang bắt đầu giữa khối được kéo tới cuối khối dù cao hơn một trang (giữ nguyên cho đề thi)', () => {
    expect(slices(3000, zones)).toContain(1400);
  });

  it('có maxStretch: không lát nào cao quá maxStretch trang — nội dung không tràn xuống số trang', () => {
    const maxStretch = 1.03;
    for (const zs of [zones, [{ start: 300, end: 1700 }], [{ start: 950, end: 1040 }, { start: 1900, end: 2600 }]]) {
      for (const h of slices(3000, zs, maxStretch, maxStretch)) expect(h).toBeLessThanOrEqual(PAGE * maxStretch);
    }
  });

  it('khối nhỏ vắt ngang chỗ ngắt: giãn trang trong giới hạn thay vì cắt khối', () => {
    expect(findBreakPoint(PAGE, 0, PAGE, [{ start: 990, end: 1020 }], 1.03, 1.03)).toBe(1020);
    expect(findBreakPoint(PAGE, 0, PAGE, [{ start: 990, end: 1040 }], 1.03, 1.03)).toBe(990);
  });
});
