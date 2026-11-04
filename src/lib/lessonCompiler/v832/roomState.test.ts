import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { structuralLessonIR } from './lessonIR.testFixture';
import type { LessonIRV83 } from './lessonIRSchema';
import { applyPresenterRoomCommand, createRoomState, mergeRoomStateSnapshot, reconcileStudentRoomState } from './roomState';

const lessonWithTwoActivities = () => {
  const lesson = structuralLessonIR();
  lesson.timeline[0].durationSec = 1200;
  lesson.timeline[0].timingPolicy.plannedDurationSec = 1200;
  lesson.timeline[0].surfaceHandoff = {
    fromSurface: 'presenter', toSurface: 'student_device',
    entry: { presenterCue: { vi: 'Chuyển sang thiết bị' }, studentState: 'ready', coachState: 'prepare', durationSec: 4 },
    work: { durationSec: 1193, presenterMode: 'task_bridge', studentMode: 'interactive', coachMode: 'monitor' },
    recall: { presenterCue: { vi: 'Nhìn lên' }, studentCue: { vi: 'Đã lưu. Nhìn lên.' }, coachAction: 'Chốt', durationSec: 3 },
  };
  lesson.timeline.push({
    ...structuredClone(lesson.timeline[0]), id: 'A2', order: 2, phase: 'reflection',
    title: { vi: 'Nhìn lại' },
  });
  return lesson;
};

