import type { LessonIRV83 } from './lessonIRSchema';
import type { AttentionSurface } from './lessonIR.generated';
import { availablePresenterLocales } from './localeAvailability';
import { resolveActivityVisualStateRef } from './visualStateRef';

export type SurfaceHandoffState =
  | 'FOCUS_PRESENTER'
  | 'HANDOFF_TO_DEVICE'
  | 'DEVICE_WORK'
  | 'READY_TO_RECALL'
  | 'RECALL_TO_PRESENTER'
  | 'DEBRIEF_CHOT'
  | 'NEXT';

export interface ActivityRoomProgress {
  questionBuildStepIndex: number;
  visualStateId: string | null;
  handoffState: SurfaceHandoffState;
}

export interface RoomStateV832 {
  roomId: string;
  lessonId: string;
  lessonVersion: string;
  contentHash: string;
  started: boolean;
  closed: boolean;
  joinOpen: boolean;
  presenterLocale: 'vi' | 'en' | 'ja';
  activityId: string;
  substate: string;
  questionBuildStepIndex: number;
  revealStep: number;
  visualStateId: string | null;
  attentionSurface: AttentionSurface;
  handoffState: SurfaceHandoffState;
  timer: { durationSec: number; startedAt: number | null; pausedAt: number | null };
  sessionRevision: number;
  closingRevision?: number;
  processedCommandIds: string[];
  activityProgress: Record<string, ActivityRoomProgress>;
  updatedAt: number;
}

export type PresenterRoomCommandType =
  | 'START' | 'NEXT_ACTIVITY' | 'PREV_ACTIVITY' | 'REVEAL' | 'QUESTION_NEXT'
  | 'HANDOFF_TO_DEVICE' | 'DEVICE_WORK' | 'READY_TO_RECALL'
  | 'RECALL_TO_PRESENTER' | 'DEBRIEF_CHOT' | 'SET_VISUAL_STATE' | 'SET_PRESENTER_LOCALE'
  | 'PAUSE_TIMER' | 'RESUME_TIMER' | 'END';

export interface PresenterRoomCommand {
  id: string;
  expectedRevision: number;
  type: PresenterRoomCommandType;
  visualStateId?: string;
  presenterLocale?: 'vi' | 'en' | 'ja';
  issuedAt?: number;
}

const activityAt = (lesson: LessonIRV83, activityId: string) => {
  const index = lesson.timeline.findIndex(activity => activity.id === activityId);
  if (index < 0) throw new Error(`ACTIVITY_NOT_FOUND:${activityId}`);
  return { index, activity: lesson.timeline[index] };
};

export const canContinueDeviceWork = (lesson: LessonIRV83, activityId: string): boolean => {
  const { activity, index } = activityAt(lesson, activityId);
  const following = lesson.timeline[index + 1];
  return Boolean(following
    && activity.threeWayOrchestration.primaryAttentionSurface === 'student_device'
    && following.threeWayOrchestration.primaryAttentionSurface === 'student_device'
    && !following.surfaceHandoff && following.timingPolicy.surfaceSwitchCostSec === 0
    && following.attentionBeacon.mode === 'DEVICE');
};

const initialVisualStateId = (lesson: LessonIRV83, activityId: string): string | null => {
  const { activity } = activityAt(lesson, activityId);
  const visualId = activity.presenter.visualRefs?.[0] ?? activity.student.visualRefs?.[0];
  return visualId ? lesson.visuals[visualId]?.defaultStateId ?? null : null;
};

export const createRoomState = (lesson: LessonIRV83, roomId: string, contentHash: string): RoomStateV832 => {
  const activity = lesson.timeline[0];
  if (!activity) throw new Error('LESSON_TIMELINE_EMPTY');
  if (!roomId.trim() || !contentHash.trim()) throw new Error('ROOM_ID_AND_CONTENT_HASH_REQUIRED');
  return {
    roomId,
    lessonId: lesson.lesson.lessonId,
    lessonVersion: lesson.lesson.lessonVersion,
    contentHash,
    started: false,
    closed: false,
    joinOpen: true,
    presenterLocale: 'vi',
    activityId: activity.id,
    substate: 'waiting',
    questionBuildStepIndex: 0,
    revealStep: 0,
    visualStateId: initialVisualStateId(lesson, activity.id),
    attentionSurface: 'presenter',
    handoffState: 'FOCUS_PRESENTER',
    timer: { durationSec: activity.durationSec, startedAt: null, pausedAt: null },
    sessionRevision: 0,
    processedCommandIds: [],
    activityProgress: {},
    updatedAt: Date.now(),
  };
};

const saveActivityProgress = (room: RoomStateV832): void => {
  room.activityProgress[room.activityId] = {
    questionBuildStepIndex: room.questionBuildStepIndex,
    visualStateId: room.visualStateId,
    handoffState: room.handoffState,
  };
};

