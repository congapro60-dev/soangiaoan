import { callGeminiAI, MODELS } from '../lib/gemini';
import { TemplateFile } from '../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const examUtils = {
  /**
   * SOẠN ĐỀ KIỂM TRA (Claude-style Agentic)
   */
  generateExam: async (
    matrix: TemplateFile | null, 
    requirement: string, 
    apiKey: string, 
    modelIndex: number
  ) => {
    const prompt = `
      BẠN LÀ MỘT CHUYÊN GIA KHẢO THÍ CAO CẤP (CLAUDE 4.5 SONNET STYLE).
      NHIỆM VỤ: Thiết kế một bộ đề thi chuẩn mực.

      BỐ CỤC PHẢN HỒI:
      1. <thinking>: Phân tích Ma trận đề (nếu có), phân bổ tỉ lệ câu hỏi theo Bloom (Nhận biết/Thông hiểu/Vận dụng).
      2. <exam_content>: Nội dung đề thi chi tiết (Markdown).
      3. <answer_key>: Bảng đáp án và hướng dẫn giải.

      DỮ LIỆU ĐẦU VÀO:
      - Ma trận tham khảo: ${matrix ? matrix.content : 'Không có (AI tự tối ưu)'}
      - Yêu cầu bổ sung: ${requirement || 'Soạn đề thi giữa học kỳ chuẩn chương trình GDPT 2018'}

      YÊU CẦU ĐỀ THI:
      - Cấu trúc: Phần I (Trắc nghiệm), Phần II (Đúng/Sai), Phần III (Trả lời ngắn).
      - Ký hiệu toán học: Sử dụng LaTeX chuẩn.
    `;
    return await callGeminiAI(prompt, apiKey, modelIndex);
  },

  /**
   * SOÁT ĐỀ KIỂM TRA (Strict Auditor Persona)
   */
  auditExam: async (
    testContent: string, 
    apiKey: string, 
    modelIndex: number
  ) => {
    const prompt = `
      BẠN LÀ BIÊN TẬP VIÊN KIỂM ĐỊNH ĐỀ THI "KHÓ TÍNH" NHẤT (CLAUDE 4.5 STYLE).
      NHIỆM VỤ: Rà soát toàn bộ đề thi để tìm lỗi.

      TIÊU CHUẨN KIỂM TRA (DỰA TRÊN MẪU CHECK ĐỀ TOÁN):
      1. Chính tả & Khoảng trắng: Ví dụ "6%những" -> "6% những".
      2. Định dạng: Dấu chấm cuối mã đề, nhất quán giữa các câu.
      3. Logic Toán học: Kiểm tra xem bài toán có đủ dữ kiện không, đáp án có bị nhầm lẫn không.

      BỐ CỤC PHẢN HỒI:
      1. <thinking>: Quá trình rà soát từng câu, từng dòng.
      2. <audit_report>: Bảng báo cáo lỗi chi tiết (Loại lỗi | Vị trí | Nội dung sai | Nội dung đúng | Mức độ).
      3. <recommendation>: Lời khuyên cuối cùng cho giáo viên.

      NỘI DUNG ĐỀ THI CẦN SOÁT:
      ---
      ${testContent}
      ---
    `;
    return await callGeminiAI(prompt, apiKey, modelIndex);
  },

  /**
   * TRỘN ĐỀ HOÁN VỊ (AI-Assisted Shuffling)
   */
  shuffleExam: async (
    originalContent: string, 
    count: number,
    apiKey: string,
    modelIndex: number
  ) => {
    // Bước 1: Dùng tư duy Claude để tách đề thi thành mảng JSON câu hỏi
    const parserPrompt = `
      BẠN LÀ CHUYÊN GIA DỮ LIỆU ĐỀ THI. 
      NHIỆM VỤ: Chuyển đổi văn bản sau đây thành mảng JSON các câu hỏi.

      YÊU CẦU:
      1. Nhận diện đề thi toán học phức tạp (Câu 1, Câu 2... A, B, C, D).
      2. Giữ nguyên công thức LaTeX trong nội dung.
      3. Định dạng JSON: [{"id": 1, "text": "...", "options": ["A. ..", "B. .."], "answer": "A"}]

      NỘI DUNG ĐỀ GỐC:
      ${originalContent}
    `;

    const jsonResponse = await callGeminiAI(parserPrompt, apiKey, modelIndex);
    if (!jsonResponse) throw new Error("Không thể trích xuất câu hỏi");

    const jsonMatch = jsonResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("Dữ liệu JSON không hợp lệ");
    
    const questions = JSON.parse(jsonMatch[0]) as any[];

    const zip = new JSZip();
    const folder = zip.folder("Bo_De_Hoan_Vi_SmartPlan_AI");

    // Hàm xáo trộn mảng (Fisher-Yates)
    const shuffleArray = (array: any[]) => {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };

    for (let i = 1; i <= count; i++) {
      const code = 100 + i;
      const shuffledQuestions = shuffleArray([...questions]);
      
      // Tạo nội dung đề mới từ mảng đã trộn
      const examText = shuffledQuestions.map((q, idx) => {
         // Xáo trộn phương án bên trong từng câu
         const shuffledOptions = shuffleArray([...q.options]);
         return `Câu ${idx + 1}: ${q.text}\n${shuffledOptions.join('\n')}\n`;
      }).join('\n');

      folder?.file(`De_Thi_Ma_So_${code}.docx`, `HỆ THỐNG SMARTPLAN AI\nMÃ ĐỀ: ${code}\n\n${examText}`);
      // (Trong thực tế sẽ dùng thư viện 'docx' để tạo file Word chuẩn, 
      // ở đây tôi demo luồng ZIP để thầy/cô thấy kết quả trước)
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "SmartPlan_AI_Exam_Pack.zip");
  }
};
