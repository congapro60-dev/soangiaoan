// Public API duy nhất của gói hợp đồng bài học V4.
export type {
  V4Language,
  V4NonViLanguage,
  SupportMode,
  V4Route,
  GroupPurpose,
  V4ErrorCategory,
  V4SessionStatus,
  V4ResponseType,
  ObjectiveKind,
  Objective,
  TimelineBlock,
  LanguageDemand,
  GlossaryItem,
  CurriculumBridge,
  StudentLanguageView,
  VerifiedLanguageSupportPlan,
  ScaffoldSet,
  FadingRule,
  TaskVariant,
  CheckpointKind,
  Checkpoint,
  EvidenceRule,
  EvidenceBand,
  EvidenceDimension,
  EvidencePoint,
  EvidenceVector,
  GroupingCheckpoint,
  AiErrorOfTheWeek,
  PublicTvField,
  TeacherProjection,
  PublicTvProjection,
  StudentProjection,
  PublicTvState,
  OfflinePack,
  PublicationGate,
  LiveLessonV4Contract,
  V4ValidationCode,
  V4ValidationError,
  V4ValidationResult,
} from './types';

export { validateV4Contract } from './validateContract';
export {
  DEFAULT_STUDENT_LANGUAGE_VIEW,
  V4_LANGUAGES,
  V4_SUPPORT_MODES,
  changeStudentLanguageView,
  resolveStudentLanguageView,
  sanitizeStudentLanguagePreference,
  type StudentLanguageViewSource,
} from './languageSupport';
export {
  buildStudentGlossaryPopup,
  findApprovedGlossaryItem,
  type StudentGlossaryPopupPayload,
} from './glossary';
export {
  buildEvidenceVectors,
  deduplicateResponses,
  type EvidenceAdapterInput,
  type StudentEvidence,
} from './evidence';
export {
  proposeGroups,
  type GroupProposal,
} from './grouping';
