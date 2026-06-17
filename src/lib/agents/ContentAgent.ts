import { AgentContext, PlanningResult, ContentResult } from './types';
import { callAIStream } from '../aiProviders';

export const executeContentAgent = async (
  context: AgentContext, 
  plan: PlanningResult
): Promise<ContentResult> => {
  const prompt = `
BẠN LÀ CHUYÊN GIA SƯ PHẠM VÀ NGƯỜI VIẾT NỘI DUNG GIÁO ÁN CHI TIẾT.
NHIỆM VỤ: Dựa trên dàn ý và mục tiêu đã được phê duyệt, hãy viết chi tiết toàn bộ nội dung giáo án (các hoạt động, hội thoại GV-HS, bài tập). 
LƯU Ý: Tập trung vào CHIỀU SÂU chuyên môn, SỰ LIÊN KẾT logic giữa các phần, SỰ CHI TIẾT trong hội thoại/bài tập VÀ PHẢI TUÂN THỦ NGHIÊM NGẶT ĐỊNH DẠNG.

THÔNG TIN BÀI HỌC:
- Môn học: ${context.subject}. Lớp: ${context.grade}.
- Tiêu đề: ${context.title}.

DÀN Ý VÀ MỤC TIÊU (TỪ PLANNING AGENT):
<objectives>
${plan.objectives}
</objectives>
<outline>
${plan.outline}
</outline>

YÊU CẦU:
- Đảm bảo đầy đủ nội dung bài học.
- Đặt nội dung giáo án bên trong thẻ <lesson_content> ... </lesson_content>.

YÊU CẦU ĐỊNH DẠNG / BỔ SUNG TỪ TEMPLATE:
${context.templateContext}
${context.additionalRequirements}

YÊU CẦU ĐỊNH DẠNG — PHẢI TUÂN THỦ TUYỆT ĐỐI TỪ ĐẦU ĐẾN CUỐI:
Mỗi hoạt động sư phạm BẮT BUỘC dùng bảng Markdown 3 cột:
| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng |
|---|---|---|
| [nội dung] | [nội dung] | [nội dung] |

Ví dụ hàng bảng ĐÚNG:
| GV nêu vấn đề: "Tại sao xác suất có điều kiện lại quan trọng?" | HS suy nghĩ cá nhân 1 phút, ghi ra nháp ý kiến ban đầu. | **Câu hỏi khởi động:** Xác suất có điều kiện là gì? |

TUYỆT ĐỐI KHÔNG:
- Bỏ cột, gộp cột, hoặc dùng format khác cho hoạt động sư phạm
- Chuyển sang bullet/prose ở giữa chừng
- Để ô bảng trống không có nội dung
  `;

  let fullResult = '';
  // Stream directly to the user so they see the content generating
  await callAIStream(prompt, context.settings, (chunk) => {
    fullResult += chunk;
    if (context.onStreamChunk) {
      // Extract what we have so far
      const match = fullResult.match(/<lesson_content>([\s\S]*?)(?:<\/lesson_content>|$)/i);
      if (match) {
        context.onStreamChunk(match[1]);
      } else {
        context.onStreamChunk(fullResult);
      }
    }
  });

  const draftMatch = fullResult.match(/<lesson_content>([\s\S]*?)<\/lesson_content>/i);
  
  return {
    rawContent: draftMatch ? draftMatch[1].trim() : fullResult
  };
};