const moveToActivity = (lesson: LessonIRV83, room: RoomStateV832, activityId: string, now: number,
  keepDeviceWork = false): void => {
  saveActivityProgress(room);
  const { activity } = activityAt(lesson, activityId);
  const previous = room.activityProgress[activity.id];
  room.activityId = activity.id;
  room.questionBuildStepIndex = previous?.questionBuildStepIndex ?? 0;
  room.revealStep = room.questionBuildStepIndex;
  room.visualStateId = previous?.visualStateId ?? initialVisualStateId(lesson, activity.id);
  room.handoffState = keepDeviceWork ? 'DEVICE_WORK' : previous?.handoffState ?? 'FOCUS_PRESENTER';
  room.attentionSurface = ['DEVICE_WORK', 'READY_TO_RECALL'].includes(room.handoffState)
    ? 'student_device' : 'presenter';
  room.substate = room.handoffState;
  room.timer = { durationSec: activity.durationSec, startedAt: now, pausedAt: null };
  if (/(?:^|_)(exit|reflection|closing|postcheck|self_assessment)(?:$|_)/i.test(activity.phase)) {
    room.closingRevision = room.sessionRevision + 1;
  }
};

const requireHandoffState = (actual: SurfaceHandoffState, required: SurfaceHandoffState, command: string): void => {
  if (actual !== required) throw new Error(`HANDOFF_STATE_INVALID:${command}:${actual}`);
};

const validateVisualState = (lesson: LessonIRV83, activityId: string, visualStateId: string | undefined): string => {
  if (!visualStateId) throw new Error('VISUAL_STATE_REQUIRED');
  const { activity } = activityAt(lesson, activityId);
  if (!activity.visualStateRefs?.includes(visualStateId)) throw new Error(`VISUAL_STATE_NOT_ALLOWED:${visualStateId}`);
  const resolved = resolveActivityVisualStateRef(lesson, activity, visualStateId);
  if (!resolved) throw new Error(`VISUAL_STATE_NOT_FOUND:${visualStateId}`);
  return resolved.stateId;
};

