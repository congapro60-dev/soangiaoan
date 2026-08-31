// Hợp đồng bài học V4 — nguồn cấu trúc DUY NHẤT cho các projection GV/TV/HS và output giáo án.
// Thuần dữ liệu, KHÔNG chứa PII. Ba nhánh ngôn ngữ là ba loại tách biệt:
//   - languagePreference  → StudentLanguageView (HS tự chọn, không nhạy cảm)
//   - languageSupportPlan  → VerifiedLanguageSupportPlan (chỉ nguồn trường/GV xác nhận)
//   - curriculumBridge     → CurriculumBridge (cầu nối chương trình cũ, không suy ra năng lực)
// Không loại nào được gộp với loại khác.

export type V4Language = 'vi' | 'en' | 'ja' | 'ko' | 'zh';
export type V4NonViLanguage = Exclude<V4Language, 'vi'>;
export type SupportMode = 'vi_anchor' | 'bilingual' | 'approved_full_translation';
export type V4Route = 'M' | 'S' | 'C';
export type GroupPurpose = 'same_need_workshop' | 'mixed_reasoning' | 'teacher_defined';
export type V4LessonMode = 'formation' | 'practice' | 'elective-practice';

export type V4ErrorCategory = 'Conceptual' | 'Algebraic' | 'Logical' | 'Missing condition';

export type V4SessionStatus = 'lobby' | 'running' | 'paused' | 'closed';

export type V4ResponseType = 'choice' | 'text' | 'boolean' | 'route' | 'hint' | 'exit_ticket';

// --- Mục tiêu và timeline ---

export type ObjectiveKind = 'math' | 'language';

export interface Objective {
  id: string;
  kind: ObjectiveKind;
  text: string;
}

export interface TimelineBlock {
  id: string;              // Pxx, duy nhất
  label: string;
  startSeconds: number;    // tính từ P00
  endSeconds: number;
  teacherScript: string;   // lời GV — KHÔNG lên TV
  tvScreenId: string;
  studentAction?: string;
  boardLarge?: string;
  boardSide?: string;
  checkpointId?: string;   // liên kết tới checkpoint thu bằng chứng ở block này
}

// --- Ngôn ngữ ---

export interface LanguageDemand {
  stepId: string;
  terms: string[];
  sentenceFrames: string[];
}

export interface GlossaryItem {
  id: string;
  vietnamese: string;
  translations: Partial<Record<V4NonViLanguage, string>>;
  plainExplanationVi: string;
  plainExplanationByLanguage: Partial<Record<V4NonViLanguage, string>>;
  notation?: string;
  example?: string;
  nonExample?: string;
  pronunciation?: string;
  sourceRef: string;
  reviewer: string;
  version: string;
  status: 'draft' | 'approved' | 'retired';
}

export interface CurriculumBridge {
  id: string;
  priorNotation: string;          // ký hiệu/cách gọi cũ có thể gặp
  vietnameseEquivalent: string;   // tương đương chương trình Việt Nam
  example: string;
  nonExample: string;
  selfCheckQuestion: string;      // HS tự xác nhận đã nối được kiến thức
}

// HS tự chọn — không nhạy cảm, được phép lưu trên thiết bị.
export interface StudentLanguageView {
  language: V4Language;
  supportMode: SupportMode;
  showGlossary: boolean;
  showSentenceFrames: boolean;
  curriculumBridgeIds: string[];
}

// Chỉ nguồn nhà trường/GV đã xác nhận cung cấp — KHÔNG gộp với StudentLanguageView.
export interface VerifiedLanguageSupportPlan {
  studentId: string;
  schoolVerified: boolean;
  tier: 'access' | 'scaffold' | 'intensive';
  needs: Array<'terminology' | 'sentence_frame' | 'visual_representation' | 'extra_processing_time'>;
  sourceRef: string;
  reviewedAt: number;
}

// --- Scaffold, fading, task variant ---

export interface ScaffoldSet {
  id: string;
  route: V4Route;
  hints: string[];             // theo thứ tự scaffold, không hiện hết một lúc
  sentenceFrames?: string[];
  glossaryRefs?: string[];
}

