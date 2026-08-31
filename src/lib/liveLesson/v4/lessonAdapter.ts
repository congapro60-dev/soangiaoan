import snapshotText from '../../../data/liveLessonPackages/banToan-w5-w6.snapshot.json?raw';
import type {
  AiErrorOfTheWeek,
  Checkpoint,
  CurriculumBridge,
  EvidenceRule,
  GlossaryItem,
  LanguageDemand,
  LiveLessonV4Contract,
  Objective,
  ScaffoldSet,
  TaskVariant,
  TimelineBlock,
  V4SourceContent,
  V4LessonMode,
  V4Route,
} from './types';

type SourceLessonKind = 'formation' | 'practice';
type SourceExerciseLevel = 'NB' | 'TH' | 'VD';

interface SourceExample {
  question: string;
  solution: string;
  sourceRef?: string;
}

interface SourceExercise {
  level: SourceExerciseLevel;
  question: string;
  answer: string;
  sourceRef?: string;
}

interface SourceLessonSpec {
  key: string;
  grade: number;
  week: number;
  period: number;
  lessonSequence?: number;
  kind: SourceLessonKind;
  selfChoice: boolean;
  title: string;
  focus: string;
  formulas: string[];
  examples: SourceExample[];
  exercises: SourceExercise[];
  quick: SourceExample[];
  mistakes: string[];
  guidingQuestion?: string;
  languageObjective?: string;
  globalCompetency?: string;
  digitalCompetency?: string;
  boardPlan?: Array<{ section: string; content: string; phase?: string; persistent?: boolean }>;
  screenPlan?: {
    teacher: string;
    student: string;
    activities?: Array<{ phase: string; teacher: string; student: string; prompt: string; tv: string; fallback: string }>;
  };
  languageSupport?: {
    coreTerms: string[];
    languageObjective: string;
    frames: string[];
    motherTongueBridge: string;
    fading: string;
  };
}

type SourceScreenActivity = NonNullable<NonNullable<SourceLessonSpec['screenPlan']>['activities']>[number];

interface SourceAiError {
  key: string;
  category: 'Lỗi khái niệm' | 'Lỗi đại số' | 'Lỗi logic' | 'Thiếu điều kiện';
  wrongSolution: string;
  correction: string;
  proof: string;
  whyAiError: string;
  teacherPrompt: string;
  studentProduct: string;
  boardPrompt: string;
  libraryTitle: string;
}

interface SourceSnapshot {
  schemaVersion: 1;
  generatedAt: string;
  source: { directoryHint: string; files: Record<string, string>; fingerprint: string };
  lessonSpecs: SourceLessonSpec[];
  aiErrors: Record<string, SourceAiError>;
}

export interface BanToanV4PackageMetadata {
  packageId: string;
  sourceKey: string;
  title: string;
  grade: number;
  week: number;
  period: number;
  kind: SourceLessonKind;
  selfChoice: boolean;
  lessonMode: V4LessonMode;
  sourceFingerprint: string;
  releaseStatus: 'candidate';
}

const TIMELINE: ReadonlyArray<readonly [string, number, number, string, string]> = [
  ['P00', 0, 180, 'S0', 'opening'],
  ['P03', 180, 300, 'S1', 'guidingQuestion'],
  ['P05', 300, 480, 'S2', 'goals'],
  ['P08', 480, 960, 'S3', 'knowledgeCycle'],
  ['P16', 960, 1140, 'S4', 'aiError'],
  ['P19', 1140, 1200, 'S5', 'grouping'],
  ['P20', 1200, 1620, 'S6', 'differentiatedPractice'],
  ['P27', 1620, 1800, 'S7', 'postCheck'],
  ['P30', 1800, 2100, 'S8', 'quickCheck'],
  ['P35', 2100, 2280, 'S9', 'summary'],
  ['P38', 2280, 2400, 'S10', 'exitTicket'],
];

