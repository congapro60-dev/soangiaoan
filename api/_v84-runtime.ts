import type { VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { stripUndefinedDeep } from './_firestore-sanitize.js';
import type { V832TokenVerifier } from './_v832-runtime.js';
import { readClassAccess } from './_classroom-access.js';
import { handleV84QuestionAction } from './_v84-question.js';
import { parseMathVisualExtension } from '../src/lib/lessonRuntime/v84/mathVisual/extension.js';
import { unitCirclePosition, validateUnitCircleInvariant } from '../src/lib/lessonRuntime/v84/mathVisual/unitCircle.js';
import { createRoomState } from '../src/lib/lessonCompiler/v832/roomState.js';
import { commitPreviewRoom, PreviewError } from './_v871-preview.js';
import { projectPublicRoomSnapshot, type RuntimeBuildV832 } from '../src/lib/lessonCompiler/v832/runtimePackage.js';
import { decodePrivateLessonIR } from '../src/lib/lessonCompiler/v832/privateJsonCodec.js';
import {
  claimStudent, createPresenceLedger, markAttendance, recordHeartbeat, resetDeviceClaim,
  requestLeave, transferDeviceClaim, type PresenceLedger, type RosterMember,
} from '../src/lib/lessonRuntime/v84/presence.js';
import { validateSelfAssessment } from '../src/lib/lessonRuntime/v84/selfAssessment.js';
import { readV84NextStepOptions } from './_v84-closing.js';
import { projectV84OwnNextStep, validateV84NextStepSubmission } from '../src/lib/lessonRuntime/v84/closingNextStep.js';

class V84Error extends Error {
  constructor(readonly code: number, message: string) { super(message); }
}

const safeId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:@-]{1,180}$/.test(value)) throw new V84Error(400, 'Mã không hợp lệ.');
  return value;
};

const defaultVerify: V832TokenVerifier = async token => {
  if (typeof token !== 'string' || !token) return null;
  try {
    const identity = await getAuth().verifyIdToken(token);
    return { uid: identity.uid, anonymous: identity.firebase?.sign_in_provider === 'anonymous' };
  } catch { return null; }
};

const verifyRoom = async (db: FirebaseFirestore.Firestore, roomId: string) => {
  const ref = db.collection('lessonV832Rooms').doc(roomId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new V84Error(404, 'Phòng không tồn tại.');
  const data = snapshot.data();
  if (data?.runtimeMode !== 'V84_CLASSROOM_PREVIEW' || !(data.expiresAt instanceof Timestamp)
    || data.expiresAt.toMillis() <= Date.now()) throw new V84Error(409, 'Phòng lớp học không còn hoạt động.');
  return { ref, data };
};

const lobbyCounts = (ledger: PresenceLedger) => ({
  rosterCount: Object.keys(ledger).length,
  joinedCount: Object.values(ledger).filter(student => student.online === 'ACTIVE').length,
});

const deviceHash = (value: unknown): string => {
  if (typeof value !== 'string' || value.length < 8 || value.length > 200) throw new V84Error(400, 'Mã thiết bị không hợp lệ.');
  return createHash('sha256').update(value).digest('hex');
};

const createClassPreviewRoom = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse,
) => {
  const packageId = safeId(body.packageId);
  const classId = safeId(body.classId);
  const buildSnapshot = await db.collection('lessonV832Builds').doc(packageId).get();
  if (!buildSnapshot.exists) throw new V84Error(404, 'Không tìm thấy gói bài học.');
  const build = { ...buildSnapshot.data() } as RuntimeBuildV832 & { ownerUid: string };
  build.privateLessonIR = decodePrivateLessonIR(build.privateLessonIR);
  if (build.ownerUid !== uid) throw new V84Error(403, 'Bạn không sở hữu bài học này.');
  const classContext = await readClassAccess(db, classId, uid);
  if (!classContext) throw new V84Error(403, 'Bạn không có quyền dùng lớp này.');
  const lessonGrade = build.privateLessonIR.lesson.grade;
  if (lessonGrade === undefined || lessonGrade === null || !String(lessonGrade).trim()) {
    throw new V84Error(409, 'Bài học cần xác minh khối lớp trước khi gắn lớp thật.');
  }
  if (String(lessonGrade).trim() !== String(classContext.data.grade ?? '').trim()) {
    throw new V84Error(409, 'Khối lớp không khớp bài học.');
  }
  const students = await classContext.ref.collection('students').get();
  const roster: RosterMember[] = students.docs.map(student => ({
    studentId: student.id, name: String(student.data().name ?? '').trim(),
  })).filter(student => student.name).sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  const roomRef = db.collection('lessonV832Rooms').doc();
  const roomState = createRoomState(build.privateLessonIR, roomRef.id, build.manifest.contentHash);
  const expiresAt = Timestamp.fromMillis(Date.now() + Math.max(2 * 60 * 60 * 1000, build.privateLessonIR.lesson.runtimeMin * 60_000 + 60 * 60 * 1000));
  const projection = projectPublicRoomSnapshot(build, roomState);
  const roomDocument = {
    ownerUid: uid, packageId, lessonId: build.manifest.lessonId,
    lessonVersion: build.manifest.lessonVersion, contentHash: build.manifest.contentHash,
    mode: 'PREVIEW_ONLY', runtimeMode: 'V84_CLASSROOM_PREVIEW', roomState,
    questionRun: null, questionCursorIndex: 0, v84Timing: null,
    classBinding: { classId, className: String(classContext.data.name ?? ''), grade: String(classContext.data.grade ?? ''), roster },
    presenceLedger: createPresenceLedger(roster),
    expiresAt, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  };
  await commitPreviewRoom(db,build,roomRef,roomDocument,{
    ...projection, activeQuestion: null,
    lobby: { rosterCount: roster.length, joinedCount: 0 }, updatedAt: FieldValue.serverTimestamp(),
  });
  return res.status(200).json({ roomId: roomRef.id, status: 'PREVIEW_ONLY',
    links: {
      presenter: `/v832-room/${roomRef.id}?role=presenter`, tv: `/v832-room/${roomRef.id}?role=tv`,
      student: `/v832-room/${roomRef.id}?role=student`, coach: `/v832-room/${roomRef.id}?role=coach`,
    },
  });
};

