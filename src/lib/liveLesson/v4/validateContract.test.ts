import { describe, expect, it } from 'vitest';
import { validateV4Contract } from './validateContract';
import type {
  Checkpoint,
  GlossaryItem,
  LiveLessonV4Contract,
  TaskVariant,
  TimelineBlock,
  V4ValidationCode,
} from './types';

// 11 block P00–P40 theo bảng §10 của đặc tả V4 (tổng đúng 2400 giây).
const TIMELINE: ReadonlyArray<[string, number, number, string]> = [
  ['P00', 0, 180, 'S0'],
  ['P03', 180, 300, 'S1'],
  ['P05', 300, 480, 'S2'],
  ['P08', 480, 960, 'S3'],
  ['P16', 960, 1140, 'S4'],
  ['P19', 1140, 1200, 'S5'],
  ['P20', 1200, 1620, 'S6'],
  ['P27', 1620, 1800, 'S7'],
  ['P30', 1800, 2100, 'S8'],
  ['P35', 2100, 2280, 'S9'],
  ['P38', 2280, 2400, 'S10'],
];

function buildTimeline(): TimelineBlock[] {
  return TIMELINE.map(([id, startSeconds, endSeconds, tvScreenId]) => ({
    id,
    label: `Khối ${id}`,
    startSeconds,
    endSeconds,
    teacherScript: `Lời GV ở ${id}`,
    tvScreenId,
  }));
}

function buildGlossary(): GlossaryItem[] {
  return [
    {
      id: 'g-bpt',
      vietnamese: 'bất phương trình bậc nhất hai ẩn',
      translations: { en: 'linear inequality in two variables' },
      plainExplanationVi: 'Ràng buộc dạng ax+by so với c.',
      plainExplanationByLanguage: { en: 'A constraint of the form ax+by compared to c.' },
      notation: 'ax + by ≤ c',
      example: '3x + 2y ≤ 30',
      sourceRef: 'SGK Toán 10 — Cánh Diều',
      reviewer: 'GV Toán',
      version: '1.0',
      status: 'approved',
    },
  ];
}

function buildCheckpoints(): Checkpoint[] {
  return [
    {
      id: 'cp-warmup',
      stepId: 'P03',
      kind: 'in_class',
      prompt: 'Chọn một cặp phương án và nêu căn cứ.',
      responseType: 'choice',
      evidenceSignal: 'HS dự đoán và biện minh ngắn.',
      teacherNextActions: ['Gom 2–3 ý kiến'],
    },
    {
      id: 'cp-ai-error',
      stepId: 'P16',
      kind: 'in_class',
      prompt: 'Chọn loại lỗi của lời giải AI.',
      responseType: 'choice',
      evidenceSignal: 'HS phân loại được lỗi logic.',
      teacherNextActions: ['Chốt thẻ W01'],
    },
    {
      id: 'cp-postcheck',
      stepId: 'P27',
      kind: 'post_check',
      prompt: 'Tự kiểm một điểm/điều kiện với dữ kiện mới.',
      responseType: 'text',
      evidenceSignal: 'Bằng chứng cá nhân để đánh giá lại.',
      teacherNextActions: ['Đọc mẫu vở', 'Ghi nhận tiết sau'],
    },
  ];
}

function buildTaskVariants(): TaskVariant[] {
  const successCriteria = [
    'Xác định đúng miền/điều kiện',
    'Giải thích được vì sao',
    'Kiểm ít nhất một điểm biên',
  ];
  return (['M', 'S', 'C'] as const).map((route) => ({
    id: `task-${route}`,
    route,
    prompt: `Nhiệm vụ tuyến ${route}`,
    scaffoldSetId: `scaffold-${route}`,
    successCriteria: [...successCriteria],
    postCheckId: 'cp-postcheck',
  }));
}

