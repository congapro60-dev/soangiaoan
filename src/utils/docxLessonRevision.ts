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

/**
 * Chuyển markdown đơn giản (heading #, gạch đầu dòng -, **đậm**) sang chuỗi <w:p> OOXML.
 * Hàm thuần, dễ kiểm thử. `heading` đầu tiên được đặt pageBreakBefore để tách khỏi bài gốc.
 */
export const markdownToOoxmlParagraphs = (markdown: string): string => {
  const lines = (markdown || '').replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let firstBlock = true;
  for (const raw of lines) {
    const line = raw.trimEnd();
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
  '# NỘI DUNG ĐÃ BỔ SUNG — RÀ SOÁT THEO CHUẨN TOÁN';

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
