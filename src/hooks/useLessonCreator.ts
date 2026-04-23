import { useState, useRef } from 'react';
import { LessonPlan, AppData, TemplateFile } from '../types';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import { cleanMarkdownOutput } from '../utils/markdownUtils';
import Swal from 'sweetalert2';

// Note: MODELS and MODELS_LIST should be consistent. 
// In App.tsx it was MODELS.indexOf(data.settings.selectedModel)
// I'll keep that logic.

/**
 * Trích xuất nội dung giáo án từ phản hồi AI có thể chứa thẻ XML.
 * Ưu tiên lấy <lesson_content>, gộp <pedagogical_review> nếu AI tách riêng,
 * fallback sang toàn bộ text nếu AI không dùng XML.
 */
const extractLessonContent = (rawResult: string): string => {
  const contentMatch = rawResult.match(/<lesson_content>([\s\S]*?)<\/lesson_content>/);
  let finalContent = '';
  if (contentMatch) {
    finalContent = contentMatch[1];
    const reviewMatch = rawResult.match(/<pedagogical_review>([\s\S]*?)<\/pedagogical_review>/);
    if (reviewMatch && !finalContent.includes('Danielson') && !finalContent.includes('tổ trưởng chuyên môn')) {
      finalContent += '\n\n## Đánh giá của tổ trưởng chuyên môn\n' + reviewMatch[1];
    }
  } else {
    finalContent = rawResult.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();
  }
  return finalContent;
};