export interface FadingRule {
  stepId: string;
  maxHints: number;
  note?: string;
}

export interface TaskVariant {
  id: string;
  route: V4Route;
  prompt: string;
  scaffoldSetId: string;
  successCriteria: string[];   // dùng CHUNG giữa M/S/C; chỉ scaffold khác nhau
  postCheckId: string;         // trỏ tới checkpoint kind='post_check'
  extension?: string;
}

// --- Bằng chứng và checkpoint ---

export type CheckpointKind = 'in_class' | 'post_check';

export interface Checkpoint {
  id: string;
  stepId: string;
  kind: CheckpointKind;
  prompt: string;
  responseType: V4ResponseType;
  evidenceSignal: string;          // bằng chứng thu được là gì
  teacherNextActions: string[];    // GV có thể làm gì tiếp theo
}

export interface EvidenceRule {
  id: string;
  sourceStepId: string;
  dimension: EvidenceDimension;
  minConfidence: number;           // 0–1
}

export type EvidenceBand = 'not_observed' | 'emerging' | 'secure' | 'transfer';

export type EvidenceDimension =
  | 'concept'
  | 'procedure'
  | 'reasoning'
  | 'modeling'
  | 'languageAccess'
  | 'autonomyCollaboration';

export interface EvidencePoint {
  sourceStepId: string;
  observedAt: number;
  signal: string;
  confidence: number;              // 0–1
  privateReason: string;
}

// Bằng chứng runtime (dùng ở Task 5). Định nghĩa tại đây làm nguồn type chung.
export interface EvidenceVector {
  concept: EvidenceBand;
  procedure: EvidenceBand;
  reasoning: EvidenceBand;
  modeling: EvidenceBand;
  languageAccess: EvidenceBand;
  autonomyCollaboration: EvidenceBand;
  points: EvidencePoint[];
  confidence: number;              // 0–1
  freshestAt: number;
}

export interface GroupingCheckpoint {
  id: string;
  stepId: string;
  purpose: GroupPurpose;
  minGroupSize: number;            // 3
  maxGroupSize: number;            // 4
  sharedQuestion: string;
  rubric: string[];
  postCheckId: string;             // mỗi nhóm vẫn có post-check cá nhân
}

export interface V4ChoicePolicy {
  enabled: boolean;
  prompt: string;
  allowedRoutes: V4Route[];
  commonSuccessCriteria: string[];
  commonPostCheckId: string;
}

export interface V4SourceIdentity {
  sourceKey: string;
  grade: number;
  week: number;
  period: number;
  kind: 'formation' | 'practice';
  selfChoice: boolean;
  sourceFingerprint: string;
  sourceRef: string;
}

export type V4SourceExerciseLevel = 'NB' | 'TH' | 'VD';

export interface V4SourceExample {
  question: string;
  solution: string;
  sourceRef: string;
}

export interface V4SourceExercise {
  level: V4SourceExerciseLevel;
  question: string;
  answer: string;
  sourceRef: string;
}

/** Nội dung Toán đã duyệt được giữ nguyên để draft adaptive không rơi về placeholder. */
export interface V4SourceContent {
  formulas: string[];
  examples: V4SourceExample[];
  exercises: V4SourceExercise[];
  quickChecks: V4SourceExample[];
  mistakes: string[];
}

// --- AI Error of the Week ---

export interface AiErrorOfTheWeek {
  id: string;
  stepId: string;
  category: V4ErrorCategory;
  faultyStatement: string;
  correction: string;
  proof: string;                   // phép kiểm được GV duyệt trước tiết
}

// --- Projection allowlist ---

// TV chỉ được phép chứa các field public này. Bất kỳ field nào khác = rò rỉ riêng tư.
export type PublicTvField =
  | 'cueId'
  | 'screenId'
  | 'status'
  | 'showStats'
  | 'participantCount'
  | 'submittedCount'
  | 'routeCounts'
  | 'errorCategoryCounts'
  | 'groupProgress'
  | 'updatedAt';

