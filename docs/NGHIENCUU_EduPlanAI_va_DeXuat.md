# Nghiên cứu "EduPlan AI – Trợ lý Nâng cấp Giáo án" & Đề xuất tích hợp cho SmartPlan AI

> Đối tượng nghiên cứu: Custom GPT trên ChatGPT — "EduPlan AI – Trợ lý Nâng cấp Giáo án cho Giáo viên" (tác giả: Trần Hoài Thanh). Tool quảng bá kèm web `giaovienai.vercel.app` (KHÁC web của bạn).
> Cách nghiên cứu: mở trực tiếp GPT, hỏi chính nó về cách được cấu hình (nó tự khai), trích nguyên văn menu từ knowledge của nó, rồi đối chiếu với code app SmartPlan AI.

---

## 1. Nó "được code" như thế nào? (quan trọng nhất)

**Nó KHÔNG phải phần mềm lập trình hàng nghìn dòng.** Theo chính GPT tự khai, nó = **LLM + System Prompt rất chi tiết + Knowledge Base (file hướng dẫn) + vài tool bật sẵn** (đọc file, sinh ảnh, Python, web search). Đây là một **Custom GPT** dựng bằng cấu hình, không có backend riêng.

**Cơ chế lõi = "Phân tích → KHÔNG sinh ngay → Hiện MENU → Định tuyến (router) → Sinh đúng 1 sản phẩm".** Luồng:
```
Tải giáo án → Đọc file → Phân tích theo KHUNG cố định → (KHÔNG tự viết lại cả giáo án)
→ Hiện menu A–Q → Giáo viên chọn → Sinh đúng sản phẩm được chọn → Xuất kết quả
```
Điểm hay nhất (đáng học): **bắt AI phân tích trước, hỏi nhu cầu sau, rồi mới sinh từng sản phẩm** — tránh kiểu "tải lên là viết lại cả giáo án" gây loãng.

**Khung phân tích cố định** (ép trong system prompt): Môn học · Lớp · Tên bài · Thời lượng · Mục tiêu · Hoạt động · Điểm mạnh · Điểm cần nâng cấp.

**Knowledge Base nó nạp sẵn (đây là "bí quyết" thật sự):**
- Tài liệu hướng dẫn GPT giáo án (chứa menu + khung phân tích)
- 100 ý tưởng sản phẩm học tập
- 21 phương pháp dạy học AI
- Giáo trình AI cho giáo viên
- Khung năng lực số
- Khung năng lực AI
→ Khi giáo viên hỏi "bổ sung năng lực số", nó **tra knowledge** chứ không bịa.

**Tool đang bật:** đọc file (PDF/DOCX/PPTX/MD/TXT) · sinh ảnh · Python (vẽ biểu đồ, xuất Excel, rubric) · web search.

## 2. MENU nguyên văn (trích từ knowledge của nó) — "trái tim" của tool

> Thầy/cô muốn tôi hỗ trợ phần nào?
> A. Thiết kế hoạt động khởi động hấp dẫn
> B. Thiết kế hoạt động hình thành kiến thức
> C. Thiết kế hoạt động luyện tập
> D. Thiết kế hoạt động vận dụng/mở rộng
> E. Tạo phiếu học tập cho học sinh
> F. Tạo câu hỏi kiểm tra đánh giá theo mức độ nhận thức
> G. Bổ sung chỉ số năng lực số cho bài học
> H. Bổ sung năng lực AI phù hợp với bài học
> I. Gợi ý phương pháp/kĩ thuật dạy học phù hợp
> J. Thiết kế trò chơi học tập tương tác
> K. Tạo slide dàn ý bài giảng
> L. Tạo rubric/bảng tiêu chí đánh giá
> M. Viết lại giáo án theo định hướng phát triển phẩm chất, năng lực
> N. Rà soát và góp ý toàn bộ giáo án
> O. Tạo phiên bản giáo án sáng tạo hơn
> P. Tạo học liệu số: prompt tạo ảnh, video, mô phỏng, hoạt động số
> Q. Tạo nhiệm vụ học tập phân hóa cho học sinh yếu, trung bình, khá, giỏi