const readRoomRoster = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, res: VercelResponse) => {
  const roomId = safeId(body.roomId);
  const { data } = await verifyRoom(db, roomId);
  const roster = (data?.classBinding?.roster ?? []) as RosterMember[];
  return res.status(200).json({ roomId, className: data?.classBinding?.className ?? '', students: roster.map(student => ({
    studentId: student.studentId, name: student.name,
  })) });
};

const claimRoomStudent = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse,
) => {
  const roomId = safeId(body.roomId);
  const studentId = safeId(body.studentId);
  const tokenHash = deviceHash(body.deviceToken);
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists) throw new V84Error(404, 'Phòng không tồn tại.');
    const room = snapshot.data();
    if (room?.runtimeMode !== 'V84_CLASSROOM_PREVIEW' || !(room.expiresAt instanceof Timestamp)
      || room.expiresAt.toMillis() <= Date.now()) throw new V84Error(409, 'Phòng lớp học không còn hoạt động.');
    if (room.roomState?.closed || !room.roomState?.joinOpen) throw new V84Error(409, 'Phòng đã đóng nhận học sinh.');
    const ledger = room.presenceLedger as PresenceLedger;
    if (!ledger?.[studentId]) throw new V84Error(404, 'Không tìm thấy học sinh trong lớp đã chọn.');
    if (Object.values(ledger).some(student => student.studentId !== studentId && student.claimUid === uid)) {
      throw new V84Error(409, 'Thiết bị đã nhận tên học sinh khác trong phòng.');
    }
    let next: PresenceLedger;
    try { next = claimStudent(ledger, studentId, uid, tokenHash, Date.now() / 1000, Boolean(room.roomState.started)); }
    catch (error) {
      if (!(error instanceof Error) || error.message !== 'DUPLICATE_CLAIM') {
        throw new V84Error(409, error instanceof Error ? error.message : 'Không nhận được tên học sinh.');
      }
      transaction.update(roomRef, {
        pendingClaims: { ...(room.pendingClaims ?? {}), [studentId]: { uid, tokenHash, requestedAtSec: Date.now() / 1000 } },
        updatedAt: FieldValue.serverTimestamp(),
      });
      return 'DUPLICATE_CLAIM';
    }
    transaction.update(roomRef, { presenceLedger: stripUndefinedDeep(next), updatedAt: FieldValue.serverTimestamp() });
    transaction.set(roomRef.collection('participants').doc(uid), {
      participantUid: uid, studentId, displayName: ledger[studentId].name,
      roomId, mode: 'class_preview', joinedAt: FieldValue.serverTimestamp(),
    });
    const publicRef = roomRef.collection('public').doc('current');
    transaction.update(publicRef, {
      lobby: lobbyCounts(next),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return 'JOINED';
  });
  if (result === 'DUPLICATE_CLAIM') throw new V84Error(409, 'Tên này đã được nhận trên thiết bị khác. Giáo viên cần xác nhận chuyển máy.');
  return res.status(200).json({ roomId, studentId, joined: true });
};

