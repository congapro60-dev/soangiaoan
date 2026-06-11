import { LessonPlan, AppData } from '../types';
import { callAI, getActiveApiKey } from '../lib/aiProviders';

/**
 * Trích xuất các bài tập, câu hỏi từ giáo án Markdown và tạo cấu trúc
 * "Phiếu học tập" (Student Worksheet) dạng bản in với các đường kẻ/vùng trống.
 */
export const generateWorksheetMarkdown = async (
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

  showToast('Đang dùng AI trích xuất câu hỏi và tạo Phiếu học tập...', 'info');

  try {
    const prompt = `Bạn là chuyên gia sư phạm. Hãy tạo một "Phiếu học tập" (Student Worksheet) bản in từ nội dung giáo án sau.
    
YÊU CẦU:
1. Lược bỏ hoàn toàn các phần dành riêng cho giáo viên (như Mục tiêu, Phương pháp, Hoạt động của GV).
2. Chỉ giữ lại phần Kiến thức trọng tâm tóm tắt (nếu có), Bài tập, Câu hỏi thảo luận hoặc Trắc nghiệm.
3. Với mỗi câu hỏi tự luận, hãy tạo các dòng kẻ đứt (VD: _______________________) để học sinh có không gian viết tay.
4. Với câu trắc nghiệm, hiển thị các đáp án dạng A, B, C, D rõ ràng để học sinh khoanh tròn.
5. Tuyệt đối KHÔNG bao gồm Đáp án trong phiếu học tập này.
6. Trả về đúng định dạng Markdown, có tiêu đề chính là tên bài học kèm chữ " - PHIẾU HỌC TẬP".

NỘI DUNG GIÁO ÁN GỐC:
---
${currentPlan.content}
---`;

    const result = await callAI(prompt, data.settings);
    
    if (!result) {
      throw new Error('AI trả về kết quả rỗng');
    }
    
    return result;
  } catch (error: any) {
    console.error('Lỗi tạo Phiếu học tập:', error);
    showToast(`Lỗi khi tạo Phiếu học tập: ${error.message}`, 'error');
    return null;
  }
};
