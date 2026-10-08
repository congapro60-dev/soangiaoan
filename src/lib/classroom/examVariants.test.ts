import { describe, expect, it } from 'vitest';
import {
  buildDetectExamCodePrompt, buildExtractVariantKeysPrompt, codeFromFileName, countKeyQuestions, docxXmlToText, examMarkLabels, examScoreCheck,
  parseDetectedExamCode, parseExtractedVariantKeys, pdfItemsToText, sanitizeExamVariants, splitVariantSources,
} from './examVariants';

const p = (text: string) => `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
const row = (...cells: string[]) => `<w:tr><w:trPr/>${cells.map(cell => `<w:tc><w:tcPr><w:tcW w:w="900"/></w:tcPr>${p(cell)}</w:tc>`).join('')}</w:tr>`;

describe('đọc Word giữ cấu trúc bảng', () => {
  it('mỗi đoạn một dòng, mỗi hàng bảng một dòng "ô | ô"; bỏ thẻ định dạng; giải mã ký tự', () => {
    const xml = `<w:document><w:body>${p('ĐỀ KIỂM TRA GIỮA KÌ I')}<w:tbl><w:tblPr/>${row('Câu', '1201', '1202')}${row('1', 'A', 'C')}</w:tbl>${p('x &lt; 2 &amp; y &gt; 0')}</w:body></w:document>`;
    expect(docxXmlToText(xml)).toBe('ĐỀ KIỂM TRA GIỮA KÌ I\nCâu | 1201 | 1202\n1 | A | C\nx < 2 & y > 0');
  });

  it('lấy chữ trong công thức Word, không lặp chữ hộp văn bản (mc:Fallback), tab/xuống dòng giữ khoảng cách', () => {
    const xml = `<w:p><w:r><w:t>Giải phương trình </w:t></w:r><m:oMath><m:r><m:t>x+1=0</m:t></m:r></m:oMath><w:r><w:tab/><w:t>.</w:t></w:r></w:p>`
      + `<mc:AlternateContent><mc:Choice>${p('Mã đề 101')}</mc:Choice><mc:Fallback>${p('Mã đề 101')}</mc:Fallback></mc:AlternateContent>`;
    expect(docxXmlToText(xml)).toBe('Giải phương trình x+1=0 .\nMã đề 101');
  });

  it('chữ tiếng Việt dạng tổ hợp (NFD) được chuẩn hoá NFC ngay khi đọc', () => {
    const text = docxXmlToText(p('Mã đề 101'.normalize('NFD')));
    expect(text).toBe('Mã đề 101');
    expect(text === text.normalize('NFC')).toBe(true);
  });
});

describe('nhận mã đề từ tên file', () => {
  it.each([
    ['Mã đề 101.docx', '101'],
    ['MÃ ĐỀ THI 1203.pdf', '1203'],
    ['MD102.docx', '102'],
    ['De_103.docx', '103'],
    ['Toan10 GK1 2026 - 104.docx', '104'],
    ['ma 1205.docx', '1205'],
    ['Đề kiểm tra giữa kì I.docx', null],
    ['Toán 12 GK1 2026.docx', null],
    ['101 102.docx', null],
  ])('%s → %s', (name, code) => {
    expect(codeFromFileName(name)).toBe(code);
  });
});

const de = (code: string, extra = '') => [
  `SỞ GD&ĐT HÀ NỘI | ĐỀ KIỂM TRA GIỮA HỌC KÌ I – MÔN TOÁN 12 | Mã đề: ${code}`,
  'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.',
  `Câu 1. Đề câu 1 của mã ${code}.`,
  'A. 1 B. 2 C. 3 D. 4',
  `Mã đề ${code} – Trang 2/4`,
  `Câu 2. Đề câu 2 của mã ${code}.${extra}`,
].join('\n');

describe('tách các mã đề', () => {
  it('khối 12 — MỘT file gộp: tách theo dòng "Mã đề", gộp mã in lại đầu trang, đầu trang thuộc đề đầu, bảng đáp án cuối thành tư liệu', () => {
    const text = ['TRƯỜNG THPT DISCOVER', de('1201'), de('1202'), 'BẢNG ĐÁP ÁN', 'Câu | 1201 | 1202', '1 | A | C', '2 | B | D'].join('\n');
    const plan = splitVariantSources([{ name: 'Toán 12 GK1 2026.docx', text }]);
    expect(plan.variants.map(v => v.code)).toEqual(['1201', '1202']);
    const [v1, v2] = plan.variants;
    expect(v1.sourceText).toContain('TRƯỜNG THPT DISCOVER');
    expect(v1.sourceText).toContain('Câu 2. Đề câu 2 của mã 1201.');
    expect(v1.sourceText).not.toContain('1202');
    expect(v2.sourceText).not.toContain('BẢNG ĐÁP ÁN');
    expect(plan.answerMaterial).toContain('Câu | 1201 | 1202');
    expect(plan.warnings).toEqual([]);
  });

  it('đáp án xen sau từng đề ("ĐÁP ÁN MÃ ĐỀ 101" hoặc "ĐÁP ÁN" không ghi mã) → tư liệu có nhãn mã', () => {
    const text = [de('101'), 'ĐÁP ÁN MÃ ĐỀ 101', 'Câu 1: A', 'Câu 2: B', de('102'), 'ĐÁP ÁN', 'Câu 1: C', 'Câu 2: D'].join('\n');
    const plan = splitVariantSources([{ name: 'gop.docx', text }]);
    expect(plan.variants.map(v => v.code)).toEqual(['101', '102']);
    expect(plan.variants[0].sourceText).not.toContain('Câu 1: A');
    expect(plan.variants[1].sourceText).not.toContain('Câu 1: C');
    expect(plan.answerMaterial).toContain('Phần đáp án nằm sau đề mã 101');
    expect(plan.answerMaterial).toContain('Phần đáp án nằm sau đề mã 102');
    expect(plan.answerMaterial).toContain('Câu 1: C');
  });

  it('bảng đáp án mỗi mã một hàng ("Mã đề 1201: 1A 2B…", "Mã đề 1202 | A | C | B | D") KHÔNG bị coi là đề mới', () => {
    const text = [de('1201'), de('1202'), 'BẢNG ĐÁP ÁN CÁC MÃ ĐỀ', 'Mã đề 1201: 1A 2B 3C', 'Mã đề 1202 | A | C | B | D'].join('\n');
    const plan = splitVariantSources([{ name: 'gop.docx', text }]);
    expect(plan.variants.map(v => v.code)).toEqual(['1201', '1202']);
    expect(plan.variants[1].sourceText).not.toContain('1A 2B');
    expect(plan.answerMaterial).toContain('Mã đề 1201: 1A 2B 3C');
    expect(plan.answerMaterial).toContain('Mã đề 1202 | A | C | B | D');
  });

  it('"Đáp án: B" ngay dưới một câu hỏi không cắt đề', () => {
    const plan = splitVariantSources([{ name: 'Mã đề 101.docx', text: 'Câu 1. Hỏi gì đó.\nĐáp án: B\nCâu 2. Hỏi tiếp.' }]);
    expect(plan.variants[0].sourceText).toContain('Câu 2. Hỏi tiếp.');
    expect(plan.answerMaterial).toBe('');
  });

  it('các khối khác — MỖI mã MỘT file: mã lấy từ tên file hoặc dòng "Mã đề" duy nhất; file đáp án riêng thành tư liệu', () => {
    const plan = splitVariantSources([
      { name: 'Mã đề 102.docx', text: 'Câu 1. Đề 102.' },
      { name: 'de-kiem-tra.pdf', text: 'Mã đề: 101\nCâu 1. Đề 101.' },
      { name: 'Đáp án mã 101.docx', text: 'Câu 1: A\nCâu 2: B' },
      { name: 'Bang dap an.docx', text: 'Câu | 101 | 102\n1 | A | B' },
      { name: 'scan.pdf', text: '' },
    ]);
    expect(plan.variants.map(v => [v.code, v.files])).toEqual([['101', ['de-kiem-tra.pdf']], ['102', ['Mã đề 102.docx']]]);
    expect(plan.variants[0].sourceText).not.toContain('Câu 1: A');
    expect(plan.answerMaterial).toContain('Phần đáp án nằm sau đề mã 101 (file "Đáp án mã 101.docx")');
    expect(plan.answerMaterial).toContain('Phần không ghi mã đề (file "Bang dap an.docx")');
    expect(plan.warnings).toEqual(['scan.pdf: không có chữ (bản scan hoặc ảnh) — dùng file Word/PDF gốc của người ra đề.']);
  });

  it('không nhận ra mã nào, hoặc không có phần đáp án → báo rõ cho giáo viên', () => {
    expect(splitVariantSources([{ name: 'de.docx', text: 'Câu 1. Không có mã.' }]).warnings[0]).toContain('Không nhận ra mã đề nào');
    expect(splitVariantSources([{ name: 'Mã đề 101.docx', text: 'Câu 1. Đề.' }]).warnings).toEqual(['Không thấy phần ĐÁP ÁN trong các file — dán đáp án vào từng mã trước khi giao.']);
  });
});

describe('đáp án và mã đề', () => {
  it('đếm câu trong đáp án chuẩn hoá, kể cả nhãn "Phần II – Câu 1"', () => {
    expect(countKeyQuestions('Phần I – Câu 1: A\nPhần I – Câu 2: B\nPhần II – Câu 1: a) Đ; b) S; c) Đ; d) S\nghi chú\nCâu 3 (tự luận, 1 điểm): …')).toBe(4);
  });

  it('máy chủ kiểm danh sách mã: mã hợp lệ, không trùng, bỏ mã rỗng; chặn độ dài', () => {
    const variants = sanitizeExamVariants([
      { code: '101', sourceText: ' đề ', answerKey: ' Câu 1: A ' },
      { code: '101', sourceText: 'trùng', answerKey: 'x' },
      { code: '1 0 2', sourceText: 'x', answerKey: 'x' },
      { code: '103', sourceText: '', answerKey: '' },
      { code: '104', sourceText: 'a'.repeat(50_000), answerKey: '' },
      'rác',
    ]);
    expect(variants.map(v => v.code)).toEqual(['101', '104']);
    expect(variants[0]).toEqual({ code: '101', sourceText: 'đề', answerKey: 'Câu 1: A' });
    expect(variants[1].sourceText).toHaveLength(40_000);
    expect(sanitizeExamVariants('x')).toEqual([]);
  });

  it('câu lệnh rút đáp án nêu đủ mã, cách đọc bảng nhiều cột và khuôn từng loại câu', () => {
    const prompt = buildExtractVariantKeysPrompt(['1201', '1202'], 'Câu | 1201 | 1202', { 1201: 'Câu 1. Cho hàm số' });
    expect(prompt).toContain('Các mã đề: 1201, 1202.');
    expect(prompt).toContain('đọc đúng CỘT của từng mã');
    expect(prompt).toContain('Phần II – Câu 1: a) Đ; b) S; c) Đ; d) S');
    expect(prompt).toContain('- 1201: Câu 1. Cho hàm số');
    expect(prompt.endsWith('Câu | 1201 | 1202')).toBe(true);
  });

  it('đọc đáp án AI trả: chỉ nhận mã trong danh sách, bỏ đáp án rỗng; JSON hỏng → rỗng', () => {
    const raw = 'Đây: {"maDe": [{"ma": "101", "dapAn": "Câu 1: A"}, {"ma": "999", "dapAn": "x"}, {"ma": "102", "dapAn": "  "}]}';
    expect(parseExtractedVariantKeys(raw, ['101', '102'])).toEqual({ 101: 'Câu 1: A' });
    expect(parseExtractedVariantKeys('{hỏng', ['101'])).toEqual({});
  });

  it('đọc mã đề trên ảnh: chỉ nhận mã trong danh sách, null/mã lạ → null', () => {
    expect(buildDetectExamCodePrompt(['101', '102'])).toContain('MỘT trong các mã: 101, 102');
    expect(parseDetectedExamCode('{"maDe": "102"}', ['101', '102'])).toBe('102');
    expect(parseDetectedExamCode('{"maDe": "105"}', ['101', '102'])).toBeNull();
    expect(parseDetectedExamCode('{"maDe": null}', ['101', '102'])).toBeNull();
  });
});

describe('đối chiếu với điểm giáo viên chấm tay', () => {
  const marks = { moet: [{ label: 'Giữa học kì I', score: 7.5 }], tds: [{ label: 'Quý 1', score: 68, letter: 'B' }] };

  it('cùng thang 10: lệch ≤ 0,5 là khớp, > 0,5 là lệch; tên cột so không phân biệt hoa thường/dấu cách', () => {
    expect(examScoreCheck(7.25, 10, 'giữa  học kì I', marks)).toEqual({ sheetLabel: 'Giữa học kì I', sheetScore: 7.5, diff: 0.25, mismatch: false });
    expect(examScoreCheck(6.5, 10, 'Giữa học kì I', marks)?.mismatch).toBe(true);
    expect(examScoreCheck(15, 20, 'Giữa học kì I', marks)).toMatchObject({ diff: 0, mismatch: false });
  });

  it('chưa có điểm giáo viên, cột không theo thang 10, hoặc chưa chọn cột → không đối chiếu (không coi là lệch)', () => {
    expect(examScoreCheck(7, 10, 'Cuối học kì I', marks)).toBeNull();
    expect(examScoreCheck(7, 10, 'Quý 1', marks)).toBeNull();
    expect(examScoreCheck(7, 10, undefined, marks)).toBeNull();
    expect(examScoreCheck(7, 10, 'Giữa học kì I', null)).toBeNull();
  });

  it('danh sách cột điểm thi của lớp để giáo viên chọn: không trùng, theo thứ tự gặp', () => {
    expect(examMarkLabels({ a: marks, b: { moet: [{ label: 'giữa học kì i', score: 8 }, { label: 'Cuối học kì I', score: 9 }], tds: [] } }))
      .toEqual(['Giữa học kì I', 'Quý 1', 'Cuối học kì I']);
  });
});

describe('đọc PDF giữ xuống dòng', () => {
  it('xuống dòng theo cờ hết dòng hoặc khi chữ nhảy hàng; cùng hàng thì nối', () => {
    const at = (str: string, y: number, hasEOL = false) => ({ str, transform: [1, 0, 0, 1, 50, y], hasEOL });
    expect(pdfItemsToText([at('Mã đề', 800), at(' 1201', 800.5), at('Câu 1. Cho', 780), at(' hàm số', 780, true), at('BẢNG ĐÁP ÁN', 700), { str: '' }]))
      .toBe('Mã đề 1201\nCâu 1. Cho hàm số\nBẢNG ĐÁP ÁN');
  });
});