const TERM_LIBRARY: ReadonlyArray<{
  id: string;
  vietnamese: string;
  translations: { en: string; ja: string; ko: string; zh: string };
  explanation: string;
}> = [
  { id: 'du-kien', vietnamese: 'dữ kiện', translations: { en: 'given information', ja: '与えられた情報', ko: '주어진 정보', zh: '已知条件' }, explanation: 'Thông tin đã cho trong đề hoặc tình huống.' },
  { id: 'dieu-kien', vietnamese: 'điều kiện', translations: { en: 'condition', ja: '条件', ko: '조건', zh: '条件' }, explanation: 'Điều phải được giữ đúng khi giải hoặc mô hình hóa.' },
  { id: 'lap-luan', vietnamese: 'lập luận', translations: { en: 'reasoning', ja: '推論', ko: '추론', zh: '推理' }, explanation: 'Chuỗi lý do nối dữ kiện, phép làm và kết luận.' },
  { id: 'phep-kiem', vietnamese: 'phép kiểm', translations: { en: 'verification', ja: '検証', ko: '검증', zh: '验证' }, explanation: 'Cách thử độc lập để biết kết quả hoặc kết luận có đúng không.' },
  { id: 'nghiem', vietnamese: 'nghiệm', translations: { en: 'solution', ja: '解', ko: '해', zh: '解' }, explanation: 'Giá trị hoặc đối tượng làm mệnh đề/toán tử cần xét trở thành đúng.' },
  { id: 'ket-luan', vietnamese: 'kết luận', translations: { en: 'conclusion', ja: '結論', ko: '결론', zh: '结论' }, explanation: 'Điều được khẳng định sau khi dựa trên dữ kiện và lập luận.' },
  { id: 'cong-thuc', vietnamese: 'công thức', translations: { en: 'formula', ja: '公式', ko: '공식', zh: '公式' }, explanation: 'Biểu thức khái quát dùng để tính hoặc suy luận.' },
];

function parseSnapshot(): SourceSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(snapshotText) as unknown;
  } catch {
    throw new Error('Không đọc được snapshot Ban Toán W5–W6.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Snapshot Ban Toán không hợp lệ.');
  const snapshot = parsed as Partial<SourceSnapshot>;
  if (snapshot.schemaVersion !== 1
    || !snapshot.source?.fingerprint
    || !Array.isArray(snapshot.lessonSpecs)
    || snapshot.lessonSpecs.length !== 48
    || !snapshot.aiErrors) {
    throw new Error('Snapshot Ban Toán phải có schema 1, 48 bài và AI error tương ứng.');
  }
  const seen = new Set<string>();
  for (const spec of snapshot.lessonSpecs) {
    if (!spec.key || seen.has(spec.key)) throw new Error(`Snapshot có key trùng hoặc rỗng: ${spec.key}.`);
    seen.add(spec.key);
    if (spec.examples?.length !== 2 || spec.exercises?.length !== 6 || spec.quick?.length !== 2) {
      throw new Error(`Snapshot sai số lượng nội dung ở ${spec.key}.`);
    }
    if (!snapshot.aiErrors[spec.key]) throw new Error(`Snapshot thiếu AI error ở ${spec.key}.`);
  }
  return snapshot as SourceSnapshot;
}

const SNAPSHOT = parseSnapshot();
const SPECS_BY_KEY = new Map(SNAPSHOT.lessonSpecs.map((spec) => [spec.key, spec]));

/** Tên hiển thị ngắn, cùng kiểu với bài demo; sourceKey vẫn là định danh kỹ thuật. */
export function getBanToanV4DisplayTitle(sourceKey: string): string {
  const spec = SPECS_BY_KEY.get(sourceKey);
  if (!spec) throw new Error(`Không tìm thấy sourceKey Ban Toán: ${sourceKey}.`);
  const sequence = SNAPSHOT.lessonSpecs
    .filter((item) => item.grade === spec.grade && item.week === spec.week)
    .sort((left, right) => left.period - right.period)
    .findIndex((item) => item.key === sourceKey);
  return `${spec.title} — Tiết ${sequence + 1}`;
}

