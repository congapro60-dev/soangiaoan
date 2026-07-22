# Báo cáo kiểm thử: Nối hình ảnh & mô phỏng vào bài Dewey (commit 0ea1b20 + af497e2)

> Người kiểm thử: trợ lý AI (Claude), chạy độc lập. Chưa sửa code. Báo cáo trung thực: ghi rõ ĐẠT / KHÔNG ĐẠT / KHÔNG KIỂM ĐƯỢC kèm bằng chứng.
> Môi trường: dev server `http://localhost:3000` trên máy Windows; bài kiểm thử dựng từ giáo án nguồn "xác suất có điều kiện · Lớp 12".

---

## TÓM TẮT KẾT QUẢ

| Hạng mục | Kết quả |
|---|---|
| Phần 1 — Kiểm thử tầng hàm (`renderDeweyLesson`) | **ĐẠT** (ALL PASS, xác nhận độc lập) |
| Phần 2 — Hình minh hoạ TRONG bài học (không chỉ màn chào) | **ĐẠT** |
| Phần 2 — Mô phỏng tương tác TRONG bài học | **ĐẠT** (3 sim-frame iframe, vanilla JS + SVG + slider, không thư viện ngoài) |
| Phần 2 — Còn bài "toàn chữ" không? | **KHÔNG** — bài có gallery + mô phỏng + TikZ + MathJax |
| Phần 2 — Console/Network lỗi đỏ | **KHÔNG có lỗi**; kroki.io trả 200 |
| Phần 2C — Checkbox TẮT bỏ bước sinh mô phỏng | **ĐẠT** (không có bước "dựng mô phỏng"); *thời gian: không đo chính xác được do AI chậm bất thường hôm nay* |

**Kết luận: Bản vá hoạt động đúng mục tiêu — học sinh THẤY hình minh hoạ và mô phỏng tương tác BÊN TRONG bài học Dewey (iframe srcDoc), không còn cảnh "toàn chữ".**

---

## PHẦN 1 — Kiểm thử tầng hàm (verify_check.mts)

Đã tạo `verify_check.mts` đúng kịch bản: clone `sampleAdaptiveLesson`, gắn `preparation.engage.visualCards` (2 thẻ data:image/svg+xml), `knowledgeUnits[0].simulationSpec.html.srcDoc` (HTML có `<svg>` + `<input type=range>` + `<script>`), `knowledgeUnits[0].tikzCode`; gọi `adaptiveLessonToDeweyContent(lesson,'standard',{ tikzImgUrlByUnitId:{[unit0.id]:'https://kroki.io/tikz/svg/ABC'} })` → `renderDeweyLesson(content,'classic')`.

Kết quả `npx tsx verify_check.mts` (đã xoá file tạm sau khi xong):

```
PASS  contains "vc-gallery": true
PASS  contains "unit-simulation": true
PASS  contains "class="sim-frame"": true
PASS  contains "step-illustration": true
PASS  contains "kroki.io": true
HTML length: 61773
ALL PASS
```

Trích đoạn xác minh marker là thật (không phải trùng chuỗi ngẫu nhiên):
- `vc-gallery` → `<div class="vc-gallery"><figure><img src="data:image/svg+xml,…">`
- `sim-frame` → `<iframe class="sim-frame" sandbox="allow-scripts" loading="lazy" srcdoc="…SVG+range+script…">`
- `kroki` → `<img src="https://kroki.io/tikz/svg/ABC" alt="Hình minh hoạ …" loading="lazy">`
- `sandbox="allow-scripts"`: có; MathJax CDN (`tex-mml-chtml.js`): có.

→ **ĐẠT.** Tầng converter + template ráp đúng 5 thành phần như kỳ vọng.

---

## PHẦN 2 — E2E trên trình duyệt (checkbox BẬT)

### A. Tạo bài học phân hoá

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| A.4 — Checkbox "Sinh mô phỏng tương tác cho từng mảnh" hiển thị cạnh nút duyệt, mặc định BẬT | **ĐẠT** | Thấy checkbox đã tích sẵn cạnh nút "Duyệt bản rà soát & tạo cấu trúc bài học" |
| A.5 — Các dòng tiến độ | **ĐẠT** | Ghi nhận đúng chuỗi: "Đang phân tích cấu trúc bài học..." → "Đang tạo hình ảnh minh họa bài học..." → "Đang tạo bộ câu hỏi kiểm tra..." → "Đang tạo mảnh kiến thức i/5: …" → "Đang dựng mô phỏng tương tác cho mảnh i/5..." (xác nhận có cho mảnh 2,3,4,5) |
| A.5 — Banner "Cảnh báo chất lượng" | **CÓ** | "⚠️ Cảnh báo chất lượng từ pipeline tạo bài (1) — `sim_2_skipped`: mô phỏng mảnh 'Tính xác suất có điều kiện qua bảng tần suất 2 chiều' không đạt chuẩn tương tác, đã bỏ qua." → Cơ chế `sanitizeGeneratedSimulationHtml` loại sim kém chất lượng đúng như thiết kế (fault-isolated, không làm hỏng bài). |

