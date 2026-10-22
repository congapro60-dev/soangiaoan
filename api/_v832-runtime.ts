/// <reference types="node" />
import type { VercelResponse } from '@vercel/node';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { prepareRuntimeBuild, projectPublicRoomSnapshot, type RuntimeBuildV832 } from '../src/lib/lessonCompiler/v832/runtimePackage.js';
import { applyPresenterRoomCommand, createRoomState, type PresenterRoomCommand, type RoomStateV832 } from '../src/lib/lessonCompiler/v832/roomState.js';
import type { LessonIRV83 } from '../src/lib/lessonCompiler/v832/lessonIRSchema.js';
import { decodePrivateLessonIR, encodePrivateLessonIR, assertPrivateDocumentSize } from '../src/lib/lessonCompiler/v832/privateJsonCodec.js';
import type { SemanticRuleAttestation } from '../src/lib/lessonCompiler/v832/qualityGate.js';
import { captureReviewContext } from '../src/lib/lessonReview/v832/reviewContext.js';
import type { ReviewAnnotation, ReviewAttachment, ReviewScope } from '../src/lib/lessonReview/v832/reviewRequest.js';
import { commitPreviewRoom, PreviewError } from './_v871-preview.js';

export interface V832Identity {
  uid: string;
  anonymous: boolean;
}

export type V832TokenVerifier = (token: unknown) => Promise<V832Identity | null>;

type ReviewAssetMetadata = { contentType: string; size: number };
type ReviewAssetVerifier = (storagePath: string) => Promise<ReviewAssetMetadata | null>;

const verifyReviewAsset: ReviewAssetVerifier = async storagePath => {
  try {
    const [metadata] = await getStorage().bucket().file(storagePath).getMetadata();
    return { contentType: String(metadata.contentType ?? ''), size: Number(metadata.size) };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 404) return null;
    throw error;
  }
};

const verifyFirebaseIdentity: V832TokenVerifier = async token => {
  if (typeof token !== 'string' || !token) return null;
  try {
    const decoded = await getAuth().verifyIdToken(token);
    return { uid: decoded.uid, anonymous: decoded.firebase?.sign_in_provider === 'anonymous' };
  } catch {
    return null;
  }
};

class V832RequestError extends Error {
  constructor(readonly statusCode: number, message: string) { super(message); }
}

const identifier = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:@-]{1,180}$/.test(value)) {
    throw new V832RequestError(400, `${label} không hợp lệ.`);
  }
  return value;
};

const teacherIdentity = async (body: Record<string, unknown>, verify: V832TokenVerifier): Promise<V832Identity> => {
  const identity = await verify(body.idToken);
  if (!identity || identity.anonymous) throw new V832RequestError(401, 'Cần đăng nhập tài khoản giáo viên.');
  return identity;
};

const participantIdentity = async (body: Record<string, unknown>, verify: V832TokenVerifier): Promise<V832Identity> => {
  const identity = await verify(body.idToken);
  if (!identity) throw new V832RequestError(401, 'Cần đăng nhập để tham gia phòng học.');
  return identity;
};

const roomNotExpired = (value: unknown): boolean => (
  value instanceof Timestamp && value.toMillis() > Date.now()
);

const attestationsFromRequest = (value: unknown, reviewerUid: string): SemanticRuleAttestation[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    if (typeof record.ruleId !== 'string' || !/^M(0[1-9]|1[0-5])$/.test(record.ruleId)
      || !['pass', 'fail'].includes(String(record.verdict))
      || typeof record.evidence !== 'string' || !record.evidence.trim() || record.evidence.length > 4000) return [];
    return [{
      ruleId: record.ruleId,
      verdict: record.verdict as 'pass' | 'fail',
      evidence: record.evidence.trim(),
      reviewer: reviewerUid,
      reviewedAt: new Date().toISOString(),
    }];
  });
};

