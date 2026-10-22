import type { LessonIRV83 } from './lessonIRSchema.js';
import type { ActivitySpec, LocaleText } from './lessonIR.generated';

export interface RoomProjectionState {
  activityId: string;
  questionBuildStepIndex: number;
  visualStateId?: string;
  questionInstanceId?: string;
  locale: 'vi' | 'en' | 'ja';
}

const localize = (copy: LocaleText, locale: RoomProjectionState['locale']): string => copy[locale] ?? copy.vi;

const publicOption = (option: unknown, locale: RoomProjectionState['locale']): string | { id: string; label: string } => {
  if (typeof option === 'string') return option;
  if (!option || typeof option !== 'object' || Array.isArray(option)) throw new Error('Option công khai không hợp lệ.');
  const record = option as Record<string, unknown>;
  if (typeof record.id !== 'string' || !record.id.trim()) throw new Error('Option công khai thiếu id.');
  const label = record.label;
  if (typeof label === 'string') return { id: record.id, label };
  if (label && typeof label === 'object' && !Array.isArray(label) && typeof (label as Record<string, unknown>).vi === 'string') {
    return { id: record.id, label: localize(label as LocaleText, locale) };
  }
  throw new Error('Option công khai thiếu nhãn.');
};

const currentActivity = (lesson: LessonIRV83, state: RoomProjectionState): ActivitySpec => {
  const activity = lesson.timeline.find(item => item.id === state.activityId);
  if (!activity) throw new Error(`Không có activity ${state.activityId} trong Lesson IR.`);
  return activity;
};

const visibleVisuals = (lesson: LessonIRV83, visualIds: readonly string[], state: RoomProjectionState) => (
  [...new Set(visualIds)].map(id => {
    const visual = lesson.visuals[id];
    if (!visual) throw new Error(`Thiếu visual ${id} trong Lesson IR.`);
    const stateId = state.visualStateId && visual.states[state.visualStateId] ? state.visualStateId : visual.defaultStateId;
    const visualState = visual.states[stateId];
    if (!visualState) throw new Error(`Thiếu visual state ${stateId} cho ${id}.`);
    const visibleObjects = visualState.visibleObjects.filter(object => !visualState.hiddenObjects?.includes(object));
    return {
      id,
      type: visual.type,
      stateId,
      visibleObjects,
      emphasizedObjects: (visualState.emphasizedObjects ?? []).filter(object => visibleObjects.includes(object)),
      labels: Object.fromEntries(Object.entries(visualState.labels ?? {}).filter(([object]) => visibleObjects.includes(object))),
    };
  })
);

export const projectPresenterSurface = (lesson: LessonIRV83, state: RoomProjectionState) => {
  const activity = currentActivity(lesson, state);
  const steps = activity.questionBuild?.steps ?? [];
  const lastVisible = Math.max(0, Math.min(state.questionBuildStepIndex, steps.length - 1));
  const upcoming = steps[lastVisible + 1];
  return {
    lessonId: lesson.lesson.lessonId,
    lessonVersion: lesson.lesson.lessonVersion,
    activityId: activity.id,
    title: localize(activity.presenter.title, state.locale),
    copy: localize(activity.presenter.exactCopy, state.locale),
    attentionBeacon: { mode: activity.attentionBeacon.mode, copy: localize(activity.attentionBeacon.copy, state.locale) },
    controls: activity.presenter.controls,
    nextControl: upcoming ? (upcoming.type === 'reveal' ? 'REVEAL' : 'QUESTION_NEXT') : 'NEXT_ACTIVITY',
    hasDeviceHandoff: activity.surfaceHandoff?.toSurface === 'student_device',
    taskBridge: activity.presenter.taskBridge ?? null,
    visuals: visibleVisuals(lesson, activity.presenter.visualRefs ?? [], state),
    questionBuild: steps.slice(0, lastVisible + 1).map(step => {
      if (step.type === 'question') return { type: step.type, id: step.id, content: localize(step.content, state.locale) };
      if (step.type === 'reveal') return { type: step.type, id: step.id, label: localize(step.label, state.locale), content: localize(step.content, state.locale) };
      return { type: step.type, visualStateId: step.visualStateId };
    }),
  };
};

