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
4. Với "multiple_choice": "options" là mảng 4 chuỗi bắt đầu "A. ", "B. ", "C. ", "D. "; "correctAnswer" là 1 chữ cái "A"/"B"/"C"/"D".
5. Với "true_false": "correctAnswer" là "Đúng" hoặc "Sai".
6. Với "short_answer": "correctAnswer" là chuỗi đáp án ngắn.
7. Với "essay": bỏ "correctAnswer", để trống để giáo viên / AI chấm sau.
8. "points": nếu đề không ghi rõ, chia đều tổng 10 điểm cho số câu (làm tròn 0.25).
9. "explanation": trích từ phần lời giải / đáp án nếu có.
10. Chỉ trả về mảng JSON thuần (không bọc markdown, không chú thích).

ĐỊNH DẠNG OUTPUT BẮT BUỘC:
[
  {"id":"q1","type":"multiple_choice","content":"Nội dung câu","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"A","points":0.5,"explanation":"..."},
  {"id":"q2","type":"essay","content":"Nội dung câu tự luận","points":2}
]

NỘI DUNG ĐỀ:
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