export const useLessonCreator = (
  data: AppData, 
  setData: React.Dispatch<React.SetStateAction<AppData>>,
  setIsLoading: (val: boolean) => void,
  showToast: (msg: string, type?: any) => void,
  setIsSettingsOpen: (val: boolean) => void
) => {
  const [generationMode, setGenerationMode] = useState<'single' | 'bulk'>('single');
  const [builtinFormat, setBuiltinFormat] = useState<'default' | 'cv5512'>('default');
  const [currentPlan, setCurrentPlan] = useState<Partial<LessonPlan>>({
    title: '',
    content: '',
    subjectId: 'math',
    templateId: '',
    grade: '10',
    week: '1'
  });
  const [lessonDocs, setLessonDocs] = useState<TemplateFile[]>([]);
  const [singleRequirement, setSingleRequirement] = useState('');
  const [distributionFile, setDistributionFile] = useState<TemplateFile | null>(null);
  const [selectedDistributionId, setSelectedDistributionId] = useState<string>('');
  const [bulkCommand, setBulkCommand] = useState('');
  const [bulkResults, setBulkResults] = useState<LessonPlan[]>([]);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentTitle: '' });
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const cancelBulkRef = useRef(false);

  const cancelBulk = () => { cancelBulkRef.current = true; };

  const handleCreateLesson = async () => {
    if (!getActiveApiKey(data.settings)) {
      setIsSettingsOpen(true);
      showToast('Vui lòng nhập API Key trong Cài đặt!', 'warning');
      return;
    }

    if (generationMode === 'single' && !currentPlan.title) {
      showToast('Vui lòng nhập tiêu đề giáo án!', 'warning');
      return;
    }

    if (generationMode === 'bulk' && (!distributionFile && !selectedDistributionId) && !bulkCommand) {
      showToast('Vui lòng chọn hoặc tải lên phân phối chương trình!', 'warning');
      return;
    }

    setIsLoading(true);
    setBulkResults([]);
    cancelBulkRef.current = false;

    try {
      const subject = data.subjects.find(s => s.id === currentPlan.subjectId)?.name || 'Chung';
      const selectedTemplate = data.templates.find(t => t.id === currentPlan.templateId);
      const activeDist = selectedDistributionId 
        ? data.distributions.find(d => d.id === selectedDistributionId) 
        : distributionFile;
      
      const CV5512_FORMAT = `
===== MẪU GIÁO ÁN THEO CÔNG VĂN 5512/BGDĐT-GDTrH (BẮT BUỘC TUÂN THỦ) =====

BỐ CỤC BẮT BUỘC:
Trường: ...          Họ và tên GV: [Tên giáo viên]
Tổ: ...              Ngày soạn: ...

BÀI [Số bài]: [TÊN BÀI HỌC]
Thời lượng: [X] tiết

I. MỤC TIÊU
1. Về kiến thức:
   - [Học sinh biết/hiểu/vận dụng được...]
2. Về năng lực:
   a. Năng lực đặc thù môn [Tên môn]:
      - [Năng lực cụ thể theo môn]
   b. Năng lực chung:
      - Tự học, giao tiếp, hợp tác, giải quyết vấn đề và sáng tạo.
3. Về phẩm chất:
   - Chăm chỉ, trung thực, trách nhiệm với bản thân và cộng đồng.

II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU
1. Giáo viên: [Bảng, máy chiếu, phiếu học tập, ...]
2. Học sinh: [SGK, vở ghi, dụng cụ học tập, ...]

III. TIẾN TRÌNH DẠY HỌC

A. HOẠT ĐỘNG 1: MỞ ĐẦU (~ 5 phút)
a) Mục tiêu: Tạo hứng thú, kết nối kiến thức cũ với bài mới.
b) Nội dung: [Mô tả tình huống/câu hỏi khởi động]
c) Sản phẩm: [Câu trả lời / ý kiến của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| ... | ... | ... |

B. HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (~ [X] phút)
a) Mục tiêu: [Học sinh nắm được ...]
b) Nội dung: [Nội dung kiến thức cần hình thành]
c) Sản phẩm: [Ghi chép / bài làm / sơ đồ tư duy của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| ... | ... | ... |

C. HOẠT ĐỘNG 3: LUYỆN TẬP (~ [X] phút)
a) Mục tiêu: [Củng cố, rèn kỹ năng vận dụng kiến thức vừa học]
b) Nội dung: [Bài tập / câu hỏi luyện tập cụ thể]
c) Sản phẩm: [Kết quả bài tập của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| ... | ... | ... |

D. HOẠT ĐỘNG 4: VẬN DỤNG (~ [X] phút)
a) Mục tiêu: [Giúp HS vận dụng kiến thức vào thực tiễn]
b) Nội dung: [Bài toán thực tiễn / dự án mini]
c) Sản phẩm: [Bài trình bày / sản phẩm của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| ... | ... | ... |

E. HOẠT ĐỘNG 5: SƠ KẾT — DẶN DÒ (~ 5 phút)
a) Mục tiêu: [Tổng kết bài học, giao bài tập về nhà]
b) Nội dung: [Hệ thống hóa kiến thức]
c) Sản phẩm: [Ghi chép của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| ... | ... | ... |

IV. PHỤ LỤC (nếu có)
[Phiếu học tập, bảng kiểm, bài tập về nhà, ...]

QUY TẮC NGHIÊM NGẶT:
- Mỗi hoạt động PHẢI có đủ 4 mục: a) Mục tiêu, b) Nội dung, c) Sản phẩm, d) Tổ chức thực hiện.
- Bảng "Tổ chức thực hiện" BẮT BUỘC có 3 cột: "Hoạt động của GV", "Hoạt động của HS" và "Nội dung ghi bảng / Sản phẩm dự kiến".
- Thời lượng mỗi hoạt động phải được ghi rõ.
- KHÔNG rút gọn hoặc bỏ bất kỳ mục nào trong bố cục trên.
===== KẾT THÚC MẪU CÔNG VĂN 5512 =====
`;

      let templateContext = '';
      if (builtinFormat === 'cv5512') {
        templateContext = CV5512_FORMAT;
      } else if (selectedTemplate) {
        const samples = selectedTemplate.files.filter(f => f.category === 'sample').map(f => f.content).join('\n---\n');
        const criteria = selectedTemplate.files.filter(f => f.category === 'criteria').map(f => f.content).join('\n---\n');
        templateContext = `
          DỰA TRÊN MẪU GIÁO ÁN SAU (Cấu trúc và phong cách):
          ${samples}

          TUÂN THỦ CÁC TIÊU CHÍ/QUY ĐỊNH SAU:
          ${criteria}
        `;
      }

      const mathRestrictions = subject === 'Toán học' || subject.toLowerCase().includes('toán') ? `
===========================================================
QUY TẮC SOẠN GIÁO ÁN MÔN TOÁN — BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI
===========================================================

I. CẤU TRÚC MỤC TIÊU BÀI HỌC (bắt buộc có đầy đủ):
   A. NĂNG LỰC CỐT LÕI: Tư duy toán học, Mô hình hóa toán học, Giao tiếp toán học, Giải quyết vấn đề toán học, Sử dụng công cụ & phương tiện học toán.
   B. Phẩm chất: Chăm chỉ, trung thực, trách nhiệm.
   C. MỤC TIÊU PHÂN HÓA (BẮT BUỘC — không được bỏ qua):
      - Học sinh khá/giỏi: [Yêu cầu nâng cao, bài toán mở rộng cụ thể]
      - Học sinh trung bình/yếu: [Yêu cầu tối thiểu cần đạt, hỗ trợ cụ thể]

II. ĐỊNH DẠNG BẢNG 3 CỘT — BẮT BUỘC cho TẤT CẢ 4 hoạt động:
   (Khởi động / Hình thành kiến thức / Luyện tập / Vận dụng)

   MỖI hoạt động PHẢI trình bày theo đúng bảng Markdown 3 cột sau:
   | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng/Sản phẩm dự kiến |
   |---|---|---|
   | ... | ... | ... |

   LƯU Ý: "Nội dung ghi bảng" là những nội dung trọng tâm mà Giáo viên sẽ ghi lên bảng để Học sinh ghi chép vào vở. KHÔNG được để trống cột này.

III. QUY TẮC LATEX — BẮT BUỘC cho MỌI biểu thức toán học:
   - Công thức trên cùng dòng văn bản: dùng $...$ (ví dụ: $f(x) = x^2 + 1$)
   - Công thức đứng riêng một dòng: dùng $$...$$ (ví dụ: $$\\int_0^1 x^2\\,dx = \\frac{1}{3}$$)
   - TUYỆT ĐỐI KHÔNG viết công thức dưới dạng plain text (sai: "x^2 + 1", đúng: "$x^2 + 1$")

===========================================================
      ` : '';

      if (generationMode === 'single') {
        const lessonDocsContent = lessonDocs.map(f => f.content).join('\n---\n');
        const prompt = `
          BẠN LÀ MỘT CHUYÊN GIA GIÁO DỤC CAO CẤP.
          NHIỆM VỤ: Soạn một giáo án "Masterpiece" (Kiệt tác sư phạm).

          BỐ CỤC PHẢN HỒI (BẮT BUỘC):
          1. <thinking>: Phân tích mục tiêu bài học, đặc điểm HS lớp ${currentPlan.grade}, lựa chọn phương pháp (VARK, 5E, Gagne...) và kế hoạch "gây nghiện" cho bài giảng.
          2. <lesson_content>: TOÀN BỘ nội dung giáo án chi tiết (Markdown), BAO GỒM CẢ phần đánh giá Danielson ở cuối.

          THÔNG TIN BÀI HỌC:
          - Môn học: ${subject}. Lớp: ${currentPlan.grade}. Tuần: ${currentPlan.week}.
          - Tiêu đề: ${currentPlan.title}.
          ${templateContext}
          ${activeDist ? `PHÂN PHỐI CHƯƠNG TRÌNH:\n${activeDist.content}` : ''}
          ${lessonDocsContent ? `TÀI LIỆU THAM KHẢO:\n${lessonDocsContent}` : ''}
          ${singleRequirement ? `YÊU CẦU BỔ SUNG: ${singleRequirement}` : ''}

          ===== YÊU CẦU ĐỊNH DẠNG NỘI DUNG BÊN TRONG <lesson_content> (TUYỆT ĐỐI TUÂN THỦ) =====
          A. CẤU TRÚC GIÁO ÁN:
          - Phần đầu: Thông tin chung (WALT, WILF 3 mức độ 🌶️, Năng lực cốt lõi) nếu là môn Toán.
          - TỔNG THỜI LƯỢNG: 40 PHÚT. Phân bổ hợp lý cho 5 hoạt động:
            + HĐ1: Mở đầu (~5 phút)
            + HĐ2: Hình thành kiến thức (~15 phút)
            + HĐ3: Luyện tập (~10 phút)
            + HĐ4: Vận dụng (~5 phút)
            + HĐ5: Sơ kết — Dặn dò về nhà (~5 phút)
          - TRƯỚC MỖI BẢNG, BẮT BUỘC ghi dòng "**Mục tiêu:**" nêu rõ hoạt động này dùng để làm gì.
          - MỖI HOẠT ĐỘNG phải trình bày dạng BẢNG MARKDOWN 3 CỘT:
            | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
          - CỘT 3 "Nội dung ghi bảng" là những nội dung trọng tâm mà GV sẽ chiếu slide hoặc viết lên bảng để HS nhìn và ghi chép vào vở. KHÔNG được để trống cột này.
          - HOẠT ĐỘNG 5 (Sơ kết — Dặn dò): GV giúp HS tổng kết lại những vấn đề chính và quan trọng đã học trong bài, sau đó dặn dò và giao bài tập về nhà. Cột 3 ghi rõ nội dung tóm tắt kiến thức trọng tâm và bài tập về nhà.
          - KHÔNG ĐƯỢC viết dạng đoạn văn tự do. PHẢI là bảng.
          - YÊU CẦU ĐỘ CHI TIẾT CỰC CAO (Ngôn ngữ biên kịch hội thoại 100%):
            + KHÔNG viết chung chung kiểu "GV yêu cầu HS làm bài".
            + BẮT BUỘC mỗi hoạt động phải có ÍT NHẤT 4-5 lượt trao đổi qua lại giữa GV và HS.
            + PHẢI viết rõ lời thoại: GV nói gì ("Các em hãy..."), HS trả lời gì, phản ứng ra sao. Giáo án phải dài và chi tiết như kịch bản phim.
            + TUYỆT ĐỐI KHÔNG LÀM NGẮN GỌN HAY TÓM TẮT. Hãy viết càng dài, càng sâu sắc, càng phân tích kỹ càng tốt.
            + Bắt buộc chèn các thẻ hành động sư phạm như \`[Quét Radar]\`, \`[🌐 Công dân toàn cầu]\`, \`[Chờ đợi 3 giây]\` vào cột Hoạt động của GV để giáo án sinh động.
          - Dùng <br/><br/> để cách dòng trong ô bảng.
          - LỒNG GHÉP 3 TUYÊN NGÔN DEWEY (BẮT BUỘC):
            1. Tuyên ngôn Công dân kĩ thuật số
            2. Tuyên ngôn Công dân toàn cầu và Học tập liên văn hóa
            3. Tuyên ngôn Dạy và học chất lượng cao
            => PHẢI chỉ rõ trong cột Hoạt động của GV/HS (dùng in đậm hoặc thẻ ghi chú như \`[💡 Tuyên ngôn: ...]\`) xem chỗ nào, câu nói hay hành động nào đáp ứng các tuyên ngôn này để người đọc thấy ngay.
          - Tích hợp kỹ năng thế kỷ 21 và năng lực cốt lõi.
          ${mathRestrictions}

          B. PHẦN ĐÁNH GIÁ DANIELSON (BẮT BUỘC, VIẾT Ở CUỐI BÊN TRONG <lesson_content>):
          Sau nội dung giáo án, PHẢI thêm phần:
          "## Đánh giá của tổ trưởng chuyên môn"
          BẮT BUỘC trình bày dưới dạng BẢNG MARKDOWN 3 CỘT (Tiêu chí | Điểm | Nhận xét).
          Tự chấm điểm theo khung Danielson Miền 1 (Thang 1-4, 4 là Tốt nhất) cho 6 tiêu chí:
          1a: Áp dụng kiến thức chuyên môn và sư phạm
          1b: Thấu hiểu học sinh
          1c: Thiết lập mục tiêu giảng dạy
          1d: Sử dụng tài nguyên hiệu quả
          1e: Thiết kế bài giảng mạch lạc
          1f: Đánh giá quá trình học tập

          C. VÍ DỤ MẪU (BẮT BUỘC BẮT CHƯỚC PHONG CÁCH NÀY CHO TẤT CẢ CÁC HOẠT ĐỘNG):
          \`\`\`markdown
          ## 🚀 HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (~15 phút)
          **Mục tiêu:** Học sinh tự khám phá ra công thức tổng quát và tính chất cơ bản.

          | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
          |---|---|---|
          | **[Quét Radar]** *Quan sát biểu cảm học sinh để xem mức độ hiểu bài.* <br/><br/> **GV:** "Các em hãy nhìn vào bảng hệ số ta vừa lập ở HĐ1. Ai phát hiện ra quy luật của các con số này?" <br/><br/> **[💡 Tuyên ngôn Dạy và học chất lượng cao: GV đóng vai trò người xúc tác, không áp đặt kiến thức]** <br/><br/> **GV:** "Tuyệt vời! Vậy hệ số của số hạng thứ $k+1$ chính là gì?" | **HS1:** "Thưa thầy, các hệ số này chính là các số trong tam giác Pascal ạ!" <br/><br/> **HS2:** "Nó tương ứng với tổ hợp $C_n^k$ ạ!" <br/><br/> **HS:** Ghi chép công thức tổng quát vào vở một cách hào hứng vì tự mình tìm ra. | **1. Định lý:** <br/> Công thức tổng quát: <br/> $(a+b)^n = \sum_{k=0}^{n} C_n^k a^{n-k} b^k$ <br/><br/> *Lưu ý:* Có $(n+1)$ số hạng. |
          \`\`\`
          ===== HẾT YÊU CẦU ĐỊNH DẠNG =====
        `;
        const result = await callAI(prompt, data.settings);
        if (result) {
          const finalContent = extractLessonContent(result);
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(finalContent) }));
          showToast('Đã khởi tạo giáo án cấp độ Senior!');
        }
      } else {
        const distContent = activeDist?.content || distributionFile?.content;
        const plannerPrompt = `
          BẠN LÀ CHUYÊN GIA TRÍ TUỆ NHÂN TẠO TRÍCH XUẤT DỮ LIỆU GIÁO DỤC.
          NHIỆM VỤ: Lập danh sách các bài học từ Phân phối chương trình (PPCN).

          BỐ CỤC PHẢN HỒI:
          1. <thinking>: Phân tích cấu trúc bảng trong PPCN, xác định cột tuần, cột bài, cột yêu cầu cần đạt.
          2. <extraction_list>: Trả về mảng JSON các bài học.

          NỘI DUNG PPCN:
          ${distContent}
          ---
          YÊU CẦU LỌC: ${bulkCommand}
          MÔN: ${subject}. LỚP: ${currentPlan.grade}.

          ĐỊNH DẠNG JSON TRONG <extraction_list>:
          [{"week": "2", "title": "...", "objectives": "..."}]
          KHÔNG TRẢ VỀ GÌ QUÁ NGOÀI XML.
        `;
        
        const planResponse = await callAI(plannerPrompt, data.settings);
        if (!planResponse) throw new Error("Không trích xuất được kế hoạch từ PPCN");

        let extractedLessons: { week: string, title: string, objectives: string }[] = [];
        try {
          const jsonMatch = planResponse.match(/\[[\s\S]*\]/);
          const jsonStr = jsonMatch ? jsonMatch[0] : planResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          extractedLessons = JSON.parse(jsonStr);
          if (!Array.isArray(extractedLessons) || extractedLessons.length === 0) {
            throw new Error("Danh sách bài học trích xuất rỗng");
          }
        } catch {
          throw new Error("AI không trả về danh sách bài học hợp lệ. Vui lòng thử lại hoặc kiểm tra lại file PPCN.");
        }
        
        setBulkProgress({ current: 0, total: extractedLessons.length, currentTitle: '' });
        setBulkResults([]);
        const newPlans: LessonPlan[] = [];

        for (let i = 0; i < extractedLessons.length; i++) {
          if (cancelBulkRef.current) break;
          const lesson = extractedLessons[i];
          setBulkProgress({ current: i + 1, total: extractedLessons.length, currentTitle: lesson.title });
          
          const detailPrompt = `
            BẠN LÀ CHUYÊN GIA BIÊN SOẠN GIÁO ÁN CAO CẤP.
            
            BỐ CỤC PHẢN HỒI:
            1. <thinking>: Phân tích ngắn mục tiêu bài, đặc điểm HS, phương pháp phù hợp.
            2. <lesson_content>: TOÀN BỘ giáo án (Markdown), BAO GỒM đánh giá Danielson ở cuối.

            HÃY SOẠN GIÁO ÁN CHI TIẾT CHO BÀI: "${lesson.title}"
            THÔNG TIN TỪ PHÂN PHỐI CHƯƠNG TRÌNH:
            - Tuần: ${lesson.week}
            - Mục tiêu/Kiến thức trọng tâm: ${lesson.objectives}
            
            ${templateContext}
            Lớp: ${currentPlan.grade}.

            ===== YÊU CẦU ĐỊNH DẠNG BÊN TRONG <lesson_content> (TUYỆT ĐỐI TUÂN THỦ) =====
            A. YÊU CẦU NGHIÊM NGẶT:
            1. NỘI DUNG PHẢI TUÂN THỦ HOÀN TOÀN THEO "MỤC TIÊU/KIẾN THỨC TRỌNG TÂM" ĐÃ TRÍCH XUẤT TRÊN.
            2. Tiêu đề bài soạn phải khớp 100% với tên bài được cung cấp.
            3. TỔNG THỜI LƯỢNG: 40 PHÚT. Phân bổ hợp lý cho 5 hoạt động:
              + HĐ1: Mở đầu (~5 phút)
              + HĐ2: Hình thành kiến thức (~15 phút)
              + HĐ3: Luyện tập (~10 phút)
              + HĐ4: Vận dụng (~5 phút)
              + HĐ5: Sơ kết — Dặn dò về nhà (~5 phút)
            4. TRƯỚC MỖI BẢNG, BẮT BUỘC ghi dòng "**Mục tiêu:**" nêu rõ hoạt động này dùng để làm gì.
            5. MỖI HOẠT ĐỘNG phải trình bày dạng BẢNG MARKDOWN 3 CỘT:
              | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
            6. CỘT 3 là những nội dung GV chiếu slide hoặc viết lên bảng cho HS nhìn và ghi chép. KHÔNG để trống.
            7. HĐ5 (Sơ kết — Dặn dò): GV giúp HS tổng kết những vấn đề chính đã học, sau đó dặn dò và giao bài tập về nhà.
            8. KHÔNG ĐƯỢC viết dạng đoạn văn tự do. PHẢI là bảng.
            9. YÊU CẦU ĐỘ CHI TIẾT CỰC CAO (Ngôn ngữ biên kịch hội thoại 100%):
               + BẮT BUỘC mỗi hoạt động phải có ÍT NHẤT 4-5 lượt trao đổi qua lại giữa GV và HS.
               + KHÔNG viết chung chung kiểu "GV yêu cầu HS...". PHẢI viết trích dẫn lời thoại cụ thể của GV và HS.
               + TUYỆT ĐỐI KHÔNG LÀM NGẮN GỌN HAY TÓM TẮT. Hãy viết càng dài, càng chi tiết càng tốt.
               + Sử dụng các thẻ sư phạm như \`[Quét Radar]\`, \`[🌐 Công dân toàn cầu]\` trong cột GV.
            10. LỒNG GHÉP 3 TUYÊN NGÔN DEWEY (BẮT BUỘC): Công dân kĩ thuật số, Công dân toàn cầu & Học tập liên văn hóa, Dạy và học chất lượng cao. PHẢI dùng thẻ \`[💡 Tuyên ngôn: ...]\` để chỉ rõ câu nói/hành động nào đáp ứng tuyên ngôn nào.
            11. Dùng <br/><br/> để cách dòng trong ô bảng.
            ${mathRestrictions}

            B. PHẦN ĐÁNH GIÁ DANIELSON (BẮT BUỘC, VIẾT Ở CUỐI BÊN TRONG <lesson_content>):
            "## Đánh giá của tổ trưởng chuyên môn"
            BẮT BUỘC trình bày dưới dạng BẢNG MARKDOWN 3 CỘT (Tiêu chí | Điểm | Nhận xét).
            Tự chấm điểm theo khung Danielson Miền 1 (Thang 1-4) cho 6 tiêu chí:
            1a: Áp dụng kiến thức chuyên môn và sư phạm
            1b: Thấu hiểu học sinh
            1c: Thiết lập mục tiêu giảng dạy
            1d: Sử dụng tài nguyên hiệu quả
            1e: Thiết kế bài giảng mạch lạc
            1f: Đánh giá quá trình học tập

            C. VÍ DỤ MẪU (BẮT BUỘC BẮT CHƯỚC PHONG CÁCH NÀY CHO TẤT CẢ CÁC HOẠT ĐỘNG):
            \`\`\`markdown
            ## 🚀 HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (~15 phút)
            **Mục tiêu:** Học sinh tự khám phá ra công thức tổng quát và tính chất cơ bản.

            | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
            |---|---|---|
            | **[Quét Radar]** *Quan sát biểu cảm học sinh để xem mức độ hiểu bài.* <br/><br/> **GV:** "Các em hãy nhìn vào bảng hệ số ta vừa lập ở HĐ1. Ai phát hiện ra quy luật của các con số này?" <br/><br/> **[💡 Tuyên ngôn Dạy và học chất lượng cao: GV đóng vai trò người xúc tác, không áp đặt kiến thức]** <br/><br/> **GV:** "Tuyệt vời! Vậy hệ số của số hạng thứ $k+1$ chính là gì?" | **HS1:** "Thưa thầy, các hệ số này chính là các số trong tam giác Pascal ạ!" <br/><br/> **HS2:** "Nó tương ứng với tổ hợp $C_n^k$ ạ!" <br/><br/> **HS:** Ghi chép công thức tổng quát vào vở một cách hào hứng. | **1. Định lý:** <br/> Công thức tổng quát: <br/> $(a+b)^n = \sum_{k=0}^{n} C_n^k a^{n-k} b^k$ <br/><br/> *Lưu ý:* Có $(n+1)$ số hạng. |
            \`\`\`
            ===== HẾT YÊU CẦU =====
          `;

          const detailResponse = await callAI(detailPrompt, data.settings);
          if (detailResponse) {
            const newPlan: LessonPlan = {
              id: crypto.randomUUID(),
              subjectId: currentPlan.subjectId || 'math',
              templateId: currentPlan.templateId,
              grade: currentPlan.grade,
              week: lesson.week || currentPlan.week,
              title: lesson.title,
              content: cleanMarkdownOutput(extractLessonContent(detailResponse)),
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            newPlans.push(newPlan);
            // Stream partial results so user sees each lesson as it finishes
            setBulkResults([...newPlans]);
          }
        }
        if (cancelBulkRef.current) {
          showToast(`Đã hủy — lưu lại ${newPlans.length} giáo án đã soạn xong`, 'warning');
        } else {
          showToast(`Đã tự động soạn xong ${newPlans.length} giáo án!`);
        }
      }
    } catch (error: any) {
      showToast(error.message || 'Lỗi soạn thảo', 'error');
    } finally {
      setIsLoading(false);
      setBulkProgress({ current: 0, total: 0, currentTitle: '' });
    }
  };

  const handleReviseLesson = async () => {
    if (!revisionPrompt.trim() || !currentPlan.content || !getActiveApiKey(data.settings)) return;
    setIsLoading(true);
    try {
      const prompt = `Viết lại giáo án sau theo yêu cầu: "${revisionPrompt}". \nNội dung cũ: ${currentPlan.content}`;
      const result = await callAI(prompt, data.settings);
      if (result) {
        setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(result) }));
        setRevisionPrompt('');
        showToast('Đã cập nhật giáo án!');
      }
    } catch (error) {
      showToast('Lỗi khi sửa đổi', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generationMode, setGenerationMode,
    builtinFormat, setBuiltinFormat,
    currentPlan, setCurrentPlan,
    lessonDocs, setLessonDocs,
    singleRequirement, setSingleRequirement,
    distributionFile, setDistributionFile,
    selectedDistributionId, setSelectedDistributionId,
    bulkCommand, setBulkCommand,
    bulkResults, setBulkResults,
    bulkProgress,
    handleCreateLesson,
    cancelBulk,
    handleReviseLesson,
    revisionPrompt, setRevisionPrompt
  };
};
