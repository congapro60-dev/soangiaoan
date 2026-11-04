import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSourceBundle, type LessonSourceBundle } from '../lib/lessonGen/sourceIngestion';
import { buildSourceVerificationRecords, type SourceVerificationRecord, type TeacherCanonicalSourceApproval } from '../lib/lessonGen/sourceVerification';
import { structuralLessonIR } from '../lib/lessonCompiler/v832/lessonIR.testFixture';
import type { LessonIRV83 } from '../lib/lessonCompiler/v832/lessonIRSchema';
import { encodePrivateLessonIR } from '../lib/lessonCompiler/v832/privateJsonCodec';
import { computeLessonContentHash } from '../lib/lessonReview/v832/repairLifecycle';
import type { StoredLessonGenDraft } from './lessonGenDraftService';
import type { StoredV832StudioDraft } from './v832StudioService';

const mockState = vi.hoisted(() => ({
  currentUser: { uid: 'teacher-owner-123', isAnonymous: false } as { uid: string; isAnonymous: boolean } | null,
  sourceDrafts: new Map<string, Record<string, unknown>>(),
  v832Drafts: new Map<string, Record<string, unknown>>(),
  transactionWrites: [] as Array<{ ref: string; type: 'set' | 'update'; payload: Record<string, unknown> }>,
  publicPackageWrites: [] as unknown[],
  compiledPackageWrites: [] as unknown[],
}));

vi.mock('../lib/firebase', () => ({
  auth: {
    get currentUser() {
      return mockState.currentUser;
    },
  },
  db: {},
  storage: {},
  removeUndefinedFields: <T extends Record<string, unknown>>(obj: T): T => obj,
}));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: (_auth: unknown, listener: (user: unknown) => void) => {
  listener(mockState.currentUser); return () => {};
} }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  limit: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  serverTimestamp: () => 'SERVER_TIMESTAMP_SENTINEL',
  getDocFromServer: async (ref: string) => {
    const id = ref.split('/')[1]; const data = mockState.sourceDrafts.get(id) ?? mockState.v832Drafts.get(id);
    return { id, exists: () => !!data, data: () => data ? structuredClone(data) : undefined };
  },
  getDoc: async (ref: string) => {
    const parts = ref.split('/');
    const collectionName = parts[0];
    const id = parts[1];
    if (collectionName === 'lessonGenDrafts') {
      const data = mockState.sourceDrafts.get(id) ?? mockState.v832Drafts.get(id);
      return {
        exists: () => data !== undefined,
        id,
        data: () => (data ? structuredClone(data) : undefined),
      };
    }
    return { exists: () => false, data: () => undefined, id };
  },
  setDoc: async (_ref: string, payload: Record<string, unknown>) => {
    mockState.transactionWrites.push({ ref: _ref, type: 'set', payload });
  },
  onSnapshot: vi.fn(),
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
    return fn({
      get: async (ref: string) => {
        const parts = (typeof ref === 'string' ? ref : '').split('/');
        const collectionName = parts[0];
        const id = parts[1];
        if (collectionName === 'lessonGenDrafts') {
          const data = mockState.sourceDrafts.get(id) ?? mockState.v832Drafts.get(id);
          return {
            exists: () => data !== undefined,
            id,
            data: () => (data ? structuredClone(data) : undefined),
          };
        }
        return { exists: () => false, data: () => undefined, id };
      },
      update: (ref: string, payload: Record<string, unknown>) => {
        mockState.transactionWrites.push({ ref: typeof ref === 'string' ? ref : String(ref), type: 'update', payload });
        const parts = (typeof ref === 'string' ? ref : '').split('/');
        const id = parts[1];
        if (mockState.sourceDrafts.has(id)) {
          mockState.sourceDrafts.set(id, { ...mockState.sourceDrafts.get(id)!, ...payload });
        }
      },
      set: (ref: string, payload: Record<string, unknown>) => {
        mockState.transactionWrites.push({ ref: typeof ref === 'string' ? ref : String(ref), type: 'set', payload });
      },
    });
  },
}));

vi.mock('./lessonGenDraftService', async importOriginal => {
  const actual = await importOriginal<typeof import('./lessonGenDraftService')>();
  return {
    ...actual,
    saveCompiledLessonPackage: async (...args: unknown[]) => {
      mockState.compiledPackageWrites.push(args);
      return actual.saveCompiledLessonPackage(args[0] as string, args[1] as any, args[2] as any);
    },
  };
});

import {
  readOrGenerateV871OwnerPackage,
  persistV871PackageSummary,
  validateV871PackageSummary,
  computeSourceSnapshotFingerprint,
  type V871PackageSummary,
} from './v832StudioService';

