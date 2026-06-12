import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_RUNTIME_MODEL } from '../lib/gemini';
import type { ExamQuestion, QuestionType } from '../types';

interface RawOnlineExamQuestion {
  id?: unknown;
  type?: unknown;
  content?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  points?: unknown;
  explanation?: unknown;
}

const ONLINE_EXAM_PARSER_MAX_OUTPUT_TOKENS = 65536;

const ONLINE_EXAM_PARSER_SYSTEM_INSTRUCTION = `Bạn là bộ chuyển đổi dữ liệu đề thi sang JSON cho hệ thống thi trực tuyến.
Chỉ trả về JSON hợp lệ. Không thêm Markdown, không thêm chú thích, không bọc trong code fence.`;

const buildOnlineExamParserPrompt = (markdownContent: string): string => `
NHIỆM VỤ
Chuyển đổi nội dung đề thi Markdown bên dưới thành một mảng JSON ExamQuestion[] nghiêm ngặt để lưu vào Firestore cho hệ thống thi trực tuyến.

YÊU CẦU BẮT BUỘC
1. Trích xuất đầy đủ mọi câu hỏi xuất hiện trong đề. Không bỏ sót câu.
2. Xác định loại câu hỏi:
   - "multiple_choice": câu có các lựa chọn A/B/C/D.
   - "true_false": câu đúng/sai hoặc có các ý a/b/c/d cần đánh giá Đúng/Sai.
   - "short_answer": câu trả lời ngắn / điền đáp án.
   - "essay": câu tự luận dài.
3. Với câu trắc nghiệm (multiple_choice) và đúng/sai (true_false), BẮT BUỘC trích xuất đủ các phương án vào mảng "options".
   - multiple_choice: ["A. ...", "B. ...", "C. ...", "D. ..."].
   - true_false: ["a. ...", "b. ...", "c. ...", "d. ..."] (phải tách các ý a, b, c, d ra khỏi đề bài).
4. Xác định correctAnswer bằng cách đối chiếu với bảng đáp án / answer key / lời giải ở cuối Markdown. Không đoán nếu không có dữ liệu chắc chắn.
   - multiple_choice: correctAnswer là một chữ cái "A", "B", "C" hoặc "D".
   - true_false: correctAnswer là chuỗi gồm 4 chữ "Đ" hoặc "S" viết liền cách nhau bằng dấu phẩy, ví dụ "Đ,S,Đ,S".
   - short_answer: correctAnswer là chuỗi đáp án ngắn.
   - essay: không cần correctAnswer nếu đáp án không rõ; đưa gợi ý/lời giải vào explanation nếu có.
5. Nếu có lời giải, ghi chú, giải thích trong bảng đáp án hoặc phần lời giải, đưa vào explanation.
6. Nếu có hình minh họa SVG trong Markdown, giữ nguyên mã SVG liên quan và chèn vào trường content của đúng câu hỏi. Không chuyển SVG sang mô tả chữ.
7. Giữ nguyên công thức Toán/LaTeX, ký hiệu đặc biệt, bảng nhỏ hoặc dữ kiện quan trọng trong content/options. TUYỆT ĐỐI KHÔNG xóa dấu $ hoặc $$ của công thức Toán. Nếu gặp công thức chưa bọc $, PHẢI tự bọc trong dấu $...$.
8. Mỗi câu phải có id duy nhất dạng "q1", "q2", "q3"... theo thứ tự xuất hiện.
9. points phải là số. Nếu đề không ghi điểm từng câu, chia đều tổng 10 điểm cho số câu và làm tròn đến 0.25.
10. Chỉ trả về JSON array thuần, tuyệt đối không trả về object bọc ngoài.

JSON SCHEMA BẮT BUỘC
[
  {
    "id": "generate_a_unique_string",
    "type": "multiple_choice",
    "content": "Question text here (include SVG code here if any)",
    "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "correctAnswer": "A",
    "points": 1,
    "explanation": "Extract from answer key if available"
  }
]

RÀNG BUỘC KIỂU DỮ LIỆU
- id: string, bắt buộc.
- type: một trong "multiple_choice", "true_false", "short_answer", "essay".
- content: string, bắt buộc, không rỗng.
- options: dùng cho multiple_choice và true_false; là string[]. Với true_false, mảng này chứa 4 phát biểu a, b, c, d.
- correctAnswer: string, chỉ đưa vào khi có đáp án chắc chắn hoặc cần cho auto-grade.
- points: number, bắt buộc.
- explanation: string, tùy chọn.

NỘI DUNG MARKDOWN CẦN PARSE
---BEGIN MARKDOWN---
${markdownContent}
---END MARKDOWN---
`.trim();

