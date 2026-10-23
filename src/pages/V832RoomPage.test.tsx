import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { hasPublicStudentQuestions, isSelfAssessmentEligible, StudentNextStepPanel, StudentSelfAssessmentPanel, teacherEvidenceCount } from './V832RoomPage';
import type { PublicRoomSnapshotV832 } from '../lib/lessonCompiler/v832/runtimePackage';

vi.mock('../services/v832RoomService', () => ({
  ensureV832StudentIdentity: vi.fn(),
  joinV832PreviewRoom: vi.fn(),
  readV832PrivateBuild: vi.fn(),
  sendV832PresenterCommand: vi.fn(),
  submitV832PreviewResponse: vi.fn(),
  subscribeV832Participant: vi.fn(() => () => {}),
  subscribeV832Participants: vi.fn(() => () => {}),
  subscribeV832PrivateRoom: vi.fn(() => () => {}),
  subscribeV832PublicRoom: vi.fn(() => () => {}),
  subscribeV832Responses: vi.fn(() => () => {}),
  readV832OwnResponse: vi.fn(),
  subscribeV84SimulationDrafts: vi.fn(() => () => {}),
  claimV84Student: vi.fn(),
  heartbeatV84Student: vi.fn(),
  readV84RoomRoster: vi.fn(),
  leaveV84Room: vi.fn(),
  updateV84Attendance: vi.fn(),
  sendV84PresenterCommand: vi.fn(),
  submitV84Response: vi.fn(),
  tickV84Room: vi.fn(),
  readV84OwnSimulationDraft: vi.fn(),
  saveV84SimulationDraft: vi.fn(),
  readV84OwnSelfAssessment: vi.fn().mockResolvedValue({ assessment: null }),
  submitV84SelfAssessment: vi.fn().mockResolvedValue({ revision: 1, duplicate: false }),
  submitV84NextStep: vi.fn().mockResolvedValue({ closingRevision: 1, nextStepId: 'MORE_PRACTICE', duplicate: false }),
  subscribeV84PublicClosing: vi.fn(() => () => {}),
  subscribeV84StudentClosing: vi.fn(() => () => {}),
  subscribeV84TeacherAnalytics: vi.fn(() => () => {}),
}));

const mockPublicRoom = (overrides: Partial<PublicRoomSnapshotV832> = {}): PublicRoomSnapshotV832 => ({
  roomId: 'room-1',
  packageId: 'package-1',
  lessonId: 'lesson-1',
  lessonVersion: '1.0',
  contentHash: 'hash-1',
  presenterLocale: 'vi',
  activityId: 'A1',
  activityPhase: 'reflection',
  started: true,
  closed: false,
  sessionRevision: 1,
  substate: 'DEVICE_WORK',
  revealStep: 0,
  visualStateId: null,
  attentionSurface: 'student_device',
  handoffState: 'DEVICE_WORK',
  timer: { startedAt: null, durationSec: 300, pausedAt: null },
  availablePresenterLocales: ['vi'],
  availableStudentLocales: ['vi'],
  presenter: {
    lessonId: 'lesson-1',
    lessonVersion: '1.0',
    activityId: 'A1',
    title: 'Tiêu đề',
    copy: 'Nội dung',
    attentionBeacon: { mode: 'LOOK_UP', copy: 'Nhìn lên' },
    controls: [],
    hasDeviceHandoff: false,
    nextControl: 'NEXT_ACTIVITY',
    taskBridge: null,
    questionBuild: [],
    visuals: [],
  },
  studentByLocale: {
    vi: {
      lessonId: 'lesson-1',
      lessonVersion: '1.0',
      activityId: 'A1',
      title: 'Học sinh',
      state: 'view_only',
      copy: 'Làm bài',
      interaction: 'none',
      requiredProduct: '',
      onSubmitState: 'wait',
      attentionBeacon: { mode: 'LOOK_UP', copy: 'Nhìn lên' },
      visuals: [],
      questions: [],
    },
    en: {
      lessonId: 'lesson-1',
      lessonVersion: '1.0',
      activityId: 'A1',
      title: 'Student',
      state: 'view_only',
      copy: 'Work',
      interaction: 'none',
      requiredProduct: '',
      onSubmitState: 'wait',
      attentionBeacon: { mode: 'LOOK_UP', copy: 'Look up' },
      visuals: [],
      questions: [],
    },
    ja: {
      lessonId: 'lesson-1',
      lessonVersion: '1.0',
      activityId: 'A1',
      title: '生徒',
      state: 'view_only',
      copy: '作業',
      interaction: 'none',
      requiredProduct: '',
      onSubmitState: 'wait',
      attentionBeacon: { mode: 'LOOK_UP', copy: '見て' },
      visuals: [],
      questions: [],
    },
  },
  lobby: { rosterCount: 30, joinedCount: 25 },
  successCriteria: [
    { id: 'SC1', statement: { vi: 'Nêu được định nghĩa hàm số', en: 'State the function definition', ja: '関数の定義を述べる' } },
    { id: 'SC2', statement: { vi: 'Vẽ được đồ thị hàm số', en: 'Draw a function graph', ja: '関数のグラフを描く' } },
  ],
  ...overrides,
});

