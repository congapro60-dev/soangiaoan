import { AgentContext } from './types';
import { executePlanningAgent } from './PlanningAgent';
import { executeContentAgent } from './ContentAgent';
import { executeFormatAgent } from './FormatAgent';

export const runMultiAgentPipeline = async (context: AgentContext): Promise<string> => {
  try {
    // 1. Planning Phase
    if (context.onStatusChange) context.onStatusChange('Đang lập dàn ý và thiết kế mục tiêu (Planning Agent)...');
    const plan = await executePlanningAgent(context);

    // 2. Content Generation Phase
    if (context.onStatusChange) context.onStatusChange('Đang soạn thảo nội dung chi tiết (Content Agent)...');
    const content = await executeContentAgent(context, plan);

    // 3. Formatting Phase — bước "trang điểm", KHÔNG được làm mất nội dung đã sinh.
    // Đây là call AI thứ 3 liên tiếp nên dễ dính quota 429 nhất; nếu lỗi thì trả về
    // nội dung thô của Content Agent thay vì throw (throw = editor kẹt ở dòng chờ
    // "đang chuẩn hóa..." và giáo viên mất trắng giáo án đã sinh xong).
    if (context.onStatusChange) context.onStatusChange('Đang chuẩn hóa định dạng giáo án (Format Agent)...');
    // Clear the stream visual so user knows it's formatting
    if (context.onStreamChunk) context.onStreamChunk('*(Hệ thống đang chuẩn hóa bảng biểu và định dạng, vui lòng đợi vài giây...)*\n\n');

    try {
      const finalResult = await executeFormatAgent(context, content);
      // Format trả rỗng/cụt bất thường (mất >50% nội dung) → coi như thất bại, dùng bản thô.
      if (finalResult.finalMarkdown && finalResult.finalMarkdown.length >= content.rawContent.length * 0.5) {
        if (context.onStatusChange) context.onStatusChange('Hoàn tất!');
        return finalResult.finalMarkdown;
      }
      console.warn('[Coordinator] Format Agent trả kết quả rỗng/cụt — dùng nội dung thô của Content Agent.');
    } catch (formatError) {
      console.warn('[Coordinator] Format Agent lỗi — dùng nội dung thô của Content Agent:', formatError);
    }
    if (context.onStreamChunk) context.onStreamChunk(content.rawContent);
    if (context.onStatusChange) context.onStatusChange('Hoàn tất (bỏ qua bước chuẩn hóa định dạng do lỗi AI).');
    return content.rawContent;
  } catch (error) {
    console.error("Multi-Agent Pipeline Error:", error);
    if (context.onStatusChange) context.onStatusChange('Lỗi trong quá trình sinh giáo án.');
    throw error;
  }
};
