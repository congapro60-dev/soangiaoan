import { useState, useRef } from 'react';
import { LessonPlan, AppData, TemplateFile } from '../types';
import { callAI, callAIStream, getActiveApiKey } from '../lib/aiProviders';
import { cleanMarkdownOutput } from '../utils/markdownUtils';
import { applyLessonRevisionPatchResponse, buildLessonRevisionPatchPrompt } from '../utils/lessonRevisionPatch';
import { buildSkeletonPromptSection, validateMarkdownAgainstSkeleton } from '../lib/documentSkeleton';
import { truncateToContextBudget } from '../lib/contextBudget';
import Swal from 'sweetalert2';
import { EXTERNAL_TOOLS } from '../data/externalTools';

const toolRegistryString = JSON.stringify(
  EXTERNAL_TOOLS.map(t => ({ id: t.id, name: t.name, topic: t.topic }))
);

// Note: MODELS and MODELS_LIST should be consistent. 
// In App.tsx it was MODELS.indexOf(data.settings.selectedModel)
// I'll keep that logic.

/**
 * Trích xuất nội dung giáo án từ phản hồi AI có thể chứa thẻ XML.
 * Ưu tiên lấy <lesson_content>, gộp <pedagogical_review> nếu AI tách riêng,
 * fallback sang toàn bộ text nếu AI không dùng XML.
 */
/**
 * Trích xuất nội dung giáo án/đề thi từ phản hồi AI có thể chứa thẻ XML.
 */