function modeFor(spec: SourceLessonSpec): V4LessonMode {
  return spec.selfChoice ? 'elective-practice' : spec.kind;
}

function packageIdFor(spec: SourceLessonSpec): string {
  return `g${spec.grade}_w${spec.week}_p${spec.period}_v4`;
}

function aiErrorCategory(category: SourceAiError['category']): AiErrorOfTheWeek['category'] {
  const map: Record<SourceAiError['category'], AiErrorOfTheWeek['category']> = {
    'Lỗi khái niệm': 'Conceptual',
    'Lỗi đại số': 'Algebraic',
    'Lỗi logic': 'Logical',
    'Thiếu điều kiện': 'Missing condition',
  };
  return map[category];
}

function activityFor(spec: SourceLessonSpec, phase: string): SourceScreenActivity | undefined {
  return spec.screenPlan?.activities?.find((activity) => activity.phase === phase);
}

function boardTextFor(spec: SourceLessonSpec, section: string, phase: string | undefined, fallback: string): string {
  const rows = (spec.boardPlan ?? [])
    .filter((item) => item.section === section && (!phase || !item.phase || item.phase === phase))
    .map((item) => item.content.trim())
    .filter(Boolean);
  return rows.length > 0 ? rows.slice(0, 4).join('\n') : fallback;
}

function sourceExerciseFor(spec: SourceLessonSpec, level: SourceExerciseLevel, index: number): SourceExercise {
  return spec.exercises.find((exercise) => exercise.level === level) ?? spec.exercises[index] ?? spec.exercises[0];
}

function commonSuccessCriteria(spec: SourceLessonSpec): string[] {
  return [
    `Xác định đúng công cụ hoặc điều kiện cần dùng cho ${spec.focus}.`,
    'Trình bày ít nhất một bước có căn cứ bằng ký hiệu, hình hoặc lời nói.',
    'Kiểm tra kết quả bằng phép thử, trường hợp đặc biệt hoặc điều kiện của đề.',
  ];
}

function buildSourceContent(spec: SourceLessonSpec): V4SourceContent {
  return {
    formulas: spec.formulas.map((formula) => formula.trim()).filter(Boolean),
    examples: spec.examples.map((example, index) => ({
      question: example.question,
      solution: example.solution,
      sourceRef: example.sourceRef ?? `ban-toan:${spec.key}:example-${index + 1}`,
    })),
    exercises: spec.exercises.map((exercise, index) => ({
      level: exercise.level,
      question: exercise.question,
      answer: exercise.answer,
      sourceRef: exercise.sourceRef ?? `ban-toan:${spec.key}:exercise-${index + 1}`,
    })),
    quickChecks: spec.quick.map((quick, index) => ({
      question: quick.question,
      solution: quick.solution,
      sourceRef: quick.sourceRef ?? `ban-toan:${spec.key}:quick-${index + 1}`,
    })),
    mistakes: [...spec.mistakes],
  };
}

function buildGlossary(spec: SourceLessonSpec): GlossaryItem[] {
  const requested = new Set(['dữ kiện', 'điều kiện', 'lập luận', 'phép kiểm', 'nghiệm', 'kết luận', 'công thức']);
  for (const term of spec.languageSupport?.coreTerms ?? []) {
    const normalized = term.toLowerCase();
    for (const item of TERM_LIBRARY) if (normalized.includes(item.vietnamese)) requested.add(item.vietnamese);
  }
  return TERM_LIBRARY
    .filter((item) => requested.has(item.vietnamese))
    .map((item) => ({
      id: item.id,
      vietnamese: item.vietnamese,
      translations: item.translations,
      plainExplanationVi: item.explanation,
      plainExplanationByLanguage: {
        en: item.explanation,
        ja: item.explanation,
        ko: item.explanation,
        zh: item.explanation,
      },
      sourceRef: `ban-toan:${spec.key}:glossary-baseline`,
      reviewer: 'v4-source-structure-review',
      version: '2026-08-30',
      status: 'approved',
    }));
}