export const projectStudentSurface = (lesson: LessonIRV83, state: RoomProjectionState) => {
  const activity = currentActivity(lesson, state);
  const visualRefs = activity.student.visualRefs ?? [];
  const questions = (activity.questionInstances ?? []).map(instance => {
    const question = lesson.questions[instance.questionId];
    if (!question) throw new Error(`Thiếu câu hỏi ${instance.questionId} trong Lesson IR.`);
    if (question.visualRef && !visualRefs.includes(question.visualRef)) {
      throw new Error(`Student thiếu hình ${question.visualRef} cho câu ${instance.questionId}.`);
    }
    return {
      instanceId: instance.instanceId,
      questionId: question.id,
      ...(question.visualRef ? { visualRef: question.visualRef } : {}),
      prompt: localize(question.prompt, state.locale),
      responseType: question.responseType,
      ...(question.options ? { options: question.options.map(option => publicOption(option, state.locale)) } : {}),
      submissionModes: question.submissionModes,
      hintCount: question.hints.length,
    };
  });
  return {
    lessonId: lesson.lesson.lessonId,
    lessonVersion: lesson.lesson.lessonVersion,
    activityId: activity.id,
    title: localize(activity.title, state.locale),
    state: activity.student.state,
    copy: localize(activity.student.exactCopy, state.locale),
    interaction: activity.student.interaction,
    requiredProduct: activity.student.requiredProduct ?? '',
    onSubmitState: activity.student.onSubmitState,
    attentionBeacon: { mode: activity.attentionBeacon.mode, copy: localize(activity.attentionBeacon.copy, state.locale) },
    visuals: visibleVisuals(lesson, visualRefs, state),
    questions,
  };
};

export const projectCoachSurface = (lesson: LessonIRV83, state: RoomProjectionState) => {
  const activity = currentActivity(lesson, state);
  const selectedInstance = state.questionInstanceId
    ? activity.questionInstances?.find(instance => instance.instanceId === state.questionInstanceId)
    : activity.questionInstances?.[0];
  if (state.questionInstanceId && !selectedInstance) throw new Error(`QUESTION_INSTANCE_NOT_FOUND:${state.questionInstanceId}`);
  const selectedQuestion = selectedInstance ? lesson.questions[selectedInstance.questionId] : null;
  return {
    lessonId: lesson.lesson.lessonId,
    lessonVersion: lesson.lesson.lessonVersion,
    activityId: activity.id,
    purpose: activity.coach.purpose,
    ask: activity.coach.ask,
    observe: activity.coach.observe,
    transitionWhen: activity.coach.transitionWhen,
    studentMirror: {
      ...activity.coach.studentMirror,
      studentPrompt: selectedQuestion?.prompt ?? activity.student.exactCopy,
      inputType: selectedQuestion?.responseType ?? activity.student.interaction,
      ...(activity.student.requiredProduct ? { expectedProduct: activity.student.requiredProduct } : {}),
      ...(selectedQuestion?.visualRef ? { visualRef: selectedQuestion.visualRef } : {}),
    },
    decisionCard: activity.coach.decisionCard ?? null,
    questions: (activity.questionInstances ?? []).filter(instance => !state.questionInstanceId || instance.instanceId === state.questionInstanceId).map(instance => {
      const question = lesson.questions[instance.questionId];
      if (!question) throw new Error(`Thiếu câu hỏi ${instance.questionId} trong Lesson IR.`);
      return {
        instanceId: instance.instanceId,
        prompt: localize(question.prompt, state.locale),
        correctAnswer: question.correctAnswer,
        rubric: question.rubric,
        misconceptions: question.misconceptions,
        evidenceTargets: question.evidenceTargets,
      };
    }),
  };
};
