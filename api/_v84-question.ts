import type { VercelResponse } from '@vercel/node';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { stripUndefinedDeep } from './_firestore-sanitize.js';
import { applyPresenterRoomCommand, type PresenterRoomCommand, type RoomStateV832 } from '../src/lib/lessonCompiler/v832/roomState.js';
import type { RuntimeBuildV832 } from '../src/lib/lessonCompiler/v832/runtimePackage.js';
import { decodePrivateLessonIR } from '../src/lib/lessonCompiler/v832/privateJsonCodec.js';
import { reconcileDisconnected, snapshotCompletionRequiredSet, type PresenceLedger } from '../src/lib/lessonRuntime/v84/presence.js';
import {
  briefQuestion, extendQuestion, lockQuestionNow, openQuestion, prepareQuestion,
  reconcileQuestion, reopenQuestion, revealQuestion, showQuestionStats, submitQuestionResponse, type QuestionRun,
  excludeRequiredStudent, includeRequiredStudent, resolveDisconnectedBlocker,
  resolveConfirmedAbsence,
  pauseQuestion, resumeQuestion,
} from '../src/lib/lessonRuntime/v84/questionState.js';
import { revokeQuestionTiming } from '../src/lib/lessonRuntime/v84/timing.js';
import { projectV84RoomSnapshot } from '../src/lib/lessonRuntime/v84/projectRoom.js';
import { applyQuestionTiming, createRoomTiming, type RoomTimingV84 } from '../src/lib/lessonRuntime/v84/timing.js';
import { parseMathVisualExtension } from '../src/lib/lessonRuntime/v84/mathVisual/extension.js';
import { normalizeUnitCircleSubmission } from '../src/lib/lessonRuntime/v84/mathVisual/submission.js';
import { resolvePreviewQuestionWorkSec } from '../src/lib/lessonRuntime/v84/questionBudget.js';
import { materializeV84ClosingInTransaction } from './_v84-closing.js';

type Identity = { uid: string; anonymous: boolean };

class QuestionRequestError extends Error {
  constructor(readonly statusCode: number, message: string) { super(message); }
}

const safeId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:@-]{1,180}$/.test(value)) throw new QuestionRequestError(400, 'Mã không hợp lệ.');
  return value;
};

const roomData = (snapshot: FirebaseFirestore.DocumentSnapshot): FirebaseFirestore.DocumentData => {
  if (!snapshot.exists) throw new QuestionRequestError(404, 'Phòng không tồn tại.');
  const room = snapshot.data();
  if (room?.runtimeMode !== 'V84_CLASSROOM_PREVIEW' || !(room.expiresAt instanceof Timestamp)
    || room.expiresAt.toMillis() <= Date.now()) throw new QuestionRequestError(409, 'Phòng lớp học không còn hoạt động.');
  return room;
};

const questionAt = (build: RuntimeBuildV832, state: RoomStateV832, index: number) => {
  const activity = build.privateLessonIR.timeline.find(item => item.id === state.activityId);
  const instances = [...(activity?.questionInstances ?? [])].sort((left, right) => left.order - right.order);
  const instance = instances[index];
  const question = instance ? build.privateLessonIR.questions[instance.questionId] : null;
  return { activity, instances, instance, question };
};

const previewWorkSec = (build: RuntimeBuildV832, state: RoomStateV832, index: number): number => {
  const { activity, instance } = questionAt(build, state, index);
  if (!activity || !instance) throw new QuestionRequestError(409, 'Câu hỏi không khớp bài học.');
  try { return resolvePreviewQuestionWorkSec(activity, build.privateLessonIR.questions, instance.instanceId); }
  catch { throw new QuestionRequestError(409, 'Cần xác nhận ngân sách thời gian cho câu hỏi này.'); }
};

