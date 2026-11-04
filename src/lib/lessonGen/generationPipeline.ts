import { validateLessonPlanDraft, type LessonPlanDraft } from './planValidator';

export interface GenerateLessonPlanInput {
  prompt: string;
  sourceHash?: string;
  invoke: (prompt: string) => Promise<string>;
}

const parseJsonObject = (raw: string): unknown => {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    throw new Error('AI trả về JSON không hợp lệ.');
  }
};

const isDraftShape = (value: unknown): value is LessonPlanDraft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<LessonPlanDraft>;
  return typeof draft.id === 'string'
    && typeof draft.sourceHash === 'string'
    && typeof draft.durationSec === 'number'
    && (draft.status === 'drafting' || draft.status === 'review_ready' || draft.status === 'plan_approved')
    && Array.isArray(draft.activities)
    && Array.isArray(draft.questions)
    && Array.isArray(draft.questionInstances)
    && Array.isArray(draft.assets);
};

export const generateLessonPlanDraft = async ({ prompt, sourceHash, invoke }: GenerateLessonPlanInput): Promise<LessonPlanDraft> => {
  const parsed = parseJsonObject(await invoke(prompt));
  if (!isDraftShape(parsed)) throw new Error('AI trả về schema lesson plan không hợp lệ.');
  if (sourceHash && parsed.sourceHash !== sourceHash) throw new Error('AI trả về sourceHash không khớp nguồn đã kiểm tra.');
  const issues = validateLessonPlanDraft(parsed);
  if (issues.length > 0) throw new Error(`AI trả về schema lesson plan không hợp lệ: ${issues.map(issue => issue.code).join(', ')}.`);
  return parsed;
};
