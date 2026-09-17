/**
 * Khung năng lực Toán THPT (Lớp 10/11/12) — trích từ template của trường
 * "Mẫu hồ sơ học sinh Toán THPT Discover 26-27" (tab "Năng lực toán học").
 *
 * App CHỈ giữ CẤU TRÚC (khối → mảng → chủ đề → năng lực + `id` ổn định) để:
 *   - gắn nhãn mỗi bài BTVN vào một năng lực (AI đoán, giáo viên duyệt), và
 *   - tổng hợp bằng chứng → đề xuất MỨC (Xuất sắc / Tốt / Đạt / Chưa đạt) cho từng năng lực.
 *
 * Bốn mức MÔ TẢ (cột Xuất sắc/Tốt/Đạt/Chưa đạt trong template) KHÔNG lưu ở đây: chúng nằm sẵn
 * trong file hồ sơ của trường. Khi xuất, app chỉ điền MỨC vào rubric có sẵn, không chép lại mô tả.
 *
 * `id` là KHOÁ ỔN ĐỊNH — đã gắn cho bài/hồ sơ thì KHÔNG được đổi. Thêm năng lực mới thì thêm id mới.
 */

export type CompetencyGrade = 10 | 11 | 12;

/** Mức đạt của một năng lực, khớp đúng chuỗi cột trong template. */
export const COMPETENCY_LEVELS = ['Xuất sắc', 'Tốt', 'Đạt yêu cầu', 'Chưa đạt yêu cầu'] as const;
export type CompetencyLevel = (typeof COMPETENCY_LEVELS)[number];

export interface Competency {
  /** Khoá ổn định (không đổi khi đã dùng). */
  id: string;
  grade: CompetencyGrade;
  /** Mảng nội dung, khớp tên nhóm trong template (vd "Đại số", "Hình học không gian"). */
  area: string;
  /** Chủ đề — cột "Nội dung" trong template. */
  topic: string;
  /** Năng lực cần đạt — cột "Năng lực cần đạt" trong template. */
  competency: string;
}

export const MATH_COMPETENCIES: readonly Competency[] = [
  // ── Lớp 10 ────────────────────────────────────────────────────────────────
  { id: 'g10-tap-hop-va-menh-de', grade: 10, area: 'Đại số', topic: 'Tập hợp và mệnh đề', competency: 'Thiết lập và phát biểu các mệnh đề toán học, mệnh đề phủ định, mệnh đề đảo, điều kiện cần và đủ' },
  { id: 'g10-phep-toan-tren-tap-hop', grade: 10, area: 'Đại số', topic: 'Phép toán trên tập hợp', competency: 'Thực hiện phép toán trên các tập hợp và biểu diễn bằng biểu đồ Ven' },
  { id: 'g10-bpt-bac-nhat-hai-an', grade: 10, area: 'Đại số', topic: 'Bất phương trình bậc nhất hai ẩn', competency: 'Giải và biểu diễn miền nghiệm trên mặt phẳng tọa độ' },
  { id: 'g10-ham-so-bac-hai', grade: 10, area: 'Đại số', topic: 'Hàm số bậc hai', competency: 'Vẽ đồ thị hàm bậc hai và giải quyết bài toán thực tiễn' },
  { id: 'g10-he-thuc-luong-tam-giac', grade: 10, area: 'Hình học', topic: 'Hệ thức lượng trong tam giác', competency: 'Áp dụng định lý sin, cos để giải tam giác' },
  { id: 'g10-vecto-va-phep-toan', grade: 10, area: 'Hình học', topic: 'Vectơ và các phép toán', competency: 'Thực hiện phép toán vectơ và giải quyết bài toán thực tiễn' },
  { id: 'g10-so-gan-dung-sai-so', grade: 10, area: 'Thống kê - Xác suất', topic: 'Số gần đúng và sai số', competency: 'Tính toán và giải thích sai số' },
  { id: 'g10-xac-suat-co-dien', grade: 10, area: 'Thống kê - Xác suất', topic: 'Xác suất cổ điển', competency: 'Tính xác suất các biến cố đơn giản' },

  // ── Lớp 11 ────────────────────────────────────────────────────────────────
  { id: 'g11-ham-va-pt-luong-giac', grade: 11, area: 'Đại số và Giải tích', topic: 'Hàm số lượng giác và phương trình lượng giác', competency: 'Nhận biết các khái niệm về hàm lượng giác, đồ thị, phương trình lượng giác cơ bản' },
  { id: 'g11-day-so-cap-so', grade: 11, area: 'Đại số và Giải tích', topic: 'Dãy số, cấp số cộng, cấp số nhân', competency: 'Tính toán số hạng tổng quát và tổng của cấp số cộng, cấp số nhân' },
  { id: 'g11-gioi-han', grade: 11, area: 'Đại số và Giải tích', topic: 'Giới hạn của dãy số và hàm số', competency: 'Tính giới hạn của dãy số và hàm số' },
  { id: 'g11-ham-mu-va-logarit', grade: 11, area: 'Đại số và Giải tích', topic: 'Hàm số mũ và lôgarit', competency: 'Giải phương trình, bất phương trình mũ và lôgarit' },
  { id: 'g11-dao-ham', grade: 11, area: 'Đại số và Giải tích', topic: 'Đạo hàm', competency: 'Tính đạo hàm và áp dụng trong giải bài toán thực tiễn' },
  { id: 'g11-duong-thang-mat-phang-kg', grade: 11, area: 'Hình học', topic: 'Đường thẳng và mặt phẳng trong không gian', competency: 'Nhận biết các quan hệ giữa đường thẳng và mặt phẳng' },
  { id: 'g11-quan-he-song-song', grade: 11, area: 'Hình học', topic: 'Quan hệ song song trong không gian', competency: 'Nhận biết và áp dụng các tính chất của quan hệ song song' },
  { id: 'g11-quan-he-vuong-goc', grade: 11, area: 'Hình học', topic: 'Quan hệ vuông góc trong không gian', competency: 'Nhận biết và áp dụng các tính chất của quan hệ vuông góc' },
  { id: 'g11-phan-tich-du-lieu', grade: 11, area: 'Thống kê và Xác suất', topic: 'Phân tích và xử lý dữ liệu', competency: 'Tính các số đặc trưng đo xu thế trung tâm cho mẫu số liệu ghép nhóm' },
  { id: 'g11-xac-suat-co-dien-quy-tac', grade: 11, area: 'Thống kê và Xác suất', topic: 'Xác suất cổ điển và các quy tắc tính xác suất', competency: 'Tính xác suất của các biến cố đơn giản' },

  // ── Lớp 12 ────────────────────────────────────────────────────────────────
  { id: 'g12-khao-sat-ham-so', grade: 12, area: 'Giải tích', topic: 'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số', competency: 'Khảo sát hàm số và vẽ đồ thị, nhận biết tính đơn điệu, cực trị, giá trị lớn nhất, nhỏ nhất' },
  { id: 'g12-nguyen-ham-tich-phan', grade: 12, area: 'Giải tích', topic: 'Nguyên hàm và tích phân', competency: 'Nhận biết nguyên hàm và tích phân, tính toán diện tích và thể tích từ tích phân' },
  { id: 'g12-ung-dung-tich-phan', grade: 12, area: 'Giải tích', topic: 'Ứng dụng tích phân', competency: 'Vận dụng tích phân để giải quyết các bài toán thực tiễn' },
  { id: 'g12-ham-mu-va-logarit', grade: 12, area: 'Giải tích', topic: 'Hàm số mũ và lôgarit', competency: 'Giải phương trình, bất phương trình mũ và lôgarit' },
  { id: 'g12-dao-ham', grade: 12, area: 'Giải tích', topic: 'Đạo hàm', competency: 'Tính đạo hàm và áp dụng trong giải bài toán thực tiễn' },
  { id: 'g12-toa-do-khong-gian', grade: 12, area: 'Hình học không gian', topic: 'Phương pháp tọa độ trong không gian', competency: 'Tính toán tọa độ của vectơ' },
  { id: 'g12-pt-mat-phang', grade: 12, area: 'Hình học không gian', topic: 'Phương trình mặt phẳng', competency: 'Thiết lập phương trình mặt phẳng trong không gian' },
  { id: 'g12-pt-duong-thang', grade: 12, area: 'Hình học không gian', topic: 'Phương trình đường thẳng', competency: 'Thiết lập phương trình đường thẳng trong không gian' },
  { id: 'g12-pt-mat-cau', grade: 12, area: 'Hình học không gian', topic: 'Phương trình mặt cầu', competency: 'Thiết lập và giải bài toán về phương trình mặt cầu' },
  { id: 'g12-phan-tich-du-lieu', grade: 12, area: 'Thống kê và Xác suất', topic: 'Phân tích và xử lý dữ liệu', competency: 'Tính các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm' },
  { id: 'g12-xac-suat-dieu-kien-bayes', grade: 12, area: 'Thống kê và Xác suất', topic: 'Xác suất có điều kiện và công thức Bayes', competency: 'Tính xác suất có điều kiện và vận dụng công thức Bayes' },
];

