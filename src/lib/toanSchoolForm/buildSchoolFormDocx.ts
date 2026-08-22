// Dựng file Word theo ĐÚNG FORM trường (25-26_Mẫu giáo án_Ban Toán.docx): khổ Letter ngang,
// font Arial, các dải màu pastel đúng mã màu template, bảng hoạt động 3 cột 15/45/40.
// Nội dung lấy từ ToanLessonModel (parse từ markdown AI sinh — KHÔNG đổi khâu sinh).
//
// Công thức LaTeX ($...$, $$...$$) render thành OMML native (tái dùng latexToOmml của
// renderWordCore) với đúng font/cỡ chữ của form.

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, PageOrientation,
} from 'docx';
import type { ParagraphChild } from 'docx';
import type { ToanLessonModel, ToanPhieu } from './parseToanLesson';
import { latexToOmml, ommlToParagraphChild } from '../../utils/renderWordCore';
import { tokenizeInline } from './inlineTokens';
import { detectCisColor } from './cisEvidence';
import {
  ACTIVITY_COL_TWIP, FILL, FONT, MARGIN_TWIP, OBJECTIVE_COL_RATIOS,
  PAGE_TWIP, PHIEU_MARGIN_TWIP, PHIEU_PAGE_TWIP, PRINTABLE_TWIP, PT, phieuPrintableTwip,
} from './schoolFormLayout';

// Hằng số bố cục dùng chung với đường xuất HTML→PDF — xem schoolFormLayout.ts.
const SZ = PT.body * 2;       // half-point
const SZ_BAND = PT.band * 2;
const SZ_TITLE = PT.title * 2;

const PAGE = PAGE_TWIP;
const MARGIN = MARGIN_TWIP;
const PRINTABLE = PRINTABLE_TWIP;

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' } as const;
const cellBorders = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER } as const;
const tableBorders = { ...cellBorders, insideHorizontal: BORDER, insideVertical: BORDER } as const;

const textRun = (t: string, bold: boolean, size?: number, italics = false, brk = 0, color?: string): TextRun =>
  new TextRun({ text: t, bold, italics, font: FONT, size: size ?? SZ, ...(brk ? { break: brk } : {}), ...(color ? { color } : {}) });

/**
 * Dịch token inline dùng chung sang run của docx: `$...$` thành OMML native (Arial, đúng cỡ),
 * ngắt dòng thành `<w:br/>`, `**đậm**` / `*nghiêng*` thành thuộc tính run.
 */
const runs = (text: string, base: { bold?: boolean; size?: number } = {}): ParagraphChild[] => {
  const children: ParagraphChild[] = [];
  // Dòng mở đầu bằng nhãn minh chứng CIS thì CẢ CÂU mang màu, không chỉ riêng nhãn —
  // người dự giờ phải nhìn thấy ngay minh chứng nằm ở đâu trong tiến trình.
  const cis = detectCisColor(text);
  for (const tok of tokenizeInline(text)) {
    if (tok.kind === 'break') {
      children.push(textRun('', !!base.bold, base.size, false, 1, cis));
    } else if (tok.kind === 'math') {
      const omml = latexToOmml(tok.latex, tok.display);
      const child = omml ? ommlToParagraphChild(omml) : null;
      children.push(child ?? textRun(tok.latex, base.bold || tok.bold, base.size, false, 0, cis));
    } else {
      children.push(textRun(tok.text, base.bold || tok.bold, base.size, tok.italic, 0, cis));
    }
  }
  return children.length ? children : [textRun('', !!base.bold, base.size, false, 0, cis)];
};

const para = (text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): Paragraph =>
  new Paragraph({ children: runs(text, opts), alignment: opts.align, spacing: { before: 40, after: 40 } });

const bullets = (items: string[]): Paragraph[] =>
  items.map((it) => new Paragraph({ children: runs(it), bullet: { level: 0 }, spacing: { before: 20, after: 20 } }));

// Dải màu: bảng 1 ô full-width có shading + viền.
const band = (label: string, fill: string): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [PRINTABLE],
    borders: tableBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [para(label, { bold: true, size: SZ_BAND })],
            shading: { fill, type: 'clear', color: 'auto' },
            margins: { top: 40, bottom: 40, left: 120, right: 120 },
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
  });

const spacer = (): Paragraph => new Paragraph({ children: [], spacing: { before: 20, after: 20 } });

