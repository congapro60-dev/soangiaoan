import { callAI } from '../lib/aiProviders';
import { ExamQuestion, ParsedExamBundle } from '../types';

const BUNDLES_KEY = 'parsed_exam_bundles';
const MAX_BUNDLES = 10;

const PARSE_PROMPT = (markdown: string) => `BẠN LÀ CHUYÊN GIA DỮ LIỆU ĐỀ THI VIỆT NAM.
NHIỆM VỤ: Phân tích toàn bộ đề thi và trả về mảng JSON.

PHÂN LOẠI THEO PHẦN:
- PHẦN I (hoặc "Phần 1", "I.") → type: "multiple_choice" — có 4 phương án A/B/C/D
- PHẦN II (hoặc "Phần 2", "II.") → type: "true_false" — có 4 ý a,b,c,d; mỗi ý Đúng/Sai
- PHẦN III (hoặc "Phần 3", "III.") → type: "short_answer" — đáp án là số
- PHẦN IV (hoặc "Phần 4", "IV.", "Tự luận") → type: "essay" — correctAnswer để ""

FORMAT JSON BẮT BUỘC (mảng, chỉ JSON, không giải thích thêm):
[
  {"id":"q1","type":"multiple_choice","content":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"B","points":0.25},
  {"id":"q13","type":"true_false","content":"...","options":["a. ...","b. ...","c. ...","d. ..."],"correctAnswer":"Đ,S,Đ,S","points":1},
  {"id":"q17","type":"short_answer","content":"...","options":[],"correctAnswer":"2025","points":0.5},
  {"id":"q23","type":"essay","content":"...","options":[],"correctAnswer":"","points":2}
]

LƯU Ý:
- Giữ nguyên công thức LaTeX ($...$, $$...$$)
- true_false: correctAnswer = 4 giá trị "Đ" hoặc "S" cách nhau bằng dấu phẩy, theo thứ tự ý a,b,c,d
- Nếu không có đáp án trong đề → correctAnswer = "" (teacher fills later)
- points: MCQ=0.25, true_false=1, short_answer=0.5, essay suy ra từ đề (thường 1-3đ)

ĐỀ THI:
${markdown}`;

export const parseExamMarkdown = async (
  markdown: string,
  settings: any
): Promise<ExamQuestion[]> => {
  const response = await callAI(PARSE_PROMPT(markdown), settings);
  if (!response) throw new Error('AI không trả về dữ liệu');

  // Extract JSON array from response (may contain markdown fences)
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Không tìm thấy dữ liệu JSON trong phản hồi');

  const parsed = JSON.parse(jsonMatch[0]) as ExamQuestion[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Đề thi không có câu hỏi nào');
  }
  return parsed;
};

export const saveBundle = (bundle: ParsedExamBundle): void => {
  try {
    const existing = loadBundles();
    const updated = [bundle, ...existing.filter(b => b.id !== bundle.id)].slice(0, MAX_BUNDLES);
    localStorage.setItem(BUNDLES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Lỗi lưu bundle:', e);
  }
};

export const loadBundles = (): ParsedExamBundle[] => {
  try {
    const raw = localStorage.getItem(BUNDLES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ParsedExamBundle[];
  } catch {
    return [];
  }
};

export const deleteBundleById = (id: string): void => {
  try {
    const updated = loadBundles().filter(b => b.id !== id);
    localStorage.setItem(BUNDLES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Lỗi xóa bundle:', e);
  }
};
