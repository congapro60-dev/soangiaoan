import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useParams, useSearchParams } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { projectCoachSurface } from '../lib/lessonCompiler/v832/surfaceProjection';
import type { PublicRoomSnapshotV832, RuntimeBuildV832 } from '../lib/lessonCompiler/v832/runtimePackage';
import type { PublicRoomSnapshotV84 } from '../lib/lessonRuntime/v84/projectRoom';
import type { PublicMathVisual } from '../lib/lessonRuntime/v84/mathVisual/publicVisual';
import type { V84PublicClosing, V84StudentClosing, V84TeacherAnalytics } from '../lib/lessonRuntime/v84/closingContract';
import { getV84NextStepSaveErrorCopy, restoreV84NextStep } from '../lib/lessonRuntime/v84/closingNextStep';
import { computeLessonDrift, recommendRecovery } from '../lib/lessonRuntime/v84/timing';
import { summarizeCoachPresence } from '../lib/lessonRuntime/v84/coachPresence';
import type { PresenterRoomCommandType } from '../lib/lessonCompiler/v832/roomState';
import {
  ensureV832StudentIdentity, joinV832PreviewRoom, readV832PrivateBuild,
  sendV832PresenterCommand, submitV832PreviewResponse, subscribeV832Participant,
  subscribeV832Participants, subscribeV832PrivateRoom, subscribeV832PublicRoom,
  subscribeV832Responses, readV832OwnResponse,
  subscribeV84SimulationDrafts, type V84SimulationDraft,
  claimV84Student, heartbeatV84Student, readV84RoomRoster,
  leaveV84Room,
  updateV84Attendance, type V832PrivateRoomSummary,
  sendV84PresenterCommand, submitV84Response, tickV84Room,
  readV84OwnSimulationDraft, saveV84SimulationDraft,
  readV84OwnSelfAssessment, submitV84SelfAssessment, readV84OwnNextStep, submitV84NextStep,
  subscribeV84PublicClosing, subscribeV84StudentClosing, subscribeV84TeacherAnalytics,
} from '../services/v832RoomService';
import { LiveLessonRichText } from '../components/liveLesson/LiveLessonRichText';
import { MathAnswerInput } from '../components/liveLesson/MathAnswerInput';
import { MathVisualView } from '../components/liveLesson/v84/MathVisualView';
import { CoachExpectedContent } from '../components/liveLesson/v84/CoachExpectedContent';
import { useStudentDraft } from '../components/liveLesson/useStudentDraft';
import { ScreenReviewEntry } from '../components/lessonStudio/v832/ScreenReviewEntry';
import '../components/liveLesson/liveClassroom.css';
import './v832Room.css';

type RoomRole = 'presenter' | 'tv' | 'student' | 'coach';
type RoomView = PublicRoomSnapshotV832 & {
  activeQuestion?: PublicRoomSnapshotV84['activeQuestion']; mathVisuals?: PublicMathVisual[];
  clock?: PublicRoomSnapshotV84['clock'];
  canContinueDeviceBlock?: boolean;
  questionPhase?: PublicRoomSnapshotV84['questionPhase'];
  questionRunKey?: PublicRoomSnapshotV84['questionRunKey'];
  questionRunRevision?: PublicRoomSnapshotV84['questionRunRevision'];
  questionRequired?: PublicRoomSnapshotV84['questionRequired'];
};
type RoomCommandType = PresenterRoomCommandType | 'BRIEF_QUESTION' | 'OPEN_QUESTION' | 'NEXT_QUESTION'
  | 'EXTEND_15' | 'EXTEND_30' | 'LOCK_NOW' | 'SHOW_STATS' | 'REVEAL_QUESTION'
  | 'SKIP_OPTIONAL' | 'REOPEN_SAFE' | 'INCLUDE_LATE_NOW' | 'EXCLUDE_CURRENT' | 'RESOLVE_DISCONNECT';
type StudentQuestion = PublicRoomSnapshotV832['studentByLocale']['vi']['questions'][number];
type StudentVisual = PublicRoomSnapshotV832['studentByLocale']['vi']['visuals'][number];

const ROLE_LABELS: Record<RoomRole, string> = {
  presenter: 'Presenter', tv: 'Màn hình lớp', student: 'Học sinh', coach: 'Teacher Coach',
};
const waitingTitle: Record<'vi' | 'en' | 'ja', string> = {
  vi: 'Chờ bắt đầu', en: 'Waiting to start', ja: '開始待ち',
};
const joinedCountLabel: Record<'vi' | 'en' | 'ja', string> = {
  vi: 'Đã vào phòng', en: 'Joined', ja: '入室済み',
};
const handoffLabel: Record<PublicRoomSnapshotV832['handoffState'], string> = {
  FOCUS_PRESENTER: 'Nhìn lên màn hình',
  HANDOFF_TO_DEVICE: 'Chuyển sang thiết bị',
  DEVICE_WORK: 'Đang làm trên thiết bị',
  READY_TO_RECALL: 'Sẵn sàng thu về',
  RECALL_TO_PRESENTER: 'Nhìn lên màn hình',
  DEBRIEF_CHOT: 'Cùng chốt kiến thức',
  NEXT: 'Chuyển hoạt động',
};
const questionPhaseLabel: Record<NonNullable<PublicRoomSnapshotV84['activeQuestion']>['phase'], string> = {
  INTRO: 'Chuẩn bị', QUESTION_BRIEF: 'Sắp mở', QUESTION_OPEN: 'Đang trả lời',
  QUESTION_LOCKED: 'Đã khóa', STATS: 'Xem kết quả lớp', REVEAL: 'Đã chốt',
};
const inputTypeLabel: Record<string, string> = {
  short: 'Trả lời ngắn', text: 'Văn bản', math_input: 'Biểu thức Toán',
  mcq: 'Chọn một đáp án', multi: 'Chọn nhiều đáp án',
  multimodal: 'Bài làm đa phương thức', error_analysis: 'Phân tích lỗi',
  self_assessment: 'Tự đánh giá',
};
const formatRemaining = (seconds: number): string => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const questionTimeLabel = (question: NonNullable<RoomView['activeQuestion']>, nowSec: number): string => {
  const remaining = formatRemaining(Math.max(0, Math.ceil(question.deadlineAtSec - (question.pausedAtSec ?? nowSec))));
  return question.pausedAtSec !== undefined ? `Tạm dừng · Còn ${remaining}` : `Còn ${remaining}`;
};
const isSelfAssessmentPhase = (activityPhase?: string): boolean => /(?:^|_)(reflection|closing|self_assessment)$/.test(activityPhase ?? '');
export const hasPublicStudentQuestions = (student: { questions?: unknown[] }): boolean => (student.questions?.length ?? 0) > 0;

const attendanceActions = [
  ['MARK_PRESENT', 'Có mặt'], ['MARK_ABSENT', 'Vắng có xác nhận'],
  ['MARK_LATE_EXPECTED', 'Dự kiến đến muộn'], ['CONFIRM_LEFT', 'Đã rời lớp'],
  ['RESET_CLAIM', 'Đặt lại thiết bị'], ['TRANSFER_DEVICE', 'Chuyển sang thiết bị mới'],
] as const;
type AttendanceAction = typeof attendanceActions[number][0];
const attendanceLabel: Record<string, string> = {
  UNCONFIRMED: 'Chưa xác nhận', PRESENT: 'Có mặt', LATE_JOINED: 'Vào muộn',
  ABSENT_CONFIRMED: 'Vắng có xác nhận', LATE_EXPECTED: 'Dự kiến đến muộn', LEFT_CONFIRMED: 'Đã rời lớp',
};
const onlineLabel: Record<string, string> = { OFFLINE: 'Chưa kết nối', ACTIVE: 'Đang kết nối', DISCONNECTED: 'Mất kết nối tạm thời' };