const BY_ID = new Map<string, Competency>(MATH_COMPETENCIES.map(item => [item.id, item]));

/** Trả năng lực theo id, hoặc undefined nếu id lạ (vd khung đã đổi). */
export const competencyById = (id: string): Competency | undefined => BY_ID.get(id);

/** Các năng lực của một khối, giữ nguyên thứ tự trong template. */
export const competenciesByGrade = (grade: CompetencyGrade): Competency[] =>
  MATH_COMPETENCIES.filter(item => item.grade === grade);

/**
 * Nhãn năng lực AI gợi ý cho MỘT bài BTVN. `confidence` để giáo viên biết chỗ nào nên soát kỹ;
 * `reason` là căn cứ ngắn (bài rơi vào chủ đề nào). Giáo viên duyệt/sửa trước khi tính vào hồ sơ.
 */
export interface CompetencyTag {
  competencyId: string;
  /** Độ chắc 0..1 do AI tự đánh giá. */
  confidence: number;
  /** Vì sao gắn — một câu ngắn. */
  reason: string;
}

/** Ép khối lớp (số hoặc chuỗi "10"/"Lớp 11"...) về 10/11/12, hoặc null nếu không nhận ra. */
export const asCompetencyGrade = (value: unknown): CompetencyGrade | null => {
  const n = Number(String(value ?? '').match(/\d+/)?.[0]);
  return n === 10 || n === 11 || n === 12 ? n : null;
};

/** Tập id hợp lệ của một khối — để loại nhãn AI bịa id ngoài khung. */
export const competencyIdSet = (grade: CompetencyGrade): Set<string> =>
  new Set(competenciesByGrade(grade).map(item => item.id));

/** Danh sách năng lực của khối, định dạng cho prompt: mỗi dòng "id | mảng > chủ đề: năng lực". */
export const competencyOptionsForPrompt = (grade: CompetencyGrade): string =>
  competenciesByGrade(grade)
    .map(item => `- ${item.id} | ${item.area} > ${item.topic}: ${item.competency}`)
    .join('\n');