**Mỗi lựa chọn có template sản phẩm cố định**, ví dụ:
- **Phiếu học tập (E):** Tên phiếu · Mục tiêu · Hướng dẫn · Nhiệm vụ · Không gian trả lời · Mức độ (NB/TH/VD/VDC) · Đáp án.
- **Rubric (L):** chuỗi `hoạt động → sản phẩm kỳ vọng → tiêu chí đánh giá → rubric 4 mức`.
- **Trò chơi (J):** xác định Môn/Lớp/Mục tiêu → chọn mẫu game (Escape Room, Kahoot, Wordwall, Thám tử AI, Phiên tòa tri thức, Flashcard) → điền nội dung bài vào template.

## 2b. ĐÃ CHẠY THỬ THỰC TẾ đủ 8 nhóm chức năng (trên 1 giáo án thật)

Upload file thật "Xác suất có điều kiện.docx" (Toán 12). Tool đọc đúng (Môn/Lớp/Bài/Thời lượng/5 hoạt động/điểm mạnh/điểm nâng cấp) rồi hiện menu A–Q. Đã lần lượt chọn và xác nhận **cả 8 nhóm chức năng quảng cáo đều chạy ra sản phẩm đúng, bám sát bài**:

| # | Nhóm chức năng (theo quảng cáo) | Mục menu chạy | Kết quả |
|---|---|---|---|
| 1 | Thiết kế hoạt động khởi động | A | **ĐẠT** — "Bác sĩ AI có đáng tin không?" (tình huống xét nghiệm y khoa), đủ tên/mục tiêu/thời lượng/chuẩn bị/các bước |
| 2 | Tạo hoạt động hình thành kiến thức | B | **ĐẠT** |
| 3 | Thiết kế luyện tập – vận dụng | C + D | **ĐẠT** |
| 4 | Tạo phiếu học tập | E | **ĐẠT** — có Tên/Mục tiêu/Nhiệm vụ/bảng dữ kiện/sản phẩm mong đợi |
| 5 | Bổ sung năng lực số, năng lực AI | G + H | **ĐẠT** — ra mục năng lực số + "AI-3 Sử dụng AI có trách nhiệm", "AI-4 Cải thiện sản phẩm với AI" |
| 6 | Gợi ý phương pháp dạy học | I | **ĐẠT** — Think-Pair-Share / Khăn trải bàn / Mảnh ghép... |
| 7 | Câu hỏi đánh giá, rubric, trò chơi | F + L + J | **ĐẠT** — câu hỏi theo mức NB/TH/VD, rubric tiêu chí, game template |
| 8 | Rà soát & nâng cấp toàn bộ giáo án | N | **ĐẠT** — nêu điểm mạnh/điểm cần nâng cấp + gợi ý bước tiếp (M/O/K) |

Nhận xét chất lượng: nội dung cụ thể, đúng phân môn, đúng template cố định; tool **luôn hỏi nhu cầu trước rồi mới sinh từng phần** (đúng pattern router). Hạn chế quan sát: chạy trên gói free GPT nên đôi lúc nhắc nâng cấp Plus; một số bảng để "..." chờ giáo viên điền (đúng thiết kế phiếu học tập).

## 3. Đối chiếu với SmartPlan AI (đã đọc code)

| Khả năng EduPlan | SmartPlan đã có chưa? | Ghi chú (code) |
|---|---|---|
| Tải giáo án lên → **AI phân tích → menu gợi ý nâng cấp** | **CHƯA** | grep "tải giáo án/phân tích giáo án/nâng cấp giáo án" = 0 trong app. Đây là khoảng trống rõ nhất. |
| Sinh giáo án/hoạt động (khởi động, luyện tập, vận dụng) | Có một phần | Creator (`useLessonCreator`) sinh giáo án; có nhắc luyện tập/vận dụng/khởi động. |
| Phiếu học tập / rubric | Có lác đác | Creator nhắc "phiếu học tập", "rubric" nhưng không phải luồng à-la-carte. |
| Câu hỏi kiểm tra / ma trận / đề thi | **Có mạnh** | Tab Testing + các tool ma trận/đặc tả/đề thi. |
| Phân hóa học sinh | **Có rất mạnh** | Cả module Adaptive (diagnosticEngine, 3 tuyến) — vượt EduPlan. |
| Năng lực số / năng lực AI (theo khung) | **CHƯA** | Không có knowledge "khung năng lực số/AI" trong app. |
| Trò chơi học tập (game template) | Một phần | Có "Đấu Trường Tri Thức", link Quizizz/Kahoot — nhưng không sinh game từ bài. |
| Học liệu số (prompt ảnh/video/mô phỏng) | **Có mạnh** | Adaptive sinh SVG + mô phỏng HTML; tab Công cụ AI có VEO3, image prompt... |
| "Công cụ AI" | Có — **nhưng là DANH BẠ LINK ngoài** | `src/data/aiTools.ts`: toàn link tới Gemini Gems, Canva, Gamma, Quizizz, **"Giáo viên AI"**, "Trợ lý giáo án số"... Không phải tính năng in-app. |

