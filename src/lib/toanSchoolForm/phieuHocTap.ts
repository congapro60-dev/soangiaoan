// Lấy lại phiếu học tập đã có sẵn trong phụ lục giáo án.
//
// Chức năng "Tạo phiếu học tập" trước đây gọi AI LẦN NỮA để sinh phiếu từ giáo án, dù chính
// giáo án đó đã có phiếu ở mục phụ lục. Vừa bắt giáo viên chờ, vừa tốn lượt gọi, vừa cho ra
// phiếu khác với phiếu đã ghi trong kịch bản tiết dạy — hai bản không khớp nhau.
//
// Ở đây chỉ đọc lại thứ đã có. AI vẫn là đường dự phòng cho giáo án cũ hoặc mẫu khác.

import { parseToanLesson, type ToanPhieu } from './parseToanLesson';

const bangMarkdown = (header: string[], rows: string[][]): string => {
  const cols = Math.max(1, header.length);
  const dong = (cells: string[]) =>
    `| ${Array.from({ length: cols }, (_, i) => (cells[i] ?? '').trim() || ' ').join(' | ')} |`;
  return [
    dong(header),
    `|${Array.from({ length: cols }, () => '---').join('|')}|`,
    ...rows.map(dong),
  ].join('\n');
};

/** Dựng lại markdown của một phiếu để hiện trong khung xem và xuất Word. */
export const phieuToMarkdown = (p: ToanPhieu): string => {
  const out: string[] = [];
  out.push(`## PHIẾU ${p.so}${p.ten ? ` — ${p.ten}` : ''}`);
  if (p.phuDe) out.push(`*${p.phuDe}*`);
  out.push('Họ và tên: ...................................................   Lớp: ..................');
  for (const b of p.khoi) {
    if (b.kind === 'table') out.push(bangMarkdown(b.header, b.rows));
    else if (b.kind === 'bullets') out.push(b.items.map((i) => `- ${i}`).join('\n'));
    else if (b.kind === 'heading') out.push(`### ${b.text}`);
    else out.push(b.text);
  }
  return out.join('\n\n');
};

/**
 * Trả về markdown của toàn bộ phiếu trong phụ lục, hoặc `null` khi giáo án không có phiếu nào
 * — lúc đó bên gọi rơi về đường sinh bằng AI.
 */
export const trichPhieuHocTap = (content: string): string | null => {
  if (!content?.trim()) return null;
  let phuLuc: ToanPhieu[] = [];
  try {
    phuLuc = parseToanLesson(content).phuLuc;
  } catch {
    return null; // giáo án không theo mẫu ban Toán — để AI lo
  }
  if (phuLuc.length === 0) return null;
  return phuLuc.map(phieuToMarkdown).join('\n\n---\n\n');
};