const presenterCommandFromRequest = (value: unknown): PresenterRoomCommand => {
  if (!value || typeof value !== 'object') throw new V832RequestError(400, 'Thiếu lệnh Presenter.');
  const record = value as Record<string, unknown>;
  const id = identifier(record.id, 'Mã lệnh');
  const allowed = [
    'START', 'NEXT_ACTIVITY', 'PREV_ACTIVITY', 'REVEAL', 'QUESTION_NEXT',
    'HANDOFF_TO_DEVICE', 'DEVICE_WORK', 'READY_TO_RECALL', 'RECALL_TO_PRESENTER',
    'DEBRIEF_CHOT', 'SET_VISUAL_STATE', 'SET_PRESENTER_LOCALE', 'PAUSE_TIMER', 'RESUME_TIMER', 'END',
  ];
  if (typeof record.type !== 'string' || !allowed.includes(record.type)
    || !Number.isInteger(record.expectedRevision) || (record.expectedRevision as number) < 0) {
    throw new V832RequestError(400, 'Lệnh Presenter hoặc revision không hợp lệ.');
  }
  return {
    id,
    type: record.type as PresenterRoomCommand['type'],
    expectedRevision: record.expectedRevision as number,
    ...(typeof record.visualStateId === 'string' ? { visualStateId: record.visualStateId } : {}),
    ...(typeof record.presenterLocale === 'string' ? { presenterLocale: record.presenterLocale as PresenterRoomCommand['presenterLocale'] } : {}),
    issuedAt: Date.now(),
  };
};

const readBuild = async (db: FirebaseFirestore.Firestore, packageId: string): Promise<RuntimeBuildV832 & { ownerUid: string }> => {
  const snapshot = await db.collection('lessonV832Builds').doc(packageId).get();
  if (!snapshot.exists) throw new V832RequestError(404, 'Không tìm thấy gói bài học.');
  const data = snapshot.data() as RuntimeBuildV832 & { ownerUid: string } | undefined;
  if (!data || data.manifest?.packageId !== packageId || !data.privateLessonIR) {
    throw new V832RequestError(409, 'Gói bài học chưa hợp lệ.');
  }
  return { ...data, privateLessonIR: decodePrivateLessonIR(data.privateLessonIR) };
};

const saveBuild = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  identity: V832Identity,
  res: VercelResponse,
) => {
  const lesson = body.lessonIR as LessonIRV83;
  if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson)) {
    throw new V832RequestError(400, 'Thiếu Lesson IR V8.3.2.');
  }
  if (lesson.extensions?.v871Experience && typeof lesson.extensions.v871Experience === 'object'
    && (lesson.extensions.v871Experience as { version?: unknown }).version === '1.1') {
    throw new V832RequestError(422, 'Bài V8.8.1 phải được chuẩn bị từ nguồn và bản nháp đã lưu.');
  }
  identifier(lesson.lesson?.lessonId, 'Lesson ID');
  const build = await prepareRuntimeBuild(lesson, attestationsFromRequest(body.semanticAttestations, identity.uid));
  const ref = db.collection('lessonV832Builds').doc(build.manifest.packageId);
  const existing = await ref.get();
  if (existing.exists) {
    const value = existing.data();
    if (value?.ownerUid !== identity.uid || value?.manifest?.contentHash !== build.manifest.contentHash) {
      throw new V832RequestError(409, 'Phiên bản bài học đã tồn tại với nội dung khác.');
    }
    return res.status(200).json({ manifest: build.manifest });
  }
  const payload = { ...build, privateLessonIR: encodePrivateLessonIR(build.privateLessonIR),
    ownerUid: identity.uid, createdAt: FieldValue.serverTimestamp() };
  assertPrivateDocumentSize(payload, ['createdAt']);
  await ref.create(payload);
  return res.status(201).json({ manifest: build.manifest });
};

