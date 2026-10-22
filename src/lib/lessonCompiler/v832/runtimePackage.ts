import type { LessonIRV83 } from './lessonIRSchema';
import { validateLessonIRSchema } from './lessonIRSchema';
import { evaluateLearningQuality, type SemanticRuleAttestation } from './qualityGate';
import { projectPresenterSurface, projectStudentSurface } from './surfaceProjection';
import { computeLessonContentHash } from '../../lessonReview/v832/repairLifecycle';
import type { RoomStateV832 } from './roomState';
import { availablePresenterLocales, availableStudentLocales } from './localeAvailability';
import { resolveActivityVisualStateRef } from './visualStateRef';
import { parseMathVisualExtension } from '../../lessonRuntime/v84/mathVisual/extension';
import { validateV84ActivityBudgets } from '../../lessonRuntime/v84/budgetContract';
import { evaluateExperienceDesign } from './experienceDesign';
import type { SourceModel } from './sourceModel';
import type { PrivateJsonEnvelope } from './privateJsonCodec';
import { decodePrivateJson } from './privateJsonCodec';

export interface RuntimeBuildManifestV832 {
  packageId: string;
  lessonId: string;
  lessonVersion: string;
  schemaVersion: '8.3.2';
  sourceHash: string;
  contentHash: string;
  compilerVersion: '8.3.2';
  activityIds: string[];
  qualityStatus: 'NEEDS_TEACHER_CONFIRMATION' | 'READY_WITH_WARNINGS' | 'READY';
  teacherConfirmationsRequired: Array<{ id: string; reason: string; materialForReadyToTeach: boolean }>;
  qaStatus: 'NOT_RUN';
  teacherApproved: false;
  v84BudgetStatus: 'VALID' | 'UNVALIDATED';
}

export interface RuntimeBuildV832 {
  manifest: RuntimeBuildManifestV832;
  /** Store this only in the authenticated teacher workspace. */
  privateLessonIR: LessonIRV83;
  privateExperiencePlan?: PrivateJsonEnvelope;
}

const finalizedDesignStatuses = new Set([
  'DESIGN_FROZEN', 'COMPILE_READY', 'COMPILED', 'QA_RUNNING', 'QA_FAILED',
  'READY_FOR_PREVIEW', 'TEACHER_APPROVED', 'READY_TO_TEACH', 'PUBLISHED',
]);