const heartbeat = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse,
) => {
  const roomId = safeId(body.roomId);
  const studentId = safeId(body.studentId);
  const tokenHash = deviceHash(body.deviceToken);
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(roomRef);
    const room = snapshot.data();
    if (!snapshot.exists || room?.runtimeMode !== 'V84_CLASSROOM_PREVIEW') throw new V84Error(404, 'Phòng không tồn tại.');
    if (!(room.expiresAt instanceof Timestamp) || room.expiresAt.toMillis() <= Date.now() || room.roomState?.closed) {
      throw new V84Error(409, 'Phòng lớp học không còn hoạt động.');
    }
    const ledger = room.presenceLedger as PresenceLedger;
    let next: PresenceLedger;
    try { next = recordHeartbeat(ledger, studentId, uid, tokenHash, Date.now() / 1000); }
    catch (error) { throw new V84Error(409, error instanceof Error ? error.message : 'Không khôi phục được thiết bị.'); }
    transaction.update(roomRef, { presenceLedger: stripUndefinedDeep(next), updatedAt: FieldValue.serverTimestamp() });
    if (ledger[studentId].online !== next[studentId].online) {
      transaction.update(roomRef.collection('public').doc('current'), { lobby: lobbyCounts(next), updatedAt: FieldValue.serverTimestamp() });
    }
  });
  return res.status(200).json({ roomId, studentId, active: true });
};

const leaveRoom = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse,
) => {
  const roomId = safeId(body.roomId);
  const studentId = safeId(body.studentId);
  const tokenHash = deviceHash(body.deviceToken);
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  await db.runTransaction(async transaction => {
    const [snapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomRef), transaction.get(roomRef.collection('participants').doc(uid)),
    ]);
    const room = snapshot.data();
    if (!snapshot.exists || room?.runtimeMode !== 'V84_CLASSROOM_PREVIEW') throw new V84Error(404, 'Phòng không tồn tại.');
    if (!participantSnapshot.exists || participantSnapshot.data()?.studentId !== studentId) {
      throw new V84Error(403, 'Thiết bị chưa nhận tên học sinh này.');
    }
    let next: PresenceLedger;
    try { next = requestLeave(room.presenceLedger as PresenceLedger, studentId, uid, tokenHash, Date.now() / 1000, 15); }
    catch (error) { throw new V84Error(409, error instanceof Error ? error.message : 'Không ghi được yêu cầu rời lớp.'); }
    transaction.update(roomRef, { presenceLedger: stripUndefinedDeep(next), updatedAt: FieldValue.serverTimestamp() });
    transaction.delete(roomRef.collection('participants').doc(uid));
    transaction.update(roomRef.collection('public').doc('current'), { lobby: lobbyCounts(next), updatedAt: FieldValue.serverTimestamp() });
  });
  return res.status(200).json({ roomId, studentId, status: 'LEAVE_PENDING_TEACHER' });
};

const simulationClaim = (room: FirebaseFirestore.DocumentData, participant: FirebaseFirestore.DocumentData | undefined,
  uid: string, tokenHash: string): string => {
  const studentId = safeId(participant?.studentId);
  const presence = (room.presenceLedger as PresenceLedger)?.[studentId];
  if (presence?.claimUid !== uid || presence.deviceTokenHash !== tokenHash) {
    throw new V84Error(403, 'Thiết bị không còn quyền xem mô phỏng của học sinh này.');
  }
  return studentId;
};

