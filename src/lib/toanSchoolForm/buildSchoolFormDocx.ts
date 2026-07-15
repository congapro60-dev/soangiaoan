// Dựng file Word theo ĐÚNG FORM trường (25-26_Mẫu giáo án_Ban Toán.docx): khổ Letter ngang,
// font Arial, các dải màu pastel đúng mã màu template, bảng hoạt động 3 cột 9/50/41.
// Nội dung lấy từ ToanLessonModel (parse từ markdown AI sinh — KHÔNG đổi khâu sinh).
//
// Công thức LaTeX ($...$, $$...$$) render thành OMML native (tái dùng latexToOmml của
// renderWordCore) với đúng font/cỡ chữ của form.

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, PageOrientation,
} from 'docx';
import type { ParagraphChild } from 'docx';
import type { ToanLessonModel } from './parseToanLesson';
import { latexToOmml, ommlToParagraphChild } from '../../utils/renderWordCore';

const FONT = 'Arial';
const SZ = 22;       // 11pt
const SZ_BAND = 24;  // 12pt bold band
const SZ_TITLE = 30; // 15pt

// Khổ Letter ngang + lề đúng template.
const PAGE = { width: 15840, height: 12240 };
const MARGIN = { top: 180, right: 720, bottom: 1440, left: 450 };
const PRINTABLE = PAGE.width - MARGIN.left - MARGIN.right; // 14670

// Mã màu pastel LẤY ĐÚNG từ template.
const FILL = {
  ttc: 'C9DAF8',       // I. THÔNG TIN CHUNG
  sub: 'FCE5CD',       // tiểu mục
  tienTrinh: 'CFE2F3', // II. TIẾN TRÌNH + header bảng
  khoiDong: 'E6B8AF',  // khởi động
  hoatDongChinh: 'B6D7A8',
  hoatDong: 'D9EAD3',  // từng hoạt động
  soKet: 'B4A7D6',
  btvn: 'EAD1DC',
} as const;

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '999999' } as const;
const cellBorders = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER } as const;
const tableBorders = { ...cellBorders, insideHorizontal: BORDER, insideVertical: BORDER } as const;

const textRun = (t: string, bold: boolean, size?: number): TextRun =>
  new TextRun({ text: t, bold, font: FONT, size: size ?? SZ });

// Inline: tách **đậm** + render công thức $...$ / $$...$$ thành OMML native (Arial, đúng cỡ).
// Placeholder @@MATHn@@ đủ đặc trưng để không đụng số/chữ thường trong văn bản.
const MATH_MARK = /@@MATH([0-9]+)@@/g;
const runs = (text: string, base: { bold?: boolean; size?: number } = {}): ParagraphChild[] => {
  const slots: { latex: string; display: boolean }[] = [];
  const stashed = (text || '')
    .replace(/\$\$([^$]+)\$\$/g, (_, e) => { slots.push({ latex: e, display: true }); return `@@MATH${slots.length - 1}@@`; })
    .replace(/\$([^$\n]+)\$/g, (_, e) => { slots.push({ latex: e, display: false }); return `@@MATH${slots.length - 1}@@`; });

  const children: ParagraphChild[] = [];
  stashed.split(/\*\*/).forEach((seg, i) => {
    const bold = base.bold || i % 2 === 1;
    let last = 0;
    MATH_MARK.lastIndex = 0;
    let mm: RegExpExecArray | null;
    while ((mm = MATH_MARK.exec(seg)) !== null) {
      if (mm.index > last) { const t = seg.slice(last, mm.index); if (t) children.push(textRun(t, bold, base.size)); }
      const slot = slots[Number(mm[1])];
      const omml = slot ? latexToOmml(slot.latex.trim(), slot.display) : null;
      const child = omml ? ommlToParagraphChild(omml) : null;
      children.push(child ?? textRun(slot ? slot.latex : '', bold, base.size));
      last = mm.index + mm[0].length;
    }
    if (last < seg.length) { const t = seg.slice(last); if (t) children.push(textRun(t, bold, base.size)); }
  });
  return children.length ? children : [textRun('', !!base.bold, base.size)];
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
    columnWidths: [Math.floor(PRINTABLE * 0.18), Math.floor(PRINTABLE * 0.82)],
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

// Bảng hoạt động 3 cột (Thời gian thực | Giáo viên và Học sinh | Nội dung), tỉ lệ đúng template.
const COL3 = [1305, 7305, 6015];
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
    ],
  });
};

export const buildSchoolFormBlob = async (m: ToanLessonModel): Promise<Blob> =>
  Packer.toBlob(buildSchoolFormDocument(m));
