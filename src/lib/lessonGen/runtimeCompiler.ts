import type { LiveLessonDefinition, LiveResponseStep } from '../liveLesson/types';
import { validateLiveLessonDefinition } from '../liveLesson/definition';
import type { LessonPlanDraft } from './planValidator';

const responseSteps = (draft: LessonPlanDraft): LiveResponseStep[] => draft.questions.map(question => ({
  id: question.id,
  label: question.prompt,
  screenId: 'HS0',
  responseTypes: ['text'],
  submissionModes: ['typed_text'],
  maxTextLength: 4000,
}));

export const compileLessonPlanRuntime = ({ draft, lessonId, title }: { draft: LessonPlanDraft; lessonId: string; title: string }): LiveLessonDefinition => {
  if (draft.status !== 'plan_approved') throw new Error('Kế hoạch phải được duyệt trước khi tạo runtime.');
  const instances = new Map(draft.questionInstances.map(instance => [instance.id, instance]));
  let elapsed = 0;
  const cues = draft.activities.map(activity => {
    const ids = activity.questionInstanceIds.map(id => instances.get(id)?.questionId).filter((id): id is string => Boolean(id));
    const cue = {
      id: activity.id,
      atSeconds: elapsed,
      label: activity.id,
      tvScreenId: activity.id,
      studentScreenId: 'HS0',
      teacher: '',
      student: ids.length ? 'Hoàn thành nhiệm vụ đang mở trên thiết bị.' : 'Theo dõi chỉ dẫn trên TV.',
      boardLarge: '', boardSide: '', notebook: '', observerEvidence: '',
      ...(ids[0] ? { responseStepId: ids[0], responseStepIds: ids } : {}),
      attention: { primarySurface: ids.length ? 'student_device' as const : 'screen' as const, secondarySurface: null, studentState: ids.length ? 'interactive' as const : 'view_only' as const },
    };
    elapsed += activity.durationSec;
    return cue;
  });
  if (elapsed !== draft.durationSec) throw new Error('Tổng thời lượng activities không khớp draft.');
  cues.push({ id: 'P40', atSeconds: elapsed, label: 'Kết thúc', tvScreenId: 'P40', studentScreenId: 'HS0', teacher: '', student: 'Đọc phản hồi cá nhân.', boardLarge: '', boardSide: '', notebook: '', observerEvidence: '', attention: { primarySurface: 'screen', secondarySurface: null, studentState: 'view_only' } });
  const steps = responseSteps(draft);
  return validateLiveLessonDefinition({
    id: `v821_generated_${lessonId}`,
    lessonId,
    title,
    durationSeconds: draft.durationSec,
    cues,
    tvScreens: [...draft.activities.map(activity => ({ id: activity.id, label: activity.id, title: activity.id, body: '', action: 'Theo dõi hoạt động.' })), { id: 'P40', label: 'feedback', title: 'Tổng kết', body: 'Xem bước tiếp theo.', action: 'Đọc phản hồi.' }],
    studentScreens: [{ id: 'HS0', label: 'Hoạt động hiện tại', action: 'Theo dõi chỉ dẫn hoặc trả lời khi hoạt động mở.' }],
    allowedStepIds: steps.map(step => step.id),
    aiErrorStepId: steps[0]?.id ?? 'none',
    aiErrorOfTheWeek: { id: `${lessonId}-review`, category: 'Review', correction: 'Đối chiếu với dữ kiện.', proof: 'Nêu một căn cứ.' },
    responseSteps: steps,
  });
};
