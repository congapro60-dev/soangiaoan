import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { callAI, callAIWithVision } from '../lib/aiProviders';
import { AppData, ExamQuestion, QuestionType } from '../types';

type Settings = AppData['settings'];

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Set worker once at module level (shared with TestingTab)
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export const MAX_IMPORT_MB = 20;

/** Convert PDF pages to data URLs */
export const pdfToImages = async (file: File): Promise<string[]> => {
  const ab = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
  const images: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High res for AI
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/jpeg', 0.8));
  }
  return images;
};

/** Crop image from data URL and bounding box [ymin, xmin, ymax, xmax] (0-1000) */
export const cropImage = async (dataUrl: string, box: number[]): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const [ymin, xmin, ymax, xmax] = box;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const w = img.width;
      const h = img.height;
      const left = (xmin / 1000) * w;
      const top = (ymin / 1000) * h;
      const width = ((xmax - xmin) / 1000) * w;
      const height = ((ymax - ymin) / 1000) * h;
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = dataUrl;
  });
};

const uploadBase64 = async (base64: string, name: string): Promise<string> => {
  const path = `exam-images/${Date.now()}_${name}.jpg`;
  const storageRef = ref(storage, path);
  await uploadString(storageRef, base64.split(',')[1], 'base64', { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
};

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

const buildImportPrompt = (examText: string, answerKeyText: string, isVision = false): string => `
BẠN LÀ CHUYÊN GIA PHÂN TÍCH ĐỀ THI VIỆT NAM.
NHIỆM VỤ: Chuyển đổi ${isVision ? 'ẢNH đề thi đính kèm' : 'nội dung đề thi'} thành mảng JSON câu hỏi.

${answerKeyText ? `=== ĐÁP ÁN (FILE RIÊNG) ===\n${answerKeyText}\n\n` : ''}
${isVision
  ? '⚠️ Đề thi ở dạng ẢNH — hãy đọc toàn bộ nội dung từ ảnh đính kèm và phân tích.'
  : `=== ĐỀ THI ===\n${examText}`
}

QUY TẮC PHÂN TÍCH:
1. NHẬN DIỆN CÂU HỎI: Quét toàn bộ văn bản, nhận diện theo "Câu 1", "Câu 2"...
2. PHÂN LOẠI TYPE: "multiple_choice", "true_false" (4 ý a,b,c,d), "short_answer", "essay".
3. HÌNH ẢNH (QUAN TRỌNG): 
   - Nếu một câu hỏi có hình minh họa (đồ thị, hình học, bảng biến thiên...), hãy tìm tọa độ của hình đó trên ảnh.
   - Trả về trường \`imageBox\`: [ymin, xmin, ymax, xmax] với các giá trị 0-1000.
   - Nếu ảnh trải dài trên nhiều trang, hãy chỉ định trang chứa hình trong trường \`pageIndex\` (0-based).
4. CÔNG THỨC TOÁN: Giữ nguyên LaTeX $...$ và $$...$$.
5. OUTPUT BẮT BUỘC: Chỉ trả về mảng JSON thuần.

Ví dụ format:
[
  {
    "id":"q1",
    "type":"multiple_choice",
    "content":"Cho đồ thị hàm số như hình vẽ...",
    "imageBox": [120, 450, 380, 850],
    "pageIndex": 0,
    "options":["A. ...","B. ...","C. ...","D. ..."],
    "correctAnswer":"B",
    "points":0.25
  }
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
  imageBox?: number[];
  pageIndex?: number;
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
  const ext = examFile.name.split('.').pop()?.toLowerCase() ?? '';
  const isImage = IMAGE_EXTS.includes(ext);

  let response: string;

  if (isImage || ext === 'pdf') {
    // Hybrid Vision path for Image and PDF
    const pages = ext === 'pdf' ? await pdfToImages(examFile) : [await fileToDataUrl(examFile)];
    const examText = ext === 'pdf' ? await extractTextFromFile(examFile) : '';
    
    const answerKeyText = answerKeyFile && !IMAGE_EXTS.includes(
      (answerKeyFile.name.split('.').pop() ?? '').toLowerCase()
    ) ? await extractTextFromFile(answerKeyFile) : '';

    const prompt = buildImportPrompt(examText, answerKeyText, true);
    // Send all pages to Vision model
    response = await callAIWithVision(prompt, pages, settings);
    
    const rawList = extractJSON(response);
    const fallbackPoints = Math.max(0.25, Math.round((10 / rawList.length) * 4) / 4);

    return Promise.all(rawList.map(async (q, idx): Promise<ExamQuestion> => {
      const type = normalizeType(q.type, Array.isArray(q.options) && q.options.length > 0);
      const question: ExamQuestion = {
        id: q.id ? String(q.id) : `q${idx + 1}`,
        type,
        content: (q.content ?? q.text ?? '').toString().trim(),
        points: typeof q.points === 'number' && q.points > 0 ? q.points : fallbackPoints,
      };

      // Auto-crop image if detected
      if (q.imageBox && Array.isArray(q.imageBox) && q.imageBox.length === 4) {
        try {
          const pIdx = q.pageIndex ?? 0;
          const sourceImage = pages[pIdx] || pages[0];
          const croppedBase64 = await cropImage(sourceImage, q.imageBox);
          question.imageUrl = await uploadBase64(croppedBase64, `auto_${question.id}`);
        } catch (err) {
          console.error("Auto-crop failed for", question.id, err);
        }
      }

      if (type === 'multiple_choice' && Array.isArray(q.options)) {
        question.options = q.options.map(o => o.toString());
        const ans = (q.correctAnswer ?? q.answer ?? '').toString().trim();
        if (ans) question.correctAnswer = ans.toUpperCase().charAt(0);
      } else if (type === 'true_false') {
        const ans = (q.correctAnswer ?? q.answer ?? '').toString().trim();
        if (Array.isArray(q.options) && q.options.length > 0) {
          question.options = q.options.map(o => o.toString());
          question.correctAnswer = ans;
        } else {
          question.correctAnswer = /^(đ|d|t|true|1)/i.test(ans) ? 'Đúng' : 'Sai';
        }
      } else if (type === 'short_answer') {
        question.correctAnswer = (q.correctAnswer ?? q.answer ?? '').toString().trim();
      }

      if (q.explanation) question.explanation = q.explanation.toString();
      return question;
    }));
  } else {
    // Legacy Text path for DOCX/TXT
    const examText = await extractTextFromFile(examFile);
    const answerKeyText = answerKeyFile ? await extractTextFromFile(answerKeyFile) : '';
    const prompt = buildImportPrompt(examText, answerKeyText);
    response = await callAI(prompt, settings);

    if (!response) throw new Error('AI không trả về dữ liệu.');
    const rawList = extractJSON(response);
    const fallbackPoints = Math.max(0.25, Math.round((10 / rawList.length) * 4) / 4);

    return rawList.map((q, idx): ExamQuestion => {
      const type = normalizeType(q.type, Array.isArray(q.options) && q.options.length > 0);
      const question: ExamQuestion = {
        id: q.id ? String(q.id) : `q${idx + 1}`,
        type,
        content: (q.content ?? q.text ?? '').toString().trim(),
        points: typeof q.points === 'number' && q.points > 0 ? q.points : fallbackPoints,
      };
      if (type === 'multiple_choice' && Array.isArray(q.options)) {
        question.options = q.options.map(o => o.toString());
        const ans = (q.correctAnswer ?? q.answer ?? '').toString().trim();
        if (ans) question.correctAnswer = ans.toUpperCase().charAt(0);
      } else if (type === 'true_false') {
        const ans = (q.correctAnswer ?? q.answer ?? '').toString().trim();
        if (Array.isArray(q.options) && q.options.length > 0) {
          question.options = q.options.map(o => o.toString());
          question.correctAnswer = ans;
        } else {
          question.correctAnswer = /^(đ|d|t|true|1)/i.test(ans) ? 'Đúng' : 'Sai';
        }
      } else if (type === 'short_answer') {
        question.correctAnswer = (q.correctAnswer ?? q.answer ?? '').toString().trim();
      }
      if (q.explanation) question.explanation = q.explanation.toString();
      return question;
    });
  }
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
