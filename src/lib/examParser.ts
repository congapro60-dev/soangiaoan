import { callAI } from './aiProviders';
import { AppData, ExamQuestion, QuestionType } from '../types';

type Settings = AppData['settings'];

interface RawParsedQuestion {
  id?: number | string;
  type?: string;
  text?: string;
  content?: string;
  options?: string[];
  answer?: string;
  correctAnswer?: string;
  points?: number;
  explanation?: string;
}

const PARSE_PROMPT = (markdown: string) => `
BẠN LÀ CHUYÊN GIA DỮ LIỆU ĐỀ THI.
NHIỆM VỤ: Chuyển đổi nội dung đề thi (kèm đáp án nếu có) thành mảng JSON cho hệ thống thi trực tuyến.

YÊU CẦU NGHIÊM NGẶT:
1. Nhận diện từng câu (Câu 1, Câu 2... hoặc 1., 2., ...).
2. Phân loại "type": "multiple_choice" (có 4 phương án A/B/C/D), "true_false" (Đúng/Sai), "short_answer" (điền từ/đáp án ngắn), hoặc "essay" (tự luận dài).
3. Giữ nguyên công thức LaTeX ($...$, $$...$$).
4. BẮT BUỘC TRÍCH XUẤT HÌNH VẼ: Nếu trong nội dung câu hỏi có khối mã \`\`\`xml ... \`\`\` chứa thẻ <svg>, bạn PHẢI đưa toàn bộ khối mã đó vào trường "content". Tuyệt đối không được bỏ sót hình vẽ minh họa.
5. Với "multiple_choice": 
   - Trường "options": Chỉ lấy nội dung đáp án thuần túy, KHÔNG BAO GỒM các ký hiệu tiền tố như "A.", "B.", "- **A.**". (Ví dụ: Thay vì lấy "- **A.** 2x + 1", chỉ lấy "2x + 1").
   - Trường "correctAnswer": Dựa vào Bảng Đáp Án ở cuối đề, ghi 1 chữ cái "A", "B", "C", hoặc "D".
6. Với "true_false": "correctAnswer" là "Đúng" hoặc "Sai" dựa trên Bảng Đáp án.
7. Với "short_answer": "correctAnswer" là chuỗi đáp án ngắn lấy từ Bảng Đáp án.
8. Với "essay": để trống "correctAnswer" để giáo viên chấm sau.
9. "points": Nếu đề không ghi rõ, chia đều tổng điểm cho số câu.
10. "explanation": Trích xuất lời giải chi tiết tương ứng với từng câu từ phần Lời giải (nếu có).
11. BẮT BUỘC trả về CHỈ MỘT MẢNG JSON thuần túy (không bọc markdown, không chứa chú thích).

ĐỊNH DẠNG OUTPUT BẮT BUỘC (Ví dụ):
[
  {
    "id": "q1",
    "type": "multiple_choice",
    "content": "Giá trị lớn nhất của hàm số là bao nhiêu? \\n\\n \`\`\`xml <svg>...</svg> \`\`\`",
    "options": ["2", "4", "6", "8"],
    "correctAnswer": "B",
    "points": 0.5,
    "explanation": "Ta có đạo hàm y' = ..."
  }
]

NỘI DUNG ĐỀ (Bao gồm cả Đề, Bảng Đáp Án và Lời giải chi tiết):
${markdown}
`;

const extractJSONArray = (raw: string): string => {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cleaned = fenceMatch ? fenceMatch[1] : raw;
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!arrMatch) throw new Error('Không tìm thấy JSON câu hỏi trong phản hồi AI.');
  return arrMatch[0];
};

const normalizeType = (type: string | undefined, hasOptions: boolean): QuestionType => {
  const t = (type || '').toLowerCase();
  if (t.includes('multi') || t === 'mcq') return 'multiple_choice';
  if (t.includes('true') || t.includes('đúng')) return 'true_false';
  if (t.includes('short') || t.includes('điền') || t.includes('dien')) return 'short_answer';
  if (t.includes('essay') || t.includes('tự luận') || t.includes('tu luan')) return 'essay';
  return hasOptions ? 'multiple_choice' : 'essay';
};

export const parseMarkdownToQuestions = async (
  markdown: string,
  settings: Settings
): Promise<ExamQuestion[]> => {
  if (!markdown.trim()) throw new Error('Nội dung đề trống.');

  const response = await callAI(PARSE_PROMPT(markdown), settings);
  if (!response) throw new Error('AI không trả về dữ liệu.');

  const jsonStr = extractJSONArray(response);
  const raw = JSON.parse(jsonStr) as RawParsedQuestion[];
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Không parse được câu hỏi nào.');

  const questionCount = raw.length;
  const defaultPoints = Math.max(0.25, Math.round((10 / questionCount) * 4) / 4);

  return raw.map((q, idx) => {
    const type = normalizeType(q.type, Array.isArray(q.options) && q.options.length > 0);
    const content = (q.content || q.text || '').toString().trim();
    const points = typeof q.points === 'number' && q.points > 0 ? q.points : defaultPoints;
    const correct = (q.correctAnswer || q.answer || '').toString().trim();

    const question: ExamQuestion = {
      id: `q${idx + 1}`,
      type,
      content,
      points,
    };

    if (type === 'multiple_choice' && Array.isArray(q.options)) {
      question.options = q.options.map(o => o.toString());
      if (correct) question.correctAnswer = correct.toUpperCase().charAt(0);
    } else if (type === 'true_false') {
      question.correctAnswer = /^(đ|d|t|true|1)/i.test(correct) ? 'Đúng' : 'Sai';
    } else if (type === 'short_answer') {
      if (correct) question.correctAnswer = correct;
    }

    if (q.explanation) question.explanation = q.explanation.toString();
    return question;
  });
};

export const generateExamCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

export const calculateMaxScore = (questions: ExamQuestion[]): number =>
  questions.reduce((sum, q) => sum + (q.points || 0), 0);
