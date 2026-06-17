import { AgentContext, PlanningResult, ContentResult } from './types';
import { callAIStream } from '../aiProviders';

export const executeContentAgent = async (
  context: AgentContext,
  plan: PlanningResult
): Promise<ContentResult> => {
  const prompt = `
BẠN LÀ CHUYÊN GIA SƯ PHẠM VÀ NGƯỜI VIẾT NỘI DUNG GIÁO ÁN CHI TIẾT.
NHIỆM VỤ: Dựa trên dàn ý và mục tiêu đã được phê duyệt, hãy viết chi tiết toàn bộ nội dung giáo án (các hoạt động, hội thoại GV-HS, bài tập).
LƯU Ý: Không cần quá quan tâm đến format hoàn hảo ở bước này, hãy tập trung vào CHIỀU SÂU chuyên môn, SỰ LIÊN KẾT logic giữa các phần, và SỰ CHI TIẾT trong hội thoại/bài tập.

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
- Đặt nội dung giáo án bên trong thẻ <draft_content> ... </draft_content>.

YÊU CẦU ĐỊNH DẠNG / BỔ SUNG TỪ TEMPLATE:
${context.templateContext}
${context.additionalRequirements}
  `;

  let fullResult = '';
  // Stream directly to the user so they see the content generating
  await callAIStream(prompt, context.settings, (chunk) => {
    fullResult += chunk;
    if (context.onStreamChunk) {
      // Extract what we have so far
      const match = fullResult.match(/<draft_content>([\s\S]*?)(?:<\/draft_content>|$)/i);
      if (match) {
        context.onStreamChunk(match[1]);
      } else {
        context.onStreamChunk(fullResult);
      }
    }
  });

  const draftMatch = fullResult.match(/<draft_content>([\s\S]*?)<\/draft_content>/i);

  return {
    rawContent: draftMatch ? draftMatch[1].trim() : fullResult
  };
};
