export type LessonDraftLifecycleStatus = 'drafting' | 'review_ready' | 'plan_approved' | 'design_approved' | 'compiled';

export interface LessonPlanApproval {
  planApprovedAt?: string;
  designApprovedAt?: string;
}

export interface ReviewableLessonPlanContent {
  title: string;
  durationSec: number;
  activities: string[];
}

export interface ReviewableLessonPlanDraft {
  id: string;
  sourceHash: string;
  revision: number;
  status: LessonDraftLifecycleStatus;
  approval: LessonPlanApproval;
  content: ReviewableLessonPlanContent;
  unresolvedIssues?: string[];
  note?: string;
}

const hasInstructionalChange = (current: ReviewableLessonPlanContent, patch: Partial<ReviewableLessonPlanContent>): boolean =>
  (patch.title !== undefined && patch.title !== current.title)
  || (patch.durationSec !== undefined && patch.durationSec !== current.durationSec)
  || (patch.activities !== undefined && JSON.stringify(patch.activities) !== JSON.stringify(current.activities));

export const applyDraftRevision = (
  draft: ReviewableLessonPlanDraft,
  patch: Partial<ReviewableLessonPlanContent>,
  note?: string,
): ReviewableLessonPlanDraft => {
  const instructionalChange = hasInstructionalChange(draft.content, patch);
  return {
    ...draft,
    revision: draft.revision + 1,
    content: { ...draft.content, ...patch },
    ...(note !== undefined ? { note } : {}),
    ...(instructionalChange ? { status: 'review_ready' as const, approval: {} } : {}),
  };
};

export const canCompileLessonPlan = (draft: ReviewableLessonPlanDraft): boolean =>
  draft.status === 'design_approved'
  && Boolean(draft.approval.planApprovedAt)
  && Boolean(draft.approval.designApprovedAt)
  && !(draft.unresolvedIssues?.length);
