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
  status: 'pending' | 'processing' | 'completed' | 'error';
  fileName: string;
}

export interface GradingSession {
  id: string;
  title: string;
  testFile?: TemplateFile | null; // deprecated — kept for backward compat
  masterFiles: TemplateFile[];
  results: GradingResult[];
  createdAt: string;
  userId?: string;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  content: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  explanation?: string;
}

export interface Exam {
  id: string;
  code: string;
  title: string;
  subjectId: string;
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
    selectedProvider: 'gemini' | 'claude' | 'openai' | 'grok' | 'deepseek';
    selectedModel: string;
    grokApiKey: string;
    deepseekApiKey: string;
    models?: string[];
  };
  gradingSessions: GradingSession[];
  exams: Exam[];
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
    selectedProvider: 'gemini',
    selectedModel: 'gemini-3.1-flash-lite-preview',
    models: ['gemini-3.1-flash-lite-preview', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'],
  },
  gradingSessions: [],
  exams: [],
};
