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
  title: string;
  content: string;
  status: 'draft' | 'completed';
  createdAt: string;
  updatedAt: string;
  sourceDistributionId?: string; // If generated from a curriculum distribution
  userId?: string;
  isPublic?: boolean;
}

export interface CurriculumDistribution {
  id: string;
  name: string;
  subjectId: string;
  content: string; // Extracted text from PDF/Word/Excel
  createdAt: string;
}

export interface TemplateFile {
  id: string;
  name: string;
  type: 'pdf' | 'word' | 'excel';
  content: string; // The extracted text content
  category: 'sample' | 'criteria' | 'lesson_doc' | 'distribution'; // Added lesson_doc and distribution
}

export interface LessonTemplate {
  id: string;
  name: string;
  subjectId: string;
  files: TemplateFile[];
  createdAt: string;
}

export interface AppData {
  subjects: Subject[];
  lessonPlans: LessonPlan[];
  templates: LessonTemplate[];
  settings: {
    theme: 'light' | 'dark';
    autoSave: boolean;
    geminiApiKey: string;
    selectedModel: string;
  };
}

export const DEFAULT_DATA: AppData = {
  subjects: [
    { id: 'math', name: 'Toán học', icon: 'Calculator', lessonCount: 5 },
    { id: 'phys', name: 'Vật lý', icon: 'Zap', lessonCount: 3 },
    { id: 'chem', name: 'Hóa học', icon: 'FlaskConical', lessonCount: 2 },
    { id: 'bio', name: 'Sinh học', icon: 'Dna', lessonCount: 4 },
    { id: 'lit', name: 'Ngữ văn', icon: 'BookOpen', lessonCount: 6 },
  ],
  lessonPlans: [
    {
      id: 'demo-1',
      subjectId: 'math',
      title: 'Đạo hàm cấp 1 - Tiết 1',
      content: '# Giáo án: Đạo hàm cấp 1\n\n## 1. Mục tiêu\n- Hiểu định nghĩa đạo hàm.\n- Tính được đạo hàm bằng định nghĩa.\n\n## 2. Hoạt động\n- Khởi động: Bài toán vận tốc tức thời.\n- Hình thành kiến thức: Định nghĩa giới hạn.',
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  templates: [
    {
      id: 'tpl-default',
      name: 'Mẫu giáo án chuẩn Bộ GD&ĐT',
      subjectId: 'math',
      files: [
        {
          id: 'file-1',
          name: 'Mau_Giao_An_Chuan.pdf',
          type: 'pdf',
          content: '# Tên bài học\n## I. Mục tiêu\n## II. Thiết bị dạy học\n## III. Tiến trình dạy học',
          category: 'sample'
        }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  settings: {
    theme: 'light',
    autoSave: true,
    geminiApiKey: '',
    selectedModel: 'gemini-3-flash-preview',
  },
};
