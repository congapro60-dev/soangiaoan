/**
 * Đọc ĐIỂM THI ĐỊNH KÌ của một học sinh từ 2 tab MOET & TDS trong file điểm của lớp (Google Sheet).
 *
 * Thuần: nhận mảng ô THÔ (đã đọc sẵn ở nơi khác), khớp học sinh theo **Mã HS**, chỉ rút các CỘT ĐIỂM.
 * Cố ý BỎ QUA cột "Phân loại điểm"/"Điểm chữ (CÔNG THỨC)" và các khối kế hoạch hành động nội bộ của
 * giáo viên — bản gửi phụ huynh không được lộ những phần đó.
 *
 * Cấu trúc thật (đã kiểm trên Drive): header ở dòng 3 (Mã HS ở cột 0), dòng 4 là số cột, dữ liệu từ
 * dòng 5. MOET: các cột `Điểm T9 KSĐN`, `Điểm T10 ĐGGHKI`, … (thang 10). TDS: `Điểm Quý 1..4` kèm
 * cột kế tiếp `Điểm chữ`.
 */

export const MOET_TAB = 'MOET';
export const TDS_TAB = 'TDS';

/** Một cột điểm thi đã rút gọn cho phụ huynh. */
export interface ExamMark {
  /** Tên mốc đã việt hoá dễ đọc, vd "Giữa học kì I", "Quý 1". */
  label: string;
  /** Điểm số (thang 10 với MOET; thang của trường với TDS). */
  score: number;
  /** Điểm chữ đi kèm (chỉ TDS), vd "A"/"B". */
  letter?: string;
}

export interface StudentExamScores {
  /** Điểm định kì hệ MOET (thang 10). */
  moet: ExamMark[];
  /** Điểm quý hệ TDS. */
  tds: ExamMark[];
}

const norm = (value: unknown): string => String(value == null ? '' : value).normalize('NFC').replace(/\s+/g, ' ').trim();

/** Dòng tiêu đề = dòng đầu tiên có ô đầu là "Mã HS"; không thấy thì mặc định dòng 3 (index 2). */
const headerRowIndex = (rows: readonly unknown[][]): number => {
  const found = rows.findIndex(row => /^m[ãa]\s*hs$/i.test(norm(row?.[0])));
  return found >= 0 ? found : 2;
};

const findStudentRow = (rows: readonly unknown[][], studentCode: string, headerIdx: number): unknown[] | null => {
  const target = norm(studentCode);
  if (!target) return null;
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    if (norm(rows[i]?.[0]) === target) return rows[i];
  }
  return null;
};

const coerceScore = (cell: unknown): number | null => {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  const text = norm(cell).replace(',', '.');
  if (text === '') return null;
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value : null;
};

/** Việt hoá tên mốc MOET từ mã đánh giá trong header (KSĐN / ĐG giữa–cuối HKI–HKII). */
const moetLabel = (header: string): string => {
  const H = header.toUpperCase();
  if (H.includes('KSĐN') || H.includes('KSDN')) return 'Khảo sát đầu năm';
  if (H.includes('GHKII')) return 'Giữa học kì II';
  if (H.includes('CHKII')) return 'Cuối học kì II';
  if (H.includes('GHKI')) return 'Giữa học kì I';
  if (H.includes('CHKI')) return 'Cuối học kì I';
  return header.replace(/^đi[eể]m\s*/i, '').trim() || header;
};

const isMoetScoreHeader = (header: string): boolean => /^đi[eể]m\s*t\s*\d/i.test(header);
const isTdsScoreHeader = (header: string): boolean => /^đi[eể]m\s*qu[ýy]/i.test(header);
const isLetterHeader = (header: string): boolean => /đi[eể]m\s*ch[ữu]/i.test(header);

/** Rút điểm MOET (thang 10) của học sinh: mỗi cột "Điểm T…" một mốc, chỉ mốc đã có điểm. */
const parseMoet = (rows: readonly unknown[][], studentCode: string): ExamMark[] => {
  const headerIdx = headerRowIndex(rows);
  const header = rows[headerIdx] ?? [];
  const studentRow = findStudentRow(rows, studentCode, headerIdx);
  if (!studentRow) return [];
  const marks: ExamMark[] = [];
  for (let col = 0; col < header.length; col += 1) {
    const label = norm(header[col]);
    if (!isMoetScoreHeader(label)) continue;
    const score = coerceScore(studentRow[col]);
    if (score === null) continue;
    marks.push({ label: moetLabel(label), score });
  }
  return marks;
};

/** Rút điểm quý TDS của học sinh: cột "Điểm Quý n" là điểm, cột "Điểm chữ" ngay sau là điểm chữ. */
const parseTds = (rows: readonly unknown[][], studentCode: string): ExamMark[] => {
  const headerIdx = headerRowIndex(rows);
  const header = rows[headerIdx] ?? [];
  const studentRow = findStudentRow(rows, studentCode, headerIdx);
  if (!studentRow) return [];
  const marks: ExamMark[] = [];
  for (let col = 0; col < header.length; col += 1) {
    const label = norm(header[col]);
    if (!isTdsScoreHeader(label)) continue;
    const score = coerceScore(studentRow[col]);
    if (score === null) continue;
    const letterRaw = isLetterHeader(norm(header[col + 1])) ? norm(studentRow[col + 1]) : '';
    marks.push({ label: label.replace(/^đi[eể]m\s*/i, '').trim() || label, score, ...(letterRaw ? { letter: letterRaw } : {}) });
  }
  return marks;
};

/** Ghép điểm MOET + TDS của một học sinh từ hai bảng ô thô đã đọc. */
export const parseStudentExamScores = (
  moetRows: readonly unknown[][],
  tdsRows: readonly unknown[][],
  studentCode: string,
): StudentExamScores => ({
  moet: parseMoet(moetRows, studentCode),
  tds: parseTds(tdsRows, studentCode),
});
