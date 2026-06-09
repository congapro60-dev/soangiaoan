import { callAI } from '../lib/aiProviders';
import { AppData, TemplateFile } from '../types';

type Settings = AppData['settings'];
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const examUtils = {
  /**
   * SOẠN ĐỀ KIỂM TRA (Claude-style Agentic)
   */
  getGeneratePrompt: (
    matrix: TemplateFile | null,
    requirement: string,
    sampleFile?: TemplateFile | null,
    structure?: { mcq: number; trueFalse4: number; shortAnswer: number; essay: number }
  ) => {
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
` : `
===== ĐỊNH DẠNG CHUẨN MẶC ĐỊNH (CÔNG VĂN 5636/BGDĐT-GDTrH) =====
Không có đề mẫu → AI tự áp dụng định dạng chuẩn của Bộ GD&ĐT năm 2025 như sau:

**HEADER (căn giữa):**
SỞ GIÁO DỤC VÀ ĐÀO TẠO ...       |  ĐỀ KIỂM TRA [HỌC KÌ I / HỌC KÌ II / GIỮA KÌ ...]
TRƯỜNG THPT ...                   |  NĂM HỌC 20XX - 20XX
                                  |  Môn: [Tên môn] — Lớp: [10/11/12]
                                  |  Thời gian làm bài: [XX] phút
                                  |  (Không kể thời gian phát đề)
                                  |  Mã đề: [XXX]

**BỐ CỤC CÁC PHẦN (theo cấu trúc được yêu cầu, chỉ hiện phần có câu hỏi):**
- **PHẦN I. CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN** (nếu có MCQ 4 phương án)
  _Thí sinh trả lời từ câu 1 đến câu N. Mỗi câu hỏi thí sinh chỉ chọn một phương án._
- **PHẦN II. CÂU TRẮC NGHIỆM ĐÚNG SAI** (nếu có True/False 4 ý)
  _Thí sinh trả lời từ câu 1 đến câu N. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn Đúng hoặc Sai._
- **PHẦN III. CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN** (nếu có)
  _Thí sinh trả lời từ câu 1 đến câu N._
- **PHẦN IV. TỰ LUẬN** (nếu có)
  _Thí sinh trình bày đầy đủ lời giải cho các câu hỏi._

**ĐÁNH SỐ VÀ TRÌNH BÀY:**
- Đánh số: "Câu 1.", "Câu 2."... (có dấu chấm, in đậm).
- MCQ 4 phương án: mỗi phương án một dòng riêng biệt, liên tiếp, bắt đầu đúng "A. ", "B. ", "C. ", "D. "; tuyệt đối không viết A/B/C/D dồn trên cùng một dòng; không chèn bullet/list trước phương án. Hệ thống preview/export sẽ tự chia 4/2/1 cột theo độ dài đáp án.
- Nếu muốn chỉ định layout thủ công, có thể dùng HTML: <div class="options-grid cols-4"><div><span class="option-label">A.</span> ...</div>...</div> cho đáp án ngắn; đổi thành cols-2 hoặc cols-1 khi đáp án dài/có công thức. Không dùng layout 4 cột cho đáp án có công thức dài.
- Đúng/Sai 4 ý: mỗi ý một dòng, bắt đầu "a) ", "b) ", "c) ", "d) ".
- Trả lời ngắn: để khoảng trống "……………" cuối câu hoặc ghi rõ yêu cầu tính toán.
- Tự luận: mỗi câu một đoạn, ghi rõ số điểm ở đầu câu, VD: "**Câu 1** (2,0 điểm). ..."
- Kết thúc đề: dòng "--- HẾT ---" căn giữa, in đậm.
- Dưới dòng HẾT: "Thí sinh không được sử dụng tài liệu. Cán bộ coi thi không giải thích gì thêm."

**QUY TẮC KHÁC:**
- Ngôn ngữ trang trọng, chuẩn mực sư phạm.
- Công thức toán dùng LaTeX: inline $...$, display $$...$$.
- Hình vẽ/bảng biến thiên (nếu có): TUYỆT ĐỐI KHÔNG dùng thẻ HTML <svg> hay HTML inline. PHẢI dùng mã TikZ chuẩn xác chèn vào trong khối markdown có ngôn ngữ là tikz.
===== KẾT THÚC ĐỊNH DẠNG MẶC ĐỊNH =====
`;

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
- Trả về DUY NHẤT nội dung đề thi hoàn chỉnh trong thẻ <exam_content>...</exam_content>.
- KHÔNG có lời chào, không giải thích, không thẻ <thinking>.
- ĐÁP ÁN: Đặt bảng đáp án chi tiết ở CUỐI CÙNG của nội dung (ngay sau dòng --- HẾT ---).

${sampleSection}

MA TRẬN ĐỀ:
${matrixSection}

CẤU TRÚC ĐỀ BẮT BUỘC:
${structure && (structure.mcq + structure.trueFalse4 + structure.shortAnswer + structure.essay) > 0
  ? [
      structure.mcq > 0 ? `- ${structure.mcq} câu TRẮC NGHIỆM 4 phương án (A/B/C/D, mỗi câu chỉ 1 đáp án đúng)` : '',
      structure.trueFalse4 > 0 ? `- ${structure.trueFalse4} câu ĐÚNG/SAI 4 ý (mỗi câu có 4 phát biểu a/b/c/d, học sinh đánh Đúng hoặc Sai cho từng ý)` : '',
      structure.shortAnswer > 0 ? `- ${structure.shortAnswer} câu TRẢ LỜI NGẮN (điền số hoặc đáp án cụ thể)` : '',
      structure.essay > 0 ? `- ${structure.essay} câu TỰ LUẬN (trình bày đầy đủ lời giải)` : '',
    ].filter(Boolean).join('\n')
  : '- Không có ràng buộc cụ thể (AI tự cân đối theo ma trận hoặc chương trình)'}

YÊU CẦU BỔ SUNG:
${requirement || 'Soạn đề thi chuẩn chương trình GDPT 2018'}

QUY TẮC NỘI DUNG:
- Công thức toán học: dùng LaTeX inline $...$ và display $$...$$, KHÔNG dùng ký hiệu khác; không để công thức bị tách bởi xuống dòng sai cú pháp.
- Ngôn ngữ: tiếng Việt chuẩn, không lỗi chính tả.
- Độ khó: phân bổ đúng theo ma trận hoặc cân đối nếu không có ma trận.
- Với trắc nghiệm A/B/C/D, luôn đặt 4 dòng phương án liên tiếp theo đúng mẫu "A. ...", "B. ...", "C. ...", "D. ..."; tuyệt đối không viết "A. ... B. ... C. ... D. ..." trên cùng một dòng; không dùng bullet/list cho 4 phương án.
- Với câu hỏi hình học không gian, đồ thị hàm số hoặc bảng biến thiên, TUYỆT ĐỐI KHÔNG dùng thẻ HTML <svg>. PHẢI tự tính toán tọa độ và vẽ bằng mã TikZ chuẩn xác chèn vào trong khối markdown có ngôn ngữ là tikz.
- Quy ước TikZ: dùng nét liền cho cạnh/đường thấy; dùng nét đứt (dashed) cho cạnh khuất/đường phụ; với bảng biến thiên cần vẽ hàng dấu, mũi tên tăng/giảm và nhãn cực trị rõ ràng.
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
   * CHỈNH SỬA ĐỀ THI theo yêu cầu của giáo viên
   */
  getRefinePrompt: (currentExam: string, refineRequest: string) => `
BẠN LÀ CHUYÊN GIA KHẢO THÍ. Giáo viên đã có một đề thi và muốn bạn chỉnh sửa theo yêu cầu cụ thể.

===== ĐỀ THI HIỆN TẠI =====
${currentExam}
===== KẾT THÚC ĐỀ THI =====

===== YÊU CẦU CHỈNH SỬA =====
${refineRequest}
===== KẾT THÚC YÊU CẦU =====

QUY TẮC BẮT BUỘC:
1. CHỈ chỉnh sửa những gì giáo viên yêu cầu. Giữ nguyên toàn bộ các phần khác.
2. Bảo toàn định dạng gốc (header, phần, cách đánh số, công thức LaTeX, dấu HẾT).
3. Công thức toán giữ LaTeX $...$ và $$...$$.
4. Với trắc nghiệm A/B/C/D, luôn giữ hoặc chuyển về 4 dòng riêng biệt theo mẫu "A. ...", "B. ...", "C. ...", "D. ..."; không dồn các phương án trên cùng một dòng.
5. Ngôn ngữ: tiếng Việt chuẩn, không sai chính tả, dùng dạng Unicode hợp nhất (NFC).
6. Trả về TOÀN BỘ đề thi đã chỉnh sửa (không chỉ phần sửa), để thay thế hoàn toàn bản cũ.
7. Bọc nội dung trong thẻ <exam_content>...</exam_content>.
    `,

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
  ): Promise<string> => {
    // Bước 1: Dùng AI tách đề thành mảng JSON câu hỏi
    const parserPrompt = `
BẠN LÀ CHUYÊN GIA DỮ LIỆU ĐỀ THI.
NHIỆM VỤ: Chuyển đổi văn bản đề thi thành mảng JSON.

YÊU CẦU NGHIÊM NGẶT:
1. Nhận diện từng câu hỏi trắc nghiệm (Câu 1, Câu 2... hoặc 1., 2., ...).
2. Giữ nguyên công thức LaTeX ($...$, $$...$$) trong nội dung.
3. Trường "answer" là CHỮ CÁI đáp án đúng: "A", "B", "C" hoặc "D".
4. Trường "options" là mảng 4 phần tử, mỗi phần tử bắt đầu bằng "A. ", "B. ", "C. ", "D. ".
5. Chỉ trả về mảng JSON thuần, không giải thích thêm.

ĐỊNH DẠNG OUTPUT BẮT BUỘC:
[{"id":1,"text":"Nội dung câu hỏi","options":["A. ...","B. ...","C. ...","D. ..."],"answer":"A"},...]

NỘI DUNG ĐỀ GỐC:
${originalContent}
    `;

    const jsonResponse = await callAI(parserPrompt, settings);
    if (!jsonResponse) throw new Error("AI không trả về dữ liệu câu hỏi");

    // Tìm mảng JSON đầu tiên hợp lệ trong response
    const jsonMatch = jsonResponse.match(/\[[\s\S]*?\](?=\s*$|\s*\n\s*[^[\]])/);
    const jsonStr = jsonMatch ? jsonMatch[0] : jsonResponse.match(/\[[\s\S]*\]/)?.[0];
    if (!jsonStr) throw new Error("Không tìm thấy dữ liệu JSON câu hỏi trong response");

    const questions = JSON.parse(jsonStr) as Array<{
      id: number; text: string; options: string[]; answer: string;
    }>;
    if (!questions.length) throw new Error("Đề thi không có câu hỏi nào");

    const zip = new JSZip();
    const folder = zip.folder("Bo_De_Hoan_Vi_SmartPlan_AI");

    const shuffleArray = <T>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const summaryLines: string[] = [
      `## Kết quả Trộn đề — ${count} mã đề`,
      `Tổng số câu hỏi gốc: **${questions.length} câu**`,
      '',
      '| Mã đề | File đề | File đáp án |',
      '|-------|---------|-------------|',
    ];

    for (let i = 1; i <= count; i++) {
      const code = 100 + i;
      const shuffledQuestions = shuffleArray(questions);
      const answerLines: string[] = [`ĐÁP ÁN — MÃ ĐỀ: ${code}`, ''];

      const examLines: string[] = [`HỆ THỐNG SMARTPLAN AI`, `MÃ ĐỀ: ${code}`, ''];

      shuffledQuestions.forEach((q, idx) => {
        // Tìm text của phương án đúng trong mảng options gốc
        const correctOptionText = q.options.find(
          (o) => o.startsWith(q.answer + '.') || o.startsWith(q.answer + ' ')
        );
        const shuffledOptions = shuffleArray(q.options);

        // Xác định vị trí mới của đáp án đúng sau khi shuffle
        const newIdx = correctOptionText ? shuffledOptions.indexOf(correctOptionText) : -1;
        const newLabel = newIdx >= 0 ? ['A', 'B', 'C', 'D'][newIdx] : q.answer;

        examLines.push(`Câu ${idx + 1}: ${q.text}`);
        shuffledOptions.forEach((opt, optIdx) => {
          // Gán lại nhãn A/B/C/D theo thứ tự mới
          const label = ['A', 'B', 'C', 'D'][optIdx];
          const content = opt.replace(/^[A-D][. ]\s*/, '');
          examLines.push(`${label}. ${content}`);
        });
        examLines.push('');

        answerLines.push(`Câu ${idx + 1}: ${newLabel}`);
      });

      const examFileName = `De_Thi_Ma_So_${code}.txt`;
      const answerFileName = `Da_An_Ma_So_${code}.txt`;
      folder?.file(examFileName, examLines.join('\n'));
      folder?.file(answerFileName, answerLines.join('\n'));

      summaryLines.push(`| ${code} | ${examFileName} | ${answerFileName} |`);
    }

    summaryLines.push('', '> File ZIP đã được tải xuống. Mở từng file .txt để xem nội dung đề và đáp án.');

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'SmartPlan_AI_Exam_Pack.zip');

    return summaryLines.join('\n');
  }
};
