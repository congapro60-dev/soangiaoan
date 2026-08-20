import { Student } from '../types';

/**
 * Đọc danh sách học sinh từ bảng Excel/CSV của trường.
 *
 * Cố ý KHÔNG tự loại học sinh theo cột "thôi học": các file thật có nhiều cột cùng khớp từ khoá đó
 * (vd "Đăng ký thôi học/ withdraw" và "Tình trạng thôi học/Status"), đoán sai một cột là âm thầm
 * xoá cả lớp khỏi danh sách. Thà nhập thừa một em để giáo viên tự xoá, còn hơn thiếu một em mà
 * không ai nhận ra.
 */

/** Bỏ dấu tiếng Việt để dò tiêu đề cột không phụ thuộc cách gõ dấu. */
const boDau = (value: string): string =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

const chuanHoaO = (value: unknown): string =>
  String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const khoaTieuDe = (value: unknown): string => boDau(chuanHoaO(value)).toLowerCase();

const RX_TEN = /(ho va ten|ho ten|ten hs|ten hoc sinh|full ?name|student ?name)/;
const RX_MA = /(ma hs|ma hoc sinh|student ?code|ma so hoc sinh)/;

export interface RosterParseResult {
  students: Student[];
  /** Chỉ số dòng tiêu đề đã dùng (0-based) — để báo lỗi cho người dùng hiểu. */
  headerRowIndex: number;
  /** Số dòng bị bỏ vì trùng mã với dòng trước. */
  duplicateCount: number;
  /** true khi bảng không có cột mã học sinh, mã sẽ được sinh theo thứ tự. */
  codeGenerated: boolean;
}

export class RosterParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RosterParseError';
  }
}

/**
 * Tìm dòng tiêu đề trong 15 dòng đầu. File của trường có dòng tiêu đề nằm ở dòng 1, nhưng bản
 * xuất từ Google Sheets hay chèn thêm dòng tiêu đề phụ ở trên.
 */
const timDongTieuDe = (rows: unknown[][]): number => {
  const gioiHan = Math.min(rows.length, 15);
  for (let i = 0; i < gioiHan; i += 1) {
    if ((rows[i] || []).some(cell => RX_TEN.test(khoaTieuDe(cell)))) return i;
  }
  return -1;
};

export const parseRosterRows = (rows: unknown[][], classNameHint = ''): RosterParseResult => {
  const headerRowIndex = timDongTieuDe(rows);
  if (headerRowIndex < 0) {
    throw new RosterParseError(
      'Không tìm thấy cột họ tên trong 15 dòng đầu. Bảng cần một cột tiêu đề kiểu "Họ và tên", "Tên HS" hoặc "Full name".'
    );
  }

  const header = (rows[headerRowIndex] || []).map(khoaTieuDe);
  const nameIndex = header.findIndex(h => RX_TEN.test(h));
  const codeIndex = header.findIndex(h => RX_MA.test(h));

  const students: Student[] = [];
  const seenCodes = new Set<string>();
  let duplicateCount = 0;

  for (const row of rows.slice(headerRowIndex + 1)) {
    const name = chuanHoaO((row || [])[nameIndex]);
    if (!name) continue;

    const rawCode = codeIndex >= 0 ? chuanHoaO((row || [])[codeIndex]) : '';
    const code = (rawCode || `${classNameHint.replace(/\s+/g, '')}-${students.length + 1}`).toUpperCase();

    if (seenCodes.has(code)) {
      duplicateCount += 1;
      continue;
    }
    seenCodes.add(code);

    students.push({
      id: `student-${Date.now()}-${students.length}`,
      name,
      code,
      progress: 0,
      status: 'active',
    });
  }

  if (students.length === 0) {
    throw new RosterParseError('Tìm thấy cột họ tên nhưng không có dòng học sinh nào bên dưới.');
  }

  return { students, headerRowIndex, duplicateCount, codeGenerated: codeIndex < 0 };
};
