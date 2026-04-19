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
NHIỆM VỤ: Chấm điểm bài làm của học sinh theo đúng đề bài và đáp án chuẩn.

ĐỀ BÀI & ĐÁP ÁN CHUẨN:
---
${masterContent}
---
${studentSection}

QUY TẮC CHẤM ĐIỂM:
1. TRẮC NGHIỆM: Đối soát từng đáp án A/B/C/D. Ghi rõ câu nào đúng, câu nào sai.
2. TỰ LUẬN: Đánh giá logic, phương pháp, cho điểm thành phần khi làm đúng một phần.
3. Nhận xét điểm mạnh (trình bày, lập luận) và điểm yếu (hổng kiến thức, sai sót).
4. Đưa lộ trình cải thiện cá nhân hóa cho học sinh.

ĐỊNH DẠNG PHẢN HỒI — BẮT BUỘC JSON THUẦN (không giải thích thêm):
{
  "studentName": "Tên học sinh (tìm trong bài, không có thì để 'Ẩn danh')",
  "score": 0.0,
  "maxScore": 10.0,
  "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
  "weaknesses": ["điểm yếu 1", "điểm yếu 2"],
  "improvementPlan": "Lộ trình cải thiện chi tiết...",
  "details": "Báo cáo chấm điểm đầy đủ định dạng Markdown"
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