function buildTimeline(spec: SourceLessonSpec, error: SourceAiError, postCheckId: string): TimelineBlock[] {
  return TIMELINE.map(([id, startSeconds, endSeconds, tvScreenId, phase]) => {
    const activity = activityFor(spec, phase);
    const phaseLabel = phase === 'aiError' ? 'THINK → AI → VERIFY' : phase;
    const teacherScript = phase === 'aiError'
      ? `${error.teacherPrompt} ${error.studentProduct}`
      : activity?.teacher ?? spec.screenPlan?.teacher ?? `GV dẫn dắt hoạt động ${phaseLabel} cho ${spec.focus}.`;
    const studentAction = phase === 'aiError'
      ? 'Dự đoán trước, tìm lỗi, phân loại, sửa và chứng minh vào vở; sau đó trao đổi với bạn.'
      : activity?.student ?? spec.screenPlan?.student ?? `HS thực hiện ${phaseLabel}, nói căn cứ và ghi bằng chứng ngắn.`;
    const boardLarge = phase === 'aiError'
      ? boardTextFor(spec, 'BẢNG LỚN', undefined, error.boardPrompt)
      : boardTextFor(spec, 'BẢNG LỚN', phase, phase === 'goals' ? 'MỤC TIÊU CHUNG DO LỚP TỔNG HỢP' : spec.focus);
    const boardSide = phase === 'aiError'
      ? boardTextFor(spec, 'BẢNG PHỤ', undefined, error.boardPrompt)
      : boardTextFor(spec, 'BẢNG PHỤ', phase, phase === 'goals' ? 'CÂU HỎI ĐỊNH HƯỚNG\nMỤC TIÊU CỦA HS' : 'TỪ KHÓA / KHUNG CÂU');
    let checkpointId: string | undefined;
    if (id === 'P03') checkpointId = 'cp-guiding-question';
    if (id === 'P05') checkpointId = 'cp-student-goal';
    if (id === 'P08') checkpointId = 'cp-diagnostic';
    if (id === 'P16') checkpointId = 'cp-ai-error';
    if (id === 'P19') checkpointId = 'cp-route-choice';
    if (id === 'P20') checkpointId = 'cp-group-product';
    if (id === 'P27') checkpointId = postCheckId;
    if (id === 'P30') checkpointId = 'cp-quick-check';
    if (id === 'P38') checkpointId = 'cp-exit-ticket';
    return {
      id,
      label: `${id} · ${phaseLabel}`,
      startSeconds,
      endSeconds,
      teacherScript,
      tvScreenId,
      studentAction,
      boardLarge,
      boardSide,
      checkpointId,
    };
  });
}

