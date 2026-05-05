import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { callAI } from '../lib/aiProviders';
import { AppData, ExamQuestion, QuestionType } from '../types';

type Settings = AppData['settings'];

// Set worker once at module level (shared with TestingTab)
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export const MAX_IMPORT_MB = 20;

/** Extract plain text from PDF / DOCX / TXT (best-effort) */
export const extractTextFromFile = async (file: File): Promise<string> => {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'docx') {
    const ab = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: ab });
    return result.value;
  }
  if (ext === 'pdf') {
    const ab = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      text += tc.items.map((it: any) => it.str).join(' ') + '\n';
    }
    return text;
  }
  // Plain text fallback
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve((e.target?.result as string) ?? '');
    reader.readAsText(file);
  });
};

// ─── AI prompt ──────────────────────────────────────────────────────────────

const buildImportPrompt = (examText: string, answerKeyText: string): string => `
BẠN LÀ CHUYÊN GIA PHÂN TÍCH ĐỀ THI VIỆT NAM.
NHIỆM VỤ: Chuyển đổi nội dung đề thi thành mảng JSON câu hỏi cho hệ thống thi trực tuyến.

${answerKeyText ? `=== ĐÁP ÁN (FILE RIÊNG) ===\n${answerKeyText}\n\n` : ''}
=== ĐỀ THI ===
${examText}

QUY TẮC PHÂN TÍCH:

1. NHẬN DIỆN CÂU HỎI: Quét toàn bộ văn bản, nhận diện theo "Câu 1", "Câu 2"... hoặc số thứ tự 1./2./...

2. PHÂN LOẠI TYPE:
   • "multiple_choice" — có đúng 4 phương án A/B/C/D
   • "true_false"      — câu Đúng/Sai có 4 ý a, b, c, d
     → KHÔNG TÁCH thành câu riêng. Giữ nguyên 1 câu, nhét 4 ý vào mảng options:
        options: ["a. [nội dung ý a]", "b. [nội dung ý b]", "c. [nội dung ý c]", "d. [nội dung ý d]"]
        correctAnswer: chuỗi 4 giá trị "Đ" hoặc "S" cách nhau bằng dấu phẩy theo thứ tự a,b,c,d
        VD: "Đ,S,Đ,S" nghĩa là ý a Đúng, ý b Sai, ý c Đúng, ý d Sai
   • "short_answer"    — điền số, điền từ, trả lời ngắn (1-3 từ)
   • "essay"           — tự luận dài, không có đáp án cố định

3. ĐÁNH SỐ ID: "q1", "q2", "q3"... (true_false KHÔNG dùng q2a/q2b nữa)

4. CÔNG THỨC TOÁN: Giữ nguyên LaTeX $...$ và $$...$$

5. correctAnswer:
   • multiple_choice: một chữ cái "A", "B", "C", hoặc "D"
   • true_false: chuỗi "Đ,S,Đ,S" theo thứ tự 4 ý a,b,c,d
   • short_answer: chuỗi đáp án ngắn (có thể là số, ví dụ "3.14")
   • essay: KHÔNG có trường correctAnswer

6. ĐIỂM (points):
   • Đọc từ đề nếu ghi rõ (VD: "0.5 điểm", "(1đ)")
   • Nếu không ghi: phân bổ đều tổng 10 điểm theo từng phần

7. explanation: trích lời giải / gợi ý đáp án nếu có trong đề

OUTPUT BẮT BUỘC: Chỉ trả về mảng JSON thuần, không bọc markdown, không chú thích.
Ví dụ format:
[
  {"id":"q1","type":"multiple_choice","content":"Nội dung câu 1","options":["A. ...","B. ...","C. ...","D. ..."],"correctAnswer":"B","points":0.25},
  {"id":"q2","type":"true_false","content":"Nội dung câu 2 (thân câu chung)","options":["a. Nội dung ý a","b. Nội dung ý b","c. Nội dung ý c","d. Nội dung ý d"],"correctAnswer":"Đ,S,Đ,S","points":1},
  {"id":"q3","type":"short_answer","content":"Nội dung câu 3","correctAnswer":"42","points":0.5},
  {"id":"q4","type":"essay","content":"Nội dung câu tự luận","points":2}
]
`.trim();