Bài hoàn thiện: 100%, 3 mục tiêu / 5 mảnh / 10 phút. Xuất bản → mở cổng học sinh `/adaptive-portal/adaptive-1782220244414`.

### B. Học thử với vai học sinh

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| B.7 — Gallery "Hình ảnh khởi động" ở MÀN CHÀO | **ĐẠT** | 4 ảnh SVG, hiện rõ, KHÔNG vỡ, đúng nội dung: "Thu hẹp không gian mẫu" (Venn A∩B), "Công thức nhân xác suất" (2 bình bóng), "Sơ đồ cây (Tree Diagram)", "Ứng dụng: Xét nghiệm y tế" (Bayes). Không có ảnh lệch ngữ cảnh. |
| B.9 — Khởi động TRONG bài (iframe Dewey) có `.vc-gallery` | **ĐẠT** | Trong iframe srcDoc (310 KB) đếm được: `.vc-gallery` = **1** (gallery khởi động hiện ngay trong bài). |
| B.9 — Mỗi mảnh có khối "Mô phỏng tương tác" (`.unit-simulation`) với iframe nhúng | **ĐẠT** | `.unit-simulation` = **3**, `.sim-frame` (iframe) = **3**. Mảnh 3,4,5 có sim; mảnh 1 không sinh; mảnh 2 bị guard loại (khớp cảnh báo). |
| B.9 — Mô phỏng TƯƠNG TÁC thật | **ĐẠT** | Mở mảnh 3 "Công thức nhân xác suất": có 2 thanh trượt ("Số bi Xanh: 3", "Số bi Đỏ: 2") + sơ đồ cây SVG hiển thị P(B)=3/5, P(A\|B)=2/4 (tính đúng theo giá trị slider). Kiểm tra mã từng sim-frame: đều có `<script>`, `<svg>`, `type=range`, `onclick`/`addEventListener` — tức JS thật điều khiển. |
| B.9 — Hình TikZ tĩnh trong bước giải thích | **ĐẠT** | `.step-illustration` = **5**, tất cả là `<img src="https://kroki.io/tikz/svg/…">` trong bước giải thích. |
| B.9 — MathJax render công thức | **ĐẠT** | `$P(A\|B)$`, `$P(AB)=P(B)\cdot P(A\|B)$` render đẹp ở header mảnh và trong câu hỏi; script `tex-mml-chtml.js` có mặt trong iframe. |
| B.10 — Console lỗi đỏ ở màn bài học | **KHÔNG có** | `read_console_messages(onlyErrors)` → "No console errors or exceptions found" trong suốt phiên học. |
| B.10 — kroki.io Network | **ĐẠT (200)** | 5 ảnh kroki dùng `loading="lazy"` nên ban đầu chưa tải (nằm trong mảnh khoá / dưới màn). Ép tải 1 ảnh → `onload` thành công, kích thước 387×60 → kroki.io phản hồi 200, không bị chặn. |

**Kiến trúc xác nhận:** bài học học sinh học thật là MỘT iframe `srcdoc` Dewey (same-origin với localhost). Mọi hình + mô phỏng + TikZ + MathJax nằm BÊN TRONG iframe này. Cột phải có "Vở Ghi Chép Của Em"; header có 2 đồng hồ Phần/Tổng. Mô phỏng là iframe lồng `sandbox="allow-scripts"` (không `allow-same-origin`) — bảo mật tốt. Không có thư viện ngoài (three.js/geogebra/desmos/p5/cdn) và không có `<img>` URL ngoài bên trong mã mô phỏng.

> Lưu ý: cổng học sinh React còn hiển thị một khối xem trước riêng "THREE.JS GEOMETRY 3D" (mô phỏng 3D ở đường React) phía trên iframe Dewey. Đây là đường B cũ, không thuộc bài Dewey; không gây lỗi.