const saveSimulationDraft = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>,
  uid: string, res: VercelResponse) => {
  const roomId = safeId(body.roomId);
  const visualId = safeId(body.visualId);
  const runKey = safeId(body.runKey);
  const tokenHash = deviceHash(body.deviceToken);
  const angleRad = body.angleRad;
  if (typeof angleRad !== 'number' || !Number.isFinite(angleRad)) throw new V84Error(400, 'Góc mô phỏng không hợp lệ.');
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  await db.runTransaction(async transaction => {
    const [roomSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomRef), transaction.get(roomRef.collection('participants').doc(uid)),
    ]);
    if (!roomSnapshot.exists || !participantSnapshot.exists) throw new V84Error(403, 'Thiết bị chưa vào phòng.');
    const room = roomSnapshot.data();
    if (room?.runtimeMode !== 'V84_CLASSROOM_PREVIEW' || !(room.expiresAt instanceof Timestamp)
      || room.expiresAt.toMillis() <= Date.now()) throw new V84Error(409, 'Phòng không còn hoạt động.');
    const studentId = simulationClaim(room, participantSnapshot.data(), uid, tokenHash);
    const run = room.questionRun as { instanceId?: string; openedAtSec?: number; phase?: string; pausedAtSec?: number } | null;
    if (room.roomState?.closed || room.roomState?.timer?.pausedAt != null || !run || run.pausedAtSec !== undefined
      || run.phase !== 'QUESTION_OPEN' || `${run.instanceId}:${run.openedAtSec}` !== runKey) {
      throw new V84Error(409, 'Mô phỏng của câu hiện tại đã khóa hoặc đổi lượt.');
    }
    const buildSnapshot = await transaction.get(db.collection('lessonV832Builds').doc(safeId(room.packageId)));
    if (!buildSnapshot.exists) throw new V84Error(409, 'Không tìm thấy bài học.');
    const lesson = decodePrivateLessonIR(buildSnapshot.data()?.privateLessonIR);
    const current = lesson.timeline.find(item => item.id === room.roomState?.activityId);
    const instance = current?.questionInstances?.find(item => item.instanceId === run.instanceId);
    const question = instance ? lesson.questions[instance.questionId] : null;
    if (question?.visualRef !== visualId) throw new V84Error(409, 'Hình không thuộc câu đang mở.');
    const contract = parseMathVisualExtension(lesson)[visualId];
    if (!contract || contract.renderer !== 'unit_circle'
      || angleRad < contract.model.minAngleRad || angleRad > contract.model.maxAngleRad
      || !validateUnitCircleInvariant(unitCirclePosition(angleRad))) {
      throw new V84Error(422, 'Góc nằm ngoài miền hoặc sai bất biến Toán.');
    }
    transaction.set(roomRef.collection('simulationDrafts').doc(studentId), {
      studentId, visualId, runKey, angleRad,
      updatedAtSec: Date.now() / 1000, updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return res.status(200).json({ roomId, visualId, saved: true });
};

const readOwnSimulationDraft = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>,
  uid: string, res: VercelResponse) => {
  const roomId = safeId(body.roomId);
  const tokenHash = deviceHash(body.deviceToken);
  const { ref, data } = await verifyRoom(db, roomId);
  const participantSnapshot = await ref.collection('participants').doc(uid).get();
  if (!participantSnapshot.exists) throw new V84Error(403, 'Thiết bị chưa vào phòng.');
  const studentId = simulationClaim(data, participantSnapshot.data(), uid, tokenHash);
  const run = data?.questionRun as { instanceId?: string; openedAtSec?: number } | null;
  const draftSnapshot = await ref.collection('simulationDrafts').doc(studentId).get();
  const draft = draftSnapshot.exists ? draftSnapshot.data() as { visualId: string; runKey: string; angleRad: number } : null;
  if (!run || !draft || draft.runKey !== `${run.instanceId}:${run.openedAtSec}`) {
    return res.status(200).json({ roomId, angleRad: null, visualId: null });
  }
  return res.status(200).json({ roomId, angleRad: draft.angleRad, visualId: draft.visualId });
};

const submitSelfAssessment = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse) => {
  const roomId = safeId(body.roomId);
  const deviceTokenHash = deviceHash(body.deviceToken);
  const clientNonce = safeId(body.clientNonce);
  const contentHash = safeId(body.contentHash);
  const packageId = safeId(body.packageId);
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const result = await db.runTransaction(async transaction => {
    const [roomSnapshot, participantSnapshot] = await Promise.all([
      transaction.get(roomRef), transaction.get(roomRef.collection('participants').doc(uid)),
    ]);
    if (!roomSnapshot.exists || !participantSnapshot.exists) throw new V84Error(403, 'Thiết bị chưa vào phòng.');
    const room = roomSnapshot.data();
    const participant = participantSnapshot.data();
    const studentId = safeId(participant?.studentId);
    const presence = (room?.presenceLedger as PresenceLedger | undefined)?.[studentId];
    if (presence?.claimUid !== uid || presence.deviceTokenHash !== deviceTokenHash) throw new V84Error(403, 'Thiết bị không còn quyền của học sinh này.');
    if (room?.runtimeMode !== 'V84_CLASSROOM_PREVIEW' || room.roomState?.closed || !(room.expiresAt instanceof Timestamp) || room.expiresAt.toMillis() <= Date.now()) throw new V84Error(409, 'Phòng lớp học không còn hoạt động.');
    if (room.packageId !== packageId) throw new V84Error(409, 'PACKAGE_PIN_MISMATCH');
    const buildSnapshot = await transaction.get(db.collection('lessonV832Builds').doc(safeId(room.packageId)));
    if (room.packageId !== packageId || room.contentHash !== contentHash || room.roomState?.contentHash !== contentHash || !buildSnapshot.exists
      || buildSnapshot.data()?.ownerUid !== room.ownerUid || buildSnapshot.data()?.manifest?.packageId !== packageId
      || buildSnapshot.data()?.manifest?.contentHash !== contentHash) throw new V84Error(409, 'Nội dung bài học đã thay đổi.');
    let assessment;
    try {
      assessment = validateSelfAssessment((decodePrivateLessonIR(buildSnapshot.data()?.privateLessonIR) as { learningDesign?: { successCriteria?: Array<{ id?: unknown }> } }).learningDesign ?? {}, { criteria: body.criteria });
    } catch (error) {
      throw new V84Error(422, error instanceof Error ? error.message : 'Tự đánh giá không hợp lệ.');
    }
    const payloadHash = createHash('sha256').update(JSON.stringify({ contentHash, packageId, assessment })).digest('hex');
    const root = roomRef.collection('selfAssessments').doc(studentId);
    const nonceRef = root.collection('nonces').doc(clientNonce);
    const existingNonce = await transaction.get(nonceRef);
    if (existingNonce.exists) {
      if (existingNonce.data()?.payloadHash !== payloadHash || !Number.isSafeInteger(existingNonce.data()?.revision)
        || existingNonce.data()?.revision < 1) throw new V84Error(409, 'Client nonce đã dùng cho payload khác.');
      return { revision: existingNonce.data()?.revision, duplicate: true };
    }
    const latestRef = root.collection('latest').doc('current');
    const latestSnapshot = await transaction.get(latestRef);
    const storedRevision = latestSnapshot.data()?.revision;
    if (latestSnapshot.exists && (!Number.isSafeInteger(storedRevision) || storedRevision < 1
      || storedRevision >= Number.MAX_SAFE_INTEGER)) throw new V84Error(409, 'Lịch sử tự đánh giá không hợp lệ.');
    const revision = Number(storedRevision ?? 0) + 1;
    const revisionRef = root.collection('revisions').doc(String(revision));
    const value = { studentId, participantUid: uid, revision, clientNonce, contentHash, criteria: assessment.criteria, submittedAt: FieldValue.serverTimestamp() };
    transaction.create(revisionRef, value);
    transaction.set(latestRef, value);
    transaction.create(nonceRef, { revision, contentHash, payloadHash, createdAt: FieldValue.serverTimestamp() });
    return { revision, duplicate: false };
  });
  return res.status(200).json({ roomId, ...result });
};

