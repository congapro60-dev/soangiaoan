/**
 * GIAI ĐOẠN (học kì) của năng lực / yêu cầu cần đạt — để báo cáo phụ huynh chỉ nêu những gì thuộc CÙNG giai đoạn với kì báo cáo.
 * Vd báo cáo tháng 9 lớp 10 không được có "Hàm số bậc hai" (Bài 16, học kì II) và không đếm nó vào "đã đánh giá x/y năng lực".
 *
 * Căn cứ (đối chiếu 01/10/2026): "26-27 Chiều dọc Toán THPT" (các bài của HK1 từng khối) và PPCT đóng sẵn trong app
 * `src/data/ppct/{tds,moet}-g{10,11,12}.json` (tuần dạy từng bài; mốc "Kiểm tra cuối HK1" ở tuần 18).
 * TDS và MOET xếp KHÁC nhau ở vài bài biên (khối 11: Bài 18–19; khối 12: Bài 12–14) → các bài đó tính cho CẢ hai học kì,
 * không ẩn nhầm cái lớp thực sự đã học. Bài không rõ bài số → không lọc.
 */
// Cố ý không import `reportPeriod` (kéo cả chuỗi file client vào máy chủ): chỉ cần kind + hai ngày.

export type Term = 'HK1' | 'HK2';

/** Năm bắt đầu năm học: từ tháng 8 tính là năm học mới (khớp `schoolYearStart` trong reportPeriod). */
const schoolYearStart = (day: string): number => {
  const [y, m] = day.split('-').map(Number);
  return m >= 8 ? y : y - 1;
};

/** Bài SGK ≤ hk1Max chỉ thuộc HK1; ≥ hk2Min chỉ thuộc HK2; ở giữa là chương trình TDS/MOET xếp khác nhau → cả hai. */
const BOUNDARY: Readonly<Record<number, { hk1Max: number; hk2Min: number }>> = {
  10: { hk1Max: 14, hk2Min: 15 },
  11: { hk1Max: 17, hk2Min: 20 },
  12: { hk1Max: 11, hk2Min: 15 },
};

const termsOfBai = (grade: number, bai: number): Term[] => {
  const b = BOUNDARY[grade];
  if (!b) return ['HK1', 'HK2'];
  if (bai <= b.hk1Max) return ['HK1'];
  if (bai >= b.hk2Min) return ['HK2'];
  return ['HK1', 'HK2'];
};

const unionTerms = (grade: number, from: number, to: number): Term[] => {
  const set = new Set<Term>();
  for (let bai = Math.min(from, to); bai <= Math.max(from, to); bai += 1) termsOfBai(grade, bai).forEach(term => set.add(term));
  return [...set];
};

/** "Bài 3–4" → học kì của các bài 3..4. Không có số bài (vd "Chương V") → null = không xác định. */
export const termsOfSgk = (grade: number, sgk: string): Term[] | null => {
  const numbers = [...String(sgk).matchAll(/\d+/g)].map(match => Number(match[0]));
  if (numbers.length === 0 || !/B[aà]i/i.test(sgk)) return null;
  return unionTerms(grade, Math.min(...numbers), Math.max(...numbers));
};

/** Phạm vi bài SGK của từng năng lực (khung năng lực `framework.ts`). Năng lực không có ở đây (vd ôn lớp dưới) → không lọc. */
const COMPETENCY_BAI: Readonly<Record<string, readonly [number, number]>> = {
  'g10-tap-hop-va-menh-de': [1, 2], 'g10-phep-toan-tren-tap-hop': [2, 2], 'g10-bpt-bac-nhat-hai-an': [3, 4],
  'g10-gia-tri-luong-giac-0-180': [5, 5], 'g10-he-thuc-luong-tam-giac': [6, 6], 'g10-vecto-va-phep-toan': [7, 9],
  'g10-vecto-mat-phang-toa-do': [10, 11], 'g10-so-gan-dung-sai-so': [12, 12],
  'g10-ham-so-va-do-thi': [15, 15], 'g10-ham-so-bac-hai': [16, 16], 'g10-dau-tam-thuc-bpt-bac-hai': [17, 18],
  'g10-pt-duong-thang': [19, 20], 'g10-pt-duong-tron': [21, 21], 'g10-ba-duong-conic': [22, 22],
  'g10-quy-tac-dem-to-hop': [23, 24], 'g10-nhi-thuc-newton': [25, 25], 'g10-xac-suat-co-dien': [26, 27],

  'g11-ham-va-pt-luong-giac': [1, 4], 'g11-day-so-cap-so': [5, 7], 'g11-phan-tich-du-lieu': [8, 9],
  'g11-duong-thang-mat-phang-kg': [10, 10], 'g11-quan-he-song-song': [11, 14], 'g11-gioi-han': [15, 17],
  'g11-ham-mu-va-logarit': [18, 21], 'g11-quan-he-vuong-goc': [22, 25], 'g11-xac-suat-co-dien-quy-tac': [28, 30],
  'g11-dao-ham': [31, 33],

  'g12-khao-sat-ham-so': [1, 5], 'g12-toa-do-khong-gian': [6, 8], 'g12-phan-tich-du-lieu': [9, 10],
  'g12-nguyen-ham-tich-phan': [11, 12], 'g12-ung-dung-tich-phan': [13, 13], 'g12-pt-mat-phang': [14, 14],
  'g12-pt-duong-thang': [15, 16], 'g12-pt-mat-cau': [17, 17], 'g12-xac-suat-dieu-kien-bayes': [18, 19],
};

const gradeOfCompetencyId = (id: string): number => Number(id.match(/^g(\d+)-/)?.[1]);

/** Học kì của một năng lực; null = không xác định (không bị lọc). */
export const competencyTerms = (id: string): Term[] | null => {
  const range = COMPETENCY_BAI[id];
  return range ? unionTerms(gradeOfCompetencyId(id), range[0], range[1]) : null;
};

/** Ngày cuối HK1 mặc định (khớp `defaultPeriod`): 15/1. GV có thể sửa ngày trong báo cáo kì; báo cáo cả năm không lọc. */
const hk1End = (from: string): string => `${schoolYearStart(from) + 1}-01-15`;

/**
 * Các học kì mà khoảng báo cáo chạm tới. `null` = không lọc (báo cáo cả năm).
 * Tháng 1 chạm cả hai (HK1 kết thúc giữa tháng); tháng 9–12 chỉ HK1; tháng 2–5 chỉ HK2.
 */
export const termsForPeriod = (period: { kind: string; from: string; to: string } | null | undefined): readonly Term[] | null => {
  if (!period || period.kind === 'year') return null;
  const end = hk1End(period.from);
  const term = (day: string): Term => (day <= end ? 'HK1' : 'HK2');
  return [...new Set<Term>([term(period.from), term(period.to)])];
};

/** `itemTerms` null (không xác định) hoặc không có giới hạn → luôn nằm trong giai đoạn. */
export const inStage = (itemTerms: readonly Term[] | null, wanted: readonly Term[] | null | undefined): boolean =>
  !wanted || !itemTerms || itemTerms.some(term => wanted.includes(term));
