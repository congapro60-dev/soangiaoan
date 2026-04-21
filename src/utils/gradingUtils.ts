import { callAI, callAIWithVision, getActiveApiKey } from '../lib/aiProviders';
import { TemplateFile, GradingResult, AppData } from '../types';

type Settings = AppData['settings'];

const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'webp']);

export const gradingUtils = {
  /**
   * Prompt chấm điểm — output JSON chuẩn bất kể provider nào
   */
  getGradingPrompt: (masterContent: string, studentText?: string): string => {
    const studentSection = studentText
      ? `\nBÀI LÀM HỌC SINH (văn bản):\n---\n${studentText}\n---`
      : '\nBÀI LÀM HỌC SINH: [xem ảnh đính kèm]';

    return `
BẠN LÀ CHUYÊN GIA KHẢO THÍ VÀ GIÁO DỤC HỌC CAO CẤP.
NHIỆM VỤ: Chấm điểm bài làm của học sinh dựa trên tài liệu sau.

ĐỀ BÀI / ĐÁP ÁN CHUẨN (giáo viên cung cấp):
---
${masterContent}
---
${studentSection}

BƯỚC 1 — KIỂM TRA ĐÁP ÁN:
- Nếu tài liệu trên CÓ đáp án chuẩn rõ ràng: chấm điểm CHÍNH XÁC theo đáp án đó.
- Nếu KHÔNG có đáp án chuẩn: tự giải đề rồi chấm, và ghi rõ "(Chấm theo đáp án tự suy luận — độ chính xác có thể thấp hơn)" vào đầu trường "details".

BƯỚC 2 — QUY TẮC CHẤM:
1. TRẮC NGHIỆM: Đối soát từng câu, ghi đúng/sai kèm đáp án chuẩn.
2. TỰ LUẬN: Cho điểm thành phần (partial credit) khi làm đúng một phần.
3. Tổng điểm phải BẰNG tổng các câu đã chấm — không ước lượng cảm tính.

BƯỚC 3 — ĐỊNH DẠNG TRƯỜNG "details" (Markdown):
Bắt buộc bao gồm:
## Kết quả từng câu
| Câu | Học sinh trả lời | Đáp án chuẩn | Điểm | Nhận xét |
|-----|-----------------|--------------|------|---------|
| 1   | B               | A            | 0    | Sai — nhầm ... |
| 2   | C               | C            | 0.25 | Đúng |
(liệt kê tất cả câu có trong bài)

## Phân tích lỗi chính
- Câu X: [giải thích rõ tại sao sai, học sinh hiểu nhầm khái niệm gì]

## Lộ trình cải thiện
[cụ thể cho học sinh này]

ĐỊNH DẠNG PHẢN HỒI — BẮT BUỘC JSON THUẦN (không thêm gì ngoài JSON):
{
  "studentName": "Tên học sinh (tìm trong bài, không có thì để 'Ẩn danh')",
  "score": 0.0,
  "maxScore": 10.0,
  "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
  "weaknesses": ["câu X sai vì ...", "câu Y thiếu ..."],
  "improvementPlan": "Tóm tắt lộ trình 2-3 câu",
  "details": "Markdown đầy đủ theo cấu trúc trên"
}
    `.trim();
  },

  /**
   * Chấm điểm một bài — tự động route tới provider đang chọn
   * Ảnh → callAIWithVision, văn bản → callAI
   */
  gradeSubmission: async (
    masterFile: TemplateFile,
    studentFile: TemplateFile,
    settings: Settings
  ): Promise<Partial<GradingResult>> => {
    const apiKey = getActiveApiKey(settings);
    if (!apiKey) throw new Error('Chưa nhập API Key cho provider đang chọn');

    const isImage = IMAGE_TYPES.has(studentFile.type.toLowerCase());
    let text: string;

    if (isImage) {
      // Bài nộp là ảnh chụp — dùng vision API
      const prompt = gradingUtils.getGradingPrompt(masterFile.content);
      text = await callAIWithVision(prompt, studentFile.content, settings);
    } else {
      // Bài nộp là văn bản (PDF/docx đã trích xuất) — nhúng vào prompt
      const prompt = gradingUtils.getGradingPrompt(masterFile.content, studentFile.content);
      text = await callAI(prompt, settings);
    }

    if (!text) throw new Error('AI trả về phản hồi rỗng');

    // Parse JSON: ưu tiên code block, fallback anchor bằng "studentName"
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    const jsonStr = codeBlockMatch
      ? codeBlockMatch[1]
      : text.match(/\{[\s\S]*"studentName"[\s\S]*?\}/)?.[0];
    if (!jsonStr) throw new Error('AI không trả về JSON hợp lệ');

    const parsed = JSON.parse(jsonStr);
    return {
      studentName: String(parsed.studentName || 'Ẩn danh'),
      score: Number(parsed.score) || 0,
      maxScore: Number(parsed.maxScore) || 10,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      improvementPlan: String(parsed.improvementPlan || ''),
      details: String(parsed.details || ''),
      status: 'completed' as const,
      fileName: studentFile.name,
    };
  },
};