// Hợp đồng hợp lệ, dựng mới mỗi lần gọi để các test mutation độc lập.
function buildValidContract(): LiveLessonV4Contract {
  return {
    schemaVersion: 4,
    id: 'g10_w5_p31_bpt_tiet1_v4',
    lessonId: 'g10-p31',
    title: 'Bất phương trình bậc nhất hai ẩn — Tiết 1',
    durationSeconds: 2400,
    timeline: buildTimeline(),
    objectives: {
      math: [{ id: 'm1', kind: 'math', text: 'Mô tả miền nghiệm bằng bất phương trình.' }],
      language: [{ id: 'l1', kind: 'language', text: 'Dùng đúng từ khóa miền nghiệm, đường biên.' }],
      studentGoalPrompt: 'Một điều em muốn tự làm được cuối tiết là gì?',
      teacherSynthesisPrompt: 'Câu hỏi chung của chúng ta là…',
    },
    languageDemands: [
      { stepId: 'P05', terms: ['miền nghiệm', 'đường biên'], sentenceFrames: ['Điểm ___ thuộc miền vì ___.'] },
    ],
    glossary: buildGlossary(),
    curriculumBridges: [
      {
        id: 'bridge-halfplane',
        priorNotation: 'half-plane',
        vietnameseEquivalent: 'nửa mặt phẳng / miền nghiệm',
        example: '3x + 2y ≤ 30 cho nửa mặt phẳng chứa gốc.',
        nonExample: 'Đường biên không tự động thuộc miền khi dấu là <.',
        selfCheckQuestion: 'Điểm (0;0) có thuộc miền nghiệm không?',
      },
    ],
    scaffoldSets: (['M', 'S', 'C'] as const).map((route) => ({
      id: `scaffold-${route}`,
      route,
      hints: [`Gợi ý 1 tuyến ${route}`, `Gợi ý 2 tuyến ${route}`],
    })),
    fading: [{ stepId: 'P20', maxHints: 1 }],
    evidenceRules: [{ id: 'er-1', sourceStepId: 'P16', dimension: 'reasoning', minConfidence: 0.6 }],
    checkpoints: buildCheckpoints(),
    taskVariants: buildTaskVariants(),
    groupingCheckpoints: [
      {
        id: 'grp-1',
        stepId: 'P19',
        purpose: 'same_need_workshop',
        minGroupSize: 3,
        maxGroupSize: 4,
        sharedQuestion: 'Mô tả điều kiện của mọi phương án phù hợp.',
        rubric: ['Xác định đúng miền', 'Giải thích vì sao'],
        postCheckId: 'cp-postcheck',
      },
    ],
    aiError: {
      id: 'ai-w01',
      stepId: 'P16',
      category: 'Logical',
      faultyStatement: '160 ≤ 150 nên (6;7) là nghiệm.',
      correction: '160 > 150 nên (6;7) không là nghiệm.',
      proof: 'Thay (6;7): 15·6 + 10·7 = 160 > 150.',
    },
    projections: {
      teacher: { fields: ['cueId', 'teacherScript', 'evidence', 'groupProposal'] },
      tv: {
        screenIds: ['S0', 'S4', 'S8'],
        fields: ['cueId', 'screenId', 'status', 'showStats', 'participantCount', 'routeCounts'],
        maxStatCards: 4,
      },
      student: { fields: ['task', 'glossary', 'ownResponse'] },
    },
    offline: {
      tvCuesIncluded: true,
      glossaryPrintIncluded: true,
      boardPlanIncluded: true,
      aiErrorAnswerKeyIncluded: true,
      routeCards: ['M', 'S', 'C'],
      manualGroupingSheet: true,
      paperExitTicket: true,
    },
    publication: {
      glossaryApproved: true,
      aiErrorReviewed: true,
      offlineReady: true,
      reviewedBy: 'GV Toán',
    },
    version: '2026-08-27',
  };
}

function codes(contract: LiveLessonV4Contract): V4ValidationCode[] {
  return validateV4Contract(contract).errors.map((e) => e.code);
}