// Bảng hành chính 6 cột.
const adminTable = (m: ToanLessonModel): Table => {
  const labelCell = (t: string) =>
    new TableCell({ children: [para(t, { bold: true })], shading: { fill: 'F3F3F3', type: 'clear', color: 'auto' }, width: { size: 12, type: WidthType.PERCENTAGE }, margins: { top: 40, bottom: 40, left: 80, right: 80 } });
  const valCell = (t: string) =>
    new TableCell({ children: [para(t)], width: { size: 21, type: WidthType.PERCENTAGE }, margins: { top: 40, bottom: 40, left: 80, right: 80 } });
  const w = (p: number) => Math.floor((p / 100) * PRINTABLE);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [w(12), w(21), w(12), w(21), w(12), w(22)],
    borders: tableBorders,
    rows: [
      new TableRow({ children: [labelCell('Lớp'), valCell(m.header.lop), labelCell('Tên bài học'), valCell(m.header.tenBai), labelCell('Môn học'), valCell(m.header.mon)] }),
      new TableRow({ children: [labelCell('Giáo viên'), valCell(m.header.giaoVien), labelCell('Tuần học'), valCell(m.header.tuan), labelCell('Năm học'), valCell(m.header.namHoc)] }),
    ],
  });
};

// Bảng mục tiêu (Mức | Mục tiêu).
const mucTieuTable = (m: ToanLessonModel): Table =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: OBJECTIVE_COL_RATIOS.map((r) => Math.floor(PRINTABLE * r)),
    borders: tableBorders,
    rows: m.mucTieu.map((r) =>
      new TableRow({
        children: [
          new TableCell({ children: [para(r.muc, { bold: true })], width: { size: 18, type: WidthType.PERCENTAGE }, margins: { top: 40, bottom: 40, left: 100, right: 100 } }),
          new TableCell({ children: [para(r.noiDung)], width: { size: 82, type: WidthType.PERCENTAGE }, margins: { top: 40, bottom: 40, left: 100, right: 100 } }),
        ],
      }),
    ),
  });

// Bảng hoạt động 3 cột (Thời gian thực | Giáo viên và Học sinh | Nội dung).
// Tỉ lệ 15/45/40 và bộ twip đều nằm ở schoolFormLayout.ts, dùng chung với đường HTML→PDF.
const COL3 = ACTIVITY_COL_TWIP as unknown as number[];
const activityTable = (a: ToanLessonModel['activities'][number]): Table => {
  const headerCell = (t: string) =>
    new TableCell({
      children: [para(t, { bold: true })],
      shading: { fill: FILL.tienTrinh, type: 'clear', color: 'auto' },
      margins: { top: 40, bottom: 40, left: 100, right: 100 },
    });
  const rows: TableRow[] = [
    new TableRow({ tableHeader: true, children: [headerCell('Thời gian thực'), headerCell('Giáo viên và Học sinh'), headerCell('Nội dung')] }),
  ];
  const data = a.rows.length ? a.rows : [{ thoiGian: '', gvHs: '', noiDung: '' }];
  for (const r of data) {
    rows.push(new TableRow({
      children: [
        new TableCell({ children: [para(r.thoiGian)], margins: { top: 40, bottom: 40, left: 100, right: 100 } }),
        new TableCell({ children: [para(r.gvHs)], margins: { top: 40, bottom: 40, left: 100, right: 100 } }),
        new TableCell({ children: [para(r.noiDung)], margins: { top: 40, bottom: 40, left: 100, right: 100 } }),
      ],
    }));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths: COL3, borders: tableBorders, rows });
};

// ── Phiếu học tập ở phụ lục ───────────────────────────────────────────────────

/** Bảng trong phiếu: ô trống của cột "Lời giải" phải đủ cao để học sinh viết tay. */
const phieuTable = (block: { header: string[]; rows: string[][] }, khoGiay: 'doc' | 'ngang'): Table => {
  const cols = Math.max(1, block.header.length);
  const rong = Math.floor(phieuPrintableTwip(khoGiay) / cols);
  const cell = (t: string, header: boolean, cao = false) =>
    new TableCell({
      children: [
        para(t, { bold: header }),
        // Ô trả lời để trống: chèn thêm dòng rỗng lấy chỗ viết.
        ...(cao && !t.trim() ? [spacer(), spacer(), spacer()] : []),
      ],
      ...(header ? { shading: { fill: FILL.tienTrinh, type: 'clear' as const, color: 'auto' } } : {}),
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
    });
  const rows = [
    new TableRow({ tableHeader: true, children: block.header.map((h) => cell(h, true)) }),
    ...block.rows.map((r) =>
      new TableRow({
        children: Array.from({ length: cols }, (_, i) => cell(r[i] ?? '', false, true)),
      })),
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: Array.from({ length: cols }, () => rong),
    borders: tableBorders,
    rows,
  });
};

