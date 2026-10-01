import { describe, expect, it } from 'vitest';
import { defaultMaxStretch, findBreakPoint, mergeZones, snapBreakToRowGap } from './pdfExport';

const PAGE = 1000;

/** Cắt cả tài liệu thành các trang như exportElementToPdf, trả chiều cao từng lát. */
const slices = (height: number, zones: { start: number; end: number }[], maxStretch?: number): number[] => {
  const out: number[] = [];
  let start = 0;
  while (start < height) {
    const end = Math.min(findBreakPoint(start + PAGE, start, PAGE, zones, maxStretch), height);
    out.push(end - start);
    start = end;
  }
  return out;
};

describe('ngắt trang PDF', () => {
  // Khối cao 1.4 trang bị đẩy sang trang sau → trang đó bắt đầu ĐÚNG đầu khối (nhánh "giữa khối").
  const zones = [{ start: 900, end: 2300 }];
  const cases = [zones, [{ start: 300, end: 1700 }], [{ start: 950, end: 1040 }, { start: 1900, end: 2600 }]];

  it('mặc định (đề thi): khối cao hơn trang bị đẩy sang trang mới thì cắt trong khối, không lát nào quá 1.05 trang', () => {
    const hs = slices(3000, zones);
    expect(hs[0]).toBe(900); // đẩy cả khối sang trang 2
    expect(hs[1]).toBe(PAGE); // trước đây 1400 → vẽ tràn khỏi tờ A4, mất phần dưới, đè số trang
    for (const zs of cases) for (const h of slices(3000, zs)) expect(h).toBeLessThanOrEqual(PAGE * 1.05);
  });

  it('khối giữa trang vừa trong trần giãn thì vẫn giữ nguyên tới cuối khối', () => {
    expect(findBreakPoint(1900, 900, PAGE, [{ start: 900, end: 1930 }], 1.05)).toBe(1930);
  });

  it('có maxStretch: không lát nào cao quá maxStretch trang — nội dung không tràn xuống số trang', () => {
    const maxStretch = 1.03;
    for (const zs of cases) {
      for (const h of slices(3000, zs, maxStretch)) expect(h).toBeLessThanOrEqual(PAGE * maxStretch);
    }
  });

  it('khối nhỏ vắt ngang chỗ ngắt: giãn trang trong giới hạn thay vì cắt khối', () => {
    expect(findBreakPoint(PAGE, 0, PAGE, [{ start: 990, end: 1020 }], 1.03)).toBe(1020);
    expect(findBreakPoint(PAGE, 0, PAGE, [{ start: 990, end: 1040 }], 1.03)).toBe(990);
  });
});

describe('trần giãn mặc định theo lề', () => {
  it('chỉ giãn trong phần lề dưới còn trống phía trên số trang', () => {
    // Lề mặc định 15mm, số trang ở 7.5mm → nội dung phải dừng ở ≥ 13.5mm: chỉ còn 1.5mm để giãn.
    const s = defaultMaxStretch(267, 15, 7.5);
    expect((s - 1) * 267).toBeCloseTo(1.5);
    // Phiếu làm bài lề 5mm: không còn chỗ giãn — 1.05 cũ vẽ tràn 14mm khỏi mép giấy.
    expect(defaultMaxStretch(287, 5, 2.5)).toBe(1);
    // Lề rất rộng vẫn không quá 1.05.
    expect(defaultMaxStretch(200, 60, 5)).toBe(1.05);
  });
});

describe('lùi chỗ cắt lên khe giữa hai dòng', () => {
  const W = 8;
  const WHITE = 0xffffffff;
  const BORDER = 0xff0000ff;
  /** Mỗi phần tử là một hàng: 'gap' = hàng trống (chỉ có viền khung ở cột 0), 'ink' = hàng có chữ (khác nhau từng hàng). */
  const image = (rows: ('gap' | 'ink')[]): Uint8ClampedArray => {
    const px = new Uint32Array(rows.length * W);
    rows.forEach((kind, r) => {
      for (let x = 0; x < W; x++) px[r * W + x] = x === 0 ? BORDER : kind === 'ink' && x === 1 + (r % (W - 1)) ? 0xff000000 : WHITE;
    });
    return new Uint8ClampedArray(px.buffer);
  };

  it('chỗ cắt rơi giữa một dòng chữ → lùi lên giữa khe trống ngay trên dòng đó (viền khung không cản)', () => {
    // Hàng 0–3 chữ, 4–9 khe (6 hàng), 10–15 chữ; chỗ cắt = ngay dưới hàng 15 (y = 1016).
    const rows = image([...Array(4).fill('ink'), ...Array(6).fill('gap'), ...Array(6).fill('ink')]);
    const at = snapBreakToRowGap(rows, W, 1016, 4);
    // Hàng 4 ↔ y = 1004; giữa khe 6 hàng → y = 1007.
    expect(at).toBe(1007);
  });

  it('khe quá hẹp (nét chữ ngang) hoặc không có khe → giữ nguyên chỗ cắt', () => {
    expect(snapBreakToRowGap(image([...Array(5).fill('ink'), 'gap', 'gap', ...Array(5).fill('ink')]), W, 500, 4)).toBe(500);
    expect(snapBreakToRowGap(image(Array(12).fill('ink')), W, 500, 4)).toBe(500);
  });
});

describe('gộp vùng cấm ngắt trang', () => {
  it('các câu nằm sát nhau (chỉ lệch làm tròn 1–3px) vẫn là từng vùng riêng, không gộp cả đề thành một khối', () => {
    const questions = Array.from({ length: 20 }, (_, i) => ({ start: i * 100 + (i % 2), end: (i + 1) * 100 + 1 }));
    expect(mergeZones(questions)).toHaveLength(20);
  });

  it('khối con nằm trong khối cha, hoặc tiêu đề kéo sang khối liền sau (chồng thật) thì gộp', () => {
    expect(mergeZones([{ start: 0, end: 500 }, { start: 100, end: 200 }, { start: 450, end: 520 }])).toEqual([{ start: 0, end: 520 }]);
  });

  it('sắp xếp theo vị trí trước khi gộp, không sửa mảng đầu vào', () => {
    const raw = [{ start: 300, end: 400 }, { start: 0, end: 100 }];
    expect(mergeZones(raw)).toEqual([{ start: 0, end: 100 }, { start: 300, end: 400 }]);
    expect(raw[0]).toEqual({ start: 300, end: 400 });
  });

  it('3 câu cao 0.6 trang liền nhau: trước khi sửa gộp thành một vùng 1.8 trang → cắt ngang câu; nay đẩy cả câu 2 sang trang sau', () => {
    const zs = mergeZones([{ start: 0, end: 600 }, { start: 600, end: 1200 }, { start: 1199, end: 1800 }]);
    expect(findBreakPoint(PAGE, 0, PAGE, zs, 1.05)).toBe(600);
  });
});
