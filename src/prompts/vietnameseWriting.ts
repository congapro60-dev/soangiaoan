/**
 * Luật biên tập tiếng Việt dùng chung cho mọi đầu ra AI của app.
 *
 * Chỉ giữ những luật KHÔNG đụng vào biểu mẫu. Ba luật sau của bộ gốc đã bị bỏ vì chúng đánh nhau
 * với mẫu giáo án — nhắc lại ở đây để người sau khỏi "sửa" ngược:
 *  - "chỉ viết hoa chữ đầu câu": mẫu giáo án bắt buộc I. THÔNG TIN CHUNG, PHA 1: TRẢI NGHIỆM.
 *  - "mở đầu Kính gửi, kết thúc Trân trọng": giáo án không phải công văn.
 *  - "phân tầng H1 → H2 → nội dung": giáo án đã có cấu trúc I/II/III do mẫu quy định.
 *
 * Hai luật "in đậm tối đa 10%" và "tránh dòng góa phụ/mồ côi" cũng bỏ: mô hình không đếm được tỷ
 * lệ in đậm, còn dòng mồ côi do bộ dựng Word quyết sau khi mô hình đã viết xong.
 */
export const VIETNAMESE_WRITING_RULES = `
===========================================================
QUY TẮC TRÌNH BÀY TIẾNG VIỆT — ÁP CHO MỌI ĐOẠN VĂN XUÔI
===========================================================
- Mỗi đoạn tối đa 5 câu và chỉ nói một ý. Chuyển ý thì xuống dòng, chừa một dòng trống.
- Tiêu đề (kể cả tiêu đề in đậm) phải đứng RIÊNG một dòng. Nội dung bắt đầu từ dòng kế tiếp,
  TUYỆT ĐỐI không viết dính vào sau tiêu đề trên cùng một dòng.
- Không xuống dòng khi câu chưa kết thúc. Chỉ xuống dòng sau dấu chấm, chấm hỏi hoặc chấm than.
- Không đặt khoảng trắng TRƯỚC các dấu . , : ; ! ? và luôn có một khoảng trắng SAU chúng.
  Ngoại lệ giữ nguyên: số thập phân (1,5), giờ (13:52), tỉ số (2:3).
- Không có khoảng trắng ở mặt trong của ngoặc đơn và ngoặc kép: viết (như thế này), "như thế này".
- Liệt kê từ 3 ý trở lên thì dùng gạch đầu dòng, đừng dồn thành một câu dài.
- Gạch đầu dòng đã là ký hiệu rồi: KHÔNG thêm ✓, •, → vào ngay sau dấu gạch.
- In đậm từ khoá, mốc thời gian, thông số cần chú ý. Không in đậm cả câu, không in đậm tràn lan.
- Viết tiếng Việt trọn vẹn. Chỉ giữ nguyên thuật ngữ tiếng Anh khi không có từ tiếng Việt tương
  đương hoặc khi đó là tên riêng.
===========================================================
`;
