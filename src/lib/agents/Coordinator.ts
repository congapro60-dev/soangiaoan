import { AgentContext } from './types';
import { executePlanningAgent } from './PlanningAgent';
import { executeContentAgent } from './ContentAgent';

const FAST_MODEL_MAP: Record<string, string> = {
  'gemini-3.5-flash':        'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview':  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview':  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite':   'gemini-3.1-flash-lite',
  'gemini-2.5-pro':          'gemini-2.5-flash',
  'gemini-2.5-flash':        'gemini-2.5-flash',
};

export const runMultiAgentPipeline = async (context: AgentContext): Promise<string> => {
  try {
    const fastSettings = {
      ...context.settings,
      selectedModel: FAST_MODEL_MAP[context.settings.selectedModel] ?? 'gemini-3.1-flash-lite',
    };
    const fastContext = { ...context, settings: fastSettings };

    // 1. Planning Phase
    if (context.onStatusChange) context.onStatusChange('Đang lập dàn ý và thiết kế mục tiêu (Planning Agent)...');
    const plan = await executePlanningAgent(fastContext);

    // 2. Content Generation Phase
    if (context.onStatusChange) context.onStatusChange('Đang soạn thảo nội dung chi tiết (Content Agent)...');
    const content = await executeContentAgent(context, plan);

    if (context.onStatusChange) context.onStatusChange('Hoàn tất!');
    return content.rawContent;
  } catch (error) {
    console.error("Single-Pass Pipeline Error:", error);
    if (context.onStatusChange) context.onStatusChange('Lỗi trong quá trình sinh giáo án.');
    throw error;
  }
};