/** Pure reducer. The Firestore adapter must authorize the actor and transact on sessionRevision. */
export const applyPresenterRoomCommand = (
  lesson: LessonIRV83,
  current: RoomStateV832,
  command: PresenterRoomCommand,
  expectedContentHash: string,
): RoomStateV832 => {
  if (current.lessonId !== lesson.lesson.lessonId || current.lessonVersion !== lesson.lesson.lessonVersion) {
    throw new Error('LESSON_VERSION_MISMATCH');
  }
  if (current.contentHash !== expectedContentHash) throw new Error('CONTENT_HASH_MISMATCH');
  if (!command.id.trim()) throw new Error('COMMAND_ID_REQUIRED');
  if (current.processedCommandIds.includes(command.id)) return current;
  if (command.expectedRevision !== current.sessionRevision) throw new Error('REVISION_CONFLICT');
  if (current.closed) throw new Error('ROOM_CLOSED');
  if (!current.started && !['START', 'END', 'SET_PRESENTER_LOCALE'].includes(command.type)) throw new Error('ROOM_NOT_STARTED');
  const next: RoomStateV832 = structuredClone(current);
  const now = command.issuedAt ?? Date.now();
  const { activity, index } = activityAt(lesson, current.activityId);

  switch (command.type) {
    case 'START':
      if (current.started) throw new Error('ROOM_ALREADY_STARTED');
      next.started = true;
      next.substate = 'FOCUS_PRESENTER';
      next.timer.startedAt = now;
      if (/(?:^|_)(exit|reflection|closing|postcheck|self_assessment)(?:$|_)/i.test(activity.phase)) {
        next.closingRevision = current.sessionRevision + 1;
      }
      break;
    case 'NEXT_ACTIVITY': {
      if (activity.questionBuild && current.questionBuildStepIndex < activity.questionBuild.steps.length - 1) {
        throw new Error('REVEAL_REQUIRED');
      }
      const following = lesson.timeline[index + 1];
      if (!following) throw new Error('LAST_ACTIVITY');
      const keepDeviceWork = current.handoffState === 'DEVICE_WORK' && canContinueDeviceWork(lesson, activity.id);
      if (['HANDOFF_TO_DEVICE', 'DEVICE_WORK', 'READY_TO_RECALL'].includes(current.handoffState)
        && !keepDeviceWork) throw new Error('RECALL_REQUIRED');
      moveToActivity(lesson, next, following.id, now, keepDeviceWork);
      break;
    }
    case 'PREV_ACTIVITY': {
      const previous = lesson.timeline[index - 1];
      if (!previous) throw new Error('FIRST_ACTIVITY');
      moveToActivity(lesson, next, previous.id, now);
      break;
    }
    case 'REVEAL':
    case 'QUESTION_NEXT': {
      const steps = activity.questionBuild?.steps;
      if (!steps) throw new Error('QUESTION_BUILD_NOT_AVAILABLE');
      const upcoming = steps[current.questionBuildStepIndex + 1];
      if (!upcoming) throw new Error('QUESTION_BUILD_COMPLETE');
      if (command.type === 'REVEAL' && upcoming.type !== 'reveal') throw new Error('CHOT_NOT_NEXT');
      if (command.type === 'QUESTION_NEXT' && upcoming.type === 'reveal') throw new Error('CHOT_CONTROL_REQUIRED');
      next.questionBuildStepIndex += 1;
      next.revealStep = next.questionBuildStepIndex;
      if (upcoming.type === 'highlight') next.visualStateId = validateVisualState(lesson, activity.id, upcoming.visualStateId);
      break;
    }
    case 'HANDOFF_TO_DEVICE':
      requireHandoffState(current.handoffState, 'FOCUS_PRESENTER', command.type);
      if (activity.surfaceHandoff?.toSurface !== 'student_device') throw new Error('SURFACE_HANDOFF_REQUIRED');
      next.handoffState = 'HANDOFF_TO_DEVICE';
      next.attentionSurface = 'presenter';
      next.substate = next.handoffState;
      break;
    case 'DEVICE_WORK':
      requireHandoffState(current.handoffState, 'HANDOFF_TO_DEVICE', command.type);
      next.handoffState = 'DEVICE_WORK';
      next.attentionSurface = 'student_device';
      next.substate = next.handoffState;
      break;
    case 'READY_TO_RECALL':
      requireHandoffState(current.handoffState, 'DEVICE_WORK', command.type);
      next.handoffState = 'READY_TO_RECALL';
      next.attentionSurface = 'student_device';
      next.substate = next.handoffState;
      break;
    case 'RECALL_TO_PRESENTER':
      requireHandoffState(current.handoffState, 'READY_TO_RECALL', command.type);
      next.handoffState = 'RECALL_TO_PRESENTER';
      next.attentionSurface = 'presenter';
      next.substate = next.handoffState;
      break;
    case 'DEBRIEF_CHOT':
      requireHandoffState(current.handoffState, 'RECALL_TO_PRESENTER', command.type);
      next.handoffState = 'DEBRIEF_CHOT';
      next.attentionSurface = 'presenter';
      next.substate = next.handoffState;
      break;
    case 'SET_VISUAL_STATE':
      next.visualStateId = validateVisualState(lesson, activity.id, command.visualStateId);
      break;
    case 'SET_PRESENTER_LOCALE':
      if (!command.presenterLocale || !['vi', 'en', 'ja'].includes(command.presenterLocale)) throw new Error('PRESENTER_LOCALE_INVALID');
      if (!availablePresenterLocales(lesson).includes(command.presenterLocale)) throw new Error('PRESENTER_LOCALE_INCOMPLETE');
      next.presenterLocale = command.presenterLocale;
      break;
    case 'PAUSE_TIMER':
      next.timer.pausedAt = now;
      break;
    case 'RESUME_TIMER':
      if (next.timer.pausedAt !== null && next.timer.startedAt !== null) {
        next.timer.startedAt += now - next.timer.pausedAt;
        next.timer.pausedAt = null;
      }
      break;
    case 'END':
      next.started = false;
      next.closed = true;
      next.joinOpen = false;
      next.substate = 'closed';
      break;
  }

  next.processedCommandIds = [...next.processedCommandIds.slice(-99), command.id];
  next.sessionRevision = current.sessionRevision + 1;
  next.updatedAt = now;
  return next;
};

export const mergeRoomStateSnapshot = (current: RoomStateV832 | null, incoming: RoomStateV832): RoomStateV832 => {
  if (!current) return incoming;
  if (current.roomId !== incoming.roomId || current.lessonVersion !== incoming.lessonVersion
    || current.contentHash !== incoming.contentHash) throw new Error('ROOM_SNAPSHOT_IDENTITY_MISMATCH');
  return incoming.sessionRevision > current.sessionRevision ? incoming : current;
};

export const reconcileStudentRoomState = (
  current: RoomStateV832,
  incoming: RoomStateV832,
  focusedDraft: { activityId: string; text: string },
): { activityId: string; draft: string; activityChanged: boolean } => {
  const accepted = mergeRoomStateSnapshot(current, incoming);
  const activityChanged = accepted.activityId !== current.activityId;
  return {
    activityId: accepted.activityId,
    draft: !activityChanged && focusedDraft.activityId === accepted.activityId ? focusedDraft.text : '',
    activityChanged,
  };
};
