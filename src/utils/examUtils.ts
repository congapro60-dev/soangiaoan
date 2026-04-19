import { callAI } from '../lib/aiProviders';
import { AppData, TemplateFile } from '../types';

type Settings = AppData['settings'];
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const examUtils = {
  /**
   * SOẠN ĐỀ KIỂM TRA (Claude-style Agentic)
   */
  getGeneratePrompt: (matrix: TemplateFile | null, requirement: string, sampleFile?: TemplateFile | null) => {
    const sampleSection = sampleFile?.content ? `
===== ĐỀ MẪU ĐỊNH DẠNG (BẮT BUỘC TUÂN THỦ) =====
${sampleFile.content}
===== KẾT THÚC ĐỀ MẪU =====

⚠️ RÀNG BUỘC ĐỊNH DẠNG CỨNG:
- Tiêu đề đề thi, tên trường, môn học, lớp, thời gian: sao chép CHÍNH XÁC cấu trúc từ ĐỀ MẪU, chỉ thay nội dung cụ thể nếu có yêu cầu.
- Cách đánh số câu (Câu 1, Câu 2... hoặc 1., 2....): PHẢI giống hệt ĐỀ MẪU.
- Tên các phần/mục (Phần I, Phần II... hoặc A, B, C...): PHẢI giống hệt ĐỀ MẪU.
- Cách trình bày phương án A/B/C/D: PHẢI giống hệt ĐỀ MẪU.
- Font chữ, in đậm, in nghiêng tên mục: PHẢI giống hệt ĐỀ MẪU.
- KHÔNG được tự ý thêm phần, đổi tên mục, hoặc thay đổi bất kỳ element định dạng nào.
` : '';

    const matrixSection = matrix?.content ? `
===== MA TRẬN ĐỀ (BẮT BUỘC TUÂN THỦ) =====
${matrix.content}
===== KẾT THÚC MA TRẬN =====

⚠️ RÀNG BUỘC MA TRẬN CỨNG:
- Số câu mỗi phần: PHẢI khớp chính xác với ma trận.
- Phân bổ mức Bloom (Nhận biết/Thông hiểu/Vận dụng/Vận dụng cao): PHẢI đúng tỉ lệ.
- Chủ đề/bài/chương: PHẢI đúng theo cột ma trận.
- KHÔNG được thêm câu, bỏ câu hoặc đổi chủ đề.
` : '- Không có ma trận (AI tự cân đối theo chương trình GDPT 2018)';

    return `
BẠN LÀ CHUYÊN GIA KHẢO THÍ CAO CẤP.
NHIỆM VỤ: Soạn đề thi theo đúng định dạng mẫu và ma trận được cung cấp.

BỐ CỤC PHẢN HỒI BẮT BUỘC:
1. <thinking>: Phân tích ma trận, đối chiếu với đề mẫu, lập kế hoạch soạn câu hỏi.
2. <exam_content>: Toàn bộ nội dung đề thi (Markdown, đúng định dạng mẫu).
3. <answer_key>: Bảng đáp án đầy đủ kèm hướng dẫn giải ngắn gọn.

${sampleSection}

MA TRẬN ĐỀ:
${matrixSection}

YÊU CẦU BỔ SUNG:
${requirement || 'Soạn đề thi chuẩn chương trình GDPT 2018'}

QUY TẮC NỘI DUNG:
- Công thức toán học: dùng LaTeX inline $...$ và display $$...$$, KHÔNG dùng ký hiệu khác.
- Ngôn ngữ: tiếng Việt chuẩn, không lỗi chính tả.
- Độ khó: phân bổ đúng theo ma trận hoặc cân đối nếu không có ma trận.
    `;
  },

  generateExam: async (
    matrix: TemplateFile | null,
    requirement: string,
    settings: Settings,
    sampleFile?: TemplateFile | null
  ) => {
    const prompt = examUtils.getGeneratePrompt(matrix, requirement, sampleFile);
    return await callAI(prompt, settings);
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
    settings: Settings
  ) => {
    const prompt = examUtils.getAuditPrompt(testContent);
    return await callAI(prompt, settings);
  },

  /**
   * TRỘN ĐỀ HOÁN VỊ (AI-Assisted Shuffling)
   */
  shuffleExam: async (
    originalContent: string,
    count: number,
    settings: Settings
  ) => {
    // Bước 1: Tách đề thi thành mảng JSON câu hỏi
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

    const jsonResponse = await callAI(parserPrompt, settings);
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
