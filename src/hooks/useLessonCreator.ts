import { useState, useRef } from 'react';
import { LessonPlan, AppData, TemplateFile } from '../types';
import { callAI, getActiveApiKey } from '../lib/aiProviders';
import { cleanMarkdownOutput } from '../utils/markdownUtils';
import Swal from 'sweetalert2';

// Note: MODELS and MODELS_LIST should be consistent. 
// In App.tsx it was MODELS.indexOf(data.settings.selectedModel)
// I'll keep that logic.

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

A. HOẠT ĐỘNG 1: KHỞI ĐỘNG (~ 5 phút)
a) Mục tiêu: Tạo hứng thú, kết nối kiến thức cũ với bài mới.
b) Nội dung: [Mô tả tình huống/câu hỏi khởi động]
c) Sản phẩm: [Câu trả lời / ý kiến của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS |
|---|---|
| ... | ... |

B. HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (~ [X] phút)
a) Mục tiêu: [Học sinh nắm được ...]
b) Nội dung: [Nội dung kiến thức cần hình thành]
c) Sản phẩm: [Ghi chép / bài làm / sơ đồ tư duy của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS |
|---|---|
| ... | ... |

C. HOẠT ĐỘNG 3: LUYỆN TẬP (~ [X] phút)
a) Mục tiêu: [Củng cố, rèn kỹ năng vận dụng kiến thức vừa học]
b) Nội dung: [Bài tập / câu hỏi luyện tập cụ thể]
c) Sản phẩm: [Kết quả bài tập của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS |
|---|---|
| ... | ... |

D. HOẠT ĐỘNG 4: VẬN DỤNG (~ [X] phút)
a) Mục tiêu: [Giúp HS vận dụng kiến thức vào thực tiễn]
b) Nội dung: [Bài toán thực tiễn / dự án mini]
c) Sản phẩm: [Bài trình bày / sản phẩm của HS]
d) Tổ chức thực hiện:
| Hoạt động của GV | Hoạt động của HS |
|---|---|
| ... | ... |

IV. PHỤ LỤC (nếu có)
[Phiếu học tập, bảng kiểm, bài tập về nhà, ...]

QUY TẮC NGHIÊM NGẶT:
- Mỗi hoạt động PHẢI có đủ 4 mục: a) Mục tiêu, b) Nội dung, c) Sản phẩm, d) Tổ chức thực hiện.
- Bảng "Tổ chức thực hiện" PHẢI có 2 cột: "Hoạt động của GV" và "Hoạt động của HS".
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
| **GV:** "[Câu thoại VERBATIM trong dấu nháy kép]" <br/><br/> **GV:** "[Câu hỏi gợi mở tiếp theo]" <br/><br/> **GV:** "[Câu chốt vấn đề]" | **HS1:** "[Phản hồi dự kiến cụ thể của HS đầu tiên]" <br/><br/> **HS2:** "[Phản hồi của HS thứ hai]" <br/><br/> **HS:** [Hành động: ghi bài / suy nghĩ / thảo luận] | [Nội dung trên bảng: công thức, sơ đồ, câu hỏi mở] <br/><br/> ❓ [Vấn đề đặt ra → cần công cụ mới!] |

---

## 📚 HOẠT ĐỘNG 2: HÌNH THÀNH KIẾN THỨC MỚI (~15 phút)

**Mục tiêu:** [Xây dựng và phát biểu kiến thức cốt lõi, rút ra hệ quả/tính chất quan trọng]

(Có thể chia 2-3 phần con đánh dấu **📌 Phần 1:**, **📌 Phần 2:**...)

| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| **📌 Phần 1: [Tên phần] ([X] phút)** <br/><br/> **GV:** "[Dẫn dắt khám phá]" <br/><br/> **GV:** Dẫn dắt HS phát hiện: [Quy luật/định lý] <br/><br/> **GV:** "[Câu chốt công thức]" | **HS:** [Hoạt động khám phá cụ thể] <br/><br/> **HS:** "[Phát biểu quy luật]" <br/><br/> **HS:** Ghi công thức vào vở. | **📋 [TÊN ĐỊNH LÝ/CÔNG THỨC]:** <br/><br/> $$\\boxed{[công thức chính]}$$ <br/><br/> **Lưu ý:** [Điểm cần nhớ] |

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
| **GV:** "[Tình huống thực tế cụ thể: y học, kinh tế, kỹ thuật, AI, môi trường...]" <br/><br/> **GV:** "[Liên hệ với kiến thức vừa học]" <br/><br/> **GV:** "[Mở rộng tầm quan trọng]" | **HS:** [Tính toán / phân tích cụ thể] <br/><br/> **HS:** "[Phát hiện kết nối]" | **Bài toán thực tế:** <br/> [Phát biểu tình huống] <br/><br/> $$[Công thức / kết quả]$$ <br/><br/> 💡 Liên hệ: [Tên ngành / khái niệm liên môn] |

---

## 📝 HOẠT ĐỘNG 5: SƠ KẾT — DẶN DÒ VỀ NHÀ (~5 phút)

