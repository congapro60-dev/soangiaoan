import type { LessonIRV83 } from './lessonIRSchema.js';
import type { QuestionBuildStep } from './lessonIR.generated';

export type V832Locale = 'vi' | 'en' | 'ja';
export const V832_LOCALES: readonly V832Locale[] = ['vi', 'en', 'ja'];

const hasCopy = (value: { vi: string; en?: string; ja?: string } | undefined, locale: V832Locale): boolean =>
  typeof value?.[locale] === 'string' && Boolean(value[locale]?.trim());

const stepHasCopy = (step: QuestionBuildStep, locale: V832Locale): boolean => {
  if (step.type === 'highlight') return true;
  if (!hasCopy(step.content, locale)) return false;
  return step.type !== 'reveal' || hasCopy(step.label, locale);
};

export const availablePresenterLocales = (lesson: LessonIRV83): V832Locale[] => V832_LOCALES.filter(locale =>
  hasCopy(lesson.lesson.title, locale) && lesson.timeline.every(activity =>
    hasCopy(activity.presenter.title, locale)
    && hasCopy(activity.presenter.exactCopy, locale)
    && hasCopy(activity.attentionBeacon.copy, locale)
    && (!activity.surfaceHandoff || (hasCopy(activity.surfaceHandoff.entry.presenterCue, locale)
      && hasCopy(activity.surfaceHandoff.recall.presenterCue, locale)))
    && (activity.questionBuild?.steps ?? []).every(step => stepHasCopy(step, locale))));

export const availableStudentLocales = (lesson: LessonIRV83): V832Locale[] => V832_LOCALES.filter(locale =>
  lesson.timeline.every(activity =>
    hasCopy(activity.student.exactCopy, locale)
    && hasCopy(activity.attentionBeacon.copy, locale)
    && (!activity.surfaceHandoff || hasCopy(activity.surfaceHandoff.recall.studentCue, locale))
    && (activity.questionInstances ?? []).every(instance => {
      const question = lesson.questions[instance.questionId];
      if (!question || !hasCopy(question.prompt, locale)) return false;
      return (question.options ?? []).every(option => {
        if (typeof option === 'string') return true;
        if (!option || typeof option !== 'object' || Array.isArray(option)) return false;
        const label = (option as { label?: unknown }).label;
        return typeof label === 'string' || hasCopy(label as { vi: string; en?: string; ja?: string }, locale);
      });
    })));