const buildValidV871Fixture = async () => {
  const bundle = await createSourceBundle([
    {
      id: 'teacher-source',
      name: 'Day-so.md',
      mimeType: 'text/markdown',
      role: 'teacher_lesson',
      durationMinutes: 40,
      content: 'Dãy số\nCho u_n = 2n + 1.\nHọc sinh giải thích cách chọn quy luật.',
    },
    {
      id: 'reference',
      name: 'reference.txt',
      mimeType: 'text/plain',
      role: 'reference',
      content: 'Tài liệu tham khảo bổ trợ.',
    },
  ]);

  const reviews = buildSourceVerificationRecords(bundle).map(record => ({
    ...record,
    status: record.kind === 'canonical_gap' ? ('needs_review' as const) : ('verified' as const),
  }));

  const approval: TeacherCanonicalSourceApproval = {
    sourceId: 'teacher-source',
    sourceHash: bundle.sourceHash,
    durationMinutes: 40,
    reviewerUid: 'teacher-owner-123',
    approvedAt: '2026-10-09T08:00:00.000Z',
  };

  const baseIR = structuralLessonIR();
  const lesson: LessonIRV83 = {
    ...baseIR,
    lesson: {
      lessonId: 'v871-lesson-test',
      lessonVersion: '1.0.0',
      title: { vi: 'Bài học dãy số thực nghiệm' },
      subject: 'Toán học',
      runtimeMin: 40,
      grade: '11',
    },
    archetype: {
      type: 'concept_formation',
      rationale: 'Hình thành khái niệm từ nguồn',
    },
    provenance: {
      sourceHash: bundle.sourceHash,
    },
    learningDesign: {
      learningIntention: { vi: 'Hiểu và xác định được quy luật của dãy số bậc nhất' },
      successCriteria: [
        {
          id: 'SC1',
          statement: { vi: 'Tính được 3 số hạng đầu tiên của dãy số' },
          observableEvidence: 'Ghi đúng u_1, u_2, u_3 trong phiếu học tập',
        },
        {
          id: 'SC2',
          statement: { vi: 'Giải thích được quy luật tăng đều' },
          observableEvidence: 'Nêu rõ hiệu số giữa hai số hạng liên tiếp bằng 2',
        },
      ],
      intellectualDemand: { coreRichThinkingMoment: 'Giải thích cách tìm số hạng tổng quát' },
    },
    timeline: [
      {
        id: 'A1',
        order: 1,
        title: { vi: 'Khởi động và nêu bài toán' },
        durationSec: 600,
        phase: 'orientation',
        objectiveRefs: ['LI1'],
        successCriteriaRefs: ['SC1'],
        studentAction: 'Quan sát đề bài trên máy và ghi nhận số hạng đầu',
        teacherAction: 'Giới thiệu bài toán và nêu mục tiêu',
        cognitiveDemand: 'recall',
        expectedEvidence: 'Học sinh ghi được u_1 = 3',
        successLookFor: 'Viết đúng số hạng đầu',
        threeWayOrchestration: {
          primaryAttentionSurface: 'presenter',
          presenterRole: 'Trình chiếu đề bài và câu hỏi gợi mở',
          studentRole: 'Quan sát và suy nghĩ cá nhân',
          coachRole: 'Hỗ trợ lớp ổn định và theo dõi màn hình',
          sharedContextRequired: false,
        },
        attentionBeacon: { mode: 'LOOK_UP', copy: { vi: 'Nhìn bảng · Chú ý đề bài' } },
        deviceAdaptation: {
          presenterLaptop: '', presenterTabletLandscape: '', presenterTabletPortrait: '', presenterPhone: '',
          studentLaptop: '', studentTabletLandscape: '', studentTabletPortrait: '', studentPhone: '',
          coachPhone: '', coachTablet: '', keyboardBehavior: '', orientationBehavior: '',
        },
        presenter: { title: { vi: 'Khởi động' }, exactCopy: { vi: 'Cả lớp chú ý lên màn hình.' }, controls: ['next'] },
        student: { state: 'view_only', exactCopy: { vi: 'Hãy quan sát câu hỏi trên bảng.' }, interaction: 'none', onSubmitState: 'wait' },
        coach: {
          purpose: 'Theo dõi khởi động',
          ask: [],
          observe: ['Độ tập trung của học sinh'],
          transitionWhen: 'Hết 10 phút hoặc cả lớp đã ghi xong đề bài',
          ifManyStruggle: ['Nhắc nhở học sinh tập trung'],
          studentMirror: { studentPrompt: { vi: 'Hãy quan sát câu hỏi trên bảng.' }, inputType: 'none', expectedProduct: 'Ghi chép ban đầu', misconceptions: [], recommendedTeacherAction: 'Nhắc nhở chú ý', nextControl: 'next' },
        },
        differentiation: { commonCoreLearning: 'Nhận biết công thức u_n', scaffolds: [], challenge: { type: 'justify', description: 'Dự đoán số hạng thứ 10' } },
        cis: { differentiation: false, assessmentForLearning: false, globalIntercultural: false, digitalCitizenship: false },
        revealPolicy: 'teacher_manual',
        transitionPolicy: 'manual',
        timingPolicy: { plannedDurationSec: 600, surfaceSwitchCostSec: 0, neverAutoNext: true },
        fallback: 'Ghi công thức lên bảng phụ nếu mất máy chiếu',
      },
      {
        id: 'A2',
        order: 2,
        title: { vi: 'Luyện tập cá nhân và giải thích' },
        durationSec: 1200,
        phase: 'practice',
        objectiveRefs: ['LI1'],
        successCriteriaRefs: ['SC1', 'SC2'],
        studentAction: 'Giải câu hỏi Q1 và giải thích cách tính',
        teacherAction: 'Bao quát lớp và hỗ trợ học sinh cần giúp đỡ',
        cognitiveDemand: 'justify',
        expectedEvidence: 'Bài làm đầy đủ các bước tính u_1',
        successLookFor: 'Trình bày rõ ràng công thức thay số',
        threeWayOrchestration: {
          primaryAttentionSurface: 'student_device',
          presenterRole: 'Theo dõi tiến độ chung',
          studentRole: 'Làm bài độc lập trên thiết bị',
          coachRole: 'Quan sát học sinh gặp khó khăn',
          sharedContextRequired: false,
        },
        attentionBeacon: { mode: 'DEVICE', copy: { vi: 'Trên máy · Thực hiện câu hỏi' } },
        deviceAdaptation: {
          presenterLaptop: '', presenterTabletLandscape: '', presenterTabletPortrait: '', presenterPhone: '',
          studentLaptop: '', studentTabletLandscape: '', studentTabletPortrait: '', studentPhone: '',
          coachPhone: '', coachTablet: '', keyboardBehavior: '', orientationBehavior: '',
        },
        presenter: { title: { vi: 'Luyện tập' }, exactCopy: { vi: 'Học sinh làm bài cá nhân trên máy.' }, controls: ['next'] },
        student: { state: 'interactive', exactCopy: { vi: 'Nhập câu trả lời và lời giải thích.' }, interaction: 'text', onSubmitState: 'wait' },
        coach: {
          purpose: 'Theo dõi làm bài',
          ask: [],
          observe: ['Các lỗi thay nhầm n', 'Tiến độ nộp bài'],
          transitionWhen: 'Hết 20 phút',
          ifManyStruggle: ['Hướng dẫn lại cách thay n = 1 vào công thức'],
          studentMirror: { studentPrompt: { vi: 'Nhập câu trả lời và lời giải thích.' }, inputType: 'text', expectedProduct: 'u_1 = 3 và lời giải', misconceptions: [], recommendedTeacherAction: 'Gợi ý nhẹ', nextControl: 'next' },
        },
        differentiation: { commonCoreLearning: 'Tính đúng số hạng đầu', scaffolds: [], challenge: { type: 'justify', description: 'Chứng minh dãy tăng' } },
        cis: { differentiation: false, assessmentForLearning: true, globalIntercultural: false, digitalCitizenship: false },
        revealPolicy: 'teacher_manual',
        transitionPolicy: 'manual',
        timingPolicy: { plannedDurationSec: 1200, surfaceSwitchCostSec: 0, neverAutoNext: true },
        questionInstances: [{ instanceId: 'Q1@A2', questionId: 'Q1', activityId: 'A2', attemptMode: 'fresh', required: true, order: 1 }],
        fallback: 'Phát phiếu bài tập in sẵn',
      },
      {
        id: 'A3',
        order: 3,
        title: { vi: 'Đánh giá thoát và nhìn lại' },
        durationSec: 600,
        phase: 'exit',
        objectiveRefs: ['LI1'],
        successCriteriaRefs: ['SC2'],
        studentAction: 'Viết phiếu thoát và hoàn thành tự đánh giá',
        teacherAction: 'Thu nhận phản hồi và chốt bài học',
        cognitiveDemand: 'synthesize',
        expectedEvidence: 'Phiếu thoát hoàn chỉnh',
        successLookFor: 'Đạt tối thiểu 1 dấu hiệu thành công',
        threeWayOrchestration: {
          primaryAttentionSurface: 'student_device',
          presenterRole: 'Tổng kết và công bố bước tiếp',
          studentRole: 'Hoàn thành tự đánh giá',
          coachRole: 'Kiểm tra tỷ lệ hoàn thành',
          sharedContextRequired: false,
        },
        attentionBeacon: { mode: 'DEVICE', copy: { vi: 'Trên máy · Tự đánh giá' } },
        deviceAdaptation: {
          presenterLaptop: '', presenterTabletLandscape: '', presenterTabletPortrait: '', presenterPhone: '',
          studentLaptop: '', studentTabletLandscape: '', studentTabletPortrait: '', studentPhone: '',
          coachPhone: '', coachTablet: '', keyboardBehavior: '', orientationBehavior: '',
        },
        presenter: { title: { vi: 'Tổng kết' }, exactCopy: { vi: 'Cả lớp hoàn thành phiếu thoát.' }, controls: ['next'] },
        student: { state: 'interactive', exactCopy: { vi: 'Đánh giá mức độ đạt mục tiêu.' }, interaction: 'text', onSubmitState: 'wait' },
        coach: {
          purpose: 'Chốt bài',
          ask: [],
          observe: ['Mức độ tự tin của học sinh'],
          transitionWhen: 'Hết giờ',
          ifManyStruggle: ['Hỗ trợ học sinh chưa hiểu tiêu chí'],
          studentMirror: { studentPrompt: { vi: 'Đánh giá mức độ đạt mục tiêu.' }, inputType: 'text', expectedProduct: 'Nhận xét', misconceptions: [], recommendedTeacherAction: 'Chốt kiến thức', nextControl: 'next' },
        },
        differentiation: { commonCoreLearning: 'Nhìn lại kết quả đạt được', scaffolds: [], challenge: { type: 'justify', description: 'Liên hệ thực tế' } },
        cis: { differentiation: false, assessmentForLearning: false, globalIntercultural: false, digitalCitizenship: false },
        revealPolicy: 'no_reveal',
        transitionPolicy: 'manual',
        timingPolicy: { plannedDurationSec: 600, surfaceSwitchCostSec: 0, neverAutoNext: true, protected: true },
        fallback: 'Ghi phiếu giấy nhỏ nộp trực tiếp',
      },
    ],
    questions: {
      Q1: {
        id: 'Q1',
        prompt: { vi: 'Cho u_n = 2n + 1. Tính u_1?' },
        responseType: 'short',
        correctAnswer: '3',
        workedSolution: 'u_1 = 2(1) + 1 = 3',
        rubric: { maxScore: 1, criteria: 'Đúng kết quả và có bước thay số' },
        hints: [{ level: 1, content: { vi: 'Thay n = 1 vào công thức u_n = 2n + 1' } }],
        misconceptions: [],
        evidenceTargets: ['SC1'],
        submissionModes: ['typed'],
        estimatedWorkTimeSec: 60,
        authoredSource: 'teacher',
      },
    },
    visuals: {},
    reflectionContract: {
      mappedSuccessCriteria: ['SC1', 'SC2'],
      studentReflection: 'Em đã nắm được cách thay số và nhận diện dãy số',
      nextStep: 'Làm bài tập về dãy số cấp số cộng ở buổi sau',
    },
    extensions: {
      v871Experience: {
        version: '1.0',
        sourceHash: bundle.sourceHash,
        experienceArc: [
          { activityId: 'A1', purpose: 'Khởi động và hình thành' },
          { activityId: 'A2', purpose: 'Luyện tập cá nhân có giải thích' },
          { activityId: 'A3', purpose: 'Tổng kết và đánh giá thoát' },
        ],
        archetype: {
          v871: 'KNOWLEDGE_FORMATION',
          canonicalBase: 'concept_formation',
          decision: 'LOSSLESS',
          rationale: 'Hình thành khái niệm theo tài liệu giáo viên đã duyệt',
          sourceClaimIds: ['teacher-source:math_expression:1'],
        },
        reveal: {
          A1: { v871Policy: 'TEACHER_MANUAL', canonicalPolicy: 'teacher_manual', decision: 'LOSSLESS' },
          A2: { v871Policy: 'TEACHER_MANUAL', canonicalPolicy: 'teacher_manual', decision: 'LOSSLESS' },
          A3: { v871Policy: 'NO_REVEAL', canonicalPolicy: 'no_reveal', decision: 'LOSSLESS' },
        },
        timing: {
          slotDurationSec: 2400,
          coreBudgetSec: 2000,
          reserveBudgetSec: 400,
        },
        activities: {
          A1: {
            signature: {
              attentionTarget: 'PRESENTER',
              participationMode: 'WHOLE_CLASS',
              interactionPattern: 'DIRECT_EXPLANATION',
              responseMode: 'NONE',
              visualMode: 'STATIC',
              physicalAction: 'POINT',
              evidenceType: 'OBSERVATION',
              transitionCue: 'Tập trung lên bảng',
            },
            handoff: {
              target: 'PRESENTER',
              entryCue: 'Cả lớp chú ý màn hình',
              deviceState: 'view_only',
              exitCue: 'Mở thiết bị cá nhân',
              fallback: 'Ghi bảng phụ',
            },
            coreBudgetSec: 500,
            recoveryBudgetSec: 100,
            protectedEvidence: [],
            fastPath: { cuttable: false },
            repetitionRationale: null,
          },
          A2: {
            signature: {
              attentionTarget: 'STUDENT_DEVICE',
              participationMode: 'INDIVIDUAL',
              interactionPattern: 'PROBLEM_SOLVING',
              responseMode: 'TEXT',
              visualMode: 'NONE',
              physicalAction: 'NONE',
              evidenceType: 'ITEM_RESPONSE',
              transitionCue: 'Hoàn thành câu trả lời trên máy',
            },
            handoff: {
              target: 'STUDENT_DEVICE',
              entryCue: 'Bắt đầu làm câu hỏi',
              deviceState: 'interactive',
              exitCue: 'Nộp câu trả lời',
              fallback: 'Phát phiếu bài tập in sẵn',
            },
            coreBudgetSec: 1000,
            recoveryBudgetSec: 200,
            protectedEvidence: [],
            fastPath: { cuttable: false },
            repetitionRationale: null,
          },
          A3: {
            signature: {
              attentionTarget: 'STUDENT_DEVICE',
              participationMode: 'INDIVIDUAL',
              interactionPattern: 'EXIT_SYNTHESIS',
              responseMode: 'TEXT',
              visualMode: 'NONE',
              physicalAction: 'WRITE_PAPER',
              evidenceType: 'EXIT_SUBMISSION',
              transitionCue: 'Hoàn tất phiếu thoát',
            },
            handoff: {
              target: 'STUDENT_DEVICE',
              entryCue: 'Mở màn hình đánh giá',
              deviceState: 'interactive',
              exitCue: 'Nộp bài và đóng ứng dụng',
              fallback: 'Ghi phiếu giấy nhỏ',
            },
            coreBudgetSec: 500,
            recoveryBudgetSec: 100,
            protectedEvidence: ['exit'],
            fastPath: { cuttable: false },
            repetitionRationale: null,
          },
        },
        visualOpportunityAudit: {
          spatial: false,
          parameter: false,
          representation: false,
          invariant: false,
          errorTrace: false,
          stepwiseReveal: false,
          decision: 'NOT_APPLICABLE',
          rationale: 'Chưa dùng mô phỏng trực quan hình học',
          sourceClaimIds: [],
        },
        capabilities: {
          collaboration: {
            lessonDecision: 'NOT_APPLICABLE',
            rationale: 'Bài học tập trung vào luyện tập cá nhân',
            sourceClaimIds: [],
          },
          peerReview: {
            lessonDecision: 'NOT_APPLICABLE',
            rationale: 'Không tổ chức đánh giá đồng đẳng trong tiết',
            sourceClaimIds: [],
          },
        },
      },
    },
  };

  return { bundle, reviews, approval, lesson };
};

