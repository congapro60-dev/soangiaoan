export interface Student {
  id: string;
  name: string;
  code: string;
  progress: number;
  status: 'active' | 'needs_support' | 'excellent';
}

export interface TeacherClass {
  id: string;
  name: string;
  track: string;
  grade: string;
  studentCount: number;
  activeAssignments: number;
  progress: number;
  tone: 'primary' | 'secondary' | 'tertiary' | 'warning';
  students: Student[];
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  lessonCount: number;
}

export interface LessonPlan {
  id: string;
  subjectId: string;
  templateId?: string;
  grade?: string;
  week?: string;
  period?: number;
  authorName?: string;
  title: string;
  content: string;
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  sourceDistributionId?: string;
  userId?: string;
  isPublic?: boolean;
}

export interface CurriculumDistribution {
  id: string;
  name: string;
  subjectId: string;
  grade: string;
  content: string; // Nội dung đã trích xuất từ văn bản
  createdAt: string;
  userId: string;
}

export interface TemplateFile {
  id: string;
  name: string;
  type: string;
  content: string;
  category: 'sample' | 'criteria' | 'lesson_doc' | 'distribution' | 'test' | 'matrix';
  /** Phase 2A MVP: Markdown Skeleton trích từ mẫu để giữ heading/bảng/placeholder khi gọi AI. */
  skeleton?: import('./lib/documentSkeleton').DocumentSkeleton;
}

export interface LessonTemplate {
  id: string;
  name: string;
  subjectId: string;
  files: TemplateFile[];
  createdAt: string;
}

export interface GradingResult {
  id: string;
  studentName: string;
  score: number;
  maxScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementPlan: string;
  details: string; // Markdown report
  rawText?: string; // Văn bản gốc bài nộp (chỉ có cho file text, không có cho ảnh)
  status: 'pending' | 'processing' | 'completed' | 'error';
  fileName: string;
}

export interface GradingSession {
  id: string;
  title: string;
  testFile?: TemplateFile | null; // deprecated — kept for backward compat
  masterFiles: TemplateFile[];
  gradingRubric?: string; // Hướng dẫn chấm — quy tắc tính điểm, partial credit...
  results: GradingResult[];
  warnings?: GradingWarning[];
  createdAt: string;
  userId?: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  content: string;
  imageUrl?: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  explanation?: string;
  cognitiveLevel?: string;
}

export type TfScoringMode = 'all_or_nothing' | 'thpt2025';

export interface Exam {
  id: string;
  code: string;
  title: string;
  subjectId: string;
  subjectName?: string;
  grade?: string;
  teacherId: string;
  teacherName: string;
  questions: ExamQuestion[];
  durationMinutes: number;
  startAt?: string;
  endAt?: string;
  maxScore: number;
  isActive: boolean;
  allowReview: boolean;
  shuffleQuestions: boolean;
  createdAt: string;
  updatedAt: string;
  // Advanced config (Phase 5)
  password?: string;
  maxAttempts?: number;
  proctorMode?: 'off' | 'tab-exit' | 'advanced';
  showResultWhen?: 'submit' | 'all_done' | 'never';
  hideLeaderboard?: boolean;
  preExamNotice?: string;
  tfScoringMode?: 'all_or_nothing' | 'thpt2025';
}

export interface StudentAnswer {
  questionId: string;
  answer: string;
  autoScore?: number;
  aiScore?: number;
  aiFeedback?: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examCode: string;
  studentName: string;
  studentClass?: string;
  studentId?: string;
  startedAt: string;
  submittedAt?: string;
  answers: StudentAnswer[];
  totalScore?: number;
  maxScore: number;
  status: 'in_progress' | 'submitted' | 'graded';
  tabSwitches?: number;
  /** Unauthenticated student submissions are protected primarily by an unguessable document id. */
  clientNonce?: string;
}

export type GradeLevel = 'cap2' | 'lop1011' | 'lop12';