const createPreviewRoom = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  identity: V832Identity,
  res: VercelResponse,
) => {
  const packageId = identifier(body.packageId, 'Package ID');
  const build = await readBuild(db, packageId);
  if (build.ownerUid !== identity.uid) throw new V832RequestError(403, 'Bạn không sở hữu bài học này.');
  const roomRef = db.collection('lessonV832Rooms').doc();
  const room = createRoomState(build.privateLessonIR, roomRef.id, build.manifest.contentHash);
  const projection = projectPublicRoomSnapshot(build, room);
  const expiresAt = Timestamp.fromMillis(Date.now() + Math.max(2 * 60 * 60 * 1000, build.privateLessonIR.lesson.runtimeMin * 60_000 + 60 * 60 * 1000));
  const roomDocument = {
    ownerUid: identity.uid,
    packageId,
    lessonId: build.manifest.lessonId,
    lessonVersion: build.manifest.lessonVersion,
    contentHash: build.manifest.contentHash,
    mode: 'PREVIEW_ONLY',
    roomState: room,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await commitPreviewRoom(db,build,roomRef,roomDocument,{ ...projection, updatedAt: FieldValue.serverTimestamp() });
  return res.status(200).json({
    roomId: roomRef.id,
    status: 'PREVIEW_ONLY',
    links: {
      presenter: `/v832-room/${roomRef.id}?role=presenter`,
      tv: `/v832-room/${roomRef.id}?role=tv`,
      student: `/v832-room/${roomRef.id}?role=student`,
      coach: `/v832-room/${roomRef.id}?role=coach`,
    },
  });
};

const applyRoomCommand = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  identity: V832Identity,
  res: VercelResponse,
) => {
  const roomId = identifier(body.roomId, 'Room ID');
  const command = presenterCommandFromRequest(body.command);
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const applied = await db.runTransaction(async transaction => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists) throw new V832RequestError(404, 'Phòng không tồn tại.');
    const roomDocument = roomSnapshot.data();
    if (roomDocument?.ownerUid !== identity.uid) throw new V832RequestError(403, 'Chỉ Presenter của phòng được điều khiển.');
    if (roomDocument?.mode !== 'PREVIEW_ONLY') throw new V832RequestError(409, 'Chế độ phòng không hợp lệ.');
    if (roomDocument.runtimeMode === 'V84_CLASSROOM_PREVIEW') throw new V832RequestError(409, 'Dùng điều khiển V8.4 cho phòng này.');
    const packageId = identifier(roomDocument.packageId, 'Package ID');
    const buildRef = db.collection('lessonV832Builds').doc(packageId);
    const buildSnapshot = await transaction.get(buildRef);
    if (!buildSnapshot.exists) throw new V832RequestError(409, 'Gói bài học không còn tồn tại.');
    const build = { ...buildSnapshot.data() } as RuntimeBuildV832 & { ownerUid: string };
    build.privateLessonIR = decodePrivateLessonIR(build.privateLessonIR);
    if (build.ownerUid !== identity.uid || build.manifest.contentHash !== roomDocument.contentHash) {
      throw new V832RequestError(409, 'Phòng không khớp gói bài học.');
    }
    const current = roomDocument.roomState as RoomStateV832;
    const next = applyPresenterRoomCommand(build.privateLessonIR, current, command, build.manifest.contentHash);
    if (next === current) return current;
    const projection = projectPublicRoomSnapshot(build, next);
    const lobby = roomDocument.runtimeMode === 'V84_CLASSROOM_PREVIEW' && roomDocument.presenceLedger
      ? {
        rosterCount: Object.keys(roomDocument.presenceLedger as Record<string, unknown>).length,
        joinedCount: Object.values(roomDocument.presenceLedger as Record<string, { online?: string }>).filter(student => student.online === 'ACTIVE').length,
      } : undefined;
    transaction.update(roomRef, { roomState: next, updatedAt: FieldValue.serverTimestamp() });
    transaction.set(roomRef.collection('public').doc('current'), { ...projection, ...(lobby ? { lobby } : {}), updatedAt: FieldValue.serverTimestamp() });
    return next;
  });
  return res.status(200).json({
    roomId, sessionRevision: applied.sessionRevision,
    activityId: applied.activityId, handoffState: applied.handoffState,
  });
};

