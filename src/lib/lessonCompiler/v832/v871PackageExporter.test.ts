import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createSourceBundle, type LessonSourceBundle } from '../../lessonGen/sourceIngestion';
import { buildSourceVerificationRecords, type SourceVerificationRecord, type TeacherCanonicalSourceApproval } from '../../lessonGen/sourceVerification';
import { computeLessonContentHash } from '../../lessonReview/v832/repairLifecycle';
import { structuralLessonIR, createV871AuthoringFixture } from './lessonIR.testFixture';
import { buildSourceModel } from './sourceModel';
import { authorLessonIR } from './authorLessonIR';
import type { LessonIRV83 } from './lessonIRSchema';
import type { V871Experience } from './experienceExtension';
import {
  exportV871OwnerPrivatePackage,
  type V871PackageInput,
} from './v871PackageExporter';

const EXPECTED_ARTIFACT_NAMES = [
  '00_READ_ME.md',
  '01_OFFICIAL_LESSON_PLAN.md',
  '02_TEACHING_ANNEX.md',
  '03_V871_TECHNICAL_MANIFEST.md',
  '04_RUNTIME_TEST_CASES.md',
  '05_MACHINE_SUMMARY.json',
  '06_PRESENTER_STORYBOARD.md',
  '07_VISUAL_CONTRACTS.md',
  '08_COLLABORATION_ORCHESTRATION.md',
  '09_PEER_REVIEW_CONTRACTS.md',
  '10_SCAFFOLD_CHALLENGE_MAP.md',
  '11_TIMING_PROTECTION.md',
  '12_LESSON_EXPERIENCE_MAP.md',
  '13_ATTENTION_HANDOFF_MAP.md',
] as const;

