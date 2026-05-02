import { callAI, callAIWithVision, getActiveApiKey } from '../lib/aiProviders';
import { TemplateFile, GradingResult, AppData } from '../types';

type Settings = AppData['settings'];

const IMAGE_TYPES = new Set(['png', 'jpg', 'jpeg', 'webp']);

export const gradingUtils = {
  /**
   * Prompt chấm điểm — output JSON chuẩn bất kể provider nào
   */
  getGradingPrompt: (masterContent: string, studentText?: string, targetMaxScore = 10, gradingRubric?: string): string => {
    const studentSection = studentText
      ? `\nBÀI LÀM HỌC SINH (văn bản):\n---\n${studentText}\n---`
      : '\nBÀI LÀM HỌC SINH: [xem ảnh đính kèm]';

    const rubricSection = gradingRubric?.trim()
      ? `\nHƯỚNG DẪN CHẤM (giáo viên quy định — BẮT BUỘC tuân thủ tuyệt đối):\n---\n${gradingRubric.trim()}\n---\n`
      : '';

    return `
BẠN LÀ CHUYÊN GIA KHẢO THÍ VÀ GIÁO DỤC HỌC CAO CẤP.
NHIỆM VỤ: Chấm điểm bài làm của học sinh dựa trên tài liệu sau.

ĐỀ BÀI / ĐÁP ÁN CHUẨN (giáo viên cung cấp):
---
${masterContent}
---
${rubricSection}${studentSection}

BƯỚC 1 — KIỂM TRA ĐÁP ÁN & HƯỚNG DẪN CHẤM:
- Nếu CÓ "HƯỚNG DẪN CHẤM" bên trên: ÁP DỤNG NGUYÊN VĂN các quy tắc tính điểm, thang điểm từng phần, quy tắc partial credit được nêu trong đó. KHÔNG được tự chế quy tắc khác.
- Nếu tài liệu CÓ đáp án chuẩn rõ ràng: chấm điểm CHÍNH XÁC theo đáp án đó.
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

THANG ĐIỂM: Tổng điểm tối đa là ${targetMaxScore} điểm. Quy đổi điểm về thang này.

ĐỊNH DẠNG PHẢN HỒI — BẮT BUỘC JSON THUẦN (không thêm gì ngoài JSON):
{
  "studentName": "Tên học sinh (tìm trong bài, không có thì để 'Ẩn danh')",
  "score": 0.0,
  "maxScore": ${targetMaxScore},
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
  solveExam: async (
    masterFiles: TemplateFile[],
    settings: Settings
  ): Promise<string> => {
    const apiKey = getActiveApiKey(settings);
    if (!apiKey) throw new Error('Chưa nhập API Key cho provider đang chọn');

    const imageFile = masterFiles.find(f => IMAGE_TYPES.has(f.type.toLowerCase()));
    const textContent = masterFiles
      .filter(f => !IMAGE_TYPES.has(f.type.toLowerCase()))
      .map(f => `=== ${f.name} ===\n${f.content}`)
      .join('\n\n');

    const prompt = `Bạn là chuyên gia khảo thí và giáo dục. Nhiệm vụ: **giải chi tiết đề kiểm tra** và tạo **đáp án chuẩn đầy đủ** để giáo viên sử dụng chấm bài.

${textContent ? `NỘI DUNG ĐỀ:\n---\n${textContent}\n---` : ''}${imageFile ? '\n[Xem đề trong ảnh đính kèm]' : ''}

Tạo đáp án theo cấu trúc Markdown sau (chỉ bao gồm các phần có trong đề):

## 📝 TRẮC NGHIỆM
| Câu | Đáp án | Giải thích ngắn |
|-----|--------|----------------|
| 1   | A      | ... |

## ✅ ĐÚNG / SAI
| Câu | Ý | Đáp án | Giải thích |
|-----|---|--------|-----------|
| 1   | a | Đúng   | ... |

## 🔢 TRẢ LỜI NGẮN
| Câu | Đáp án | Cách giải tóm tắt |
|-----|--------|--------------------|
| 1   | 42     | ... |

## 📖 TỰ LUẬN
### Câu X (X điểm)
**Lời giải:**
[Các bước giải đầy đủ]

**Thang điểm chi tiết:**
- Ý 1: X điểm — [yêu cầu cụ thể]
- Ý 2: X điểm — [yêu cầu cụ thể]

## 📊 TỔNG HỢP THANG ĐIỂM
| Phần | Số câu/ý | Điểm | Tổng |
|------|----------|------|------|
| Trắc nghiệm | X | X/câu | X |
| Tổng cộng | | | 10 |

Giải chi tiết, rõ ràng từng bước để giáo viên dễ kiểm tra và chỉnh sửa nếu cần.`;

    const text = imageFile
      ? await callAIWithVision(prompt, imageFile.content, settings)
      : await callAI(prompt, settings);

    if (!text) throw new Error('AI trả về phản hồi rỗng');
    return text;
  },

  analyzeClass: async (
    results: GradingResult[],
    settings: Settings,
    sessionTitle: string
  ): Promise<string> => {
    const apiKey = getActiveApiKey(settings);
    if (!apiKey) throw new Error('Chưa nhập API Key cho provider đang chọn');

    const done = results.filter(r => r.status === 'completed');
    if (done.length === 0) throw new Error('Chưa có bài nào được chấm xong');

    const avg = (done.reduce((a, r) => a + r.score, 0) / done.length).toFixed(2);
    const gioi = done.filter(r => r.score >= 8).length;
    const kha = done.filter(r => r.score >= 6.5 && r.score < 8).length;
    const tb = done.filter(r => r.score >= 5 && r.score < 6.5).length;
    const yeu = done.filter(r => r.score < 5).length;

    const summaries = done.map(r =>
      [`**${r.studentName}**: ${r.score}/${r.maxScore}`, ...(r.weaknesses?.slice(0, 2) || [])].join(' — ')
    ).join('\n');

    const prompt = `Bạn là chuyên gia giáo dục. Phân tích kết quả bài kiểm tra của cả lớp và đưa ra báo cáo tổng hợp.

**Bài kiểm tra:** ${sessionTitle || 'Không rõ tên'}
**Tổng số học sinh đã chấm:** ${done.length}
**Điểm trung bình:** ${avg}
**Phân loại:** Giỏi (≥8): ${gioi} | Khá (6.5-7.9): ${kha} | TB (5-6.4): ${tb} | Yếu (<5): ${yeu}

**Kết quả từng học sinh:**
${summaries}

Viết báo cáo phân tích theo cấu trúc Markdown (đầy đủ, không bỏ phần nào):

## 📊 Tổng quan kết quả
(Bảng điểm trung bình + phân loại Giỏi/Khá/TB/Yếu với số lượng và phần trăm)

## ⚠️ Điểm yếu phổ biến nhất
(Top 3 lỗi hoặc kiến thức nhiều học sinh mắc phải — phân tích cụ thể)

## 💡 Đề xuất cho giáo viên
(Khuyến nghị cụ thể: nên ôn lại chủ đề gì, cách khắc phục lỗi phổ biến)

## 📋 Học sinh cần chú ý thêm
(Liệt kê các em điểm yếu — nếu có, kèm lý do ngắn gọn)`;

    const text = await callAI(prompt, settings);
    if (!text) throw new Error('AI trả về phản hồi rỗng');
    return text;
  },

  gradeSubmission: async (
    masterFile: TemplateFile,
    studentFile: TemplateFile,
    settings: Settings,
    targetMaxScore = 10,
    gradingRubric?: string
  ): Promise<Partial<GradingResult>> => {
    const apiKey = getActiveApiKey(settings);
    if (!apiKey) throw new Error('Chưa nhập API Key cho provider đang chọn');

    const isImage = IMAGE_TYPES.has(studentFile.type.toLowerCase());
    let text: string;

    if (isImage) {
      const prompt = gradingUtils.getGradingPrompt(masterFile.content, undefined, targetMaxScore, gradingRubric);
      text = await callAIWithVision(prompt, studentFile.content, settings);
    } else {
      const prompt = gradingUtils.getGradingPrompt(masterFile.content, studentFile.content, targetMaxScore, gradingRubric);
      text = await callAI(prompt, settings);
    }

    if (!text) throw new Error('AI trả về phản hồi rỗng');

    // Parse JSON — greedy match to capture full object (non-greedy stops at first })
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const jsonStr = codeBlockMatch
      ? codeBlockMatch[1]
      : text.match(/\{[\s\S]*"studentName"[\s\S]*\}/)?.[0];
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
      rawText: isImage ? undefined : studentFile.content,
      status: 'completed' as const,
      fileName: studentFile.name,
    };
  },
};