**Kết luận đối chiếu:** SmartPlan **mạnh hơn** EduPlan ở phân hóa, đề thi/ma trận, và mô phỏng/SVG. Nhưng SmartPlan **thiếu đúng cái làm nên sức hút của EduPlan**: luồng "tải 1 giáo án → AI phân tích → đưa MENU nâng cấp từng phần → sinh đúng sản phẩm chọn", cộng với 2 knowledge "khung năng lực số" và "khung năng lực AI".

## 4. Có ứng dụng được không? → CÓ, 2 hướng

### Hướng 1 (nhanh, ít rủi ro): Thêm vào tab "Công cụ AI" như một mục
- Tab Công cụ AI vốn là danh bạ link. Có thể thêm 1 card trỏ tới chính EduPlan GPT (hoặc tự tạo 1 Custom GPT/Gem tương tự của riêng bạn rồi link vào). **Làm trong vài phút**, nhưng chỉ là link ngoài, không giữ chân người dùng trong web.

### Hướng 2 (nên làm — biến thành tính năng IN-APP): "Trợ lý Nâng cấp Giáo án"
Tận dụng hạ tầng sẵn có của bạn (`aiProviders.ts`, đọc file `fileUtils`, skill docx/xlsx, pipeline adaptive). Kiến trúc đề xuất:

```
[Tải giáo án .docx/.pdf] → trích text (đã có fileUtils)
   → Gọi LLM #1: PHÂN TÍCH theo khung cố định (Môn·Lớp·Bài·Thời lượng·Mục tiêu·Hoạt động·Điểm mạnh·Điểm cần nâng cấp)
   → Hiện MENU 17 mục (A–Q) dạng các nút/cards trong UI (KHÔNG sinh ngay)
   → Giáo viên chọn 1 (hoặc vài) mục
   → Gọi LLM #2 với prompt-template tương ứng + (RAG) knowledge khung năng lực số/AI, 100 ý tưởng game, 21 PP dạy học
   → Render kết quả + nút Xuất Word/PDF (đã có skill docx/pdf)
```

**Điểm mấu chốt để copy đúng "chất" EduPlan:**
1. **Pattern Router**: phân tích trước → menu → chỉ sinh thứ được chọn (đừng tự viết lại cả giáo án). Đây là khác biệt UX chính.
2. **Knowledge cố định** cho 4 mục dễ "bịa": năng lực số (G), năng lực AI (H), phương pháp dạy học (I), trò chơi (J) — nạp sẵn các khung/danh sách mẫu (giống Knowledge Base của EduPlan) rồi cho LLM tra cứu, thay vì để model tự nghĩ. Có thể nhúng thẳng các khung này vào prompt (đủ ngắn) hoặc làm RAG nếu dài.
3. **Template sản phẩm cố định** cho từng mục (phiếu học tập, rubric 4 mức, game template) — ép format đầu ra ổn định.
4. Tái dùng: bộ phân hóa (Q) đã có sẵn trong module Adaptive → có thể nối thẳng.

**Mức công sức:** trung bình. Phần khó (đọc file, gọi đa LLM, xuất docx/pdf, phân hóa) bạn ĐÃ có. Việc chính là: (a) viết khung phân tích + 17 prompt-template; (b) sưu tầm/nhúng 2–3 file knowledge (năng lực số, năng lực AI, ý tưởng game); (c) dựng UI menu-router.

## 4b. Tính năng "tạo ẢNH phiếu học tập" — nghiên cứu & khuyến nghị

Đã hỏi trực tiếp EduPlan về tấm ảnh phiếu học tập đẹp (PHIẾU HỌC TẬP SỐ 1 – Xác suất có điều kiện).