const readOwnSelfAssessment = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse) => {
  const roomId = safeId(body.roomId);
  const tokenHash = deviceHash(body.deviceToken);
  const ref = db.collection('lessonV832Rooms').doc(roomId);
  const assessment = await db.runTransaction(async transaction => {
    const roomSnapshot = await transaction.get(ref);
    const participantSnapshot = await transaction.get(ref.collection('participants').doc(uid));
    const data = roomSnapshot.data();
    if (!roomSnapshot.exists || data?.runtimeMode !== 'V84_CLASSROOM_PREVIEW' || !(data.expiresAt instanceof Timestamp) || data.expiresAt.toMillis() <= Date.now()) throw new V84Error(409, 'Phòng lớp học không còn hoạt động.');
    if (!participantSnapshot.exists) throw new V84Error(403, 'Thiết bị chưa vào phòng.');
    const participant = participantSnapshot.data();
    const studentId = safeId(participant?.studentId);
    const presence = (data.presenceLedger as PresenceLedger | undefined)?.[studentId];
    if (presence?.claimUid !== uid || presence.deviceTokenHash !== tokenHash) throw new V84Error(403, 'Tự đánh giá chỉ dành cho thiết bị đang giữ tên học sinh.');
    const snapshot = await transaction.get(ref.collection('selfAssessments').doc(studentId).collection('latest').doc('current'));
    return snapshot.exists ? snapshot.data() : null;
  });
  return res.status(200).json({ roomId, assessment });
};

const readOwnNextStep = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse) => {
  const roomId = safeId(body.roomId);
  const tokenHash = deviceHash(body.deviceToken);
  const ref = db.collection('lessonV832Rooms').doc(roomId);
  const stored = await db.runTransaction(async transaction => {
    const roomSnapshot = await transaction.get(ref);
    const participantSnapshot = await transaction.get(ref.collection('participants').doc(uid));
    const room = roomSnapshot.data();
    if (!roomSnapshot.exists || room?.runtimeMode !== 'V84_CLASSROOM_PREVIEW'
      || !(room.expiresAt instanceof Timestamp) || room.expiresAt.toMillis() <= Date.now()) {
      throw new V84Error(409, 'Phòng lớp học không còn hoạt động.');
    }
    if (!participantSnapshot.exists) throw new V84Error(403, 'Thiết bị chưa vào phòng.');
    const studentId = safeId(participantSnapshot.data()?.studentId);
    const presence = (room.presenceLedger as PresenceLedger | undefined)?.[studentId];
    if (presence?.claimUid !== uid || presence.deviceTokenHash !== tokenHash) {
      throw new V84Error(403, 'Thiết bị không còn quyền của học sinh này.');
    }
    const snapshot = await transaction.get(ref.collection('nextSteps').doc(studentId).collection('latest').doc('current'));
    const value = snapshot.exists ? snapshot.data() : null;
    if (value && (value.packageId !== room.packageId || value.contentHash !== room.contentHash
      || value.closingRevision !== room.roomState?.closingRevision)) {
      throw new V84Error(409, 'Lựa chọn đã lưu không khớp phiên kết thúc hiện tại.');
    }
    return value;
  });
  let nextStep;
  try { nextStep = projectV84OwnNextStep(stored); }
  catch (error) { throw new V84Error(409, error instanceof Error ? error.message : 'Lựa chọn bước tiếp theo không hợp lệ.'); }
  return res.status(200).json({ roomId, nextStep });
};

