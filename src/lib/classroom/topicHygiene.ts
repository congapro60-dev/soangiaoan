/**
 * Một "chủ đề" trong hồ sơ học tập phải là KIẾN THỨC/NĂNG LỰC chung (vd "Phép toán vectơ"),
 * không phải tham chiếu SỐ BÀI/CÂU cụ thể (vd "Bài 2", "Câu hỏi 4", "BT2", "2a", "ý a").
 *
 * Dùng ở hai tầng:
 *  - **Gốc:** chặn tên kiểu này KHÔNG trở thành chủ đề khi gộp hồ sơ (`profileMerge`).
 *  - **Hiển thị:** lọc nốt dữ liệu hồ sơ cũ đã lỡ lưu tên xấu khi dựng bản phụ huynh.
 *
 * Vì sao khớp bằng regex chứ không nhờ AI: đây là bất biến an toàn (không được để lọt số bài
 * ra bản phụ huynh), phải cưỡng chế bằng code chạy được và test được, không phụ thuộc một lượt gọi.
 */

// Ký tự "trong một từ" gồm cả chữ tiếng Việt có dấu — để bắt ĐÚNG ranh giới từ khoá.
const VIET_WORD = 'a-zà-ỹ';

/** Ngay trước từ khoá phải là đầu chuỗi hoặc một ký tự KHÔNG thuộc chữ (tránh khớp giữa từ khác). */
const BOUNDARY = `(?:^|[^${VIET_WORD}])`;

const PATTERNS: RegExp[] = [
  // "Bài 2", "Câu 3", "BT2", "Bài số 2", "Câu hỏi 4", "phần 2", "ý 1", "mục 3", "đề 2"
  new RegExp(`${BOUNDARY}(?:bài|câu|bt|phần|mục|ý|đề)\\s*(?:tập|số|hỏi)?\\s*\\d`, 'u'),
  // "ý a", "câu b", "bài c" (ý/câu con bằng chữ cái)
  new RegExp(`${BOUNDARY}(?:bài|câu|ý|phần|mục)\\s+[a-z](?![${VIET_WORD}])`, 'u'),
  // "2a", "4b" (số ngắn dính chữ cái — nhãn ý con)
  new RegExp(`${BOUNDARY}\\d{1,2}[a-z](?![${VIET_WORD}])`, 'u'),
];

/** true nếu tên chủ đề chỉ là tham chiếu số bài/câu cụ thể — không được dùng làm chủ đề. */
export const namesSpecificProblem = (topic: string): boolean => {
  const text = String(topic || '').toLowerCase();
  if (!text) return false;
  return PATTERNS.some(pattern => pattern.test(text));
};
