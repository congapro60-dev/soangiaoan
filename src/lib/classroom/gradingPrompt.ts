import { parseLooseJson } from '../../utils/jsonRepair.js';

/**
 * Prompt và bộ đọc kết quả cho việc chấm bài tập về nhà.
 *
 * MỘT nguồn sự thật cho cả hai đường: đường client cũ trong `GradingTab` và đường server mới
 * `api/grade-homework.ts`. Chép prompt sang hai nơi là kiểu lỗi repo này đã trả giá với bộ hằng
 * số bố cục form Toán — sửa một chỗ, người dùng vẫn thấy sai ở chỗ kia.
 */

export interface HomeworkGradingInput {
  /** Đáp án chuẩn dạng văn bản. Rỗng = tầng 3: không có đề, AI phải tự đọc đề trong ảnh. */
  answerKey: string;
  /** Hướng dẫn chấm của giáo viên: cách cho điểm thành phần, mức trừ điểm... */
  rubric?: string;
  maxScore: number;
  assignmentTitle?: string;
  /** Số ảnh đáp án gửi kèm TRƯỚC ảnh bài làm. AI phải biết để không chấm nhầm đáp án thành bài em. */
  answerKeyImageCount?: number;
}

export interface HomeworkGrade {
  score: number;
  maxScore: number;
  /** Nhận xét viết CHO HỌC SINH đọc. */
  feedbackForStudent: string;
  /** Ghi chú cho giáo viên — mức độ, so với lớp. Không đưa nguyên văn cho học sinh. */
  noteForTeacher: string;
  strengths: string[];
  weaknesses: string[];
  /** Chủ đề em còn yếu, để dựng hồ sơ tích luỹ. Rỗng nếu không đủ căn cứ. */
  weakTopics: string[];
  /** true khi chấm mà KHÔNG có đáp án chuẩn — kết quả kém tin cậy hơn. */
  gradedWithoutAnswerKey: boolean;
}

const KHONG_CO_DAP_AN = `KHÔNG có đáp án chuẩn kèm theo. Em học sinh chụp cả đề lẫn bài làm trong ảnh.
Hãy tự đọc đề trong ảnh rồi tự giải trước, sau đó mới đối chiếu với bài làm của em.
Nếu chỗ nào em viết mà bạn không đọc được hoặc không chắc, hãy nói rõ là không chắc thay vì đoán.`;

export const buildHomeworkGradingPrompt = (input: HomeworkGradingInput): string => {
  const soAnhDapAn = input.answerKeyImageCount ?? 0;
  const coDapAn = input.answerKey.trim().length > 0 || soAnhDapAn > 0;
  const danAnh = soAnhDapAn > 0
    ? `
THỨ TỰ ẢNH: ${soAnhDapAn} ảnh ĐẦU TIÊN là ĐÁP ÁN CHUẨN của giáo viên, KHÔNG phải bài của em học sinh. Các ảnh còn lại mới là bài làm cần chấm. Tuyệt đối không chấm điểm cho ảnh đáp án.
`
    : '';

  return `Bạn là giáo viên chấm bài tập về nhà cho học sinh phổ thông Việt Nam.

${input.assignmentTitle ? `TÊN BÀI: ${input.assignmentTitle}\n` : ''}
${danAnh}${coDapAn
  ? (input.answerKey.trim()
      ? `ĐÁP ÁN CHUẨN (dùng làm mốc chấm, không tự nghĩ ra đáp án khác):\n${input.answerKey.trim()}`
      : 'ĐÁP ÁN CHUẨN nằm trong các ảnh đầu tiên nói trên. Dùng làm mốc chấm, không tự nghĩ ra đáp án khác.')
  : KHONG_CO_DAP_AN}

${input.rubric?.trim() ? `HƯỚNG DẪN CHẤM CỦA GIÁO VIÊN:\n${input.rubric.trim()}\n` : ''}
THANG ĐIỂM: tối đa ${input.maxScore} điểm. Quy đổi về đúng thang này.

CÁCH VIẾT NHẬN XÉT — quan trọng:
- "feedbackForStudent" là để CHÍNH EM ĐÓ đọc. Xưng "em". Nói em làm đúng chỗ nào trước, rồi chỉ
  đúng chỗ sai và cách sửa. Không phán xét năng lực, không so sánh với bạn khác. 2-4 câu.
- "noteForTeacher" là để giáo viên đọc: mức độ nắm bài, lỗi có hệ thống hay lỗi vặt. 1-2 câu.
- "weakTopics" chỉ ghi chủ đề mà bạn CÓ CĂN CỨ trong bài này, mỗi chủ đề là một cụm danh từ ngắn
  (ví dụ "phương trình đường thẳng", "quy tắc dấu khi thay toạ độ"). Không chắc thì để mảng rỗng.
  Chủ đề này sẽ vào hồ sơ học tập lâu dài của em, ghi bừa là làm hỏng hồ sơ.

CHỈ TRẢ VỀ JSON THUẦN, không kèm chữ nào khác:
{
  "score": 0.0,
  "maxScore": ${input.maxScore},
  "feedbackForStudent": "...",
  "noteForTeacher": "...",
  "strengths": ["..."],
  "weaknesses": ["câu X sai vì ..."],
  "weakTopics": ["..."]
}`;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(v => String(v).trim()).filter(Boolean) : [];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Đọc JSON AI trả về. Ném lỗi khi không tìm được JSON — nơi gọi bắt và đánh dấu bài ở trạng thái
 * 'error' để chấm lại, KHÔNG được lặng lẽ cho 0 điểm.
 */
export const parseHomeworkGrade = (
  raw: string,
  maxScore: number,
  gradedWithoutAnswerKey: boolean,
): HomeworkGrade => {
  const text = String(raw || '');
  const inCodeBlock = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  const jsonStr = inCodeBlock ? inCodeBlock[1] : text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) throw new Error('AI không trả về JSON hợp lệ');

  const parsed = parseLooseJson<Record<string, unknown>>(jsonStr);
  const parsedMax = Number(parsed.maxScore);
  const effectiveMax = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : maxScore;
  const rawScore = Number(parsed.score);

  return {
    // Điểm ngoài thang là dấu hiệu AI hiểu sai thang, kẹp lại còn hơn ghi 12/10 vào học bạ.
    score: clamp(Number.isFinite(rawScore) ? rawScore : 0, 0, effectiveMax),
    maxScore: effectiveMax,
    feedbackForStudent: String(parsed.feedbackForStudent || '').trim(),
    noteForTeacher: String(parsed.noteForTeacher || '').trim(),
    strengths: toStringArray(parsed.strengths),
    weaknesses: toStringArray(parsed.weaknesses),
    weakTopics: toStringArray(parsed.weakTopics),
    gradedWithoutAnswerKey,
  };
};