function buildScreens(spec: SourceLessonSpec, error: SourceAiError): { tv: LiveLessonV4Contract['projections']['tv']; screens: Array<{ id: string; title: string; body: string }>; studentScreens: Array<{ id: string; label: string; action: string }> } {
  const screens = [
    ['S0', 'BẮT ĐẦU KHI SẴN SÀNG', `Hôm nay: ${spec.title}\nQuan sát tình huống và đặt câu hỏi. Chưa cần biết đáp án.`],
    ['S1', 'CÂU HỎI ĐỊNH HƯỚNG', spec.guidingQuestion ?? `Làm thế nào giải thích được ${spec.focus}?`],
    ['S2', 'MỤC TIÊU DO LỚP TỔNG HỢP', 'Mỗi HS chọn mục tiêu và minh chứng phù hợp; GV tổng hợp mục tiêu chung.'],
    ['S3', 'CÔNG CỤ TOÁN HỌC', spec.formulas.slice(0, 3).join('\n') || spec.focus],
    ['S4', 'THINK → AI → VERIFY', `${error.wrongSolution}\n\nTìm lỗi · phân loại · sửa · chứng minh.`],
    ['S5', 'CÂU HỎI NHÓM', `Cùng kiểm chứng: ${spec.focus}\nKhông công khai nhãn năng lực.`],
    ['S6', 'NHIỆM VỤ CÓ LỰA CHỌN', 'M — Củng cố · S — Chuẩn · C — Thử thách\nTiêu chí đích đến giống nhau.'],
    ['S7', 'POST-CHECK CÁ NHÂN', 'Mỗi HS tự làm một dữ kiện mới; không nhận câu trả lời thay từ nhóm.'],
    ['S8', 'KIỂM TRA NHANH', (spec.quick ?? []).map((item, index) => `${index + 1}. ${item.question}`).join('\n')],
    ['S9', 'ĐỐI CHIẾU MỤC TIÊU', 'Em đã có bằng chứng nào? Điều gì cần kiểm chứng tiếp?'],
    ['S10', 'EXIT TICKET', `Viết một kết luận có căn cứ về ${spec.focus}.`],
  ].map(([id, title, body]) => ({ id, title, body }));
  const studentScreens = [
    ['HS0', 'Sẵn sàng', 'Đọc tình huống; chưa cần gửi đáp án.'],
    ['HS1', 'Câu hỏi định hướng', 'Chọn hoặc viết điều em muốn biết.'],
    ['HS2', 'Mục tiêu cá nhân', 'Chọn 1–2 mục tiêu và minh chứng.'],
    ['HS3', 'Hình thành', 'Trả lời ngắn; mở glossary khi cần.'],
    ['HS4', 'AI Error', 'Tìm lỗi, sửa và chứng minh vào vở.'],
    ['HS5', 'Nhóm', 'Nhận câu hỏi chung; thiết bị đặt xuống khi trao đổi.'],
    ['HS6', 'Tuyến M/S/C', 'Tự chọn cửa vào; có thể đổi tuyến.'],
    ['HS7', 'Post-check', 'Tự giải dữ kiện mới và gửi bằng chứng cá nhân.'],
    ['HS8', 'Quick check', 'Trả lời nhanh rồi sửa một lỗi nếu có.'],
    ['HS9', 'Tự đánh giá', 'Đối chiếu mục tiêu và sản phẩm.'],
    ['HS10', 'Exit ticket', 'Viết kết luận có căn cứ.'],
  ].map(([id, label, action]) => ({ id, label, action }));
  return {
    tv: {
      screenIds: screens.map((screen) => screen.id),
      fields: ['cueId', 'screenId', 'status', 'showStats', 'participantCount', 'submittedCount', 'routeCounts', 'errorCategoryCounts', 'groupProgress', 'updatedAt'],
      maxStatCards: 4,
    },
    screens,
    studentScreens,
  };
}