**Cơ chế EduPlan dùng = (a) MODEL SINH ẢNH (DALL·E/GPT Image).** Chính nó xác nhận: KHÔNG phải HTML render, KHÔNG phải Python vẽ. Hệ quả (nó tự nêu):
- Chữ là **pixel, KHÔNG copy/sửa được**.
- **Dễ sai dấu tiếng Việt, công thức toán méo** khi soi kỹ.
- "Không phù hợp in ấn chuyên nghiệp / giáo viên cần sửa." → đẹp để xem, rủi ro để dùng thật (nhất là môn Toán).

**EduPlan tự khuyên nên dùng Hướng 2** (không phải hướng nó đang dùng):
`LLM → JSON → HTML template + CSS → (html2canvas/Puppeteer) → PNG/PDF`. Ưu điểm: chữ sắc nét, copy được, in đẹp, xuất PDF chuẩn, dễ sửa. "Đây là cách Canva/Gamma/Tome làm."

### Có tích hợp vào web của bạn không? → CÓ, và RẤT THUẬN LỢI
App bạn **đã có sẵn nguyên bộ công cụ cho Hướng 2** (kiểm trong `package.json` + `src/utils`):
- `html2canvas-pro` (HTML→PNG), `jspdf` (→PDF), `puppeteer`/`puppeteer-core`, `docx`, `pptxgenjs`.
- Đã có util xuất: `pdfExport.ts`, `wordExportA4.ts`, `answerSheetExport.ts`...; và **đã dùng html2canvas+jsPDF trong `StudentPreviewModal.tsx`**.
- App đã quen render HTML đẹp + MathJax (template Dewey).

→ Làm "phiếu học tập đẹp" theo Hướng 2 là **việc nhẹ, tái dùng hạ tầng sẵn có**, lại cho chất lượng vượt EduPlan (chữ thật, công thức MathJax chuẩn, xuất PNG + PDF + Word).

### Đề xuất triển khai (gọn)
1. LLM sinh **JSON phiếu** (đã có template field ở mục 6 EduPlan: Tên phiếu · Mục tiêu · Hướng dẫn · Nhiệm vụ · Không gian trả lời · Mức độ NB/TH/VD/VDC · Đáp án).
2. Đổ JSON vào **1 HTML template A4 + CSS** (khối A–G, ô Họ tên/Lớp, vùng kẻ dòng để điền, sơ đồ Venn bằng SVG inline — đúng kiểu app đã làm cho bài Dewey).
3. Render công thức bằng **MathJax** (đã có).
4. Xuất bằng đúng util sẵn có: **PNG** (html2canvas-pro), **PDF** (jspdf/pdfExport), **Word** (docx/wordExportA4).
5. (Tùy chọn) thêm nút "Tạo ảnh AI" dùng image-gen cho bản trang trí — nhưng KHÔNG dùng cho phiếu cần in/sửa.

**Kết luận:** Tính năng này nên tích hợp, nhưng **làm theo Hướng 2 (HTML→PNG/PDF)** chứ đừng copy cách sinh-ảnh-AI của EduPlan — vừa hợp với hạ tầng app, vừa tránh lỗi sai dấu/công thức của ảnh AI, và cho ra phiếu in/sửa được.

## 5. Lưu ý
- EduPlan quảng bá kèm web `giaovienai.vercel.app` (đối thủ/tham khảo), và app bạn cũng đã có link "Giáo viên AI" trong Công cụ AI — nên cân nhắc tự làm in-app để không đẩy người dùng sang web khác.
- "Cách nó được code" = cấu hình Custom GPT (không có source code công khai). Tôi đã lấy được mô tả cơ chế từ chính GPT + menu nguyên văn từ knowledge của nó; **không có repo để đọc code** (nên phần "đọc code của nó" là không tồn tại với loại Custom GPT này — đã ghi rõ thay vì đoán).

*Nguồn: hội thoại trực tiếp với EduPlan GPT (nó tự khai cấu hình + trích menu từ "trợ lý nâng cấp giáo án.docx"); đọc code SmartPlan: src/data/aiTools.ts, src/hooks/useLessonCreator.ts, src/components/tabs/CreatorTab.tsx, module adaptive.*