const assertExactKeys = (body: Record<string, unknown>, allowed: readonly string[]): void => {
  const expected = new Set(allowed);
  if (Object.keys(body).some(key => !expected.has(key))) throw new V84Error(400, 'Payload Next Step chứa trường không được phép.');
};

const submitNextStep = async (db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse) => {
  assertExactKeys(body, ['action', 'idToken', 'roomId', 'packageId', 'contentHash', 'deviceToken', 'clientNonce', 'nextStepId', 'responseRevision', 'closingRevision']);
  const roomId = safeId(body.roomId);
  const packageId = safeId(body.packageId);
  const contentHash = safeId(body.contentHash);
  const deviceTokenHash = deviceHash(body.deviceToken);
  const clientNonce = safeId(body.clientNonce);
  const nextStepId = safeId(body.nextStepId);
  const responseRevision = body.responseRevision;
  const closingRevision = body.closingRevision;
  if (!Number.isSafeInteger(responseRevision) || (responseRevision as number) < 1
    || !Number.isSafeInteger(closingRevision) || (closingRevision as number) < 1) {
    throw new V84Error(409, 'Revision Next Step không hợp lệ.');
  }
  const responseRevisionNumber = responseRevision as number;
  const closingRevisionNumber = closingRevision as number;
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const result = await db.runTransaction(async transaction => {
    const roomSnapshot = await transaction.get(roomRef);
    const room = roomSnapshot.data();
    if (!roomSnapshot.exists || room?.runtimeMode !== 'V84_CLASSROOM_PREVIEW'
      || !(room.expiresAt instanceof Timestamp) || room.expiresAt.toMillis() <= Date.now()) {
      throw new V84Error(409, 'Phòng lớp học không còn hoạt động.');
    }
    if (room.roomState?.closed || room.roomState?.closingRevision !== closingRevisionNumber) {
      throw new V84Error(409, 'Phòng chưa ở bước chọn bước tiếp theo.');
    }
    const participantSnapshot = await transaction.get(roomRef.collection('participants').doc(uid));
    if (!participantSnapshot.exists) throw new V84Error(403, 'Thiết bị chưa vào phòng.');
    const studentId = safeId(participantSnapshot.data()?.studentId);
    const presence = (room.presenceLedger as PresenceLedger | undefined)?.[studentId];
    if (presence?.claimUid !== uid || presence.deviceTokenHash !== deviceTokenHash) {
      throw new V84Error(403, 'Thiết bị không còn quyền của học sinh này.');
    }
    if (room.packageId !== packageId || room.contentHash !== contentHash || room.roomState.contentHash !== contentHash) {
      throw new V84Error(409, 'Nội dung bài học đã thay đổi.');
    }
    const buildSnapshot = await transaction.get(db.collection('lessonV832Builds').doc(packageId));
    if (!buildSnapshot.exists || buildSnapshot.data()?.ownerUid !== room.ownerUid
      || buildSnapshot.data()?.manifest?.packageId !== packageId
      || buildSnapshot.data()?.manifest?.contentHash !== contentHash) {
      throw new V84Error(409, 'Gói bài học không khớp phòng.');
    }
    const build = { ...buildSnapshot.data() } as RuntimeBuildV832;
    build.privateLessonIR = decodePrivateLessonIR(build.privateLessonIR);
    const activityPhase = build.privateLessonIR.timeline.find(item => item.id === room.roomState.activityId)?.phase ?? '';
    if (!/(?:^|_)(exit|reflection|closing|postcheck|self_assessment)(?:$|_)/i.test(activityPhase)) {
      throw new V84Error(409, 'Bài học chưa tới bước chọn tiếp theo.');
    }
    const options = readV84NextStepOptions(build);
    let record;
    try {
      record = validateV84NextStepSubmission({ roomId, studentId, participantUid: uid, packageId, contentHash,
        clientNonce, nextStepId, responseRevision: responseRevisionNumber, closingRevision: closingRevisionNumber,
        options });
    } catch (error) {
      throw new V84Error(409, error instanceof Error ? error.message : 'Bước tiếp theo không hợp lệ.');
    }
    const root = roomRef.collection('nextSteps').doc(studentId);
    const nonceRef = root.collection('nonces').doc(clientNonce);
    const latestRef = root.collection('latest').doc('current');
    const publicRef = roomRef.collection('publicClosing').doc(String(closingRevisionNumber));
    const [nonceSnapshot, latestSnapshot, publicSnapshot] = await Promise.all([
      transaction.get(nonceRef), transaction.get(latestRef), transaction.get(publicRef),
    ]);
    const payloadHash = createHash('sha256').update(JSON.stringify({
      studentId, participantUid: uid, nextStepId, packageId, contentHash, responseRevision: responseRevisionNumber, closingRevision: closingRevisionNumber, taskRef: record.taskRef,
    })).digest('hex');
    if (nonceSnapshot.exists) {
      if (nonceSnapshot.data()?.payloadHash !== payloadHash) throw new V84Error(409, 'Client nonce đã dùng cho payload khác.');
      return { duplicate: true, closingRevision: closingRevisionNumber, nextStepId,
        responseRevision: nonceSnapshot.data()?.responseRevision };
    }
    const previousRevision = latestSnapshot.data()?.responseRevision;
    if (latestSnapshot.exists && (!Number.isSafeInteger(previousRevision) || (previousRevision as number) >= responseRevisionNumber)) {
      throw new V84Error(409, 'Revision Next Step phải tăng dần.');
    }
    const publicData = publicSnapshot.data() ?? {};
    let publicPayload: Record<string, unknown> | null = null;
    if (publicSnapshot.exists) {
      const counts = publicData.nextStepCounts && typeof publicData.nextStepCounts === 'object' && !Array.isArray(publicData.nextStepCounts)
        ? { ...(publicData.nextStepCounts as Record<string, unknown>) } : {};
      const previousCount = counts[nextStepId];
      if (previousCount !== undefined && (!Number.isSafeInteger(previousCount) || (previousCount as number) < 0)) {
        throw new V84Error(409, 'Tổng hợp bước tiếp theo không hợp lệ.');
      }
      publicPayload = { closingRevision: closingRevisionNumber, classProgress: String(publicData.classProgress ?? ''),
        nextStepCounts: { ...counts, [nextStepId]: Number(previousCount ?? 0) + 1 },
        evidenceBasedStatement: String(publicData.evidenceBasedStatement ?? ''), localeCopy: publicData.localeCopy };
    }
    const persisted = { studentId: record.studentId, participantUid: record.participantUid, nextStepId: record.nextStepId,
      packageId: record.packageId, contentHash: record.contentHash, responseRevision: record.responseRevision,
      closingRevision: record.closingRevision, clientNonce: record.clientNonce, submittedAt: FieldValue.serverTimestamp() };
    transaction.create(root.collection('revisions').doc(String(closingRevisionNumber)), persisted);
    transaction.set(latestRef, persisted);
    transaction.create(nonceRef, { payloadHash, closingRevision: closingRevisionNumber, responseRevision: responseRevisionNumber, createdAt: FieldValue.serverTimestamp() });
    if (publicPayload) transaction.set(publicRef, publicPayload);
    return { duplicate: false, closingRevision: closingRevisionNumber, nextStepId, responseRevision: responseRevisionNumber };
  });
  return res.status(200).json({ roomId, ...result });
};

