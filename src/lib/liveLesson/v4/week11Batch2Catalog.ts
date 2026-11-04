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
  { key: '11-11-79', grade: 11, period: 79, title: 'Hai mặt phẳng song song' },
  { key: '12-11-77', grade: 12, period: 77, title: 'Nguyên hàm' },
  { key: '12-11-78', grade: 12, period: 78, title: 'Khoảng biến thiên và khoảng tứ phân vị' },
  { key: '12-11-79', grade: 12, period: 79, title: 'Các số đặc trưng đo mức độ phân tán' },
  { key: '10-12-88', grade: 10, period: 88, title: 'Các số đặc trưng đo xu thế trung tâm' },
  { key: '11-12-82', grade: 11, period: 82, title: 'Các số đặc trưng đo xu thế trung tâm' },
  { key: '12-12-82', grade: 12, period: 82, title: 'Tính chất cơ bản của nguyên hàm' },
  { key: '12-12-83', grade: 12, period: 83, title: 'Nguyên hàm' },
  { key: '12-12-84', grade: 12, period: 84, title: 'Nguyên hàm' },
  { key: '12-12-85', grade: 12, period: 85, title: 'Nguyên hàm' },
  { key: '12-12-86', grade: 12, period: 86, title: 'Sử dụng phương sai, độ lệch chuẩn đo độ rủi ro' },
  { key: '12-12-87', grade: 12, period: 87, title: 'Luyện tập phương sai và độ lệch chuẩn' },
  { key: '10-12-89', grade: 10, period: 89, title: 'Luyện tập các số đặc trưng đo xu thế trung tâm' },
  { key: '10-12-90', grade: 10, period: 90, title: 'Các số đặc trưng đo mức độ phân tán' },
  { key: '10-12-91', grade: 10, period: 91, title: 'Ôn tập chương V' },
  { key: '10-12-92', grade: 10, period: 92, title: 'Tổng và hiệu của hai vectơ' },
  { key: '10-12-93', grade: 10, period: 93, title: 'Tích của một vectơ với một số' },
  { key: '11-12-83', grade: 11, period: 83, title: 'Luyện tập các số đặc trưng đo xu thế trung tâm' },
  { key: '11-12-84', grade: 11, period: 84, title: 'Giới hạn của dãy số' },
  { key: '11-12-85', grade: 11, period: 85, title: 'Quy tắc tính giới hạn và CSN lùi vô hạn' },
  { key: '11-12-86', grade: 11, period: 86, title: 'Hình lăng trụ và hình hộp' },
  { key: '11-12-87', grade: 11, period: 87, title: 'Luyện tập hai mặt phẳng song song' },
];
