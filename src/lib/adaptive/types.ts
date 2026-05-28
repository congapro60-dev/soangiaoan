import type { AdaptiveSimulationSpec } from './simulationTypes';

export type LearningRoute = 'foundation' | 'standard' | 'challenge';
export type LessonStatus = 'draft' | 'published' | 'archived';
export type AssessmentPurpose = 'diagnostic' | 'quick_check' | 'exit_ticket';
export type AdaptiveQuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type MasteryStatus = 'not_seen' | 'weak' | 'near_mastery' | 'mastered' | 'advanced';
export type StudentSessionStatus = 'not_started' | 'diagnostic' | 'learning' | 'quick_check' | 'needs_teacher' | 'completed';
export type RemediationStrategy = 'visual' | 'step_by_step' | 'socratic' | 'worked_example' | 'analogy';
export type PacingStatus = 'ahead' | 'on_track' | 'behind' | 'stuck';
export type PacingAction = 'continue_core' | 'assign_enrichment' | 'compress_to_core' | 'remediate_easier' | 'flag_teacher';

export interface CurriculumReference {
  distributionId?: string;
  programType?: 'MOET' | 'TDS' | 'CUSTOM';
  week?: string;
  period?: number;
  textbook?: string;
  chapter?: string;
  lessonCode?: string;
}

export interface LessonPreparation {
  textbookPages?: string;
  readingInstructions: string;
  guidingQuestions: string[];
  estimatedMinutes: number;
  engage?: {
    storyHook?: string;
    realityCheckMessage?: string;
    guidingQuestion?: string;
    guidingQuestionBox?: string;
    bigTitle?: string;
    studentExpectationPrompt?: string;
    routeGoals?: Partial<Record<LearningRoute, string>>;
  };
}

export interface FiveStepFlow {
  steps: FiveStepItem[];
}

export interface FiveStepItem {
  id: string;
  name: string;
  purpose: string;
  estimatedMinutes: number;
  teacherRole: string;
  studentAction: string;
  systemSupport: string;
}

export interface CommonMisconception {
  id: string;
  title: string;
  description: string;
  remediationHint: string;
}

export interface LearningObjective {
  id: string;
  code: string;
  title: string;
  description: string;
  bloomLevel: BloomLevel;
  masteryThreshold: number;
  prerequisiteObjectiveIds: string[];
  commonMisconceptions: CommonMisconception[];
}

export interface WorkedExample {
  id: string;
  title: string;
  problem: string;
  solution: string;
  explanation: string;
  objectiveIds: string[];
  timeLimitSeconds?: number;
  hintDelaySeconds?: number;
  hints?: string[];
  responseMode?: 'short_text' | 'long_text' | 'image_upload';
  aiRubric?: string;
}

export interface PracticeTask {
  id: string;
  prompt: string;
  expectedAnswer?: string;
  hints: string[];
  objectiveIds: string[];
  difficulty: DifficultyLevel;
}

export interface LearningRouteContent {
  route: LearningRoute;
  explanation: string;
  workedExamples: WorkedExample[];
  practiceTasks: PracticeTask[];
  aiTutorPrompt?: string;
}

export interface AdaptiveQuestion {
  id: string;
  type: AdaptiveQuestionType;
  prompt: string;
  options?: string[];
  correctAnswer?: string;
  explanation: string;
  objectiveIds: string[];
  misconceptionIds?: string[];
  difficulty: DifficultyLevel;
  points: number;
  timeLimitSeconds?: number;
}

export interface AdaptiveAssessment {
  id: string;
  title: string;
  purpose: AssessmentPurpose;
  durationMinutes: number;
  questions: AdaptiveQuestion[];
}

export interface KnowledgeUnit {
  id: string;
  title: string;
  objectiveIds: string[];
  estimatedMinutes: number;
  routes: LearningRouteContent[];
  quickCheck: AdaptiveAssessment;
  maxRemediationAttempts: number;
  coreTaskIds?: string[];
  supportTasks?: PracticeTask[];
  enrichmentTasks?: PracticeTask[];
  externalToolIds?: string[];
  simulationId?: string;  // ref đến lessonSimulations/{lessonId}_{unitId}
  simulationSpec?: AdaptiveSimulationSpec;
}

export interface LessonPacingPolicy {
  minExitTicketMinutes: number;
  aheadThresholdMinutes: number;
  behindThresholdMinutes: number;
  stuckAfterRemediationAttempts: number;
  enrichmentTriggerMastery: number;
  supportTriggerMastery: number;
}

export interface AdaptiveLesson {
  id: string;
  title: string;
  subjectId: 'math';
  grade: '10' | '11' | '12';
  curriculumRef?: CurriculumReference;
  durationMinutes: 40;
  status: LessonStatus;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
  coverImageRealistic?: string;
  coverImageTextbook?: string;
  preparation: LessonPreparation;
  fiveStepFlow: FiveStepFlow;
  objectives: LearningObjective[];
  knowledgeUnits: KnowledgeUnit[];
  diagnosticTest: AdaptiveAssessment;
  exitTicket: AdaptiveAssessment;
  pacingPolicy?: LessonPacingPolicy;
  completionReward?: {
    toolId: string;
    message: string;
  };
  generationWarnings?: string[];
  generationSource?: 'ai_json' | 'regex_fallback';
}