const projection = (build: RuntimeBuildV832, state: RoomStateV832, run: QuestionRun | null, ledger: PresenceLedger,
  timing: RoomTimingV84 | null) => stripUndefinedDeep({
  ...projectV84RoomSnapshot(build, state, run),
  ...(timing ? { clock: (() => {
    const index = build.privateLessonIR.timeline.findIndex(activity => activity.id === state.activityId);
    if (index < 0) throw new Error('ACTIVITY_NOT_FOUND');
    return {
      lessonStartedAtSec: timing.lessonStartedAtSec,
      activityStartedAtSec: timing.activityStartedAtSec,
      plannedActivityStartSec: build.privateLessonIR.timeline.slice(0, index)
        .reduce((sum, activity) => sum + activity.durationSec, 0),
      activityBudgetSec: build.privateLessonIR.timeline[index].durationSec,
      timeBankSec: timing.timeBankSec,
    };
  })() } : {}),
  lobby: {
    rosterCount: Object.keys(ledger).length,
    joinedCount: Object.values(ledger).filter(item => item.online === 'ACTIVE').length,
  },
  updatedAt: FieldValue.serverTimestamp(),
});

const creditLockedRun = (timing: RoomTimingV84 | null, before: QuestionRun | null,
  after: QuestionRun | null): RoomTimingV84 | null => {
  if (!timing || !before || !after || before.phase !== 'QUESTION_OPEN'
    || !['QUESTION_LOCKED', 'STATS', 'REVEAL'].includes(after.phase)) return timing;
  return applyQuestionTiming(timing, { runKey: `${after.instanceId}:${after.openedAtSec}`,
    savedWorkSec: after.savedWorkSec });
};

const advanceRevision = (state: RoomStateV832, commandId: string): RoomStateV832 => ({
  ...state,
  sessionRevision: state.sessionRevision + 1,
  processedCommandIds: [...state.processedCommandIds.slice(-99), commandId],
  updatedAt: Date.now(),
});

