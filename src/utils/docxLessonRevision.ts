// Chèn nội dung bổ sung vào file .docx GỐC mà GIỮ NGUYÊN layout: header/footer, logo,
// bảng, font, căn lề, khổ giấy. Cách làm: mở gói .docx (zip), chèn các <w:p> mới NGAY TRƯỚC
// <w:sectPr> cấp body (phần tử cuối cùng của <w:body>). Mọi paragraph/bảng/ảnh/section gốc
// được giữ nguyên byte — chỉ thêm phần "NỘI DUNG ĐÃ BỔ SUNG" ở cuối, sang trang mới.
//
// Chủ ý: KHÔNG viết lại toàn bộ tài liệu (dễ vỡ layout). Chỉ bổ sung phần góp ý/rà soát.

import JSZip from 'jszip';

const FONT = 'Times New Roman';
const BODY_SZ = 26; // 13pt (half-points)
const H_SZ = 30; // 15pt

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '');

const runXml = (text: string, opts: { bold?: boolean; color?: string; size?: number } = {}): string => {
  const rpr =
    `<w:rPr>` +
    (opts.bold ? `<w:b/>` : '') +
    `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}"/>` +
    (opts.color ? `<w:color w:val="${opts.color}"/>` : '') +
    `<w:sz w:val="${opts.size ?? BODY_SZ}"/><w:szCs w:val="${opts.size ?? BODY_SZ}"/>` +
    `</w:rPr>`;
  return `<w:r>${rpr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
};

// Tách **đậm** thành các run xen kẽ đậm/thường.
const inlineRuns = (line: string, base: { size?: number; bold?: boolean } = {}): string => {
  const parts = line.split(/\*\*/);
  return parts
    .map((seg, i) => (seg === '' ? '' : runXml(seg, { ...base, bold: base.bold || i % 2 === 1 })))
    .join('');
};

const paragraphXml = (
  runs: string,
  opts: { pageBreakBefore?: boolean; heading?: boolean; bullet?: boolean } = {},
): string => {
  const ppr =
    `<w:pPr>` +
    (opts.pageBreakBefore ? `<w:pageBreakBefore/>` : '') +
    (opts.bullet ? `<w:ind w:left="360" w:hanging="360"/>` : '') +
    `<w:spacing w:before="${opts.heading ? 160 : 60}" w:after="${opts.heading ? 80 : 60}" w:line="312" w:lineRule="auto"/>` +
    `</w:pPr>`;
  return `<w:p>${ppr}${runs}</w:p>`;
};

// ── Bảng markdown → <w:tbl> ───────────────────────────────────────────────────
// Rubric (menu L), bảng câu hỏi theo mức độ (F) và nhiệm vụ phân hóa (Q) đều là bảng markdown.
// Không dựng thành bảng Word thật thì phụ lục ra một đống "| a | b |" không đọc được.

const isTableRow = (l: string): boolean => /^\s*\|.*\|\s*$/.test(l);
/** Dòng phân cách kiểu |---|:---:|---| ngay dưới hàng tiêu đề. */
const isTableSeparator = (l: string): boolean => /^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(l);

const splitTableRow = (l: string): string[] =>
  l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

const TABLE_BORDER = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
  .map((side) => `<w:${side} w:val="single" w:sz="4" w:color="A0A0A0"/>`)
  .join('');

const tableRowXml = (cells: string[], colWidth: number, header: boolean): string => {
  const tcs = cells
    .map((cell) => {
      const shading = header ? '<w:shd w:val="clear" w:fill="F1F5F9"/>' : '';
      const body = paragraphXml(inlineRuns(cell, { bold: header }));
      return `<w:tc><w:tcPr><w:tcW w:w="${colWidth}" w:type="pct"/>${shading}</w:tcPr>${body}</w:tc>`;
    })
    .join('');
  return `<w:tr>${tcs}</w:tr>`;
};

/** `rows[0]` là hàng tiêu đề. Mọi hàng được đệm/cắt cho bằng số cột của tiêu đề. */
const tableXml = (rows: string[][]): string => {
  const cols = Math.max(1, rows[0].length);
  const colWidth = Math.floor(5000 / cols); // w:type="pct" — 5000 = 100%
  const trs = rows
    .map((cells, i) => {
      const padded = Array.from({ length: cols }, (_, c) => cells[c] ?? '');
      return tableRowXml(padded, colWidth, i === 0);
    })
    .join('');
  const tblPr = `<w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${TABLE_BORDER}</w:tblBorders></w:tblPr>`;
  // Đoạn rỗng sau bảng: Word cần một <w:p> ngăn cách, nếu không hai bảng liền nhau sẽ dính.
  return `<w:tbl>${tblPr}${trs}</w:tbl>${paragraphXml('')}`;
};

/**
 * Chuyển markdown đơn giản (heading #, gạch đầu dòng -, **đậm**, bảng |…|) sang chuỗi OOXML.
 * Hàm thuần, dễ kiểm thử. Block đầu tiên được đặt pageBreakBefore để tách khỏi bài gốc.
 */
export const markdownToOoxmlParagraphs = (markdown: string): string => {
  const lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let firstBlock = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();

    if (isTableRow(line) && isTableSeparator(lines[i + 1] ?? '')) {
      const rows = [splitTableRow(line)];
      i += 2; // bỏ qua dòng phân cách
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      i--; // vòng for sẽ ++ lại
      out.push(tableXml(rows));
      firstBlock = false;
      continue;
    }

    if (line.trim() === '') {
      out.push(paragraphXml(''));
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      out.push(
        paragraphXml(inlineRuns(heading[2], { size: H_SZ, bold: true }), {
          heading: true,
          pageBreakBefore: firstBlock,
        }),
      );
      firstBlock = false;
      continue;
    }
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      out.push(paragraphXml(runXml('• ') + inlineRuns(bullet[1]), { bullet: true }));
      firstBlock = false;
      continue;
    }
    out.push(paragraphXml(inlineRuns(line), { pageBreakBefore: firstBlock }));
    firstBlock = false;
  }
  return out.join('');
};

/**
 * Chèn `insertXml` ngay trước <w:sectPr> cấp body (phần tử cuối cùng của body). Nếu tài
 * liệu không có sectPr cấp body thì chèn trước </w:body>. Hàm thuần, dễ kiểm thử.
 */
export const injectBeforeBodySectPr = (documentXml: string, insertXml: string): string => {
  // sectPr cấp body luôn là <w:sectPr> XUẤT HIỆN CUỐI CÙNG trong tài liệu.
  const idx = documentXml.lastIndexOf('<w:sectPr');
  if (idx !== -1) {
    return documentXml.slice(0, idx) + insertXml + documentXml.slice(idx);
  }
  const bodyClose = documentXml.lastIndexOf('</w:body>');
  if (bodyClose !== -1) {
    return documentXml.slice(0, bodyClose) + insertXml + documentXml.slice(bodyClose);
  }
  throw new Error('File .docx không hợp lệ: không tìm thấy <w:body>.');
};

const SUPPLEMENT_HEADER =
  '# NỘI DUNG ĐÃ BỔ SUNG — BÁO CÁO RÀ SOÁT VÀ SẢN PHẨM NÂNG CẤP';

/**
 * Nhận byte của file .docx gốc + phần bổ sung (markdown), trả về byte .docx MỚI đã chèn
 * phần bổ sung ở cuối (giữ nguyên toàn bộ layout gốc). Ném lỗi nếu không phải .docx hợp lệ.
 */
export const reviseDocxBytes = async (
  originalBytes: ArrayBuffer | Uint8Array,
  supplementMarkdown: string,
): Promise<Uint8Array> => {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(originalBytes);
  } catch {
    throw new Error('Không đọc được file .docx (gói zip hỏng). Vui lòng tải lên file Word hợp lệ.');
  }
  const docFile = zip.file('word/document.xml');
  if (!docFile) {
    throw new Error('File tải lên không phải .docx hợp lệ (thiếu word/document.xml).');
  }
  const documentXml = await docFile.async('string');
  const supplement =
    markdownToOoxmlParagraphs(SUPPLEMENT_HEADER + '\n\n' + (supplementMarkdown || '').trim());
  const revised = injectBeforeBodySectPr(documentXml, supplement);
  zip.file('word/document.xml', revised);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
};

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Bản Blob để tải xuống trong trình duyệt. */
export const buildRevisedDocxBlob = async (
  originalBytes: ArrayBuffer | Uint8Array,
  supplementMarkdown: string,
): Promise<Blob> => {
  const bytes = await reviseDocxBytes(originalBytes, supplementMarkdown);
  return new Blob([bytes], { type: DOCX_MIME });
};