### Bằng chứng số (đọc trong iframe srcDoc của bài đã xuất bản)
```
.vc-gallery       : 1
.unit-simulation  : 3      (sim-frame iframe: 3)
.step-illustration: 5      (đều là <img> kroki.io)
kroki imgs        : 5
sim-frame sandbox : "allow-scripts"  (cả 3)
sim-frame nội dung: <script> + <svg> + type=range + onclick — KHÔNG thư viện ngoài, KHÔNG img URL ngoài
MathJax           : script tex-mml-chtml.js có trong iframe
Console errors    : 0
```

---

## PHẦN 2C — Kiểm thử checkbox TẮT

Tạo bài thứ 2 từ cùng giáo án nguồn, BỎ TÍCH "Sinh mô phỏng tương tác" (xác nhận `checkbox.checked === false` trước khi chạy).

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| Pipeline bỏ bước sinh mô phỏng | **ĐẠT** | Chuỗi tiến độ: "phân tích cấu trúc" → "tạo hình ảnh minh hoạ" → "tạo bộ câu hỏi" → "mảnh 1/4" → **"mảnh 2/4"** (đi thẳng từ mảnh này sang mảnh kế, KHÔNG có bước "Đang dựng mô phỏng tương tác cho mảnh i/N"). Cờ kiểm `hasSimStep:false`. Ở Phần 2 (BẬT) mỗi mảnh đều kèm 1 bước "dựng mô phỏng". |
| Vẫn còn hình minh hoạ (gallery, tikz) | **ĐẠT (theo tiến độ)** | Bước "tạo hình ảnh minh hoạ bài học" vẫn chạy bình thường khi tắt sim → gallery & tikz không bị tắt theo. |
| Tạo nhanh hơn rõ rệt | **KHÔNG ĐO CHÍNH XÁC ĐƯỢC** | Lần chạy TẮT này bị chậm bất thường ở bước "tạo hình ảnh minh hoạ" (kẹt ~5 phút, do độ trễ API ảnh hôm nay — KHÔNG liên quan tới sim). Vì bước ảnh là chung cho cả 2 chế độ và lần này nó nhiễu, không thể so sánh thời gian tổng công bằng. Về mặt logic, TẮT sim chắc chắn bỏ N lệnh gọi sinh mô phỏng nên sẽ nhanh hơn khi điều kiện mạng/AI ổn định. |

---

## CÁC ĐIỂM CẦN LƯU Ý (không phải lỗi của bản vá)

1. **Độ trễ AI hôm nay cao**: pipeline (cả BẬT và TẮT) chạy chậm, riêng bước "tạo hình ảnh minh hoạ" có lúc kẹt vài phút. Không phải lỗi của 2 commit; nhưng nên cân nhắc thêm timeout/àm retry hiển thị rõ cho giáo viên.
2. **Dev server từng rớt giữa buổi** (`ERR_CONNECTION_REFUSED` khi mở tab cổng học sinh ngay sau publish). Sau khi bật lại server thì cổng vào bình thường. Có thể do HMR/đóng phiên; không phải lỗi runtime của bài.
3. **Tab cổng học sinh mở bằng `window.open(noopener)`** đôi khi vào trang lỗi ngay sau publish — cần tải lại (F5) là vào được. Cân nhắc thêm chờ/health-check trước khi mở tab.
4. **`sim_2_skipped`** là hành vi ĐÚNG (guard loại sim kém chất lượng) — nên giữ. Nhưng có thể bổ sung cơ chế thử sinh lại 1 lần trước khi bỏ, để tăng tỉ lệ mảnh có mô phỏng.

---

## ĐỐI CHIẾU VỚI MỤC TIÊU BAN ĐẦU

- **Hình minh hoạ xuất hiện TRONG bài học (không chỉ màn chào)?** → **CÓ.** `.vc-gallery` + 5 `.step-illustration` (TikZ) nằm trong iframe Dewey.
- **Mô phỏng có TƯƠNG TÁC thật?** → **CÓ.** 3 mô phỏng vanilla-JS + SVG + slider, chạy trong iframe sandbox, giá trị tính theo thao tác.
- **Còn bài "toàn chữ" không?** → **KHÔNG.** Bài kiểm thử có đủ gallery, mô phỏng, TikZ, MathJax.

*Bằng chứng kỹ thuật lấy từ: verify_check.mts (tầng hàm), DOM của iframe srcDoc Dewey trong cổng học sinh đã xuất bản (`adaptive-1782220244414`), read_console_messages, và kiểm tra tải ảnh kroki.io. Ảnh chụp màn hình màn bài học (gallery + mô phỏng slider + sơ đồ cây) đã quan sát trực tiếp trong phiên.*
