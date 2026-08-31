// Public API duy nhất của gói hợp đồng bài học V4.
export type {
  V4Language,
  V4NonViLanguage,
  SupportMode,
  V4Route,
  GroupPurpose,
  V4LessonMode,
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
  V4ChoicePolicy,
  V4SourceIdentity,
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
  getAllBanToanV4Contracts,
  getBanToanV4Contract,
  getBanToanV4DisplayTitle,
  getBanToanV4PackageMetadata,
  getBanToanV4SourceFingerprint,
  type BanToanV4PackageMetadata,
} from './lessonAdapter';
export {
  buildLiveLessonDefinitionFromV4,
} from './runtimeDefinition';
export {
  buildBanToanV4AdaptiveLessonDraft,
} from './adaptiveDraft';
export {
  getBanToanV4ContractByPackageId,
  getBanToanV4ContractForLesson,
  getBanToanV4ContractForLiveDefinitionId,
  getBanToanV4PackageCount,
  getBanToanV4PackageForLesson,
  getBanToanV4SourceKeyForLesson,
  type BanToanV4LessonBinding,
} from './lessonRegistry';
export {
  APPROVED_CURRICULUM_BRIDGE_IDS,
  buildStudentSupportModeOptions,
  DEFAULT_STUDENT_LANGUAGE_VIEW,
  hasApprovedFullTranslationPack,
  V4_LANGUAGES,
  V4_SUPPORT_MODES,
  changeStudentLanguageView,
  resolveStudentLanguageView,
  sanitizeStudentLanguagePreference,
  type StudentSupportModeOption,
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
export {
  buildPublicTvState,
  projectToPublicTvState,
  isPrivateFieldLeaked,
  type PublicProjectionInput,
} from './publicProjection';
export {
  getRoutedVariant,
  getOrderedHints,
  revealNextHint,
  createHintState,
  getRevealedHints,
  computeHintOpacity,
  hasMoreHints,
  getExtension,
  type RoutedTask,
  type HintRevealState,
} from './taskRouting';
export {
  buildOfflinePackContents,
  buildOfflineChecklist,
  validateOfflinePackReadiness,
  validatePostChecks,
  validateGlossaryApproved,
  type OfflinePackContents,
  type OfflinePackValidation,
} from './offlinePack';
export {
  auditLesson,
  buildCanonicalDraft,
  getAllSourceKeys,
  publishSequentially,
  summarizeReports,
  type AuditIssue,
  type AuditResult,
  type PublicationReport,
  type SaveCallback,
} from './sequentialPublication';