function buildContract(spec: SourceLessonSpec): LiveLessonV4Contract {
  const error = SNAPSHOT.aiErrors[spec.key];
  const postCheckId = 'cp-post-check';
  const successCriteria = commonSuccessCriteria(spec);
  const screens = buildScreens(spec, error);
  const taskVariants: TaskVariant[] = (['M', 'S', 'C'] as const).map((route, index) => {
    const level: SourceExerciseLevel = route === 'M' ? 'NB' : route === 'S' ? 'TH' : 'VD';
    const exercise = sourceExerciseFor(spec, level, index);
    return {
      id: `task-${route.toLowerCase()}`,
      route,
      prompt: exercise.question,
      scaffoldSetId: `scaffold-${route.toLowerCase()}`,
      successCriteria: [...successCriteria],
      postCheckId,
      extension: route === 'C' ? spec.examples[1]?.question : undefined,
    };
  });
  const scaffoldSets: ScaffoldSet[] = (['M', 'S', 'C'] as const).map((route) => ({
    id: `scaffold-${route.toLowerCase()}`,
    route,
    hints: route === 'M'
      ? ['Đọc lại dữ kiện và khoanh đại lượng cần tìm.', 'Viết một bước theo khung câu trước khi tính.']
      : route === 'S'
        ? ['Nêu công cụ/công thức và lý do chọn.', 'Kiểm tra một trường hợp hoặc điều kiện sau khi làm.']
        : ['Tìm một phản ví dụ hoặc điều kiện biên.', 'Giải thích vì sao cách làm vẫn đúng khi dữ kiện thay đổi.'],
    sentenceFrames: spec.languageSupport?.frames?.slice(0, 2),
    glossaryRefs: TERM_LIBRARY.map((item) => item.id),
  }));
  const aiError: AiErrorOfTheWeek = {
    id: `ai-error-${spec.key}`,
    stepId: 'P16',
    category: aiErrorCategory(error.category),
    faultyStatement: error.wrongSolution,
    correction: error.correction,
    proof: error.proof,
  };
  const mathObjectives: Objective[] = [
    { id: 'math-1', kind: 'math', text: `Nhận diện dữ kiện và công cụ cần dùng trong ${spec.focus}.` },
    { id: 'math-2', kind: 'math', text: `Vận dụng kiến thức để giải quyết một nhiệm vụ về ${spec.focus}.` },
    { id: 'math-3', kind: 'math', text: 'Kiểm chứng kết quả và giải thích kết luận bằng căn cứ.' },
  ];
  const languageDemands: LanguageDemand[] = [
    { stepId: 'P03', terms: ['dữ kiện', 'điều kiện'], sentenceFrames: spec.languageSupport?.frames?.slice(0, 2) ?? ['Em nhận thấy ___ vì ___.'] },
    { stepId: 'P16', terms: ['lập luận', 'phép kiểm'], sentenceFrames: ['Bước ___ chưa đúng vì ___.', 'Em kiểm chứng bằng ___.'] },
    { stepId: 'P27', terms: ['nghiệm', 'kết luận'], sentenceFrames: ['Kết quả ___ đúng/sai vì ___.'] },
  ];
  const checkpoints: Checkpoint[] = [
    { id: 'cp-guiding-question', stepId: 'P03', kind: 'in_class', prompt: spec.guidingQuestion ?? `Câu hỏi nào giúp giải thích ${spec.focus}?`, responseType: 'text', evidenceSignal: 'HS nêu một câu hỏi hoặc điều muốn biết gắn với nội dung Toán.', teacherNextActions: ['Chọn 2–3 câu hỏi để tổng hợp thành câu hỏi chung.'] },
    { id: 'cp-student-goal', stepId: 'P05', kind: 'in_class', prompt: 'Em muốn tự làm được điều gì và sẽ chứng minh bằng sản phẩm nào?', responseType: 'choice', evidenceSignal: 'HS chọn mục tiêu cá nhân và minh chứng, không bắt buộc giống nhau.', teacherNextActions: ['Tổng hợp mục tiêu chung trên bảng phụ.'] },
    { id: 'cp-diagnostic', stepId: 'P08', kind: 'in_class', prompt: `Chọn công cụ/bước đầu tiên để xử lý ${spec.focus}.`, responseType: 'choice', evidenceSignal: 'Tín hiệu điểm xuất phát về khái niệm hoặc quy trình.', teacherNextActions: ['Đọc thống kê ẩn danh và chọn scaffold.'] },
    { id: 'cp-ai-error', stepId: 'P16', kind: 'in_class', prompt: error.teacherPrompt, responseType: 'text', evidenceSignal: 'HS phân loại lỗi, sửa lời giải và nêu phép chứng minh.', teacherNextActions: ['Ghi thẻ lỗi vào thư viện AI Error; hỏi vì sao AI có thể mắc lỗi.'] },
    { id: 'cp-route-choice', stepId: 'P19', kind: 'in_class', prompt: 'Chọn cửa vào M/S/C phù hợp với bằng chứng hiện tại; em có thể đổi tuyến.', responseType: 'route', evidenceSignal: 'HS tự chọn tuyến theo nhu cầu hiện tại, không bị gắn nhãn năng lực.', teacherNextActions: ['Đọc thống kê ẩn danh và duyệt đề xuất nhóm trước khi giao nhiệm vụ.'] },
    { id: 'cp-group-product', stepId: 'P20', kind: 'in_class', prompt: `Cùng giải thích và kiểm chứng ${spec.focus} bằng sản phẩm nhóm.`, responseType: 'text', evidenceSignal: 'Sản phẩm nhóm có bước làm, lý do và phép kiểm; không thay post-check cá nhân.', teacherNextActions: ['Duyệt/đổi đề xuất nhóm theo evidence; mời một nhóm giải thích.'] },
    { id: postCheckId, stepId: 'P27', kind: 'post_check', prompt: `Với dữ kiện mới, hãy tự giải một nhiệm vụ ngắn về ${spec.focus} và nêu căn cứ.`, responseType: 'text', evidenceSignal: 'Sản phẩm cá nhân sau can thiệp để đánh giá lại skill gap.', teacherNextActions: ['Đối chiếu tiêu chí chung và ghi bước hỗ trợ tiết sau.'] },
    { id: 'cp-quick-check', stepId: 'P30', kind: 'in_class', prompt: 'Trả lời nhanh rồi sửa một lỗi nếu phát hiện.', responseType: 'choice', evidenceSignal: 'Tỷ lệ đúng và loại lỗi sau luyện tập.', teacherNextActions: ['Chọn một lỗi chung để chốt, không công khai cá nhân.'] },
    { id: 'cp-exit-ticket', stepId: 'P38', kind: 'post_check', prompt: `Viết một kết luận có căn cứ về ${spec.focus}.`, responseType: 'exit_ticket', evidenceSignal: 'Exit ticket nối mục tiêu cá nhân với bằng chứng cuối tiết.', teacherNextActions: ['Lưu bằng chứng cho tiết sau hoặc phản hồi ngắn.'] },
  ];
  const routePolicy = {
    enabled: spec.selfChoice,
    prompt: 'Chọn cửa vào phù hợp với bằng chứng hiện tại; đây không phải nhãn năng lực và có thể đổi tuyến.',
    allowedRoutes: ['M', 'S', 'C'] as V4Route[],
    commonSuccessCriteria: [...successCriteria],
    commonPostCheckId: postCheckId,
  };
  return {
    schemaVersion: 4,
    id: packageIdFor(spec),
    lessonId: packageIdFor(spec),
    title: spec.title,
    durationSeconds: 2400,
    lessonMode: modeFor(spec),
    sourceKey: spec.key,
    sourceFingerprint: SNAPSHOT.source.fingerprint,
    source: {
      sourceKey: spec.key,
      grade: spec.grade,
      week: spec.week,
      period: spec.period,
      kind: spec.kind,
      selfChoice: spec.selfChoice,
      sourceFingerprint: SNAPSHOT.source.fingerprint,
      sourceRef: `ban-toan-rebuild:${spec.key}`,
    },
    sourceContent: buildSourceContent(spec),
    selfChoice: spec.selfChoice,
    choicePolicy: routePolicy,
    timeline: buildTimeline(spec, error, postCheckId),
    objectives: {
      math: mathObjectives,
      language: [{ id: 'language-1', kind: 'language', text: spec.languageObjective ?? spec.languageSupport?.languageObjective ?? 'Dùng từ khóa Toán học và nêu kết luận có căn cứ.' }],
      studentGoalPrompt: 'Em muốn sau tiết học mình làm được điều gì? Em sẽ dùng bằng chứng nào?',
      teacherSynthesisPrompt: spec.guidingQuestion ?? `Câu hỏi chung: làm thế nào giải thích và kiểm chứng ${spec.focus}?`,
    },
    languageDemands,
    glossary: buildGlossary(spec),
    curriculumBridges: [{
      id: `bridge-${spec.key}`,
      priorNotation: 'Ký hiệu/thuật ngữ HS đã gặp ở chương trước hoặc chương trình khác',
      vietnameseEquivalent: spec.focus,
      example: spec.formulas[0] ?? spec.examples[0].question,
      nonExample: 'Một kết quả không có điều kiện hoặc không có phép kiểm chưa đủ để kết luận.',
      selfCheckQuestion: 'Em có thể nói lại dữ kiện, công cụ và điều kiện bằng lời của mình không?',
    } satisfies CurriculumBridge],
    scaffoldSets,
    fading: [
      { stepId: 'P20', maxHints: 2, note: spec.languageSupport?.fading ?? 'Giảm dần gợi ý sau khi HS nêu được bước có căn cứ.' },
      { stepId: 'P27', maxHints: 1, note: 'Post-check cá nhân chỉ mở tối đa một gợi ý ngắn.' },
    ],
    evidenceRules: [
      { id: 'evidence-diagnostic', sourceStepId: 'P08', dimension: 'concept', minConfidence: 0.6 },
      { id: 'evidence-ai-error', sourceStepId: 'P16', dimension: 'reasoning', minConfidence: 0.6 },
      { id: 'evidence-group', sourceStepId: 'P20', dimension: 'autonomyCollaboration', minConfidence: 0.6 },
      { id: 'evidence-post-check', sourceStepId: 'P27', dimension: 'procedure', minConfidence: 0.6 },
    ],
    checkpoints,
    taskVariants,
    groupingCheckpoints: [{
      id: 'group-checkpoint',
      stepId: 'P20',
      purpose: 'same_need_workshop',
      minGroupSize: 3,
      maxGroupSize: 4,
      sharedQuestion: `Cùng kiểm chứng ${spec.focus}; nhóm khác nhau ở scaffold, không ở chuẩn đích.`,
      rubric: [...successCriteria],
      postCheckId,
    }],
    aiError,
    projections: {
      teacher: { fields: ['cueId', 'teacherScript', 'boardLarge', 'boardSide', 'evidence', 'groupProposal', 'privateResponseSummary'] },
      tv: screens.tv,
      student: { fields: ['task', 'scaffold', 'glossary', 'ownResponse', 'languagePreference'] },
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
      reviewedBy: 'v4-source-structure-review',
    },
    version: `2026-08-30-${SNAPSHOT.source.fingerprint.slice(0, 12)}`,
  };
}

export function getBanToanV4Contract(sourceKey: string): LiveLessonV4Contract {
  const spec = SPECS_BY_KEY.get(sourceKey);
  if (!spec) throw new Error(`Không có gói V4 Ban Toán cho sourceKey ${sourceKey}.`);
  return buildContract(spec);
}

export function getAllBanToanV4Contracts(): LiveLessonV4Contract[] {
  return SNAPSHOT.lessonSpecs.map((spec) => buildContract(spec));
}

export function getBanToanV4PackageMetadata(): BanToanV4PackageMetadata[] {
  return SNAPSHOT.lessonSpecs.map((spec) => ({
    packageId: packageIdFor(spec),
    sourceKey: spec.key,
    title: spec.title,
    grade: spec.grade,
    week: spec.week,
    period: spec.period,
    kind: spec.kind,
    selfChoice: spec.selfChoice,
    lessonMode: modeFor(spec),
    sourceFingerprint: SNAPSHOT.source.fingerprint,
    releaseStatus: 'candidate',
  }));
}

export function getBanToanV4SourceFingerprint(): string {
  return SNAPSHOT.source.fingerprint;
}
