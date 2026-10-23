export type LessonProvenance = 'canonical' | 'teacher_authored' | 'reference' | 'ai_proposed' | 'source_verification_required';
export type LessonPlanStatus = 'drafting' | 'review_ready' | 'plan_approved';
export type LessonRevealPolicy = 'teacher_manual' | 'auto_on_next' | 'show_after_submit' | 'no_reveal';

export interface LessonPlanQuestion {
  id: string;
  provenance: LessonProvenance;
  prompt: string;
  answerOrRubric: string;
  hints: string[];
  revealPolicy: LessonRevealPolicy;
}

export interface LessonPlanQuestionInstance {
  id: string;
  questionId: string;
  activityId: string;
  attemptMode: 'fresh' | 'revision';
  evidenceFamilyId: string;
}

export interface LessonPlanAsset {
  id: string;
  provenance: LessonProvenance;
  kind: 'deterministic_math_visual' | 'interactive_simulation' | 'context_illustration';
  activityIds: string[];
  fallback: string;
}

export interface LessonPlanActivity {
  id: string;
  durationSec: number;
  questionInstanceIds: string[];
  assetIds: string[];
}

export interface LessonPlanDraft {
  id: string;
  sourceHash: string;
  durationSec: number;
  status: LessonPlanStatus;
  activities: LessonPlanActivity[];
  questions: LessonPlanQuestion[];
  questionInstances: LessonPlanQuestionInstance[];
  assets: LessonPlanAsset[];
}

export interface LessonPlanValidationIssue {
  code:
    | 'SOURCE_VERIFICATION_REQUIRED'
    | 'QUESTION_INSTANCE_REUSED'
    | 'QUESTION_INSTANCE_UNKNOWN'
    | 'QUESTION_INSTANCE_ID_INVALID'
    | 'ASSET_ACTIVITY_MISMATCH'
    | 'ASSET_UNKNOWN'
    | 'DURATION_INVALID'
    | 'ACTIVITY_REQUIRED'
    | 'QUESTION_REQUIRED';
  path: string;
  message: string;
}

export const buildQuestionInstanceId = (questionId: string, activityId: string): string => `${questionId}@${activityId}`;

export const validateLessonPlanDraft = (draft: LessonPlanDraft): LessonPlanValidationIssue[] => {
  const issues: LessonPlanValidationIssue[] = [];
  const questionIds = new Set(draft.questions.map(question => question.id));
  const instanceById = new Map(draft.questionInstances.map(instance => [instance.id, instance]));
  const assetById = new Map(draft.assets.map(asset => [asset.id, asset]));
  const instanceOwners = new Map<string, string>();

  if (draft.activities.length === 0) {
    issues.push({ code: 'ACTIVITY_REQUIRED', path: 'activities', message: 'Bản nháp phải có ít nhất một hoạt động.' });
  }
  if (draft.questions.length === 0 || draft.questionInstances.length === 0) {
    issues.push({ code: 'QUESTION_REQUIRED', path: 'questions', message: 'Bản nháp phải có ít nhất một câu hỏi và question instance.' });
  }

  if (draft.durationSec <= 0 || draft.activities.some(activity => activity.durationSec <= 0)) {
    issues.push({ code: 'DURATION_INVALID', path: 'activities', message: 'Mỗi hoạt động phải có thời lượng dương.' });
  }

  for (const question of draft.questions) {
    if (question.provenance === 'source_verification_required') {
      issues.push({
        code: 'SOURCE_VERIFICATION_REQUIRED',
        path: `questions.${question.id}`,
        message: `Câu ${question.id} còn thiếu xác minh nguồn.`,
      });
    }
  }

  for (const activity of draft.activities) {
    for (const instanceId of activity.questionInstanceIds) {
      const instance = instanceById.get(instanceId);
      if (!instance || !questionIds.has(instance.questionId)) {
        issues.push({ code: 'QUESTION_INSTANCE_UNKNOWN', path: `activities.${activity.id}.questionInstanceIds`, message: `Không tìm thấy ${instanceId}.` });
        continue;
      }
      if (instance.id !== buildQuestionInstanceId(instance.questionId, instance.activityId)) {
        issues.push({ code: 'QUESTION_INSTANCE_ID_INVALID', path: `questionInstances.${instance.id}`, message: `ID instance ${instance.id} không khớp question/activity.` });
      }
      const owner = instanceOwners.get(instanceId);
      if (owner && owner !== activity.id) {
        issues.push({ code: 'QUESTION_INSTANCE_REUSED', path: `activities.${activity.id}.questionInstanceIds`, message: `${instanceId} đã thuộc activity ${owner}.` });
      } else {
        instanceOwners.set(instanceId, activity.id);
      }
    }

    for (const assetId of activity.assetIds) {
      const asset = assetById.get(assetId);
      if (!asset) {
        issues.push({ code: 'ASSET_UNKNOWN', path: `activities.${activity.id}.assetIds`, message: `Không tìm thấy asset ${assetId}.` });
      } else if (!asset.activityIds.includes(activity.id)) {
        issues.push({ code: 'ASSET_ACTIVITY_MISMATCH', path: `activities.${activity.id}.assetIds`, message: `${assetId} chưa được bind vào ${activity.id}.` });
      }
    }
  }

  return issues;
};
