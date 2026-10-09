/**
 * Chia "Kết quả theo bài" thành các TUẦN HỌC cho dễ quan sát. Tuần đánh số theo Lịch dạy của giáo viên (tuần 1 và các tuần
 * nghỉ/đệm không đánh số) để "Tuần 5" của báo cáo trùng "tuần 5" của PPCT; chưa có Lịch dạy thì chỉ ghi khoảng ngày của tuần.
 * Bài xếp theo hạn nộp (không có hạn thì theo ngày nộp). Module thuần — máy chủ và trình duyệt dùng chung.
 */
import type { ParentSafeAssignmentResult } from './parentSafeReport.js';

export interface WeekPlan {
  /** Thứ Hai của tuần 1. */
  week1Monday: string;
  /** Thứ Hai của các tuần không đánh số (nghỉ lễ cả tuần, tuần đệm). */
  skippedWeeks: string[];
}

export interface WeekGroup {
  /** Thứ Hai của tuần; '' = bài không có ngày nào để xếp. */
  monday: string;
  /** Số tuần theo Lịch dạy; null = tuần không đánh số hoặc chưa có Lịch dạy. */
  number: number | null;
  /** Tuần không đánh số (nghỉ/đệm) theo Lịch dạy. */
  unnumbered: boolean;
  /** "28/9 – 4/10". */
  range: string;
  results: ParentSafeAssignmentResult[];
  /** Bài đã có điểm chính thức trong tuần. */
  officialCount: number;
}

const DAY = 86_400_000;
const ms = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const iso = (value: number): string => new Date(value).toISOString().slice(0, 10);
const addDays = (day: string, n: number): string => iso(ms(day) + n * DAY);
export const mondayOf = (day: string): string => addDays(day, -((new Date(ms(day)).getUTCDay() + 6) % 7));
const dm = (day: string): string => `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}`;

const dayOf = (value: string | undefined): string => {
  const parsed = Date.parse(value ?? '');
  if (!Number.isFinite(parsed)) return '';
  // Giờ Việt Nam (UTC+7): bài hạn 23:30 vẫn tính ngày hôm đó.
  return iso(parsed + 7 * 3_600_000);
};

/** Số tuần của một Thứ Hai theo Lịch dạy: đếm từ tuần 1, bỏ tuần không đánh số. null = trước tuần 1 hoặc là tuần không đánh số. */
export const weekNumber = (monday: string, plan: WeekPlan | null | undefined): number | null => {
  if (!plan?.week1Monday) return null;
  const start = mondayOf(plan.week1Monday);
  if (monday < start) return null;
  const skipped = new Set(plan.skippedWeeks.map(mondayOf));
  if (skipped.has(monday)) return null;
  let count = 0;
  for (let day = start; day <= monday; day = addDays(day, 7)) if (!skipped.has(day)) count += 1;
  return count;
};

export const groupResultsByWeek = (results: readonly ParentSafeAssignmentResult[], plan: WeekPlan | null | undefined): WeekGroup[] => {
  const groups = new Map<string, ParentSafeAssignmentResult[]>();
  for (const result of results) {
    const day = dayOf(result.dueAt) || dayOf(result.submittedAt);
    const key = day ? mondayOf(day) : '';
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(result);
  }
  const skipped = new Set((plan?.skippedWeeks ?? []).map(mondayOf));
  return [...groups.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : b.localeCompare(a)))
    .map(([monday, rows]) => ({
      monday,
      number: monday ? weekNumber(monday, plan) : null,
      unnumbered: Boolean(monday) && skipped.has(monday),
      range: monday ? `${dm(monday)} – ${dm(addDays(monday, 6))}` : '',
      results: rows,
      officialCount: rows.filter(row => row.status === 'official' && row.score !== null).length,
    }));
};

/** Tiêu đề nhóm: "Tuần 5 · 28/9 – 4/10". */
export const weekTitle = (group: WeekGroup): string => {
  if (!group.monday) return 'Chưa rõ tuần';
  if (group.number !== null) return `Tuần ${group.number} · ${group.range}`;
  return group.unnumbered ? `Tuần nghỉ · ${group.range}` : `Tuần ${group.range}`;
};