describe('isSelfAssessmentEligible boundary checks', () => {
  const baseStudentState = {
    role: 'student',
    classRoom: true,
    joined: true,
    claimedStudentId: 'student-1',
    leavePending: false,
    started: true,
    closed: false,
    activityPhase: 'practice',
    hasPublicCriteria: true,
    attentionSurface: 'student_device', handoffState: 'DEVICE_WORK', paused: false, activeQuestion: null,
  };

  it('requires reflection or closing phase, open device, and no active question', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase: 'reflection' })).toBe(true);
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase: 'practice' })).toBe(false);
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase: 'reflection', paused: true })).toBe(true);
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase: 'reflection', activeQuestion: {} as never })).toBe(false);
  });

  it.each([
    ['reflection', true],
    ['closing', true],
    ['self_assessment', true],
    ['b11_reflection', true],
    ['b12_closing', true],
    ['b11_self_assessment', true],
    ['practice', false],
    ['b10_practice', false],
    ['prereflection', false],
    [undefined, false],
  ])('checks canonical self-assessment phase %s', (activityPhase, eligible) => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase })).toBe(eligible);
  });

  it('allows claimed V84 class student when room is closed', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, started: false, closed: true })).toBe(true);
  });

  it('allows closed room read-only regardless of device phase', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, closed: true, attentionSurface: 'presenter', handoffState: 'READY_TO_RECALL', paused: true })).toBe(true);
    expect(isSelfAssessmentEligible({ ...baseStudentState, closed: true, activityPhase: 'warmup' })).toBe(true);
    expect(isSelfAssessmentEligible({ ...baseStudentState, closed: true, activityPhase: 'practice' })).toBe(true);
  });

  it('denies when role is tv, presenter, coach, or null', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, role: 'tv' })).toBe(false);
    expect(isSelfAssessmentEligible({ ...baseStudentState, role: 'presenter' })).toBe(false);
    expect(isSelfAssessmentEligible({ ...baseStudentState, role: 'coach' })).toBe(false);
    expect(isSelfAssessmentEligible({ ...baseStudentState, role: null })).toBe(false);
  });

  it('denies when not claimed or leave is pending or not in V84 class room', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, claimedStudentId: '' })).toBe(false);
    expect(isSelfAssessmentEligible({ ...baseStudentState, leavePending: true })).toBe(false);
    expect(isSelfAssessmentEligible({ ...baseStudentState, classRoom: false })).toBe(false);
    expect(isSelfAssessmentEligible({ ...baseStudentState, joined: false })).toBe(false);
  });

  it('denies when room is unstarted, unclosed, and in warmup/practice phase', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, started: false, closed: false, activityPhase: 'warmup' })).toBe(false);
    expect(isSelfAssessmentEligible({ ...baseStudentState, started: false, closed: false, activityPhase: 'practice' })).toBe(false);
  });

  it('denies when public criteria are empty/unsafe', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, hasPublicCriteria: false })).toBe(false);
  });

  it('keeps mounted during recall and presenter focus in reflection phase without active question', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase: 'reflection', attentionSurface: 'presenter', handoffState: 'RECALL_TO_PRESENTER' })).toBe(true);
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase: 'reflection', attentionSurface: 'presenter', handoffState: 'FOCUS_PRESENTER' })).toBe(true);
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase: 'reflection', attentionSurface: 'student_device', handoffState: 'READY_TO_RECALL' })).toBe(true);
  });

  it('denies when active question is open during reflection phase', () => {
    expect(isSelfAssessmentEligible({ ...baseStudentState, activityPhase: 'reflection', activeQuestion: { runKey: 'q1', phase: 'QUESTION_OPEN' } as never })).toBe(false);
  });
});

describe('Coach closed-room public projection guards', () => {
  it('treats omitted public student questions as empty', () => {
    expect(hasPublicStudentQuestions({})).toBe(false);
    expect(hasPublicStudentQuestions({ questions: [] })).toBe(false);
    expect(hasPublicStudentQuestions({ questions: [{ id: 'Q1' }] })).toBe(true);
  });

  it('treats a malformed teacher evidence list as zero instead of crashing Coach', () => {
    expect(teacherEvidenceCount({ evidenceItems: [] })).toBe(0);
    expect(teacherEvidenceCount({ evidenceItems: undefined as never })).toBe(0);
  });
});