export const validateLessonIRReferences = (lesson: LessonIRV83): string[] => {
  const issues: string[] = [];
  const activities = new Set<string>();
  const criterionIds = new Set(lesson.learningDesign.successCriteria.map(item => item.id));
  const cycleIds = new Set(lesson.formativeDecisionCycles.map(item => item.id));
  const instanceIds = new Set<string>();

  for (const activity of lesson.timeline) {
    if (activities.has(activity.id)) issues.push(`DUPLICATE_ACTIVITY:${activity.id}`);
    activities.add(activity.id);
    for (const id of activity.successCriteriaRefs) {
      if (!criterionIds.has(id)) issues.push(`SUCCESS_CRITERION_NOT_FOUND:${activity.id}:${id}`);
    }
    for (const id of activity.formativeCycleRefs ?? []) {
      if (!cycleIds.has(id)) issues.push(`FORMATIVE_CYCLE_NOT_FOUND:${activity.id}:${id}`);
    }
    for (const id of [...(activity.presenter.visualRefs ?? []), ...(activity.student.visualRefs ?? [])]) {
      if (!lesson.visuals[id]) issues.push(`ACTIVITY_VISUAL_NOT_FOUND:${activity.id}:${id}`);
    }
    for (const instance of activity.questionInstances ?? []) {
      if (instance.activityId !== activity.id || instance.instanceId !== `${instance.questionId}@${activity.id}`) {
        issues.push(`QUESTION_INSTANCE_ID_INVALID:${activity.id}:${instance.instanceId}`);
      }
      if (instanceIds.has(instance.instanceId)) issues.push(`QUESTION_INSTANCE_REUSED:${instance.instanceId}`);
      instanceIds.add(instance.instanceId);
      const question = lesson.questions[instance.questionId];
      if (!question) issues.push(`QUESTION_NOT_FOUND:${activity.id}:${instance.questionId}`);
      else if (question.visualRef) {
        if (!lesson.visuals[question.visualRef]) issues.push(`QUESTION_VISUAL_NOT_FOUND:${question.id}:${question.visualRef}`);
        else if (!activity.student.visualRefs?.includes(question.visualRef)) {
          issues.push(`QUESTION_STUDENT_VISUAL_MISSING:${activity.id}:${question.id}:${question.visualRef}`);
        }
      }
    }
    const mirrorPrompt = activity.coach.studentMirror.studentPrompt.vi.trim();
    const activityPrompt = activity.student.exactCopy.vi.trim();
    const firstQuestionId = activity.questionInstances?.[0]?.questionId;
    const firstQuestionPrompt = firstQuestionId ? lesson.questions[firstQuestionId]?.prompt.vi.trim() : undefined;
    if (mirrorPrompt !== activityPrompt && mirrorPrompt !== firstQuestionPrompt) {
      issues.push(`COACH_STUDENT_PROMPT_MISMATCH:${activity.id}`);
    }
    if (activity.visualStateRefs?.length) {
      for (const stateId of activity.visualStateRefs) {
        if (!resolveActivityVisualStateRef(lesson, activity, stateId)) {
          issues.push(`ACTIVITY_VISUAL_STATE_NOT_FOUND:${activity.id}:${stateId}`);
        }
      }
    }
  }

  for (const [key, question] of Object.entries(lesson.questions)) {
    if (key !== question.id) issues.push(`QUESTION_BANK_KEY_MISMATCH:${key}:${question.id}`);
  }
  for (const [key, visual] of Object.entries(lesson.visuals)) {
    if (key !== visual.id) issues.push(`VISUAL_BANK_KEY_MISMATCH:${key}:${visual.id}`);
    if (!visual.states[visual.defaultStateId]) issues.push(`VISUAL_DEFAULT_STATE_NOT_FOUND:${visual.id}:${visual.defaultStateId}`);
    const objectIds = new Set(visual.objects);
    for (const [stateId, state] of Object.entries(visual.states)) {
      for (const objectId of [...state.visibleObjects, ...(state.hiddenObjects ?? []), ...(state.emphasizedObjects ?? [])]) {
        if (!objectIds.has(objectId)) issues.push(`VISUAL_OBJECT_NOT_FOUND:${visual.id}:${stateId}:${objectId}`);
      }
      if (state.visibleObjects.some(id => state.hiddenObjects?.includes(id))) {
        issues.push(`VISUAL_VISIBLE_AND_HIDDEN:${visual.id}:${stateId}`);
      }
    }
  }
  for (const cycle of lesson.formativeDecisionCycles) {
    if (!activities.has(cycle.activityRef)) issues.push(`FORMATIVE_ACTIVITY_NOT_FOUND:${cycle.id}:${cycle.activityRef}`);
    for (const id of cycle.mappedSuccessCriteria) {
      if (!criterionIds.has(id)) issues.push(`FORMATIVE_CRITERION_NOT_FOUND:${cycle.id}:${id}`);
    }
  }
  for (const evidence of lesson.cisEvidenceMap) {
    if (!activities.has(evidence.activityRef)) issues.push(`CIS_ACTIVITY_NOT_FOUND:${evidence.activityRef}`);
  }
  return issues;
};

export const prepareRuntimeBuild = async (
  lesson: LessonIRV83,
  attestations: readonly SemanticRuleAttestation[] = [],
  sourceModel?: SourceModel,
): Promise<RuntimeBuildV832> => {
  const schema = validateLessonIRSchema(lesson);
  if (!schema.valid) throw new Error(`LESSON_IR_SCHEMA_INVALID:${schema.issues.map(issue => issue.path).join(',')}`);
  const references = validateLessonIRReferences(lesson);
  if (references.length) throw new Error(`LESSON_IR_REFERENCES_INVALID:${references.join(',')}`);
  parseMathVisualExtension(lesson);
  const budgets = validateV84ActivityBudgets(lesson);
  if (budgets.status === 'INVALID') throw new Error(`V84_BUDGET_INVALID:${budgets.issues.join(',')}`);
  const experience = evaluateExperienceDesign(lesson, sourceModel);
  if (experience.status === 'BLOCKED') throw new Error(`V871_EXPERIENCE_BLOCKED:${experience.issues.join(',')}`);
  if (experience.status === 'REVIEW_REQUIRED') throw new Error(`V871_EXPERIENCE_REVIEW_REQUIRED:${experience.diagnostics.join(',')}`);
  if (!finalizedDesignStatuses.has(lesson.buildStatus)) throw new Error(`DESIGN_GATE_NOT_FROZEN:${lesson.buildStatus}`);
  if (!lesson.provenance?.sourceHash) throw new Error('SOURCE_HASH_REQUIRED');
  const quality = evaluateLearningQuality(lesson, attestations);
  if (quality.status === 'BLOCKED') {
    throw new Error(`QUALITY_GATE_BLOCKED:${[...quality.failedRules, ...quality.pendingRules].join(',')}`);
  }
  const contentHash = await computeLessonContentHash(lesson);
  const manifest: RuntimeBuildManifestV832 = {
    packageId: `${lesson.lesson.lessonId}:${contentHash.slice(0,16)}`,
    lessonId: lesson.lesson.lessonId,
    lessonVersion: lesson.lesson.lessonVersion,
    schemaVersion: '8.3.2',
    sourceHash: lesson.provenance.sourceHash,
    contentHash,
    compilerVersion: '8.3.2',
    activityIds: lesson.timeline.map(activity => activity.id),
    qualityStatus: quality.status,
    teacherConfirmationsRequired: quality.teacherConfirmationsRequired,
    qaStatus: 'NOT_RUN',
    teacherApproved: false,
    v84BudgetStatus: budgets.status,
  };
  return { manifest, privateLessonIR: structuredClone(lesson) };
};