export interface StudentParticipant {
  studentId: string;
  studentName: string;
  studentClass?: string;
  currentRoute: LearningRoute;
  currentUnitId?: string;
  status: StudentSessionStatus;
  lastActiveAt?: string;
}

export interface AdaptiveSession {
  id: string;
  lessonId: string;
  classId?: string;
  teacherId: string;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  startedAt?: string;
  endedAt?: string;
  participants: StudentParticipant[];
  createdAt: string;
}

export interface AdaptiveAnswer {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  score: number;
  detectedMisconceptionIds?: string[];
  feedback?: string;
}

export interface ObjectiveScore {
  objectiveId: string;
  score: number;
  maxScore: number;
  masteryEstimate: number;
}

export interface ObjectiveMasteryState {
  objectiveId: string;
  status: MasteryStatus;
  confidence: number;
  evidenceQuestionIds: string[];
  lastUpdatedAt: string;
}

export interface AssessmentAttempt {
  id: string;
  assessmentId: string;
  purpose: AssessmentPurpose;
  submittedAt: string;
  durationSeconds: number;
  answers: AdaptiveAnswer[];
  objectiveScores: ObjectiveScore[];
  recommendedRoute?: LearningRoute;
  aiSummary?: string;
}

export interface RemediationEvent {
  id: string;
  unitId: string;
  objectiveIds: string[];
  attemptNumber: number;
  reason: string;
  strategy: RemediationStrategy;
  aiGeneratedContent: string;
  createdAt: string;
}

export interface TeacherFlag {
  id: string;
  severity: 'info' | 'warning' | 'urgent';
  reason: string;
  objectiveIds: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface StudentObjectiveMemory {
  objectiveId: string;
  objectiveCode: string;
  title: string;
  attempts: number;
  masteryEstimate: number;
  lastStatus: MasteryStatus;
  lastUpdatedAt: string;
}

export interface StudentLearningProfile {
  id: string;
  teacherId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentClass?: string;
  totalSessions: number;
  averageMastery: number;
  routeHistory: LearningRoute[];
  objectiveMemory: StudentObjectiveMemory[];
  misconceptionCounts: Record<string, number>;
  lastLessonId?: string;
  lastLessonTitle?: string;
  lastActiveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentSessionProgressRecord {
  id: string;
  teacherId: string;
  lessonId: string;
  lessonTitle: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  studentClass?: string;
  route: LearningRoute;
  status: 'in_progress' | 'needs_support' | 'completed';
  diagnosticAttempt: AssessmentAttempt;
  quickCheckAttempts: AssessmentAttempt[];
  exitTicketAttempt?: AssessmentAttempt;
  objectiveStates: ObjectiveMasteryState[];
  remediationAttempts: number;
  completedUnitIds?: string[];
  uploadedImageUrls?: string[];
  timings?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  updatedAt: string;
}

export interface StudentAdaptiveProgress {
  id: string;
  sessionId: string;
  lessonId: string;
  studentId: string;
  route: LearningRoute;
  objectiveStates: ObjectiveMasteryState[];
  assessmentAttempts: AssessmentAttempt[];
  remediationEvents: RemediationEvent[];
  teacherFlags: TeacherFlag[];
  startedAt: string;
  completedAt?: string;
}

export interface PacingDecision {
  status: PacingStatus;
  action: PacingAction;
  elapsedMinutes: number;
  remainingMinutes: number;
  expectedElapsedMinutes: number;
  paceDeltaMinutes: number;
  averageMastery: number;
  currentUnitId?: string;
  recommendedUnitIds: string[];
  recommendedTaskIds: string[];
  shouldPreserveExitTicket: boolean;
  message: string;
  teacherNote?: string;
}

export interface TeacherObjectiveInsight {
  objectiveId: string;
  objectiveCode: string;
  title: string;
  weakCount: number;
  nearMasteryCount: number;
  masteredCount: number;
  advancedCount: number;
  weakRate: number;
}

export interface AdaptiveTeacherDashboardData {
  totalStudents: number;
  completedDiagnostic: number;
  routeCounts: Record<LearningRoute, number>;
  needsTeacherCount: number;
  objectiveInsights: TeacherObjectiveInsight[];
  urgentFlags: TeacherFlag[];
}

export interface LessonSimulation {
  id: string;
  lessonId: string;
  unitId: string;
  exampleId: string;
  problemText: string;
  html: string;
  style: 'textbook' | 'realistic';
  createdAt: string;
  createdBy: string;
  htmlSizeBytes: number;
  geminiModel: string;
  spec?: AdaptiveSimulationSpec;
}
