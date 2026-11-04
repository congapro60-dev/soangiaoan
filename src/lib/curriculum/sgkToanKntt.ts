/**
 * Cấu trúc SGK Toán 10–12 bộ Kết nối tri thức: tập nào, chương nào, gồm những bài nào — để báo cáo gom "bài" lên
 * "chương" và "tập" như phụ huynh cầm sách đối chiếu. Chỉ có số bài, số chương và tên chương để tra; KHÔNG chép chữ của sách.
 * `kind` là mạch nội dung của chương (Đại số, Giải tích, Hình học, Thống kê, Xác suất): Chương trình GDPT 2018 gộp
 * Thống kê với Xác suất thành một mạch, nhưng phụ huynh hỏi hai thứ riêng nên báo cáo tách theo chương.
 * Module thuần, không import gì — máy chủ (api/) dùng được.
 */

export type SgkStrand = 'Đại số' | 'Giải tích' | 'Hình học' | 'Thống kê' | 'Xác suất';

export interface SgkChapter {
  tap: 1 | 2;
  /** Số chương dạng La Mã: "IV". */
  code: string;
  name: string;
  strand: SgkStrand;
  /** Bài đầu và bài cuối của chương (gồm cả hai đầu). */
  from: number;
  to: number;
}

const c = (tap: 1 | 2, code: string, name: string, strand: SgkStrand, from: number, to: number): SgkChapter => ({ tap, code, name, strand, from, to });

const SGK_CHAPTERS: Record<10 | 11 | 12, readonly SgkChapter[]> = {
  10: [
    c(1, 'I', 'Mệnh đề và tập hợp', 'Đại số', 1, 2),
    c(1, 'II', 'Bất phương trình và hệ bất phương trình bậc nhất hai ẩn', 'Đại số', 3, 4),
    c(1, 'III', 'Hệ thức lượng trong tam giác', 'Hình học', 5, 6),
    c(1, 'IV', 'Vectơ', 'Hình học', 7, 11),
    c(1, 'V', 'Các số đặc trưng của mẫu số liệu không ghép nhóm', 'Thống kê', 12, 14),
    c(2, 'VI', 'Hàm số, đồ thị và ứng dụng', 'Đại số', 15, 18),
    c(2, 'VII', 'Phương pháp toạ độ trong mặt phẳng', 'Hình học', 19, 22),
    c(2, 'VIII', 'Đại số tổ hợp', 'Đại số', 23, 25),
    c(2, 'IX', 'Tính xác suất theo định nghĩa cổ điển', 'Xác suất', 26, 27),
  ],
  11: [
    c(1, 'I', 'Hàm số lượng giác và phương trình lượng giác', 'Đại số', 1, 4),
    c(1, 'II', 'Dãy số. Cấp số cộng và cấp số nhân', 'Đại số', 5, 7),
    c(1, 'III', 'Các số đặc trưng đo xu thế trung tâm của mẫu số liệu ghép nhóm', 'Thống kê', 8, 9),
    c(1, 'IV', 'Quan hệ song song trong không gian', 'Hình học', 10, 14),
    c(2, 'V', 'Giới hạn. Hàm số liên tục', 'Giải tích', 15, 17),
    c(2, 'VI', 'Hàm số mũ và hàm số lôgarit', 'Giải tích', 18, 21),
    c(2, 'VII', 'Quan hệ vuông góc trong không gian', 'Hình học', 22, 27),
    c(2, 'VIII', 'Các quy tắc tính xác suất', 'Xác suất', 28, 30),
    c(2, 'IX', 'Đạo hàm', 'Giải tích', 31, 33),
  ],
  12: [
    c(1, 'I', 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số', 'Giải tích', 1, 5),
    c(1, 'II', 'Vectơ và hệ trục toạ độ trong không gian', 'Hình học', 6, 8),
    c(1, 'III', 'Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm', 'Thống kê', 9, 10),
    c(2, 'IV', 'Nguyên hàm. Tích phân', 'Giải tích', 11, 13),
    c(2, 'V', 'Phương pháp toạ độ trong không gian', 'Hình học', 14, 17),
    c(2, 'VI', 'Xác suất có điều kiện', 'Xác suất', 18, 19),
  ],
};

/** Thứ tự các mạch khi liệt kê tổng quát. */
export const SGK_STRAND_ORDER: readonly SgkStrand[] = ['Đại số', 'Giải tích', 'Hình học', 'Thống kê', 'Xác suất'];

/**
 * Chương chứa nhãn bài của YCCĐ ("Bài 3–4", "Bài 15", "Chương V"). Không tra được (lớp lạ, nhãn lạ) → null.
 * Bài gộp lấy theo bài đầu: các bài gộp của Chương trình luôn nằm trọn trong một chương.
 */
export const sgkChapterOf = (grade: number, sgk: string): SgkChapter | null => {
  const chapters = SGK_CHAPTERS[grade as 10 | 11 | 12];
  if (!chapters) return null;
  const roman = sgk.match(/Chương\s+([IVX]+)/i)?.[1]?.toUpperCase();
  if (roman) return chapters.find(chapter => chapter.code === roman) ?? null;
  const number = sgk.match(/\d+/);
  if (!number) return null;
  const lesson = Number(number[0]);
  return chapters.find(chapter => lesson >= chapter.from && lesson <= chapter.to) ?? null;
};