type StudentProjection = ReturnType<typeof projectStudentSurface>;
type PublicLocale = 'vi' | 'en' | 'ja';

const waitingCopy: Record<PublicLocale, string> = {
  vi: 'Nhìn lên màn hình lớp và chờ giáo viên.',
  en: 'Look at the classroom screen and wait for the teacher.',
  ja: '教室の画面を見て、先生の指示を待ちましょう。',
};
const recallCopy: Record<PublicLocale, string> = {
  vi: 'Đã lưu. Nhìn lên màn hình lớp.',
  en: 'Saved. Look at the classroom screen.',
  ja: '保存しました。教室の画面を見ましょう。',
};
const handoffCopy: Record<PublicLocale, string> = {
  vi: 'Chuẩn bị làm nhiệm vụ trên thiết bị.',
  en: 'Get ready to work on your device.',
  ja: '端末で課題に取り組む準備をしましょう。',
};
const focusCopy: Record<PublicLocale, string> = {
  vi: 'Nhìn lên · Cùng quan sát và dự đoán.',
  en: 'Look up · Observe and make a prediction.',
  ja: '画面を見て、観察して予想しましょう。',
};

const localizeRoomCopy = (copy: { vi: string; en?: string; ja?: string }, locale: PublicLocale): string => copy[locale] ?? copy.vi;

export interface PublicSuccessCriterion {
  id: string;
  statement: { vi: string; en: string; ja: string };
}

export interface PublicRoomSnapshotV832 {
  roomId: string;
  packageId: string;
  lessonId: string;
  lessonVersion: string;
  contentHash: string;
  presenterLocale: 'vi' | 'en' | 'ja';
  activityId: string;
  activityPhase?: string;
  started: boolean;
  closed: boolean;
  closingRevision?: number;
  closingStatus?: 'collecting' | 'needs_teacher_review' | 'ready' | null;
  sessionRevision: number;
  substate: string;
  revealStep: number;
  visualStateId: string | null;
  attentionSurface: RoomStateV832['attentionSurface'];
  handoffState: RoomStateV832['handoffState'];
  timer: RoomStateV832['timer'];
  availablePresenterLocales: Array<'vi' | 'en' | 'ja'>;
  availableStudentLocales: Array<'vi' | 'en' | 'ja'>;
  presenter: ReturnType<typeof projectPresenterSurface>;
  studentByLocale: Record<'vi' | 'en' | 'ja', StudentProjection>;
  lobby?: { rosterCount: number; joinedCount: number };
  successCriteria: PublicSuccessCriterion[];
  nextStepOptions?: Array<{ id: string; label: { vi: string; en: string; ja: string } }>;
}

const publicNextStepOptions = (build: RuntimeBuildV832): PublicRoomSnapshotV832['nextStepOptions'] => {
  if (!build.privateExperiencePlan) return undefined;
  try {
    const plan = decodePrivateJson(build.privateExperiencePlan) as { closing?: { nextStepOptions?: unknown } };
    if (!Array.isArray(plan.closing?.nextStepOptions)) return undefined;
    const options = plan.closing.nextStepOptions.flatMap(item => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const value = item as Record<string, unknown>;
      const label = value.label && typeof value.label === 'object' && !Array.isArray(value.label)
        ? value.label as Record<string, unknown> : {};
      if (typeof value.id !== 'string' || typeof label.vi !== 'string' || !label.vi.trim()
        || typeof label.en !== 'string' || !label.en.trim() || typeof label.ja !== 'string' || !label.ja.trim()) return [];
      const vi = label.vi;
      return [{ id: value.id, label: { vi, en: label.en, ja: label.ja } }];
    });
    return options.length > 0 ? options : undefined;
  } catch { return undefined; }
};