**Mục tiêu:** Hệ thống hóa, khắc sâu kiến thức trọng tâm, giao bài tập về nhà phân hóa.

| Hoạt động của GV | Hoạt động của HS | Nội dung ghi bảng / Sản phẩm dự kiến |
|---|---|---|
| **GV:** "[Yêu cầu HS tóm tắt 3 ý chính]" <br/><br/> **GV:** Chốt nội dung trọng tâm. <br/><br/> **GV:** "[Giao BTVN, dặn dò kiểm tra tiết sau]" <br/><br/> **GV:** "[Khuyến khích HS giỏi làm bài ⭐]" | **HS1:** "[Ý 1]" <br/> **HS2:** "[Ý 2]" <br/> **HS3:** "[Ý 3]" <br/><br/> **HS:** Ghi BTVN. | **📋 TÓM TẮT BÀI HỌC:** <br/> 1️⃣ [Ý chính 1] <br/> 2️⃣ [Ý chính 2] <br/> 3️⃣ [Ý chính 3] <br/><br/> **📌 BÀI TẬP VỀ NHÀ:** <br/> 1. [Bài cơ bản] <br/> 2. [Bài nâng cao] <br/> ⭐ [Bài thách thức cho HS khá/giỏi] |

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
13. Dùng <br/><br/> để xuống dòng trong ô bảng.
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
          2. <lesson_content>: Nội dung giáo án chi tiết (Markdown).
          3. <pedagogical_review>: Tự đánh giá giáo án dựa trên Danielson Framework Domain 1.

          THÔNG TIN BÀI HỌC:
          - Môn học: ${subject}. Lớp: ${currentPlan.grade}. Tuần: ${currentPlan.week}.
          - Tiêu đề: ${currentPlan.title}.
          ${templateContext}
          ${activeDist ? `PHÂN PHỐI CHƯƠNG TRÌNH:\n${activeDist.content}` : ''}
          ${lessonDocsContent ? `TÀI LIỆU THAM KHẢO:\n${lessonDocsContent}` : ''}
          ${singleRequirement ? `YÊU CẦU BỔ SUNG: ${singleRequirement}` : ''}

          YÊU CẦU NỘI DUNG (<lesson_content>):
          - Tiến trình 4 bước chuyên sâu (Mở đầu, Hình thành kiến thức, Luyện tập, Vận dụng).
          - Mỗi bước trình bày dạng BẢNG 3 CỘT (Hoạt động GV | Hoạt động HS | Công cụ & Đánh giá).
          - Ngôn ngữ biên kịch hội thoại 100%. Dùng <br/><br/> để cách dòng trong bảng.
          - Tích hợp kỹ năng thế kỷ 21 và năng lực cốt lõi.
          ${mathRestrictions}

          YÊU CẦU ĐÁNH GIÁ (<pedagogical_review>):
          Tự chấm điểm theo 6 tiêu chí Danielson (1a-1f) và đưa ra nhận xét chuyên môn.
        `;
        const result = await callAI(prompt, data.settings);
        if (result) {
          // Trích xuất nội dung từ thẻ <lesson_content> để hiển thị chính
          const contentMatch = result.match(/<lesson_content>([\s\S]*?)<\/lesson_content>/);
          const finalContent = contentMatch ? contentMatch[1] : result;
          
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
            HÃY SOẠN GIÁO ÁN CHI TIẾT CHO BÀI: "${lesson.title}"
            THÔNG TIN TỪ PHÂN PHỐI CHƯƠNG TRÌNH:
            - Tuần: ${lesson.week}
            - Mục tiêu/Kiến thức trọng tâm: ${lesson.objectives}
            
            ${templateContext}
            Lớp: ${currentPlan.grade}.

            YÊU CẦU NGHIÊM NGẶT:
            1. NỘI DUNG PHẢI TUÂN THỦ HOÀN TOÀN THEO "MỤC TIÊU/KIẾN THỨC TRỌNG TÂM" ĐÃ TRÍCH XUẤT TRÊN.
            2. Định dạng: Nhiều bảng 3 cột. Chi tiết từng hoạt động.
            3. Tiêu đề bài soạn phải khớp 100% với tên bài được cung cấp.
            ${mathRestrictions}
            
            PHẦN QUAN TRỌNG: Ở CUỐI GIÁO ÁN, BẮT BUỘC PHẢI THÊM PHẦN:
            "## Đánh giá của tổ trưởng chuyên môn"
            Dựa trên khung Danielson Miền 1 (Lên kế hoạch và chuẩn bị), hãy tự chấm điểm môn giáo án này theo 6 tiêu chí (Thang 1-4, 4 là Tốt nhất) và đưa ra nhận xét ngắn:
            1a: Áp dụng kiến thức chuyên môn và sư phạm
            1b: Thấu hiểu học sinh
            1c: Thiết lập mục tiêu giảng dạy
            1d: Sử dụng tài nguyên hiệu quả
            1e: Thiết kế bài giảng mạch lạc
            1f: Đánh giá quá trình học tập
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
              content: cleanMarkdownOutput(detailResponse),
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