const presenterCommand = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, identity: Identity, res: VercelResponse,
) => {
  if (identity.anonymous) throw new QuestionRequestError(401, 'Cần tài khoản giáo viên.');
  const roomId = safeId(body.roomId);
  const raw = body.command as Record<string, unknown> | null;
  if (!raw) throw new QuestionRequestError(400, 'Thiếu lệnh Presenter.');
  const id = safeId(raw.id);
  const type = String(raw.type ?? '');
  if (!Number.isInteger(raw.expectedRevision) || (raw.expectedRevision as number) < 0) throw new QuestionRequestError(400, 'Revision không hợp lệ.');
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(roomRef);
    const room = roomData(snapshot);
    if (room.ownerUid !== identity.uid) throw new QuestionRequestError(403, 'Chỉ Presenter được điều khiển phòng.');
    const buildSnapshot = await transaction.get(db.collection('lessonV832Builds').doc(safeId(room.packageId)));
    if (!buildSnapshot.exists) throw new QuestionRequestError(409, 'Gói bài học không tồn tại.');
    const build = { ...buildSnapshot.data() } as RuntimeBuildV832;
    build.privateLessonIR = decodePrivateLessonIR(build.privateLessonIR);
    const current = room.roomState as RoomStateV832;
    if (current.contentHash !== build.manifest.contentHash) throw new QuestionRequestError(409, 'Phiên bản bài học không khớp phòng.');
    if (current.processedCommandIds.includes(id)) return { state: current, run: (room.questionRun ?? null) as QuestionRun | null };
    if (current.closed) throw new QuestionRequestError(409, 'Phòng đã kết thúc.');
    if (current.sessionRevision !== raw.expectedRevision) throw new QuestionRequestError(409, 'Revision đã đổi; tải lại màn hình.');
    if (current.timer.pausedAt !== null && !['PAUSE_TIMER', 'RESUME_TIMER', 'END', 'SET_PRESENTER_LOCALE',
      'EXTEND_15', 'EXTEND_30', 'LOCK_NOW', 'SHOW_STATS', 'REVEAL_QUESTION'].includes(type)) {
      throw new QuestionRequestError(409, 'Hãy tiếp tục đồng hồ trước khi chuyển câu hoặc hoạt động.');
    }
    let next = current;
    let run = (room.questionRun ?? null) as QuestionRun | null;
    let index = typeof room.questionCursorIndex === 'number' ? room.questionCursorIndex : 0;
    const nowSec = Date.now() / 1000;
    let reopenedRunKey: string | null = null;
    let overrideStudentId: string | null = null;
    if (type === 'PAUSE_TIMER' || type === 'RESUME_TIMER') {
      if (!current.started) throw new QuestionRequestError(409, 'Tiết học chưa bắt đầu.');
      next = current.timer.pausedAt !== null && type === 'PAUSE_TIMER' ? advanceRevision(current, id)
        : applyPresenterRoomCommand(build.privateLessonIR, current, {
          id, type, expectedRevision: current.sessionRevision, issuedAt: nowSec * 1000,
        }, build.manifest.contentHash);
      if (run) run = type === 'PAUSE_TIMER' ? pauseQuestion(run, nowSec) : resumeQuestion(run, nowSec);
    } else if (type === 'BRIEF_QUESTION') {
      if (!run || run.phase !== 'INTRO') throw new QuestionRequestError(409, 'Câu hỏi chưa ở bước giới thiệu.');
      run = briefQuestion(run);
      next = advanceRevision(current, id);
    } else if (['EXTEND_15', 'EXTEND_30', 'LOCK_NOW', 'SHOW_STATS', 'REVEAL_QUESTION'].includes(type)) {
      if (!run) throw new QuestionRequestError(409, 'Chưa có câu hỏi hiện tại.');
      try {
        if (type === 'EXTEND_15' || type === 'EXTEND_30') run = extendQuestion(run, type === 'EXTEND_15' ? 15 : 30);
        else if (type === 'LOCK_NOW') run = lockQuestionNow(run, nowSec);
        else if (type === 'SHOW_STATS') run = showQuestionStats(run, nowSec);
        else run = revealQuestion(run, nowSec);
      } catch (error) {
        throw new QuestionRequestError(409, error instanceof Error ? error.message : 'Không thực hiện được lệnh câu hỏi.');
      }
      next = advanceRevision(current, id);
    } else if (type === 'OPEN_QUESTION') {
      if (!run || run.phase !== 'QUESTION_BRIEF' || current.handoffState !== 'DEVICE_WORK') {
        throw new QuestionRequestError(409, 'Cần giới thiệu câu và chuyển sang thiết bị trước khi mở.');
      }
      const { activity, instance, question } = questionAt(build, current, index);
      if (!activity || !instance || !question || instance.instanceId !== run.instanceId) throw new QuestionRequestError(409, 'Câu hỏi không khớp bài học.');
      run = openQuestion({
        instanceId: instance.instanceId, activityId: current.activityId,
        requiredStudentIds: instance.required
          ? snapshotCompletionRequiredSet(room.presenceLedger as PresenceLedger, nowSec) : [],
        openedAtSec: nowSec,
        workBudgetSec: previewWorkSec(build, current, index),
        revealPolicy: activity.revealPolicy ?? 'teacher_manual',
      });
      next = advanceRevision(current, id);
    } else if (type === 'NEXT_QUESTION') {
      if (!run || !['REVEAL', 'STATS'].includes(run.phase) || (run.phase === 'STATS' && run.revealPolicy !== 'no_reveal')) {
        throw new QuestionRequestError(409, 'Câu hiện tại chưa hoàn tất.');
      }
      const following = questionAt(build, current, index + 1);
      if (!following.instance) throw new QuestionRequestError(409, 'Đây là câu cuối của hoạt động.');
      index += 1;
      run = briefQuestion(prepareQuestion(following.instance.instanceId, current.activityId,
        build.privateLessonIR.timeline.find(item => item.id === current.activityId)?.revealPolicy ?? 'teacher_manual'));
      next = advanceRevision(current, id);
    } else if (type === 'SKIP_OPTIONAL') {
      const { instance, instances } = questionAt(build, current, index);
      if (!instance || instance.required || !run || !['INTRO', 'QUESTION_BRIEF'].includes(run.phase)) {
        throw new QuestionRequestError(409, 'Chỉ bỏ qua được câu tùy chọn chưa mở.');
      }
      index += 1;
      const following = instances[index];
      run = following ? briefQuestion(prepareQuestion(following.instanceId, current.activityId,
        build.privateLessonIR.timeline.find(item => item.id === current.activityId)?.revealPolicy ?? 'teacher_manual')) : null;
      next = advanceRevision(current, id);
    } else if (type === 'REOPEN_SAFE') {
      if (!run) throw new QuestionRequestError(409, 'Chưa có câu hỏi để mở lại.');
      const { activity, instance, question } = questionAt(build, current, index);
      if (!activity || !instance || !question) throw new QuestionRequestError(409, 'Câu hỏi không khớp bài học.');
      reopenedRunKey = `${run.instanceId}:${run.openedAtSec}`;
      try { run = reopenQuestion(run, nowSec, previewWorkSec(build, current, index)); }
      catch (error) { throw new QuestionRequestError(409, error instanceof Error ? error.message : 'Không mở lại được câu hỏi.'); }
      next = advanceRevision(current, id);
    } else if (['INCLUDE_LATE_NOW', 'EXCLUDE_CURRENT', 'RESOLVE_DISCONNECT'].includes(type)) {
      if (!run || run.phase !== 'QUESTION_OPEN') throw new QuestionRequestError(409, 'Câu hỏi hiện không mở.');
      overrideStudentId = safeId(raw.studentId);
      const member = (room.presenceLedger as PresenceLedger)[overrideStudentId];
      if (!member) throw new QuestionRequestError(404, 'Học sinh không thuộc lớp đã chọn.');
      if (type === 'INCLUDE_LATE_NOW' && (member.attendance !== 'LATE_JOINED' || !member.claimUid)) {
        throw new QuestionRequestError(409, 'Chỉ tính HS đến muộn đã vào phòng.');
      }
      if (type === 'RESOLVE_DISCONNECT' && member.online !== 'DISCONNECTED') {
        throw new QuestionRequestError(409, 'HS này không ở trạng thái mất kết nối.');
      }
      try {
        if (type === 'INCLUDE_LATE_NOW') run = includeRequiredStudent(run, overrideStudentId);
        else if (type === 'EXCLUDE_CURRENT') run = excludeRequiredStudent(run, overrideStudentId, nowSec);
        else run = resolveDisconnectedBlocker(run, overrideStudentId, nowSec);
      } catch (error) {
        throw new QuestionRequestError(409, error instanceof Error ? error.message : 'Không đổi được nhóm cần nộp.');
      }
      next = advanceRevision(current, id);
    } else {
      if (type === 'NEXT_ACTIVITY' && run && !['REVEAL', 'STATS'].includes(run.phase)) {
        throw new QuestionRequestError(409, 'Cần hoàn tất câu hiện tại trước khi đổi hoạt động.');
      }
      const allowed: PresenterRoomCommand['type'][] = [
        'START', 'NEXT_ACTIVITY', 'PREV_ACTIVITY', 'HANDOFF_TO_DEVICE', 'DEVICE_WORK',
        'READY_TO_RECALL', 'RECALL_TO_PRESENTER', 'DEBRIEF_CHOT', 'SET_VISUAL_STATE',
        'SET_PRESENTER_LOCALE', 'PAUSE_TIMER', 'RESUME_TIMER', 'END',
      ];
      if (!allowed.includes(type as PresenterRoomCommand['type'])) throw new QuestionRequestError(400, 'Lệnh Presenter không hợp lệ.');
      next = applyPresenterRoomCommand(build.privateLessonIR, current, {
        id, type: type as PresenterRoomCommand['type'], expectedRevision: current.sessionRevision,
        issuedAt: Date.now(),
        ...(typeof raw.visualStateId === 'string' ? { visualStateId: raw.visualStateId } : {}),
        ...(typeof raw.presenterLocale === 'string' ? { presenterLocale: raw.presenterLocale as PresenterRoomCommand['presenterLocale'] } : {}),
      }, build.manifest.contentHash);
      if (type === 'START' || type === 'NEXT_ACTIVITY' || type === 'PREV_ACTIVITY') {
        index = 0;
        const first = questionAt(build, next, 0);
        run = first.instance ? prepareQuestion(first.instance.instanceId, next.activityId,
          first.activity?.revealPolicy ?? 'teacher_manual') : null;
      }
    }
    const ledger = room.presenceLedger as PresenceLedger;
    let timing = (room.v84Timing ?? null) as RoomTimingV84 | null;
    if (type === 'START') timing = createRoomTiming(nowSec, nowSec);
    else if (type === 'NEXT_ACTIVITY' || type === 'PREV_ACTIVITY') {
      if (timing) timing = { ...timing, activityStartedAtSec: nowSec };
    } else if (reopenedRunKey && timing) timing = revokeQuestionTiming(timing, reopenedRunKey);
    else timing = creditLockedRun(timing, room.questionRun as QuestionRun | null, run);
    const closing = type === 'END' ? await materializeV84ClosingInTransaction({
      db, transaction, roomRef, room, nextState: next, build,
    }) : null;
    const overrideTypes = new Set(['EXTEND_15', 'EXTEND_30', 'LOCK_NOW', 'SHOW_STATS', 'REVEAL_QUESTION',
      'SKIP_OPTIONAL', 'REOPEN_SAFE', 'INCLUDE_LATE_NOW', 'EXCLUDE_CURRENT', 'RESOLVE_DISCONNECT', 'PAUSE_TIMER', 'RESUME_TIMER']);
    const overrideAudit = Array.isArray(room.questionOverrideAudit) ? room.questionOverrideAudit as unknown[] : [];
    transaction.update(roomRef, { roomState: next, questionRun: run, questionCursorIndex: index,
      v84Timing: timing,
      ...(closing ? { closingRevision: closing.closingRevision, closingStatus: closing.status,
        closingReceipt: { materializationKey: closing.materializationKey, closingRevision: closing.closingRevision,
          contentHash: build.manifest.contentHash, status: closing.status } } : {}),
      ...(overrideTypes.has(type) ? { questionOverrideAudit: [...overrideAudit.slice(-99), {
        commandId: id, type, actorUid: identity.uid, atSec: nowSec, sessionRevision: next.sessionRevision,
        ...(overrideStudentId ? { studentId: overrideStudentId,
          completionRequiredSetBefore: (room.questionRun as QuestionRun | null)?.completionRequiredSet ?? [],
          completionRequiredSetAfter: run?.completionRequiredSet ?? [] } : {}),
      }] } : {}),
      updatedAt: FieldValue.serverTimestamp() });
    transaction.set(roomRef.collection('public').doc('current'), {
      ...projection(build, next, run, ledger, timing),
      ...(closing ? { closingRevision: closing.closingRevision, closingStatus: closing.status } : {}),
    });
    return { state: next, run };
  });
  return res.status(200).json({ roomId, sessionRevision: result.state.sessionRevision,
    activityId: result.state.activityId, questionPhase: result.run?.phase ?? null });
};