/** Publish this DTO only for the current room state. The full IR stays private. */
export const projectPublicRoomSnapshot = (build: RuntimeBuildV832, room: RoomStateV832): PublicRoomSnapshotV832 => {
  const { manifest, privateLessonIR: lesson } = build;
  if (room.lessonId !== manifest.lessonId || room.lessonVersion !== manifest.lessonVersion
    || room.contentHash !== manifest.contentHash) throw new Error('PACKAGE_PIN_MISMATCH');
  const state = {
    activityId: room.activityId,
    questionBuildStepIndex: room.questionBuildStepIndex,
    visualStateId: room.visualStateId ?? undefined,
  };
  const presenter = projectPresenterSurface(lesson, { ...state, locale: room.presenterLocale });
  const activity = lesson.timeline.find(item => item.id === room.activityId);
  if (!activity) throw new Error(`ACTIVITY_NOT_FOUND:${room.activityId}`);
  const handoff = activity.surfaceHandoff;
  const presenterBeacon = !room.started ? { mode: 'LOOK_UP' as const, copy: waitingCopy[room.presenterLocale] }
    : room.handoffState === 'FOCUS_PRESENTER' && handoff?.toSurface === 'student_device'
      ? { mode: 'LOOK_UP' as const, copy: focusCopy[room.presenterLocale] }
      : room.handoffState === 'HANDOFF_TO_DEVICE' && handoff
        ? { mode: 'DEVICE' as const, copy: localizeRoomCopy(handoff.entry.presenterCue, room.presenterLocale) }
        : ['RECALL_TO_PRESENTER', 'DEBRIEF_CHOT'].includes(room.handoffState) && handoff
          ? { mode: 'LOOK_UP' as const, copy: localizeRoomCopy(handoff.recall.presenterCue, room.presenterLocale) }
          : presenter.attentionBeacon;
  const deviceMode = room.started && ['DEVICE_WORK', 'READY_TO_RECALL'].includes(room.handoffState);
  const publicPresenter = room.started ? {
    ...presenter,
    attentionBeacon: presenterBeacon,
    ...(deviceMode ? {
      copy: room.presenterLocale === 'vi' && activity.presenter.taskBridge?.trim()
        ? activity.presenter.taskBridge : localizeRoomCopy(activity.student.exactCopy, room.presenterLocale),
      questionBuild: [],
      visuals: activity.threeWayOrchestration.sharedContextRequired ? presenter.visuals : [],
    } : {}),
  } : {
    ...presenter,
    title: lesson.lesson.title[room.presenterLocale] ?? lesson.lesson.title.vi,
    copy: waitingCopy[room.presenterLocale],
    attentionBeacon: presenterBeacon,
    visuals: [],
    questionBuild: [],
    taskBridge: null,
  };
  const deviceWork = room.started && room.handoffState === 'DEVICE_WORK' && room.attentionSurface === 'student_device';
  const studentForLocale = (locale: PublicLocale): StudentProjection => {
    const projection = projectStudentSurface(lesson, { ...state, locale });
    if (deviceWork) return projection;
    const copy = !room.started ? waitingCopy[locale]
      : room.handoffState === 'HANDOFF_TO_DEVICE' ? handoffCopy[locale]
        : ['READY_TO_RECALL', 'RECALL_TO_PRESENTER', 'DEBRIEF_CHOT'].includes(room.handoffState)
          ? handoff ? localizeRoomCopy(handoff.recall.studentCue, locale) : recallCopy[locale]
          : waitingCopy[locale];
    return {
      ...projection,
      state: 'view_only',
      copy,
      interaction: 'none',
      requiredProduct: '',
      onSubmitState: 'wait',
      attentionBeacon: { mode: 'LOOK_UP', copy },
      visuals: [],
      questions: [],
    };
  };
  const nextSteps = publicNextStepOptions(build);
  return {
    roomId: room.roomId,
    packageId: manifest.packageId,
    lessonId: room.lessonId,
    lessonVersion: room.lessonVersion,
    contentHash: room.contentHash,
    presenterLocale: room.presenterLocale,
    activityId: room.activityId,
    activityPhase: activity.phase,
    started: room.started,
    closed: room.closed,
    ...(room.closingRevision !== undefined ? { closingRevision: room.closingRevision } : {}),
    sessionRevision: room.sessionRevision,
    substate: room.substate,
    revealStep: room.revealStep,
    visualStateId: room.visualStateId,
    attentionSurface: room.attentionSurface,
    handoffState: room.handoffState,
    timer: { ...room.timer },
    availablePresenterLocales: availablePresenterLocales(lesson),
    availableStudentLocales: availableStudentLocales(lesson),
    presenter: publicPresenter,
    studentByLocale: {
      vi: studentForLocale('vi'),
      en: studentForLocale('en'),
      ja: studentForLocale('ja'),
    },
    successCriteria: (lesson.learningDesign?.successCriteria ?? []).map(criterion => ({
      id: criterion.id,
      statement: {
        vi: criterion.statement.vi,
        en: criterion.statement.en ?? criterion.statement.vi,
        ja: criterion.statement.ja ?? criterion.statement.vi,
      },
    })),
    ...(nextSteps ? { nextStepOptions: nextSteps } : {}),
  };
};