// ─── Types ───────────────────────────────────────────────────────────────────

interface RawQ {
  id?: string | number;
  type?: string;
  content?: string;
  text?: string;
  options?: string[];
  correctAnswer?: string;
  answer?: string;
  points?: number;
  explanation?: string;
}

const normalizeType = (t: string | undefined, hasOptions: boolean): QuestionType => {
  const s = (t ?? '').toLowerCase();
  if (s.includes('multi') || s === 'mcq') return 'multiple_choice';
  if (s.includes('true') || s.includes('false') || s.includes('đúng') || s.includes('sai')) return 'true_false';
  if (s.includes('short') || s.includes('điền') || s.includes('ngắn')) return 'short_answer';
  if (s.includes('essay') || s.includes('luận')) return 'essay';
  return hasOptions ? 'multiple_choice' : 'essay';
};

const extractJSON = (raw: string): RawQ[] => {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = fence ? fence[1] : raw;
  const arr = src.match(/\[[\s\S]*\]/);
  if (!arr) throw new Error('AI không trả về mảng JSON câu hỏi hợp lệ.');
  return JSON.parse(arr[0]);
};

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Parse exam questions from uploaded files.
 * @param examFile      - file containing the exam (PDF/DOCX/TXT)
 * @param answerKeyFile - optional separate answer key; pass null if included in exam file
 * @param settings      - AI provider settings
 */
export const parseExamFromFiles = async (
  examFile: File,
  answerKeyFile: File | null,
  settings: Settings,
): Promise<ExamQuestion[]> => {
  const examText = await extractTextFromFile(examFile);
  if (!examText.trim()) throw new Error('Không trích xuất được nội dung từ file đề.');

  const answerKeyText = answerKeyFile ? await extractTextFromFile(answerKeyFile) : '';

  const prompt = buildImportPrompt(examText, answerKeyText);
  const response = await callAI(prompt, settings);
  if (!response) throw new Error('AI không trả về dữ liệu.');

  const rawList = extractJSON(response);
  if (!Array.isArray(rawList) || rawList.length === 0)
    throw new Error('Không nhận diện được câu hỏi nào. Vui lòng kiểm tra lại file đề.');

  const totalQ = rawList.length;
  const fallbackPoints = Math.max(0.25, Math.round((10 / totalQ) * 4) / 4);

  return rawList.map((q, idx): ExamQuestion => {
    const type = normalizeType(q.type, Array.isArray(q.options) && q.options.length > 0);
    const content = (q.content ?? q.text ?? '').toString().trim();
    const points = typeof q.points === 'number' && q.points > 0 ? q.points : fallbackPoints;
    const rawAnswer = (q.correctAnswer ?? q.answer ?? '').toString().trim();

    const question: ExamQuestion = {
      id: q.id ? String(q.id) : `q${idx + 1}`,
      type,
      content,
      points,
    };

    if (type === 'multiple_choice' && Array.isArray(q.options)) {
      question.options = q.options.map(o => o.toString());
      if (rawAnswer) question.correctAnswer = rawAnswer.toUpperCase().charAt(0);
    } else if (type === 'true_false') {
      if (Array.isArray(q.options) && q.options.length > 0) {
        // Compound T/F: keep options + correctAnswer as "Đ,S,Đ,S"
        question.options = q.options.map(o => o.toString());
        question.correctAnswer = rawAnswer; // already "Đ,S,Đ,S" from AI
      } else {
        // Simple T/F (no sub-items)
        question.correctAnswer = /^(đ|d|t|true|1)/i.test(rawAnswer) ? 'Đúng' : 'Sai';
      }
    } else if (type === 'short_answer' && rawAnswer) {
      question.correctAnswer = rawAnswer;
    }

    if (q.explanation) question.explanation = q.explanation.toString();
    return question;
  });
};

/** Count question types for display in the review step */
export const summarizeQuestions = (questions: ExamQuestion[]) => ({
  total: questions.length,
  mcq: questions.filter(q => q.type === 'multiple_choice').length,
  trueFalse: questions.filter(q => q.type === 'true_false').length,
  shortAnswer: questions.filter(q => q.type === 'short_answer').length,
  essay: questions.filter(q => q.type === 'essay').length,
  maxScore: questions.reduce((s, q) => s + (q.points ?? 0), 0),
});
