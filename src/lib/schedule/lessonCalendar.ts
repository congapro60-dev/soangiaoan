/**
 * Xếp các tiết PPCT vào lịch thật (ngày + giờ) theo thời khoá biểu.
 *
 * Cách xếp (khớp cách GV đang làm tay):
 * - Tuần N của lịch nhận các tiết PPCT tuần N (kèm tiết còn dồn từ tuần trước), theo thứ tự PPCT.
 * - Ô TKB có gán phân môn (vd T3/T5 = Hình học) → lấy tiết kế tiếp của phân môn đó;
 *   hết thì lấy tiết Tự chọn; vẫn hết thì lấy tiết kế tiếp bất kỳ. Ô không gán → tiết kế tiếp.
 * - Ngày HS nghỉ bỏ qua; tiết bài học chưa xếp được dồn sang tuần sau và báo cho GV.
 *   Tiết Tự chọn là tiết đệm: tuần hết chỗ thì bỏ, không dồn.
 * Không đoán thay GV: thừa/thiếu đều hiện ra để GV quyết.
 */
import type { PpctLesson } from '../../data/ppct';
import type { WeeklySlot } from './primeTimetable';

export interface TimetablePeriod {
  from: string; // "YYYY-MM-DD", tính cả hai đầu
  to: string;
  slots: WeeklySlot[];
}

export interface CalendarInput {
  lessons: readonly PpctLesson[];
  /** Mỗi TKB (theo quý) một khoảng ngày; ngày nằm ngoài mọi khoảng thì không có tiết. */
  timetables: readonly TimetablePeriod[];
  /** Thứ Hai của tuần 1 PPCT. */
  week1Monday: string;
  /** Ngày HS nghỉ (lễ, PD day…). */
  offDates?: ReadonlySet<string>;
  /** Thứ Hai của các tuần không đánh số (tuần đệm, nghỉ Tết…). */
  skippedWeeks?: ReadonlySet<string>;
  /** Phân môn gán cho ô TKB, khoá `slotKey(slot)`. */
  strandBySlot?: Readonly<Record<string, string>>;
}

export interface PlannedSlot {
  date: string;
  day: number;
  start: string;
  end: string;
  periodNo: number | null;
  /** Tên môn trong TKB (vd "Toán" hay "Chuyên đề Toán" — cùng một dãy PPCT). */
  subject: string;
  /** Tuần PPCT; null nếu tuần không đánh số. */
  week: number | null;
  lesson: PpctLesson | null;
}

export interface CalendarResult {
  slots: PlannedSlot[];
  /** Tuần kết thúc mà còn tiết của tuần đó (hoặc trước) chưa xếp được — đã dồn sang sau. */
  overflow: { week: number; lessons: PpctLesson[] }[];
}

export const slotKey = (s: Pick<WeeklySlot, 'day' | 'start'>): string => `${s.day}-${s.start}`;

const DAY_MS = 86_400_000;
const toMs = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => toIso(toMs(iso) + n * DAY_MS);
/** 1 = Thứ Hai … 7 = Chủ nhật. */
export const weekday = (iso: string): number => ((new Date(toMs(iso)).getUTCDay() + 6) % 7) + 1;
export const mondayOf = (iso: string): string => addDays(iso, 1 - weekday(iso));

const lessonWeek = (l: PpctLesson): number => l.week ?? l.weeks[0] ?? 0;

export const buildLessonCalendar = (input: CalendarInput): CalendarResult => {
  const { timetables, week1Monday } = input;
  const off = input.offDates ?? new Set<string>();
  const skipped = input.skippedWeeks ?? new Set<string>();
  const strandBySlot = input.strandBySlot ?? {};
  if (timetables.length === 0) return { slots: [], overflow: [] };

  const pending = [...input.lessons].sort((a, b) => (a.periodNo ?? 0) - (b.periodNo ?? 0));
  const first = timetables.map((t) => t.from).sort()[0];
  const last = timetables.map((t) => t.to).sort().at(-1)!;

  const slots: PlannedSlot[] = [];
  const overflow: CalendarResult['overflow'] = [];
  let queue: PpctLesson[] = [];
  let weekNo = 0;
  // Đếm tuần từ tuần 1 PPCT (kể cả những tuần trước ngày TKB bắt đầu), bỏ tuần không đánh số.
  for (let monday = mondayOf(week1Monday); monday <= last; monday = addDays(monday, 7)) {
    const counted = !skipped.has(monday);
    if (counted) weekNo += 1;
    if (counted) {
      // Nạp mọi tiết PPCT tới tuần này (tiết của tuần chưa có TKB cũng dồn vào đây).
      while (pending.length && lessonWeek(pending[0]) <= weekNo) queue.push(pending.shift()!);
    }
    if (monday < mondayOf(first)) continue;

    for (let d = 0; d < 7; d++) {
      const date = addDays(monday, d);
      if (date < first || date > last || off.has(date)) continue;
      const tt = timetables.find((t) => t.from <= date && date <= t.to);
      if (!tt) continue;
      const day = weekday(date);
      for (const s of tt.slots.filter((x) => x.day === day).sort((a, b) => a.start.localeCompare(b.start))) {
        let lesson: PpctLesson | null = null;
        if (counted && queue.length) {
          const strand = strandBySlot[slotKey(s)];
          let idx = strand ? queue.findIndex((l) => !l.isElective && l.subject === strand) : 0;
          if (idx < 0) idx = queue.findIndex((l) => l.isElective);
          if (idx < 0) idx = 0;
          lesson = queue.splice(idx, 1)[0];
        }
        slots.push({ date, day, start: s.start, end: s.end, periodNo: s.periodNo, subject: s.subject, week: counted ? weekNo : null, lesson });
      }
    }
    // Tiết Tự chọn là tiết đệm của PPCT (đặt sẵn vào tuần có nghỉ lễ) → không xếp được thì bỏ, không dồn.
    queue = queue.filter((l) => !l.isElective);
    if (counted && queue.length) overflow.push({ week: weekNo, lessons: [...queue] });
  }
  return { slots, overflow };
};