describe('v832StudioService V8.8.1 owner-private package orchestration', () => {
  const sourceDraftId = 'lesson-gen-11111111111111111111';
  const v832DraftId = 'v832-222222222222222222222222';

  beforeEach(() => {
    mockState.currentUser = { uid: 'teacher-owner-123', isAnonymous: false };
    mockState.sourceDrafts.clear();
    mockState.v832Drafts.clear();
    mockState.transactionWrites = [];
    mockState.publicPackageWrites = [];
    mockState.compiledPackageWrites = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const seedFixture = async (modifySource?: (s: StoredLessonGenDraft) => void, modifyIR?: (ir: StoredV832StudioDraft) => void) => {
    const { bundle, reviews, approval, lesson } = await buildValidV871Fixture();
    const sourceDraft: StoredLessonGenDraft = {
      id: sourceDraftId,
      ownerUid: 'teacher-owner-123',
      sourceHash: bundle.sourceHash,
      revision: 1,
      status: 'imported',
      sourceBundle: bundle,
      verificationRecords: reviews,
      sourceApproval: approval,
      v832DraftId,
    };
    if (modifySource) modifySource(sourceDraft);

    const v832Draft: StoredV832StudioDraft = {
      id: v832DraftId,
      ownerUid: 'teacher-owner-123',
      sourceHash: bundle.sourceHash,
      revision: 1,
      status: 'v832_review',
      lessonIR: encodePrivateLessonIR(lesson) as unknown as LessonIRV83,
      confirmationAudit: [],
      semanticAttestations: [],
      sourceDraftId,
    };
    if (modifyIR) modifyIR(v832Draft);

    mockState.sourceDrafts.set(sourceDraftId, sourceDraft as unknown as Record<string, unknown>);
    mockState.v832Drafts.set(v832DraftId, v832Draft as unknown as Record<string, unknown>);
    return { bundle, reviews, approval, lesson, sourceDraft, v832Draft };
  };

  it('orchestrates authenticated owner package export and persists exact 11-field summary via CAS', async () => {
    await seedFixture();

    const result = await readOrGenerateV871OwnerPackage(sourceDraftId);

    expect(result.package.access).toBe('OWNER_PRIVATE');
    expect(result.package.version).toBe('8.8.1');
    expect(result.package.releaseStatus).toBe('NOT_CERTIFIED');
    expect(result.package.files).toHaveLength(14);

    expect(result.summary).toBeDefined();
    expect(result.summary.version).toBe('8.8.1');
    expect(result.summary.access).toBe('OWNER_PRIVATE');
    expect(result.summary.releaseStatus).toBe('NOT_CERTIFIED');
    expect(result.summary.artifactCount).toBe(14);
    expect(result.summary.irDraftId).toBe(v832DraftId);
    expect(result.summary.irRevision).toBe(1);
    expect(result.summary.sourceSnapshotFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result.summary.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.summary.packageHash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof result.summary.generatedAt).toBe('string');

    // Strict 11 fields check
    const summaryKeys = Object.keys(result.summary).sort();
    expect(summaryKeys).toEqual([
      'access',
      'artifactCount',
      'contentHash',
      'generatedAt',
      'irDraftId',
      'irRevision',
      'packageHash',
      'releaseStatus',
      'sourceHash',
      'sourceSnapshotFingerprint',
      'version',
    ]);

    // Exactly one transaction write to update source doc with exact two keys: v871PackageSummary, updatedAt
    expect(mockState.transactionWrites).toHaveLength(1);
    const write = mockState.transactionWrites[0];
    expect(write.ref).toBe(`lessonGenDrafts/${sourceDraftId}`);
    expect(write.type).toBe('update');
    expect(Object.keys(write.payload).sort()).toEqual(['updatedAt', 'v871PackageSummary']);
    expect(write.payload.v871PackageSummary).toEqual(result.summary);

    // No public packages, compiled packages, or other documents written
    expect(mockState.publicPackageWrites).toHaveLength(0);
    expect(mockState.compiledPackageWrites).toHaveLength(0);
  });

  it('rejects unauthenticated or anonymous user with zero writes', async () => {
    await seedFixture();
    mockState.currentUser = null;

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow();
    expect(mockState.transactionWrites).toHaveLength(0);

    mockState.currentUser = { uid: 'anon', isAnonymous: true };
    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow();
    expect(mockState.transactionWrites).toHaveLength(0);
  });

  it('rejects missing source draft with V871_SOURCE_SNAPSHOT_REQUIRED and zero writes', async () => {
    await seedFixture();
    mockState.sourceDrafts.delete(sourceDraftId);

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/V871_SOURCE_SNAPSHOT_REQUIRED/);
    expect(mockState.transactionWrites).toHaveLength(0);
  });

  it('rejects missing or unlinked IR draft with V871_IR_DRAFT_REQUIRED and zero writes', async () => {
    await seedFixture(s => {
      s.v832DraftId = null;
    });

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/V871_IR_DRAFT_REQUIRED/);
    expect(mockState.transactionWrites).toHaveLength(0);

    // Test when v832DraftId points to nonexistent IR doc
    mockState.sourceDrafts.clear();
    mockState.v832Drafts.clear();
    await seedFixture();
    mockState.v832Drafts.delete(v832DraftId);

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/V871_IR_DRAFT_REQUIRED/);
    expect(mockState.transactionWrites).toHaveLength(0);
  });

  it('rejects owner mismatch on source or linked IR with zero writes', async () => {
    await seedFixture(s => {
      s.ownerUid = 'other-teacher';
    });

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow();
    expect(mockState.transactionWrites).toHaveLength(0);

    mockState.sourceDrafts.clear();
    mockState.v832Drafts.clear();
    await seedFixture(undefined, ir => {
      ir.ownerUid = 'other-teacher';
    });

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow();
    expect(mockState.transactionWrites).toHaveLength(0);
  });

  it('rejects tampered source content or IR sourceHash mismatch with zero writes', async () => {
    await seedFixture(s => {
      s.sourceBundle.sources[0].content = 'Tampered content';
    });

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/SOURCE_HASH_MISMATCH/);
    expect(mockState.transactionWrites).toHaveLength(0);

    mockState.sourceDrafts.clear();
    mockState.v832Drafts.clear();
    await seedFixture(undefined, ir => {
      ir.sourceHash = '0000000000000000000000000000000000000000000000000000000000000000';
    });

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/V871_SOURCE_HASH_MISMATCH/);
    expect(mockState.transactionWrites).toHaveLength(0);
  });

  it('rejects when source duration does not match IR runtimeMin with zero writes', async () => {
    await seedFixture(s => {
      s.sourceBundle.durationMinutes = 90;
      s.sourceApproval!.durationMinutes = 90;
    });

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/LESSON_DURATION_MISMATCH/);
    expect(mockState.transactionWrites).toHaveLength(0);
  });

  it('discards embedded IR sourceSnapshot and uses freshly read current source draft snapshot', async () => {
    const { sourceDraft, v832Draft } = await seedFixture(undefined, ir => {
      // Intentionally put a corrupt/poisoned embedded snapshot in the IR doc
      ir.sourceSnapshot = {
        sourceBundle: { ...ir.sourceSnapshot?.sourceBundle, sourceHash: 'poisoned' } as any,
        verificationRecords: [],
        sourceApproval: null,
      };
    });

    // Exporter should succeed because it reads authoritative source from sourceDraft, discarding ir.sourceSnapshot!
    const result = await readOrGenerateV871OwnerPackage(sourceDraftId);
    expect(result.package.access).toBe('OWNER_PRIVATE');
    expect(result.summary.sourceHash).toBe(sourceDraft.sourceHash);
  });

  it('rejects legacy IR lacking v871Experience extension with V871_EXTENSION_REQUIRED and zero writes', async () => {
    await seedFixture(undefined, ir => {
      const decoded = structuralLessonIR();
      decoded.provenance = { sourceHash: ir.sourceHash };
      // Omit v871Experience
      ir.lessonIR = encodePrivateLessonIR(decoded) as unknown as LessonIRV83;
    });

    await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/V871_EXTENSION_REQUIRED/);
    expect(mockState.transactionWrites).toHaveLength(0);
  });

  describe('CAS transaction atomicity and snapshot fingerprint protection', () => {
    it('detects approval change between read and CAS transaction and aborts with zero writes', async () => {
      const { bundle } = await seedFixture();

      // We spy on runTransaction to simulate concurrent edit before CAS commit
      const originalFingerprint = await computeSourceSnapshotFingerprint(mockState.sourceDrafts.get(sourceDraftId) as any);

      // Concurrent modification: sourceApproval changed (approvedAt changed) with sourceRevision unchanged
      const concurrentDraft = structuredClone(mockState.sourceDrafts.get(sourceDraftId)!);
      (concurrentDraft.sourceApproval as TeacherCanonicalSourceApproval).approvedAt = '2026-10-09T12:00:00.000Z';
      mockState.sourceDrafts.set(sourceDraftId, concurrentDraft);

      const summary: V871PackageSummary = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: bundle.sourceHash,
        contentHash: 'a'.repeat(64),
        packageHash: 'b'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: originalFingerprint,
        irDraftId: v832DraftId,
        irRevision: 1,
        generatedAt: new Date().toISOString(),
      };

      await expect(
        persistV871PackageSummary(sourceDraftId, originalFingerprint, 1, 'a'.repeat(64), summary)
      ).rejects.toThrow(/V871_PACKAGE_REVISION_CONFLICT/);

      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('detects verificationRecords change with sourceHash and sourceRevision unchanged and aborts with zero writes', async () => {
      const { bundle } = await seedFixture();
      const originalFingerprint = await computeSourceSnapshotFingerprint(mockState.sourceDrafts.get(sourceDraftId) as any);

      // Concurrent modification: add extra verified record (source gate passes, but fingerprint differs)
      const concurrentDraft = structuredClone(mockState.sourceDrafts.get(sourceDraftId)!);
      (concurrentDraft.verificationRecords as SourceVerificationRecord[]).push({
        id: 'rec-extra',
        sourceId: 'teacher-source',
        kind: 'math_expression',
        locator: { kind: 'whole_file', value: 'line:99' },
        excerpt: 'u_n = 2n + 1',
        status: 'verified',
      });
      mockState.sourceDrafts.set(sourceDraftId, concurrentDraft);

      const summary: V871PackageSummary = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: bundle.sourceHash,
        contentHash: 'a'.repeat(64),
        packageHash: 'b'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: originalFingerprint,
        irDraftId: v832DraftId,
        irRevision: 1,
        generatedAt: new Date().toISOString(),
      };

      await expect(
        persistV871PackageSummary(sourceDraftId, originalFingerprint, 1, 'a'.repeat(64), summary)
      ).rejects.toThrow(/V871_PACKAGE_REVISION_CONFLICT/);

      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('detects IR revision change between read and CAS transaction and aborts with zero writes', async () => {
      const { bundle } = await seedFixture();
      const fingerprint = await computeSourceSnapshotFingerprint(mockState.sourceDrafts.get(sourceDraftId) as any);

      // Concurrent modification: IR revision bumped from 1 to 2
      const concurrentIR = structuredClone(mockState.v832Drafts.get(v832DraftId)!);
      concurrentIR.revision = 2;
      mockState.v832Drafts.set(v832DraftId, concurrentIR);

      const summary: V871PackageSummary = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: bundle.sourceHash,
        contentHash: 'a'.repeat(64),
        packageHash: 'b'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: fingerprint,
        irDraftId: v832DraftId,
        irRevision: 1, // Stale expected revision
        generatedAt: new Date().toISOString(),
      };

      await expect(
        persistV871PackageSummary(sourceDraftId, fingerprint, 1, 'a'.repeat(64), summary)
      ).rejects.toThrow(/V871_PACKAGE_REVISION_CONFLICT/);

      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('detects IR contentHash change between read and CAS transaction and aborts with zero writes', async () => {
      const { bundle } = await seedFixture();
      const fingerprint = await computeSourceSnapshotFingerprint(mockState.sourceDrafts.get(sourceDraftId) as any);

      const summary: V871PackageSummary = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: bundle.sourceHash,
        contentHash: '0'.repeat(64),
        packageHash: 'b'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: fingerprint,
        irDraftId: v832DraftId,
        irRevision: 1,
        generatedAt: new Date().toISOString(),
      };

      await expect(
        persistV871PackageSummary(sourceDraftId, fingerprint, 1, summary.contentHash, summary)
      ).rejects.toThrow(/V871_PACKAGE_REVISION_CONFLICT/);

      expect(mockState.transactionWrites).toHaveLength(0);
    });
  });

  describe('strict 11-field summary validation and PII rejection', () => {
    it('rejects summary containing unknown fields, learner data, or PII with zero writes', async () => {
      await seedFixture();
      const fingerprint = 'a'.repeat(64);

      const validSummary: V871PackageSummary = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: 'a'.repeat(64),
        contentHash: 'b'.repeat(64),
        packageHash: 'c'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: fingerprint,
        irDraftId: v832DraftId,
        irRevision: 1,
        generatedAt: '2026-10-09T08:00:00.000Z',
      };

      expect(validateV871PackageSummary(validSummary)).toEqual([]);

      // Test with ownerUid (PII) injected
      const piiSummary = { ...validSummary, ownerUid: 'teacher-owner-123' };
      expect(validateV871PackageSummary(piiSummary).length).toBeGreaterThan(0);
      await expect(
        persistV871PackageSummary(sourceDraftId, fingerprint, 1, validSummary.contentHash, piiSummary as any)
      ).rejects.toThrow();

      // Test with answer or rubric injected
      const answerSummary = { ...validSummary, answers: { Q1: '3' } };
      expect(validateV871PackageSummary(answerSummary).length).toBeGreaterThan(0);
      await expect(
        persistV871PackageSummary(sourceDraftId, fingerprint, 1, validSummary.contentHash, answerSummary as any)
      ).rejects.toThrow();

      // Test with wrong version or access
      expect(validateV871PackageSummary({ ...validSummary, version: '8.7.0' }).length).toBeGreaterThan(0);
      expect(validateV871PackageSummary({ ...validSummary, access: 'PUBLIC' }).length).toBeGreaterThan(0);
      expect(validateV871PackageSummary({ ...validSummary, releaseStatus: 'READY' }).length).toBeGreaterThan(0);
      expect(validateV871PackageSummary({ ...validSummary, artifactCount: 13 }).length).toBeGreaterThan(0);

      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('rejects accessor descriptors without invoking them', () => {
      let getterInvoked = false;
      const summaryWithGetter = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: 'a'.repeat(64),
        contentHash: 'b'.repeat(64),
        packageHash: 'c'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: 'd'.repeat(64),
        irDraftId: v832DraftId,
        irRevision: 1,
      };
      Object.defineProperty(summaryWithGetter, 'generatedAt', {
        get() {
          getterInvoked = true;
          return '2026-10-09T08:00:00.000Z';
        },
        enumerable: true,
        configurable: true,
      });

      const issues = validateV871PackageSummary(summaryWithGetter);
      expect(getterInvoked).toBe(false);
      expect(issues).toContain('ACCESSOR_DESCRIPTOR_FORBIDDEN');
    });

    it('rejects symbols, non-enumerable properties, and unsafe prototypes', () => {
      const valid = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: 'a'.repeat(64),
        contentHash: 'b'.repeat(64),
        packageHash: 'c'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: 'd'.repeat(64),
        irDraftId: v832DraftId,
        irRevision: 1,
        generatedAt: '2026-10-09T08:00:00.000Z',
      };

      const withSym = { ...valid, [Symbol('secret')]: 'leak' };
      expect(validateV871PackageSummary(withSym)).toContain('UNEXPECTED_SYMBOL_KEY');

      const withNonEnum = { ...valid };
      Object.defineProperty(withNonEnum, 'extraHidden', { value: 123, enumerable: false });
      expect(validateV871PackageSummary(withNonEnum)).toContain('NON_ENUMERABLE_KEY_FORBIDDEN');

      const withUnsafeProto = Object.create({ inherited: true }, Object.getOwnPropertyDescriptors(valid));
      expect(validateV871PackageSummary(withUnsafeProto)).toContain('INVALID_SUMMARY_PROTOTYPE');
    });

    it('rejects non-strict ISO dates in generatedAt', () => {
      const valid = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: 'a'.repeat(64),
        contentHash: 'b'.repeat(64),
        packageHash: 'c'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: 'd'.repeat(64),
        irDraftId: v832DraftId,
        irRevision: 1,
        generatedAt: '2026-10-09', // Not full ISO with time and UTC Z
      };
      expect(validateV871PackageSummary(valid)).toContain('INVALID_GENERATED_AT');
      expect(validateV871PackageSummary({ ...valid, generatedAt: '2026-10-09 08:00:00' })).toContain('INVALID_GENERATED_AT');
    });

    it('rejects normalized invalid calendar dates such as February 30th or April 31st', () => {
      const valid = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: 'a'.repeat(64),
        contentHash: 'b'.repeat(64),
        packageHash: 'c'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: 'd'.repeat(64),
        irDraftId: v832DraftId,
        irRevision: 1,
        generatedAt: '2026-02-30T08:00:00.000Z',
      };
      expect(validateV871PackageSummary(valid)).toContain('INVALID_GENERATED_AT');
      expect(validateV871PackageSummary({ ...valid, generatedAt: '2026-04-31T08:00:00.000Z' })).toContain('INVALID_GENERATED_AT');
    });

    it('rejects inherited properties from Object.prototype without invoking getter and with zero writes', () => {
      let getterCount = 0;
      Object.defineProperty(Object.prototype, 'irRevision', {
        get() {
          getterCount++;
          return 1;
        },
        configurable: true,
      });

      try {
        const missingIrRevision = {
          version: '8.8.1',
          access: 'OWNER_PRIVATE',
          releaseStatus: 'NOT_CERTIFIED',
          sourceHash: 'a'.repeat(64),
          contentHash: 'b'.repeat(64),
          packageHash: 'c'.repeat(64),
          artifactCount: 14,
          sourceSnapshotFingerprint: 'd'.repeat(64),
          irDraftId: v832DraftId,
          generatedAt: '2026-10-09T08:00:00.000Z',
        };

        const issues = validateV871PackageSummary(missingIrRevision);
        expect(issues.some(i => i.includes('irRevision'))).toBe(true);
        expect(getterCount).toBe(0);
        expect(mockState.transactionWrites).toHaveLength(0);
      } finally {
        delete (Object.prototype as any).irRevision;
      }
    });

    it('detaches validated summary before first await so caller mutations do not leak into transaction patch', async () => {
      const { lesson } = await seedFixture();
      const fingerprint = await computeSourceSnapshotFingerprint(mockState.sourceDrafts.get(sourceDraftId) as any);
      const contentHash = await computeLessonContentHash(lesson);

      const summary: V871PackageSummary = {
        version: '8.8.1',
        access: 'OWNER_PRIVATE',
        releaseStatus: 'NOT_CERTIFIED',
        sourceHash: (mockState.sourceDrafts.get(sourceDraftId) as any).sourceHash,
        contentHash,
        packageHash: 'b'.repeat(64),
        artifactCount: 14,
        sourceSnapshotFingerprint: fingerprint,
        irDraftId: v832DraftId,
        irRevision: 1,
        generatedAt: '2026-10-09T08:00:00.000Z',
      };

      const persistPromise = persistV871PackageSummary(sourceDraftId, fingerprint, 1, contentHash, summary);
      // Malicious caller mutates summary after calling persistV871PackageSummary
      (summary as any).sourceHash = 'tampered_hash_after_call';
      await persistPromise;

      expect(mockState.transactionWrites).toHaveLength(1);
      const writtenSummary = mockState.transactionWrites[0].payload.v871PackageSummary as V871PackageSummary;
      expect(writtenSummary.sourceHash).toBe((mockState.sourceDrafts.get(sourceDraftId) as any).sourceHash);
      expect(writtenSummary.sourceHash).not.toBe('tampered_hash_after_call');
    });
  });

  describe('initiating auth pinning and bidirectional linkage', () => {
    it('aborts transaction write if Firebase user switches before transaction commit', async () => {
      await seedFixture();

      // Intercept runTransaction to simulate auth switch right before transaction execute
      const originalRunTransaction = (await import('firebase/firestore')).runTransaction;
      vi.spyOn(await import('firebase/firestore'), 'runTransaction').mockImplementationOnce(async (...args) => {
        mockState.currentUser = { uid: 'different-teacher', isAnonymous: false };
        return (originalRunTransaction as any)(...args);
      });

      await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/Phiên đăng nhập đã thay đổi/);
      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('suppresses private package return if auth changes after transaction commit', async () => {
      await seedFixture();

      // Transaction commits successfully, but user logs out right before return
      const originalRunTransaction = (await import('firebase/firestore')).runTransaction;
      vi.spyOn(await import('firebase/firestore'), 'runTransaction').mockImplementationOnce(async (...args) => {
        const res = await (originalRunTransaction as any)(...args);
        mockState.currentUser = null;
        return res;
      });

      await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/Phiên đăng nhập đã thay đổi/);
      // Cache was committed in transaction, but private package is NOT returned to unauthenticated session
      expect(mockState.transactionWrites).toHaveLength(1);
    });

    it('rejects with zero writes if Firebase user object is replaced with new object with same UID during export', async () => {
      await seedFixture();

      // Intercept export to simulate session object replacement with same UID
      const exporterModule = await import('../lib/lessonCompiler/v832/v871PackageExporter');
      vi.spyOn(exporterModule, 'exportV871OwnerPrivatePackage').mockImplementationOnce(async input => {
        mockState.currentUser = { uid: 'teacher-owner-123', isAnonymous: false }; // New object reference!
        return (exporterModule as any).exportV871OwnerPrivatePackage(input);
      });

      await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/Phiên đăng nhập đã thay đổi/);
      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('rejects with zero writes if Firebase user object is replaced with new object with same UID before transaction execution/callback', async () => {
      await seedFixture();

      const originalRunTransaction = (await import('firebase/firestore')).runTransaction;
      vi.spyOn(await import('firebase/firestore'), 'runTransaction').mockImplementationOnce(async (...args) => {
        mockState.currentUser = { uid: 'teacher-owner-123', isAnonymous: false }; // New object reference!
        return (originalRunTransaction as any)(...args);
      });

      await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/Phiên đăng nhập đã thay đổi/);
      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('rejects with zero writes if Firebase user object is replaced with new object with same UID during an actual transaction retry', async () => {
      await seedFixture();

      let attempts = 0;
      const sourceBefore = structuredClone([...mockState.sourceDrafts]);
      const irBefore = structuredClone([...mockState.v832Drafts]);
      const stagedCounts: number[] = [];
      vi.spyOn(await import('firebase/firestore'), 'runTransaction').mockImplementationOnce(async (_db, updateFunction) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          const staged: Array<{ ref: unknown; payload: unknown }> = [];
          attempts++;
          const tx = {
            get: async (ref: unknown) => {
              const id = String(ref).split('/')[1];
              const data = mockState.sourceDrafts.get(id) ?? mockState.v832Drafts.get(id);
              return { id, exists: () => data !== undefined, data: () => structuredClone(data) };
            },
            update: (ref: unknown, payload: unknown) => { staged.push({ ref, payload }); },
            set: (ref: unknown, payload: unknown) => { staged.push({ ref, payload }); },
          };
          try {
            await updateFunction(tx as unknown as Parameters<typeof updateFunction>[0]);
          } finally {
            stagedCounts.push(staged.length);
          }
          // Firestore conflict discards attempt-local writes before retrying with a replaced session.
          expect(staged).toHaveLength(1);
          expect([...mockState.sourceDrafts]).toEqual(sourceBefore);
          expect([...mockState.v832Drafts]).toEqual(irBefore);
          expect(mockState.transactionWrites).toHaveLength(0);
          mockState.currentUser = { uid: 'teacher-owner-123', isAnonymous: false };
        }
        throw new Error('Second callback must reject the replaced session');
      });

      await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/Phiên đăng nhập đã thay đổi/);
      expect(mockState.transactionWrites).toHaveLength(0);
      expect(attempts).toBe(2);
      expect(stagedCounts).toEqual([1, 0]);
      expect([...mockState.sourceDrafts]).toEqual(sourceBefore);
      expect([...mockState.v832Drafts]).toEqual(irBefore);
    });

    it('suppresses private package return if user object is replaced with new object with same UID postcommit', async () => {
      await seedFixture();

      const originalRunTransaction = (await import('firebase/firestore')).runTransaction;
      vi.spyOn(await import('firebase/firestore'), 'runTransaction').mockImplementationOnce(async (...args) => {
        const res = await (originalRunTransaction as any)(...args);
        mockState.currentUser = { uid: 'teacher-owner-123', isAnonymous: false }; // New object reference!
        return res;
      });

      await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/Phiên đăng nhập đã thay đổi/);
      expect(mockState.transactionWrites).toHaveLength(1);
    });

    it('rejects when source document sourceHash does not match sourceBundle.sourceHash', async () => {
      await seedFixture(s => {
        s.sourceHash = '0000000000000000000000000000000000000000000000000000000000000000';
      });

      await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/SOURCE_HASH_MISMATCH/);
      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('rejects when linked IR does not reverse-link to sourceDraftId', async () => {
      await seedFixture(undefined, ir => {
        ir.sourceDraftId = 'lesson-gen-different-source';
      });

      await expect(readOrGenerateV871OwnerPackage(sourceDraftId)).rejects.toThrow(/V871_SOURCE_SNAPSHOT_REQUIRED/);
      expect(mockState.transactionWrites).toHaveLength(0);
    });

    it('rejects when requested displayed IR does not match source.v832DraftId', async () => {
      await seedFixture();

      await expect(
        readOrGenerateV871OwnerPackage(sourceDraftId, 'v832-other-displayed-ir')
      ).rejects.toThrow(/V871_IR_DRAFT_REQUIRED/);
      expect(mockState.transactionWrites).toHaveLength(0);
    });
  });
});
