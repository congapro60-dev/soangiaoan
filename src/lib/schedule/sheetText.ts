/**
 * Ghép chữ nhiều trang tính của một file Excel để AI đọc: trang LIÊN QUAN nhất đứng trước, rồi mới cắt
 * theo giới hạn — file thật hay có trang hướng dẫn/thống kê đứng đầu (vd lịch năm học 15 trang, trang
 * lịch chính ở thứ 5) nên ghép theo thứ tự gốc dễ bị cắt mất phần cần. THUẦN.
 */

/** Dấu hiệu trang lịch năm học. */
export const CALENDAR_SHEET_HINT = /nghỉ|lễ|tết|holiday|kiểm tra|\bthi\b|tuần|week|\bW\d{1,2}\b|tháng|month|thứ\s*[2-7]|\bmon\b|\btue\b/gi;
/** Dấu hiệu trang phân phối chương trình. */
export const PPCT_SHEET_HINT = /tiết|bài|chương|tuần|chủ đề|lesson|unit|period/gi;

export interface SheetTextPart {
  name: string;
  text: string;
}

export const rankSheetsText = (sheets: readonly SheetTextPart[], hint: RegExp, budget: number): string => {
  const scored = sheets
    .filter(sheet => sheet.text.trim())
    .map((sheet, order) => ({ ...sheet, order, score: (sheet.text.match(new RegExp(hint.source, 'gi')) ?? []).length }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
  let out = '';
  for (const sheet of scored) {
    const part = `Trang tính: ${sheet.name}\n${sheet.text}\n\n`;
    if (out && out.length + part.length > budget) continue;
    out += part;
  }
  return out.slice(0, budget);
};
