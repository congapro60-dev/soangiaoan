import type { AssistantActor, AssistantToolName } from './_assistant-types.js';

export type AssistantExecutor = (input: {
  actor: AssistantActor;
  confirmationId: string;
  payload: Record<string, unknown>;
}) => Promise<Record<string, unknown>> | Record<string, unknown>;

const text = (value: unknown, max: number): string => typeof value === 'string' ? value.trim().slice(0, max) : '';

// Deliberately bounded and side-effect free. AI generation, exports, and writes stay disabled until their
// existing server contracts can be called with the same actor and resource scope checks.
const draftLesson: AssistantExecutor = ({ payload }) => {
  const title = text(payload.title, 300) || 'Bản nháp giáo án';
  const subject = text(payload.subject, 120);
  const grade = text(payload.grade, 40);
  const content = text(payload.content, 12000) || 'Bản nháp trống — giáo viên cần bổ sung nội dung trước khi lưu.';
  return {
    kind: 'draftLesson',
    title,
    ...(subject ? { subject } : {}),
    ...(grade ? { grade } : {}),
    content,
    persisted: false,
  };
};

export const ASSISTANT_EXECUTORS: Readonly<Partial<Record<AssistantToolName, AssistantExecutor>>> = {
  draftLesson,
};

export const ASSISTANT_EXECUTABLE_TOOLS = new Set<AssistantToolName>(Object.keys(ASSISTANT_EXECUTORS) as AssistantToolName[]);

export const executeAssistantTool = async (input: {
  actor: AssistantActor;
  confirmationId: string;
  toolName: AssistantToolName;
  payload: Record<string, unknown>;
}) => {
  const executor = ASSISTANT_EXECUTORS[input.toolName];
  if (!executor) throw new Error('Unsupported assistant executor');
  return await executor({ actor: input.actor, confirmationId: input.confirmationId, payload: input.payload });
};
