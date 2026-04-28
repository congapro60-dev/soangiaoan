import { useState, useRef } from 'react';
import { LessonPlan, AppData, TemplateFile } from '../types';
import { callAI, callAIStream, getActiveApiKey } from '../lib/aiProviders';
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
  const [builtinFormat, setBuiltinFormat] = useState<'default' | 'cv5512' | 'claude'>('default');
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

      const CLAUDE_FORMAT = `
===== MẪU GIÁO ÁN CLAUDE — CHUYÊN SÂU & PHÂN HÓA (BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI) =====

Đây là định dạng giáo án XUẤT SẮC theo chuẩn quốc tế (WALT/WILF + Danielson Framework).
Bạn PHẢI tạo ra một sản phẩm có ĐỘ CHI TIẾT VÀ CHIỀU SÂU NGANG VỚI giáo án mẫu mô tả dưới đây — không được rút gọn, không được generic.

────────────────────────────────────────────────────────────────
BỐ CỤC BẮT BUỘC: 5 HOẠT ĐỘNG + ĐÁNH GIÁ DANIELSON
────────────────────────────────────────────────────────────────

# 📘 GIÁO ÁN: [TÊN BÀI HỌC IN HOA]
**Môn:** [...] | **Lớp:** [...] | **Tuần:** [...] | **Tiết:** [...] | **Thời lượng:** [X] phút

---

## 🎯 THÔNG TIN CHUNG

**WALT (We Are Learning To):**
> [Phát biểu mục tiêu học tập 1-2 câu, dùng giọng "chúng ta sẽ học cách..."]

**WILF (What I'm Looking For):** — Bảng phân hóa 3 mức năng lực

| Mức độ | Yêu cầu |
|---|---|
| 🌶️ Cơ bản | [Yêu cầu tối thiểu — HS yếu/trung bình PHẢI đạt được. Liệt kê 2-3 ý cụ thể, có công thức/ví dụ.] |
| 🌶️🌶️ Nâng cao | [Yêu cầu mức khá — vận dụng linh hoạt. Liệt kê 2-3 dạng bài tiêu biểu.] |
| 🌶️🌶️🌶️ Thách thức | [Yêu cầu cao — chứng minh, sáng tạo, kết nối liên môn. Liệt kê 1-2 bài hóc búa.] |

**NĂNG LỰC CỐT LÕI:**
- 🧠 **Tư duy [môn]:** [Mô tả cụ thể, không generic]
- 📐 **Mô hình hóa:** [Mô tả cụ thể]
- 💬 **Giao tiếp [môn]:** [Mô tả cụ thể]
- 🔧 **Sử dụng công cụ:** [Liệt kê công cụ cụ thể: máy tính, GeoGebra, sơ đồ tư duy...]

---

## 🚀 HOẠT ĐỘNG 1: MỞ ĐẦU (~5 phút)

**Mục tiêu:** [Tạo hứng thú, kích hoạt kiến thức nền, đặt vấn đề CỤ THỂ cho bài mới]

| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| **GV:** "[Câu thoại VERBATIM trong dấu nháy kép]" | **HS1:** "[Phản hồi dự kiến cụ thể của HS đầu tiên]" | [Nội dung trên bảng: công thức, sơ đồ, câu hỏi mở] |
| **GV:** "[Câu hỏi gợi mở tiếp theo]" | **HS2:** "[Phản hồi của HS thứ hai]" | ❓ [Vấn đề đặt ra → cần công cụ mới!] |
| **GV:** "[Câu chốt vấn đề]" | **HS:** [Hành động: ghi bài / suy nghĩ / thảo luận] | |

---

## 📚 HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (~15 phút)

**Mục tiêu:** [Xây dựng và phát biểu kiến thức cốt lõi, rút ra hệ quả/tính chất quan trọng]

(Có thể chia 2-3 phần con đánh dấu **📌 Phần 1:**, **📌 Phần 2:**...)

| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| **📌 Phần 1: [Tên phần] ([X] phút)** | | |
| **GV:** "[Dẫn dắt khám phá]" | **HS:** [Hoạt động khám phá cụ thể] | **📋 [TÊN ĐỊNH LÝ/CÔNG THỨC]:** <br/> $$\\boxed{[công thức chính]}$$ |
| **GV:** Dẫn dắt HS phát hiện: [Quy luật/định lý] | **HS:** "[Phát biểu quy luật]" | **Lưu ý:** [Điểm cần nhớ] |
| **GV:** "[Câu chốt công thức]" | **HS:** Ghi công thức vào vở. | |

---

## ✏️ HOẠT ĐỘNG 3: LUYỆN TẬP (~10 phút)

**Mục tiêu:** Rèn kỹ năng vận dụng — phân hóa 3 mức cho HS.

BẮT BUỘC có **3 BÀI TẬP** tương ứng 3 mức 🌶️ trong WILF:

| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| **🌶️ Bài 1 (Cơ bản — [X] phút):** <br/> "[Đề bài cụ thể]" <br/><br/> **GV:** "[Hướng dẫn tiếp cận]" | **HS:** [Lời giải từng bước] | **Bài 1:** [Đáp án rút gọn] ✅ |
| **🌶️🌶️ Bài 2 (Nâng cao — [X] phút):** <br/> "[Đề bài cụ thể]" <br/><br/> **GV:** "[Gợi ý chiến lược]" | **HS:** [Lời giải có biện luận] | **Bài 2:** [Đáp án + chú thích] ✅ |
| **🌶️🌶️🌶️ Bài 3 (Thách thức — [X] phút, cho HS khá/giỏi):** <br/> "[Đề bài chứng minh / mở rộng]" <br/><br/> **GV:** "[Gợi ý cao]" | **HS:** [Chứng minh đầy đủ] | **Bài 3:** [Lời giải hoàn chỉnh] ∎ |

---

## 🌍 HOẠT ĐỘNG 4: VẬN DỤNG (~5 phút)

**Mục tiêu:** Liên hệ thực tế — chỉ ra ứng dụng CỤ THỂ trong đời sống / liên môn.

| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| **GV:** "[Tình huống thực tế cụ thể: y học, kinh tế, kỹ thuật, AI, môi trường...]" | **HS:** [Tính toán / phân tích cụ thể] | **Bài toán thực tế:** <br/> [Phát biểu tình huống] <br/> $$[Công thức / kết quả]$$ |
| **GV:** "[Liên hệ với kiến thức vừa học]" | **HS:** "[Phát hiện kết nối]" | 💡 Liên hệ: [Tên ngành / khái niệm liên môn] |
| **GV:** "[Mở rộng tầm quan trọng]" | **HS:** [Ghi chép / nhận xét] | |

---

## 📝 HOẠT ĐỘNG 5: SƠ KẾT — DẶN DÒ VỀ NHÀ (~5 phút)

**Mục tiêu:** Hệ thống hóa, khắc sâu kiến thức trọng tâm, giao bài tập về nhà phân hóa.

| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| **GV:** "[Yêu cầu HS tóm tắt 3 ý chính]" | **HS1:** "[Ý 1]" | **📋 TÓM TẮT BÀI HỌC:** <br/> 1️⃣ [Ý chính 1] |
| | **HS2:** "[Ý 2]" | 2️⃣ [Ý chính 2] |
| | **HS3:** "[Ý 3]" | 3️⃣ [Ý chính 3] |
| **GV:** Chốt nội dung trọng tâm. | **HS:** Ghi bài. | |
| **GV:** "[Giao BTVN, dặn dò kiểm tra tiết sau]" | **HS:** Ghi BTVN. | **📌 BÀI TẬP VỀ NHÀ:** <br/> 1. [Bài cơ bản] <br/> 2. [Bài nâng cao] <br/> ⭐ [Bài thách thức cho HS khá/giỏi] |
| **GV:** "[Khuyến khích HS giỏi làm bài ⭐]" | **HS:** [Ghi chú bài ⭐] | |

---

## 📋 Đánh giá của tổ trưởng chuyên môn

*Tự đánh giá theo khung Danielson — Miền 1: Lên kế hoạch và chuẩn bị*

| Tiêu chí | Điểm | Nhận xét |
|---|---|---|
| **1a:** Áp dụng kiến thức chuyên môn và sư phạm | [3 hoặc 4]/4 [⭐ nếu 4] | [Nhận xét cụ thể về độ chính xác kiến thức + phương pháp giảng dạy được dùng] |
| **1b:** Thấu hiểu học sinh | [3 hoặc 4]/4 [⭐ nếu 4] | [Nhận xét cụ thể về phân hóa 🌶️ trong WILF, HĐ3, BTVN] |
| **1c:** Thiết lập mục tiêu giảng dạy | [3 hoặc 4]/4 [⭐ nếu 4] | [Nhận xét về WALT/WILF rõ ràng, đo lường được] |
| **1d:** Sử dụng tài nguyên hiệu quả | [3 hoặc 4]/4 | [Có thể bổ sung gì để tốt hơn — thường cho 3/4 nếu có gợi ý cải tiến] |
| **1e:** Thiết kế bài giảng mạch lạc | [3 hoặc 4]/4 [⭐ nếu 4] | [Nhận xét về liên kết 5 hoạt động, phân bổ thời gian] |
| **1f:** Đánh giá quá trình học tập | [3 hoặc 4]/4 [⭐ nếu 4] | [Nhận xét về đánh giá xuyên suốt: quan sát, câu hỏi, bài tập, BTVN] |

**Tổng điểm: [tổng]/24** — [Xuất sắc nếu ≥22, Tốt nếu 18-21] ✅

────────────────────────────────────────────────────────────────
QUY TẮC NGHIÊM NGẶT (KHÔNG ĐƯỢC VI PHẠM):
────────────────────────────────────────────────────────────────
1. ĐỦ 5 HOẠT ĐỘNG — không gộp HĐ4+5, không bỏ HĐ5 (Sơ kết).
2. Mỗi HĐ phải có Mục tiêu riêng (1-2 câu) và thời lượng cụ thể trong tiêu đề.
3. Bảng 3 cột với HEADER CHÍNH XÁC: "Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến"
4. Câu thoại GV phải VERBATIM (đặt trong dấu "..."), KHÔNG mô tả gián tiếp ("GV nêu vấn đề" — SAI).
5. Phản hồi HS dự kiến phải CỤ THỂ (HS1, HS2, HS3), KHÔNG generic ("HS trả lời" — SAI).
6. WILF phải có ĐỦ 3 mức 🌶️ / 🌶️🌶️ / 🌶️🌶️🌶️ — không bỏ mức nào.
7. HĐ3 (Luyện tập) phải có ĐÚNG 3 BÀI tương ứng 3 mức trên.
8. HĐ4 phải có liên hệ thực tế CỤ THỂ (tên ngành, ứng dụng) — không nói chung chung "ứng dụng nhiều trong cuộc sống".
9. HĐ5 phải có TÓM TẮT 3 ý + BTVN, trong đó BTVN có ít nhất 1 bài ⭐ (cho HS khá/giỏi).
10. Phần Danielson cuối bài: chấm điểm THỰC (3-4/4), kèm nhận xét DỰA TRÊN nội dung giáo án vừa soạn (không generic).
11. Dùng emoji icon đầu mỗi mục đúng chuẩn: 🎯 (info) 🚀 (HĐ1) 📚 (HĐ2) ✏️ (HĐ3) 🌍 (HĐ4) 📝 (HĐ5) 📋 (Danielson).
12. Dùng phân cách "---" giữa các hoạt động.
13. Mỗi lượt trao đổi GV↔HS (1 câu nói/câu hỏi GV + phản hồi HS tương ứng + nội dung bảng tương ứng) = 1 HÀNG RIÊNG BIỆT trong bảng. TUYỆT ĐỐI KHÔNG dồn nhiều lượt trao đổi vào 1 hàng bằng <br/><br/>. Bảng 5-8 lượt thoại = 5-8 hàng riêng biệt. Trong ô bảng, chỉ dùng <br/> đơn để xuống dòng nội dung trong cùng 1 lượt (ví dụ: công thức nhiều dòng ở cột 3).
===== KẾT THÚC MẪU CLAUDE =====
`;

      let templateContext = '';
      if (builtinFormat === 'cv5512') {
        templateContext = CV5512_FORMAT;
      } else if (builtinFormat === 'claude') {
        templateContext = CLAUDE_FORMAT;
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

II. ĐỊNH DẠNG BẢNG 3 CỘT — BẮT BUỘC cho TẤT CẢ hoạt động:
   MỖI hoạt động PHẢI trình bày theo đúng bảng Markdown 3 cột sau:
   | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng/Sản phẩm dự kiến |
   |---|---|---|
   | ... | ... | ... |

   LƯU Ý: "Nội dung ghi bảng" là những nội dung trọng tâm mà Giáo viên sẽ ghi lên bảng để Học sinh ghi chép vào vở. KHÔNG được để trống cột này.
   LƯU Ý CĂNG HÀNG: Mỗi lượt trao đổi GV↔HS = 1 hàng riêng biệt. TUYỆT ĐỐI KHÔNG dùng <br/><br/> để gộp nhiều lượt vào 1 hàng.

III. QUY TẮC LATEX & FONT CHỮ — BẮT BUỘC:
   - Công thức trên cùng dòng văn bản: dùng $...$ (ví dụ: $f(x) = x^2 + 1$)
   - Công thức đứng riêng một dòng: dùng $$...$$ (ví dụ: $$\int_0^1 x^2\,dx = \frac{1}{3}$$)
   - TUYỆT ĐỐI KHÔNG dùng ký tự gạch đứng "|" trong công thức Toán vì sẽ làm vỡ bảng Markdown. Bắt buộc dùng "\\mid" (ví dụ: viết $P(A \\mid B)$ thay vì $P(A|B)$).
   - Văn bản Tiếng Việt phải gõ liền mạch chuẩn xác, TUYỆT ĐỐI KHÔNG được viết tách rời dấu (ví dụ sai: "b a ˘ ˋ n g", đúng: "bằng").

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
          A. CẤU TRÚC GIÁO ÁN (GIỮ NGUYÊN BẢN MẪU, CHỈ THÊM CHI TIẾT):
          - Phần đầu: WALT và WILF phải chia làm 3 tiêu chí KHÁC NHAU tương ứng 3 mức độ (🌶️ Cơ bản, 🌶️🌶️ Nâng cao, 🌶️🌶️🌶️ Thách thức). TUYỆT ĐỐI KHÔNG lặp lại 1 tiêu chí 3 lần.
          - TỔNG THỜI LƯỢNG: 40 PHÚT. TẤT CẢ 5 HĐ (HĐ1 đến HĐ5) đều PHẢI có kịch bản đối thoại chi tiết (5-8 lượt thoại), KHÔNG ĐƯỢC viết sơ sài ở HĐ1, HĐ4, HĐ5:
            + HĐ1 (Mở đầu): GV đặt câu hỏi khơi gợi WALT/WILF.
            + HĐ2 (Hình thành KT): Diễn giải từng bước tư duy của HS.
            + HĐ3 (Luyện tập): Tối thiểu 3 bài tập (3 mức 🌶️). Cột 3 ghi lời giải.
            + HĐ4 (Vận dụng): Có hội thoại hướng dẫn thực tế.
            + HĐ5 (Sơ kết): Hội thoại HS tự kiểm tra mục tiêu đầu giờ.
          - KHUNG SƯ PHẠM CIS (CHỌN LỌC): Để đảm bảo thời gian, CHỌN NGẪU NHIÊN 1 HOẶC 2 KỸ THUẬT sau để lồng ghép (KHÔNG dùng cả 5 vào 1 bài):
            1. "Thông tin viên" (HĐ1): Dùng ảnh/vấn đề thực tế.
            2. "Thực đơn Toán học" (HĐ3): Giao bài tập theo dạng Menu. Bố trí "Phao cứu sinh".
            3. "Chuyên gia & Phản biện" (HĐ2/HĐ3): HS đóng vai chất vấn "Tại sao?".
            4. "Check-var Công nghệ" (HĐ2): Dùng Desmos/Casio cố tình đưa lỗi sai.
            5. "Vé ra cửa 3-2-1" (HĐ5): Cuối giờ ghi 3 từ khóa, 2 kỹ năng, 1 câu hỏi.
          - TRƯỚC MỖI BẢNG, BẮT BUỘC ghi dòng "**Mục tiêu:**".
          - MỖI HOẠT ĐỘNG trình bày BẢNG MARKDOWN 3 CỘT: 
            | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
          - YÊU CẦU KHÔNG NHẦM CỘT CỦA BẢNG: 
            + Đề bài tập/Menu, lời giải chi tiết phải nằm ở Cột 3 (Nội dung ghi bảng).
            + Lời nói/Hành động của thầy cô ("Phao cứu sinh", "Quét radar") CHỈ NẰM Ở Cột 1.
            + Lời nói/Hành động của học sinh CHỈ NẰM Ở Cột 2.
          - YÊU CẦU ĐỘ CHI TIẾT CỰC CAO (MINUTE-BY-MINUTE):
            + MỖI HOẠT ĐỘNG (Kể cả HĐ1, HĐ4, HĐ5) PHẢI CÓ 5-8 LƯỢT THOẠI QUA LẠI.
            + Cột GV phải dùng hệ thống câu hỏi dẫn dắt (Scaffolding) đi từ dễ đến khó. Chèn các thẻ \`[Quét Radar]\`, \`[Mistake of the Day]\`, \`[Chấm chéo]\`.
          - LỒNG GHÉP 3 TUYÊN NGÔN DEWEY (BẮT BUỘC): dùng thẻ \`[💡 Tuyên ngôn: ...]\` để chỉ rõ câu nói/hành động nào đáp ứng tuyên ngôn nào.
          ${mathRestrictions}

          B. PHẦN ĐÁNH GIÁ DANIELSON (BẮT BUỘC, VIẾT Ở CUỐI BÊN TRONG <lesson_content>):
          Sau nội dung giáo án, PHẢI thêm phần:
          "## Đánh giá của tổ trưởng chuyên môn"
          BẮT BUỘC trình bày dưới dạng BẢNG MARKDOWN 3 CỘT (Tiêu chí | Điểm | Nhận xét).
          YÊU CẦU ĐỐI VỚI CỘT NHẬN XÉT: Phải viết chi tiết, cụ thể như một tổ trưởng chuyên môn thực thụ (ít nhất 2-3 câu mỗi tiêu chí). CHỈ RÕ giáo án đã làm tốt chỗ nào. TUYỆT ĐỐI KHÔNG viết chung chung.
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
          | **[Quét Radar]** *Quan sát biểu cảm học sinh để xem mức độ hiểu bài.* | | |
          | **GV:** "Các em hãy nhìn vào bảng hệ số ta vừa lập ở HĐ1. Ai phát hiện ra quy luật của các con số này?" | **HS1:** "Thưa thầy, các hệ số này chính là các số trong tam giác Pascal ạ!" | **1. Định lý:** <br/> Công thức tổng quát: <br/> $(a+b)^n = \\sum_{k=0}^{n} C_n^k a^{n-k} b^k$ |
          | **[💡 Tuyên ngôn Dạy và học chất lượng cao: GV đóng vai trò người xúc tác, không áp đặt kiến thức]** <br/> **GV:** "Tuyệt vời! Vậy hệ số của số hạng thứ $k+1$ chính là gì?" | **HS2:** "Nó tương ứng với tổ hợp $C_n^k$ ạ!" | *Lưu ý:* Có $(n+1)$ số hạng. |
          | **GV:** Chốt: "Đây chính là Định lý Nhị thức Newton!" | **HS:** Ghi chép công thức vào vở. | |
          \`\`\`
          ===== HẾT YÊU CẦU ĐỊNH DẠNG =====
        `;
        let fullResult = '';
        await callAIStream(prompt, data.settings, (chunk) => {
          fullResult += chunk;
          const currentExtracted = extractLessonContent(fullResult);
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(currentExtracted) }));
        });
        showToast('Đã khởi tạo giáo án cấp độ Senior!');
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

        const CONCURRENCY = 3;
        for (let i = 0; i < extractedLessons.length; i += CONCURRENCY) {
          if (cancelBulkRef.current) break;
          
          const chunk = extractedLessons.slice(i, i + CONCURRENCY);
          const chunkPromises = chunk.map(async (lesson, index) => {
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
                + HĐ1: Mở đầu (~5 phút). BẮT BUỘC: Giáo viên phải đặt câu hỏi khơi gợi để học sinh tự xác định được mục tiêu tiết học.
                + HĐ2: Hình thành kiến thức (~15 phút). PHẦN NÀY ĐẶC BIỆT QUAN TRỌNG: Phải cực kỳ chi tiết, diễn giải từng bước tư duy của học sinh.
                + HĐ3: Luyện tập (~10 phút). BẮT BUỘC: Đưa ra TỐI THIỂU 3 bài tập cụ thể tương ứng 3 mức độ (Cơ bản 🌶️, Nâng cao 🌶️🌶️, Thách thức 🌶️🌶️🌶️) kèm lời giải.
                + HĐ4: Vận dụng (~5 phút)
                + HĐ5: Sơ kết — Dặn dò về nhà (~5 phút). BẮT BUỘC: Giáo viên phải đặt câu hỏi để học sinh đối chiếu và tự xác nhận xem các mục tiêu đặt ra ở đầu giờ đã hoàn thành chưa.
              4. TRƯỚC MỖI BẢNG, BẮT BUỘC ghi dòng "**Mục tiêu:**" nêu rõ hoạt động này dùng để làm gì.
              5. MỖI HOẠT ĐỘNG phải trình bày dạng BẢNG MARKDOWN 3 CỘT:
                | Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
              6. CỘT 3 là những nội dung GV chiếu slide hoặc viết lên bảng cho HS nhìn và ghi chép. KHÔNG để trống.
              7. HĐ5 (Sơ kết — Dặn dò): GV giúp HS tổng kết những vấn đề chính đã học, sau đó dặn dò và giao bài tập về nhà.
              8. KHÔNG ĐƯỢC viết dạng đoạn văn tự do. PHẢI là bảng.
              9. YÊU CẦU ĐỘ CHI TIẾT CỰC CAO (GIÁO ÁN KỊCH BẢN TỪNG PHÚT - MINUTE-BY-MINUTE):
                 + MỖI HOẠT ĐỘNG PHẢI CÓ ÍT NHẤT 5-8 LƯỢT HỘI THOẠI QUA LẠI GIỮA GV VÀ HS. KHÔNG ĐƯỢC TÓM TẮT.
                 + CỘT "HOẠT ĐỘNG CỦA GV" CẦN NÊU RÕ HỆ THỐNG CÂU HỎI ĐỊNH HƯỚNG: Phải ghi rõ các câu hỏi dẫn dắt (Scaffolding questions) đi từ dễ đến khó để khơi gợi tư duy, tuyệt đối không giảng giải trực tiếp một chiều.
                 + Sử dụng liên tục các thẻ sư phạm như \`[Quét Radar]\`, \`[Chờ đợi 3 giây]\` trong cột GV.
              10. LỒNG GHÉP 3 TUYÊN NGÔN DEWEY (BẮT BUỘC): Công dân kĩ thuật số, Công dân toàn cầu & Học tập liên văn hóa, Dạy và học chất lượng cao. PHẢI dùng thẻ \`[💡 Tuyên ngôn: ...]\` để chỉ rõ câu nói/hành động nào đáp ứng tuyên ngôn nào.
              11. Dùng <br/><br/> để cách dòng trong ô bảng.
              ${mathRestrictions}

              B. PHẦN ĐÁNH GIÁ DANIELSON (BẮT BUỘC, VIẾT Ở CUỐI BÊN TRONG <lesson_content>):
              "## Đánh giá của tổ trưởng chuyên môn"
              BẮT BUỘC trình bày dưới dạng BẢNG MARKDOWN 3 CỘT (Tiêu chí | Điểm | Nhận xét).
              YÊU CẦU ĐỐI VỚI CỘT NHẬN XÉT: Phải viết chi tiết, cụ thể (ít nhất 2-3 câu mỗi tiêu chí). CHỈ RÕ giáo án đã làm tốt chỗ nào. TUYỆT ĐỐI KHÔNG viết chung chung.
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
            try {
              const detailResponse = await callAI(detailPrompt, data.settings);
              if (detailResponse && !cancelBulkRef.current) {
                return {
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
                } as LessonPlan;
              }
            } catch (err) {
              console.error(`Lỗi soạn bài ${lesson.title}:`, err);
            }
            return null;
          });

          setBulkProgress({ current: i, total: extractedLessons.length, currentTitle: `Đang xử lý ${chunk.length} bài cùng lúc...` });
          
          const results = await Promise.all(chunkPromises);
          if (cancelBulkRef.current) break;

          const validPlans = results.filter(p => p !== null) as LessonPlan[];
          newPlans.push(...validPlans);
          
          setBulkProgress({ current: Math.min(i + CONCURRENCY, extractedLessons.length), total: extractedLessons.length, currentTitle: chunk[chunk.length - 1].title });
          setBulkResults([...newPlans]);
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