const submitResponse = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, identity: Identity, res: VercelResponse,
) => {
  const roomId = safeId(body.roomId);
  const instanceId = safeId(body.questionInstanceId);
  const nonce = safeId(body.clientNonce);
  const value = typeof body.value === 'string' ? body.value.trim() : '';
  if (!value || value.length > 4000) throw new QuestionRequestError(400, 'Bài làm phải có 1–4000 kí tự.');
  if (body.mode !== 'typed' && body.mode !== 'math') throw new QuestionRequestError(400, 'Kiểu nộp không hợp lệ.');
  const mode = body.mode;
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const participantRef = roomRef.collection('participants').doc(identity.uid);
  const result = await db.runTransaction(async transaction => {
    const [roomSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomRef), transaction.get(participantRef),
    ]);
    const room = roomData(roomSnapshot);
    if (!participantSnapshot.exists) throw new QuestionRequestError(403, 'Bạn chưa nhận tên trong phòng.');
    const participant = participantSnapshot.data();
    const studentId = safeId(participant?.studentId);
    const responseRef = roomRef.collection('responses').doc(`${studentId}__${instanceId}`);
    const responseSnapshot = await transaction.get(responseRef);
    const ledger = room.presenceLedger as PresenceLedger;
    if (ledger[studentId]?.claimUid !== identity.uid || ledger[studentId]?.online !== 'ACTIVE') {
      throw new QuestionRequestError(403, 'Phiên thiết bị không còn hợp lệ.');
    }
    const current = room.roomState as RoomStateV832;
    const buildSnapshot = await transaction.get(db.collection('lessonV832Builds').doc(safeId(room.packageId)));
    if (!buildSnapshot.exists) throw new QuestionRequestError(409, 'Gói bài học không tồn tại.');
    const build = { ...buildSnapshot.data() } as RuntimeBuildV832;
    build.privateLessonIR = decodePrivateLessonIR(build.privateLessonIR);
    const run = room.questionRun as QuestionRun | null;
    if (!current.started || current.closed || current.handoffState !== 'DEVICE_WORK' || !run
      || run.instanceId !== instanceId || run.activityId !== current.activityId) {
      throw new QuestionRequestError(409, 'Câu hỏi hiện không mở.');
    }
    const { question } = questionAt(build, current, room.questionCursorIndex as number);
    if (!question || !question.submissionModes.includes(mode)) throw new QuestionRequestError(409, 'Cách nộp không thuộc câu đang mở.');
    let persistedValue = value;
    const visualContract = question.visualRef ? parseMathVisualExtension(build.privateLessonIR)[question.visualRef] : undefined;
    if (visualContract && question.visualRef && build.privateLessonIR.visuals[question.visualRef]?.type === 'interactive_simulation') {
      if (visualContract.renderer !== 'unit_circle') throw new QuestionRequestError(422, 'Mô phỏng hình học này chưa có bộ trích xuất evidence.');
      if (mode !== 'typed') throw new QuestionRequestError(422, 'Mô phỏng này cần nộp evidence đã cấu trúc.');
      try { persistedValue = JSON.stringify(normalizeUnitCircleSubmission(visualContract, value)); }
      catch (error) { throw new QuestionRequestError(422, error instanceof Error ? error.message : 'Evidence mô phỏng không hợp lệ.'); }
    }
    const previous = responseSnapshot.exists ? responseSnapshot.data() : null;
    if (previous?.clientNonce === nonce && previous.questionOpenedAtSec === run.openedAtSec) {
      return { revision: previous.revision as number, duplicate: true, run };
    }
    if (current.timer.pausedAt !== null || run.pausedAtSec !== undefined) {
      throw new QuestionRequestError(409, 'Giáo viên đang tạm dừng. Bản nháp được giữ trên thiết bị.');
    }
    const reconciled = reconcileQuestion(run, Date.now() / 1000);
    if (reconciled !== run) {
      const timing = creditLockedRun((room.v84Timing ?? null) as RoomTimingV84 | null, run, reconciled);
      transaction.update(roomRef, { questionRun: reconciled, v84Timing: timing, updatedAt: FieldValue.serverTimestamp() });
      transaction.set(roomRef.collection('public').doc('current'), projection(build, current, reconciled, ledger, timing));
      return { revision: 0, duplicate: false, run: reconciled, rejected: true };
    }
    let next: QuestionRun;
    try { next = submitQuestionResponse(run, studentId, Date.now() / 1000, persistedValue); }
    catch (error) {
      if (error instanceof Error && error.message === 'QUESTION_LOCKED') throw new QuestionRequestError(409, 'Câu trả lời đã khóa.');
      throw error;
    }
    const revision = previous?.questionOpenedAtSec === run.openedAtSec && typeof previous.revision === 'number'
      ? previous.revision + 1 : 1;
    const payload = { participantUid: identity.uid, studentId, roomId, activityId: current.activityId,
      questionInstanceId: instanceId, questionId: question.id, questionOpenedAtSec: run.openedAtSec,
      clientNonce: nonce, value: persistedValue, mode, revision, submittedAt: FieldValue.serverTimestamp() };
    transaction.set(responseRef, payload);
    transaction.set(responseRef.collection('revisions').doc(`${Math.floor(run.openedAtSec * 1000)}-${revision}`), payload);
    const timing = creditLockedRun((room.v84Timing ?? null) as RoomTimingV84 | null, run, next);
    transaction.update(roomRef, { questionRun: next, v84Timing: timing, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(roomRef.collection('public').doc('current'), projection(build, current, next, ledger, timing));
    return { revision, duplicate: false, run: next };
  });
  if ('rejected' in result && result.rejected) return res.status(409).json({ roomId,
    error: 'Câu trả lời đã khóa.', questionPhase: result.run.phase });
  return res.status(200).json({ roomId, questionInstanceId: instanceId, revision: result.revision,
    duplicate: result.duplicate, questionPhase: result.run.phase });
};