const PresencePanel = ({ room, busy, onAction, onQuestionOverride, readOnly = false }: {
  room: V832PrivateRoomSummary;
  busy: boolean;
  onAction?: (studentId: string, operation: AttendanceAction) => void;
  onQuestionOverride?: (studentId: string, operation: 'INCLUDE_LATE_NOW' | 'EXCLUDE_CURRENT' | 'RESOLVE_DISCONNECT') => void;
  readOnly?: boolean;
}) => {
  const [actions, setActions] = useState<Record<string, AttendanceAction>>({});
  const [expanded, setExpanded] = useState(false);
  const roster = Object.values(room.presenceLedger ?? {}).sort((left, right) => left.name.localeCompare(right.name, 'vi'));
  return <details className="v832-presence-panel" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>Điểm danh · {room.classBinding?.className ?? 'Lớp học'} · {roster.filter(item => item.online === 'ACTIVE').length}/{roster.length} trực tuyến</summary>
    <div className="v832-presence-list">{roster.map(student => <div key={student.studentId} className="v832-presence-row">
      <div><strong>{student.name}</strong><span>{attendanceLabel[student.attendance]} · {onlineLabel[student.online]}</span>
        {student.leaveRequestedAt !== undefined && <span role="status">Học sinh xin rời lớp · chờ giáo viên xác nhận</span>}
        {room.pendingClaims?.[student.studentId] && <span role="status">Có thiết bị mới chờ xác nhận</span>}</div>
      {!readOnly && onAction && <div className="v832-presence-actions">
        <select aria-label={`Điểm danh ${student.name}`} value={actions[student.studentId] ?? 'MARK_PRESENT'}
          onChange={event => setActions(current => ({ ...current, [student.studentId]: event.target.value as AttendanceAction }))}>
          {attendanceActions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button disabled={busy || (actions[student.studentId] === 'TRANSFER_DEVICE' && !room.pendingClaims?.[student.studentId])}
          onClick={() => onAction(student.studentId, actions[student.studentId] ?? 'MARK_PRESENT')}>Áp dụng</button>
      </div>}
      {!readOnly && onQuestionOverride && room.questionRun?.phase === 'QUESTION_OPEN' && <div className="v832-presence-actions">
        {student.attendance === 'LATE_JOINED' && student.online === 'ACTIVE'
          && !room.questionRun.completionRequiredSet.includes(student.studentId)
          && <button disabled={busy} onClick={() => onQuestionOverride(student.studentId, 'INCLUDE_LATE_NOW')}>Tính từ câu này</button>}
        {room.questionRun.completionRequiredSet.includes(student.studentId)
          && <button disabled={busy} onClick={() => onQuestionOverride(student.studentId, 'EXCLUDE_CURRENT')}>Không chờ câu này</button>}
        {student.online === 'DISCONNECTED' && room.questionRun.completionRequiredSet.includes(student.studentId)
          && !room.questionRun.nonBlockingRequiredSet.includes(student.studentId)
          && <button disabled={busy} onClick={() => onQuestionOverride(student.studentId, 'RESOLVE_DISCONNECT')}>Bỏ chặn mất kết nối</button>}
      </div>}
    </div>)}</div>
  </details>;
};

const VisualSummary = ({ visuals, excludeIds = [] }: { visuals: StudentVisual[]; excludeIds?: string[] }) => visuals.some(visual => !excludeIds.includes(visual.id)) ? (
  <div className="v832-visual-grid" aria-label="Hình và biểu diễn hiện tại">
    {visuals.filter(visual => !excludeIds.includes(visual.id)).map(visual => <section key={visual.id} className="v832-visual-card">
      <p className="v832-eyebrow">{visual.type.replaceAll('_', ' ')} · {visual.stateId}</p>
      <p className="v832-visual-labels">{visual.visibleObjects.join(' · ') || 'Chưa có đối tượng hiển thị'}</p>
      {['diagram_2d', 'diagram_3d', 'interactive_simulation', 'deterministic_math_visual'].includes(visual.type)
        && <p className="v832-asset-warning">Biểu diễn hình học cần asset đã kiểm định trước giờ dạy.</p>}
    </section>)}
  </div>
) : null;

const TeacherControls = ({
  room, busy, onCommand,
}: {
  room: RoomView;
  busy: boolean;
  onCommand: (command: RoomCommandType) => void;
}) => {
  if (room.closed) return <p className="v832-control-status">Phòng đã kết thúc.</p>;
  if (!room.started) return <button className="v832-primary-button" disabled={busy} onClick={() => onCommand('START')}>Bắt đầu tiết học</button>;
  if (room.lobby) {
    const paused = room.timer.pausedAt !== null;
    const phase = room.questionPhase ?? room.activeQuestion?.phase;
    let next: { type: RoomCommandType; label: string } | null = null;
    if (!phase) {
      if (room.handoffState === 'FOCUS_PRESENTER') next = room.presenter.hasDeviceHandoff
        ? { type: 'HANDOFF_TO_DEVICE', label: 'Chuyển sang thiết bị' }
        : { type: 'NEXT_ACTIVITY', label: 'Hoạt động tiếp theo' };
      else if (room.handoffState === 'HANDOFF_TO_DEVICE') next = { type: 'DEVICE_WORK', label: 'Mở thiết bị' };
      else if (room.handoffState === 'DEVICE_WORK') next = room.canContinueDeviceBlock
        ? { type: 'NEXT_ACTIVITY', label: 'Hoạt động tiếp theo' }
        : { type: 'READY_TO_RECALL', label: 'Thu về màn hình' };
    } else if (phase === 'INTRO') next = { type: 'BRIEF_QUESTION', label: 'Giới thiệu câu hỏi' };
    else if (phase === 'QUESTION_BRIEF') {
      if (room.handoffState === 'FOCUS_PRESENTER' && room.presenter.hasDeviceHandoff) next = { type: 'HANDOFF_TO_DEVICE', label: 'Chuyển sang thiết bị' };
      else if (room.handoffState === 'HANDOFF_TO_DEVICE') next = { type: 'DEVICE_WORK', label: 'Mở thiết bị' };
      else if (room.handoffState === 'DEVICE_WORK') next = { type: 'OPEN_QUESTION', label: 'Mở câu hỏi' };
    } else if ((phase === 'REVEAL' || (phase === 'STATS' && room.activeQuestion?.revealPolicy === 'no_reveal')) && room.activeQuestion) {
      if (room.activeQuestion.questionNumber < room.activeQuestion.questionTotal) next = { type: 'NEXT_QUESTION', label: 'Câu tiếp theo' };
      else if (room.canContinueDeviceBlock) next = { type: 'NEXT_ACTIVITY', label: 'Hoạt động tiếp theo' };
      else if (room.handoffState === 'DEVICE_WORK') next = { type: 'READY_TO_RECALL', label: 'Thu về màn hình' };
    }
    if (!next && room.handoffState === 'READY_TO_RECALL') next = { type: 'RECALL_TO_PRESENTER', label: 'Nhìn lên màn hình' };
    else if (!next && room.handoffState === 'RECALL_TO_PRESENTER') next = { type: 'DEBRIEF_CHOT', label: 'Chốt' };
    else if (!next && room.handoffState === 'DEBRIEF_CHOT') next = { type: 'NEXT_ACTIVITY', label: 'Hoạt động tiếp theo' };
    return <div className="v832-control-row" aria-label="Điều khiển Presenter">
      {next && <button className="v832-primary-button" disabled={busy || paused} onClick={() => onCommand(next.type)}>{next.label}</button>}
      <button disabled={busy} onClick={() => onCommand(paused ? 'RESUME_TIMER' : 'PAUSE_TIMER')}>
        {paused ? 'Tiếp tục đồng hồ' : 'Tạm dừng đồng hồ'}
      </button>
      {room.questionRequired === false && (phase === 'INTRO' || phase === 'QUESTION_BRIEF')
        && <button disabled={busy || paused} onClick={() => onCommand('SKIP_OPTIONAL')}>Bỏ qua câu tùy chọn</button>}
      {phase === 'QUESTION_OPEN' && <>
        <button disabled={busy} onClick={() => onCommand('EXTEND_15')}>Thêm 15 giây</button>
        <button disabled={busy} onClick={() => onCommand('EXTEND_30')}>Thêm 30 giây</button>
        <button disabled={busy} onClick={() => onCommand('LOCK_NOW')}>Khóa ngay</button>
      </>}
      {phase === 'QUESTION_LOCKED' && <button className="v832-primary-button" disabled={busy} onClick={() => onCommand('SHOW_STATS')}>Hiện thống kê</button>}
      {phase === 'STATS' && room.activeQuestion?.revealPolicy !== 'no_reveal'
        && <button className="v832-primary-button" disabled={busy} onClick={() => onCommand('REVEAL_QUESTION')}>Chốt đáp án</button>}
      {(phase === 'STATS' || phase === 'QUESTION_LOCKED') && <button disabled={busy || paused} onClick={() => onCommand('REOPEN_SAFE')}>Mở lại câu</button>}
      <button disabled={busy} onClick={() => onCommand('END')}>Kết thúc</button>
    </div>;
  }
  const state = room.handoffState;
  const handoffControl: Partial<Record<typeof state, { type: PresenterRoomCommandType; label: string }>> = {
    FOCUS_PRESENTER: room.presenter.hasDeviceHandoff ? { type: 'HANDOFF_TO_DEVICE', label: 'Chuyển sang thiết bị' } : undefined,
    HANDOFF_TO_DEVICE: { type: 'DEVICE_WORK', label: 'Mở nhiệm vụ trên máy' },
    DEVICE_WORK: { type: 'READY_TO_RECALL', label: 'Đủ dữ liệu để thu về' },
    READY_TO_RECALL: { type: 'RECALL_TO_PRESENTER', label: 'Thu về màn hình' },
    RECALL_TO_PRESENTER: { type: 'DEBRIEF_CHOT', label: 'Bắt đầu Chốt' },
  };
  const handoff = handoffControl[state];
  const nextType = room.presenter.nextControl as PresenterRoomCommandType;
  const nextLabel = nextType === 'REVEAL' ? 'Chốt câu hỏi' : nextType === 'QUESTION_NEXT' ? 'Câu hỏi tiếp theo' : 'Hoạt động tiếp theo';
  return <div className="v832-control-row" aria-label="Điều khiển Presenter">
    <button disabled={busy} onClick={() => onCommand('PREV_ACTIVITY')}>Lùi</button>
    {handoff && <button className="v832-primary-button" disabled={busy} onClick={() => onCommand(handoff.type)}>{handoff.label}</button>}
    {state !== 'HANDOFF_TO_DEVICE' && state !== 'DEVICE_WORK' && state !== 'READY_TO_RECALL'
      && <button className="v832-primary-button" disabled={busy} onClick={() => onCommand(nextType)}>{nextLabel}</button>}
    <button disabled={busy} onClick={() => onCommand('END')}>Kết thúc</button>
  </div>;
};

const PresenterStage = ({ room, role, busy, canControl, onCommand, nowSec }: {
  room: RoomView;
  role: 'tv' | 'presenter';
  busy: boolean;
  canControl: boolean;
  onCommand: (command: RoomCommandType) => void;
  nowSec: number;
}) => <main className={`v832-stage v832-stage--${role}${room.activeQuestion ? ' v832-stage--active-question' : ''}${room.activeQuestion && room.mathVisuals?.length ? ' v832-stage--visual-question' : ''}`}>
  <header className="v832-stage-header">
    <span>{room.lobby ? 'V8.4' : 'V8.3.2'} · {role === 'tv' && room.presenterLocale !== 'vi'
      ? room.presenterLocale === 'en' ? 'Classroom screen' : '教室スクリーン' : ROLE_LABELS[role]}</span>
    <span>{room.started ? room.presenter.title : waitingTitle[room.presenterLocale]}</span>
  </header>
  <div className="v832-beacon" aria-live="polite">{room.presenter.attentionBeacon.copy}</div>
  <section className="v832-stage-main" aria-labelledby="v832-presenter-title">
    <h1 id="v832-presenter-title" className={room.activeQuestion ? 'sr-only' : undefined}>
      <LiveLessonRichText text={room.presenter.title} mathScale="tv" />
    </h1>
    {!room.started ? <div className="v832-stage-copy"><p>{room.presenter.copy}</p>
      {room.lobby && <p role="status">{joinedCountLabel[room.presenterLocale]}: {room.lobby.joinedCount}/{room.lobby.rosterCount}</p>}
    </div>
      : !room.activeQuestion && <div className="v832-stage-copy"><LiveLessonRichText text={room.presenter.copy} mathScale="tv" /></div>}
    <VisualSummary visuals={room.presenter.visuals} excludeIds={room.mathVisuals?.map(visual => visual.visualId)} />
    {room.mathVisuals?.map(visual => <MathVisualView key={visual.visualId} visual={visual} locale={room.presenterLocale} />)}
    {room.activeQuestion && <section className="v832-active-question" aria-label="Câu hỏi hiện tại">
      <p className="v832-eyebrow">Câu {room.activeQuestion.questionNumber}/{room.activeQuestion.questionTotal}</p>
      <div className="v832-active-question__prompt"><LiveLessonRichText text={room.activeQuestion.prompt} mathScale="tv" /></div>
      {!room.closed && room.activeQuestion.phase === 'QUESTION_OPEN' && <p className="v84-question-clock">
        {questionTimeLabel(room.activeQuestion, nowSec)}
      </p>}
      {room.closed && <p>Tiết học đã kết thúc.</p>}
      {room.activeQuestion.phase === 'QUESTION_OPEN' && <p>Đã nộp: {room.activeQuestion.requiredCompleted}/{room.activeQuestion.requiredTotal} cần nộp · {room.activeQuestion.validResponses} bài hợp lệ</p>}
      {(room.activeQuestion.phase === 'STATS' || room.activeQuestion.phase === 'REVEAL') && <aside className="v832-active-question__stats">
        <strong>Thống kê câu này</strong><p>{room.activeQuestion.requiredCompleted}/{room.activeQuestion.requiredTotal} hoàn tất · {room.activeQuestion.validResponses} bài hợp lệ</p>
        {room.activeQuestion.stats?.kind === 'choice_distribution' && <div className="v832-stat-choices">
          {room.activeQuestion.stats.choices.map(choice => <p key={choice.id}>{choice.id}: {choice.count}</p>)}
        </div>}
        {room.activeQuestion.stats?.kind === 'math_clusters' && <div className="v832-stat-choices">
          {room.activeQuestion.stats.common.map(cluster => <p key={cluster.answer}>{cluster.answer}: {cluster.count}</p>)}
          {room.activeQuestion.stats.otherCount > 0 && <p>Đáp án khác: {room.activeQuestion.stats.otherCount}</p>}
        </div>}
        {room.activeQuestion.stats?.kind === 'matrix_distribution' && <div className="v832-stat-matrix">
          {room.activeQuestion.stats.rows.map(row => <p key={row.id}>Dòng {row.id}: Đúng {row.trueCount} · Sai {row.falseCount}
            {row.unclassifiedCount > 0 && ` · Chưa rõ ${row.unclassifiedCount}`}</p>)}
        </div>}
      </aside>}
      {room.activeQuestion.phase === 'REVEAL' && room.activeQuestion.answer !== undefined && <div className="v832-chot">
        <strong>Chốt đáp án</strong>
        <LiveLessonRichText text={typeof room.activeQuestion.answer === 'string' ? room.activeQuestion.answer : JSON.stringify(room.activeQuestion.answer)} mathScale="tv" />
      </div>}
    </section>}
    {room.presenter.questionBuild.length > 0 && <div className="v832-question-build">
      {room.presenter.questionBuild.map((step, index) => <div key={`${step.type}-${index}`} className={step.type === 'reveal' ? 'v832-chot' : 'v832-question'}>
        {'label' in step && <strong>{step.label}</strong>}
        {'content' in step && <LiveLessonRichText text={String(step.content)} mathScale="tv" />}
      </div>)}
    </div>}
    {room.handoffState === 'DEVICE_WORK' && !room.activeQuestion && <p className="v832-bridge">Học sinh đang làm trên thiết bị. Quan sát tiến độ rồi thu về màn hình.</p>}
    {room.handoffState === 'RECALL_TO_PRESENTER' && <p className="v832-recall">✓ Đã lưu · Nhìn lên màn hình.</p>}
  </section>
  {role === 'presenter' && canControl && <footer className="v832-presenter-dock"><TeacherControls room={room} busy={busy} onCommand={onCommand} /></footer>}
  {role === 'presenter' && !canControl && <p className="v832-control-status">Đang xác minh quyền điều khiển của giáo viên.</p>}
</main>;

const StudentQuestionCard = ({ question, roomId, uid, runKey, busy, locked, paused = false, mathVisual, locale = 'vi', onSubmit }: {
  question: StudentQuestion;
  roomId: string;
  uid: string;
  runKey?: string;
  busy: boolean;
  locked: boolean;
  paused?: boolean;
  mathVisual?: PublicMathVisual;
  locale?: 'vi' | 'en' | 'ja';
  onSubmit: (value: string) => Promise<number | null>;
}) => {
  const inputId = useId();
  const draftScope = runKey ?? question.instanceId;
  const { textValue: draft, setTextValue: setDraft, recordSubmission, storageFailed } = useStudentDraft(roomId, uid, draftScope);
  const [submittedRevision, setSubmittedRevision] = useState<number>();
  const [responseError, setResponseError] = useState<string | null>(null);
  const simulationVisualId = mathVisual?.renderer === 'unit_circle' ? mathVisual.visualId : null;
  const [serverDraftLoaded, setServerDraftLoaded] = useState(!runKey || !simulationVisualId);
  const [theta, setTheta] = useState(() => {
    const key = `v84-simulation:${roomId}:${uid}:${draftScope}`;
    try {
      const stored = window.localStorage.getItem(key);
      const angle = Number(stored);
      return stored !== null && Number.isFinite(angle) ? angle
        : mathVisual?.renderer === 'unit_circle' ? mathVisual.model.defaultAngleRad : 0;
    } catch { return mathVisual?.renderer === 'unit_circle' ? mathVisual.model.defaultAngleRad : 0; }
  });
  useEffect(() => {
    if (mathVisual?.renderer !== 'unit_circle') return;
    try { window.localStorage.setItem(`v84-simulation:${roomId}:${uid}:${draftScope}`, String(theta)); }
    catch { setResponseError('Thiết bị không lưu được vị trí mô phỏng. Hãy nộp trước khi rời màn hình.'); }
  }, [mathVisual, roomId, uid, draftScope, theta]);
  useEffect(() => {
    if (!runKey || !simulationVisualId) return;
    let active = true;
    const deviceToken = window.localStorage.getItem(`v84-device:${roomId}:${uid}`);
    if (!deviceToken) { setResponseError('Thiết bị cần được xác nhận lại trước khi mở mô phỏng.'); return; }
    void readV84OwnSimulationDraft(roomId, deviceToken).then(saved => {
      if (!active) return;
      if (saved.visualId === simulationVisualId && typeof saved.angleRad === 'number') setTheta(saved.angleRad);
      setServerDraftLoaded(true);
    }).catch(cause => { if (active) setResponseError(cause instanceof Error ? cause.message : 'Không khôi phục được mô phỏng.'); });
    return () => { active = false; };
  }, [roomId, uid, runKey, simulationVisualId]);
  useEffect(() => {
    if (!serverDraftLoaded || !runKey || !simulationVisualId || locked || paused) return;
    const deviceToken = window.localStorage.getItem(`v84-device:${roomId}:${uid}`);
    if (!deviceToken) return;
    const timeout = window.setTimeout(() => {
      void saveV84SimulationDraft({ roomId, deviceToken, visualId: simulationVisualId, runKey, angleRad: theta })
        .catch(cause => setResponseError(cause instanceof Error ? cause.message : 'Không lưu được vị trí mô phỏng.'));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [serverDraftLoaded, runKey, simulationVisualId, roomId, uid, theta, locked, paused]);
  useEffect(() => {
    let active = true;
    void readV832OwnResponse(roomId, question.instanceId).then(response => {
      if (active) setSubmittedRevision(response.revision || undefined);
    }).catch(cause => { if (active) setResponseError(cause instanceof Error ? cause.message : 'Không đọc được bài đã nộp.'); });
    return () => { active = false; };
  }, [roomId, uid, question.instanceId]);
  const choices = question.options ?? [];
  const isChoice = (question.responseType === 'mcq' || question.responseType === 'multi') && choices.length > 0;
  const simulation = mathVisual?.renderer === 'unit_circle' && question.responseType === 'multimodal';
  return <section className="v832-student-question" aria-labelledby={`${inputId}-prompt`}>
    <h2 id={`${inputId}-prompt`}><LiveLessonRichText text={question.prompt} mathScale="student" /></h2>
    {mathVisual && <MathVisualView visual={mathVisual} theta={theta} locale={locale}
      onThetaChange={simulation && !locked && !paused && serverDraftLoaded ? setTheta : undefined} />}
    {paused && <p role="status">Giáo viên đang tạm dừng. Bản nháp của em được giữ lại.</p>}
    {simulation && !serverDraftLoaded && <p role="status">Đang khôi phục vị trí mô phỏng…</p>}
    {isChoice ? <fieldset className="v832-options">
      <legend className="sr-only">Chọn đáp án</legend>
      {choices.map(option => {
        const value = typeof option === 'string' ? option : option.id;
        const label = typeof option === 'string' ? option : option.label;
        const checked = question.responseType === 'multi' ? draft.split(',').includes(value) : draft === value;
        return <label key={value} className="v832-option">
          <input type={question.responseType === 'multi' ? 'checkbox' : 'radio'} name={inputId} value={value} checked={checked} disabled={locked || paused}
            onChange={() => setDraft(question.responseType === 'multi'
              ? checked ? draft.split(',').filter(item => item !== value).join(',') : [...draft.split(',').filter(Boolean), value].join(',')
              : value)} />
          <span>{label}</span>
        </label>;
      })}
    </fieldset> : question.responseType === 'true_false_matrix'
      ? <label className="v832-text-label" htmlFor={inputId}>Nhập Đ hoặc S cho từng dòng theo thứ tự, cách nhau bằng dấu phẩy
        <textarea id={inputId} value={draft} onChange={event => setDraft(event.target.value)} disabled={locked || paused}
          maxLength={4000} rows={3} placeholder="Ví dụ: Đ, S, Đ" />
      </label> : simulation
      ? <label className="v832-text-label" htmlFor={inputId}>Giải thích vị trí em chọn
        <textarea id={inputId} value={draft} onChange={event => setDraft(event.target.value)} disabled={locked || paused} maxLength={1000} rows={3} />
      </label> : question.responseType === 'math_input'
      ? <MathAnswerInput value={draft} onChange={setDraft} disabled={locked || paused} ariaLabel="Nhập câu trả lời Toán học" maxLength={4000} />
      : <label className="v832-text-label" htmlFor={inputId}>Câu trả lời của em
        <textarea id={inputId} value={draft} onChange={event => setDraft(event.target.value)} disabled={locked || paused} maxLength={4000} rows={4} />
      </label>}
    <div className="v832-question-actions">
      <button className="v832-primary-button" disabled={busy || locked || paused || (simulation && !serverDraftLoaded) || (!simulation && !draft.trim())}
        onClick={() => void onSubmit(simulation ? JSON.stringify({ angleRad: theta, explanation: draft }) : draft).then(revision => {
        if (revision) { setSubmittedRevision(revision); recordSubmission(); }
      })}>
        {locked ? 'Đã khóa' : paused ? 'Tạm dừng' : busy ? 'Đang lưu…' : submittedRevision ? 'Nộp bản sửa' : 'Nộp bài'}
      </button>
      {submittedRevision && <span role="status">Đã lưu bản {submittedRevision}</span>}
      {storageFailed && <span role="alert">Thiết bị không lưu được bản nháp; hãy nộp trước khi rời màn hình.</span>}
      {responseError && <span role="alert">{responseError}</span>}
    </div>
  </section>;
};

const SELF_ASSESSMENT_ENUMS: Array<{ value: 'not_started' | 'progressing' | 'achieved' | 'exceeded' }> = [
  { value: 'not_started' },
  { value: 'progressing' },
  { value: 'achieved' },
  { value: 'exceeded' },
];
type AssessmentErrorKey = 'loadError' | 'saveError' | 'closed' | 'hint' | 'failed';
const assessmentCopy = {
  vi: { title: 'Tự đánh giá mục tiêu bài học', levels: ['Chưa bắt đầu', 'Đang tiến bộ', 'Đã đạt', 'Vượt mức'], submit: 'Nộp tự đánh giá', update: 'Cập nhật tự đánh giá', saving: 'Đang lưu…', saved: 'Đã lưu bản', loading: 'Đang tải bản tự đánh giá đã lưu…', failed: 'Chưa thể xác nhận bản tự đánh giá đã lưu.', hint: 'Chọn mức độ cho tất cả tiêu chí', closed: 'Phòng đã kết thúc · Chỉ xem lại', loadError: 'Không tải được tự đánh giá.', saveError: 'Không lưu được tự đánh giá.', retry: 'Thử lại', unsavedChanges: 'Chưa lưu thay đổi' },
  en: { title: 'Lesson self-assessment', levels: ['Not started', 'Progressing', 'Achieved', 'Exceeded'], submit: 'Submit self-assessment', update: 'Update self-assessment', saving: 'Saving…', saved: 'Saved revision', loading: 'Loading saved self-assessment…', failed: 'Could not verify saved self-assessment.', hint: 'Select a level for every criterion', closed: 'Room closed · Read only', loadError: 'Could not load self-assessment.', saveError: 'Could not save self-assessment.', retry: 'Retry', unsavedChanges: 'Unsaved changes' },
  ja: { title: '学習目標の自己評価', levels: ['未着手', '取り組み中', '達成', '目標以上'], submit: '自己評価を送信', update: '自己評価を更新', saving: '保存中…', saved: '保存済みの版', loading: '保存した自己評価を読み込み中…', failed: '保存した自己評価を確認できません。', hint: 'すべての項目で達成度を選んでください', closed: '授業終了 · 閲覧のみ', loadError: '自己評価を読み込めませんでした。', saveError: '自己評価を保存できませんでした。', retry: '再試行', unsavedChanges: '未保存の変更' },
};

export const StudentSelfAssessmentPanel = (props: {
  room: RoomView; roomId: string; uid: string; claimedStudentId: string;
  deviceToken: string | null; closed: boolean; locale: 'vi' | 'en' | 'ja';
}) => {
  const criterionIds = (props.room.successCriteria ?? []).map(item => item.id);
  const remountKey = JSON.stringify([
    props.roomId,
    props.uid,
    props.claimedStudentId,
    props.room.packageId,
    props.room.contentHash,
    props.deviceToken,
    criterionIds,
  ]);
  return <SelfAssessmentForm key={remountKey} {...props} />;
};

const nextStepCopy = {
  vi: { title: 'Bước tiếp theo', hint: 'Chọn một việc em muốn làm tiếp theo.', submit: 'Lưu lựa chọn', saved: 'Đã lưu lựa chọn.', closed: 'Giáo viên đã chốt tiết học.', loadFailed: 'Không kiểm tra được lựa chọn đã lưu. Tải lại phòng trước khi gửi.' },
  en: { title: 'Next step', hint: 'Choose what you want to do next.', submit: 'Save choice', saved: 'Choice saved.', closed: 'The teacher has closed the lesson.', loadFailed: 'Could not check the saved choice. Reload the room before submitting.', waiting: 'Your teacher will take a look at your work.' },
  ja: { title: '次の一歩', hint: '次に取り組むことを選んでください。', submit: '選択を保存', saved: '選択を保存しました。', closed: '授業は終了しました。', loadFailed: '保存済みの選択を確認できません。再読み込みしてから送信してください。' },
} as const;

export const StudentNextStepPanel = ({ room, roomId, deviceToken, locale }: {
  room: RoomView; roomId: string; deviceToken: string | null; claimedStudentId: string; locale: 'vi' | 'en' | 'ja';
}) => {
  const options = room.nextStepOptions ?? [];
  const optionsKey = options.map(option => `${option.id}:${option.label.vi}`).join('|');
  const copy = nextStepCopy[locale];
  const [selected, setSelected] = useState('');
  const [responseRevision, setResponseRevision] = useState(0);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'failed'>('loading');
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ signature: string; clientNonce: string } | null>(null);
  useEffect(() => {
    let active = true;
    setStatus('loading'); setSelected(''); setResponseRevision(0); setError(null); pending.current = null;
    if (!deviceToken || !room.closingRevision) { setStatus('idle'); return () => { active = false; }; }
    void readV84OwnNextStep(roomId, deviceToken).then(({ nextStep }) => {
      if (!active) return;
      if (nextStep) {
        const restored = restoreV84NextStep(nextStep, options, room.closingRevision!);
        setSelected(restored.nextStepId ?? ''); setResponseRevision(restored.responseRevision);
        setStatus('saved');
      } else setStatus('idle');
    }).catch(cause => {
      if (active) { setError(copy.loadFailed); setStatus('failed'); }
    });
    return () => { active = false; };
  }, [roomId, deviceToken, room.closingRevision, optionsKey]);
  const eligible = Boolean(room.closingRevision && !room.closed && room.started && !room.activeQuestion
    && isSelfAssessmentPhase(room.activityPhase) && deviceToken);
  if (options.length === 0 || (!eligible && !room.closed)) return null;
  const save = async () => {
    if (!deviceToken || !room.closingRevision || !selected || status === 'saving') return;
    setStatus('saving'); setError(null);
    try {
      const { nextStep: current } = await readV84OwnNextStep(roomId, deviceToken);
      const restored = restoreV84NextStep(current, options.map(option => ({ id: option.id, taskRef: option.id })), room.closingRevision);
      if (restored.nextStepId === selected) {
        setResponseRevision(restored.responseRevision); pending.current = null; setStatus('saved'); return;
      }
      setResponseRevision(restored.responseRevision);
      const signature = `${roomId}:${room.closingRevision}:${selected}`;
      if (pending.current?.signature !== signature) pending.current = { signature, clientNonce: crypto.randomUUID() };
      const result = await submitV84NextStep({ roomId, packageId: room.packageId, contentHash: room.contentHash,
        deviceToken, clientNonce: pending.current.clientNonce, nextStepId: selected,
        responseRevision: restored.responseRevision + 1, closingRevision: room.closingRevision });
      setResponseRevision(result.responseRevision);
      pending.current = null;
      setStatus('saved');
    } catch (cause) { setStatus('idle'); setError(getV84NextStepSaveErrorCopy(cause, locale)); }
  };
  return <section className="v832-student-task" aria-label={copy.title}>
    <h2>{copy.title}</h2>
    <p>{room.closed ? copy.closed : copy.hint}</p>
    {!room.closed && <div role="radiogroup" aria-label={copy.title}>
      {options.map((option, index) => <label key={option.id} className="v832-choice-row">
        <input type="radio" name={`next-step-${roomId}`} value={String(index)} checked={selected === option.id}
          onChange={event => { setSelected(options[Number(event.target.value)]?.id ?? ''); setStatus('idle'); }} disabled={!eligible || status === 'saving' || status === 'loading'} />
        <span>{option.label[locale]}</span>
      </label>)}
      <button type="button" className="v832-primary-button" disabled={!eligible || !selected || status === 'saving' || status === 'loading' || status === 'saved' || status === 'failed'} onClick={() => void save()}>{copy.submit}</button>
    </div>}
    {status === 'saved' && <p role="status">{copy.saved}</p>}
    {error && <p role="alert" className="v832-error-text">{error}</p>}
  </section>;
};

const PublicClosingCard = ({ value, locale }: { value: V84PublicClosing; locale: 'vi' | 'en' | 'ja' }) => {
  const copy = value.localeCopy[locale];
  return <section className="v832-closing-card" aria-label={copy.title}>
    <p className="v832-eyebrow">{copy.title}</p><h2>{copy.evidenceBasedStatement}</h2><p>{copy.classProgress}</p>
  </section>;
};

const StudentClosingCard = ({ value, locale }: { value: V84StudentClosing; locale: 'vi' | 'en' | 'ja' }) => {
  const copy = { vi: { title: 'Phản hồi của em', waiting: 'Bài làm đang được thầy/cô xem lại.', next: 'Bước tiếp theo', homework: 'Việc em có thể làm tiếp' }, en: { title: 'Your feedback', waiting: 'Your work is waiting for teacher review.', next: 'Next step', homework: 'What you can do next' }, ja: { title: 'あなたへのフィードバック', waiting: '先生の確認を待っています。', next: '次の一歩', homework: '次に取り組めること' } }[locale];
  return <section className="v832-closing-card" aria-label={copy.title}>
    <h2>{copy.title}</h2>
    {value.evidenceStatementsByLocale[locale].map((statement, index) => <p key={index}>{statement}</p>)}
    {value.status !== 'ready' && <p role="status">{value.teacherMessageCopy?.[locale] ?? copy.waiting}</p>}
    {value.nextActionCopy && <p><strong>{copy.next}:</strong> {value.nextActionCopy[locale]}</p>}
    {value.differentiatedHomework.length > 0 && <div><strong>{copy.homework}</strong>{value.differentiatedHomework.map(task => <p key={task.id}>{task.labelCopy[locale]}</p>)}</div>}
  </section>;
};

export const teacherEvidenceCount = (value: Pick<V84TeacherAnalytics, 'evidenceItems'>): number =>
  Array.isArray(value.evidenceItems) ? value.evidenceItems.length : 0;

const CoachClosingCard = ({ value }: { value: Record<string, V84TeacherAnalytics> }) => <section className="v832-coach-card" aria-label="Phân tích riêng cuối tiết">
  <h2>Phân tích riêng cuối tiết</h2>
  {Object.values(value).map(row => <article key={row.studentId}>
    <strong>{row.studentName}</strong>
    <p>{teacherEvidenceCount(row)} minh chứng · {row.requiresTeacherReview ? 'Cần thầy/cô xem lại' : 'Đã đủ dữ liệu được hỗ trợ'}</p>
  </article>)}
</section>;

const SelfAssessmentForm = ({
  room,
  roomId,
  uid,
  claimedStudentId,
  deviceToken,
  closed,
  locale,
}: {
  room: RoomView;
  roomId: string;
  uid: string;
  claimedStudentId: string;
  deviceToken: string | null;
  closed: boolean;
  locale: 'vi' | 'en' | 'ja';
}) => {
  const copy = assessmentCopy[locale];
  const [values, setValues] = useState<Record<string, 'not_started' | 'progressing' | 'achieved' | 'exceeded'>>({});
  const [savedValues, setSavedValues] = useState<Record<string, 'not_started' | 'progressing' | 'achieved' | 'exceeded'> | null>(null);
  const [readState, setReadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [serverRevision, setServerRevision] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<AssessmentErrorKey | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const pending = useRef<{ payload: string; nonce: string } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const errorMessage = errorKey ? copy[errorKey] : null;
  const criteriaKey = JSON.stringify((room.successCriteria ?? []).map(item => item.id));
  const editable = !closed && room.started && room.attentionSurface === 'student_device'
    && room.handoffState === 'DEVICE_WORK' && (room.timer?.pausedAt ?? null) === null && !room.activeQuestion
    && isSelfAssessmentPhase(room.activityPhase);

  useEffect(() => {
    if (!deviceToken || !roomId) {
      setReadState('failed');
      setErrorKey('loadError');
      return;
    }
    let active = true;
    setReadState('loading');
    setErrorKey(null);

    readV84OwnSelfAssessment(roomId, deviceToken)
      .then(res => {
        if (!active || !mountedRef.current) return;
        if (typeof res !== 'object' || res === null || !Object.prototype.hasOwnProperty.call(res, 'assessment')) {
          throw new Error('Malformed self-assessment envelope');
        }
        if (res.assessment === null) {
          setValues({});
          setSavedValues(null);
          setServerRevision(null);
          setReadState('ready');
          return;
        }
        const record = res.assessment;
        if (
          typeof record !== 'object' ||
          record === null ||
          record.contentHash !== room.contentHash ||
          record.participantUid !== uid ||
          record.studentId !== claimedStudentId ||
          typeof record.revision !== 'number' ||
          !Number.isSafeInteger(record.revision) ||
          record.revision < 1 ||
          !Array.isArray(record.criteria) ||
          record.criteria.length !== room.successCriteria.length ||
          new Set(record.criteria.map(item => item.criterionId)).size !== room.successCriteria.length ||
          !record.criteria.every(item =>
            room.successCriteria.some(sc => sc.id === item.criterionId) &&
            item.responseType === 'enum' &&
            SELF_ASSESSMENT_ENUMS.some(option => option.value === item.value)
          )
        ) {
          throw new Error('Invalid saved self-assessment');
        }
        setServerRevision(record.revision);
        const mapped: Record<string, 'not_started' | 'progressing' | 'achieved' | 'exceeded'> = {};
        for (const item of record.criteria) {
          if (item.value === 'not_started' || item.value === 'progressing' || item.value === 'achieved' || item.value === 'exceeded') {
            mapped[item.criterionId] = item.value;
          }
        }
        setValues(mapped);
        setSavedValues(mapped);
        setReadState('ready');
      })
      .catch(_cause => {
        if (!active || !mountedRef.current) return;
        setReadState('failed');
        setErrorKey('loadError');
      });

    return () => {
      active = false;
    };
  }, [roomId, deviceToken, room.packageId, room.contentHash, criteriaKey, uid, claimedStudentId, reloadTick]);

  const allSelected = (room.successCriteria ?? []).length > 0 && room.successCriteria.every(sc => Boolean(values[sc.id]));
  const isDirty = savedValues !== null
    ? (room.successCriteria ?? []).some(sc => values[sc.id] !== savedValues[sc.id])
    : Object.keys(values).length > 0;

  const handleSubmit = async () => {
    if (!editable || readState !== 'ready' || submitting) return;
    if (closed) {
      setErrorKey('closed');
      return;
    }
    if (!deviceToken) {
      setErrorKey('saveError');
      return;
    }
    if (!allSelected) {
      setErrorKey('hint');
      return;
    }

    const targetCriteria = room.successCriteria.map(sc => ({
      criterionId: sc.id,
      responseType: 'enum' as const,
      value: values[sc.id]!,
    }));

    const payload = JSON.stringify({
      packageId: room.packageId,
      contentHash: room.contentHash,
      criteria: targetCriteria,
    });

    setSubmitting(true);
    setErrorKey(null);

    try {
      if (!pending.current || pending.current.payload !== payload) {
        pending.current = { payload, nonce: crypto.randomUUID() };
      }
      const clientNonce = pending.current.nonce;

      const result = await submitV84SelfAssessment({
        roomId,
        packageId: room.packageId,
        contentHash: room.contentHash,
        deviceToken,
        clientNonce,
        criteria: targetCriteria,
      });

      if (!mountedRef.current) return;

      if (
        typeof result?.revision !== 'number' ||
        !Number.isSafeInteger(result.revision) ||
        result.revision <= 0
      ) {
        throw new Error('Invalid server revision');
      }

      pending.current = null;
      setServerRevision(result.revision);
      const savedMap: Record<string, 'not_started' | 'progressing' | 'achieved' | 'exceeded'> = {};
      for (const item of targetCriteria) {
        savedMap[item.criterionId] = item.value;
      }
      setSavedValues(savedMap);
    } catch (_cause) {
      if (!mountedRef.current) return;
      setErrorKey('saveError');
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  if (!room.successCriteria || room.successCriteria.length === 0) return null;
  if (closed && readState === 'ready' && serverRevision === null) return null;

  return (
    <section className="v832-self-assessment-card" aria-label={copy.title}>
      <h2>{copy.title}</h2>
      <div className="v832-self-assessment-criteria">
        {room.successCriteria.map(criterion => (
          <fieldset key={criterion.id} className="v832-self-assessment-criterion">
            <legend className="v832-self-assessment-statement">
              <strong>{criterion.id}:</strong> <LiveLessonRichText text={criterion.statement[locale]} mathScale="student" />
            </legend>
            <div className="v832-self-assessment-options" role="radiogroup" aria-label={criterion.statement[locale]}>
              {SELF_ASSESSMENT_ENUMS.map((opt, index) => (
                <label key={opt.value} className="v832-self-assessment-option">
                  <input
                    type="radio"
                    name={`sa-${criterion.id}`}
                    value={opt.value}
                    checked={values[criterion.id] === opt.value}
                    disabled={submitting || !editable || readState !== 'ready'}
                    onChange={() => {
                      setValues(prev => ({ ...prev, [criterion.id]: opt.value }));
                      setErrorKey(null);
                    }}
                  />
                  <span>{copy.levels[index]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="v832-question-actions">
        {!closed ? (
          <button
            type="button"
            className="v832-primary-button"
            disabled={submitting || !editable || readState !== 'ready' || !allSelected || !deviceToken}
            onClick={() => void handleSubmit()}
          >
            {submitting ? copy.saving : serverRevision ? copy.update : copy.submit}
          </button>
        ) : (
          <span className="v832-status-pill" role="status">{copy.closed}</span>
        )}
        {serverRevision !== null && !isDirty && (
          <span role="status" className="v832-revision-badge">
            {copy.saved} {serverRevision}
          </span>
        )}
        {isDirty && (
          <span role="status" className="v832-status-pill v832-dirty-pill">
            {copy.unsavedChanges}
          </span>
        )}
        {errorMessage && readState !== 'failed' && <span role="alert" className="v832-error-text">{errorMessage}</span>}
        {readState === 'loading' && <span role="status">{copy.loading}</span>}
        {readState === 'failed' && (
          <>
            <span role="alert" className="v832-error-text">{errorMessage || copy.failed}</span>
            <button
              type="button"
              className="v832-retry-button"
              onClick={() => {
                setErrorKey(null);
                setReadState('loading');
                setReloadTick(t => t + 1);
              }}
            >
              {copy.retry}
            </button>
          </>
        )}
        {!allSelected && !closed && readState === 'ready' && (
          <span className="v832-hint-text">{copy.hint}</span>
        )}
      </div>
    </section>
  );
};

export const isSelfAssessmentEligible = ({
  role,
  classRoom,
  joined,
  claimedStudentId,
  leavePending,
  started,
  closed,
  activityPhase,
  hasPublicCriteria,
  attentionSurface: _attentionSurface,
  handoffState: _handoffState,
  paused: _paused,
  activeQuestion,
}: {
  role: string | null;
  classRoom: boolean;
  joined: boolean;
  claimedStudentId: string;
  leavePending: boolean;
  started: boolean;
  closed: boolean;
  activityPhase?: string;
  hasPublicCriteria: boolean;
  attentionSurface?: string;
  handoffState?: string;
  paused?: boolean;
  activeQuestion?: RoomView['activeQuestion'] | null;
}): boolean => {
  const isClaimedV84Student = role === 'student' && classRoom && joined && Boolean(claimedStudentId) && !leavePending;
  const isEligiblePhase = closed || isSelfAssessmentPhase(activityPhase);
  if (!isClaimedV84Student || !hasPublicCriteria || !isEligiblePhase) return false;
  if (closed) return true;
  return started && !activeQuestion;
};

export const V832RoomPage = () => {
  const { roomId = '' } = useParams<{ roomId: string }>();
  const [params] = useSearchParams();
  const roleParam = params.get('role');
  const role: RoomRole | null = roleParam === 'presenter' || roleParam === 'tv' || roleParam === 'student' || roleParam === 'coach' ? roleParam : null;
  const [publicRoom, setPublicRoom] = useState<RoomView | null>(null);
  const classRoom = Boolean(publicRoom?.lobby);
  const [privateBuild, setPrivateBuild] = useState<RuntimeBuildV832 | null>(null);
  const [privateRoom, setPrivateRoom] = useState<V832PrivateRoomSummary | null>(null);
  const [simulationDrafts, setSimulationDrafts] = useState<Record<string, V84SimulationDraft>>({});
  const [teacherOwnsRoom, setTeacherOwnsRoom] = useState(false);
  const [responses, setResponses] = useState<Array<{ participantUid: string; studentId?: string; activityId: string; questionInstanceId: string; revision: number; value: string }>>([]);
  const [participants, setParticipants] = useState<Array<{ participantUid: string; studentId?: string; displayName: string }>>([]);
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [joined, setJoined] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [classRoster, setClassRoster] = useState<{ className: string; students: Array<{ studentId: string; name: string }> } | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [claimedStudentId, setClaimedStudentId] = useState('');
  const [leavePending, setLeavePending] = useState(false);
  const [locale, setLocale] = useState<'vi' | 'en' | 'ja'>('vi');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [publicClosing, setPublicClosing] = useState<V84PublicClosing | null>(null);
  const [studentClosing, setStudentClosing] = useState<V84StudentClosing | null>(null);
  const [teacherAnalytics, setTeacherAnalytics] = useState<Record<string, V84TeacherAnalytics> | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (role === 'student' && !user) void ensureV832StudentIdentity().catch(cause => setError(cause instanceof Error ? cause.message : 'Không thể đăng nhập học sinh.'));
  }, [role, user]);
  useEffect(() => {
    if (!roomId) return;
    return subscribeV832PublicRoom(roomId, setPublicRoom, cause => setError(cause.message));
  }, [roomId]);
  useEffect(() => {
    setPublicClosing(null);
    if (!roomId || !publicRoom?.closingRevision) return;
    return subscribeV84PublicClosing(roomId, publicRoom.closingRevision, setPublicClosing, cause => setError(cause.message));
  }, [roomId, publicRoom?.closingRevision]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!roomId || !user || role !== 'student') return;
    return subscribeV832Participant(roomId, user.uid, participant => {
      setJoined(Boolean(participant));
      setClaimedStudentId(participant?.studentId ?? '');
      if (participant) setLeavePending(false);
    }, cause => setError(cause.message));
  }, [roomId, user, role]);
  useEffect(() => {
    if (!classRoom || !joined || !claimedStudentId || !user || role !== 'student') return;
    const deviceToken = window.localStorage.getItem(`v84-device:${roomId}:${user.uid}`);
    if (!deviceToken) { setError('Thiết bị này cần được giáo viên xác nhận lại.'); return; }
    const sendHeartbeat = () => void heartbeatV84Student(roomId, claimedStudentId, deviceToken)
      .catch(cause => setError(cause instanceof Error ? cause.message : 'Mất kết nối điểm danh.'));
    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 10_000);
    return () => window.clearInterval(interval);
  }, [classRoom, joined, claimedStudentId, user, role, roomId]);
  useEffect(() => {
    if (!roomId || !user || role !== 'student' || !classRoom) return;
    let active = true;
    void readV84RoomRoster(roomId).then(roster => { if (active) setClassRoster(roster); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được danh sách lớp.'); });
    return () => { active = false; };
  }, [roomId, user, role, classRoom]);
  useEffect(() => {
    setStudentClosing(null);
    if (!roomId || !user || role !== 'student' || !claimedStudentId || !publicRoom?.closingRevision) return;
    return subscribeV84StudentClosing(roomId, claimedStudentId, publicRoom.closingRevision, setStudentClosing, cause => setError(cause.message));
  }, [roomId, user, role, claimedStudentId, publicRoom?.closingRevision]);
  useEffect(() => {
    setPrivateBuild(null);
    setPrivateRoom(null);
    setTeacherOwnsRoom(false);
    if (!roomId || !user || (role !== 'coach' && role !== 'presenter')) {
      return;
    }
    let active = true;
    const unsubscribe = subscribeV832PrivateRoom(roomId, value => {
      if (!active) return;
      setTeacherOwnsRoom(value?.ownerUid === user.uid);
      if (!value || value.ownerUid !== user.uid) { setPrivateBuild(null); setPrivateRoom(null); return; }
      setPrivateRoom(value);
      void readV832PrivateBuild(value.packageId).then(build => { if (active) setPrivateBuild(build); })
        .catch(cause => { if (active) setError(cause.message); });
    }, cause => { if (active) { setTeacherOwnsRoom(false); setPrivateBuild(null); setPrivateRoom(null); setError(cause.message); } });
    return () => { active = false; unsubscribe(); };
  }, [roomId, user, role]);
  useEffect(() => {
    setResponses([]);
    setParticipants([]);
    setSimulationDrafts({});
    if (!roomId || !user || role !== 'coach' || !teacherOwnsRoom) return;
    const stopResponses = subscribeV832Responses(roomId, setResponses, cause => setError(cause.message));
    const stopParticipants = subscribeV832Participants(roomId, setParticipants, cause => setError(cause.message));
    const stopDrafts = subscribeV84SimulationDrafts(roomId, setSimulationDrafts, cause => setError(cause.message));
    return () => { stopResponses(); stopParticipants(); stopDrafts(); };
  }, [roomId, user, role, teacherOwnsRoom]);
  useEffect(() => {
    setTeacherAnalytics(null);
    if (!roomId || !user || role !== 'coach' || !teacherOwnsRoom || !publicRoom?.closingRevision) return;
    return subscribeV84TeacherAnalytics(roomId, publicRoom.closingRevision, setTeacherAnalytics, cause => setError(cause.message));
  }, [roomId, user, role, teacherOwnsRoom, publicRoom?.closingRevision]);

  const sendCommand = useCallback(async (type: RoomCommandType) => {
    if (!publicRoom || busy || !teacherOwnsRoom) return;
    setBusy(true); setError(null);
    try {
      const command = { id: crypto.randomUUID(), expectedRevision: publicRoom.sessionRevision, type };
      if (publicRoom.lobby) await sendV84PresenterCommand(roomId, command);
      else await sendV832PresenterCommand(roomId, command as Parameters<typeof sendV832PresenterCommand>[1]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không gửi được lệnh Presenter.');
    } finally { setBusy(false); }
  }, [busy, publicRoom, roomId, teacherOwnsRoom]);

  const sendQuestionOverride = async (studentId: string, type: 'INCLUDE_LATE_NOW' | 'EXCLUDE_CURRENT' | 'RESOLVE_DISCONNECT') => {
    if (!publicRoom?.lobby || !teacherOwnsRoom || busy) return;
    setBusy(true); setError(null);
    try { await sendV84PresenterCommand(roomId, { id: crypto.randomUUID(), expectedRevision: publicRoom.sessionRevision,
      type, studentId }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không điều chỉnh được người cần nộp.'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (role !== 'presenter' || !teacherOwnsRoom || !classRoom || publicRoom?.closed) return;
    let pending = false;
    const timer = window.setInterval(() => {
      if (pending) return;
      pending = true;
      void tickV84Room(roomId).catch(cause => setError(cause instanceof Error ? cause.message : 'Không cập nhật được đồng hồ câu hỏi.'))
        .finally(() => { pending = false; });
    }, ['QUESTION_OPEN', 'STATS'].includes(publicRoom?.activeQuestion?.phase ?? '') ? 1000 : 5000);
    return () => window.clearInterval(timer);
  }, [role, teacherOwnsRoom, classRoom, publicRoom?.closed, publicRoom?.activeQuestion?.phase, roomId]);

  const updateAttendance = async (studentId: string, operation: AttendanceAction) => {
    if (!teacherOwnsRoom || busy) return;
    setBusy(true); setError(null);
    try { await updateV84Attendance(roomId, studentId, operation); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không cập nhật được điểm danh.'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (role !== 'presenter' || !publicRoom?.started || publicRoom.closed || publicRoom.timer.pausedAt !== null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"]')) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        if (publicRoom.lobby && (publicRoom.activeQuestion?.phase === 'QUESTION_OPEN'
          || (publicRoom.activeQuestion?.phase === 'STATS' && publicRoom.activeQuestion.revealPolicy !== 'no_reveal'))) return;
        event.preventDefault();
        const state = publicRoom.handoffState;
        const type: RoomCommandType = publicRoom.lobby && publicRoom.questionPhase === 'INTRO' ? 'BRIEF_QUESTION'
          : publicRoom.lobby && publicRoom.activeQuestion?.phase === 'QUESTION_LOCKED' ? 'SHOW_STATS'
            : publicRoom.lobby && publicRoom.activeQuestion?.phase === 'STATS' && publicRoom.activeQuestion.revealPolicy === 'no_reveal'
              && publicRoom.activeQuestion.questionNumber < publicRoom.activeQuestion.questionTotal ? 'NEXT_QUESTION'
          : publicRoom.lobby && publicRoom.activeQuestion?.phase === 'QUESTION_BRIEF' && state === 'DEVICE_WORK' ? 'OPEN_QUESTION'
            : publicRoom.lobby && publicRoom.activeQuestion?.phase === 'QUESTION_BRIEF' && state === 'FOCUS_PRESENTER' ? 'HANDOFF_TO_DEVICE'
            : publicRoom.lobby && publicRoom.activeQuestion?.phase === 'REVEAL' && publicRoom.activeQuestion.questionNumber < publicRoom.activeQuestion.questionTotal ? 'NEXT_QUESTION'
              : publicRoom.lobby && publicRoom.canContinueDeviceBlock && (publicRoom.activeQuestion?.phase === 'REVEAL'
                || (publicRoom.activeQuestion?.phase === 'STATS' && publicRoom.activeQuestion.revealPolicy === 'no_reveal')
                || !publicRoom.activeQuestion) ? 'NEXT_ACTIVITY'
              : state === 'HANDOFF_TO_DEVICE' ? 'DEVICE_WORK'
          : state === 'DEVICE_WORK' ? 'READY_TO_RECALL'
            : state === 'READY_TO_RECALL' ? 'RECALL_TO_PRESENTER'
              : state === 'RECALL_TO_PRESENTER' ? 'DEBRIEF_CHOT'
                : publicRoom.presenter.nextControl as PresenterRoomCommandType;
        void sendCommand(type);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault(); void sendCommand('PREV_ACTIVITY');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [role, publicRoom, sendCommand]);

  const effectiveStudentLocale = publicRoom?.availableStudentLocales.includes(locale) ? locale : 'vi';
  const studentView = publicRoom?.studentByLocale[effectiveStudentLocale];
  const studentMathVisuals = (publicRoom?.mathVisuals ?? []).filter(visual =>
    studentView?.visuals.some(item => item.id === visual.visualId));
  const mathVisualForQuestion = (question: StudentQuestion): PublicMathVisual | undefined => question.visualRef
    ? studentMathVisuals.find(visual => visual.visualId === question.visualRef)
    : studentMathVisuals.length === 1 ? studentMathVisuals[0] : undefined;
  const unlinkedStudentMathVisuals = studentMathVisuals.filter(visual =>
    !studentView?.questions.some(question => mathVisualForQuestion(question)?.visualId === visual.visualId));
  const coachView = useMemo(() => {
    if (!privateBuild || !publicRoom) return null;
    return projectCoachSurface(privateBuild.privateLessonIR, {
      activityId: publicRoom.activityId,
      questionBuildStepIndex: publicRoom.revealStep,
      visualStateId: publicRoom.visualStateId ?? undefined,
      ...(publicRoom.lobby && publicRoom.activeQuestion ? { questionInstanceId: publicRoom.activeQuestion.instanceId } : {}),
      locale: 'vi',
    });
  }, [privateBuild, publicRoom]);
  const coachPresence = privateRoom?.questionRun && privateRoom.presenceLedger && publicRoom?.activeQuestion
    && privateRoom.questionRun.instanceId === publicRoom.activeQuestion.instanceId
    ? summarizeCoachPresence(privateRoom.questionRun, privateRoom.presenceLedger) : null;

  const join = async () => {
    setBusy(true); setError(null);
    try {
      const identity = await ensureV832StudentIdentity();
      if (publicRoom?.lobby) {
        const storageKey = `v84-device:${roomId}:${identity.uid}`;
        let token = window.localStorage.getItem(storageKey);
        if (!token) { token = crypto.randomUUID(); window.localStorage.setItem(storageKey, token); }
        await claimV84Student(roomId, selectedStudentId, token);
      } else await joinV832PreviewRoom(roomId, displayName);
      setJoined(true);
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không vào được phòng.'); }
    finally { setBusy(false); }
  };
  const leave = async () => {
    if (!user || !claimedStudentId || busy) return;
    const deviceToken = window.localStorage.getItem(`v84-device:${roomId}:${user.uid}`);
    if (!deviceToken) { setError('Thiết bị cần được xác nhận lại trước khi rời lớp.'); return; }
    setBusy(true); setError(null);
    try { await leaveV84Room(roomId, claimedStudentId, deviceToken); setLeavePending(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không ghi được yêu cầu rời lớp.'); }
    finally { setBusy(false); }
  };
  const submit = async (question: StudentQuestion, rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return null;
    setBusy(true); setError(null);
    try {
      const result = await (publicRoom?.lobby ? submitV84Response : submitV832PreviewResponse)({
        roomId, questionInstanceId: question.instanceId, clientNonce: crypto.randomUUID(), value,
        mode: question.responseType === 'math_input' ? 'math' : 'typed',
      });
      return result.revision;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được bài làm.'); return null; }
    finally { setBusy(false); }
  };

  if (!role) return <main className="v832-error">Vai trò không hợp lệ. Mở đúng liên kết Presenter, TV, Student hoặc Coach.</main>;
  if (error && !publicRoom) return <main className="v832-error" role="alert">{error}</main>;
  if (!publicRoom) return <main className="v832-loading" role="status">Đang kết nối phòng V8.3.2…</main>;

  const secondsRemaining = publicRoom.timer.startedAt === null ? publicRoom.timer.durationSec
    : Math.max(0, Math.ceil(publicRoom.timer.durationSec - ((publicRoom.timer.pausedAt ?? now) - publicRoom.timer.startedAt) / 1000));
  const lessonElapsedSec = publicRoom.clock ? Math.max(0, Math.floor(now / 1000 - publicRoom.clock.lessonStartedAtSec)) : null;
  const activityElapsedSec = publicRoom.clock ? Math.max(0, Math.floor(now / 1000 - publicRoom.clock.activityStartedAtSec)) : null;
  const driftSec = publicRoom.clock ? Math.floor(computeLessonDrift(publicRoom.clock,
    now / 1000, publicRoom.clock.plannedActivityStartSec, publicRoom.clock.activityBudgetSec)) : null;
  const recovery = (() => {
    if (!privateBuild || driftSec === null || driftSec >= 0) return null;
    const index = privateBuild.privateLessonIR.timeline.findIndex(activity => activity.id === publicRoom.activityId);
    if (index < 0) return null;
    return recommendRecovery(-driftSec, privateBuild.privateLessonIR.timeline.slice(index + 1).map(activity => ({
      id: activity.id,
      protected: activity.timingPolicy.protected === true || ['exit', 'reflection', 'closing', 'postcheck'].includes(activity.phase),
      compressibleSec: Math.max(0, activity.durationSec - (activity.timingPolicy.compressibleMinSec ?? activity.durationSec)),
    })));
  })();

  if (role === 'tv' || role === 'presenter') return <div className="v832-room-root">
    {role === 'presenter' && teacherOwnsRoom && <ScreenReviewEntry roomId={roomId}
      revision={publicRoom.sessionRevision} locale={publicRoom.presenterLocale} runtimeV84={Boolean(publicRoom.lobby)}
      questionRunKey={publicRoom.questionRunKey ?? publicRoom.activeQuestion?.runKey ?? null}
      questionRunRevision={publicRoom.questionRunRevision ?? null} questionPhase={publicRoom.questionPhase ?? null} />}
    {role === 'presenter' && teacherOwnsRoom && publicRoom.availablePresenterLocales.length > 1 && <div className="v832-presenter-locale">
      <label>Ngôn ngữ trình chiếu <select value={publicRoom.presenterLocale}
        onChange={event => { if (user) {
          const command = {
          id: crypto.randomUUID(), expectedRevision: publicRoom.sessionRevision,
          type: 'SET_PRESENTER_LOCALE' as const, presenterLocale: event.target.value as 'vi' | 'en' | 'ja',
          };
          const request = publicRoom.lobby ? sendV84PresenterCommand(roomId, command) : sendV832PresenterCommand(roomId, command);
          void request.catch(cause => setError(cause instanceof Error ? cause.message : 'Không đổi được ngôn ngữ.'));
        } }}>
        {publicRoom.availablePresenterLocales.map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}
      </select></label>
    </div>}
    <PresenterStage room={publicRoom} role={role} busy={busy} canControl={role === 'presenter' && teacherOwnsRoom}
      nowSec={now / 1000} onCommand={type => void sendCommand(type)} />
    {publicRoom.closed && publicClosing && <PublicClosingCard value={publicClosing} locale={publicRoom.presenterLocale} />}
    {role === 'presenter' && teacherOwnsRoom && privateRoom?.presenceLedger && <PresencePanel room={privateRoom} busy={busy}
      onAction={(studentId, operation) => void updateAttendance(studentId, operation)}
      onQuestionOverride={(studentId, operation) => void sendQuestionOverride(studentId, operation)} />}
    {role === 'presenter' && <p className="v832-presenter-meta">{publicRoom.clock && lessonElapsedSec !== null && activityElapsedSec !== null
      ? `Tiết ${formatRemaining(lessonElapsedSec)} · Hoạt động ${formatRemaining(activityElapsedSec)} · Quỹ thời gian +${formatRemaining(Math.floor(publicRoom.clock.timeBankSec))}${driftSec === null ? '' : ` · Lệch giờ ${driftSec < 0 ? '-' : '+'}${formatRemaining(Math.abs(driftSec))}`}`
      : `Còn ${formatRemaining(secondsRemaining)} · Lượt chuyển ${publicRoom.sessionRevision}`}</p>}
    {error && <p className="v832-error-banner" role="alert">{error}</p>}
  </div>;

  if (role === 'coach') return <main className="v832-coach">
    <header><p className="v832-eyebrow">Trợ lý giáo viên · riêng tư</p><h1>HS ĐANG THẤY</h1>
      <p>{publicRoom.studentByLocale.vi.title} · {handoffLabel[publicRoom.handoffState]} · Còn {formatRemaining(secondsRemaining)}</p></header>
    {publicRoom.closed && teacherAnalytics && <CoachClosingCard value={teacherAnalytics} />}
    {publicRoom.clock && lessonElapsedSec !== null && activityElapsedSec !== null && <p className="v832-coach-clock">
      Tiết {formatRemaining(lessonElapsedSec)} · Hoạt động {formatRemaining(activityElapsedSec)} · Quỹ thời gian +{formatRemaining(Math.floor(publicRoom.clock.timeBankSec))}
      {driftSec !== null && <span> · Lệch giờ {driftSec < 0 ? '-' : '+'}{formatRemaining(Math.abs(driftSec))}</span>}
    </p>}
    {recovery && driftSec !== null && driftSec < 0 && <p className="v832-coach-clock">
      Gợi ý giữ phần kiểm tra lại, Phiếu ra lớp và tổng kết.
      {recovery.cuts.length > 0 && ` Có thể rút: ${recovery.cuts.map(cut => `${cut.id} ${cut.seconds} giây`).join(', ')}.`}
      {recovery.remainingDelaySec > 0 && ` Còn thiếu ${recovery.remainingDelaySec} giây; giáo viên quyết định điều chỉnh.`}
    </p>}
    {error && <p className="v832-error-banner" role="alert">{error}</p>}
    {!user && <p>Đăng nhập tài khoản giáo viên để xem Coach.</p>}
    {user && !coachView && <p>Đang tải hướng dẫn riêng của giáo viên…</p>}
    {coachView && <>
      <section className="v832-coach-card"><h2>Nhiệm vụ chính xác</h2>
        {publicRoom.lobby && publicRoom.activeQuestion && !hasPublicStudentQuestions(publicRoom.studentByLocale.vi) ? <>
          <LiveLessonRichText text={publicRoom.studentByLocale.vi.copy} />
          <div className="v832-coach-rich-field">Sắp mở: <LiveLessonRichText text={coachView.studentMirror.studentPrompt.vi} /></div>
        </> : <LiveLessonRichText text={coachView.studentMirror.studentPrompt.vi} />}
        {publicRoom.activeQuestion && <p>Câu {publicRoom.activeQuestion.questionNumber}/{publicRoom.activeQuestion.questionTotal} · {questionPhaseLabel[publicRoom.activeQuestion.phase]} · {publicRoom.activeQuestion.requiredCompleted}/{publicRoom.activeQuestion.requiredTotal} cần nộp · {publicRoom.activeQuestion.validResponses} bài hợp lệ</p>}
        {coachPresence && <p>Phản hồi ngoài nhóm cần nộp: {coachPresence.outsideRequiredResponses}.</p>}
        {coachPresence && coachPresence.disconnectedBlockingNames.length > 0 &&
          <p role="status">Đang chờ vì mất kết nối: {coachPresence.disconnectedBlockingNames.join(', ')}.</p>}
        {coachPresence && coachPresence.resolvedDisconnectedNames.length > 0 &&
          <p role="status">Mất kết nối đã bỏ chặn: {coachPresence.resolvedDisconnectedNames.join(', ')}.</p>}
        {coachPresence && coachPresence.resolvedAbsenceNames.length > 0 &&
          <p role="status">Vắng hoặc rời lớp đã xác nhận, không còn chặn: {coachPresence.resolvedAbsenceNames.join(', ')}.</p>}
        {!publicRoom.closed && publicRoom.activeQuestion?.phase === 'QUESTION_OPEN' &&
          <p className="v84-question-clock">{questionTimeLabel(publicRoom.activeQuestion, now / 1000)}</p>}
        {publicRoom.activeQuestion && <p>Hình đang thấy: {publicRoom.mathVisuals?.map(visual => visual.description).join('; ') || 'không có hình'}.</p>}
        {publicRoom.activeQuestion && publicRoom.mathVisuals && publicRoom.mathVisuals.length > 0 &&
          <div className="v832-coach-visual" aria-label="Hình Toán đang hiển thị cho học sinh">
            {publicRoom.mathVisuals.map(visual => <MathVisualView key={visual.visualId} visual={visual} />)}
          </div>}
        <p>Sản phẩm cần nộp: {coachView.studentMirror.expectedProduct}</p>
        <p>Kiểu nhập: {inputTypeLabel[coachView.studentMirror.inputType] ?? 'Sản phẩm cá nhân'}</p>
        <p>{publicRoom.activeQuestion ? publicRoom.activeQuestion.validResponses : responses.filter(item => item.activityId === publicRoom.activityId).length}/{publicRoom.activeQuestion ? publicRoom.activeQuestion.requiredTotal : participants.length} lượt nộp đã ghi nhận</p>
      </section>
      {publicRoom.activeQuestion && Object.values(simulationDrafts)
        .some(draft => draft.runKey === publicRoom.activeQuestion?.runKey) && <details className="v832-coach-card">
        <summary>Vị trí mô phỏng HS đang thử · riêng tư</summary>
        {Object.entries(simulationDrafts).filter(([, draft]) => draft.runKey === publicRoom.activeQuestion?.runKey)
          .map(([studentId, draft]) => <p key={studentId}>
            {privateRoom?.presenceLedger?.[studentId]?.name ?? 'Học sinh'}: {Math.round(draft.angleRad * 180 / Math.PI)}°
          </p>)}
      </details>}
      {privateRoom?.presenceLedger && <PresencePanel room={privateRoom} busy={busy} readOnly />}
      <section className="v832-coach-card"><h2>Quyết định sư phạm</h2>
        <p>{coachView.studentMirror.recommendedTeacherAction}</p>
        {coachView.decisionCard && <p>{coachView.decisionCard.howToRecheck}</p>}
        <p>Chuyển khi: {coachView.transitionWhen}</p>
        <p>Điều khiển tiếp theo: {coachView.studentMirror.nextControl === 'next' ? 'Tiếp tục' : coachView.studentMirror.nextControl === 'reveal' ? 'Chốt' : coachView.studentMirror.nextControl}</p>
      </section>
      <section className="v832-coach-card" data-coach-expectations><h2>Kỳ vọng và lỗi thường gặp</h2>
        {coachView.questions.map((question, index) => <article key={question.instanceId}>
          <div className="v832-coach-rich-field"><strong>Câu {index + 1}:</strong> <LiveLessonRichText text={question.prompt} /></div>
          {question.correctAnswer !== undefined && <div className="v832-coach-rich-field">Đáp án: <CoachExpectedContent value={question.correctAnswer} /></div>}
          {question.rubric !== undefined && <div className="v832-coach-rich-field">Tiêu chí: <CoachExpectedContent value={question.rubric} /></div>}
          {question.misconceptions.length > 0 && <div className="v832-coach-rich-field">Lỗi có thể gặp:
            {question.misconceptions.map((misconception, misconceptionIndex) =>
              <LiveLessonRichText key={misconceptionIndex} text={misconception} />)}
          </div>}
        </article>)}
      </section>
      <section className="v832-coach-card"><h2>Bài làm riêng</h2>
        {responses.filter(item => item.activityId === publicRoom.activityId && (!publicRoom.activeQuestion || item.questionInstanceId === publicRoom.activeQuestion.instanceId)).map(item => <article key={`${item.participantUid}-${item.questionInstanceId}`}>
          <strong>{participants.find(student => item.studentId ? student.studentId === item.studentId
            : student.participantUid === item.participantUid)?.displayName ?? 'Học sinh'}:</strong> {item.value}
        </article>)}
      </section>
    </>}
  </main>;

  const showSelfAssessment = isSelfAssessmentEligible({
    role,
    classRoom,
    joined,
    claimedStudentId,
    leavePending,
    started: publicRoom?.started ?? false,
    closed: publicRoom?.closed ?? false,
    activityPhase: publicRoom?.activityPhase,
    hasPublicCriteria: (publicRoom?.successCriteria?.length ?? 0) > 0,
    attentionSurface: publicRoom?.attentionSurface ?? '', handoffState: publicRoom?.handoffState ?? '',
    paused: publicRoom?.timer.pausedAt !== null, activeQuestion: publicRoom?.activeQuestion ?? null,
  });

  return <main className="v832-student">
    <header className="v832-student-header"><div><span className="v832-eyebrow">{publicRoom.lobby ? 'V8.4' : 'V8.3.2'} · {effectiveStudentLocale === 'vi' ? 'Học sinh' : 'Student'}</span><h1>{studentView?.title}</h1></div>
      <label><span>Ngôn ngữ</span><select value={effectiveStudentLocale} onChange={event => setLocale(event.target.value as 'vi' | 'en' | 'ja')}>
        {publicRoom.availableStudentLocales.map(item => <option key={item} value={item}>{item === 'vi' ? 'Tiếng Việt' : item === 'en' ? 'English' : '日本語'}</option>)}
      </select></label>
    </header>
    {error && <p className="v832-error-banner" role="alert">{error}</p>}
    {leavePending && <section className="v832-wait-card" role="status">Đã gửi yêu cầu rời lớp. Giáo viên sẽ xác nhận; nếu vào lại, em chọn tên của mình.</section>}
    {!joined && !leavePending ? <section className="v832-join-card"><h2>Vào phòng học thử</h2>
      {publicRoom.lobby ? <>
        <p>{classRoster?.className ?? 'Đang tải danh sách lớp…'}</p>
        <label htmlFor="v84-student-name">Chọn tên của em</label>
        <select id="v84-student-name" value={selectedStudentId} onChange={event => setSelectedStudentId(event.target.value)}>
          <option value="">Chọn tên</option>
          {classRoster?.students.map(student => <option key={student.studentId} value={student.studentId}>{student.name}</option>)}
        </select>
      </> : <>
        <label htmlFor="v832-display-name">Tên hiển thị riêng với giáo viên</label>
        <input id="v832-display-name" value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={80} />
      </>}
      <button className="v832-primary-button" disabled={busy || !(publicRoom.lobby ? selectedStudentId : displayName.trim()) || !user} onClick={() => void join()}>Vào phòng</button>
    </section> : !leavePending && <>
      <div className="v832-student-beacon" aria-live="polite">{studentView?.attentionBeacon.copy}</div>
      {!publicRoom.started && <section className="v832-wait-card">Đã vào phòng. Nhìn lên màn hình và chờ giáo viên bắt đầu.</section>}
      {publicRoom.started && publicRoom.handoffState !== 'DEVICE_WORK' && <section className="v832-wait-card">
        {publicRoom.handoffState === 'HANDOFF_TO_DEVICE' ? 'Chuẩn bị làm nhiệm vụ trên thiết bị.'
          : publicRoom.handoffState === 'READY_TO_RECALL' || publicRoom.handoffState === 'RECALL_TO_PRESENTER'
            ? 'Đã lưu. Nhìn lên màn hình nhé.' : 'Nhìn lên màn hình lớp.'}
      </section>}
      {publicRoom.started && publicRoom.handoffState === 'DEVICE_WORK' && studentView && <div className="v832-student-content">
        <section className={`v832-student-task${publicRoom.lobby && publicRoom.activeQuestion ? ' v832-student-task--active' : ''}`}>
          <h2 className={publicRoom.lobby && publicRoom.activeQuestion ? 'sr-only' : undefined}><LiveLessonRichText text={studentView.copy} mathScale="student" /></h2>
          {publicRoom.activeQuestion && <p>Câu {publicRoom.activeQuestion.questionNumber}/{publicRoom.activeQuestion.questionTotal} · {publicRoom.closed ? 'Tiết học đã kết thúc' : publicRoom.activeQuestion.phase === 'QUESTION_OPEN'
            ? questionTimeLabel(publicRoom.activeQuestion, now / 1000)
            : publicRoom.activeQuestion.phase === 'STATS' || publicRoom.activeQuestion.phase === 'REVEAL' ? '🔒 Đã khóa · Nhìn lên màn hình lớp' : 'Chờ giáo viên mở câu hỏi'}</p>}
          <VisualSummary visuals={studentView.visuals} excludeIds={publicRoom.mathVisuals?.map(visual => visual.visualId)} />
          {unlinkedStudentMathVisuals.map(visual => <MathVisualView key={visual.visualId} visual={visual} locale={effectiveStudentLocale} />)}
        </section>
        {studentView.questions.map(question => <StudentQuestionCard key={publicRoom.activeQuestion?.runKey ?? question.instanceId} question={question}
          roomId={roomId} uid={user?.uid ?? ''} runKey={publicRoom.lobby ? publicRoom.activeQuestion?.runKey : undefined} busy={busy}
          locked={publicRoom.closed || Boolean(publicRoom.lobby && publicRoom.activeQuestion?.phase !== 'QUESTION_OPEN')}
          paused={publicRoom.timer.pausedAt !== null}
          mathVisual={mathVisualForQuestion(question)} locale={effectiveStudentLocale}
          onSubmit={value => submit(question, value)} />)}
      </div>}
      {showSelfAssessment && (
        <StudentSelfAssessmentPanel
          room={publicRoom}
          roomId={roomId}
           uid={user?.uid ?? ''}
           claimedStudentId={claimedStudentId}
           deviceToken={user ? window.localStorage.getItem(`v84-device:${roomId}:${user.uid}`) : null}
           closed={publicRoom.closed} locale={effectiveStudentLocale}
        />
      )}
      {showSelfAssessment && <StudentNextStepPanel room={publicRoom} roomId={roomId}
        deviceToken={user ? window.localStorage.getItem(`v84-device:${roomId}:${user.uid}`) : null}
        claimedStudentId={claimedStudentId} locale={effectiveStudentLocale} />}
      {publicRoom.closed && studentClosing && <StudentClosingCard value={studentClosing} locale={effectiveStudentLocale} />}
      {publicRoom.lobby && joined && !leavePending && <button className="v832-leave-button" disabled={busy} onClick={() => void leave()}>Xin rời lớp</button>}
    </>}
  </main>;
};
