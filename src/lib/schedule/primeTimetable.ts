/**
 * Đọc thời khoá biểu xuất bản từ Prime Timetable (primetimetable.com/publish/?id=…).
 * Dữ liệu gốc là JSON công khai `GET /api/v2/timetables/{id}/` — hàm ở đây chỉ chuẩn hoá,
 * không gọi mạng. Không mã cứng tên trường/lớp/cấp học: mọi thứ lấy từ chính file.
 */

export interface TtTeacher {
  id: string;
  name: string;
  /** Có khi trường ghi mail vào ô "short name"; không có thì null. */
  email: string | null;
}

/** Một tiết dạy lặp lại hằng tuần. `day`: 1 = Thứ Hai … 7 = Chủ nhật. */
export interface WeeklySlot {
  day: number;
  /** Số tiết trong ngày nếu tên tiết có ghi ("Tiết 3", "P3"), không thì null. */
  periodNo: number | null;
  start: string; // "08:10"
  end: string;
  classNames: string[];
  subject: string;
}

export interface Course {
  /** Khoá ổn định để GV tick chọn: lớp + môn. */
  key: string;
  classNames: string[];
  subject: string;
  slots: WeeklySlot[];
}

export interface PrimeTimetable {
  id: string;
  title: string;
  /** Khoảng ngày hiệu lực đọc từ tên TKB ("Q1 (19/08/26 - 23/10/26)"), null nếu tên không ghi. */
  dateRange: { from: string; to: string } | null;
  teachers: TtTeacher[];
  /** Nhãn cấp học có giờ riêng trong tên tiết (vd "EY", "ES", "MHS"); rỗng nếu tiết chỉ có một giờ. */
  levels: string[];
  raw: RawTimetable;
}

interface RawPeriod { id: string; name?: string; shortName?: string; position: number; startHour?: number; startMinute?: number; endHour?: number; endMinute?: number }
interface RawTimetable {
  id: string;
  name?: string;
  days: { id: string; name?: string; position: number }[];
  periods: RawPeriod[];
  subjects: { id: string; name?: string }[];
  teachers: { id: string; name?: string; shortName?: string }[];
  classes: { id: string; name?: string; groupSets?: { groups?: { id: string }[] }[] }[];
  activities: { subjectId?: string; teacherIds?: string[]; groupIds?: string[]; length?: number; cards?: { dayId: string; periodId: string }[] }[];
}

const pad = (n: number): string => String(n).padStart(2, '0');
const hm = (h: number | undefined, m: number | undefined): string => `${pad(h ?? 0)}:${pad(m ?? 0)}`;

const LEVEL_TIME_RE = /([A-Za-z]{2,4})\s*:\s*(\d{1,2})[:h](\d{2})\s*-\s*(\d{1,2})[:h](\d{2})/g;
const PLAIN_TIME_RE = /(\d{1,2})[:h](\d{2})\s*-\s*(\d{1,2})[:h](\d{2})/;

/** Giờ của tiết theo cấp học: ưu tiên giờ ghi trong tên tiết (đúng hơn giờ khung). */
const periodTime = (p: RawPeriod, level: string | null): { start: string; end: string } => {
  const name = p.name ?? '';
  const leveled = [...name.matchAll(LEVEL_TIME_RE)];
  const m = level ? leveled.find((x) => x[1].toUpperCase() === level) : undefined;
  if (m) return { start: hm(+m[2], +m[3]), end: hm(+m[4], +m[5]) };
  const plain = leveled.length === 0 ? name.match(PLAIN_TIME_RE) : null;
  if (plain) return { start: hm(+plain[1], +plain[2]), end: hm(+plain[3], +plain[4]) };
  return { start: hm(p.startHour, p.startMinute), end: hm(p.endHour, p.endMinute) };
};

const periodNumber = (p: RawPeriod): number | null => {
  const m = (p.name ?? '').trim().match(/^(?:Tiết|P)\s*(\d+)/i);
  return m ? Number(m[1]) : null;
};

const DATE_RE = /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g;
const toIso = (d: string, m: string, y: string): string =>
  `${y.length === 2 ? `20${y}` : y}-${pad(+m)}-${pad(+d)}`;

