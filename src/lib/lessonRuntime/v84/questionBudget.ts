import type { LessonIRV83 } from '../../lessonCompiler/v832/lessonIRSchema.js';

type Activity = LessonIRV83['timeline'][number];

// Preview only: canonical 8.3.2 may leave per-question estimates at zero.
// A declared V8.4 budget still requires positive authored estimates.
export const resolvePreviewQuestionWorkSec = (
  activity: Activity, questions: LessonIRV83['questions'], instanceId: string,
): number => {
  const instances = activity.questionInstances ?? [];
  const target = instances.find(instance => instance.instanceId === instanceId);
  const explicit = target ? questions[target.questionId]?.estimatedWorkTimeSec : undefined;
  if (explicit === undefined || !Number.isFinite(explicit) || explicit < 0) throw new Error('QUESTION_WORK_TIME_UNSPECIFIED');
  if (explicit > 0) return explicit;

  const estimates = instances.map(instance => questions[instance.questionId]?.estimatedWorkTimeSec);
  if (estimates.some(value => value === undefined || !Number.isFinite(value) || value < 0)) {
    throw new Error('QUESTION_WORK_TIME_UNSPECIFIED');
  }
  const zeroCount = estimates.filter(value => value === 0).length;
  const authoredWorkSec = estimates.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const activityWorkSec = activity.surfaceHandoff?.work.durationSec
    ?? activity.durationSec - activity.timingPolicy.surfaceSwitchCostSec;
  const remainingSec = activityWorkSec - authoredWorkSec - 3 * instances.length;
  const inferredSec = Math.floor(remainingSec / zeroCount);
  if (!Number.isFinite(inferredSec) || inferredSec <= 0) throw new Error('QUESTION_WORK_TIME_UNSPECIFIED');
  return inferredSec;
};
