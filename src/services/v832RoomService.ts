import { signInAnonymously, type User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { PublicRoomSnapshotV832, RuntimeBuildV832 } from '../lib/lessonCompiler/v832/runtimePackage';
import type { PresenterRoomCommand } from '../lib/lessonCompiler/v832/roomState';
import type { LessonIRV83 } from '../lib/lessonCompiler/v832/lessonIRSchema';
import { decodePrivateLessonIR } from '../lib/lessonCompiler/v832/privateJsonCodec';
import type { SemanticRuleAttestation } from '../lib/lessonCompiler/v832/qualityGate';
import type { PresenceLedger } from '../lib/lessonRuntime/v84/presence';
import type { QuestionRun } from '../lib/lessonRuntime/v84/questionState';
import type { V84PublicClosing, V84StudentClosing, V84TeacherAnalytics } from '../lib/lessonRuntime/v84/closingContract';
import type { ReviewAnnotation, ReviewAttachment, ReviewScope } from '../lib/lessonReview/v832/reviewRequest';

export interface V832PrivateRoomSummary {
  ownerUid: string;
  packageId: string;
  classBinding?: { classId: string; className: string; grade: string };
  presenceLedger?: PresenceLedger;
  pendingClaims?: Record<string, { uid: string; requestedAtSec: number }>;
  questionRun?: QuestionRun | null;
}

export interface V84SimulationDraft {
  studentId: string;
  visualId: string;
  runKey: string;
  angleRad: number;
  updatedAtSec: number;
}

export interface V84NextStepRecord {
  studentId: string;
  nextStepId: string;
  responseRevision: number;
  closingRevision: number;
}

const safeId = (value: string): string => {
  if (!/^[A-Za-z0-9._:@-]{1,180}$/.test(value)) throw new Error('Mã phòng hoặc bài học không hợp lệ.');
  return value;
};

const postAction = async <T>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const user = auth.currentUser;
  if (!user) throw new Error('Cần đăng nhập để tiếp tục.');
  const response = await fetch('/api/classroom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, idToken: await user.getIdToken(), ...payload }),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'Không hoàn tất được thao tác.');
  return result;
};

export const ensureV832StudentIdentity = async (): Promise<User> => auth.currentUser ?? (await signInAnonymously(auth)).user;

export const subscribeV832PublicRoom = (
  roomId: string,
  onChange: (state: PublicRoomSnapshotV832 | null) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(doc(db, 'lessonV832Rooms', safeId(roomId), 'public', 'current'),
  snapshot => onChange(snapshot.exists() ? snapshot.data() as PublicRoomSnapshotV832 : null), onError);

export const subscribeV832PrivateRoom = (
  roomId: string,
  onChange: (value: V832PrivateRoomSummary | null) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(doc(db, 'lessonV832Rooms', safeId(roomId)),
  snapshot => onChange(snapshot.exists() ? snapshot.data() as V832PrivateRoomSummary : null), onError);

export const readV832PrivateBuild = async (packageId: string): Promise<RuntimeBuildV832 | null> => {
  const snapshot = await getDoc(doc(db, 'lessonV832Builds', safeId(packageId)));
  if (!snapshot.exists()) return null;
  const value = snapshot.data();
  return { ...value, privateLessonIR: decodePrivateLessonIR(value.privateLessonIR) } as RuntimeBuildV832;
};

export const subscribeV832Responses = (
  roomId: string,
  onChange: (responses: Array<{ participantUid: string; studentId?: string; activityId: string; questionInstanceId: string; revision: number; value: string }>) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(collection(db, 'lessonV832Rooms', safeId(roomId), 'responses'),
  snapshot => onChange(snapshot.docs.map(item => item.data() as { participantUid: string; studentId?: string; activityId: string; questionInstanceId: string; revision: number; value: string })), onError);

export const subscribeV84SimulationDrafts = (
  roomId: string,
  onChange: (drafts: Record<string, V84SimulationDraft>) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(collection(db, 'lessonV832Rooms', safeId(roomId), 'simulationDrafts'),
  snapshot => onChange(Object.fromEntries(snapshot.docs.map(item => [item.id, item.data() as V84SimulationDraft]))), onError);

export const subscribeV832Participants = (
  roomId: string,
  onChange: (participants: Array<{ participantUid: string; studentId?: string; displayName: string }>) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(collection(db, 'lessonV832Rooms', safeId(roomId), 'participants'),
  snapshot => onChange(snapshot.docs.map(item => item.data() as { participantUid: string; studentId?: string; displayName: string })), onError);

export const subscribeV832Participant = (
  roomId: string,
  uid: string,
  onChange: (participant: { studentId?: string; displayName?: string } | null) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(doc(db, 'lessonV832Rooms', safeId(roomId), 'participants', safeId(uid)),
  snapshot => onChange(snapshot.exists() ? snapshot.data() as { studentId?: string; displayName?: string } : null), onError);

export const readV832OwnResponse = (roomId: string, questionInstanceId: string): Promise<{ revision: number; value: string | null }> =>
  postAction('v832ReadOwnPreviewResponse', { roomId: safeId(roomId), questionInstanceId: safeId(questionInstanceId) });

export const joinV832PreviewRoom = (roomId: string, displayName: string): Promise<{ roomId: string; participantUid: string }> =>
  postAction('v832JoinPreviewRoom', { roomId: safeId(roomId), displayName });

export const submitV832PreviewResponse = (input: {
  roomId: string;
  questionInstanceId: string;
  clientNonce: string;
  value: string;
  mode: 'typed' | 'math';
}): Promise<{ revision: number; duplicate: boolean }> => postAction('v832SubmitPreviewResponse', input);

export const sendV832PresenterCommand = (
  roomId: string,
  command: PresenterRoomCommand,
): Promise<{ sessionRevision: number; activityId: string }> => postAction('v832PresenterCommand', { roomId: safeId(roomId), command });

export const saveV832PreviewBuild = (
  lessonIR: LessonIRV83,
  semanticAttestations: readonly SemanticRuleAttestation[],
): Promise<{ manifest: RuntimeBuildV832['manifest'] }> => postAction('v832SaveBuild', { lessonIR, semanticAttestations });

export const createV832PreviewRoom = (
  packageId: string,
): Promise<{ roomId: string; status: 'PREVIEW_ONLY'; links: Record<'presenter' | 'tv' | 'student' | 'coach', string> }> =>
  postAction('v832CreatePreviewRoom', { packageId: safeId(packageId) });

export const createV84ClassPreviewRoom = (
  packageId: string, classId: string,
): Promise<{ roomId: string; status: 'PREVIEW_ONLY'; links: Record<'presenter' | 'tv' | 'student' | 'coach', string> }> =>
  postAction('v84CreateClassPreviewRoom', { packageId: safeId(packageId), classId: safeId(classId) });

export const readV84RoomRoster = (roomId: string): Promise<{
  roomId: string; className: string; students: Array<{ studentId: string; name: string }>;
}> => postAction('v84ReadRoomRoster', { roomId: safeId(roomId) });

export const claimV84Student = (
  roomId: string, studentId: string, deviceToken: string,
): Promise<{ roomId: string; studentId: string; joined: true }> =>
  postAction('v84ClaimStudent', { roomId: safeId(roomId), studentId: safeId(studentId), deviceToken });

export const heartbeatV84Student = (
  roomId: string, studentId: string, deviceToken: string,
): Promise<{ active: true }> => postAction('v84Heartbeat', { roomId: safeId(roomId), studentId: safeId(studentId), deviceToken });

export const leaveV84Room = (
  roomId: string, studentId: string, deviceToken: string,
): Promise<{ status: 'LEAVE_PENDING_TEACHER' }> =>
  postAction('v84LeaveRoom', { roomId: safeId(roomId), studentId: safeId(studentId), deviceToken });

export const saveV84SimulationDraft = (input: {
  roomId: string; deviceToken: string; visualId: string; runKey: string; angleRad: number;
}): Promise<{ saved: true }> => postAction('v84SaveSimulationDraft', input);

export const readV84OwnSimulationDraft = (roomId: string, deviceToken: string): Promise<{
  angleRad: number | null; visualId: string | null;
}> => postAction('v84ReadOwnSimulationDraft', { roomId: safeId(roomId), deviceToken });

export interface V84SelfAssessmentRecord {
  studentId: string;
  participantUid: string;
  revision: number;
  clientNonce: string;
  contentHash: string;
  criteria: Array<{ criterionId: string; responseType: 'enum' | 'text'; value: string }>;
  submittedAt?: unknown;
}

export const submitV84SelfAssessment = (input: {
  roomId: string; packageId: string; contentHash: string; deviceToken: string; clientNonce: string;
  criteria: Array<{ criterionId: string; responseType: 'enum' | 'text'; value: string }>;
}): Promise<{ revision: number; duplicate: boolean }> => postAction('v84SubmitSelfAssessment', input);

export const readV84OwnSelfAssessment = (roomId: string, deviceToken: string): Promise<{ assessment: V84SelfAssessmentRecord | null }> =>
  postAction('v84ReadOwnSelfAssessment', { roomId: safeId(roomId), deviceToken });

export const submitV84NextStep = (input: {
  roomId: string; packageId: string; contentHash: string; deviceToken: string; clientNonce: string;
  nextStepId: string; responseRevision: number; closingRevision: number;
}): Promise<{ closingRevision: number; nextStepId: string; responseRevision: number; duplicate: boolean }> =>
  postAction('v84SubmitNextStep', input);

export const readV84OwnNextStep = (roomId: string, deviceToken: string): Promise<{ nextStep: V84NextStepRecord | null }> =>
  postAction('v84ReadOwnNextStep', { roomId: safeId(roomId), deviceToken });

export const subscribeV84PublicClosing = (
  roomId: string, closingRevision: number, onChange: (value: V84PublicClosing | null) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(doc(db, 'lessonV832Rooms', safeId(roomId), 'publicClosing', safeId(String(closingRevision))),
  snapshot => onChange(snapshot.exists() ? snapshot.data() as V84PublicClosing : null), onError);

export const subscribeV84StudentClosing = (
  roomId: string, studentId: string, closingRevision: number, onChange: (value: V84StudentClosing | null) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(doc(db, 'lessonV832Rooms', safeId(roomId), 'studentClosing', safeId(studentId), 'revisions', safeId(String(closingRevision))),
  snapshot => onChange(snapshot.exists() ? snapshot.data() as V84StudentClosing : null), onError);

export const subscribeV84TeacherAnalytics = (
  roomId: string, closingRevision: number, onChange: (value: Record<string, V84TeacherAnalytics> | null) => void,
  onError: (error: Error) => void,
): Unsubscribe => onSnapshot(doc(db, 'lessonV832Rooms', safeId(roomId), 'teacherAnalytics', 'current', 'revisions', safeId(String(closingRevision))),
  snapshot => onChange(snapshot.exists() ? snapshot.data() as Record<string, V84TeacherAnalytics> : null), onError);

export const updateV84Attendance = (
  roomId: string, studentId: string, operation: 'MARK_ABSENT' | 'MARK_PRESENT' | 'MARK_LATE_EXPECTED' | 'CONFIRM_LEFT' | 'RESET_CLAIM' | 'TRANSFER_DEVICE',
): Promise<{ updated: true }> => postAction('v84TeacherPresence', { roomId: safeId(roomId), studentId: safeId(studentId), operation });

export const sendV84PresenterCommand = (
  roomId: string,
  command: { id: string; expectedRevision: number; type: PresenterRoomCommand['type']
    | 'BRIEF_QUESTION' | 'OPEN_QUESTION' | 'NEXT_QUESTION' | 'EXTEND_15' | 'EXTEND_30'
    | 'LOCK_NOW' | 'SHOW_STATS' | 'REVEAL_QUESTION' | 'SKIP_OPTIONAL' | 'REOPEN_SAFE'
    | 'INCLUDE_LATE_NOW' | 'EXCLUDE_CURRENT' | 'RESOLVE_DISCONNECT'; studentId?: string;
    visualStateId?: string; presenterLocale?: 'vi' | 'en' | 'ja' },
): Promise<{ sessionRevision: number; activityId: string; questionPhase: string | null }> =>
  postAction('v84PresenterCommand', { roomId: safeId(roomId), command });

export const submitV84Response = (input: {
  roomId: string; questionInstanceId: string; clientNonce: string;
  value: string; mode: 'typed' | 'math';
}): Promise<{ revision: number; duplicate: boolean; questionPhase: string }> =>
  postAction('v84SubmitResponse', input);

export const tickV84Room = (roomId: string): Promise<{ questionPhase: string | null }> =>
  postAction('v84TickRoom', { roomId: safeId(roomId) });

export interface V832ReviewCaptureInput {
  roomId: string;
  expectedRevision: number;
  expectedQuestionRunKey?: string | null;
  expectedQuestionRunRevision?: number | null;
  expectedQuestionPhase?: string | null;
  role: 'presenter' | 'student' | 'coach';
  locale: 'vi' | 'en' | 'ja';
  viewport: { width: number; height: number; devicePixelRatio: number };
  route: string;
  visibleComponentIds: string[];
}

export const createV832ReviewRequest = (input: V832ReviewCaptureInput & {
  teacherMessage: string;
  screenshotAssetId: string;
  attachments: ReviewAttachment[];
  annotations: ReviewAnnotation[];
  scope: ReviewScope;
}): Promise<{ reviewId: string; status: 'NEW' }> => postAction('v832CreateReviewRequest', { ...input });
