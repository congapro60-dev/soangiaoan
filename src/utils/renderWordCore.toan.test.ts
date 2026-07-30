import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { Packer } from 'docx';
import { buildWordDocument } from './renderWordCore';

/**
 * Golden fixture cho styleProfile 'toan' (KHDH ban Toán kiểu v13) + regression guard:
 * KHÔNG truyền styleProfile → output phải y hệt hành vi cũ (không dính fill/màu toan).
 */

// Fixture cố tình có heading biến thể (emoji, số, HOA/thường lẫn) để test chuẩn hóa.
const FIXTURE = `# KẾ HOẠCH DẠY HỌC — Phương trình đường thẳng (Tiết 1)

## I. THÔNG TIN CHUNG
- Môn: Toán · Lớp 10 · Thời lượng: 40 phút

## II. MỤC TIÊU

| Mức độ | Mục tiêu |
|---|---|
| Cơ bản | Nhận diện VPT từ PT tổng quát [Bloom: Hiểu] |
| Trọng tâm | Lập PT tổng quát $ax+by+c=0$ [Bloom: Áp dụng] |
| Nâng cao | Chứng minh trường hợp mở rộng [Bloom: Phân tích] |

## 🚀 HOẠT ĐỘNG 2: hình thành KIẾN THỨC (~15 phút)

| Thời gian | Giáo viên và Học sinh | Nội dung ghi bảng |
|---|---|---|
| P6–P9 | **[PHÁT HIỆN]** Em nhận xét gì về phương của $\\vec{n}$? | Định nghĩa: $\\vec{n} \\ne \\vec{0}$ là VPT |
| P10 | GV chốt công thức | $$a(x-x_0)+b(y-y_0)=0$$ |

## HƯỚNG DẪN VỀ NHÀ (BTVN)
- Bài 7.1: dạng đoạn chắn $\\frac{x}{2}+\\frac{y}{3}=1$
`;

// 5 công thức trong fixture: ax+by+c=0 · vec n · vec n ne 0 · display · frac
const EXPECTED_OMATH_COUNT = 5;

const TOAN_FILLS = [/c9daf8/i, /b6d7a8/i, /ead1dc/i];

async function renderXml(styleProfile?: 'toan'): Promise<string> {
  const doc = buildWordDocument({ title: 'KHDH Test', content: FIXTURE, styleProfile });
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  return zip.file('word/document.xml')!.async('string');
}

const countOmath = (xml: string): number => (xml.match(/<m:oMath[\s>]/g) || []).length;

describe('renderWordCore styleProfile=toan — golden fixture', () => {
  it('công thức vẫn là OMML native, đủ số lượng', async () => {
    const xml = await renderXml('toan');
    expect(countOmath(xml)).toBe(EXPECTED_OMATH_COUNT);
  });

  it('banner mục có fill màu v13 (kể cả heading biến thể emoji/hoa-thường)', async () => {
    const xml = await renderXml('toan');
    for (const fill of TOAN_FILLS) {
      expect(xml).toMatch(fill); // c9daf8 thông tin chung · b6d7a8 hoạt động · ead1dc BTVN
    }
    expect(xml).toMatch(/fce5cd/i); // mục tiêu (banner) — và FCE5CD (hàng Trọng tâm)
  });

  it('bảng mục tiêu tô màu 3 hàng Cơ bản/Trọng tâm/Nâng cao', async () => {
    const xml = await renderXml('toan');
    expect(xml).toContain('D9EAD3');
    expect(xml).toContain('FFF2CC');
  });

  it('bảng hoạt động dùng độ rộng cột 15/45/40% + header cfe2f3', async () => {
    const xml = await renderXml('toan');
    // Chuẩn ban Toán 15/45/40 (chốt 2026-07, trước đây 11/54/35 — cột Thời gian quá hẹp
    // làm mốc "P12 – P22" bị xuống dòng). PRINTABLE_TWIPS_PORTRAIT = 9184 → floor(ratio × 9184).
    expect(xml).toContain('w:w="1377"');
    expect(xml).toContain('w:w="4132"');
    expect(xml).toContain('w:w="3673"');
    expect(xml).toMatch(/cfe2f3/i);
  });

  it('nhãn **[PHÁT HIỆN]** render run màu 1F4E79', async () => {
    const xml = await renderXml('toan');
    expect(xml).toContain('1F4E79');
  });
});

describe('renderWordCore KHÔNG truyền styleProfile — regression guard', () => {
  it('không dính bất kỳ fill/màu toan nào; header bảng vẫn E2E8F0 cũ; OMML giữ nguyên', async () => {
    const xml = await renderXml(undefined);
    for (const fill of TOAN_FILLS) {
      expect(xml).not.toMatch(fill);
    }
    expect(xml).not.toContain('1F4E79');
    expect(xml).not.toContain('D9EAD3');
    expect(xml).toContain('E2E8F0'); // header bảng generic như cũ
    expect(countOmath(xml)).toBe(EXPECTED_OMATH_COUNT); // pipeline toán không phụ thuộc profile
  });
});
