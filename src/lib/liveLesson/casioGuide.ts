/**
 * Hướng dẫn bấm máy Casio fx-580VN X từng phím cho bài Phương sai và độ lệch chuẩn
 * (quyết định thầy 2026-10-25: "HS bấm máy tính thật của các em, nhưng trên màn hình
 * tương tác phải hướng dẫn chi tiết cách bấm").
 *
 * Chuỗi phím lấy nguyên văn từ giáo án Ban Toán của thầy (tasks/giaoan-goc-g12.md):
 *   MENU 6 → 1  ·  SHIFT MENU → ▼ → 3 → 1:On  ·  nhập cᵢ vào x, nᵢ vào Freq  ·  OPTN → 3
 *
 * Máy KHÔNG tự tính thay học sinh: mỗi bước chỉ nêu phím cần bấm và kết quả mong đợi
 * để học sinh tự đối soát trên máy thật của mình.
 */

export interface CasioKeyStep {
  /** Số thứ tự bước, 1-based, để view đánh số và làm sáng phím. */
  order: number;
  /** Việc học sinh làm ở bước này. */
  instruction: string;
  /** Các phím theo đúng thứ tự bấm; phần tử `[X]` là phím bấm, còn chữ thường là ghi chú. */
  keys: string[];
  /** Kết quả học sinh phải thấy trên màn hình máy sau bước này; null = không có gì để đối soát. */
  expected: string | null;
}

export const CASIO_FX580_STEPS: CasioKeyStep[] = [
  {
    order: 1,
    instruction: 'Vào chế độ thống kê',
    keys: ['MENU', '6', '1'],
    expected: null,
  },
  {
    order: 2,
    instruction: 'Bật cột tần số (nếu máy chưa hiện cột Freq)',
    keys: ['SHIFT', 'MENU', '▼', '3', '1'],
    expected: 'Freq · On',
  },
  {
    order: 3,
    instruction: 'Nhập giá trị đại diện cᵢ vào cột x, tần số nᵢ vào cột Freq (ví dụ xạ thủ An)',
    keys: ['7', '=', '2', '=', '9', '=', '16', '=', '11', '=', '2', '='],
    expected: null,
  },
  {
    order: 4,
    instruction: 'Đọc độ lệch chuẩn quần thể',
    keys: ['OPTN', '3'],
    expected: 'σx = 0,89443…',
  },
];

/**
 * Câu chốt của giáo án gốc, hiện dưới bảng phím để học sinh không ỷ lại máy.
 */
export const CASIO_REMINDER = 'Máy tính là công cụ kiểm tra, tư duy lập bảng của con người mới là gốc rễ.';

/**
 * Chỉ bài Phương sai (12-11-80) mới có hướng dẫn Casio; bài khác trả null.
 * Nhận lessonId (adaptive-1792834706906) hoặc sourceKey (12-11-80) đều được.
 */
export const getCasioGuideForLesson = (
  lessonIdOrSourceKey: string,
): CasioKeyStep[] | null =>
  lessonIdOrSourceKey === 'adaptive-1792834706906' ||
  lessonIdOrSourceKey === '12-11-80'
    ? CASIO_FX580_STEPS
    : null;

/** Nhãn dòng phím để view vẽ: "MENU → 6 → 1". */
export const formatCasioKeys = (step: CasioKeyStep): string => step.keys.join(' → ');