const joinPreviewRoom = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  identity: V832Identity,
  res: VercelResponse,
) => {
  const roomId = identifier(body.roomId, 'Room ID');
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
  if (!displayName || displayName.length > 80) throw new V832RequestError(400, 'Tên tham gia phải có 1–80 kí tự.');
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const roomSnapshot = await roomRef.get();
  if (!roomSnapshot.exists) throw new V832RequestError(404, 'Phòng không tồn tại.');
  const room = roomSnapshot.data();
  if (room?.mode !== 'PREVIEW_ONLY' || !roomNotExpired(room.expiresAt)) throw new V832RequestError(409, 'Phòng xem trước đã hết hạn.');
  if (room.runtimeMode === 'V84_CLASSROOM_PREVIEW') throw new V832RequestError(409, 'Dùng liên kết nhận tên lớp V8.4.');
  const state = room.roomState as RoomStateV832;
  if (state.closed || !state.joinOpen) throw new V832RequestError(409, 'Phòng đã đóng nhận học sinh.');
  const participantRef = roomRef.collection('participants').doc(identity.uid);
  const existing = await participantRef.get();
  if (!existing.exists) {
    await participantRef.create({
      participantUid: identity.uid, displayName, roomId, mode: 'guest_preview',
      joinedAt: FieldValue.serverTimestamp(),
    });
  }
  return res.status(200).json({ roomId, participantUid: identity.uid, mode: 'guest_preview' });
};

const submitPreviewResponse = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  identity: V832Identity,
  res: VercelResponse,
) => {
  const roomId = identifier(body.roomId, 'Room ID');
  const questionInstanceId = identifier(body.questionInstanceId, 'Mã câu hỏi');
  const clientNonce = identifier(body.clientNonce, 'Mã lần nộp');
  const value = typeof body.value === 'string' ? body.value.trim() : '';
  if (!value || value.length > 4000) throw new V832RequestError(400, 'Bài làm phải có 1–4000 kí tự.');
  if (body.mode !== 'typed' && body.mode !== 'math') throw new V832RequestError(422, 'Kiểu nộp này chưa hỗ trợ trong bản xem trước.');
  const mode = body.mode;
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const participantRef = roomRef.collection('participants').doc(identity.uid);
  const responseId = `${identity.uid}__${questionInstanceId}`;
  const responseRef = roomRef.collection('responses').doc(responseId);
  const result = await db.runTransaction(async transaction => {
    const [roomSnapshot, participantSnapshot, currentSnapshot] = await Promise.all([
      transaction.get(roomRef), transaction.get(participantRef), transaction.get(responseRef),
    ]);
    if (!roomSnapshot.exists) throw new V832RequestError(404, 'Phòng không tồn tại.');
    if (!participantSnapshot.exists) throw new V832RequestError(403, 'Bạn chưa tham gia phòng này.');
    const room = roomSnapshot.data();
    if (room?.mode !== 'PREVIEW_ONLY' || !roomNotExpired(room.expiresAt)) throw new V832RequestError(409, 'Phòng đã hết hạn.');
    if (room.runtimeMode === 'V84_CLASSROOM_PREVIEW') throw new V832RequestError(409, 'Dùng đường nộp câu hỏi V8.4.');
    const state = room.roomState as RoomStateV832;
    if (!state.started || state.closed || state.handoffState !== 'DEVICE_WORK') {
      throw new V832RequestError(409, 'Hoạt động trên thiết bị chưa mở.');
    }
    const buildSnapshot = await transaction.get(db.collection('lessonV832Builds').doc(room.packageId));
    if (!buildSnapshot.exists) throw new V832RequestError(409, 'Gói bài học không còn tồn tại.');
    const build = { ...buildSnapshot.data() } as RuntimeBuildV832;
    build.privateLessonIR = decodePrivateLessonIR(build.privateLessonIR);
    if (build.manifest.contentHash !== state.contentHash) throw new V832RequestError(409, 'Phòng không khớp phiên bản bài học.');
    const activity = build.privateLessonIR.timeline.find(item => item.id === state.activityId);
    const instance = activity?.questionInstances?.find(item => item.instanceId === questionInstanceId);
    const question = instance ? build.privateLessonIR.questions[instance.questionId] : null;
    if (!activity || activity.student.state !== 'interactive' || !question || !question.submissionModes.includes(mode)) {
      throw new V832RequestError(409, 'Câu hỏi hiện không mở cho cách nộp này.');
    }
    const previous = currentSnapshot.exists ? currentSnapshot.data() : null;
    if (previous?.clientNonce === clientNonce) return { revision: previous.revision as number, duplicate: true };
    const revision = (typeof previous?.revision === 'number' ? previous.revision : 0) + 1;
    const now = FieldValue.serverTimestamp();
    const payload = {
      participantUid: identity.uid, roomId, activityId: activity.id, questionInstanceId,
      questionId: question.id, value, mode, clientNonce, revision,
      submittedAt: previous?.submittedAt ?? now, updatedAt: now,
    };
    transaction.set(responseRef, payload);
    transaction.set(responseRef.collection('revisions').doc(String(revision)), {
      participantUid: identity.uid, questionInstanceId, value, mode, revision, submittedAt: now,
    });
    return { revision, duplicate: false };
  });
  return res.status(200).json({ roomId, questionInstanceId, revision: result.revision, duplicate: result.duplicate });
};

