/**
 * Chuẩn bị lớp cho giáo viên từ folder Drive "Lộ trình Toán THPT" (mỗi lớp 1 Google Sheet tên
 * "26-27-<Lớp>-<Giáo viên>"). Thuần, test được. Nguyên tắc: KHÔNG BAO GIỜ ghi đè lớp đã có —
 * lớp đã có chỉ được nối thêm file điểm.
 */

export interface ClassFileInfo {
  schoolYear: string;
  className: string;
  teacherName: string;
}

/** "26-27-12 VN Toán 3-Vũ Cẩm Vân" → năm học, tên lớp, tên giáo viên. Không đúng mẫu thì null. */
export const parseClassFileName = (fileName: string): ClassFileInfo | null => {
  const match = /^(\d{2}-\d{2})-(.+)-([^-]+)$/.exec(String(fileName || '').normalize('NFC').trim());
  if (!match) return null;
  const className = match[2].trim();
  const teacherName = match[3].trim();
  if (!className || !teacherName) return null;
  return { schoolYear: match[1], className, teacherName };
};

const stripMarks = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

/** Khoá so khớp lớp: bỏ năm học, tiền tố "T_", dấu, khoảng trắng. "T_26-27 10Victoria" ≡ "10Victoria". */
export const classKey = (name: string): string =>
  stripMarks(String(name || '').toLowerCase())
    .replace(/^t_/, '')
    .replace(/\b\d{2}-\d{2}\b/g, '')
    .replace(/[\s_\-.]+/g, '');

/** Tên người để so: bỏ phần trong ngoặc, dấu, hoa/thường; so theo TẬP chữ (thứ tự tên Việt hay đảo). */
const nameTokens = (name: string): string[] =>
  stripMarks(String(name || '').replace(/\([^)]*\)/g, ' ').toLowerCase()).split(/\s+/).filter(Boolean).sort();

export const sameName = (a: string, b: string): boolean => {
  const x = nameTokens(a);
  const y = nameTokens(b);
  return x.length > 0 && x.length === y.length && x.every((token, index) => token === y[index]);
};

export interface SetupUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface SetupClass {
  id: string;
  name: string;
  teacherId: string;
  examSheetId?: string | null;
}

const SCHOOL_DOMAIN = '@thedeweyschools.edu.vn';

/**
 * Chọn tài khoản cho giáo viên trong tên file. Ưu tiên: (1) tài khoản ĐÃ có lớp trùng khoá hoặc
 * đã nối đúng file này — giáo viên đang dùng thật; (2) tài khoản email trường trùng tên;
 * (3) tài khoản bất kỳ trùng tên. Không chắc thì null để chủ dự án chọn tay.
 */
export const suggestTeacherUid = (
  file: { id: string; info: ClassFileInfo },
  users: readonly SetupUser[],
  classes: readonly SetupClass[],
): string | null => {
  const linked = classes.find(c => c.examSheetId === file.id);
  if (linked) return linked.teacherId;
  const nameMatches = users.filter(u => u.displayName && sameName(u.displayName, file.info.teacherName));
  const key = classKey(file.info.className);
  const owning = nameMatches.find(u => classes.some(c => c.teacherId === u.uid && classKey(c.name) === key))
    ?? users.find(u => classes.some(c => c.teacherId === u.uid && classKey(c.name) === key) && nameMatches.length === 0);
  if (owning) return owning.uid;
  const school = nameMatches.filter(u => (u.email ?? '').toLowerCase().endsWith(SCHOOL_DOMAIN));
  if (school.length === 1) return school[0].uid;
  return nameMatches.length === 1 ? nameMatches[0].uid : null;
};

/** Lớp đã có của giáo viên tương ứng file này (đã nối file, hoặc trùng khoá tên). */
export const findExistingClass = (
  file: { id: string; info: ClassFileInfo },
  teacherUid: string | null,
  classes: readonly SetupClass[],
): SetupClass | null => {
  const linked = classes.find(c => c.examSheetId === file.id);
  if (linked) return linked;
  if (!teacherUid) return null;
  const key = classKey(file.info.className);
  return classes.find(c => c.teacherId === teacherUid && classKey(c.name) === key) ?? null;
};

export interface RosterStudent {
  code: string;
  name: string;
}

const cell = (value: unknown): string => String(value == null ? '' : value).normalize('NFC').replace(/\s+/g, ' ').trim();

/**
 * Danh sách học sinh từ ô thô của tab MOET/Tình hình (cột A = Mã HS, B = Tên HS, header "Mã HS").
 * Bỏ dòng số thứ tự cột, dòng thiếu mã/tên; trùng mã thì giữ lần đầu.
 */
export const parseRoster = (rows: readonly unknown[][]): RosterStudent[] => {
  const headerIdx = rows.findIndex(row => /^m[ãa]\s*hs/i.test(cell(row?.[0])));
  const start = headerIdx >= 0 ? headerIdx + 1 : 0;
  const seen = new Set<string>();
  const out: RosterStudent[] = [];
  for (const row of rows.slice(start)) {
    const code = cell(row?.[0]).toUpperCase();
    const name = cell(row?.[1]);
    if (!code || !name || /^\d+$/.test(name) || !/[A-Za-z0-9]/.test(code)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    out.push({ code, name });
  }
  return out;
};