const extractLessonContent = (rawResult: string): string => {
  // Tìm ưu tiên các thẻ nội dung chính
  const contentMatch = rawResult.match(/<(?:lesson|exam|test)_content>([\s\S]*?)<\/(?:lesson|exam|test)_content>/i);
  let finalContent = '';
  
  if (contentMatch) {
    finalContent = contentMatch[1];
    
    // Gộp đánh giá hoặc đáp án nếu nằm riêng
    const reviewMatch = rawResult.match(/<(?:pedagogical_review|answer_key)>([\s\S]*?)<\/(?:pedagogical_review|answer_key)>/i);
    if (reviewMatch) {
      if (!finalContent.includes(reviewMatch[1].substring(0, 20))) {
        finalContent += '\n\n---\n\n' + reviewMatch[1];
      }
    }
  } else {
    // Fallback: Xóa bỏ thinking và trả về text sạch
    finalContent = rawResult
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<(?:lesson|exam|test)_content>/gi, '')
      .replace(/<\/(?:lesson|exam|test)_content>/gi, '')
      .trim();
  }
  
  // Loại bỏ các đoạn giới thiệu thừa của AI ở đầu (thường là "Chào bạn", "Dưới đây là", v.v.)
  // Nếu nội dung bắt đầu bằng "Chào" hoặc lời dẫn dài, ta cố gắng tìm tiêu đề thực sự
  if (finalContent.length > 500) {
    const lines = finalContent.split('\n');
    if (lines[0].includes('Chào') || lines[0].includes('Với tư cách')) {
      // Nếu dòng 1 là lời chào, thử tìm tiêu đề (dòng bắt đầu bằng # hoặc **)
      const firstHeadingIdx = lines.findIndex(l => l.startsWith('#') || l.startsWith('**'));
      if (firstHeadingIdx > 0 && firstHeadingIdx < 5) {
         finalContent = lines.slice(firstHeadingIdx).join('\n');
      }
    }
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

  const cancelBulk = () => {
    cancelBulkRef.current = true;
    setIsLoading(false);
    setBulkProgress({ current: 0, total: 0, currentTitle: 'Đang hủy các yêu cầu còn lại...' });
    showToast('Đang hủy soạn hàng loạt. Các yêu cầu AI đang chạy sẽ tự bỏ qua kết quả khi hoàn tất.', 'warning');
  };

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
      const templateSkeleton = selectedTemplate?.files.find(f => f.category === 'sample' && f.skeleton)?.skeleton;
      const lessonDocSkeleton = lessonDocs.find(f => f.skeleton)?.skeleton;
      const activeSkeleton = templateSkeleton || lessonDocSkeleton || null;
      const skeletonPromptSection = buildSkeletonPromptSection(activeSkeleton);
      
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
| **🌶️ Bài 1 (Cơ bản — [X] phút):** "[Đề bài cụ thể]" | **HS:** [Tự làm] | **Bài 1:** [Đáp án rút gọn] ✅ |
| **GV:** "[Hướng dẫn tiếp cận nếu HS lúng túng]" | **HS:** [Lời giải từng bước] | |
| **🌶️🌶️ Bài 2 (Nâng cao — [X] phút):** "[Đề bài cụ thể]" | **HS:** [Tự làm] | **Bài 2:** [Đáp án + chú thích] ✅ |
| **GV:** "[Gợi ý chiến lược]" | **HS:** [Lời giải có biện luận] | |
| **🌶️🌶️🌶️ Bài 3 (Thách thức — [X] phút):** "[Đề bài chứng minh / mở rộng]" | **HS:** [Tự làm] | **Bài 3:** [Lời giải hoàn chỉnh] ∎ |
| **GV:** "[Gợi ý cao — chỉ khi cần]" | **HS:** [Chứng minh đầy đủ] | |

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

      const ADAPTIVE_READY_FORMAT = `
===== MẪU GIÁO ÁN MẶC ĐỊNH — GIÁO ÁN NGUỒN CHUẨN ĐỂ TẠO BÀI HỌC PHÂN HOÁ =====

Đây vẫn là giáo án hoàn chỉnh trong chức năng Soạn giáo án: phải đẹp, chuẩn, có thể xem trên web, lưu thư viện, chỉnh sửa, xuất Word/PDF và sử dụng chuyên môn như các mẫu khác. Điểm khác biệt: giáo án phải được thiết kế theo đúng cấu trúc bài học phân hoá/adaptive để khi sang Quản lý bài học, AI có thể rà soát và đóng gói thành bài học học sinh dùng được ngay.

YÊU CẦU HÌNH THỨC CHUNG:
- Viết bằng Markdown sạch, tiêu đề phân cấp rõ ràng, bảng đúng cú pháp, không xuất JSON.
- Trình bày trang trọng như giáo án chính thức, không giống bản nháp kỹ thuật.
- Không để ô trống, không dùng placeholder kiểu "..." trong sản phẩm cuối; mọi mục phải có nội dung cụ thể theo bài học.
- Công thức Toán dùng MathJax/LaTeX: inline dùng $...$, công thức khối dùng $$...$$.
- Ký hiệu toán phải chuẩn; riêng Tổ hợp - Xác suất, giao hai biến cố viết liền như $AB$, không dùng ký hiệu giao tập hợp.
- Có đủ thông tin để giáo viên đọc, dạy, in/xuất file, duyệt chuyên môn và để AI chuyển đổi thành bài học phân hoá.

BỐ CỤC BẮT BUỘC TRONG <lesson_content>:

# GIÁO ÁN: [TÊN BÀI HỌC]
**Môn:** [...] | **Lớp:** [...] | **Tuần:** [...] | **Tiết:** [...] | **Thời lượng:** 40 phút
**Định hướng:** Giáo án nguồn cho bài học phân hoá/adaptive theo kịch bản Bước 0 đến Bước 5

---

## I. THÔNG TIN CHUNG VÀ MỤC TIÊU PHÂN TẦNG

### 1. Vị trí bài học và nhiệm vụ đọc trước
- Bối cảnh bài học trong chương/chủ đề.
- Kiến thức học sinh đã được giao đọc trước ở nhà.
- Sản phẩm học tập cuối bài.
- Cách giáo án này sẽ được dùng để tạo bài học phân hoá sau khi giáo viên duyệt.

### 2. Mục tiêu bài học
Trình bày đủ 3 nhóm:
- **Kiến thức:** kiến thức trọng tâm, định nghĩa, định lý/công thức cần chốt.
- **Năng lực:** tư duy toán học, mô hình hóa toán học, giải quyết vấn đề, giao tiếp toán học, sử dụng công cụ/phương tiện học toán.
- **Phẩm chất:** chăm chỉ, trung thực, trách nhiệm hoặc phẩm chất phù hợp bài học.

### 3. Mục tiêu học tập theo 3 cấp
| Cấp mục tiêu | Đối tượng phù hợp | Mục tiêu cần đạt | Minh chứng hoàn thành | Dữ liệu AI cần quan sát |
|---|---|---|---|---|
| Cơ bản / Foundation | Học sinh cần hỗ trợ | [Mục tiêu tối thiểu, cụ thể] | [Minh chứng đạt] | [Điểm pre-test, thời gian, lỗi, quick check] |
| Trọng tâm / Standard | Học sinh đạt chuẩn | [Mục tiêu chuẩn] | [Minh chứng đạt] | [Câu trả lời, mức gợi ý đã dùng, độ ổn định] |
| Nâng cao / Challenge | Học sinh khá/giỏi | [Mục tiêu mở rộng] | [Minh chứng đạt] | [Cách giải, tốc độ, khả năng khái quát] |

---

## II. THIẾT KẾ UI/UX VÀ HỌC LIỆU SỐ CHO BÀI HỌC PHÂN HOÁ

### 1. Bố cục màn hình học sinh
| Thành phần UI/UX | Thiết kế bắt buộc | Nội dung cụ thể của bài học |
|---|---|---|
| Bố cục 7:3 | 70% bên trái là bài giảng tương tác/giải quyết vấn đề; 30% bên phải là “Vở Ghi Chép” | [Mô tả nội dung cột trái và các mục tự lưu vào Vở Ghi Chép] |
| Đồng hồ kép | Đồng hồ tổng 40:00 và đồng hồ cục bộ cho từng phần | [Thời lượng Bước 0-5, ví dụ Bước 0: 05:00] |
| Mục lục thông minh | Điều hướng Bước 0 đến Bước 5, tự ẩn khi click ngoài vùng tương tác | [Tên mục lục cụ thể] |
| Chống lỗi đồ họa | Hình phẳng 2D tĩnh bắt buộc dựng bằng TikZ; 3D bắt buộc mô tả bằng tọa độ XYZ; Công cụ tương tác bắt buộc chọn ID ngoài. TUYỆT ĐỐI CẤM sinh thẻ Iframe hoặc HTML/WebGL raw. | [Danh sách TikZ 2D, Mô hình 3D, hoặc Tool ID cần dùng] |
| Vở Ghi Chép | Tự động lưu định lý, công thức, kết luận cốt lõi sau mỗi chướng ngại | [Các dòng ghi chép sẽ tự thêm] |

### 2. Học liệu số và mô phỏng cần chuẩn bị
| Tên học liệu/mô phỏng | Loại | Mục đích sư phạm | Mô tả trực quan/đặc tả renderer | Vị trí dùng | Tuyến phù hợp |
|---|---|---|---|---|---|
| [Tên học liệu 1] | TikZ 2D / Tọa độ 3D / phiếu số | [Mục đích] | [Nếu 2D: mã TikZ tĩnh. Nếu 3D: chỉ mô tả tọa độ XYZ của các điểm, danh sách cạnh và mặt để hệ thống tự dựng] | [Bước] | [Foundation/Standard/Challenge] |

Bắt buộc có tối thiểu: 1 ảnh trực quan bằng TikZ hoặc 1 mô tả tọa độ 3D phù hợp bài học, 1 công cụ tương tác Trial & Error, 1 phiếu/nhiệm vụ học tập số, 1 tài liệu đọc thêm cho Time-Filler.

### 3. THẺ CHUYỂN ĐỔI ADAPTIVE — BẮT BUỘC ĐỂ TẠO BÀI HỌC PHÂN HOÁ TRỰC TIẾP
Mục này viết bằng Markdown nhưng phải có dữ liệu cụ thể như một “hồ sơ đóng gói” để AI chuyển sang AdaptiveLesson mà không phải đoán lại. Không dùng placeholder.

#### AdaptiveLessonCard
| Trường | Nội dung cụ thể |
|---|---|
| title | [Tên bài học đầy đủ] |
| grade | [10/11/12] |
| durationMinutes | 40 |
| subjectId | math |
| preparation.readingInstructions | [Học sinh đọc trước phần nào, sản phẩm cần chuẩn bị] |
| preparation.guidingQuestions | [3-5 câu hỏi định hướng thật] |
| route.foundationGoal | [Mục tiêu tuyến Foundation/Cơ bản] |
| route.standardGoal | [Mục tiêu tuyến Standard/Trọng tâm] |
| route.challengeGoal | [Mục tiêu tuyến Challenge/Nâng cao] |

#### AdaptiveObjectives
| code | title | bloomLevel | masteryThreshold | misconception cần bắt |
|---|---|---|---:|---|
| OBJ-1 | [Mục tiêu cụ thể, đo được] | understand | 0.70 | [Sai lầm thường gặp] |
| OBJ-2 | [Mục tiêu cụ thể, đo được] | apply | 0.75 | [Sai lầm thường gặp] |
| OBJ-3 | [Mục tiêu cụ thể, đo được] | analyze | 0.75 | [Sai lầm thường gặp] |

#### AdaptiveDiagnosticTest
Tạo đúng 5 câu pre-test. Mỗi câu phải có: prompt, 4 options A-D, correctIndex, explanation, objectiveCode, difficulty. Không viết “Câu hỏi 1” chung chung.

#### AdaptiveKnowledgeUnits
Mỗi đơn vị kiến thức ở Bước 2 phải có đúng cấu trúc sau để chuyển thành knowledgeUnits:
- unitTitle: [tên mảnh]
- objectiveCode: [OBJ-x]
- estimatedMinutes: [số phút]
- explanation_foundation: [giải thích chậm, trực quan, chia bước, ví dụ số]
- explanation_standard: [giải thích chuẩn SGK, công thức/định lý]
- explanation_challenge: [mở rộng/chứng minh/khái quát]
- workedExample.problem: [đề cụ thể]
- workedExample.solution: [lời giải từng bước]
- workedExample.hints: [3 gợi ý]
- quickCheck: đúng 2 câu, mỗi câu có prompt, 4 options, correctIndex, explanation
- practice.foundation / practice.standard / practice.challenge: mỗi tuyến 1 nhiệm vụ đúng mức
- simulationSpec: title, kind(geometry2d/geometry3d/externalTool), placement, studentTask, interactions, notebookEntries. Với externalTool: KHÔNG ĐƯỢC sinh mã HTML/Iframe. Bắt buộc tạo mảng externalToolIds: ["ID_cua_tool"] bằng cách CHỈ CHỌN từ KHO DỮ LIỆU CÔNG CỤ (AGENT_KNOWLEDGE_BASE) SAU ĐÂY:
${toolRegistryString}

#### AdaptiveExitTicket
Tạo đúng 3 câu exit ticket. Mỗi câu phải có prompt, 4 options A-D, correctIndex, explanation, objectiveCode, difficulty.

#### AdaptivePacingAndRemediation
| Tình huống | Điều kiện dữ liệu | Hành động hệ thống |
|---|---|---|
| Vào Foundation | [ngưỡng điểm/lỗi] | [mở scaffold, ví dụ mẫu, gợi ý nhiều] |
| Vào Standard | [ngưỡng điểm/lỗi] | [học chuẩn, gợi ý vừa đủ] |
| Vào Challenge | [ngưỡng điểm/lỗi] | [bài mở rộng, ít scaffold] |
| Sai lần 1-4 | [số lần sai] | [4 tầng hỗ trợ, điểm trừ, khi nào hiện đáp án] |
| Còn dư thời gian | [aheadThreshold] | [Time-Filler theo thứ tự] |

---

## III. KHUNG KỊCH BẢN SƯ PHẠM BƯỚC 0 ĐẾN BƯỚC 5

### Bước 0 — Pre-test chẩn đoán đầu giờ (05:00)
**Mục đích:** Kiểm tra việc đọc trước, kiến thức nền và mức sẵn sàng học bài mới; không dùng kiểm tra bài cũ truyền thống.

Tạo ít nhất 5 câu hỏi đa dạng gồm trắc nghiệm 4 phương án, đúng/sai và trả lời ngắn. Sau khi học sinh nộp phải có điểm, đúng/sai, giải thích từng phương án hoặc tiêu chí chấm, và đề xuất tuyến Foundation/Standard/Challenge.

| Câu | Loại câu | Mức độ | Nội dung câu hỏi | Phương án/Đáp án | Giải thích từng phương án hoặc tiêu chí chấm | Mục tiêu đo | Dữ liệu phân tuyến |
|---:|---|---|---|---|---|---|---|
| 1 | Trắc nghiệm 4 phương án | Nhận biết | [Câu hỏi] | A. ...; B. ...; C. ...; D. ...; Đáp án: [...] | [Giải thích vì sao từng phương án đúng/sai] | [Mục tiêu] | [Dữ liệu] |
| 2 | Đúng/Sai | Thông hiểu | [Phát biểu] | Đúng/Sai: [...] | [Giải thích] | [Mục tiêu] | [Dữ liệu] |
| 3 | Trả lời ngắn | Vận dụng thấp | [Câu hỏi] | [Đáp án] | [Tiêu chí chấm] | [Mục tiêu] | [Dữ liệu] |
| 4 | Trắc nghiệm 4 phương án | Thông hiểu | [Câu hỏi] | A. ...; B. ...; C. ...; D. ...; Đáp án: [...] | [Giải thích từng phương án] | [Mục tiêu] | [Dữ liệu] |
| 5 | Trắc nghiệm/Đúng-Sai/Trả lời ngắn | Vận dụng | [Câu hỏi] | [Đáp án] | [Giải thích/tiêu chí] | [Mục tiêu] | [Dữ liệu] |

#### Quy tắc phân tuyến sau Pre-test
| Điều kiện | Tuyến | Nội dung bài học ưu tiên | Can thiệp AI/GV |
|---|---|---|---|
| [Ngưỡng thấp] | Foundation | [Ôn nền, scaffold, ví dụ mẫu] | [Mở gợi ý nhiều hơn, nhắc lý thuyết] |
| [Ngưỡng đạt] | Standard | [Học theo chuẩn trọng tâm] | [Gợi ý vừa đủ, quick check chuẩn] |
| [Ngưỡng cao] | Challenge | [Mở rộng, bài khó, khái quát] | [Giảm scaffold, tăng nhiệm vụ mở] |

### Bước 1 — Khởi động & Gắn kết / Engage (05:00)
| Thành phần | Nội dung bắt buộc |
|---|---|
| Câu chuyện/tình huống | [Câu chuyện lịch sử hoặc tình huống thực tế hấp dẫn gắn trực tiếp với bài] |
| Trải nghiệm bế tắc | [Công cụ tương tác khiến học sinh thử và thấy giới hạn của cách làm cũ] |
| Học sinh điền kỳ vọng | [Câu hỏi để học sinh tự nhập điều muốn hiểu/làm được] |
| Hệ thống in mục tiêu | [Mục tiêu Cơ bản, Trọng tâm, Nâng cao được đối chiếu với kỳ vọng] |
| Dữ liệu AI ghi nhận | [Kỳ vọng, thao tác đầu tiên, thời gian, lựa chọn sai/lúng túng] |

### Bước 2 — Kiến tạo tri thức Socratic và Trial & Error (15:00)
Chia bài học thành 2-4 chướng ngại/đơn vị kiến thức. Mỗi đơn vị phải có câu hỏi cực nhỏ, thử sai không khóa luồng, phản hồi bản chất, quick check và chốt sang Vở Ghi Chép.

#### Đơn vị kiến thức [số]: [Tên đơn vị]
| Thành phần | Nội dung chi tiết |
|---|---|
| Vấn đề nhỏ cần khám phá | [Bài toán/câu hỏi dẫn vào] |
| Chuỗi câu hỏi Socratic | [5-7 câu hỏi cực nhỏ đi từ quan sát đến kết luận] |
| Trial & Error | [Thao tác học sinh được thử; nếu sai vẫn đi tiếp sau phản hồi] |
| Phản hồi khi sai | [Giải thích bản chất lỗi, không chỉ báo sai] |
| Quick check | [2-3 câu hỏi nhanh kèm đáp án; nếu sai mở lại lý thuyết ở dạng khác] |
| Chốt Vở Ghi Chép | [Định nghĩa/định lý/công thức/kết luận tự động lưu] |
| Dữ liệu AI ghi nhận | [Thời gian, số lần thử, lỗi, quick check, mức gợi ý đã dùng] |

### Bước 3 — Áp dụng luyện tập thích ứng (10:00)
AI phải dựa trên dữ liệu Bước 0 và Bước 2 để sinh luyện tập theo năng lực Trung bình/Khá/Giỏi. Cấu trúc bài luyện tập theo định dạng THPTQG:

#### Tuyến Trung bình / Foundation
| Phần | Số lượng | Điểm | Nội dung câu hỏi | Đáp án | Remediation loop |
|---|---:|---:|---|---|---|
| Phần 1: Trắc nghiệm 4 phương án | 3 câu | 5 điểm/câu | [3 câu nền tảng] | [Đáp án + giải thích] | [4 tầng hỗ trợ] |
| Phần 2: Đúng/Sai theo bối cảnh | 1 bối cảnh, 4 ý | 10 điểm/ý | [Bối cảnh + 4 phát biểu] | [Đ/S + giải thích] | [4 tầng hỗ trợ] |
| Phần 3: Trả lời ngắn | 1 câu | 20 điểm | [Câu trả lời ngắn] | [Đáp án/tiêu chí] | [4 tầng hỗ trợ] |

#### Tuyến Khá / Standard
| Phần | Số lượng | Điểm | Nội dung câu hỏi | Đáp án | Remediation loop |
|---|---:|---:|---|---|---|
| Phần 1: Trắc nghiệm 4 phương án | 3 câu | 5 điểm/câu | [3 câu chuẩn] | [Đáp án + giải thích] | [4 tầng hỗ trợ] |
| Phần 2: Đúng/Sai theo bối cảnh | 1 bối cảnh, 4 ý | 10 điểm/ý | [Bối cảnh + 4 phát biểu] | [Đ/S + giải thích] | [4 tầng hỗ trợ] |
| Phần 3: Trả lời ngắn | 1 câu | 20 điểm | [Câu trả lời ngắn] | [Đáp án/tiêu chí] | [4 tầng hỗ trợ] |

#### Tuyến Giỏi / Challenge
| Phần | Số lượng | Điểm | Nội dung câu hỏi | Đáp án | Remediation loop |
|---|---:|---:|---|---|---|
| Phần 1: Trắc nghiệm 4 phương án | 3 câu | 5 điểm/câu | [3 câu nâng cao] | [Đáp án + giải thích] | [4 tầng hỗ trợ] |
| Phần 2: Đúng/Sai theo bối cảnh | 1 bối cảnh, 4 ý | 10 điểm/ý | [Bối cảnh + 4 phát biểu] | [Đ/S + giải thích] | [4 tầng hỗ trợ] |
| Phần 3: Trả lời ngắn | 1 câu | 20 điểm | [Câu trả lời ngắn] | [Đáp án/tiêu chí] | [4 tầng hỗ trợ] |

#### Remediation loop bắt buộc cho mọi câu sai
| Lần sai | Phản hồi bắt buộc | Điểm bị trừ | Hành động tiếp theo |
|---:|---|---:|---|
| 1 | Nhắc lại lý thuyết nền liên quan | -1 | Cho làm lại |
| 2 | Gợi ý mức 1: chỉ hướng suy nghĩ, chưa nêu công thức đầy đủ | -2 | Cho làm lại |
| 3 | Gợi ý mức 2: chỉ rõ bước then chốt/công thức cần dùng | -3 | Cho làm lại |
| 4 | Hiện đáp án chi tiết và chuyển câu | Còn 0 điểm | Lưu lỗi để GV xem |

### Bước 4 — Mở rộng thực tiễn (03:00)
| Thành phần | Nội dung bắt buộc |
|---|---|
| Vai trò học sinh | [Học sinh vào vai chuyên gia/kỹ sư/nhà phân tích phù hợp bài học] |
| Sự cố thực tế | [Bối cảnh xử lý sự cố hoặc quyết định thực tiễn] |
| Nhiệm vụ mở rộng | [Bài toán thực tiễn có dữ kiện, yêu cầu rõ] |
| Sản phẩm | [Kết luận/tư vấn/bản thiết kế/lập luận] |
| Tiêu chí đánh giá | [Đúng toán, hợp lý thực tế, giải thích rõ] |

### Bước 5 — Tổng kết, tự đánh giá và Time-Filler (02:00)
| Thành phần | Nội dung bắt buộc |
|---|---|
| Sơ đồ tư duy dạng chuỗi | [Chuỗi khái niệm: từ tình huống → định nghĩa → công thức/định lý → ví dụ → ứng dụng] |
| Checklist mục tiêu | [Cơ bản/Trọng tâm/Nâng cao, học sinh tự tick đạt/chưa đạt] |
| Thanh trượt tự đánh giá | [Câu lệnh cho thang 1-10 và cách hệ thống phản hồi] |
| Hộp thư hỏi thêm | [Prompt để học sinh gửi câu hỏi còn vướng] |
| Time-Filler | Nếu còn thời gian, mở lần lượt: 1 tài liệu đọc thêm → 1 bài tập nâng cao khó → 1 bài tập vận dụng thực tế |

---

## IV. TIÊU CHUẨN TOÁN HỌC VÀ KỸ THUẬT TRÌNH BÀY

| Yêu cầu | Cách thực hiện trong giáo án |
|---|---|
| MathJax/LaTeX | Công thức inline $...$, công thức khối $$...$$ |
| Ký hiệu chuẩn | [Ghi các ký hiệu trọng tâm của bài; với xác suất dùng $AB$ cho giao biến cố] |
| Độc lập nội dung | [Bài học đủ câu hỏi, lời giải, học liệu, vòng lặp điều kiện] |
| TikZ 2D | [Mô tả các hình phẳng dựng bằng mã TikZ chuẩn] |
| Tọa độ 3D | [Nếu có hình học không gian: mô tả tọa độ điểm 3D, các cạnh nối, các mặt] |
| Schema mô phỏng | [Gợi ý chuyển đổi: ảnh tĩnh hoặc geometry3d JSON; gồm title, description, placement, objectiveIds, studentTask, interactions, questions, notebookEntries] |
| Dữ liệu học tập | [Điểm, đúng/sai, thời gian, số lần thử, mức gợi ý, ghi chú GV] |

---

## V. PHỤ LỤC XUẤT FILE VÀ ÁNH XẠ SANG BÀI HỌC PHÂN HOÁ

### 1. Học liệu, phiếu học tập, đáp án
- Phiếu học tập số hoặc bản in.
- Đáp án/gợi ý cho pre-test, quick check, luyện tập, mở rộng.
- Bảng kiểm quan sát và dữ liệu giáo viên cần xem sau tiết học.
- Tài liệu đọc thêm, bài nâng cao khó, bài vận dụng thực tế dùng cho Time-Filler.

### 2. Ánh xạ sang bài học phân hoá
Mục này là phụ lục kỹ thuật/sư phạm để AI chuyển đổi, không phải hoạt động học sinh:
| Thành phần giáo án | Thành phần bài học phân hoá tương ứng | Ghi chú chuyển đổi |
|---|---|---|
| UI/UX 7:3, đồng hồ kép, mục lục thông minh | lesson shell / student UI | [Cách dựng giao diện học sinh] |
| Bước 0 Pre-test | diagnosticTest | [Câu hỏi, điểm, giải thích, ngưỡng phân tuyến] |
| Bước 1 Engage | fiveStepFlow.engage / opening interaction | [Tình huống, kỳ vọng, mục tiêu 3 cấp] |
| Bước 2 Kiến tạo tri thức | knowledgeUnits + quickCheck + notebook | [Mỗi chướng ngại thành một đơn vị kiến thức] |
| Bước 3 Luyện tập thích ứng | routes/practiceTasks/remediation | [Tuyến Trung bình/Khá/Giỏi và loop 4 tầng] |
| Bước 4 Mở rộng | extensionTask | [Vai chuyên gia/kỹ sư, bài toán thực tế] |
| Bước 5 Tổng kết/Time-Filler | exitTicket/reflection/filler | [Mindmap, checklist, slider, hộp thư, tài liệu mở thêm] |
| Ảnh/mô phỏng/học liệu | simulationSpec/simulationId/externalToolIds | [Tài sản cần tạo/gắn; hình phẳng dùng TikZ, hình không gian dùng tọa độ JSON 3D] |
| Dữ liệu quan sát | student progress/profile | [Dùng cho thống kê người học và điều chỉnh] |

QUY TẮC NGHIÊM NGẶT:
- Đây là giáo án chính thức, không phải bản mô tả kỹ thuật; phải đẹp, đầy đủ, có thể xuất file.
- Vẫn giữ đầy đủ chức năng của phần Soạn giáo án: xem, sửa, lưu thư viện, xuất file, dùng tài liệu tham khảo và yêu cầu bổ sung.
- Không dùng phần "kiểm tra bài cũ" truyền thống; luôn dùng Bước 0 Pre-test cho chính bài học này.
- Không chỉ viết mô tả chung chung; phải đủ dữ liệu để chuyển thành bài học adaptive độc lập.
- Không xuất JSON. Chỉ xuất Markdown trong <lesson_content>.
===== KẾT THÚC MẪU GIÁO ÁN MẶC ĐỊNH PHÂN HOÁ =====
`;

      const VISUAL_AIDS_PROMPT = `
===========================================================
ĐẶC BIỆT LƯU Ý VỀ MẶT THỊ GIÁC (VISUAL AIDS) TRONG BẢNG:
===========================================================
Để giáo án thêm sinh động và trực quan, BẮT BUỘC tích hợp hình ảnh minh họa vào Cột 3 ("Nội dung ghi bảng / Sản phẩm dự kiến") của các Hoạt động 2 (Hình thành kiến thức) và Hoạt động 3 (Luyện tập). Hãy tự đánh giá và áp dụng nghiêm ngặt các loại hình sau:

1. Đồ họa Toán học tĩnh (BẮT BUỘC DÙNG TikZ):
- Khi nào dùng: Cần độ chính xác toán học (Đồ thị hàm số, hình học phẳng cơ bản, sơ đồ).
- TUYỆT ĐỐI KHÔNG DÙNG HTML <svg> vì máy chủ sẽ không thể nhúng nó vào file Word.
- Cách thực hiện: Chỉ sử dụng ngôn ngữ LaTeX/TikZ. Bọc trong khối code \`\`\`tikz \\begin{tikzpicture} ... \\end{tikzpicture} \`\`\`.
- Vị trí chèn: Đặt trực tiếp vào Cột 3. TUYỆT ĐỐI không dùng thẻ <br/> trước/sau khối code để không làm vỡ cấu trúc bảng.
- BẮT BUỘC CHỈ DÙNG CÁC MÀU CƠ BẢN CỦA LaTeX (black, white, red, green, blue, cyan, magenta, yellow, gray, lightgray). TUYỆT ĐỐI KHÔNG tự sáng tạo tên màu (như indigo, primary, teal) để tránh lỗi biên dịch.
- GIỚI HẠN ĐỘ PHỨC TẠP ĐỂ XUẤT WORD/PDF ỔN ĐỊNH: tối đa 2 hình TikZ trong một giáo án; mỗi hình không quá khoảng 40 dòng; chỉ dùng các lệnh TikZ cơ bản (\\draw, \\node, \\fill, \\path, \\foreach đơn giản). TUYỆT ĐỐI không dùng ảnh nền, external file, package/thư viện lạ, TikZ quá dài hoặc nhiều vòng lặp phức tạp. Nếu hình quá phức tạp, hãy chuyển sang khối \`\`\`prompt ... \`\`\` thay vì mã TikZ.

2. Ảnh minh họa SGK/Thực tế (static_image):
- Khi nào dùng: Cần bối cảnh thực tế hoặc sơ đồ tư duy khái quát (VD: Cây cầu treo, quỹ đạo vệ tinh).
- Cách thực hiện: KHÔNG tự sinh mã. Hãy viết một đoạn mô tả (prompt) sinh ảnh bằng TIẾNG ANH thật chi tiết bọc trong khối code \`\`\`prompt ... \`\`\`.
- Ràng buộc hình ảnh: "2D flat vector illustration, textbook educational diagram style, minimal blue and indigo color palette, white background. Strictly NO text, NO letters, NO math formulas, NO numbers, NO labels."
===========================================================
`;

      let templateContext = '';
      if (builtinFormat === 'cv5512') {
        templateContext = CV5512_FORMAT + '\n' + VISUAL_AIDS_PROMPT;
      } else if (builtinFormat === 'claude') {
        templateContext = CLAUDE_FORMAT + '\n' + VISUAL_AIDS_PROMPT;
      } else if (selectedTemplate) {
        const samples = selectedTemplate.files.filter(f => f.category === 'sample').map(f => f.content).join('\n---\n');
        const criteria = selectedTemplate.files.filter(f => f.category === 'criteria').map(f => f.content).join('\n---\n');
        templateContext = `
          DỰA TRÊN MẪU GIÁO ÁN SAU (Cấu trúc và phong cách):
          ${samples}

          TUÂN THỦ CÁC TIÊU CHÍ/QUY ĐỊNH SAU:
          ${criteria}
        `;
      } else {
        templateContext = ADAPTIVE_READY_FORMAT;
      }

      const isAdaptiveReadyDefault = builtinFormat === 'default' && !selectedTemplate;

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
   LƯU Ý CĂN HÀNG: Mỗi lượt trao đổi GV↔HS = 1 hàng riêng biệt. TUYỆT ĐỐI KHÔNG dùng <br/><br/> để gộp nhiều lượt vào 1 hàng.

III. QUY TẮC LATEX & FONT CHỮ — BẮT BUỘC:
   - Công thức trên cùng dòng văn bản: dùng $...$ (ví dụ: $f(x) = x^2 + 1$)
   - Công thức đứng riêng một dòng: dùng $$...$$ (ví dụ: $$\int_0^1 x^2\,dx = \frac{1}{3}$$)
   - TUYỆT ĐỐI KHÔNG dùng ký tự gạch đứng "|" trong công thức Toán vì sẽ làm vỡ bảng Markdown. Bắt buộc dùng "\\mid" (ví dụ: viết $P(A \\mid B)$ thay vì $P(A|B)$).
   - Văn bản Tiếng Việt phải gõ liền mạch chuẩn xác, TUYỆT ĐỐI KHÔNG được viết tách rời dấu (ví dụ sai: "b a ˘ ˋ n g", đúng: "bằng").

===========================================================
      ` : '';

      if (generationMode === 'single') {
        const rawDocsContent = lessonDocs.map(f => f.content).join('\n---\n');
        const { truncatedText: lessonDocsContent, isTruncated: docsTruncated } = truncateToContextBudget(rawDocsContent);
        
        if (docsTruncated) {
          showToast(`Tài liệu tham khảo quá dài, AI chỉ sử dụng một phần để đảm bảo không lỗi hệ thống.`, 'warning');
        }

        const prompt = `
          BẠN LÀ MỘT CHUYÊN GIA GIÁO DỤC CAO CẤP.
          NHIỆM VỤ: ${isAdaptiveReadyDefault ? 'Soạn một giáo án nguồn để tạo bài học phân hoá/adaptive.' : 'Soạn một giáo án "Masterpiece" (Kiệt tác sư phạm).'}

          BỐ CỤC PHẢN HỒI (BẮT BUỘC):
          1. <thinking>: ${isAdaptiveReadyDefault ? `Phân tích mục tiêu bài học, điều kiện học sinh đã đọc trước ở nhà, thiết kế UI/UX 7:3, đồng hồ kép, mục lục thông minh, Bước 0 Pre-test, Bước 1 Engage, Bước 2 Socratic/Trial & Error, Bước 3 luyện tập THPTQG thích ứng, Bước 4 mở rộng và Bước 5 tổng kết/Time-Filler.` : `Phân tích mục tiêu bài học, đặc điểm HS lớp ${currentPlan.grade}, lựa chọn phương pháp (VARK, 5E, Gagne...) và kế hoạch "gây nghiện" cho bài giảng.`}
          2. <lesson_content>: ${isAdaptiveReadyDefault ? 'TOÀN BỘ giáo án nguồn chi tiết dạng Markdown, có đủ UI/UX 7:3, đồng hồ kép, mục lục thông minh, SVG/học liệu số, Bước 0-5, pre-test 5 câu đa dạng, phân tuyến Foundation/Standard/Challenge, quick check, Vở Ghi Chép, luyện tập THPTQG theo Trung bình/Khá/Giỏi, remediation loop 4 tầng, tổng kết và Time-Filler.' : 'TOÀN BỘ nội dung giáo án chi tiết (Markdown), BAO GỒM CẢ phần đánh giá Danielson ở cuối.'}

          THÔNG TIN BÀI HỌC:
          - Môn học: ${subject}. Lớp: ${currentPlan.grade}. Tuần: ${currentPlan.week}.
          - Tiêu đề: ${currentPlan.title}.
          ${singleRequirement ? `YÊU CẦU BỔ SUNG: ${singleRequirement}` : ''}
          
          <format_skeleton>
          ${templateContext}
          ${skeletonPromptSection}
          </format_skeleton>

          <reference_context>
          ${activeDist ? `PHÂN PHỐI CHƯƠNG TRÌNH:\n${activeDist.content}` : ''}
          ${lessonDocsContent ? `TÀI LIỆU THAM KHẢO:\n${lessonDocsContent}` : ''}
          </reference_context>

          ${isAdaptiveReadyDefault ? `
          ===== YÊU CẦU RIÊNG CHO KIỂU MẶC ĐỊNH MỚI — GIÁO ÁN ĐẸP, SẴN SÀNG TẠO BÀI HỌC PHÂN HOÁ =====
          - Bắt buộc dùng đúng cấu trúc trong MẪU GIÁO ÁN MẶC ĐỊNH ở trên, đặc biệt là UI/UX 7:3 và khung Bước 0 đến Bước 5.
          - Đây vẫn là giáo án chính thức trong Soạn giáo án: phải trình bày đẹp, rõ ràng, có thể xem/sửa/lưu/xuất Word/PDF như các mẫu còn lại.
          - Trọng tâm nội dung là tạo giáo án có thể chuyển đổi sang AdaptiveLesson độc lập: diagnosticTest, knowledgeUnits, routes, quickCheck, notebook, practiceTasks, remediation loop, exit/reflection, simulation/external tools.
          - Phần đầu giờ phải là Bước 0 Pre-test của chính bài học, không phải kiểm tra bài cũ; tối thiểu 5 câu đa dạng và có giải thích từng phương án/tiêu chí.
          - Bước 3 phải đúng cấu trúc luyện tập thích ứng theo Trung bình/Khá/Giỏi và định dạng THPTQG: 3 câu trắc nghiệm, 1 bối cảnh đúng/sai 4 ý, 1 câu trả lời ngắn, kèm loop hỗ trợ 4 tầng.
          - Phải nêu rõ học liệu số, mô phỏng ưu tiên dùng mã TikZ chuẩn cho hình phẳng; nếu có hình học không gian thì phải mô tả mô phỏng 3D xoay/zoom được bằng tọa độ XYZ để hệ thống tự vẽ; đồng thời có Vở Ghi Chép tự động, đồng hồ kép, mục lục thông minh và Time-Filler.
          - Bắt buộc có mục “THẺ CHUYỂN ĐỔI ADAPTIVE” với AdaptiveLessonCard, AdaptiveObjectives, AdaptiveDiagnosticTest, AdaptiveKnowledgeUnits, AdaptiveExitTicket, AdaptivePacingAndRemediation. Mục này là nguồn dữ liệu chính để chuyển trực tiếp sang bài học phân hoá, nên phải cụ thể như dữ liệu đóng gói, không placeholder.
          - Nội dung học sinh đọc ở các bước học không được lẫn thuật ngữ kỹ thuật như schema, UI/UX, bố cục 7:3; chỉ để các thuật ngữ đó trong phần thiết kế/hồ sơ chuyển đổi.
          - Không bắt buộc Danielson, WALT/WILF hay mẫu Công văn 5512 trong kiểu mặc định này, nhưng chất lượng trình bày phải tương đương một giáo án xuất file hoàn chỉnh.
          ===== HẾT YÊU CẦU RIÊNG KIỂU MẶC ĐỊNH =====
          ` : `===== YÊU CẦU ĐỊNH DẠNG NỘI DUNG BÊN TRONG <lesson_content> (TUYỆT ĐỐI TUÂN THỦ) =====
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
          ===== HẾT YÊU CẦU ĐỊNH DẠNG =====`}
        `;
        let fullResult = '';
        await callAIStream(prompt, data.settings, (chunk) => {
          fullResult += chunk;
          const currentExtracted = extractLessonContent(fullResult);
          setCurrentPlan(prev => ({ ...prev, content: cleanMarkdownOutput(currentExtracted) }));
        });
        const finalContent = cleanMarkdownOutput(extractLessonContent(fullResult));
        const skeletonValidation = validateMarkdownAgainstSkeleton(finalContent, activeSkeleton);
        if (activeSkeleton && skeletonValidation.issues.length > 0) {
          console.warn('Phase 2A Markdown Skeleton validation warnings:', skeletonValidation);
          showToast(`Đã tạo giáo án, nhưng cần rà soát skeleton mẫu (${Math.round(skeletonValidation.score * 100)}%): ${skeletonValidation.issues[0].message}`, 'warning');
        } else {
          showToast('Đã khởi tạo giáo án cấp độ Senior!');
        }
      } else {
        const rawDistContent = activeDist?.content || distributionFile?.content;
        const { truncatedText: distContent, isTruncated: distTruncated } = truncateToContextBudget(rawDistContent);
        
        if (distTruncated) {
          showToast(`Phân phối chương trình quá dài, chỉ xử lý một phần đầu để tránh lỗi AI.`, 'warning');
        }

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
          let cleanedPlan = planResponse.replace(/```(?:json)?\s*([\s\S]*?)```/i, '$1').trim();
          cleanedPlan = cleanedPlan.replace(/^[^\{\[]+/, '').replace(/[^\}\]]+$/, '');
          extractedLessons = JSON.parse(cleanedPlan);
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
              1. <thinking>: ${isAdaptiveReadyDefault ? 'Phân tích mục tiêu bài, điều kiện học sinh đọc trước ở nhà, thiết kế UI/UX 7:3, Bước 0 Pre-test, Bước 1 Engage, Bước 2 Socratic/Trial & Error, Bước 3 luyện tập THPTQG thích ứng, Bước 4 mở rộng, Bước 5 tổng kết/Time-Filler.' : 'Phân tích ngắn mục tiêu bài, đặc điểm HS, phương pháp phù hợp.'}
              2. <lesson_content>: ${isAdaptiveReadyDefault ? 'TOÀN BỘ giáo án nguồn dạng Markdown để tạo bài học phân hoá, có đủ UI/UX 7:3, đồng hồ kép, mục lục thông minh, SVG/học liệu số, Bước 0-5, pre-test 5 câu đa dạng, phân tuyến Foundation/Standard/Challenge, quick check, Vở Ghi Chép, luyện tập THPTQG theo Trung bình/Khá/Giỏi, remediation loop 4 tầng và Time-Filler.' : 'TOÀN BỘ giáo án (Markdown), BAO GỒM đánh giá Danielson ở cuối.'}

              HÃY SOẠN GIÁO ÁN CHI TIẾT CHO BÀI: "${lesson.title}"
              THÔNG TIN TỪ PHÂN PHỐI CHƯƠNG TRÌNH:
              - Tuần: ${lesson.week}
              - Mục tiêu/Kiến thức trọng tâm: ${lesson.objectives}
              Lớp: ${currentPlan.grade}.
              
              <format_skeleton>
              ${templateContext}
              ${skeletonPromptSection}
              </format_skeleton>

              ${isAdaptiveReadyDefault ? `
              ===== YÊU CẦU RIÊNG CHO KIỂU MẶC ĐỊNH MỚI — GIÁO ÁN ĐẸP, SẴN SÀNG TẠO BÀI HỌC PHÂN HOÁ =====
              1. NỘI DUNG PHẢI TUÂN THỦ HOÀN TOÀN THEO "MỤC TIÊU/KIẾN THỨC TRỌNG TÂM" ĐÃ TRÍCH XUẤT TRÊN.
              2. Tiêu đề bài soạn phải khớp 100% với tên bài được cung cấp.
              3. Bắt buộc dùng đúng cấu trúc trong MẪU GIÁO ÁN MẶC ĐỊNH ở trên, đặc biệt là UI/UX 7:3 và kịch bản Bước 0 đến Bước 5.
              4. Đây vẫn là giáo án chính thức trong Soạn giáo án: phải trình bày đẹp, rõ ràng, có thể xem/sửa/lưu/xuất Word/PDF như các mẫu còn lại.
              5. Phần đầu giờ phải là Bước 0 Pre-test của chính bài học, không phải kiểm tra bài cũ; tối thiểu 5 câu đa dạng và có giải thích từng phương án/tiêu chí.
               6. Phải có đồng hồ kép, mục lục thông minh, Vở Ghi Chép tự động, học liệu số, mô phỏng ưu tiên dùng mã TikZ chuẩn cho hình phẳng; nếu là hình học không gian thì mô phỏng phải là 3D xoay/zoom được bằng tọa độ XYZ để hệ thống tự vẽ; quick check, tuyến Foundation/Standard/Challenge và Time-Filler.
               7. Bước 3 phải đúng cấu trúc luyện tập thích ứng theo Trung bình/Khá/Giỏi và định dạng THPTQG: 3 câu trắc nghiệm, 1 bối cảnh đúng/sai 4 ý, 1 câu trả lời ngắn, kèm loop hỗ trợ 4 tầng.
               8. Bắt buộc có mục “THẺ CHUYỂN ĐỔI ADAPTIVE” đầy đủ AdaptiveLessonCard, AdaptiveObjectives, AdaptiveDiagnosticTest, AdaptiveKnowledgeUnits, AdaptiveExitTicket, AdaptivePacingAndRemediation để hệ thống chuyển trực tiếp sang bài học phân hoá.
               9. Nội dung học sinh đọc ở từng bước không được lẫn thuật ngữ kỹ thuật như schema, UI/UX, bố cục 7:3; chỉ để các thuật ngữ đó trong phần thiết kế/hồ sơ chuyển đổi.
               10. Không bắt buộc Danielson, WALT/WILF hay mẫu Công văn 5512 trong kiểu mặc định này, nhưng chất lượng trình bày phải tương đương một giáo án xuất file hoàn chỉnh.
              ${mathRestrictions}
              ===== HẾT YÊU CẦU RIÊNG KIỂU MẶC ĐỊNH =====
              ` : `===== YÊU CẦU ĐỊNH DẠNG BÊN TRONG <lesson_content> (TUYỆT ĐỐI TUÂN THỦ) =====
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
              ===== HẾT YÊU CẦU =====`}
            `;
            try {
              if (cancelBulkRef.current) return null;
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

          if (!cancelBulkRef.current) {
            setBulkProgress({ current: i, total: extractedLessons.length, currentTitle: `Đang xử lý ${chunk.length} bài cùng lúc...` });
          }
          
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
      cancelBulkRef.current = false;
    }
  };

  const handleReviseLesson = async () => {
    if (!revisionPrompt.trim() || !currentPlan.content || !getActiveApiKey(data.settings)) return;
    setIsLoading(true);
    try {
      const originalContent = currentPlan.content;
      const prompt = buildLessonRevisionPatchPrompt(revisionPrompt, originalContent);
      const result = await callAI(prompt, data.settings);
      if (result) {
        const revision = applyLessonRevisionPatchResponse(originalContent, result);

        if (revision.status === 'applied') {
          setCurrentPlan(prev => ({ ...prev, content: revision.content }));
          setRevisionPrompt('');
          showToast(revision.message);
          if (revision.warnings.length > 0) {
            console.warn('Lesson revision patch warnings:', revision.warnings);
            showToast(revision.warnings[0], 'warning');
          }
        } else {
          console.warn('Lesson revision patch blocked:', revision.warnings);
          showToast(revision.message, 'warning');
        }
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
