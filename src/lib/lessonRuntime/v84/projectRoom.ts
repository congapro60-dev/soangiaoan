import {
  projectPublicRoomSnapshot, type PublicRoomSnapshotV832, type RuntimeBuildV832,
} from '../../lessonCompiler/v832/runtimePackage';
import { canContinueDeviceWork, type RoomStateV832 } from '../../lessonCompiler/v832/roomState';
import type { QuestionRun } from './questionState';
import { finalizeQuestionStats, type PublicQuestionStats } from './questionStats';
import { projectMathVisuals, type PublicMathVisual } from './mathVisual/publicVisual';

type Locale = 'vi' | 'en' | 'ja';

export interface PublicRoomSnapshotV84 extends PublicRoomSnapshotV832 {
  clock?: { lessonStartedAtSec: number; activityStartedAtSec: number;
    plannedActivityStartSec: number; activityBudgetSec: number; timeBankSec: number };
  canContinueDeviceBlock: boolean;
  questionPhase: QuestionRun['phase'] | null;
  questionRunKey: string | null;
  questionRunRevision: number | null;
  questionRequired: boolean | null;
  mathVisuals: PublicMathVisual[];
  activeQuestion: {
    instanceId: string;
    runKey: string;
    questionId: string;
    questionNumber: number;
    questionTotal: number;
    prompt: string;
    phase: QuestionRun['phase'];
    revealPolicy: QuestionRun['revealPolicy'];
    deadlineAtSec: number;
    pausedAtSec?: number;
    requiredCompleted: number;
    requiredTotal: number;
    validResponses: number;
    stats?: PublicQuestionStats;
    answer?: unknown;
    reveal?: unknown;
  } | null;
}

export const projectV84RoomSnapshot = (
  build: RuntimeBuildV832, room: RoomStateV832, run: QuestionRun | null,
): PublicRoomSnapshotV84 => {
  const base = projectPublicRoomSnapshot(build, room);
  const visualRefs = [...base.presenter.visuals.map(item => item.id),
    ...base.studentByLocale.vi.visuals.map(item => item.id)];
  const mathVisuals = projectMathVisuals(build.privateLessonIR, visualRefs, room.visualStateId, run?.phase);
  const mathById = new Map(mathVisuals.map(visual => [visual.visualId, visual]));
  const safeVisuals = (visuals: typeof base.presenter.visuals): typeof base.presenter.visuals => visuals.map(visual => {
    const math = mathById.get(visual.id);
    return math ? { ...visual, stateId: math.stateId, visibleObjects: math.visibleObjects,
      emphasizedObjects: [], labels: {} } : visual;
  });
  const publicBase = {
    ...base,
    ...(run && mathVisuals.length ? { visualStateId: mathVisuals.length === 1 ? mathVisuals[0].stateId : null } : {}),
    presenter: { ...base.presenter, visuals: safeVisuals(base.presenter.visuals) },
    studentByLocale: {
      vi: { ...base.studentByLocale.vi, visuals: safeVisuals(base.studentByLocale.vi.visuals) },
      en: { ...base.studentByLocale.en, visuals: safeVisuals(base.studentByLocale.en.visuals) },
      ja: { ...base.studentByLocale.ja, visuals: safeVisuals(base.studentByLocale.ja.visuals) },
    },
  };
  const canContinueDeviceBlock = room.handoffState === 'DEVICE_WORK'
    && canContinueDeviceWork(build.privateLessonIR, room.activityId);
  if (!run) {
    return { ...publicBase, studentByLocale: {
      vi: { ...publicBase.studentByLocale.vi, questions: [] },
      en: { ...publicBase.studentByLocale.en, questions: [] },
      ja: { ...publicBase.studentByLocale.ja, questions: [] },
    }, mathVisuals, canContinueDeviceBlock, questionPhase: null, questionRunKey: null,
    questionRunRevision: null, questionRequired: null, activeQuestion: null };
  }
  if (run.activityId !== room.activityId) throw new Error('QUESTION_ACTIVITY_MISMATCH');
  const activity = build.privateLessonIR.timeline.find(item => item.id === run.activityId);
  const instance = activity?.questionInstances?.find(item => item.instanceId === run.instanceId);
  const question = instance ? build.privateLessonIR.questions[instance.questionId] : null;
  if (!instance || !question) throw new Error('QUESTION_INSTANCE_NOT_FOUND');
  const orderedInstances = [...(activity?.questionInstances ?? [])].sort((left, right) => left.order - right.order);
  const questionNumber = orderedInstances.findIndex(item => item.instanceId === run.instanceId) + 1;
  const studentForLocale = (locale: Locale) => ({
    ...publicBase.studentByLocale[locale],
    state: run.phase === 'QUESTION_OPEN' ? publicBase.studentByLocale[locale].state : 'view_only' as const,
    questions: run.phase === 'INTRO' || run.phase === 'QUESTION_BRIEF' ? []
      : publicBase.studentByLocale[locale].questions.filter(item => item.instanceId === run.instanceId),
  });
  const revealAllowed = run.phase === 'REVEAL' && run.revealPolicy !== 'no_reveal';
  const statsVisible = run.phase === 'STATS' || run.phase === 'REVEAL';
  const optionIds = (question.options ?? []).flatMap(option => {
    if (typeof option === 'string') return [option];
    if (option && typeof option === 'object' && typeof (option as { id?: unknown }).id === 'string') return [(option as { id: string }).id];
    return [];
  });
  if (question.responseType === 'true_false_matrix' && optionIds.length === 0) {
    const rubric = question.rubric && typeof question.rubric === 'object' && !Array.isArray(question.rubric)
      ? question.rubric as Record<string, unknown> : null;
    const keyLength = Array.isArray(rubric?.key) ? rubric.key.length : 0;
    if (keyLength > 0 && keyLength <= 50) {
      optionIds.push(...Array.from({ length: keyLength }, (_, index) => String(index + 1)));
    }
  }
  return {
    ...publicBase,
    mathVisuals,
    canContinueDeviceBlock,
    questionPhase: run.phase,
    questionRunKey: `${run.instanceId}:${run.openedAtSec}`,
    questionRunRevision: run.runRevision,
    questionRequired: instance.required,
    studentByLocale: { vi: studentForLocale('vi'), en: studentForLocale('en'), ja: studentForLocale('ja') },
    activeQuestion: run.phase === 'INTRO' ? null : {
      instanceId: run.instanceId,
      runKey: `${run.instanceId}:${run.openedAtSec}`,
      questionId: question.id,
      questionNumber,
      questionTotal: orderedInstances.length,
      prompt: question.prompt[room.presenterLocale] ?? question.prompt.vi,
      phase: run.phase,
      revealPolicy: run.revealPolicy,
      deadlineAtSec: run.deadlineAtSec,
      ...(run.pausedAtSec !== undefined ? { pausedAtSec: run.pausedAtSec } : {}),
      requiredCompleted: run.requiredCompleted,
      requiredTotal: run.completionRequiredSet.length,
      validResponses: run.validResponses,
      ...(statsVisible ? { stats: finalizeQuestionStats(run, question.responseType, optionIds) } : {}),
      ...(revealAllowed ? {
        ...(question.correctAnswer !== undefined ? { answer: question.correctAnswer } : {}),
        ...(question.reveal !== undefined ? { reveal: question.reveal } : {}),
      } : {}),
    },
  };
};
