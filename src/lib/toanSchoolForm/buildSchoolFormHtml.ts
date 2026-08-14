// Trang in HTML SOI GƯƠNG form giáo án ban Toán, để lưu PDF giống bản Word.
//
// Vì sao không chuyển .docx → PDF: cần LibreOffice chạy ở máy chủ (Vercel serverless không
// chạy được, đang có trần 12 hàm) hoặc dịch vụ trả tiền. Đường này sinh PDF từ CHÍNH
// `ToanLessonModel` mà bản .docx dùng, với cùng bộ màu / tỉ lệ cột / cỡ chữ ở
// `schoolFormLayout.ts` và cùng bộ tách markup ở `inlineTokens.ts`.
//
// Còn khác bản Word ở đâu: vị trí ngắt trang giữa bảng dài do trình duyệt tự quyết, và
// công thức render bằng KaTeX thay vì OMML. Nhìn bằng mắt không phân biệt được, nhưng
// chồng hai file lên nhau thì không trùng khít — muốn trùng khít phải chuyển đổi ở máy chủ.

import katex from 'katex';
import type { ToanLessonModel } from './parseToanLesson';
import { tokenizeInline } from './inlineTokens';
import {
  ACTIVITY_COL_RATIOS, FILL, FONT, LINE_HEIGHT, MARGIN_TWIP,
  OBJECTIVE_COL_RATIOS, PT, toPercents, twipToInch,
} from './schoolFormLayout';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Dịch token inline dùng chung sang HTML. Công thức render bằng KaTeX. */
export const inlineHtml = (text: string): string => {
  let out = '';
  for (const tok of tokenizeInline(text)) {
    if (tok.kind === 'break') {
      out += '<br>';
    } else if (tok.kind === 'math') {
      try {
        out += katex.renderToString(tok.latex, { displayMode: tok.display, throwOnError: false });
      } catch {
        // KaTeX bó tay thì in nguyên LaTeX — giống hệt cách đường .docx xử lý khi OMML lỗi.
        out += esc(tok.latex);
      }
    } else {
      let t = esc(tok.text);
      if (tok.italic) t = `<i>${t}</i>`;
      if (tok.bold) t = `<b>${t}</b>`;
      out += t;
    }
  }
  return out;
};

const bandHtml = (label: string, fill: string): string =>
  `<div class="band" style="background:#${fill}">${inlineHtml(label)}</div>`;

const bulletsHtml = (items: string[]): string =>
  `<ul class="bul">${items.map((i) => `<li>${inlineHtml(i)}</li>`).join('')}</ul>`;

const adminHtml = (m: ToanLessonModel): string => {
  const pair = (label: string, value: string, valWidth: string) =>
    `<td class="lbl">${esc(label)}</td><td style="width:${valWidth}">${inlineHtml(value)}</td>`;
  return `<table class="grid">
  <colgroup>${['12%', '21%', '12%', '21%', '12%', '22%'].map((w) => `<col style="width:${w}">`).join('')}</colgroup>
  <tr>${pair('Lớp', m.header.lop, '21%')}${pair('Tên bài học', m.header.tenBai, '21%')}${pair('Môn học', m.header.mon, '22%')}</tr>
  <tr>${pair('Giáo viên', m.header.giaoVien, '21%')}${pair('Tuần học', m.header.tuan, '21%')}${pair('Năm học', m.header.namHoc, '22%')}</tr>
</table>`;
};

const mucTieuHtml = (m: ToanLessonModel): string => {
  const [w1, w2] = toPercents(OBJECTIVE_COL_RATIOS);
  const rows = m.mucTieu
    .map((r) => `<tr><td class="b" style="width:${w1}">${inlineHtml(r.muc)}</td><td style="width:${w2}">${inlineHtml(r.noiDung)}</td></tr>`)
    .join('');
  return `<table class="grid"><colgroup><col style="width:${w1}"><col style="width:${w2}"></colgroup>${rows}</table>`;
};