describe('validateV4Contract', () => {
  it('chấp nhận hợp đồng pilot hợp lệ', () => {
    const result = validateV4Contract(buildValidContract());
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('bắt schemaVersion sai', () => {
    const contract = buildValidContract();
    (contract as { schemaVersion: number }).schemaVersion = 3;
    expect(codes(contract)).toContain('SCHEMA_VERSION_INVALID');
  });

  it('bắt thiếu block timeline (tổng ≠ 2400)', () => {
    const contract = buildValidContract();
    contract.timeline = contract.timeline.slice(0, -1); // bỏ P38–P40
    const result = validateV4Contract(contract);
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('TIMELINE_NOT_2400');
  });

  it('bắt chồng lấn/hở khi một block bị lệch mốc thời gian', () => {
    const contract = buildValidContract();
    contract.timeline[4].startSeconds = 900; // P16 lệch, tạo chồng lấn với P08
    expect(codes(contract)).toContain('TIMELINE_NOT_2400');
  });

  it('bắt trùng step id', () => {
    const contract = buildValidContract();
    contract.timeline[1].id = 'P00'; // trùng với block đầu
    expect(codes(contract)).toContain('DUPLICATE_STEP_ID');
  });

  it('bắt checkpoint không có bằng chứng', () => {
    const contract = buildValidContract();
    contract.checkpoints[0].evidenceSignal = '   ';
    expect(codes(contract)).toContain('CHECKPOINT_MISSING_EVIDENCE');
  });

  it('bắt task variant thiếu tiêu chí thành công', () => {
    const contract = buildValidContract();
    contract.taskVariants[0].successCriteria = [];
    expect(codes(contract)).toContain('TASK_VARIANT_MISSING_SUCCESS_CRITERIA');
  });

  it('bắt task không có post-check hợp lệ', () => {
    const contract = buildValidContract();
    contract.taskVariants[1].postCheckId = 'khong-ton-tai';
    expect(codes(contract)).toContain('MISSING_POST_CHECK');
  });

  it('bắt glossary chưa duyệt', () => {
    const contract = buildValidContract();
    contract.glossary[0].status = 'draft';
    expect(codes(contract)).toContain('UNAPPROVED_GLOSSARY');
  });

  it('bắt glossary thiếu metadata nguồn/người duyệt', () => {
    const contract = buildValidContract();
    contract.glossary[0].reviewer = '';
    expect(codes(contract)).toContain('GLOSSARY_MISSING_METADATA');
  });

  it('bắt projection TV chứa field riêng tư', () => {
    const contract = buildValidContract();
    contract.projections.tv.fields = [...contract.projections.tv.fields, 'studentId'];
    expect(codes(contract)).toContain('TV_PRIVATE_FIELD');
  });

  it('bắt gói offline thiếu thành phần', () => {
    const contract = buildValidContract();
    contract.offline.paperExitTicket = false;
    contract.offline.routeCards = ['M', 'S']; // thiếu tuyến C
    const result = validateV4Contract(contract);
    expect(result.errors.map((e) => e.code)).toContain('OFFLINE_PACK_INCOMPLETE');
  });

  it('bắt source content có shape sai mà không làm validator throw', () => {
    const contract = buildValidContract();
    (contract as unknown as { sourceContent: unknown }).sourceContent = {
      examples: [],
      exercises: 'not-an-array',
      quickChecks: [],
      mistakes: [],
    };
    expect(() => validateV4Contract(contract)).not.toThrow();
    expect(codes(contract)).toContain('SOURCE_CONTENT_INVALID');
  });

  it('bắt choice policy malformed mà không đọc thuộc tính trên undefined', () => {
    const contract = buildValidContract();
    contract.selfChoice = true;
    (contract as unknown as { choicePolicy: unknown }).choicePolicy = {
      enabled: true,
      allowedRoutes: undefined,
    };
    expect(() => validateV4Contract(contract)).not.toThrow();
    expect(codes(contract)).toContain('CHOICE_POLICY_INVALID');
  });
});
