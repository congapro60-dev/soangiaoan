/**
 * Định dạng lịch đã xếp thành:
 * - tin báo giảng tuần gửi phụ huynh (theo ngày, có giờ),
 * - các dòng của mẫu "Lịch báo giảng" (thứ / buổi / tiết / tiết PPCT / môn / lớp / tên bài).
 */
import type { PpctLesson } from '../../data/ppct';
import type { PlannedSlot } from './lessonCalendar';
import { addDays, weekday } from './lessonCalendar';

const DAY_NAMES = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
/** Tên thứ dạng số của mẫu báo giảng ("Thứ 2" … "Thứ 7", "CN"). */
const DAY_SHORT = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

export const cleanTitle = (t: string): string => t.trim().replace(/[.\s]+$/, '');
const foldTitle = (t: string): string => cleanTitle(t).toLowerCase();
const firstLine = (s: string): string => cleanTitle(s.split('\n')[0] ?? '');
const lessonWeek = (l: PpctLesson): number => l.week ?? l.weeks[0] ?? 0;

/**
 * Đánh số các tiết cùng tên bài: các lần xuất hiện cách nhau không quá 1 tuần PPCT là cùng một
 * chuỗi (tiết 1, 2, 3…); cách xa hơn là bài khác cùng tên (vd "Hoạt động dự án" mỗi đợt một bài).
 */
export const lessonChains = (lessons: readonly PpctLesson[]): Map<string, { index: number; count: number }> => {
  const byTitle = new Map<string, PpctLesson[]>();
  for (const l of [...lessons].sort((a, b) => (a.periodNo ?? 0) - (b.periodNo ?? 0))) {
    const key = foldTitle(l.title);
    byTitle.set(key, [...(byTitle.get(key) ?? []), l]);
  }
  const out = new Map<string, { index: number; count: number }>();
  for (const list of byTitle.values()) {
    let chain: PpctLesson[] = [];
    const flush = () => chain.forEach((l, i) => out.set(l.id, { index: i + 1, count: chain.length }));
    for (const l of list) {
      const prev = chain.at(-1);
      if (prev && lessonWeek(l) - lessonWeek(prev) > 1) { flush(); chain = []; }
      chain.push(l);
    }
    flush();
  }
  return out;
};

const hhmm = (t: string): string => {
  const [h, m] = t.split(':');
  return `${Number(h)}h${m}`;
};
const dayMonth = (iso: string): string => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
const ddmmyyyy = (iso: string): string => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "Hình học: Hệ thức lượng trong tam giác (tiếp) – Tiết 6: Công thức tính diện tích tam giác." */
export const describeLesson = (lesson: PpctLesson | null, chains: Map<string, { index: number; count: number }>): string => {
  if (!lesson) return '(chưa xếp bài).';
  if (lesson.isElective) return 'Tự chọn.';
  const chain = chains.get(lesson.id);
  const detail = firstLine(lesson.detail);
  const title = cleanTitle(lesson.title);
  const subject = lesson.subject && lesson.subject.trim().toLowerCase() !== title.toLowerCase() ? `${lesson.subject}: ` : '';
  return `${subject}${title}` +
    `${chain && chain.index > 1 ? ' (tiếp)' : ''}${detail ? ` – ${detail}` : ''}.`;
};

export interface ParentWeekMessageInput {
  className: string;
  subjectName: string;
  week: number;
  /** Các tiết của đúng tuần này. */
  slots: readonly PlannedSlot[];
  chains: Map<string, { index: number; count: number }>;
  teacherName?: string;
}