describe('V8.3.2 authoritative room cursor', () => {
  it('pins lesson version and hash for one room', () => {
    const lesson = lessonWithTwoActivities();
    const room = createRoomState(lesson, 'room-a', 'hash-a');
    expect(room).toMatchObject({
      roomId: 'room-a', lessonId: lesson.lesson.lessonId,
      lessonVersion: lesson.lesson.lessonVersion, contentHash: 'hash-a',
      activityId: 'A1', sessionRevision: 0,
    });
    expect(() => applyPresenterRoomCommand(lesson, room, { id: 'cmd-1', expectedRevision: 0, type: 'NEXT_ACTIVITY' }, 'hash-b'))
      .toThrow(/CONTENT_HASH_MISMATCH/);
  });

  it('follows a Presenter activity change while preserving a draft during same-activity updates', () => {
    const lesson = lessonWithTwoActivities();
    const room = createRoomState(lesson, 'room-a', 'hash-a');
    const sameActivity = applyPresenterRoomCommand(lesson, room, { id: 'start', expectedRevision: 0, type: 'START' }, 'hash-a');
    expect(reconcileStudentRoomState(room, sameActivity, { activityId: 'A1', text: 'đang gõ' })).toMatchObject({
      activityId: 'A1', draft: 'đang gõ', activityChanged: false,
    });
    const changed = applyPresenterRoomCommand(lesson, sameActivity, { id: 'next', expectedRevision: 1, type: 'NEXT_ACTIVITY' }, 'hash-a');
    expect(reconcileStudentRoomState(sameActivity, changed, { activityId: 'A1', text: 'đang gõ' })).toMatchObject({
      activityId: 'A2', draft: '', activityChanged: true,
    });
  });

  it('ignores stale snapshots and makes command retries idempotent', () => {
    const lesson = lessonWithTwoActivities();
    const initial = createRoomState(lesson, 'room-a', 'hash-a');
    const started = applyPresenterRoomCommand(lesson, initial, { id: 'start', expectedRevision: 0, type: 'START' }, 'hash-a');
    expect(mergeRoomStateSnapshot(started, initial)).toBe(started);
    expect(applyPresenterRoomCommand(lesson, started, { id: 'start', expectedRevision: 0, type: 'START' }, 'hash-a')).toBe(started);
    expect(() => applyPresenterRoomCommand(lesson, started, { id: 'stale', expectedRevision: 0, type: 'NEXT_ACTIVITY' }, 'hash-a'))
      .toThrow(/REVISION_CONFLICT/);
  });

  it('requires Presenter Chốt before the next activity and keeps keyboard on the same reducer', () => {
    const lesson = lessonWithTwoActivities();
    lesson.timeline[0].questionBuild = {
      mode: 'teacher_led_progressive', steps: [
        { type: 'question', id: 'Q1', content: { vi: 'Dự đoán?' } },
        { type: 'reveal', id: 'C1', label: { vi: 'Chốt' }, content: { vi: 'Kết luận.' } },
      ],
    };
    const room = applyPresenterRoomCommand(lesson, createRoomState(lesson, 'room-a', 'hash-a'),
      { id: 'start', expectedRevision: 0, type: 'START' }, 'hash-a');
    expect(() => applyPresenterRoomCommand(lesson, room, { id: 'skip', expectedRevision: 1, type: 'NEXT_ACTIVITY' }, 'hash-a'))
      .toThrow(/REVEAL_REQUIRED/);
    const revealed = applyPresenterRoomCommand(lesson, room, { id: 'reveal', expectedRevision: 1, type: 'REVEAL' }, 'hash-a');
    expect(revealed.questionBuildStepIndex).toBe(1);
    expect(applyPresenterRoomCommand(lesson, revealed, { id: 'next', expectedRevision: 2, type: 'NEXT_ACTIVITY' }, 'hash-a').activityId).toBe('A2');
  });

  it('synchronizes the whole surface handoff, not only activityId', () => {
    const lesson = lessonWithTwoActivities();
    const room = applyPresenterRoomCommand(lesson, createRoomState(lesson, 'room-a', 'hash-a'),
      { id: 'start', expectedRevision: 0, type: 'START' }, 'hash-a');
    const handoff = applyPresenterRoomCommand(lesson, room, { id: 'handoff', expectedRevision: 1, type: 'HANDOFF_TO_DEVICE' }, 'hash-a');
    const work = applyPresenterRoomCommand(lesson, handoff, { id: 'work', expectedRevision: 2, type: 'DEVICE_WORK' }, 'hash-a');
    const ready = applyPresenterRoomCommand(lesson, work, { id: 'ready', expectedRevision: 3, type: 'READY_TO_RECALL' }, 'hash-a');
    const recall = applyPresenterRoomCommand(lesson, ready, { id: 'recall', expectedRevision: 4, type: 'RECALL_TO_PRESENTER' }, 'hash-a');
    expect(handoff.handoffState).toBe('HANDOFF_TO_DEVICE');
    expect(work.attentionSurface).toBe('student_device');
    expect(recall).toMatchObject({
      activityId: 'A1', handoffState: 'RECALL_TO_PRESENTER', attentionSurface: 'presenter', sessionRevision: 5,
    });
  });

  it('keeps device work across adjacent activities with zero switch cost and a device beacon', () => {
    const lesson = lessonWithTwoActivities();
    lesson.timeline[0].threeWayOrchestration.primaryAttentionSurface = 'student_device';
    lesson.timeline[1].threeWayOrchestration.primaryAttentionSurface = 'student_device';
    lesson.timeline[1].surfaceHandoff = null;
    lesson.timeline[1].timingPolicy.surfaceSwitchCostSec = 0;
    lesson.timeline[1].attentionBeacon.mode = 'DEVICE';
    let room = applyPresenterRoomCommand(lesson, createRoomState(lesson, 'room-a', 'hash-a'),
      { id: 'start', expectedRevision: 0, type: 'START' }, 'hash-a');
    room = applyPresenterRoomCommand(lesson, room, { id: 'handoff', expectedRevision: 1, type: 'HANDOFF_TO_DEVICE' }, 'hash-a');
    room = applyPresenterRoomCommand(lesson, room, { id: 'device', expectedRevision: 2, type: 'DEVICE_WORK' }, 'hash-a');
    const next = applyPresenterRoomCommand(lesson, room, { id: 'next', expectedRevision: 3, type: 'NEXT_ACTIVITY' }, 'hash-a');
    expect(next).toMatchObject({ activityId: 'A2', handoffState: 'DEVICE_WORK', attentionSurface: 'student_device' });
  });

  it('still requires recall before leaving a device block for Presenter attention', () => {
    const lesson = lessonWithTwoActivities();
    lesson.timeline[1].surfaceHandoff = null;
    lesson.timeline[1].threeWayOrchestration.primaryAttentionSurface = 'presenter';
    let room = applyPresenterRoomCommand(lesson, createRoomState(lesson, 'room-a', 'hash-a'),
      { id: 'start', expectedRevision: 0, type: 'START' }, 'hash-a');
    room = applyPresenterRoomCommand(lesson, room, { id: 'handoff', expectedRevision: 1, type: 'HANDOFF_TO_DEVICE' }, 'hash-a');
    room = applyPresenterRoomCommand(lesson, room, { id: 'device', expectedRevision: 2, type: 'DEVICE_WORK' }, 'hash-a');
    expect(() => applyPresenterRoomCommand(lesson, room,
      { id: 'next', expectedRevision: 3, type: 'NEXT_ACTIVITY' }, 'hash-a')).toThrow(/RECALL_REQUIRED/);
  });

  it('rejects an incomplete Presenter translation without changing the room', () => {
    const lesson = lessonWithTwoActivities();
    const room = applyPresenterRoomCommand(lesson, createRoomState(lesson, 'room-a', 'hash-a'),
      { id: 'start', expectedRevision: 0, type: 'START' }, 'hash-a');
    expect(() => applyPresenterRoomCommand(lesson, room, {
      id: 'locale-en', expectedRevision: 1, type: 'SET_PRESENTER_LOCALE', presenterLocale: 'en',
    }, 'hash-a')).toThrow(/PRESENTER_LOCALE_INCOMPLETE/);
    expect(room.presenterLocale).toBe('vi');
  });

  it('lets Presenter choose an available projection language in the lobby before Start', () => {
    const lesson = JSON.parse(readFileSync('tests/fixtures/v832/11T38.lesson-ir-v8.3.2.validated.json', 'utf8')) as LessonIRV83;
    const room = createRoomState(lesson, 'room-a', 'hash-a');
    const localized = applyPresenterRoomCommand(lesson, room, {
      id: 'locale-en', expectedRevision: 0, type: 'SET_PRESENTER_LOCALE', presenterLocale: 'en',
    }, 'hash-a');
    expect(localized).toMatchObject({ started: false, presenterLocale: 'en', sessionRevision: 1 });
    expect(applyPresenterRoomCommand(lesson, localized, {
      id: 'start', expectedRevision: 1, type: 'START',
    }, 'hash-a')).toMatchObject({ started: true, presenterLocale: 'en' });
  });
});
