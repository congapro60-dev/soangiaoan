import type { ActivitySpec } from './lessonIR.generated';
import type { LessonIRV83 } from './lessonIRSchema.js';

export const resolveActivityVisualStateRef = (
  lesson: LessonIRV83,
  activity: ActivitySpec,
  ref: string,
): { visualId: string; stateId: string } | null => {
  const visualIds = new Set([...(activity.presenter.visualRefs ?? []), ...(activity.student.visualRefs ?? [])]);
  const matches = [...visualIds].flatMap(visualId => Object.keys(lesson.visuals[visualId]?.states ?? {})
    .filter(stateId => ref === stateId || ref === `${visualId}:${stateId}`)
    .map(stateId => ({ visualId, stateId })));
  return matches.length === 1 ? matches[0] : null;
};
