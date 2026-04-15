import { callGeminiAI, MODELS } from '../lib/gemini';
import { TemplateFile } from '../types';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const examUtils = {
  /**
   * SOẠN ĐỀ KIỂM TRA (Claude-style Agentic)
   */
  getGeneratePrompt: (matrix: TemplateFile | null, requirement: string) => {
    return `
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
  },

  generateExam: async (
    matrix: TemplateFile | null, 
    requirement: string, 
    apiKey: string, 
    modelIndex: number
  ) => {
    const prompt = examUtils.getGeneratePrompt(matrix, requirement);
    return await callGeminiAI(prompt, apiKey, modelIndex);
  },

  /**
   * SOÁT ĐỀ KIỂM TRA
   */
  getAuditPrompt: (testContent: string) => {
    return `
BẠN LÀ BIÊN TẬP VIÊN KIỂM ĐỊNH ĐỀ THI CHUYÊN NGHIỆP.

NHIỆM VỤ: Rà soát toàn bộ đề thi và xuất "BÁO CÁO KIỂM TRA ĐỀ THI" theo đúng cấu trúc 6 phần dưới đây.

=== TIÊU CHUẨN SOÁT LỖI ===
- Chính tả & khoảng trắng: lỗi dính chữ (vd: "6%những" → "6% những"), thiếu dấu cách.
- Định dạng tiêu đề: dấu chấm thừa sau tên mã đề, không nhất quán giữa các mã đề.
- Toán học: ký hiệu sai, đáp án sai logic, đơn vị không nhất quán.
- Đối soát đáp án: tự giải từng câu phức tạp để xác nhận đúng/sai.

=== CẤU TRÚC BÁO CÁO BẮT BUỘC (đặt trong thẻ <audit_report>) ===

# BÁO CÁO KIỂM TRA ĐỀ THI
## [Tên đề thi – Môn – Lớp]
Năm học: ... | Mã đề: ... | Ngày kiểm tra: ...

---

## I. THÔNG TIN CHUNG VỀ BỘ ĐỀ

[Mô tả cấu trúc bộ đề, số nhóm, số mã đề]

| Nhóm | Mã đề | Dành cho | Cấu trúc mỗi đề |
|------|-------|----------|-----------------|
| ... | ... | ... | Phần I: ... câu TNPA \| Phần II: ... câu Đúng/Sai \| Phần III: ... câu trả lời ngắn |

**Nguyên tắc kiểm tra:** (1) Chính tả và định dạng; (2) Tính đúng đắn về toán học; (3) Đối chiếu đáp án.

---

## II. TÓM TẮT KẾT QUẢ KIỂM TRA

| Hạng mục | Tình trạng | Số lượng lỗi | Ảnh hưởng |
|----------|-----------|-------------|-----------|
| Lỗi chính tả / khoảng trắng | ❌ CÓ LỖI / ✅ ĐẠT | ... | ... |
| Lỗi định dạng tiêu đề mã đề | ❌ CÓ LỖI / ✅ ĐẠT | ... | ... |
| Đáp án đúng, không lỗi toán | ❌ CÓ LỖI / ✅ ĐẠT | — | ... |

---

## III. CHI TIẾT CÁC LỖI PHÁT HIỆN

### 3.X. [Tên loại lỗi]

❌ **LỖI X: [Mô tả ngắn gọn lỗi]**

| Thông số | Nội dung |
|----------|----------|
| Vị trí lỗi | ... |
| Mức độ | ❌ Lỗi chính tả / trình bày |
| Văn bản hiện tại (sai) | "..." |
| Văn bản đúng | "..." |
| Lưu ý | ... |

**Đề nghị:** [Hành động cụ thể cần thực hiện]

[Lặp lại cho từng lỗi phát hiện được. Nếu không có lỗi nào: ghi "✅ Không phát hiện lỗi ở hạng mục này."]

---

## IV. XÁC NHẬN ĐÁP ÁN ĐÚNG

### 4.1. Phần I – Trắc nghiệm nhiều phương án

| Câu hỏi (đặc trưng) | Kết quả đúng | Tình trạng |
|--------------------|-------------|-----------|
| [Tóm tắt câu hỏi] | [Đáp án] | ✅ ĐÚNG / ❌ SAI |

### 4.2. Phần II – Đúng/Sai

| Bài toán | Mệnh đề | Đáp án Key | Xác minh |
|----------|---------|-----------|---------|
| ... | a) ... | Đ/S | ✅ ĐÚNG |

### 4.3. Phần III – Trả lời ngắn

| Bài toán | Tính toán | Key | Kết luận |
|----------|----------|-----|---------|
| ... | ... | ... | ✅ ĐÚNG |

---

## V. BẢNG TỔNG HỢP VÀ HƯỚNG XỬ LÝ

| # | Loại lỗi | Vị trí cụ thể | Nội dung sai | Nội dung đúng | Ưu tiên |
|---|----------|--------------|-------------|--------------|---------|
| 1 | ... | ... | ... | ... | Cao/Trung bình/Thấp |

---

## VI. LƯU Ý KỸ THUẬT (Trình bày PDF)

[Ghi chú về các ký hiệu toán học có thể bị mất hoặc hiển thị sai khi trích xuất từ PDF: dấu âm, ký hiệu mũ, phân số... Đề nghị kiểm tra lại file gốc Word/LaTeX nếu cần.]

– Hết báo cáo –

=== KẾT THÚC CẤU TRÚC ===

BỐ CỤC PHẢN HỒI:
- <thinking>: Phân tích nháp nội bộ, KHÔNG hiện với người dùng.
- <audit_report>: Toàn bộ báo cáo Markdown theo đúng cấu trúc 6 phần trên.

NỘI DUNG ĐỀ THI CẦN SOÁT:
---
${testContent}
---
    `;
  },

  auditExam: async (
    testContent: string, 
    apiKey: string, 
    modelIndex: number
  ) => {
    const prompt = examUtils.getAuditPrompt(testContent);
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
