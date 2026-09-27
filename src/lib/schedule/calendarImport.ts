/**
 * Đọc lịch năm học (mọi trường, mọi định dạng) bằng AI: chữ thô của file/Sheet → danh sách sự kiện.
 * AI chỉ đề xuất; GV soát bảng rồi mới áp dụng. Chỉ loại "nghỉ" mới tự động làm mất tiết trong lịch.
 */
import { addDays, mondayOf, weekday } from './lessonCalendar';

export type CalendarEventKind = 'nghi' | 'giam-tiet' | 'kiem-tra' | 'lam-bu' | 'khac';

export const CALENDAR_KIND_LABELS: Record<CalendarEventKind, string> = {
  nghi: 'HS nghỉ học',
  'giam-tiet': 'Giảm tiết',
  'kiem-tra': 'Kiểm tra / thi',
  'lam-bu': 'Làm bù',
  khac: 'Sự kiện khác',
};

export interface CalendarEvent {
  from: string; // YYYY-MM-DD
  to: string;
  kind: CalendarEventKind;
  note: string;
  /** Có làm mất tiết trong lịch báo giảng không (mặc định: chỉ "nghỉ"). */
  applied: boolean;
}

export interface CalendarImport {
  /** Thứ Hai của tuần 1 nếu lịch có đánh số tuần; null nếu không thấy. */
  week1Monday: string | null;
  events: CalendarEvent[];
}

/** Giới hạn chữ gửi AI — lịch cả năm thường chỉ vài chục nghìn ký tự. */
export const MAX_CALENDAR_CHARS = 60_000;

export const buildCalendarPrompt = (sourceText: string): string => [
  'Bạn đọc LỊCH NĂM HỌC của một trường phổ thông Việt Nam (chép thô từ bảng tính / văn bản, cột có thể lệch).',
  'Nhiệm vụ: liệt kê các ngày ẢNH HƯỞNG TỚI GIỜ HỌC của học sinh.',
  '',
  'Loại sự kiện (kind):',
  '- "nghi": học sinh NGHỈ HỌC cả ngày (nghỉ lễ, Tết, PD day/đào tạo GV mà HS nghỉ, nghỉ giữa kỳ…).',
  '- "giam-tiet": vẫn học nhưng mất một số tiết (vd "-2 tiết", sự kiện chiếm buổi sáng).',
  '- "kiem-tra": kiểm tra / thi định kỳ.',
  '- "lam-bu": ngày học bù (vd thứ Bảy đi học bù cho một ngày nghỉ).',
  '- "khac": sự kiện khác có nhắc tới học sinh nhưng không rõ có mất tiết không.',
  'BỎ QUA sự kiện chỉ dành cho giáo viên/nhân viên/tuyển sinh/cho thuê cơ sở mà HS vẫn học bình thường.',
  '',
  'Quy tắc:',
  '- Ngày ghi dạng "YYYY-MM-DD". Suy ra năm từ năm học ghi trong lịch (vd năm học 2026-2027: tháng 8-12 là 2026, tháng 1-7 là 2027).',
  '- Khoảng ngày ("12~16", "1-2") thì from là ngày đầu, to là ngày cuối; một ngày thì from = to.',
  '- "note": trích ngắn nội dung gốc bằng tiếng Việt (tối đa 80 ký tự).',
  '- "week1Monday": nếu lịch đánh số tuần học (W1, Tuần 1…) thì ghi ngày THỨ HAI của tuần 1; không có thì null.',
  '- Không chắc thì bỏ, không bịa.',
  '',
  'Trả về DUY NHẤT một JSON, không giải thích:',
  '{"week1Monday": "2026-08-17", "events": [{"from": "2026-09-01", "to": "2026-09-02", "kind": "nghi", "note": "Nghỉ lễ Quốc khánh"}]}',
  '',
  'LỊCH NĂM HỌC:',
  sourceText.slice(0, MAX_CALENDAR_CHARS),
].join('\n');

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDate = (s: unknown): s is string =>
  typeof s === 'string' && ISO_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
const KINDS = new Set<string>(Object.keys(CALENDAR_KIND_LABELS));

/** Đọc JSON AI trả về; bỏ dòng hỏng, sắp theo ngày. Hỏng hẳn thì trả rỗng. */
export const parseCalendarResponse = (text: string): CalendarImport => {
  const json = text.match(/\{[\s\S]*\}/);
  let parsed: { week1Monday?: unknown; events?: unknown } = {};
  try {
    parsed = json ? JSON.parse(json[0]) : {};
  } catch {
    return { week1Monday: null, events: [] };
  }
  const events: CalendarEvent[] = [];
  for (const e of Array.isArray(parsed.events) ? parsed.events : []) {
    const r = e as Record<string, unknown>;
    if (!isIsoDate(r.from)) continue;
    const to = isIsoDate(r.to) && r.to >= r.from ? r.to : r.from;
    const kind = (typeof r.kind === 'string' && KINDS.has(r.kind) ? r.kind : 'khac') as CalendarEventKind;
    events.push({ from: r.from, to, kind, note: String(r.note ?? '').trim().slice(0, 120), applied: kind === 'nghi' });
  }
  events.sort((a, b) => a.from.localeCompare(b.from));
  const w1 = isIsoDate(parsed.week1Monday) ? mondayOf(parsed.week1Monday) : null;
  return { week1Monday: w1, events };
};

/** Các ngày học (T2–T6) mà sự kiện đang áp dụng làm HS nghỉ. */
export const offDatesFrom = (events: readonly CalendarEvent[]): Set<string> => {
  const out = new Set<string>();
  for (const e of events) {
    if (!e.applied) continue;
    for (let d = e.from; d <= e.to; d = addDays(d, 1)) if (weekday(d) <= 5) out.add(d);
  }
  return out;
};

/** Thứ Hai của các tuần nghỉ trọn T2–T6 (vd nghỉ Tết) — không tính là một tuần PPCT. */
export const fullyOffWeeks = (offDates: ReadonlySet<string>): Set<string> => {
  const mondays = new Set([...offDates].map(mondayOf));
  return new Set([...mondays].filter((m) => [0, 1, 2, 3, 4].every((i) => offDates.has(addDays(m, i)))));
};
