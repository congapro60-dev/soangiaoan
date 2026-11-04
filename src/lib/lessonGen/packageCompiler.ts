import type { LessonPlanDraft } from './planValidator';

export interface CompiledLessonPackage {
  packageId: string;
  lessonId: string;
  version: string;
  sourceHash: string;
  contentHash: string;
  publicManifest: {
    activities: Array<{ id: string; durationSec: number; questionPrompt?: string; assetIds: string[] }>;
  };
  privateManifest: {
    questions: Array<{ id: string; answerOrRubric: string; hints: string[]; revealPolicy: string }>;
  };
}

const sha256 = async (value: string): Promise<string> => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
};

export const compileLessonPackage = async ({ plan, lessonId, revision }: { plan: LessonPlanDraft; lessonId: string; revision: number }): Promise<CompiledLessonPackage> => {
  if (plan.status !== 'plan_approved') throw new Error('Kế hoạch phải được duyệt trước khi compile package.');
  const questions = new Map(plan.questions.map(question => [question.id, question]));
  const instances = new Map(plan.questionInstances.map(instance => [instance.id, instance]));
  const publicManifest = {
    activities: plan.activities.map(activity => {
      const firstInstance = instances.get(activity.questionInstanceIds[0] ?? '');
      const question = firstInstance ? questions.get(firstInstance.questionId) : null;
      return { id: activity.id, durationSec: activity.durationSec, ...(question ? { questionPrompt: question.prompt } : {}), assetIds: [...activity.assetIds] };
    }),
  };
  const privateManifest = {
    questions: plan.questions.map(question => ({ id: question.id, answerOrRubric: question.answerOrRubric, hints: [...question.hints], revealPolicy: question.revealPolicy })),
  };
  const contentHash = await sha256(JSON.stringify({ publicManifest, privateManifest, sourceHash: plan.sourceHash }));
  return { packageId: `${lessonId}:${contentHash.slice(0, 16)}`, lessonId, version: `r${revision}`, sourceHash: plan.sourceHash, contentHash, publicManifest, privateManifest };
};
