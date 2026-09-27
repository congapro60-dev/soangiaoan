/**
 * Đọc dữ liệu SSM (Edufit) do tiện ích "SmartPlan ↔ SSM" chuyển về — thuần, không gọi mạng.
 * API nội bộ SSM không có tài liệu, nên mọi hàm đọc phòng thủ: sai cấu trúc thì trả rỗng + tên khoá
 * để chẩn đoán, không làm vỡ màn hình.
 */
import type { Student } from '../../types';

export interface SsmClass {
  id: number;
  name: string;
}

export interface SsmStudent {
  code: string;
  name: string;
}

export interface SsmSchoolYear {
  id: number;
  name: string;
}

export interface RosterMatch {
  matched: Array<{ app: Student; ssm: SsmStudent }>;
  onlyInApp: Student[];
  onlyInSsm: SsmStudent[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const firstString = (item: Record<string, unknown>, keys: readonly string[]): string => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

/** Laravel trả `{data: [...]}`, có khi lồng phân trang `{data: {data: [...]}}`. */
export const listOf = (body: unknown): unknown[] => {
  if (Array.isArray(body)) return body;
  if (!isRecord(body)) return [];
  if (Array.isArray(body.data)) return body.data;
  if (isRecord(body.data) && Array.isArray(body.data.data)) return body.data.data;
  return [];
};

export const parseProfileEmail = (body: unknown): string => {
  const data = isRecord(body) && isRecord(body.data) ? body.data : body;
  return isRecord(data) ? firstString(data, ['email']).toLowerCase() : '';
};

export const emailsMatch = (a: string | null | undefined, b: string | null | undefined): boolean =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Năm học đang chạy: SSM đánh `status = 2`. */
export const pickCurrentSchoolYear = (body: unknown): SsmSchoolYear | null => {
  for (const item of listOf(body)) {
    if (isRecord(item) && item.status === 2 && typeof item.id === 'number') {
      return { id: item.id, name: firstString(item, ['name']) };
    }
  }
  return null;
};

export const parseClasses = (body: unknown): SsmClass[] => {
  const seen = new Set<number>();
  const classes: SsmClass[] = [];
  for (const raw of listOf(body)) {
    if (!isRecord(raw)) continue;
    const item = isRecord(raw.class) ? raw.class : raw;
    const id = typeof item.id === 'number' ? item.id : Number(item.id);
    const name = firstString(item, ['name', 'class_name']);
    if (!Number.isInteger(id) || id <= 0 || !name || seen.has(id)) continue;
    seen.add(id);
    classes.push({ id, name });
  }
  return classes.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};

/** SSM hiện mã học sinh bằng `student_code` (trang Chi tiết lớp); `code` là tên ô ở dạng lồng `student`. */
const CODE_KEYS = ['student_code', 'code', 'studentCode'] as const;
const NAME_KEYS = ['full_name', 'fullname', 'name', 'student_name'] as const;

/**
 * Danh sách học sinh của một lớp SSM. `unknownKeys` khác null nghĩa là SSM có trả dòng nhưng không
 * nhận ra ô mã/tên — chỉ trả TÊN khoá (không có giá trị) để chẩn đoán.
 */
export const parseStudents = (body: unknown): { students: SsmStudent[]; unknownKeys: string[] | null } => {
  const rows = listOf(body);
  const students: SsmStudent[] = [];
  for (const raw of rows) {
    if (!isRecord(raw)) continue;
    const item = isRecord(raw.student) ? raw.student : raw;
    const code = firstString(item, CODE_KEYS);
    const name = firstString(item, NAME_KEYS);
    if (code) students.push({ code, name });
  }
  const unknownKeys = rows.length > 0 && students.length === 0 && isRecord(rows[0]) ? Object.keys(rows[0]).sort() : null;
  return { students, unknownKeys };
};

export const normalizeCode = (code: string): string => code.replace(/\s+/g, '').toUpperCase();

export const normalizeClassName = (name: string): string =>
  name.normalize('NFC').replace(/\s+/g, '').toLowerCase();

/** Lớp SSM trùng tên lớp app (bỏ khoảng trắng, không phân biệt hoa thường) — để chọn sẵn. */
export const guessSsmClass = (appClassName: string, classes: readonly SsmClass[]): SsmClass | null =>
  classes.find(c => normalizeClassName(c.name) === normalizeClassName(appClassName)) ?? null;

/** So danh sách lớp app với SSM theo Mã HS. Chỉ so, không sửa gì. */
export const matchRoster = (appStudents: readonly Student[], ssmStudents: readonly SsmStudent[]): RosterMatch => {
  const ssmByCode = new Map(ssmStudents.map(s => [normalizeCode(s.code), s]));
  const matched: RosterMatch['matched'] = [];
  const onlyInApp: Student[] = [];
  const used = new Set<string>();
  for (const app of appStudents) {
    const key = normalizeCode(app.code);
    const ssm = key ? ssmByCode.get(key) : undefined;
    if (ssm) {
      matched.push({ app, ssm });
      used.add(key);
    } else {
      onlyInApp.push(app);
    }
  }
  const onlyInSsm = ssmStudents.filter(s => !used.has(normalizeCode(s.code)));
  return { matched, onlyInApp, onlyInSsm };
};