const readOwnPreviewResponse = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  identity: V832Identity,
  res: VercelResponse,
) => {
  const roomId = identifier(body.roomId, 'Room ID');
  const questionInstanceId = identifier(body.questionInstanceId, 'Mã câu hỏi');
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const [roomSnapshot, participantSnapshot] = await Promise.all([
    roomRef.get(), roomRef.collection('participants').doc(identity.uid).get(),
  ]);
  if (!roomSnapshot.exists) throw new V832RequestError(404, 'Phòng không tồn tại.');
  if (!participantSnapshot.exists) throw new V832RequestError(403, 'Bạn chưa tham gia phòng này.');
  const room = roomSnapshot.data();
  if (room?.mode !== 'PREVIEW_ONLY' || !roomNotExpired(room.expiresAt)) throw new V832RequestError(409, 'Phòng đã hết hạn.');
  const participant = participantSnapshot.data();
  const responseOwnerId = room.runtimeMode === 'V84_CLASSROOM_PREVIEW'
    ? identifier(participant?.studentId, 'Mã học sinh') : identity.uid;
  const responseId = `${responseOwnerId}__${questionInstanceId}`;
  const response = await roomRef.collection('responses').doc(responseId).get();
  const saved = response.exists ? response.data() : null;
  const value = room.runtimeMode === 'V84_CLASSROOM_PREVIEW'
    && (room.questionRun?.instanceId !== questionInstanceId
      || saved?.questionOpenedAtSec !== room.questionRun?.openedAtSec) ? null : saved;
  return res.status(200).json({
    roomId, questionInstanceId,
    revision: typeof value?.revision === 'number' ? value.revision : 0,
    value: typeof value?.value === 'string' ? value.value : null,
  });
};