const tickRoom = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, identity: Identity, res: VercelResponse,
) => {
  if (identity.anonymous) throw new QuestionRequestError(401, 'Cần tài khoản giáo viên.');
  const roomId = safeId(body.roomId);
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(roomRef);
    const room = roomData(snapshot);
    if (room.ownerUid !== identity.uid) throw new QuestionRequestError(403, 'Chỉ Presenter được điều khiển phòng.');
    const state = room.roomState as RoomStateV832;
    if (state.closed || !state.started) return (room.questionRun ?? null) as QuestionRun | null;
    const nowSec = Date.now() / 1000;
    const currentLedger = room.presenceLedger as PresenceLedger;
    const ledger = reconcileDisconnected(currentLedger, nowSec, 15);
    const run = room.questionRun as QuestionRun | null;
    let next = run && state.timer.pausedAt === null ? reconcileQuestion(run, nowSec) : run;
    if (next?.phase === 'QUESTION_OPEN' && state.timer.pausedAt === null) {
      for (const studentId of next.completionRequiredSet) {
        if (next.phase !== 'QUESTION_OPEN') break;
        const presence = ledger[studentId];
        if (presence?.online === 'DISCONNECTED' && (presence.graceUntil ?? Infinity) < nowSec
          && !next.responseSet.includes(studentId) && !next.nonBlockingRequiredSet.includes(studentId)) {
          next = resolveDisconnectedBlocker(next, studentId, nowSec);
        } else if ((presence?.attendance === 'ABSENT_CONFIRMED' || presence?.attendance === 'LEFT_CONFIRMED')
          && !next.responseSet.includes(studentId) && !next.nonBlockingRequiredSet.includes(studentId)) {
          next = resolveConfirmedAbsence(next, studentId, nowSec,
            presence.attendance === 'LEFT_CONFIRMED' ? 'CONFIRMED_LEFT' : 'CONFIRMED_ABSENCE');
        }
      }
    }
    if (next === run && ledger === currentLedger) return run;
    const buildSnapshot = await transaction.get(db.collection('lessonV832Builds').doc(safeId(room.packageId)));
    if (!buildSnapshot.exists) throw new QuestionRequestError(409, 'Gói bài học không tồn tại.');
    const build = { ...buildSnapshot.data() } as RuntimeBuildV832;
    build.privateLessonIR = decodePrivateLessonIR(build.privateLessonIR);
    const timing = creditLockedRun((room.v84Timing ?? null) as RoomTimingV84 | null, run, next);
    transaction.update(roomRef, { questionRun: next, presenceLedger: stripUndefinedDeep(ledger),
      v84Timing: timing, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(roomRef.collection('public').doc('current'), projection(build, state, next, ledger, timing));
    return next;
  });
  return res.status(200).json({ roomId, questionPhase: result?.phase ?? null });
};

export const handleV84QuestionAction = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, identity: Identity, res: VercelResponse,
): Promise<boolean> => {
  const action = String(body.action ?? '');
  if (!['v84PresenterCommand', 'v84SubmitResponse', 'v84TickRoom'].includes(action)) return false;
  try {
    if (action === 'v84PresenterCommand') await presenterCommand(db, body, identity, res);
    else if (action === 'v84SubmitResponse') await submitResponse(db, body, identity, res);
    else await tickRoom(db, body, identity, res);
  } catch (error) {
    if (error instanceof QuestionRequestError) res.status(error.statusCode).json({ error: error.message });
    else if (error instanceof Error && /^(REVISION_CONFLICT|REVEAL_REQUIRED|RECALL_REQUIRED|HANDOFF_STATE_INVALID|ROOM_NOT_STARTED|ROOM_CLOSED)/.test(error.message)) {
      res.status(409).json({ error: error.message });
    } else { console.error('[v84-question] failed', error); res.status(500).json({ error: 'Không điều phối được câu hỏi.' }); }
  }
  return true;
};
