export type PromptTargetTool =
  | 'Google Gemini'
  | 'Claude'
  | 'Microsoft Copilot'
  | 'Perplexity'
  | 'Canva AI'
  | 'Midjourney / Image AI'
  | 'Cursor / Coding AI'
  | 'AI bất kỳ';

export type PromptPurpose =
  | 'Giáo án / bài giảng'
  | 'Đề kiểm tra / quiz'
  | 'Nhận xét / phản hồi học sinh'
  | 'Slide / thuyết trình'
  | 'Hình ảnh minh hoạ'
  | 'Mô phỏng / code HTML'
  | 'Sửa code / lập trình'
  | 'Tra cứu / tổng hợp tài liệu'
  | 'Khác';

export type PromptDetailLevel = 'Ngắn gọn' | 'Vừa đủ' | 'Rất chi tiết';

export interface PromptWriterInput {
  rawRequest: string;
  targetTool: PromptTargetTool;
  purpose: PromptPurpose;
  detailLevel: PromptDetailLevel;
  outputLanguage: 'Tiếng Việt' | 'English';
  outputFormat: 'Markdown' | 'Bảng' | 'JSON' | 'Checklist' | 'Code' | 'Tự chọn';
}

export const PROMPT_TARGET_TOOLS: PromptTargetTool[] = [
  'Google Gemini',
  'Claude',
  'Microsoft Copilot',
  'Perplexity',
  'Canva AI',
  'Midjourney / Image AI',
  'Cursor / Coding AI',
  'AI bất kỳ',
];

export const PROMPT_PURPOSES: PromptPurpose[] = [
  'Giáo án / bài giảng',
  'Đề kiểm tra / quiz',
  'Nhận xét / phản hồi học sinh',
  'Slide / thuyết trình',
  'Hình ảnh minh hoạ',
  'Mô phỏng / code HTML',
  'Sửa code / lập trình',
  'Tra cứu / tổng hợp tài liệu',
  'Khác',
];

export const PROMPT_DETAIL_LEVELS: PromptDetailLevel[] = ['Ngắn gọn', 'Vừa đủ', 'Rất chi tiết'];

export function buildPromptWriterPrompt(input: PromptWriterInput): string {
  return `Bạn là chuyên gia thiết kế prompt cho giáo viên và người dùng phổ thông.

NHIỆM VỤ
Biến yêu cầu thô của người dùng thành một prompt hoàn chỉnh, rõ ràng, có thể copy dùng trực tiếp trong công cụ AI đích.

THÔNG TIN CẤU HÌNH
- Công cụ AI đích: ${input.targetTool}
- Mục đích: ${input.purpose}
- Mức chi tiết: ${input.detailLevel}
- Ngôn ngữ prompt cần tạo: ${input.outputLanguage}
- Định dạng đầu ra mong muốn từ công cụ AI đích: ${input.outputFormat}

YÊU CẦU THÔ CỦA NGƯỜI DÙNG
"""
${input.rawRequest.trim()}
"""

QUY TẮC VIẾT PROMPT
- Không thực hiện trực tiếp yêu cầu thô; chỉ viết prompt để người dùng copy sang công cụ AI khác.
- Nếu thiếu thông tin, dùng giả định hợp lý và ghi rõ trong phần "Giả định".
- Prompt hoàn chỉnh phải có: vai trò, mục tiêu, bối cảnh, đầu vào, đầu ra cần có, ràng buộc, tiêu chí tự kiểm tra.
- Nếu mục đích là hình ảnh, ưu tiên mô tả chủ thể, phong cách, bố cục, ánh sáng, màu sắc và negative prompt.
- Nếu mục đích là sửa code, bắt buộc có phạm vi file, điều không được sửa, điều kiện dừng hỏi người dùng, và tiêu chí kiểm tra.
- Nếu mục đích giáo dục, ưu tiên đối tượng học sinh, khối lớp, mức độ, chuẩn đầu ra, hoạt động học tập và đánh giá.
- Mức "Ngắn gọn" tối đa khoảng 180 từ; "Vừa đủ" khoảng 250-450 từ; "Rất chi tiết" có thể dài hơn nhưng không lan man.

ĐẦU RA BẮT BUỘC
Trả về đúng cấu trúc sau:

## Prompt hoàn chỉnh
\`\`\`text
[prompt có thể copy trực tiếp]
\`\`\`

## Vì sao prompt này tốt hơn
- [3-5 gạch đầu dòng ngắn]

## Giả định đã dùng
- [liệt kê giả định, nếu không có thì ghi "Không có"]`;
}
