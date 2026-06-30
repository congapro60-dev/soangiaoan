export type DeweyTheme = 'classic' | 'scifi' | 'comic';

export type DeweyQuestionType =
  | 'multiple_choice'    // 4 options A/B/C/D (Nhận biết) — 4 tầng hỗ trợ
  | 'true_false_group'   // 1 bối cảnh + 4 mệnh đề a/b/c/d (Thông hiểu) — chấm từng phần, gợi ý mỗi ý
  | 'short_answer'       // Điền số (Vận dụng) — 4 tầng hỗ trợ
  | 'essay';             // Tự luận 2–4 ý (Vận dụng) — 2 tầng: gợi ý từng ý → đáp án để HS tự chấm

// ─── Pre-test (5 câu trắc nghiệm 2 options, ôn tập tiết trước) ───
export interface DeweyPretestQuestion {
  id: string;
  prompt: string;          // Hỗ trợ MathJax $...$
  options: string[];       // 2 options
  correctIndex: number;
  explanation: string;     // Hiện sau khi nộp
}

// ─── Câu hỏi adaptive trong Olympia (4-cấp remediation) ───
export interface DeweyAdaptiveQuestion {
  id: string;
  type: DeweyQuestionType;
  prompt: string;

  // multiple_choice
  options?: string[];
  correctIndex?: number;

  // true_false_group — chấm từng phần (1/2.5/5/10), mỗi mệnh đề có gợi ý riêng
  context?: string;
  statements?: Array<{ text: string; correct: boolean; hint?: string }>;

  // short_answer
  correctNumeric?: number;
  tolerance?: number;

  // essay (tự luận) — 2–4 ý; 2 tầng: gợi ý từng ý → đáp án mẫu để HS tự chấm
  essayParts?: Array<{ prompt: string; hint: string; answer: string }>;

  // 4-cấp remediation BẮT BUỘC
  theory: string;          // Sai lần 1 → hiện lý thuyết
  hint1: string;           // Sai lần 2 → gợi ý mức Trung bình
  hint2: string;           // Sai lần 3 → gợi ý mức Yếu
  hint3: string;           // Sai lần 4 → gợi ý mức Kém
  solution: string;        // Hiện cùng hint3 + 0 điểm + next câu
  points: number;          // điểm tối đa của câu (5/10…)
  illustrationHtml?: string; // Hình/SVG minh hoạ (tái dùng từ mảnh kiến thức) cho một số câu luyện tập
}

// ─── Socratic step (dẫn dắt từng bước - Trial and Error UX) ───
export interface DeweySocraticStep {
  id: string;
  prompt: string;
  inputPlaceholder?: string;
  expectedKeywords?: string[];  // Không bắt khớp 100% — chỉ để feedback tham khảo
  feedback: string;             // Hiện DÙ ĐÚNG hay SAI
  formulaToNote?: string;       // Nếu có → tự addNote() vào vở
  illustrationHtml?: string;    // Hình/SVG/mini minh hoạ đặt ngay trong bước học
}

export interface DeweyKnowledgeUnit {
  id: string;
  title: string;
  socraticSteps: DeweySocraticStep[];
  conclusion: string;
  formulaForNotebook: string;
  simulationHtml?: {
    title: string;
    description: string;
    srcDoc: string;
    height?: number;
  };
}

export interface DeweyOlympiaPack {
  id: string;
  packLabel: string;        // "Nhận biết" | "Thông hiểu" | "Vận dụng" (E9) hoặc "10 điểm"… (bài cũ)
  questions: DeweyAdaptiveQuestion[];
}

export interface DeweyExtendStory {
  realWorldContext: string;
  consequence: string;
  expertQuote?: string;
  illustrationHtml?: string; // Mô phỏng (iframe) hoặc hình minh hoạ cho màn Vận dụng — không để toàn chữ
}

export interface DeweySummary {
  mindMapNodes: Array<{ label: string; children?: string[] }>;
  checklistItems: string[];
  timeFillerOptions: Array<{
    label: string;
    type: 'remaining_olympia' | 'extension_story';
    payload?: string;
  }>;
  /** Hoạt động khi học sinh xong sớm còn dư giờ — hiện khi bấm "Hoàn tất sớm". */
  bonusChallenge?: {
    advancedProblem?: { prompt: string; solution: string };
    applicationProblem?: { prompt: string; solution: string };
    readingProblem?: string;
    videoUrl?: string;
    videoLabel?: string;
  };
}

// ─── Engage screen (bước Khởi động) ───
export interface DeweyEngageContent {
  storyHook: string;             // Câu chuyện lịch sử/thực tế
  interactiveSvgId: string;      // ID component từ Library Phase 2
  rawSvgFallback?: string;       // Raw SVG inline khi chưa có component
  realityCheckMessage: string;   // "Cú sốc thực tại"
  guidingQuestion: string;
  guidingQuestionBox?: string;
  stepLabel?: string;
  bigTitle?: string;
  illustration?: {
    type: 'svg-inline' | 'image';
    data: string;
    caption: string;
  };
  interactiveWidget?: {
    type: string;
    title: string;
    htmlInline: string;
    jsInit: string;
  };
  goalSetting?: {
    heading: string;
    placeholder: string;
    aiButtonLabel: string;
    bloomFramework: {
      nhanbiet: string;
      thonghieu: string;
      vandung: string;
    };
  };
  nextButtonLabel?: string;
}

// ─── Pre-test container ───
export interface DeweyPretestContent {
  durationMinutes: number;
  questions: DeweyPretestQuestion[];
  reviewSummary: string;
}

// ─── ROOT: Cấu trúc 1 bài Dewey hoàn chỉnh ───
export interface DeweyLessonContent {
  lessonId?: string;
  title: string;
  subtitle: string;
  durationMinutes: number;       // Mặc định 40

  pretest: DeweyPretestContent;
  engage: DeweyEngageContent;
  knowledgeUnits: DeweyKnowledgeUnit[];
  olympia: {
    packs: [DeweyOlympiaPack, DeweyOlympiaPack, DeweyOlympiaPack];
  };
  extend: DeweyExtendStory;
  summary: DeweySummary;
  skipPretest?: boolean;
}