const activityHtml = (a: ToanLessonModel['activities'][number]): string => {
  const w = toPercents(ACTIVITY_COL_RATIOS);
  const head = ['Thời gian thực', 'Giáo viên và Học sinh', 'Nội dung']
    .map((t, i) => `<th style="width:${w[i]};background:#${FILL.tienTrinh}">${esc(t)}</th>`)
    .join('');
  const data = a.rows.length ? a.rows : [{ thoiGian: '', gvHs: '', noiDung: '' }];
  const body = data
    .map((r) => `<tr><td>${inlineHtml(r.thoiGian)}</td><td>${inlineHtml(r.gvHs)}</td><td>${inlineHtml(r.noiDung)}</td></tr>`)
    .join('');
  return `<table class="grid act"><colgroup>${w.map((x) => `<col style="width:${x}">`).join('')}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
};

const inch = (twip: number): string => `${twipToInch(twip).toFixed(4)}in`;

/**
 * CSS của trang in. `@page` CHỈ khai hướng giấy — khổ giấy để người dùng chọn trong hộp
 * thoại in (bản Word là Letter ngang; chọn Letter thì khớp nhất, chọn A4 thì nội dung tự
 * co theo vì mọi bảng đều dùng bề rộng phần trăm).
 */
export const SCHOOL_FORM_PRINT_CSS = `
@page { size: landscape; margin: ${inch(MARGIN_TWIP.top)} ${inch(MARGIN_TWIP.right)} ${inch(MARGIN_TWIP.bottom)} ${inch(MARGIN_TWIP.left)}; }
#print-temp-container.school-form {
  font-family: ${FONT}, Helvetica, sans-serif;
  font-size: ${PT.body}pt;
  line-height: ${LINE_HEIGHT};
  color: #000;
}
#print-temp-container.school-form .title {
  font-size: ${PT.title}pt; font-weight: 700; text-align: center; margin: 3pt 0 6pt;
}
#print-temp-container.school-form .band {
  font-size: ${PT.band}pt; font-weight: 700;
  border: 1px solid #999; padding: 2pt 6pt; margin: 4pt 0 2pt;
}
#print-temp-container.school-form table.grid {
  width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 4pt;
}
#print-temp-container.school-form table.grid td,
#print-temp-container.school-form table.grid th {
  border: 1px solid #999; padding: 2pt 5pt; vertical-align: top; text-align: left;
  word-wrap: break-word; overflow-wrap: break-word;
}
#print-temp-container.school-form table.grid th,
#print-temp-container.school-form table.grid td.lbl,
#print-temp-container.school-form table.grid td.b { font-weight: 700; }
#print-temp-container.school-form table.grid td.lbl { background: #F3F3F3; }
#print-temp-container.school-form ul.bul { margin: 2pt 0 4pt; padding-left: 18pt; }
#print-temp-container.school-form ul.bul li { margin: 1pt 0; }
/* Bảng hoạt động thường dài hơn một trang — cho phép cắt, nhưng lặp lại hàng tiêu đề và
   không cắt giữa một hàng. */
#print-temp-container.school-form table.act thead { display: table-header-group; }
#print-temp-container.school-form table.grid tr { break-inside: avoid; page-break-inside: avoid; }
#print-temp-container.school-form .band { break-after: avoid; page-break-after: avoid; }
`;

/**
 * Dựng thân trang in. Thứ tự khối bám ĐÚNG `buildSchoolFormDocument` — sửa một bên phải
 * sửa bên kia, `schoolFormLayout.invariants.test.ts` khoá phần bố cục.
 */
export const buildSchoolFormHtml = (m: ToanLessonModel): string => {
  const out: string[] = [];
  out.push('<div class="title">KẾ HOẠCH DẠY HỌC</div>');
  out.push(adminHtml(m));

  out.push(bandHtml('I. THÔNG TIN CHUNG', FILL.ttc));
  out.push(bandHtml('1. Tiêu chuẩn năng lực cốt lõi', FILL.sub));
  out.push(bulletsHtml(m.nangLuc.length ? m.nangLuc : ['(chưa có)']));
  out.push(bandHtml('2. Mục tiêu học tập', FILL.sub));
  out.push('<p>Sau tiết học, tôi có thể:</p>');
  if (m.mucTieu.length) out.push(mucTieuHtml(m));
  if (m.phanHoa.length) {
    out.push('<p><b>Phân hóa mục tiêu:</b></p>');
    out.push(bulletsHtml(m.phanHoa));
  }
  out.push(bandHtml('3. Tài liệu dạy học', FILL.sub));
  out.push(bulletsHtml(m.taiLieu.length ? m.taiLieu : ['(chưa có)']));

  out.push(bandHtml('II. TIẾN TRÌNH HOẠT ĐỘNG', FILL.tienTrinh));
  out.push(bandHtml('3. CÁC HOẠT ĐỘNG HỌC TẬP CHÍNH', FILL.hoatDongChinh));
  m.activities.forEach((a, i) => {
    const label = `${a.title}${a.thoiLuong ? `  —  Thời lượng: ${a.thoiLuong}` : ''}`;
    out.push(bandHtml(label, i === 0 ? FILL.khoiDong : FILL.hoatDong));
    out.push(activityHtml(a));
  });

  out.push(bandHtml('5. SƠ KẾT', FILL.soKet));
  out.push(bulletsHtml(m.soKet.length ? m.soKet : ['(chưa có)']));
  out.push(bandHtml('6. BTVN', FILL.btvn));
  out.push(bulletsHtml(m.btvn.length ? m.btvn : ['(chưa có)']));

  return out.join('\n');
};