const createReviewRequest = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  identity: V832Identity,
  res: VercelResponse,
  assetVerifier: ReviewAssetVerifier,
) => {
  const roomId = identifier(body.roomId, 'Room ID');
  const roomRef = db.collection('lessonV832Rooms').doc(roomId);
  const roomSnapshot = await roomRef.get();
  if (!roomSnapshot.exists) throw new V832RequestError(404, 'Phòng không tồn tại.');
  const room = roomSnapshot.data();
  if (room?.ownerUid !== identity.uid) throw new V832RequestError(403, 'Chỉ giáo viên của phòng được báo lỗi.');
  if (room.mode !== 'PREVIEW_ONLY' || !roomNotExpired(room.expiresAt)) throw new V832RequestError(409, 'Phòng xem trước đã hết hạn.');
  const state = room.roomState as RoomStateV832;
  if (body.expectedRevision !== state.sessionRevision) throw new V832RequestError(409, 'Màn hình đã đổi; chụp lại trước khi báo lỗi.');
  const v84 = room.runtimeMode === 'V84_CLASSROOM_PREVIEW';
  const questionRun = v84 ? room.questionRun as { instanceId: string; openedAtSec: number; phase: string; runRevision: number } | null : null;
  const runKey = questionRun ? `${questionRun.instanceId}:${questionRun.openedAtSec}` : null;
  if (v84 && (body.expectedQuestionRunKey !== runKey || body.expectedQuestionPhase !== (questionRun?.phase ?? null)
    || body.expectedQuestionRunRevision !== (questionRun?.runRevision ?? null))) {
    throw new V832RequestError(409, 'Câu hỏi đã đổi trạng thái; chụp lại trước khi gửi yêu cầu.');
  }
  if (body.role !== 'presenter' && body.role !== 'student' && body.role !== 'coach') throw new V832RequestError(400, 'Vai trò báo lỗi không hợp lệ.');
  if (body.locale !== 'vi' && body.locale !== 'en' && body.locale !== 'ja') throw new V832RequestError(400, 'Ngôn ngữ không hợp lệ.');
  const message = typeof body.teacherMessage === 'string' ? body.teacherMessage.trim() : '';
  if (!message || message.length > 4000) throw new V832RequestError(400, 'Mô tả lỗi phải có 1–4000 kí tự.');
  const expectedPrefix = `lessonGen/${identity.uid}/${roomId}/review-`;
  const screenshotAssetId = typeof body.screenshotAssetId === 'string' ? body.screenshotAssetId : '';
  if (!screenshotAssetId.startsWith(expectedPrefix) || !/\.(png|jpe?g|webp)$/.test(screenshotAssetId)) {
    throw new V832RequestError(400, 'Ảnh màn hình phải nằm trong vùng riêng của giáo viên.');
  }
  const viewport = body.viewport as Record<string, unknown> | null;
  if (!viewport || !Number.isInteger(viewport.width) || !Number.isInteger(viewport.height)
    || (viewport.width as number) < 240 || (viewport.width as number) > 6000
    || (viewport.height as number) < 240 || (viewport.height as number) > 6000
    || typeof viewport.devicePixelRatio !== 'number' || viewport.devicePixelRatio < 0.5 || viewport.devicePixelRatio > 5) {
    throw new V832RequestError(400, 'Kích thước màn hình không hợp lệ.');
  }
  const annotationTypes = ['rectangle', 'arrow', 'freehand', 'highlight', 'pin', 'text'];
  const annotations: ReviewAnnotation[] = Array.isArray(body.annotations) ? body.annotations as ReviewAnnotation[] : [];
  if (annotations.length > 30 || annotations.some(item => !item || !annotationTypes.includes(item.type)
    || ![item.x, item.y, item.width, item.height].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1)
    || item.x + item.width > 1 || item.y + item.height > 1)) {
    throw new V832RequestError(400, 'Vùng đánh dấu ảnh không hợp lệ.');
  }
  const attachments: ReviewAttachment[] = Array.isArray(body.attachments) ? body.attachments as ReviewAttachment[] : [];
  if (attachments.length > 5 || attachments.some(item => !item || !item.storagePath?.startsWith(expectedPrefix)
    || !['image/png', 'image/jpeg', 'image/webp'].includes(item.mimeType))) {
    throw new V832RequestError(400, 'Ảnh đính kèm không hợp lệ hoặc nằm ngoài vùng riêng của giáo viên.');
  }
  const paths = [...new Set([screenshotAssetId, ...attachments.map(item => item.storagePath)])];
  const verified = await Promise.all(paths.map(async path => ({ path, metadata: await assetVerifier(path) })));
  for (const { path, metadata } of verified) {
    const attachment = attachments.find(item => item.storagePath === path);
    const expectedType = /\.png$/i.test(path) ? 'image/png' : /\.jpe?g$/i.test(path) ? 'image/jpeg'
      : /\.webp$/i.test(path) ? 'image/webp' : null;
    if (!metadata || !expectedType || metadata.contentType !== expectedType
      || (attachment && attachment.mimeType !== expectedType) || !Number.isFinite(metadata.size)
      || metadata.size <= 0 || metadata.size >= 8 * 1024 * 1024) {
      throw new V832RequestError(409, 'Ảnh xem xét chưa được upload hoặc không đúng định dạng/kích thước.');
    }
  }
  const scope: ReviewScope = ['auto', 'screen', 'activity', 'lesson', 'runtime'].includes(String(body.scope))
    ? body.scope as ReviewScope : 'screen';
  const build = await readBuild(db, identifier(room.packageId, 'Package ID'));
  const context = captureReviewContext(build.privateLessonIR, {
    role: body.role,
    activityId: state.activityId,
    locale: body.locale,
    viewport: {
      width: viewport.width as number,
      height: viewport.height as number,
      devicePixelRatio: viewport.devicePixelRatio as number,
    },
    revealStep: state.revealStep,
    ...(state.visualStateId ? { visualStateId: state.visualStateId } : {}),
    attentionSurface: state.attentionSurface,
    handoffState: state.handoffState,
    roomStateRevision: state.sessionRevision,
    contentHash: build.manifest.contentHash,
    buildId: build.manifest.packageId,
    compilerVersion: build.manifest.compilerVersion,
    runtimeVersion: v84 ? '8.4' : '8.3.2',
    ...(questionRun ? { questionInstanceId: questionRun.instanceId,
      questionRunKey: runKey!, questionRunRevision: questionRun.runRevision, questionPhase: questionRun.phase } : {}),
    route: typeof body.route === 'string' ? body.route.slice(0, 300) : '',
    screenshotAssetId,
    visibleComponentIds: Array.isArray(body.visibleComponentIds)
      ? body.visibleComponentIds.filter(item => typeof item === 'string').slice(0, 40).map(item => String(item).slice(0, 80)) : [],
  });
  const reviewRef = db.collection('lessonV832ReviewRequests').doc();
  await reviewRef.create({
    id: reviewRef.id, ownerUid: identity.uid, roomId,
    context, teacherMessage: message,
    attachments, annotations, scope,
    createdBy: identity.uid, createdAt: new Date().toISOString(),
    createdAtServer: FieldValue.serverTimestamp(), status: 'NEW',
  });
  return res.status(201).json({ reviewId: reviewRef.id, status: 'NEW' });
};