export const parseDateRange = (title: string): { from: string; to: string } | null => {
  const found = [...title.matchAll(DATE_RE)].map((m) => toIso(m[1], m[2], m[3]));
  return found.length >= 2 ? { from: found[0], to: found[1] } : null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const parsePrimeTimetable = (json: unknown): PrimeTimetable => {
  const raw = json as RawTimetable;
  if (!raw || !Array.isArray(raw.periods) || !Array.isArray(raw.activities) || !Array.isArray(raw.teachers)) {
    throw new Error('Không đọc được thời khoá biểu này (không đúng dữ liệu Prime Timetable).');
  }
  const levels = new Set<string>();
  for (const p of raw.periods) for (const m of (p.name ?? '').matchAll(LEVEL_TIME_RE)) levels.add(m[1].toUpperCase());
  return {
    id: raw.id,
    title: (raw.name ?? '').trim(),
    dateRange: parseDateRange(raw.name ?? ''),
    teachers: raw.teachers.map((t) => {
      const short = (t.shortName ?? '').trim();
      return { id: t.id, name: (t.name ?? '').trim(), email: EMAIL_RE.test(short) ? short.toLowerCase() : null };
    }),
    levels: [...levels],
    raw,
  };
};

const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim();

/** Tên để so: bỏ dấu, chữ thường, các chữ xếp theo thứ tự ("việt cường vũ" = "Vũ Việt Cường"). */
const nameKey = (s: string): string => fold(s).split(' ').filter(Boolean).sort().join(' ');

/** Tìm GV theo mail (chính xác) rồi theo tên (bỏ dấu, không phân biệt hoa thường, không kể thứ tự chữ). */
export const findTeacher = (tt: PrimeTimetable, query: { email?: string | null; name?: string | null }): TtTeacher | null => {
  const email = query.email?.trim().toLowerCase();
  if (email) {
    const byMail = tt.teachers.find((t) => t.email === email);
    if (byMail) return byMail;
  }
  const name = query.name ? nameKey(query.name) : '';
  return name ? tt.teachers.find((t) => nameKey(t.name) === name) ?? null : null;
};

/** "VŨ VIỆT CƯỜNG" → "Vũ Việt Cường" (tên trong TKB hay viết hoa toàn bộ). */
export const titleCaseName = (s: string): string =>
  s.trim().toLocaleLowerCase('vi').replace(/(^|\s)(\S)/g, (_, sp: string, c: string) => sp + c.toLocaleUpperCase('vi'));

/**
 * Các môn/lớp GV dạy trong TKB, mỗi cái kèm các tiết trong tuần (tiết đôi tách thành từng tiết).
 * `level`: nhãn cấp học để lấy đúng giờ khi tên tiết ghi nhiều giờ (xem `levels`).
 */
export const teacherCourses = (tt: PrimeTimetable, teacherId: string, level: string | null = null): Course[] => {
  const { raw } = tt;
  const periods = [...raw.periods].sort((a, b) => a.position - b.position);
  const dayNo = new Map(raw.days.map((d) => [d.id, d.position]));
  const subjectName = new Map(raw.subjects.map((s) => [s.id, (s.name ?? '').trim()]));
  const classOfGroup = new Map<string, string>();
  for (const c of raw.classes) for (const gs of c.groupSets ?? []) for (const g of gs.groups ?? []) classOfGroup.set(g.id, (c.name ?? '').trim());

  const courses = new Map<string, Course>();
  for (const a of raw.activities) {
    if (!(a.teacherIds ?? []).includes(teacherId)) continue;
    const classNames = [...new Set((a.groupIds ?? []).map((g) => classOfGroup.get(g)).filter((n): n is string => !!n))].sort();
    const subject = subjectName.get(a.subjectId ?? '') ?? '';
    const key = `${classNames.join('+')}|${subject}`;
    const course = courses.get(key) ?? { key, classNames, subject, slots: [] };
    for (const card of a.cards ?? []) {
      const day = dayNo.get(card.dayId);
      const idx = periods.findIndex((p) => p.id === card.periodId);
      if (!day || idx < 0) continue;
      for (let k = 0; k < Math.max(1, a.length ?? 1) && idx + k < periods.length; k++) {
        const p = periods[idx + k];
        course.slots.push({ day, periodNo: periodNumber(p), ...periodTime(p, level), classNames, subject });
      }
    }
    courses.set(key, course);
  }
  for (const c of courses.values()) c.slots.sort((x, y) => x.day - y.day || x.start.localeCompare(y.start));
  return [...courses.values()].filter((c) => c.slots.length > 0);
};

/** Các tiết có đánh số trong ngày (khung của mẫu lịch báo giảng: tiết 1…7), theo giờ bắt đầu. */
export const numberedPeriods = (tt: PrimeTimetable, level: string | null = null): { periodNo: number; start: string; end: string }[] => {
  const seen = new Map<number, { periodNo: number; start: string; end: string }>();
  for (const p of [...tt.raw.periods].sort((a, b) => a.position - b.position)) {
    const no = periodNumber(p);
    if (no !== null && !seen.has(no)) seen.set(no, { periodNo: no, ...periodTime(p, level) });
  }
  return [...seen.values()].sort((a, b) => a.periodNo - b.periodNo);
};

/** Lấy id TKB từ link publish (?id=… hoặc #id=…). Chỉ nhận primetimetable.com. */
export const primeTimetableId = (link: string): string | null => {
  let url: URL;
  try { url = new URL(link.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || !/(^|\.)primetimetable\.com$/.test(url.hostname)) return null;
  const id = url.searchParams.get('id') ?? new URLSearchParams(url.hash.replace(/^#/, '')).get('id');
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id.toLowerCase() : null;
};