const stripJsonFence = (raw: string): string => {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
};

const normalizeQuestionType = (value: unknown, hasOptions: boolean): QuestionType => {
  const type = String(value || '').toLowerCase();
  if (type === 'multiple_choice' || type.includes('multi') || type.includes('trắc nghiệm') || type === 'mcq') {
    return 'multiple_choice';
  }
  if (type === 'true_false' || type.includes('true') || type.includes('đúng') || type.includes('dung')) {
    return 'true_false';
  }
  if (type === 'short_answer' || type.includes('short') || type.includes('trả lời ngắn') || type.includes('tra loi ngan')) {
    return 'short_answer';
  }
  if (type === 'essay' || type.includes('tự luận') || type.includes('tu luan')) {
    return 'essay';
  }
  return hasOptions ? 'multiple_choice' : 'essay';
};

const toFinitePositiveNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeOnlineExamQuestions = (rawQuestions: RawOnlineExamQuestion[]): ExamQuestion[] => {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error('Gemini không trả về câu hỏi hợp lệ.');
  }

  const defaultPoints = Math.max(0.25, Math.round((10 / rawQuestions.length) * 4) / 4);

  const questions = rawQuestions.map((raw, index): ExamQuestion => {
    const rawOptions = Array.isArray(raw.options)
      ? raw.options.map(option => String(option).trim()).filter(Boolean)
      : undefined;
    const type = normalizeQuestionType(raw.type, Boolean(rawOptions?.length));
    const content = String(raw.content || '').trim();

    if (!content) {
      throw new Error(`Câu ${index + 1} thiếu nội dung.`);
    }

    const question: ExamQuestion = {
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `q${index + 1}`,
      type,
      content,
      points: toFinitePositiveNumber(raw.points, defaultPoints),
    };

    if (type === 'multiple_choice' || type === 'true_false') {
      if (!rawOptions || rawOptions.length === 0) {
        throw new Error(`Câu ${index + 1} (${type}) thiếu options.`);
      }
      question.options = rawOptions;
    }

    if (typeof raw.correctAnswer === 'string' && raw.correctAnswer.trim()) {
      const correctAnswer = raw.correctAnswer.trim();
      question.correctAnswer = type === 'multiple_choice'
        ? correctAnswer.toUpperCase().charAt(0)
        : correctAnswer;
    }

    if (typeof raw.explanation === 'string' && raw.explanation.trim()) {
      question.explanation = raw.explanation.trim();
    }

    return question;
  });

  const seenIds = new Set<string>();
  return questions.map((question, index) => {
    const fallbackId = `q${index + 1}`;
    if (!seenIds.has(question.id)) {
      seenIds.add(question.id);
      return question;
    }
    seenIds.add(fallbackId);
    return { ...question, id: fallbackId };
  });
};

export async function parseMarkdownToOnlineExam(
  markdownContent: string,
  geminiApiKey: string
): Promise<ExamQuestion[]> {
  if (!markdownContent.trim()) {
    throw new Error('Nội dung đề thi trống.');
  }
  if (!geminiApiKey.trim()) {
    throw new Error('Thiếu Gemini API key để phân tích đề thi online.');
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey, httpOptions: { apiVersion: 'v1beta' } });
  const response = await ai.models.generateContent({
    model: DEFAULT_GEMINI_RUNTIME_MODEL,
    contents: [{ parts: [{ text: buildOnlineExamParserPrompt(markdownContent) }] }],
    config: {
      temperature: 0,
      maxOutputTokens: ONLINE_EXAM_PARSER_MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
      systemInstruction: ONLINE_EXAM_PARSER_SYSTEM_INSTRUCTION,
    },
  });

  const rawText = response.text || '';
  if (!rawText.trim()) {
    throw new Error('Gemini không trả về JSON câu hỏi.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(rawText));
  } catch (error) {
    console.error('Invalid online exam parser JSON:', rawText, error);
    throw new Error('Gemini trả về JSON không hợp lệ cho đề thi online.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini phải trả về một mảng ExamQuestion[].');
  }

  return normalizeOnlineExamQuestions(parsed as RawOnlineExamQuestion[]);
}
