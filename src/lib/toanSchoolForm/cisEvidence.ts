/**
 * MÀU MINH CHỨNG CIS / HQT — chốt tại họp Tổ trưởng chuyên môn 20/08/2026.
 *
 * Vì sao có file này: biên bản quy định "minh chứng mã màu bắt buộc" cho bốn thực hành
 * sư phạm. Nhưng tô màu chỉ nhãn là chưa đủ — người dự giờ cần nhìn thấy NGAY trong tiến
 * trình câu nào là minh chứng. Vì vậy quy ước: cả câu minh chứng mang màu, phần Toán còn
 * lại giữ chữ đen.
 *
 * BA RÀNG BUỘC không được bỏ:
 * 1. Luôn giữ NHÃN BẰNG CHỮ (không chỉ emoji, không chỉ màu) để bản in đen trắng vẫn đọc được.
 * 2. Chỉ tô đúng câu/cụm câu chứa minh chứng, KHÔNG tô cả hoạt động dài nhiều dòng.
 * 3. Một câu chỉ mang MỘT màu. Nếu vừa là phân hóa vừa là đánh giá thường xuyên thì tách
 *    thành hai câu riêng, không chồng hai màu lên cùng một đoạn.
 */

/** Mã màu hex (không có dấu #) — dùng chung cho cả đường xuất .docx và HTML→PDF. */
export const CIS_COLORS = {
  phanHoa: 'C00000', // Đỏ    — Differentiation / Dạy học phân hóa
  dgtx: '7030A0', // Tím    — Formative Assessment / Đánh giá thường xuyên
  congDanSo: '0070C0', // Xanh dương — Digital Citizenship / Công dân số
  congDanToanCau: '00B050', // Xanh lá — Global Citizenship / Công dân toàn cầu
} as const;

export type CisColor = (typeof CIS_COLORS)[keyof typeof CIS_COLORS];

/**
 * Nhãn nhận diện đặt ở ĐẦU câu minh chứng. Emoji là tùy chọn, chữ là bắt buộc —
 * regex vì thế cho phép emoji vắng mặt.
 */
const LABEL_RULES: ReadonlyArray<{ re: RegExp; color: CisColor }> = [
  { re: /^\s*\[\s*(?:🔴\s*)?PHÂN\s*HÓA\s*\]/iu, color: CIS_COLORS.phanHoa },
  { re: /^\s*\[\s*(?:🟣\s*)?(?:ĐGTX|ĐÁNH\s*GIÁ\s*THƯỜNG\s*XUYÊN)\s*\]/iu, color: CIS_COLORS.dgtx },
  { re: /^\s*\[\s*(?:🔵\s*)?CÔNG\s*DÂN\s*SỐ\s*\]/iu, color: CIS_COLORS.congDanSo },
  { re: /^\s*\[\s*(?:🟢\s*)?CÔNG\s*DÂN\s*TOÀN\s*CẦU\s*\]/iu, color: CIS_COLORS.congDanToanCau },
];

/**
 * Trả về màu nếu dòng mở đầu bằng một nhãn minh chứng CIS, ngược lại trả undefined.
 * Chỉ xét ĐẦU dòng: một nhãn nằm giữa câu là trích dẫn, không phải minh chứng.
 */
export const detectCisColor = (line: string): CisColor | undefined =>
  LABEL_RULES.find((r) => r.re.test(line))?.color;

/** Có phải dòng minh chứng CIS không — dùng cho các phép kiểm chất lượng. */
export const isCisEvidenceLine = (line: string): boolean => detectCisColor(line) !== undefined;
