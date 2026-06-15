import { AgentContext, PlanningResult } from './types';
import { callAI } from '../aiProviders';

export const executePlanningAgent = async (context: AgentContext): Promise<PlanningResult> => {
  const prompt = `
BẠN LÀ MỘT CHUYÊN GIA LÊN DÀN Ý GIÁO ÁN VÀ THIẾT KẾ MỤC TIÊU HỌC TẬP.
NHIỆM VỤ: Dựa trên yêu cầu của giáo viên, hãy thiết kế một dàn ý sơ bộ và các mục tiêu học tập chính cho bài học. Không viết chi tiết toàn bộ giáo án, chỉ liệt kê cấu trúc và mục tiêu.

THÔNG TIN BÀI HỌC:
- Môn học: ${context.subject}. Lớp: ${context.grade}. Tuần: ${context.week}.
- Tiêu đề: ${context.title}.
- Yêu cầu bổ sung: ${context.requirement}

<reference_context>
${context.referenceContext}
</reference_context>

BỐ CỤC PHẢN HỒI (CHỈ TRẢ VỀ DỮ LIỆU NÀY):
<objectives>
(Liệt kê các mục tiêu Kiến thức, Năng lực, Phẩm chất và mục tiêu phân hóa nếu có)
</objectives>
<outline>
(Liệt kê các hoạt động chính, thời gian dự kiến cho mỗi hoạt động, và ý tưởng trọng tâm của hoạt động đó)
</outline>
  `;

  // Planning Agent doesn't stream to the user, it just runs quickly in the background
  const result = await callAI(prompt, context.settings);
  
  const outlineMatch = result.match(/<outline>([\s\S]*?)<\/outline>/i);
  const objectivesMatch = result.match(/<objectives>([\s\S]*?)<\/objectives>/i);

  return {
    outline: outlineMatch ? outlineMatch[1].trim() : result,
    objectives: objectivesMatch ? objectivesMatch[1].trim() : ''
  };
};