const phieuBody = (p: ToanPhieu): (Paragraph | Table)[] => {
  const out: (Paragraph | Table)[] = [];
  out.push(para(`PHIẾU ${p.so}${p.ten ? ` — ${p.ten}` : ''}`, { bold: true, size: SZ_TITLE, align: AlignmentType.CENTER }));
  if (p.phuDe) out.push(para(p.phuDe, { align: AlignmentType.CENTER }));
  out.push(para('Họ và tên: ...................................................   Lớp: ..................'));
  out.push(spacer());

  for (const b of p.khoi) {
    if (b.kind === 'table') out.push(phieuTable(b, p.khoGiay));
    else if (b.kind === 'bullets') out.push(...bullets(b.items));
    else if (b.kind === 'heading') out.push(para(b.text, { bold: true, size: SZ_BAND }));
    else out.push(para(b.text));
  }
  return out;
};

export const buildSchoolFormDocument = (m: ToanLessonModel): Document => {
  const body: (Paragraph | Table)[] = [];
  body.push(new Paragraph({ children: runs('KẾ HOẠCH DẠY HỌC', { bold: true, size: SZ_TITLE }), alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 } }));
  body.push(adminTable(m));
  body.push(spacer());

  body.push(band('I. THÔNG TIN CHUNG', FILL.ttc));
  body.push(band('1. Tiêu chuẩn năng lực cốt lõi', FILL.sub));
  body.push(...bullets(m.nangLuc.length ? m.nangLuc : ['(chưa có)']));
  body.push(band('2. Mục tiêu học tập', FILL.sub));
  body.push(para('Sau tiết học, tôi có thể:'));
  if (m.mucTieu.length) body.push(mucTieuTable(m));
  if (m.phanHoa.length) { body.push(para('Phân hóa mục tiêu:', { bold: true })); body.push(...bullets(m.phanHoa)); }
  body.push(band('3. Tài liệu dạy học', FILL.sub));
  body.push(...bullets(m.taiLieu.length ? m.taiLieu : ['(chưa có)']));
  body.push(spacer());

  body.push(band('II. TIẾN TRÌNH HOẠT ĐỘNG', FILL.tienTrinh));
  body.push(band('3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH', FILL.hoatDongChinh));
  m.activities.forEach((a, i) => {
    const label = `${a.title}${a.thoiLuong ? `  —  Thời lượng: ${a.thoiLuong}` : ''}`;
    body.push(band(label, i === 0 ? FILL.khoiDong : FILL.hoatDong));
    body.push(activityTable(a));
    body.push(spacer());
  });

  body.push(band('5. SƠ KẾT', FILL.soKet));
  body.push(...bullets(m.soKet.length ? m.soKet : ['(chưa có)']));
  body.push(band('6. BTVN', FILL.btvn));
  body.push(...bullets(m.btvn.length ? m.btvn : ['(chưa có)']));

  return new Document({
    creator: 'SmartPlan AI',
    title: m.header.tenBai || 'Giao an Toan',
    styles: { default: { document: { run: { font: FONT, size: SZ }, paragraph: { spacing: { line: 264 } } } } },
    sections: [
      {
        // docx tự hoán đổi width/height khi orientation=LANDSCAPE → truyền theo chiều dọc
        // (width=12240, height=15840) để ra đúng w=15840 h=12240 (Letter ngang).
        properties: { page: { size: { width: PAGE.height, height: PAGE.width, orientation: PageOrientation.LANDSCAPE }, margin: MARGIN } },
        children: body,
      },
      // Mỗi phiếu học tập là MỘT SECTION riêng. Hướng giấy trong OOXML là thuộc tính của
      // section, nên đây là cách duy nhất để phiếu này dọc, phiếu kia ngang. Ngắt section
      // đồng thời là ngắt trang, nên "không hai phiếu trên cùng một trang" được bảo đảm
      // bằng cấu trúc chứ không bằng canh chỉnh thủ công.
      ...m.phuLuc.map((p) => ({
        properties: {
          page: {
            // LUÔN truyền số đo theo chiều DỌC — docx tự hoán đổi khi orientation=LANDSCAPE.
            // Tự hoán đổi thêm ở đây là xoay hai lần, ra lại khổ dọc.
            size: {
              width: PHIEU_PAGE_TWIP.width,
              height: PHIEU_PAGE_TWIP.height,
              orientation: p.khoGiay === 'ngang' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: PHIEU_MARGIN_TWIP,
          },
        },
        children: phieuBody(p),
      })),
    ],
  });
};

export const buildSchoolFormBlob = async (m: ToanLessonModel): Promise<Blob> =>
  Packer.toBlob(buildSchoolFormDocument(m));