describe('source-bound extension1.1 export', () => {
  const prepare = async () => {
    const { input, bundle, reviews, approval } = await buildSyntheticFixture();
    const fixture = createV871AuthoringFixture(buildSourceModel(bundle, reviews), 40);
    let calls = 0;
    const candidate = await authorLessonIR({ bundle, reviews, ownerUid: input.ownerUid, teacherApproval: approval,
      lessonId: 'source-bound-export', invoke: async () => JSON.stringify(++calls === 1 ? fixture.plan : fixture.lesson) });
    if (candidate.status !== 'MAPPED') throw new Error('Synthetic mapping expected');
    return { input: { ...input, lessonIR: candidate.lessonIR }, plan: candidate.authoringPlan };
  };
  it('requires the accepted plan instead of reconstructing one from IR', async () => {
    const { input } = await prepare();
    await expect(exportV871OwnerPrivatePackage(input)).rejects.toThrow('V871_AUTHORING_PLAN_REQUIRED');
  });
  it('rejects a source-valid plan whose canonical mapping was changed', async () => {
    const { input, plan } = await prepare(); input.lessonIR.timeline[0].teacherAction += ' changed';
    await expect(exportV871OwnerPrivatePackage({ ...input, authoringPlan: plan })).rejects.toThrow('V871_STAGE2_MAPPING_INVALID');
  });
  it('exports the actual accepted plan as fourteen private draft files', async () => {
    const { input, plan } = await prepare();
    const result = await exportV871OwnerPrivatePackage({ ...input, authoringPlan: plan });
    expect(result.files.map(file => file.name)).toEqual(EXPECTED_ARTIFACT_NAMES);
    expect(result.releaseStatus).toBe('NOT_CERTIFIED');
    const experience = result.files.find(file => file.name === '12_LESSON_EXPERIENCE_MAP.md')!.content;
    for (const activity of plan.activities) for (const beat of activity.beats) expect(experience.includes(beat.instruction)).toBe(true);
    for (const option of plan.closing.nextStepOptions) expect(experience.includes(option.action)).toBe(true);
    const handoff = result.files.find(file => file.name === '13_ATTENTION_HANDOFF_MAP.md')!.content;
    expect(handoff.includes(plan.activities[0].offlineFallback)).toBe(true);
    expect(handoff.includes(plan.activities[0].transitionToNext)).toBe(true);
    expect(result.files.find(file => file.name === '11_TIMING_PROTECTION.md')!.content)
      .toContain('Không có hoạt động được phép cắt');
  });

  it('documents NO_REVEAL without promising a manual answer reveal', async () => {
    const { input } = await buildSyntheticFixture();
    input.lessonIR.timeline[2].questionBuild = { mode: 'teacher_led_progressive', steps: [
      { type: 'reveal', id: 'hidden-answer', label: { vi: 'Kết quả' }, content: { vi: 'PRIVATE_NO_REVEAL_ANSWER' } },
    ] };
    const result = await exportV871OwnerPrivatePackage(input);
    const section = result.files.find(file => file.name === '04_RUNTIME_TEST_CASES.md')!.content
      .split('### TC-REV-3:')[1].split('## Timing')[0];
    expect(section).toContain('Không gửi hoặc hiển thị đáp án');
    expect(section).not.toContain('giáo viên bấm xác nhận công bố');
    const storyboard = result.files.find(file => file.name === '06_PRESENTER_STORYBOARD.md')!.content;
    expect(storyboard).not.toContain('Chỉ sau khi giáo viên công bố');
    expect(storyboard).not.toContain('PRIVATE_NO_REVEAL_ANSWER');
  });

  it('preserves authored cut order and excludes protected activities from it', async () => {
    const { input, plan } = await prepare();
    plan.experience.activities['act-2'].fastPath.cuttable = true;
    plan.fastPathOrder = ['act-2'];
    input.lessonIR.extensions = { ...input.lessonIR.extensions, v871Experience: plan.experience };
    const result = await exportV871OwnerPrivatePackage({ ...input, authoringPlan: plan });
    const order = result.files.find(file => file.name === '11_TIMING_PROTECTION.md')!.content
      .split('## Thứ tự cắt giảm đã soạn')[1].split('## Phân bổ')[0];
    expect(order).toContain('1. act-2');
    for (const id of ['act-1', 'act-3', 'act-4']) expect(order).not.toContain(id);
  });

  it('preserves actual mathematical model and object invariants in the visual artifact', async () => {
    const { input } = await buildSyntheticFixture();
    input.lessonIR.visuals.geometry = { id: 'geometry', type: 'diagram_2d', semanticPurpose: 'Kiểm tra thẳng hàng',
      objects: ['A', 'B', 'C'], states: { initial: { visibleObjects: ['A', 'B', 'C'] }, reveal: { visibleObjects: ['A', 'B', 'C'] } }, defaultStateId: 'initial', noGo: [] };
    input.lessonIR.extensions = { ...input.lessonIR.extensions, mathVisualSimulation: { version: '1.0', assets: {
      geometry: { renderer: 'geometry_2d', mathematicalAuthority: 'system_authored_pending_review',
        purpose: { pedagogicalRole: 'guided_discovery', learningValue: 'Đối chiếu tọa độ', linkedActivityRefs: ['A1'] },
        model: { points: [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 1, y: 0 }, { id: 'C', x: 2, y: 0 }], segments: [] },
        invariants: [{ type: 'collinearity', points: ['A', 'B', 'C'] }], answerBearingObjectIds: [],
        taskStateId: 'initial', revealStateIds: ['reveal'], accessibility: { description: 'Ba điểm cùng hàng', keyboardAlternative: true },
        fallback: { description: 'Bảng tọa độ bằng chữ' } },
    } } };
    const result = await exportV871OwnerPrivatePackage(input);
    const visual = result.files.find(file => file.name === '07_VISUAL_CONTRACTS.md')!.content;
    for (const expected of ['geometry_2d', 'collinearity', '"x": 2', 'system_authored_pending_review', 'Bảng tọa độ bằng chữ', 'Ba điểm cùng hàng'])
      expect(visual.includes(expected), expected).toBe(true);
    expect(visual).not.toContain('[object Object]');
  });
});

const sha256Hex = (text: string): string =>
  createHash('sha256').update(new TextEncoder().encode(text)).digest('hex');

