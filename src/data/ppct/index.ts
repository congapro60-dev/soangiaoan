/**
 * Phân phối chương trình đóng sẵn trong app.
 * Dữ liệu sinh từ `scripts/build-ppct.mjs` — sửa file nguồn rồi chạy lại script, đừng sửa tay JSON.
 */

export type PpctSource = 'TDS' | 'MOET';

/** Một TIẾT dạy — đơn vị của một kế hoạch bài dạy. */
export interface PpctLesson {
  id: string;
  /** Tên bài. Nhiều tiết có thể cùng một bài. */
  title: string;
  /** Phân môn (Đại số / Hình học / Số học). MOET không ghi phân môn nên để rỗng. */
  subject: string;
  /** Tiết "Tự chọn / Teacher's choice" — PPCT để trống nội dung, giáo viên tự quyết dạy gì. */
  isElective: boolean;
  week: number | null;
  /** Các tuần mà cả bài trải qua. */
  weeks: number[];
  /** Số tiết theo phân phối, tính dồn từ đầu năm. */
  periodNo: number | null;
  /** Tiết thứ mấy trong bài, và bài có mấy tiết. */
  periodIndex: number;
  periodCount: number;
  lessonPeriods: number[];
  /** Nội dung của riêng tiết này — TDS ghi rõ "Tiết 2: ...", MOET để rỗng. */
  detail: string;
  /** Mục tiêu bài học (TDS THCS) hoặc yêu cầu cần đạt (MOET). TDS THPT không có. */
  objectives: string;
  notes: string;
}

export interface PpctProgram {
  source: PpctSource;
  grade: number;
  stream: string;
  lessons: PpctLesson[];
}

export const PPCT_GRADES: Record<PpctSource, number[]> = {
  TDS: [6, 7, 8, 9, 10, 11, 12],
  MOET: [10, 11, 12],
};

export const PPCT_SOURCE_LABELS: Record<PpctSource, string> = {
  TDS: 'TDS — hệ Discover',
  MOET: 'MOET — chuẩn Bộ GD&ĐT',
};

// Tách chunk theo khối: mở bộ chọn lớp 10 thì không kéo theo dữ liệu 6 khối còn lại.
const files = import.meta.glob('./*-g*.json');

export const loadPpct = async (source: PpctSource, grade: number): Promise<PpctProgram | null> => {
  const loader = files[`./${source.toLowerCase()}-g${grade}.json`];
  if (!loader) return null;
  const mod = await loader() as PpctProgram | { default: PpctProgram };
  return 'default' in mod ? mod.default : mod;
};

/**
 * Nhóm bài theo tuần, tuần tăng dần.
 * Bài dạy trải hai tuần chỉ xếp vào tuần đầu — xếp vào cả hai thì nhìn như bị trùng.
 */
export const groupByWeek = (lessons: PpctLesson[]): { week: number; lessons: PpctLesson[] }[] => {
  const map = new Map<number, PpctLesson[]>();
  for (const lesson of lessons) {
    const week = lesson.week ?? lesson.weeks[0] ?? 0;
    if (!map.has(week)) map.set(week, []);
    map.get(week)!.push(lesson);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([week, list]) => ({ week, lessons: list }));
};
