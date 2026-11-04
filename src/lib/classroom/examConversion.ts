import * as XLSX from 'xlsx';

export interface ExamConversionRow {
  studentCode: string;
  moet?: number;
  tds?: number;
}

const text = (value: unknown): string => String(value ?? '').normalize('NFC').trim();
const score = (value: unknown): number | undefined => {
  const n = Number(text(value).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/** Đọc file quy đổi tối giản: một hàng tiêu đề có Mã HS, điểm MOET và điểm TDS. */
export const parseExamConversionFile = async (file: File): Promise<ExamConversionRow[]> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  const headerIndex = rows.findIndex(row => row.some(cell => /mã\s*hs|ma\s*hs/i.test(text(cell))));
  if (headerIndex < 0) throw new Error('File quy đổi thiếu cột Mã HS.');
  const header = rows[headerIndex].map(text);
  const codeIndex = header.findIndex(value => /mã\s*hs|ma\s*hs/i.test(value));
  const moetIndex = header.findIndex(value => /moet|điểm\s*thi|diem\s*thi/i.test(value));
  const tdsIndex = header.findIndex(value => /tds|điểm\s*tds|diem\s*tds/i.test(value));
  if (moetIndex < 0 || tdsIndex < 0) throw new Error('File quy đổi cần có cột điểm MOET và điểm TDS.');
  return rows.slice(headerIndex + 1).flatMap(row => {
    const studentCode = text(row[codeIndex]);
    if (!studentCode) return [];
    const moet = score(row[moetIndex]);
    const tds = score(row[tdsIndex]);
    return [{ studentCode, ...(moet !== undefined ? { moet } : {}), ...(tds !== undefined ? { tds } : {}) }];
  });
};
