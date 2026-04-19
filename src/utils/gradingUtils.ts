import { GoogleGenAI } from "@google/genai";
import { TemplateFile, GradingResult } from "../types";

export const gradingUtils = {
  /**
   * Chuyển đổi tệp sang định dạng AI (Base64 cho ảnh, Text cho docx/pdf)
   */
  fileToPart: async (file: TemplateFile): Promise<any> => {
    const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(file.type.toLowerCase());
    
    if (isImage) {
      // Content trong TemplateFile là dữ liệu thô hoặc base64 tùy lúc upload
      // Giả định content đã là base64 (sẽ xử lý ở bước upload)
      return {
        inlineData: {
          data: file.content.split(',').pop() || file.content,
          mimeType: `image/${file.type === 'jpg' ? 'jpeg' : file.type}`
        }
      };
    }
    
    return { text: file.content };
  },

  /**
   * Xây dựng Prompt chấm điểm chuyên sâu
   */
  getGradingPrompt: (masterContent: string) => {
    return `
      BẠN LÀ CHUYÊN GIA KHẢO THÍ VÀ GIÁO DỤC HỌC CAO CẤP.
      NHIỆM VỤ: Chấm điểm bài làm của học sinh dựa trên Đề bài & Đáp án chuẩn dưới đây.

      ĐỀ BÀI & ĐÁP ÁN CHUẨN:
      ---
      ${masterContent}
      ---

      YÊU CẦU CHẤM ĐIỂM (CỰC KỲ CHI TIẾT):
      1. TRẮC NGHIỆM: Đối soát đáp án A, B, C, D. Nếu sai, ghi rõ câu nào sai.
      2. TỰ LUẬN: 
         - Đọc kỹ các bước giải, đánh giá logic và phương pháp.
         - Cho điểm thành phần nếu học sinh làm đúng một phần.
         - Nhận xét về ưu điểm (cách trình bày, lập luận) và nhược điểm (hổng kiến thức, sai sót nhỏ).
      3. TỔNG HỢP: Đưa ra lời khuyên cá nhân hóa để học sinh cải thiện.

      ĐỊNH DẠNG PHẢN HỒI (BẮT BUỘC JSON):
      {
        "studentName": "Tên học sinh (nếu tìm thấy trong bài, không thì để 'Ẩn danh')",
        "score": 0.0,
        "maxScore": 10.0,
        "strengths": ["...", "..."],
        "weaknesses": ["...", "..."],
        "improvementPlan": "Lộ trình cải thiện...",
        "details": "Toàn bộ báo cáo chi tiết định dạng Markdown"
      }
    `;
  },

  /**
   * Chấm điểm một bài nộp
   */
  gradeSubmission: async (
    masterFile: TemplateFile,
    studentFile: TemplateFile,
    apiKey: string,
    modelName: string = 'gemini-2.5-flash'
  ): Promise<Partial<GradingResult>> => {
    if (!apiKey) throw new Error("API Key empty");

    const ai = new GoogleGenAI({ apiKey });
    const prompt = gradingUtils.getGradingPrompt(masterFile.content);
    const studentPart = await gradingUtils.fileToPart(studentFile);

    try {
      const result = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text: prompt }, studentPart] }],
        config: { temperature: 0.1 }
      });
      const text = result.text || '';
      if (!text) throw new Error("AI trả về phản hồi rỗng");

      // Ưu tiên tìm JSON trong code block, sau đó fallback greedy
      const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      const jsonStr = codeBlockMatch
        ? codeBlockMatch[1]
        : text.match(/\{[\s\S]*"studentName"[\s\S]*\}/)?.[0];
      if (!jsonStr) throw new Error("AI không trả về dữ liệu JSON hợp lệ");

      const parsed = JSON.parse(jsonStr);
      return {
        studentName: parsed.studentName || 'Ẩn danh',
        score: typeof parsed.score === 'number' ? parsed.score : 0,
        maxScore: typeof parsed.maxScore === 'number' ? parsed.maxScore : 10,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        improvementPlan: parsed.improvementPlan || '',
        details: parsed.details || '',
        status: 'completed' as const,
        fileName: studentFile.name
      };
    } catch (error: any) {
      console.error("Grading Error:", error);
      return {
        status: 'error' as const,
        details: `Lỗi khi chấm bài: ${error.message}`,
        fileName: studentFile.name
      };
    }
  }
};
