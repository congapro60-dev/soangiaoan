/**
 * Unit plan (kế hoạch học phần) THPT — học phần I.
 * Dữ liệu sinh từ `scripts/build-unitplan.mjs`.
 *
 * Chỉ dùng làm ngữ cảnh nội dung khi soạn bài. KHÔNG suy đoán bài nào thuộc học phần nào:
 * khớp theo từ khoá tên chương đo được chỉ trúng 34–53% mà lại khớp nhầm 19–26% số bài học
 * kỳ II ("Hàm số mũ" bị gán vào "Chương I. Hàm số lượng giác"), nên việc kèm hay không do
 * giáo viên tự bấm.
 */

export interface UnitPlan {
  grade: number;
  term: string;
  source: string;
  chapters: string[];
  overview: string;
  chapterPlan: string;
}

const files = import.meta.glob('./*.json');

export const UNIT_PLAN_GRADES = [10, 11, 12];

export const loadUnitPlan = async (grade: number): Promise<UnitPlan | null> => {
  const loader = files[`./tds-g${grade}.json`];
  if (!loader) return null;
  const mod = await loader() as UnitPlan | { default: UnitPlan };
  return 'default' in mod ? mod.default : mod;
};