export const handleV832Action = async (
  db: FirebaseFirestore.Firestore,
  body: Record<string, unknown>,
  res: VercelResponse,
  verify: V832TokenVerifier = verifyFirebaseIdentity,
  assetVerifier: ReviewAssetVerifier = verifyReviewAsset,
): Promise<boolean> => {
  const action = body.action;
  if (action !== 'v832SaveBuild' && action !== 'v832CreatePreviewRoom' && action !== 'v832PresenterCommand'
    && action !== 'v832JoinPreviewRoom' && action !== 'v832SubmitPreviewResponse'
    && action !== 'v832ReadOwnPreviewResponse' && action !== 'v832CreateReviewRequest') return false;
  try {
    if (action === 'v832JoinPreviewRoom' || action === 'v832SubmitPreviewResponse' || action === 'v832ReadOwnPreviewResponse') {
      const identity = await participantIdentity(body, verify);
      if (action === 'v832JoinPreviewRoom') await joinPreviewRoom(db, body, identity, res);
      else if (action === 'v832SubmitPreviewResponse') await submitPreviewResponse(db, body, identity, res);
      else await readOwnPreviewResponse(db, body, identity, res);
    } else {
      const identity = await teacherIdentity(body, verify);
      if (action === 'v832SaveBuild') await saveBuild(db, body, identity, res);
      else if (action === 'v832CreatePreviewRoom') await createPreviewRoom(db, body, identity, res);
      else if (action === 'v832PresenterCommand') await applyRoomCommand(db, body, identity, res);
      else await createReviewRequest(db, body, identity, res, assetVerifier);
    }
  } catch (error) {
    if (error instanceof PreviewError) res.status(error.status).json({ error: 'Nguồn hoặc bản nháp đã đổi; tải lại trước khi mở phòng.',code:error.message });
    else if (error instanceof V832RequestError) res.status(error.statusCode).json({ error: error.message });
    else if (error instanceof Error && /^(QUALITY_GATE_BLOCKED|LESSON_IR_|DESIGN_GATE_|SOURCE_HASH_|REVISION_CONFLICT|REVEAL_REQUIRED|RECALL_REQUIRED|CONTENT_HASH_MISMATCH)/.test(error.message)) {
      res.status(409).json({ error: error.message });
    } else {
      console.error('[v832-runtime] failed', error);
      res.status(500).json({ error: 'Không hoàn tất được thao tác V8.3.2.' });
    }
  }
  return true;
};