describe('StudentSelfAssessmentPanel component rendering', () => {
  it('renders locale-specific criteria statements and enum labels', () => {
    const room = mockPublicRoom();
    const html = renderToStaticMarkup(
      <StudentSelfAssessmentPanel
        room={room}
        roomId="room-1"
        uid="user-1"
        deviceToken="device-token-1"
        closed={false} locale="en" claimedStudentId="student-1"
      />
    );

    expect(html).toContain('Lesson self-assessment');
    expect(html).toContain('SC1');
    expect(html).toContain('State the function definition');
    expect(html).toContain('SC2');
    expect(html).toContain('Draw a function graph');

    // English enum labels
    expect(html).toContain('Not started');
    expect(html).toContain('Progressing');
    expect(html).toContain('Achieved');
    expect(html).toContain('Exceeded');

    // Action button
    expect(html).toContain('Submit self-assessment');
  });

  it('renders Vietnamese copy and labels correctly', () => {
    const room = mockPublicRoom();
    const html = renderToStaticMarkup(
      <StudentSelfAssessmentPanel
        room={room}
        roomId="room-1"
        uid="user-1"
        deviceToken="device-token-1"
        closed={false} locale="vi" claimedStudentId="student-1"
      />
    );

    expect(html).toContain('Tự đánh giá mục tiêu bài học');
    expect(html).toContain('Chưa bắt đầu');
    expect(html).toContain('Đang tiến bộ');
    expect(html).toContain('Đã đạt');
    expect(html).toContain('Vượt mức');
    expect(html).toContain('Nộp tự đánh giá');
  });

  it('renders Japanese copy and labels correctly', () => {
    const room = mockPublicRoom();
    const html = renderToStaticMarkup(
      <StudentSelfAssessmentPanel
        room={room}
        roomId="room-1"
        uid="user-1"
        deviceToken="device-token-1"
        closed={false} locale="ja" claimedStudentId="student-1"
      />
    );

    expect(html).toContain('学習目標の自己評価');
    expect(html).toContain('未着手');
    expect(html).toContain('取り組み中');
    expect(html).toContain('達成');
    expect(html).toContain('目標以上');
    expect(html).toContain('自己評価を送信');
  });

  it('renders inputs disabled when attention surface is presenter or handoff is recall', () => {
    const room = mockPublicRoom({
      attentionSurface: 'presenter',
      handoffState: 'RECALL_TO_PRESENTER',
    });
    const html = renderToStaticMarkup(
      <StudentSelfAssessmentPanel
        room={room}
        roomId="room-1"
        uid="user-1"
        deviceToken="device-token-1"
        closed={false} locale="en" claimedStudentId="student-1"
      />
    );

    expect(html).toContain('disabled');
  });

  it('renders inputs disabled when paused', () => {
    const room = mockPublicRoom({
      timer: { pausedAt: 12345 } as never,
    });
    const html = renderToStaticMarkup(
      <StudentSelfAssessmentPanel
        room={room}
        roomId="room-1"
        uid="user-1"
        deviceToken="device-token-1"
        closed={false} locale="en" claimedStudentId="student-1"
      />
    );

    expect(html).toContain('disabled');
  });

  it('renders read-only / closed status when room is closed', () => {
    const room = mockPublicRoom({ closed: true });
    const html = renderToStaticMarkup(
      <StudentSelfAssessmentPanel
        room={room}
        roomId="room-1"
        uid="user-1"
        deviceToken="device-token-1"
        closed={true} locale="vi" claimedStudentId="student-1"
      />
    );

    expect(html).toContain('Phòng đã kết thúc · Chỉ xem lại');
    expect(html).not.toContain('Nộp tự đánh giá');
  });

  it('returns null when successCriteria is empty', () => {
    const room = mockPublicRoom({ successCriteria: [] });
    const html = renderToStaticMarkup(
      <StudentSelfAssessmentPanel
        room={room}
        roomId="room-1"
        uid="user-1"
        deviceToken="device-token-1"
        closed={false} locale="vi" claimedStudentId="student-1"
      />
    );

    expect(html).toBe('');
  });
});

describe('StudentNextStepPanel component rendering', () => {
  it('renders authored choices and keeps internal IDs out of learner copy', () => {
    const room = mockPublicRoom({ closingRevision: 4, nextStepOptions: [
      { id: 'MORE_PRACTICE', label: { vi: 'Luyện thêm', en: 'More practice', ja: '追加練習' } },
      { id: 'EXPLORE', label: { vi: 'Khám phá', en: 'Explore', ja: '探究' } },
    ] });
    const html = renderToStaticMarkup(
      <StudentNextStepPanel room={room} roomId="room-1" deviceToken="device-token-1" claimedStudentId="student-1" locale="vi" />
    );
    expect(html).toContain('Bước tiếp theo');
    expect(html).toContain('Luyện thêm');
    expect(html).toContain('Khám phá');
    expect(html).not.toContain('MORE_PRACTICE');
    expect(html).not.toContain('EXPLORE');
  });
});
