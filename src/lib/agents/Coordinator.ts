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

    // 3. Formatting Phase
    if (context.onStatusChange) context.onStatusChange('Đang chuẩn hóa định dạng giáo án (Format Agent)...');
    // Clear the stream visual so user knows it's formatting
    if (context.onStreamChunk) context.onStreamChunk('*(Hệ thống đang chuẩn hóa bảng biểu và định dạng, vui lòng đợi vài giây...)*\n\n');

    const finalResult = await executeFormatAgent(context, content);

    if (context.onStatusChange) context.onStatusChange('Hoàn tất!');
    return finalResult.finalMarkdown;
  } catch (error) {
    console.error("Multi-Agent Pipeline Error:", error);
    if (context.onStatusChange) context.onStatusChange('Lỗi trong quá trình sinh giáo án.');
    throw error;
  }
};