export interface TeacherProjection {
  fields: string[];                // GV được xem cả script/bằng chứng riêng
}

export interface PublicTvProjection {
  screenIds: string[];
  fields: string[];                // phải nằm trong PublicTvField (validator kiểm)
  maxStatCards: number;            // ≤ 4
}

export interface StudentProjection {
  fields: string[];                // scaffold cá nhân + câu trả lời của chính HS
}

// Trạng thái TV realtime đã làm sạch (allowlist). Dùng ở Task 6/7.
export interface PublicTvState {
  cueId: string;
  screenId: string;
  status: V4SessionStatus;
  showStats: boolean;
  participantCount: number;
  submittedCount: number;
  routeCounts: Record<V4Route, number>;
  errorCategoryCounts: Record<V4ErrorCategory, number>;
  groupProgress?: Record<string, number>;
  updatedAt: number;
}

// --- Offline và publication gate ---

export interface OfflinePack {
  tvCuesIncluded: boolean;
  glossaryPrintIncluded: boolean;
  boardPlanIncluded: boolean;          // bảng phụ: mục tiêu, khung câu, rubric
  aiErrorAnswerKeyIncluded: boolean;
  routeCards: V4Route[];               // phải đủ M, S, C
  manualGroupingSheet: boolean;
  paperExitTicket: boolean;
}

export interface PublicationGate {
  glossaryApproved: boolean;
  aiErrorReviewed: boolean;
  offlineReady: boolean;
  reviewedBy: string;
}

// --- Hợp đồng tổng ---

export interface LiveLessonV4Contract {
  schemaVersion: 4;
  id: string;
  lessonId: string;
  title: string;
  durationSeconds: 2400;
  /** Metadata required by generated Ban Toán packages; optional for old V4 pilot fixtures. */
  lessonMode?: V4LessonMode;
  sourceKey?: string;
  sourceFingerprint?: string;
  source?: V4SourceIdentity;
  sourceContent?: V4SourceContent;
  selfChoice?: boolean;
  choicePolicy?: V4ChoicePolicy;
  timeline: TimelineBlock[];           // P00–P40, tổng đúng 2400 giây
  objectives: {
    math: Objective[];
    language: Objective[];
    studentGoalPrompt: string;
    teacherSynthesisPrompt: string;
  };
  languageDemands: LanguageDemand[];
  glossary: GlossaryItem[];
  curriculumBridges: CurriculumBridge[];
  scaffoldSets: ScaffoldSet[];
  fading: FadingRule[];
  evidenceRules: EvidenceRule[];
  checkpoints: Checkpoint[];
  taskVariants: TaskVariant[];
  groupingCheckpoints: GroupingCheckpoint[];
  aiError: AiErrorOfTheWeek;
  projections: {
    teacher: TeacherProjection;
    tv: PublicTvProjection;
    student: StudentProjection;
  };
  offline: OfflinePack;
  publication: PublicationGate;
  version: string;
}

// --- Kết quả validate ---

export type V4ValidationCode =
  | 'SCHEMA_VERSION_INVALID'
  | 'TIMELINE_NOT_2400'
  | 'DUPLICATE_STEP_ID'
  | 'CHECKPOINT_MISSING_EVIDENCE'
  | 'TASK_VARIANT_MISSING_SUCCESS_CRITERIA'
  | 'MISSING_POST_CHECK'
  | 'GLOSSARY_MISSING_METADATA'
  | 'UNAPPROVED_GLOSSARY'
  | 'TV_PRIVATE_FIELD'
  | 'OFFLINE_PACK_INCOMPLETE'
  | 'LESSON_MODE_INVALID'
  | 'SOURCE_IDENTITY_INVALID'
  | 'CHOICE_POLICY_INVALID'
  | 'SOURCE_CONTENT_INVALID';

export interface V4ValidationError {
  code: V4ValidationCode;
  message: string;
  path?: string;
}

export interface V4ValidationResult {
  ok: boolean;
  errors: V4ValidationError[];
}
