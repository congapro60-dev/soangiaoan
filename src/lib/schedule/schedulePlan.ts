/**
 * Cấu hình lịch báo giảng của một GV và các hàm ghép lại thành lịch.
 *
 * Một "bộ lịch" = một chương trình có TKB + PPCT riêng (vd TDS và MOET tách nhau):
 * nhiều TKB theo quý, nhiều lớp, mỗi lớp một PPCT (có sẵn trong app hoặc GV tự nhập).
 * Lịch năm học (ngày nghỉ) dùng chung cho mọi bộ.
 */
import type { PpctLesson, PpctSource } from '../../data/ppct';
import type { Course } from './primeTimetable';
import type { CalendarEvent } from './calendarImport';
import { fullyOffWeeks, offDatesFrom } from './calendarImport';
import { buildLessonCalendar, mondayOf, type CalendarResult, type TimetablePeriod } from './lessonCalendar';

export interface SavedTimetable {
  /** Id TKB (Prime Timetable) hoặc id tự sinh. */
  id: string;
  link: string;
  title: string;
  from: string;
  to: string;
  level: string | null;
  teacherId: string;
  teacherName: string;
  /** Chỉ các môn/lớp của GV này — không lưu cả TKB trường. */
  courses: Course[];
}

export type PlanPpct =
  | { kind: 'builtin'; source: PpctSource; grade: number }
  | { kind: 'custom'; name: string; lessons: PpctLesson[] };

export interface PlanClass {
  /** Khoá lớp trong TKB: tên lớp, lớp ghép nối bằng "+". */
  classKey: string;
  /** Tên ghi ra tin nhắn / sổ (vd "10Olinda" thay cho "10Olinda (Dis)"). */
  label: string;
  /** Môn TKB tính vào PPCT của lớp (vd "Toán" + "Chuyên đề Toán"). */
  subjects: string[];
  ppct: PlanPpct | null;
  /** Phân môn gán cho từng ô TKB (khoá `slotKey`). */
  strandBySlot: Record<string, string>;
}

export interface SchedulePlan {
  id: string;
  name: string;
  week1Monday: string;
  /** Thứ Hai của tuần không đánh số (tuần đệm…) — ngoài các tuần nghỉ trọn tự tính. */
  skippedWeeks: string[];
  /** Tên môn trong tin gửi phụ huynh (vd "Toán"). */
  messageSubject: string;
  /** Tên môn TKB → tên ghi sổ (vd "Chuyên đề Toán" → "CĐ Toán"). */
  subjectLabels: Record<string, string>;
  timetables: SavedTimetable[];
  classes: PlanClass[];
}

export interface ScheduleState {
  version: 1;
  plans: SchedulePlan[];
  calendar: { sourceName: string; events: CalendarEvent[] };
}

export const emptyScheduleState = (): ScheduleState => ({ version: 1, plans: [], calendar: { sourceName: '', events: [] } });

export const classKeyOf = (c: Pick<Course, 'classNames'>): string => c.classNames.join('+');

/** Nhãn gợi ý: bỏ phần ngoặc cuối ("10Olinda (Dis)" → "10Olinda"). */
export const defaultClassLabel = (classKey: string): string => classKey.replace(/\s*\([^)]*\)\s*$/, '').trim() || classKey;

/** Khối đoán từ số đầu tên lớp ("10Olinda" → 10); không đoán được thì null. */
export const guessGrade = (classKey: string): number | null => {
  const n = Number(/^\s*(\d{1,2})/.exec(classKey)?.[1]);
  return n >= 1 && n <= 12 ? n : null;
};

/** Các lớp trong mọi TKB của bộ lịch, kèm các môn GV dạy ở lớp đó. */
export const classOptions = (plan: Pick<SchedulePlan, 'timetables'>): { classKey: string; subjects: string[] }[] => {
  const map = new Map<string, Set<string>>();
  for (const t of plan.timetables) {
    for (const c of t.courses) {
      const key = classKeyOf(c);
      if (!key) continue;
      map.set(key, (map.get(key) ?? new Set()).add(c.subject));
    }
  }
  return [...map.entries()].map(([classKey, s]) => ({ classKey, subjects: [...s].sort((a, b) => a.localeCompare(b, 'vi')) })).sort((a, b) => a.classKey.localeCompare(b.classKey, 'vi'));
};

/** TKB từng giai đoạn của một lớp (chỉ các môn đã chọn). */
export const classTimetables = (plan: Pick<SchedulePlan, 'timetables'>, pc: Pick<PlanClass, 'classKey' | 'subjects'>): TimetablePeriod[] =>
  [...plan.timetables]
    .sort((a, b) => a.from.localeCompare(b.from))
    .map((t) => ({
      from: t.from,
      to: t.to,
      slots: t.courses.filter((c) => classKeyOf(c) === pc.classKey && pc.subjects.includes(c.subject)).flatMap((c) => c.slots),
    }));

/** Xếp lịch một lớp. `lessons` là PPCT đã nạp (có sẵn hoặc tự nhập). */
export const planClassCalendar = (
  plan: SchedulePlan,
  pc: PlanClass,
  lessons: readonly PpctLesson[],
  events: readonly CalendarEvent[],
): CalendarResult => {
  const offDates = offDatesFrom(events);
  const skipped = new Set([...plan.skippedWeeks.map(mondayOf), ...fullyOffWeeks(offDates)]);
  return buildLessonCalendar({
    lessons,
    timetables: classTimetables(plan, pc),
    week1Monday: plan.week1Monday,
    offDates,
    skippedWeeks: skipped,
    strandBySlot: pc.strandBySlot,
  });
};

const STORAGE_PREFIX = 'lich-bao-giang:v1:';

/** Đọc cấu hình đã lưu trên trình duyệt này; hỏng/không có thì trả trạng thái rỗng. */
export const loadScheduleState = (uid: string): ScheduleState => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + uid);
    const parsed = raw ? JSON.parse(raw) as ScheduleState : null;
    return parsed?.version === 1 && Array.isArray(parsed.plans) ? parsed : emptyScheduleState();
  } catch {
    return emptyScheduleState();
  }
};

/** Lưu cấu hình; trả false nếu trình duyệt không cho lưu (chế độ riêng tư, hết chỗ…). */
export const saveScheduleState = (uid: string, state: ScheduleState): boolean => {
  try {
    localStorage.setItem(STORAGE_PREFIX + uid, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};