const teacherPresence = async (
  db: FirebaseFirestore.Firestore, body: Record<string, unknown>, uid: string, res: VercelResponse,
) => {
  const roomId = safeId(body.roomId);
  const studentId = safeId(body.studentId);
  const operation = String(body.operation ?? '');
  if (!['MARK_ABSENT', 'MARK_PRESENT', 'MARK_LATE_EXPECTED', 'CONFIRM_LEFT', 'RESET_CLAIM', 'TRANSFER_DEVICE'].includes(operation)) {
    throw new V84Error(400, 'Thao tác điểm danh không hợp lệ.');
  }
  const { data } = await verifyRoom(db, roomId);
  if (data?.ownerUid !== uid || !await readClassAccess(db, safeId(data.classBinding?.classId), uid)) {
    throw new V84Error(403, 'Bạn không có quyền điểm danh lớp này.');
  }
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(roomRef);
    const room = snapshot.data();
    if (!snapshot.exists || room?.ownerUid !== uid || room.runtimeMode !== 'V84_CLASSROOM_PREVIEW') {
      throw new V84Error(403, 'Bạn không có quyền điểm danh lớp này.');
    }
    const ledger = room.presenceLedger as PresenceLedger;
    const current = ledger?.[studentId];
    if (!current) throw new V84Error(404, 'Không tìm thấy học sinh trong lớp.');
    const oldUid = current.claimUid;
    const pending = room.pendingClaims?.[studentId] as { uid: string; tokenHash: string } | undefined;
    if (operation === 'CONFIRM_LEFT' && current.leaveRequestedAt === undefined) {
      throw new V84Error(409, 'Chưa có yêu cầu rời lớp từ học sinh.');
    }
    let next: PresenceLedger;
    if (operation === 'TRANSFER_DEVICE') {
      if (!pending) throw new V84Error(409, 'Không có yêu cầu chuyển thiết bị đang chờ.');
      next = transferDeviceClaim(ledger, studentId, pending.uid, pending.tokenHash, Date.now() / 1000);
      if (oldUid) transaction.delete(roomRef.collection('participants').doc(oldUid));
      transaction.set(roomRef.collection('participants').doc(pending.uid), {
        participantUid: pending.uid, studentId, displayName: current.name, roomId,
        mode: 'class_preview', joinedAt: FieldValue.serverTimestamp(),
      });
    } else if (operation === 'RESET_CLAIM') {
      next = resetDeviceClaim(ledger, studentId);
      if (oldUid) transaction.delete(roomRef.collection('participants').doc(oldUid));
    } else {
      const attendance = operation === 'MARK_ABSENT' ? 'ABSENT_CONFIRMED'
        : operation === 'MARK_PRESENT' ? 'PRESENT'
          : operation === 'MARK_LATE_EXPECTED' ? 'LATE_EXPECTED' : 'LEFT_CONFIRMED';
      next = markAttendance(ledger, studentId, attendance, Date.now() / 1000);
      if ((attendance === 'ABSENT_CONFIRMED' || attendance === 'LEFT_CONFIRMED') && oldUid) {
        transaction.delete(roomRef.collection('participants').doc(oldUid));
      }
    }
    const pendingClaims = { ...(room.pendingClaims ?? {}) };
    delete pendingClaims[studentId];
    const audit = Array.isArray(room.presenceAudit) ? room.presenceAudit as unknown[] : [];
    transaction.update(roomRef, {
      presenceLedger: stripUndefinedDeep(next), pendingClaims,
      presenceAudit: [...audit.slice(-99), { studentId, operation, actorUid: uid, atSec: Date.now() / 1000 }],
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(roomRef.collection('public').doc('current'), { lobby: lobbyCounts(next), updatedAt: FieldValue.serverTimestamp() });
  });
  return res.status(200).json({ roomId, studentId, operation, updated: true });
};