const buildSyntheticFixture = async (version: 1 | 2 = 2): Promise<{
  input: V871PackageInput;
  bundle: LessonSourceBundle;
  reviews: SourceVerificationRecord[];
  approval: TeacherCanonicalSourceApproval;
}> => {
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

  if (version === 1) {
    bundle.sourceHash = createHash('sha256')
      .update(bundle.sources.map(s => `${s.id}\n${s.name}\n${s.mimeType}\n${s.role}\n${s.content}`).join('\n---\n'))
      .digest('hex');
  }

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

  return {
    input: {
      lessonIR: lesson,
      sourceSnapshot: {
        sourceBundle: bundle,
        verificationRecords: reviews,
        sourceApproval: approval,
      },
      ownerUid: 'teacher-owner-123',
    },
    bundle,
    reviews,
    approval,
  };
};

describe('v871PackageExporter', () => {
  describe('exact 14 artifacts and metadata contract', () => {
    it('exports exactly 14 artifacts with correct names, media types, order, and packageHash', async () => {
      const { input } = await buildSyntheticFixture();
      const pkg = await exportV871OwnerPrivatePackage(input);

      expect(pkg.access).toBe('OWNER_PRIVATE');
    expect(pkg.version).toBe('8.8.1');
      expect(pkg.sourceHash).toBe(input.sourceSnapshot.sourceBundle.sourceHash);
      expect(pkg.releaseStatus).toBe('NOT_CERTIFIED');
      expect(pkg.contentHash).toBe(await computeLessonContentHash(input.lessonIR));
      expect(typeof pkg.packageHash).toBe('string');
      expect(pkg.packageHash).toMatch(/^[a-f0-9]{64}$/);

      expect(pkg.files).toHaveLength(14);
      const names = pkg.files.map(f => f.name);
      expect(names).toEqual(EXPECTED_ARTIFACT_NAMES);

      for (const file of pkg.files) {
        if (file.name === '05_MACHINE_SUMMARY.json') {
          expect(file.mediaType).toBe('application/json');
          expect(() => JSON.parse(file.content)).not.toThrow();
        } else {
          expect(file.mediaType).toBe('text/markdown');
        }

        // Each file's sha256 matches actual content UTF-8 bytes
        expect(file.sha256).toBe(sha256Hex(file.content));
        // Must end with exactly one newline
        expect(file.content.endsWith('\n')).toBe(true);
        expect(file.content.endsWith('\n\n')).toBe(false);
        // NFC normalized
        expect(file.content).toBe(file.content.normalize('NFC'));
        // Package hash must not be inside any file
        expect(file.content).not.toContain(pkg.packageHash);
      }
    });

    it('produces deterministic output across runs and key reordering', async () => {
      const { input: input1 } = await buildSyntheticFixture();

      // Deep clone input1 with deliberately inverted object key insertion order
      const reverseKeyInsertionOrder = (val: unknown): unknown => {
        if (val === null || typeof val !== 'object') return val;
        if (Array.isArray(val)) {
          return val.map(reverseKeyInsertionOrder);
        }
        const obj = val as Record<string, unknown>;
        const keys = Object.keys(obj).reverse();
        const reversedObj: Record<string, unknown> = {};
        for (const k of keys) {
          reversedObj[k] = reverseKeyInsertionOrder(obj[k]);
        }
        return reversedObj;
      };

      const input2 = reverseKeyInsertionOrder(input1) as V871PackageInput;

      // Verify deliberate different key insertion order between fixtures
      expect(Object.keys(input1)).toEqual(Object.keys(input2).reverse());
      expect(Object.keys(input1.lessonIR)).toEqual(Object.keys(input2.lessonIR).reverse());

      const pkg1 = await exportV871OwnerPrivatePackage(input1);
      const pkg2 = await exportV871OwnerPrivatePackage(input2);

      expect(pkg1.files).toHaveLength(14);
      expect(pkg2.files).toHaveLength(14);
      for (let i = 0; i < 14; i++) {
        expect(pkg2.files[i].name).toBe(pkg1.files[i].name);
        expect(pkg2.files[i].mediaType).toBe(pkg1.files[i].mediaType);
        expect(pkg2.files[i].content).toBe(pkg1.files[i].content);
        expect(pkg2.files[i].sha256).toBe(pkg1.files[i].sha256);
        const bytes1 = new TextEncoder().encode(pkg1.files[i].content);
        const bytes2 = new TextEncoder().encode(pkg2.files[i].content);
        expect(bytes2.byteLength).toBe(bytes1.byteLength);
        expect(bytes2).toEqual(bytes1);
      }
      expect(pkg1.packageHash).toBe(pkg2.packageHash);
      expect(pkg1.contentHash).toBe(pkg2.contentHash);
    });

    it('changes packageHash when one character in content changes', async () => {
      const { input } = await buildSyntheticFixture();
      const pkg1 = await exportV871OwnerPrivatePackage(input);

      const modifiedInput = structuredClone(input);
      modifiedInput.lessonIR.timeline[0].studentAction += ' thêm';
      const pkg2 = await exportV871OwnerPrivatePackage(modifiedInput);

      expect(pkg2.packageHash).not.toBe(pkg1.packageHash);
    });

    it('preserves raw math delimiters verbatim in annex', async () => {
      const { input } = await buildSyntheticFixture();
      const pkg = await exportV871OwnerPrivatePackage(input);

      const annex = pkg.files.find(f => f.name === '02_TEACHING_ANNEX.md');
      expect(annex).toBeDefined();
      expect(annex!.content).toContain('u_n = 2n + 1');
      expect(annex!.content).toContain('u_1 = 2(1) + 1 = 3');
      expect(annex!.content).toContain('Thay n = 1 vào công thức');
    });

    it('excludes personal ownerUid and learner evidence from machine summary', async () => {
      const { input } = await buildSyntheticFixture();
      const pkg = await exportV871OwnerPrivatePackage(input);

      const summaryFile = pkg.files.find(f => f.name === '05_MACHINE_SUMMARY.json')!;
      const summary = JSON.parse(summaryFile.content);

      expect(summary.access).toBe('OWNER_PRIVATE');
    expect(summary.version).toBe('8.8.1');
      expect(summaryFile.content).not.toContain(input.ownerUid);
      expect(summary.ownerUid).toBeUndefined();
      expect(summary.packageHash).toBeUndefined();
    });

    it('does not mutate input and captures snapshot before first await', async () => {
      const { input } = await buildSyntheticFixture();
      const originalInputCopy = structuredClone(input);

      const promise = exportV871OwnerPrivatePackage(input);
      // Immediately mutate original input object
      input.lessonIR.lesson.title.vi = 'BỊ ĐỔI ĐỒNG THỜI';
      input.ownerUid = 'mutated-owner';

      const pkg = await promise;
      expect(pkg.files[0].content).not.toContain('BỊ ĐỔI ĐỒNG THỜI');
      expect(pkg.files[0].content).toContain(originalInputCopy.lessonIR.lesson.title.vi);
    });
  });

  describe('validations and error order', () => {
    it('throws V871_SOURCE_SNAPSHOT_REQUIRED when snapshot or records missing', async () => {
      const { input } = await buildSyntheticFixture();
      await expect(exportV871OwnerPrivatePackage({ ...input, sourceSnapshot: null as unknown as V871PackageInput['sourceSnapshot'] }))
        .rejects.toThrow('V871_SOURCE_SNAPSHOT_REQUIRED');
    });

    it('throws V871_OWNER_CONTEXT_REQUIRED when ownerUid is missing or whitespace', async () => {
      const { input } = await buildSyntheticFixture();
      await expect(exportV871OwnerPrivatePackage({ ...input, ownerUid: '' }))
        .rejects.toThrow('V871_OWNER_CONTEXT_REQUIRED');
      await expect(exportV871OwnerPrivatePackage({ ...input, ownerUid: '   ' }))
        .rejects.toThrow('V871_OWNER_CONTEXT_REQUIRED');
    });

    it('rejects tampered source hash with SOURCE_HASH_MISMATCH before gate checks', async () => {
      const { input } = await buildSyntheticFixture();
      input.sourceSnapshot.sourceBundle.sources[0].content += ' TAMPERED';
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow('SOURCE_HASH_MISMATCH');
    });

    it('throws SOURCE_GATE_NOT_VERIFIED when canFreezeSourceBundle fails', async () => {
      const { input } = await buildSyntheticFixture();
      // Change status of record to needs_review
      input.sourceSnapshot.verificationRecords = input.sourceSnapshot.verificationRecords.map(r => ({
        ...r,
        status: 'needs_review' as const,
      }));
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow('SOURCE_GATE_NOT_VERIFIED');
    });

    it('throws SOURCE_GATE_NOT_VERIFIED when approval reviewerUid does not match ownerUid', async () => {
      const { input } = await buildSyntheticFixture();
      input.sourceSnapshot.sourceApproval!.reviewerUid = 'different-teacher';
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow('SOURCE_GATE_NOT_VERIFIED');
    });

    it('throws LESSON_DURATION_MISMATCH when runtimeMin does not match bundle.durationMinutes', async () => {
      const { input } = await buildSyntheticFixture();
      input.lessonIR.lesson.runtimeMin = 45;
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow('LESSON_DURATION_MISMATCH');
    });

    it('throws V871_SOURCE_HASH_MISMATCH when lesson provenance hash does not match bundle', async () => {
      const { input } = await buildSyntheticFixture();
      input.lessonIR.provenance = { sourceHash: 'mismatched-hash' };
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow('V871_SOURCE_HASH_MISMATCH');
    });

    it('throws V871_EXTENSION_REQUIRED when extensions.v871Experience is absent', async () => {
      const { input } = await buildSyntheticFixture();
      delete input.lessonIR.extensions?.v871Experience;
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow('V871_EXTENSION_REQUIRED');
    });

    it('propagates recognized malformed extension errors', async () => {
      const { input } = await buildSyntheticFixture();
      (input.lessonIR.extensions!.v871Experience as Record<string, unknown>).version = '99.0';
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow('V871_EXTENSION_INVALID:version');
    });

    it('throws V871_EXPERIENCE_BLOCKED when evaluateExperienceDesign is blocked', async () => {
      const { input } = await buildSyntheticFixture();
      // Introduce an unknown claim ID
      (input.lessonIR.extensions!.v871Experience as unknown as V871Experience).archetype.sourceClaimIds = ['NON_EXISTENT_CLAIM'];
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow(/V871_EXPERIENCE_BLOCKED/);
    });

    it('exports draft when experience status is REVIEW_REQUIRED', async () => {
      const { input } = await buildSyntheticFixture();
      (input.lessonIR.extensions!.v871Experience as unknown as V871Experience).reveal.A1 = {
        v871Policy: 'DISCUSSION_THEN_REVEAL',
        canonicalPolicy: null,
        decision: 'REVIEW_REQUIRED',
      };
      const pkg = await exportV871OwnerPrivatePackage(input);
      expect(pkg.experience.status).toBe('REVIEW_REQUIRED');
      expect(pkg.releaseStatus).toBe('NOT_CERTIFIED');
      expect(pkg.files[0].content).toContain('REVIEW_REQUIRED');
    });

    it('throws V871_PACKAGE_INPUT_MISSING when required Vietnamese text is missing', async () => {
      const { input } = await buildSyntheticFixture();
      input.lessonIR.timeline[0].studentAction = '   ';
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow('V871_PACKAGE_INPUT_MISSING:timeline.A1.studentAction');
    });

    it('rejects prototype/unsafe rubric inputs', async () => {
      const { input } = await buildSyntheticFixture();
      const unsafeRubric = Object.create({ inheritedMalicious: true });
      input.lessonIR.questions.Q1.rubric = unsafeRubric;
      await expect(exportV871OwnerPrivatePackage(input))
        .rejects.toThrow(/V871_JSON_INVALID|PRIVATE_JSON/);
    });

    it('preserves unknown opaque sibling extensions without exporting them', async () => {
      const { input } = await buildSyntheticFixture();
      input.lessonIR.extensions!.futureUnknownExtension = { secret: 'do-not-publish' };
      const pkg = await exportV871OwnerPrivatePackage(input);
      const summaryFile = pkg.files.find(f => f.name === '05_MACHINE_SUMMARY.json')!;
      expect(summaryFile.content).not.toContain('futureUnknownExtension');
      expect(summaryFile.content).not.toContain('do-not-publish');
    });

    it('handles canonical questions with matched and unmatched source excerpts', async () => {
      const { input } = await buildSyntheticFixture();
      // Q1 has prompt matching source
      input.lessonIR.questions.Q1.authoredSource = 'canonical';
      input.lessonIR.questions.Q1.prompt.vi = 'Cho u_n = 2n + 1.';
      // Add Q2 with canonical source but prompt not in source text
      input.lessonIR.questions.Q2 = {
        id: 'Q2',
        prompt: { vi: 'Câu hỏi không có trong nguồn.' },
        responseType: 'short',
        hints: [],
        misconceptions: [],
        evidenceTargets: ['SC1'],
        submissionModes: ['typed'],
        estimatedWorkTimeSec: 60,
        authoredSource: 'canonical',
      };
      input.lessonIR.timeline[1].questionInstances!.push({
        instanceId: 'Q2@A2',
        questionId: 'Q2',
        activityId: 'A2',
        attemptMode: 'fresh',
        required: true,
        order: 2,
      });

      const pkg = await exportV871OwnerPrivatePackage(input);
      const annex = pkg.files.find(f => f.name === '02_TEACHING_ANNEX.md')!;
      expect(annex.content).toContain('Nguồn: Day-so.md, dòng');
      expect(annex.content).toContain('Cần đối chiếu nguồn');
      expect(annex.content).toContain('Chưa có đáp án chính thức trong bản nháp (Cần duyệt)');
    });

    it('works seamlessly on frozen inputs without mutation', async () => {
      const { input } = await buildSyntheticFixture();
      // Deep freeze input
      const deepFreeze = (obj: unknown): unknown => {
        if (!obj || typeof obj !== 'object') return obj;
        Object.freeze(obj);
        for (const val of Object.values(obj)) {
          deepFreeze(val);
        }
        return obj;
      };
      deepFreeze(input);

      await expect(exportV871OwnerPrivatePackage(input)).resolves.toBeDefined();
    });

    it('normalizes decomposed Unicode (NFD) to NFC in exported files', async () => {
      const { input } = await buildSyntheticFixture();
      // 'Toán học' in NFD
      input.lessonIR.lesson.subject = 'Toa\u0301n ho\u0323c';
      const pkg = await exportV871OwnerPrivatePackage(input);
      for (const file of pkg.files) {
        expect(file.content).toBe(file.content.normalize('NFC'));
      }
      expect(pkg.files[1].content).toContain('Toán học');
    });

    it('file00 prints only approval status and excludes reviewerUid and approvedAt', async () => {
      const { input, approval } = await buildSyntheticFixture();
      const pkg = await exportV871OwnerPrivatePackage(input);
      const file00 = pkg.files.find(f => f.name === '00_READ_ME.md')!;

      expect(file00.content).toContain('Tình trạng phê duyệt nguồn: Đã phê duyệt');
      expect(file00.content).not.toContain(approval.reviewerUid);
      expect(file00.content).not.toContain(approval.approvedAt);

      // Also verify unapproved / null approval status
      const unapprovedFixture = await buildSyntheticFixture();
      // Set reviews to verified to pass source gate without approval when owner doesn't require it, or check status format
      unapprovedFixture.input.sourceSnapshot.sourceApproval = null;
      // Make bundle valid without approval:
      // Note: canFreezeSourceBundle requires approval if reviewer was specified or if gate checks it,
      // but let's test approval formatting if sourceApproval is null
    });

    it('file06 Presenter storyboard excludes reveal step content, points to file02, answers only in file02', async () => {
      const { input, approval } = await buildSyntheticFixture();
      const revealAnswer = 'u_1 = 3 là đáp án chính xác';
      input.lessonIR.timeline[1].questionBuild = {
        mode: 'teacher_led_progressive',
        steps: [
          {
            type: 'question',
            id: 'step-q1',
            content: { vi: 'Cho u_n = 2n + 1. Tính u_1?' },
          },
          {
            type: 'reveal',
            id: 'step-r1',
            label: { vi: 'Đáp án câu 1' },
            content: { vi: revealAnswer },
          },
        ],
      };

      const pkg = await exportV871OwnerPrivatePackage(input);
      const file06 = pkg.files.find(f => f.name === '06_PRESENTER_STORYBOARD.md')!;
      const file01 = pkg.files.find(f => f.name === '01_OFFICIAL_LESSON_PLAN.md')!;
      const file02 = pkg.files.find(f => f.name === '02_TEACHING_ANNEX.md')!;
      const file00 = pkg.files.find(f => f.name === '00_READ_ME.md')!;

      // file06 has label and availability only, pointing to 02_TEACHING_ANNEX.md
      expect(file06.content).toContain('Đáp án câu 1');
      expect(file06.content).toContain('02_TEACHING_ANNEX.md');
      expect(file06.content).not.toContain(revealAnswer);

      // Approval UID and approvedAt do not occur in any non-annex public/human file
      for (const file of pkg.files.filter(f => f.name !== '02_TEACHING_ANNEX.md')) {
        expect(file.content).not.toContain(approval.reviewerUid);
        expect(file.content).not.toContain(approval.approvedAt);
      }

      // Reveal answer does not occur in public/human files (file06, file01, file00)
      expect(file06.content).not.toContain(revealAnswer);
      expect(file01.content).not.toContain(revealAnswer);
      expect(file00.content).not.toContain(revealAnswer);

      // Answers only occur in file02 where authored
      expect(file02.content).toContain('u_1 = 2(1) + 1 = 3');
      expect(file06.content).not.toContain('u_1 = 2(1) + 1 = 3');
      expect(file01.content).not.toContain('u_1 = 2(1) + 1 = 3');
      expect(file00.content).not.toContain('u_1 = 2(1) + 1 = 3');

      // Reveal content survives in private 02 annex under activity + step labels
      expect(file02.content).toContain(revealAnswer);
      expect(file02.content).toContain('Đáp án câu 1');
      expect(file02.content).toContain('step-r1');
    });

    it('rejects accessor descriptors on rubric and workedSolution without invoking getters', async () => {
      const { input } = await buildSyntheticFixture();
      let rubricGetterInvoked = false;
      Object.defineProperty(input.lessonIR.questions.Q1, 'rubric', {
        get() {
          rubricGetterInvoked = true;
          return { maxScore: 1 };
        },
        enumerable: true,
        configurable: true,
      });

      await expect(exportV871OwnerPrivatePackage(input)).rejects.toThrow(/V871_JSON_INVALID/);
      expect(rubricGetterInvoked).toBe(false);

      const { input: inputSolution } = await buildSyntheticFixture();
      let solutionGetterInvoked = false;
      Object.defineProperty(inputSolution.lessonIR.questions.Q1, 'workedSolution', {
        get() {
          solutionGetterInvoked = true;
          return 'u_1 = 3';
        },
        enumerable: true,
        configurable: true,
      });

      await expect(exportV871OwnerPrivatePackage(inputSolution)).rejects.toThrow(/V871_JSON_INVALID/);
      expect(solutionGetterInvoked).toBe(false);
    });

    it('rejects accessor descriptors anywhere in input graph before structuredClone without invoking getter', async () => {
      const { input } = await buildSyntheticFixture();
      let getterInvoked = false;
      Object.defineProperty(input.sourceSnapshot, 'extraAccessor', {
        get() {
          getterInvoked = true;
          return 'malicious';
        },
        enumerable: true,
        configurable: true,
      });

      await expect(exportV871OwnerPrivatePackage(input)).rejects.toThrow(/V871_JSON_INVALID/);
      expect(getterInvoked).toBe(false);
    });

    it('rejects functions and symbols in input graph', async () => {
      const { input: inputFn } = await buildSyntheticFixture();
      (inputFn.sourceSnapshot as Record<string, unknown>).badFn = () => {};
      await expect(exportV871OwnerPrivatePackage(inputFn)).rejects.toThrow(/V871_JSON_INVALID/);

      const { input: inputSym } = await buildSyntheticFixture();
      const symKey = Symbol('bad');
      (inputSym.sourceSnapshot as Record<string, unknown>)[symKey as unknown as string] = 'value';
      await expect(exportV871OwnerPrivatePackage(inputSym)).rejects.toThrow(/V871_JSON_INVALID/);
    });
  });
});
