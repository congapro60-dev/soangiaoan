/**
 * Đọc file "Nhập điểm" của trường (K10_K11_K12 … Giữa HKI / Cuối kỳ …) để lấy MA TRẬN ĐIỂM của đề.
 *
 * Vì sao cần: trường chấm theo ma trận — mỗi LO chiếm một số điểm cố định trong đề (sheet
 * "Hướng dẫn", cột "Tổng điểm"), LO nào nặng thì đóng góp nhiều hơn vào điểm năng lực. Nếu app
 * chia đều theo số năng lực thì điểm ra khác hẳn điểm trên SSM của trường.
 *
 * File mẫu (đọc 20/10/2026):
 *   dòng 6  : tiêu đề cột — A "Mã tả", B "Learning outcome", I/J "Tổng điểm"
 *   dòng 8+ : A = LO1..LOn, B = mô tả LO (khớp mô tả LO trên SSM), I/J = điểm tối đa của LO
 * Tổng cột I (hoặc J) = 10.0 đúng bằng thang điểm của đề.
 *
 * Hàm thuần: nhận `ArrayBuffer`, trả danh sách LO kèm điểm. Không đụng mạng, không đụng SSM.
 */
import * as XLSX from 'xlsx';

export interface SchoolRubricRow {
  /** "LO1", "LO2"… đúng như cột A của file trường. */
  label: string;
  /** Mô tả LO ở cột B — dùng để khớp với LO của SSM khi nhập. */
  description: string;
  /** Điểm tối đa của LO trong đề (cột "Tổng điểm"). */
  maxPoints: number;
}

/** Tìm dòng tiêu đề: dòng có ô chứa "Learning outcome" (không phân biệt hoa thường). */
const isHeaderRow = (row: unknown[]): boolean =>
  row.some((cell) => typeof cell === 'string' && /learning\s*outcome/i.test(cell));

/**
 * Đọc ma trận điểm từ file nhập điểm của trường.
 *
 * Chọn sheet "Hướng dẫn" nếu có (đó là sheet chứa bảng LO → điểm); không thì quét mọi sheet tìm
 * dòng tiêu đề. `maxPoints` lấy từ cột có tiêu đề chứa "Tổng điểm"; thiếu thì lấy cột số cuối cùng
 * trong dòng LO.
 */
export const readSchoolRubric = (bytes: ArrayBuffer): SchoolRubricRow[] => {
  const book = XLSX.read(bytes, { type: 'array' });
  const preferred = book.SheetNames.find((name) => /h.?ng d.?n|guide/i.test(name));
  const sheetNames = preferred ? [preferred, ...book.SheetNames.filter((n) => n !== preferred)] : book.SheetNames;

  for (const sheetName of sheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], { header: 1, blankrows: false, raw: true });
    const headerIndex = rows.findIndex(isHeaderRow);
    if (headerIndex < 0) continue;

    const header = rows[headerIndex];
    const columns: Record<string, number> = {};
    header.forEach((cell, index) => {
      const text = typeof cell === 'string' ? cell : '';
      if (/m.?\s*t.?\b/i.test(text) && columns.label === undefined) columns.label = index;
      if (/learning\s*outcome/i.test(text) && columns.description === undefined) columns.description = index;
      // K10/K11 ghi "Tổng điểm"; K12 ghi "Điểm tối đa LO (nhập)" ở cột F — cả hai đều là trọng số LO.
      if (/t.?.?ng\s*đi.?m|t.?.?ng\s*di.?m|t.?.i\s*đa\s*lo|t.?.i\s*da\s*lo|total|max/i.test(text) && columns.total === undefined) columns.total = index;
    });
    const labelCol = columns.label ?? 0;
    const descCol = columns.description ?? 1;

    const result: SchoolRubricRow[] = [];
    for (const row of rows.slice(headerIndex + 1)) {
      const label = String(row[labelCol] ?? '').trim();
      if (!/^LO\s*\d+$/i.test(label)) continue;
      const description = String(row[descCol] ?? '').trim();
      const total = columns.total !== undefined ? Number(row[columns.total]) : NaN;
      if (!Number.isFinite(total)) continue;
      result.push({ label: label.replace(/\s+/g, '').toUpperCase(), description, maxPoints: Math.round(total * 100) / 100 });
    }
    if (result.length > 0) return result;
  }
  return [];
};