// ── Bài bổ trợ theo chủ đề còn yếu ───────────────────────────────────────────

export interface PracticeQuestion {
  question: string;
  hint: string;
  solution: string;
}

export const buildPracticePrompt = (topics: string[], grade: string, count = 3): string =>
  `Bạn là giáo viên ra bài luyện thêm cho một học sinh lớp ${grade || 'phổ thông'} ở Việt Nam.

CHỦ ĐỀ EM CÒN YẾU (chỉ ra bài trong phạm vi này, không lan sang chủ đề khác):
${topics.map(t => `- ${t}`).join('\n')}

Ra ĐÚNG ${count} bài, xếp từ dễ đến khó. Bài đầu phải làm được ngay sau khi đọc gợi ý.
Lời giải viết từng bước, nói rõ chỗ học sinh hay nhầm ở chủ đề này.
Không dùng lời khen sáo rỗng, không nhắc tới việc em từng làm sai.

CHỈ TRẢ VỀ JSON THUẦN:
{"questions":[{"question":"...","hint":"...","solution":"..."}]}`;

export const parsePracticeQuestions = (raw: string): PracticeQuestion[] => {
  const text = String(raw || '');
  const inCodeBlock = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  const jsonStr = inCodeBlock ? inCodeBlock[1] : text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) throw new Error('AI không trả về JSON hợp lệ');

  const parsed = parseLooseJson<{ questions?: unknown }>(jsonStr);
  const list = Array.isArray(parsed.questions) ? parsed.questions : [];
  return list
    .map(item => {
      const q = item as Record<string, unknown>;
      return {
        question: String(q.question || '').trim(),
        hint: String(q.hint || '').trim(),
        solution: String(q.solution || '').trim(),
      };
    })
    .filter(q => q.question);
};

// ── AI tự giải đề khi giáo viên không có sẵn đáp án ──────────────────────────

export interface SolveExamInput {
  /** Nội dung đề dạng chữ, nếu rút được. */
  examText: string;
  /** Số ảnh đề gửi kèm, khi đề là ảnh hoặc PDF scan. */
  examImageCount: number;
  maxScore: number;
}

/**
 * Bảo AI giải đề để dựng đáp án nháp.
 *
 * Kết quả này KHÔNG được dùng thẳng để chấm. Một đáp án sai ở câu 5 sẽ làm cả lớp bị chấm sai
 * câu 5, rồi sai đó còn nhân tiếp vào hồ sơ học tập từng em. Nên prompt bắt AI tự nêu chỗ nó
 * không chắc, để giáo viên biết cần soát kỹ chỗ nào.
 */
export const buildSolveExamPrompt = (input: SolveExamInput): string => `Bạn là giáo viên Toán đang soạn ĐÁP ÁN cho một đề bài tập của học sinh Việt Nam.

${input.examImageCount > 0
  ? `Đề nằm trong ${input.examImageCount} ảnh gửi kèm. Đọc kỹ đề trong ảnh trước khi giải.`
  : `ĐỀ BÀI:\n${input.examText.trim()}`}

Giải TỪNG câu, theo thứ tự đề ra. Với mỗi câu:
- Ghi rõ số câu đúng như trong đề.
- Nêu các bước chính, không tắt quá để giáo viên soát được.
- Ghi đáp số cuối cùng.
- Đề xuất số điểm cho câu đó, tổng cả đề đúng bằng ${input.maxScore} điểm.

QUAN TRỌNG — chỗ nào bạn KHÔNG chắc thì phải nói ra:
- Không đọc rõ đề, thiếu dữ kiện, hay có nhiều cách hiểu → ghi thẳng "CHƯA CHẮC: ..." ngay tại câu đó.
- Thà nêu ra để giáo viên sửa, còn hơn đoán bừa rồi cả lớp bị chấm theo một đáp án sai.

CHỈ TRẢ VỀ JSON THUẦN:
{"answerKey":"toàn bộ đáp án dạng văn bản, xuống dòng bằng \n","uncertainties":["chỗ chưa chắc 1"]}`;

export interface SolvedAnswerKey {
  answerKey: string;
  uncertainties: string[];
}

export const parseSolvedAnswerKey = (raw: string): SolvedAnswerKey => {
  const text = String(raw || '');
  const inCodeBlock = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  const jsonStr = inCodeBlock ? inCodeBlock[1] : text.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonStr) throw new Error('AI không trả về JSON hợp lệ');

  const parsed = parseLooseJson<Record<string, unknown>>(jsonStr);
  const answerKey = String(parsed.answerKey || '').trim();
  if (!answerKey) throw new Error('AI không giải được đề này. Thầy cô dán đáp án tay giúp.');

  return { answerKey, uncertainties: toStringArray(parsed.uncertainties) };
};