export const handleV84Action = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
  verify: V832TokenVerifier = defaultVerify,
): Promise<boolean> => {
  if (!['v84CreateClassPreviewRoom', 'v84ReadRoomRoster', 'v84ClaimStudent', 'v84Heartbeat', 'v84LeaveRoom', 'v84TeacherPresence',
    'v84SaveSimulationDraft', 'v84ReadOwnSimulationDraft', 'v84SubmitSelfAssessment', 'v84ReadOwnSelfAssessment', 'v84SubmitNextStep', 'v84ReadOwnNextStep',
    'v84PresenterCommand', 'v84SubmitResponse', 'v84TickRoom'].includes(String(body.action))) return false;
  try {
    const identity = await verify(body.idToken);
    if (!identity || ((body.action === 'v84CreateClassPreviewRoom' || body.action === 'v84TeacherPresence') && identity.anonymous)) {
      throw new V84Error(401, 'Cần đăng nhập để tiếp tục.');
    }
    if (await handleV84QuestionAction(db, body, identity, res)) return true;
    if (body.action === 'v84CreateClassPreviewRoom') await createClassPreviewRoom(db, body, identity.uid, res);
    else if (body.action === 'v84ReadRoomRoster') await readRoomRoster(db, body, res);
    else if (body.action === 'v84ClaimStudent') await claimRoomStudent(db, body, identity.uid, res);
    else if (body.action === 'v84Heartbeat') await heartbeat(db, body, identity.uid, res);
    else if (body.action === 'v84LeaveRoom') await leaveRoom(db, body, identity.uid, res);
    else if (body.action === 'v84SaveSimulationDraft') await saveSimulationDraft(db, body, identity.uid, res);
    else if (body.action === 'v84ReadOwnSimulationDraft') await readOwnSimulationDraft(db, body, identity.uid, res);
    else if (body.action === 'v84SubmitSelfAssessment') await submitSelfAssessment(db, body, identity.uid, res);
    else if (body.action === 'v84ReadOwnSelfAssessment') await readOwnSelfAssessment(db, body, identity.uid, res);
    else if (body.action === 'v84SubmitNextStep') await submitNextStep(db, body, identity.uid, res);
    else if (body.action === 'v84ReadOwnNextStep') await readOwnNextStep(db, body, identity.uid, res);
    else await teacherPresence(db, body, identity.uid, res);
  } catch (error) {
    if (error instanceof PreviewError) res.status(error.status).json({ error: 'Nguồn hoặc bản nháp đã đổi; tải lại trước khi mở phòng.',code:error.message });
    else if (error instanceof V84Error) res.status(error.code).json({ error: error.message });
    else { console.error('[v84-runtime] failed', error); res.status(500).json({ error: 'Không hoàn tất được thao tác lớp học.' }); }
  }
  return true;
};
