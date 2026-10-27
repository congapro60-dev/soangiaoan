/**
 * Batch 2 Tuần 11 — 7 bài còn lại (mỗi vòng Gate C thêm đúng 1 entry, theo bảng
 * sổ tay trong plan batch2). Mảng này là nguồn chung cho các test đếm số:
 * tổng gói merged = 51 (pin MAIN) + W11BATCH2.length.
 *
 * Đặt ở file thường thay vì export từ file .test.ts để nhiều file test cùng import
 * mà không đăng ký kép test trong vitest.
 */
export interface W11Batch2Entry {
  key: string;
  grade: number;
  period: number;
  /** Title trong spec — không kèm "— Tiết N". */
  title: string;
}

export const W11BATCH2: ReadonlyArray<W11Batch2Entry> = [
  { key: '10-11-80', grade: 10, period: 80, title: 'Các số đặc trưng đo xu thế trung tâm' },
  { key: '11-11-76', grade: 11, period: 76, title: 'Các số đặc trưng đo xu thế trung tâm' },
  { key: '11-11-78', grade: 11, period: 78, title: 'Hai mặt phẳng song song' },
];
