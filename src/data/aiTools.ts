import {
  Bot,
  Brush,
  Code2,
  FileText,
  Image,
  Lightbulb,
  Presentation,
  SearchCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type AIToolCategory = 'prompt' | 'education' | 'design' | 'coding' | 'research' | 'utility';

export interface AIToolLink {
  id: string;
  name: string;
  description: string;
  url?: string;
  category: AIToolCategory;
  icon: LucideIcon;
  badge?: string;
  featured?: boolean;
  internalAction?: 'prompt-writer';
}

export const AI_TOOL_LINKS: AIToolLink[] = [
  {
    id: 'prompt-writer',
    name: 'Viết Prompt AI',
    description: 'Biến một ý tưởng mơ hồ thành prompt rõ ràng để dùng với Gemini, Claude, Copilot, công cụ tạo ảnh hoặc coding AI.',
    category: 'prompt',
    icon: Sparkles,
    badge: 'Nội bộ',
    featured: true,
    internalAction: 'prompt-writer',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Dùng prompt đã tối ưu để tạo nội dung, phân tích tài liệu, viết bài giảng hoặc gợi ý hoạt động học tập.',
    url: 'https://gemini.google.com/',
    category: 'education',
    icon: Bot,
    badge: 'AI chat',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    description: 'Tra cứu, kiểm chứng thông tin và tổng hợp nguồn tham khảo nhanh cho giáo viên.',
    url: 'https://www.perplexity.ai/',
    category: 'research',
    icon: SearchCheck,
    badge: 'Research',
  },
  {
    id: 'canva',
    name: 'Canva AI',
    description: 'Tạo thiết kế, slide, poster lớp học hoặc học liệu trực quan từ prompt.',
    url: 'https://www.canva.com/ai/',
    category: 'design',
    icon: Presentation,
    badge: 'Design',
  },
  {
    id: 'gamma',
    name: 'Gamma',
    description: 'Tạo slide thuyết trình, tài liệu trình chiếu hoặc outline bài giảng từ prompt.',
    url: 'https://gamma.app/',
    category: 'design',
    icon: FileText,
    badge: 'Slides',
  },
  {
    id: 'image-prompt',
    name: 'Prompt ảnh minh hoạ',
    description: 'Dùng cùng công cụ tạo ảnh để tạo tranh minh hoạ, sơ đồ trực quan hoặc bối cảnh bài học.',
    category: 'design',
    icon: Image,
    badge: 'Sắp mở rộng',
  },
  {
    id: 'coding-prompt',
    name: 'Prompt sửa code an toàn',
    description: 'Tạo prompt có phạm vi file, điều kiện dừng và tiêu chí kiểm tra khi làm việc với coding agent.',
    category: 'coding',
    icon: Code2,
    badge: 'Prompt',
  },
  {
    id: 'idea-lab',
    name: 'Kho ý tưởng sư phạm',
    description: 'Khu vực dự kiến để lưu các link/công cụ hay mà bạn bổ sung sau này.',
    category: 'utility',
    icon: Lightbulb,
    badge: 'Placeholder',
  },
  {
    id: 'visual-design',
    name: 'Công cụ thiết kế học liệu',
    description: 'Nhóm công cụ vẽ sơ đồ, poster, infographic hoặc worksheet trực quan cho lớp học.',
    category: 'design',
    icon: Brush,
    badge: 'Mở rộng sau',
  },
];

export const AI_TOOL_CATEGORY_LABELS: Record<AIToolCategory, string> = {
  prompt: 'Viết prompt',
  education: 'Giáo dục',
  design: 'Thiết kế',
  coding: 'Lập trình',
  research: 'Tra cứu',
  utility: 'Tiện ích',
};