/** Tin báo giảng tuần gửi phụ huynh: lời dẫn + từng ngày + từng tiết. Trả cả bản chữ và HTML. */
export const buildParentWeekMessage = (input: ParentWeekMessageInput): { text: string; html: string } => {
  const { className, subjectName, week, slots, chains, teacherName } = input;
  const dates = [...new Set(slots.map((s) => s.date))].sort();
  const monday = dates.length ? addDays(dates[0], 1 - weekday(dates[0])) : '';
  const lastDay = dates.length && weekday(dates.at(-1)!) > 5 ? dates.at(-1)! : monday ? addDays(monday, 4) : '';
  const range = monday ? ` (${dayMonth(monday)} – ${dayMonth(lastDay)})` : '';
  const intro = [
    `Kính gửi Quý Phụ huynh lớp ${className},`,
    `Dưới đây là nội dung môn ${subjectName} tuần ${week}${range} để Quý Phụ huynh tiện theo dõi và đồng hành cùng các con.`,
  ];
  const days = dates.map((date) => ({
    head: `${DAY_NAMES[weekday(date)]} ${dayMonth(date)}`,
    lines: slots.filter((s) => s.date === date).map((s) => `Từ ${hhmm(s.start)} đến ${hhmm(s.end)}: ${describeLesson(s.lesson, chains)}`),
  }));
  const outro = ['Trân trọng!', ...(teacherName ? [teacherName] : [])];

  const text = [
    ...intro, '',
    ...days.flatMap((d) => [d.head, ...d.lines.map((l) => `• ${l}`), '']),
    ...outro,
  ].join('\n');
  const html = intro.map((p) => `<p>${esc(p)}</p>`).join('') +
    days.map((d) => `<p><strong>${esc(d.head)}</strong></p><ul>${d.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`).join('') +
    outro.map((p) => `<p>${esc(p)}</p>`).join('');
  return { text, html };
};

export interface RegisterRow {
  date: string;
  dayLabel: string; // "Thứ 2"
  session: 'Buổi sáng' | 'Buổi chiều';
  periodNo: number;
  ppctNo: number | null;
  subject: string;
  className: string;
  title: string;
}

export interface RegisterCourse {
  className: string;
  /** Đổi tên môn TKB → tên ghi vào sổ (vd "Chuyên đề Toán" → "CĐ Toán"); thiếu thì giữ tên TKB. */
  subjectLabels?: Readonly<Record<string, string>>;
  slots: readonly PlannedSlot[];
  chains: Map<string, { index: number; count: number }>;
}

/** Tên bài trong sổ báo giảng: "Hệ thức lượng trong tam giác (tiết 3)"; bài một tiết không ghi số. */
export const registerTitle = (lesson: PpctLesson | null, chains: Map<string, { index: number; count: number }>): string => {
  if (!lesson) return '';
  if (lesson.isElective) return 'Tự chọn';
  const chain = chains.get(lesson.id);
  return `${cleanTitle(lesson.title)}${chain && chain.count > 1 ? ` (tiết ${chain.index})` : ''}`;
};

/**
 * Khung một tuần của mẫu "Lịch báo giảng": mọi ngày × mọi tiết đánh số (ô trống giữ nguyên),
 * gộp tất cả lớp/môn của GV. `dayPeriods`: các tiết đánh số trong ngày kèm giờ bắt đầu.
 */
export const buildRegisterWeek = (
  monday: string,
  days: readonly number[],
  dayPeriods: readonly { periodNo: number; start: string }[],
  courses: readonly RegisterCourse[],
): RegisterRow[] => {
  const rows: RegisterRow[] = [];
  for (const day of days) {
    const date = addDays(monday, day - 1);
    for (const p of dayPeriods) {
      const base = { date, dayLabel: DAY_SHORT[day], session: (p.start < '12:00' ? 'Buổi sáng' : 'Buổi chiều') as RegisterRow['session'], periodNo: p.periodNo };
      // TKB không đánh số tiết thì khớp theo giờ bắt đầu.
      const hits = courses.flatMap((c) => c.slots
        .filter((s) => s.date === date && (s.periodNo !== null ? s.periodNo === p.periodNo : s.start === p.start))
        .map((s) => ({ c, s })));
      if (hits.length === 0) rows.push({ ...base, ppctNo: null, subject: '', className: '', title: '' });
      for (const { c, s } of hits) {
        rows.push({ ...base, ppctNo: s.lesson?.periodNo ?? null, subject: c.subjectLabels?.[s.subject] ?? s.subject, className: c.className, title: registerTitle(s.lesson, c.chains) });
      }
    }
  }
  return rows;
};

export const registerDateLabel = ddmmyyyy;