export interface ParsedExamBundle {
  id: string;
  title: string;
  gradeLevel: GradeLevel;
  subject?: string;
  durationMinutes: number;
  schoolName: string;
  parsedAt: string;
  questions: ExamQuestion[];
}

export interface GradingWarning {
  level: 'error' | 'warning' | 'info';
  studentId?: string;
  questionId?: string;
  message: string;
  suggestion?: string;
}

export interface AppData {
  subjects: Subject[];
  lessonPlans: LessonPlan[];
  templates: LessonTemplate[];
  distributions: CurriculumDistribution[];
  authorName: string;
  settings: {
    theme: 'light' | 'dark';
    autoSave: boolean;
    geminiApiKey: string;
    claudeApiKey: string;
    openaiApiKey: string;
    selectedProvider: 'gemini' | 'claude' | 'openai' | 'grok' | 'deepseek' | 'nvidia' | 'openai-compatible';
    selectedModel: string;
    grokApiKey: string;
    deepseekApiKey: string;
    nvidiaApiKey: string;
    openaiCompatibleApiKey?: string;
    openaiCompatibleBaseUrl?: string;
    openaiCompatibleModelId?: string;
    models?: string[];
    botApiUrl?: string;
    botApiToken?: string;
  };
  gradingSessions: GradingSession[];
  exams: Exam[];
  classes: TeacherClass[];
}

export const DEFAULT_DATA: AppData = {
  subjects: [
    { id: 'math', name: 'Toán học', icon: 'Calculator', lessonCount: 5 },
    { id: 'phys', name: 'Vật lý', icon: 'Zap', lessonCount: 3 },
    { id: 'chem', name: 'Hóa học', icon: 'FlaskConical', lessonCount: 2 },
    { id: 'bio', name: 'Sinh học', icon: 'Dna', lessonCount: 4 },
    { id: 'lit', name: 'Ngữ văn', icon: 'BookOpen', lessonCount: 6 },
  ],
  lessonPlans: [],
  templates: [],
  distributions: [],
  authorName: '',
  settings: {
    theme: 'light',
    autoSave: true,
    geminiApiKey: '',
    claudeApiKey: '',
    openaiApiKey: '',
    grokApiKey: '',
    deepseekApiKey: '',
    nvidiaApiKey: '',
    openaiCompatibleApiKey: '',
    openaiCompatibleBaseUrl: 'https://digishop-api.io.vn/v1',
    openaiCompatibleModelId: 'claude-opus-4-7',
    selectedProvider: 'gemini',
    selectedModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    botApiUrl: '',
    botApiToken: '',
  },
  gradingSessions: [],
  exams: [],
  classes: [],
};

// --- External Tools Integration ---

export type ExternalToolStatus = 'pending' | 'active' | 'disabled';
export type SandboxPreset = 'strict' | 'geogebra';
export type HeightPreset = 'compact' | 'standard' | 'large';

export interface ExternalTool {
  toolId: string;
  title: string;
  description: string;
  url: string;
  sourceDomain: string;
  tags: string[];
  subject?: string;
  gradeRange?: string;
  heightPreset: HeightPreset;
  sandboxPreset: SandboxPreset;
  status: ExternalToolStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LessonAnalysis {
  monHoc: string;
  lop: string;
  tenBai: string;
  thoiLuong: string;
  mucTieu: string[];
  hoatDong: string[];
  diemManh: string[];
  diemCanNangCap: string[];
}

export type UpgradeMenuItemId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q';

export interface UpgradeMenuItem {
  id: UpgradeMenuItemId;
  label: string;
  icon?: any;
  group: 'hoat-dong' | 'danh-gia' | 'nang-luc' | 'tro-choi-hoc-lieu' | 'tong-the';
  needsKnowledge?: boolean;
  reuse?: boolean;
}

export interface UpgradeResult {
  menuId: UpgradeMenuItemId;
  content: string;
  timestamp: number;
}
