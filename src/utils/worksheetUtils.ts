import { LessonPlan, AppData } from '../types';
import { callAI, getActiveApiKey } from '../lib/aiProviders';

export const generateInclassWorksheetMarkdown = async (
  currentPlan: Partial<LessonPlan>,
  data: AppData,
  showToast: (msg: string, type?: any) => void
): Promise<string | null> => {
  if (!currentPlan.content) {
    showToast('Giáo án không có nội dung để tạo phiếu.', 'warning');
    return null;
  }
  
  if (!getActiveApiKey(data.settings)) {
    showToast('Vui lòng cấu hình API Key để sử dụng tính năng này!', 'warning');
    return null;
  }

  showToast('Đang dùng AI tạo Phiếu học tập tại lớp...', 'info');

  try {
    const prompt = `Bạn là chuyên gia sư phạm. Hãy tạo "Phiếu học tập tại lớp" (In-class Worksheet) từ nội dung giáo án sau.

YÊU CẦU CẤU TRÚC:
1. Có phần Mục tiêu bài học (WALT & WILF) để học sinh tự đánh dấu.
2. Quét qua TẤT CẢ các hoạt động (Khởi động, Hình thành kiến thức, Luyện tập, Vận dụng, Tổng kết).
3. Ở các phần lý thuyết (Hình thành kiến thức): Thay vì chép lại nguyên văn, hãy thiết kế thành CÁC CÂU ĐIỀN KHUYẾT (VD: Xác suất có điều kiện ký hiệu là .................) để học sinh vừa nghe giảng vừa điền.
4. CHÚ Ý QUAN TRỌNG NHẤT: BẮT BUỘC Ở PHẦN BÀI TẬP / LUYỆN TẬP / VÍ DỤ: Phải thiết kế dạng Bảng Markdown 2 Cột (Phân hóa Scaffolding) cho TẤT CẢ các bài tập (từ Cơ bản đến Vận dụng).
   - Cột 1 (LỰA CHỌN A): Có các gợi ý từng bước (VD: Gọi B là... P(B) = .......) và chừa chỗ chấm ............. thật dài để học sinh điền số vào.
   - Cột 2 (LỰA CHỌN B): Bỏ trống hoàn toàn để học sinh khá giỏi tự giải.
   - Phải tạo đủ chỗ trống (bằng các dòng chấm: .......................................) ở cả 2 cột.
5. Cuối phiếu phải có "Vé ra cửa" (Exit Ticket) - dặn dò, tự đánh giá.
6. Cung cấp ĐÁP ÁN CHI TIẾT TỪNG CÂU ở cuối cùng (sau đường kẻ ngang ---) để giáo viên đối chiếu.

NỘI DUNG GIÁO ÁN GỐC:
---
${currentPlan.content}
---`;

    const result = await callAI(prompt, data.settings);
    if (!result) throw new Error('AI trả về kết quả rỗng');
    return result;
  } catch (error: any) {
    console.error('Lỗi tạo Phiếu tại lớp:', error);
    showToast(`Lỗi khi tạo Phiếu: ${error.message}`, 'error');
    return null;
  }
};

export const generateHomeworkWorksheetMarkdown = async (
  currentPlan: Partial<LessonPlan>,
  data: AppData,
  showToast: (msg: string, type?: any) => void
): Promise<string | null> => {
  if (!currentPlan.content) {
    showToast('Giáo án không có nội dung để tạo phiếu.', 'warning');
    return null;
  }
  
  if (!getActiveApiKey(data.settings)) {
    showToast('Vui lòng cấu hình API Key để sử dụng tính năng này!', 'warning');
    return null;
  }

  showToast('Đang dùng AI tạo Bài tập về nhà chuẩn 2025...', 'info');

  try {
    const prompt = `Bạn là chuyên gia sư phạm. Hãy tạo "Phiếu Bài tập về nhà" từ nội dung giáo án sau.

YÊU CẦU CẤU TRÚC:
PHẦN 1: HỆ THỐNG KIẾN THỨC
1. Tóm tắt kiến thức trọng tâm.
2. Cảnh báo các lỗi sai hay mắc phải.
3. Các câu hỏi thường gặp (FAQ) hoặc điểm cần chú ý.

PHẦN 2: BÀI TẬP THỰC HÀNH (Đúng chuẩn Bộ GD&ĐT 2025)
- Nếu giáo án gốc không đủ bài tập, AI phải TỰ ĐỘNG SINH THÊM bài tập cùng dạng.
1. Câu hỏi Trắc nghiệm nhiều lựa chọn (khoảng 4-6 câu).
2. Câu hỏi Đúng / Sai (Mỗi câu có 4 ý a,b,c,d) (1-2 câu).
3. Câu Trả lời ngắn (Chỉ điền đáp số) (1-2 câu).
4. Câu Tự luận (Đòi hỏi trình bày rõ ràng, ví dụ bài toán thực tế) (1-2 câu).

PHẦN 3: ĐÁP ÁN CHI TIẾT
- Giải thích chi tiết cho tất cả các câu ở Phần 2.

NỘI DUNG GIÁO ÁN GỐC:
---
${currentPlan.content}
---`;

    const result = await callAI(prompt, data.settings);
    if (!result) throw new Error('AI trả về kết quả rỗng');
    return result;
  } catch (error: any) {
    console.error('Lỗi tạo Bài tập về nhà:', error);
    showToast(`Lỗi khi tạo Phiếu: ${error.message}`, 'error');
    return null;
  }
};
