# Kế hoạch — Ảnh raster AI cho giáo án (minh họa bối cảnh & CDTC)

> Trạng thái: **ĐÃ TRIỂN KHAI (2026-09-28)** trên nhánh `feat/toan-images` theo quyết định mục 11 — xem mục "Ảnh minh họa AI" trong HANDOFF.md. Phát sinh ngoài kế hoạch: form trường Toán trước đó bỏ mọi hình khi xuất, nên đã thêm nhúng hình (cả TikZ) vào `buildSchoolFormDocx`/`buildSchoolFormHtml`.
> Nền tảng đã khảo sát: DOCX đã nhúng PNG qua `krokiRender.renderDiagramToPng` → `renderWordCore`; `api/generate-simulation.ts` là mẫu endpoint owner-key Gemini (`@google/genai`) có rate-limit; api/ còn ~2 slot (trần 12 Vercel).

## 1. Mục tiêu & phạm vi (RANH GIỚI QUAN TRỌNG)
Ảnh raster AI **CHỈ** dùng cho **ảnh minh họa bối cảnh** và **yếu tố CDTC/liên văn hóa** mà TikZ không vẽ được:
- Bối cảnh thực tế: khu chợ, cây cầu, dây chuyền, quầy hàng, sân trường, phương tiện…
- Công dân toàn cầu/liên văn hóa: bản đồ thế giới, cụm cờ quốc gia, khung cảnh đa văn hóa, biểu tượng tổ chức (minh họa, không phải logo thật).

**KHÔNG dùng raster AI cho:**
- Hình Toán chính xác (đồ thị, hình học, miền nghiệm) → **giữ TikZ** (chính xác tuyệt đối).
- Bảng số liệu / biểu đồ cột có số → **giữ bảng Markdown + TikZ** (số phải đúng; AI raster hay bịa số/chữ).
Lý do: ảnh raster hay sai số, méo chữ, thừa chi tiết — không được để nó "nói dối" nội dung Toán.

## 2. Kiến trúc đề xuất (bám kiến trúc "diagram block → PNG at export" sẵn có)
Thêm loại block mới song song với `tikz/svg/mermaid` trong `classifyDiagram`:
```
```aiimg
mô tả tiếng Việt ngắn, cụ thể (vd: "khu chợ ngoài trời có 3 quầy bánh, phong cách minh họa phẳng")
```
```
- AI sinh giáo án chỉ viết **directive tiếng Việt** trong block `aiimg` (KHÔNG phải English image prompt — giữ đúng quyết định cũ ở HANDOFF).
- Ở bước xuất Word/PDF (hoặc bước hậu-sinh), một hàm `renderAiImageToPng(directive)` gọi model tạo ảnh → PNG → nhúng đúng như Kroki hiện tại.
- **Cache bắt buộc**: key = hash(directive + style + kích thước). Ảnh đã sinh lưu lại (Firebase Storage hoặc data-URL đính trong giáo án) để lần xuất sau không gọi lại (raster chậm ~5–15s + tốn tiền).

## 3. Provider & model
- **Gemini image** qua `@google/genai` (model `gemini-2.5-flash-image` / Imagen) — cùng SDK `api/generate-simulation.ts` đang dùng. Không cần thêm nhà cung cấp mới.
- Hai lựa chọn khóa (mục 9 cần chốt):
  - **A. Owner-key server-side** (giống generate-simulation): endpoint `api/…` dùng `GRADING_GEMINI_API_KEY`, có auth Firebase + rate-limit + quota/ngày. Chi phí về owner. Nhất quán với luồng chấm/simulation.
  - **B. BYOK client-side**: dùng khóa Gemini của chính giáo viên (giống luồng soạn giáo án). Không tốn slot function, chi phí về giáo viên; nhưng cần khóa hỗ trợ image-gen và lộ luồng ở client.
- Khuyến nghị: **A** (kiểm soát chi phí/lạm dụng, nhất quán, cache dùng chung).

## 4. Vercel function (trần 12)
- Hiện ~10 function. Thêm **1 endpoint `api/generate-image.ts`** (còn slot) HOẶC **gộp vào dispatcher `api/grade-homework.ts`** qua `action: 'generateImage'` (không tốn slot — đúng bài học GLM gateway đã làm). Khuyến nghị **gộp dispatcher** để chừa slot.

## 5. Đường đi dữ liệu
- **Thời điểm sinh ảnh**: chọn **hậu-sinh giáo án** (sau khi AI viết xong text, trước khi cho người dùng xuất) thay vì mỗi lần xuất — để cache ổn định và người dùng thấy ảnh ngay trên web.
  - Bước: parse các block `aiimg` → gọi endpoint từng directive (song song, có giới hạn) → nhận PNG → lưu Storage + thay block bằng tham chiếu ảnh đã cache.
- **Nhúng**: PNG → tái dùng đúng path `renderDiagramToPng`/`renderWordCore` (Word) và `buildSchoolFormHtml` (PDF) đang embed ảnh.

## 6. Kiểm soát chất lượng & an toàn
- **Directive constraints** (đưa vào prompt sinh giáo án): ảnh minh họa phẳng, không chứa CHỮ/SỐ trong ảnh (tránh sai chính tả/số), không người thật nhận diện được, không nhạy cảm (tôn giáo/chính trị/giới tính — đã có luật này), phong cách nhất quán một giáo án.
- **Số lượng**: ≤ ~3 ảnh raster/giáo án; chỉ khi phục vụ mục đích học tập/CDTC rõ; không nhồi cho đủ (đồng bộ luật hình mục A đã thêm).
- **Fallback**: endpoint lỗi/timeout/quá quota → **bỏ ảnh, giữ 1 câu mô tả tiếng Việt** (không chặn xuất giáo án). Không bao giờ để giáo án hỏng vì ảnh.
- **QA nội dung**: thêm luật/kiểm để directive `aiimg` không rơi vào hình Toán (nếu mô tả có "đồ thị/miền nghiệm/hệ trục" → cảnh báo dùng TikZ thay thế).

## 7. QA & test
- Unit: `classifyDiagram` nhận `aiimg`; parser cache key ổn định; fallback khi lỗi.
- Mock endpoint (không gọi model thật trong test).
- Render mẫu: 1 giáo án có 1 ảnh bối cảnh + 1 ảnh CDTC → kiểm nhúng Word/PDF.
- `npm run build` + full suite xanh.

## 8. Chi phí & quota
- Mỗi ảnh ~ vài cent (Gemini image). Với owner-key: đặt **quota/ngày/giáo viên** (tái dùng cơ chế `gradingQuota`), và cache để không sinh lại.
- Ước lượng: 3 ảnh × N giáo án/ngày. Cần owner đặt ngưỡng.

## 9. Quyết định cần owner chốt trước khi code
1. **Khóa**: owner-key server-side (A, khuyến nghị) hay BYOK giáo viên (B)?
2. **Model ảnh**: `gemini-2.5-flash-image` (nhanh/rẻ) hay Imagen (đẹp hơn/đắt hơn)?
3. **Function**: gộp vào `grade-homework` dispatcher (khuyến nghị) hay endpoint riêng?
4. **Lưu ảnh**: Firebase Storage (chia sẻ/cache tốt) hay data-URL nhúng thẳng giáo án (đơn giản, phình file)?
5. **Quota/ngày/giáo viên** cho ảnh: bao nhiêu?
6. Phạm vi ban đầu: chỉ **path Ban Toán**, hay cả các mẫu khác (cv5512/claude/default)?

## 10. Các bước triển khai (sau khi chốt)
1. Endpoint image-gen (dispatcher action) + auth + rate-limit + quota + cache Storage.
2. `classifyDiagram` + `renderAiImageToPng` (block `aiimg`).
3. Bước hậu-sinh: quét `aiimg`, gọi endpoint, lưu cache, thay tham chiếu; fallback.
4. Prompt: hướng dẫn AI dùng `aiimg` ĐÚNG phạm vi (bối cảnh/CDTC), kèm constraints mục 6.
5. Nhúng Word/PDF (tái dùng path ảnh sẵn có).
6. Test + render QA + build.

## Rủi ro chính
- Ảnh sai/kỳ dị → chỉ dùng cho minh họa, không cho nội dung Toán; có fallback.
- Chi phí phình → cache + quota bắt buộc.
- Chậm khi xuất → sinh ở bước hậu-sinh + cache, không sinh lúc xuất.

---

## 11. CẬP NHẬT sau khi soi billing + nhánh (2026-09-27) — QUYẾT ĐỊNH CỦA OWNER

**Owner đã chốt:** (2) model = **Imagen**; (5) BYOK thì tùy GV, qua khóa chung thì GV tự trả nên "đắt cũng được, cho thoải mái"; (6) áp cho **tất cả mẫu**, đồng thời **rút gọn chỉ còn 2 mẫu: Ban Toán + CV5512 (BGD)**, xóa các mẫu linh tinh.

### 11.1. Billing đã có sẵn trên `main` — KHÔNG đẻ quota mới (trả lời #1, #5)
`main` đã có nguyên hệ ví/sao kê AI: `api/_ai-usage.ts` (đếm token mọi lượt khóa chung qua AsyncLocalStorage + refs lớp/GV), `src/lib/admin/aiPricing.ts` (`costUsdOfCall` — bảng giá, tính tiền lúc hiển thị), `aiWallet` (trừ ví, voucher), `_ai-billing.ts` (sao kê tháng), tab `AiBillingTab`/`AdminTab`.
→ Ảnh raster **tái dùng nguyên cơ chế này**:
- **Khóa chung (owner)**: gọi Imagen trong request-context → `_ai-usage.ts` tự ghi lượt + refs; thêm **giá Imagen vào `aiPricing.ts`** (tính theo ảnh, không theo token) → tự trừ ví GV. Vì GV tự trả nên KHÔNG cần quota chặt; chỉ cần chặn khi ví hết (đã có `AiBlockedBanner`/`AiKeyGateModal`).
- **BYOK (khóa GV)**: `keySource` = khóa riêng → billing null, không trừ ví; GV trả Google trực tiếp. Không giới hạn.
→ Bỏ mục 8 (quota tự chế) và phần "quota/ngày" ở mục 3/9: dùng ví có sẵn.

### 11.2. Vercel function (giải thích #3)
Vercel Hobby chỉ cho **12 serverless function** tổng; app đang dùng ~10 (đã đụng trần một lần, phải gộp GLM gateway). Thêm 1 endpoint ảnh = tốn 1 slot. **Khuyến nghị: gộp action `generateImage` vào endpoint sẵn có** (vd `grade-homework` hoặc endpoint AI dùng chung) để khỏi tốn slot — đúng cách đã làm với GLM.

### 11.3. Lưu ảnh (tư vấn #4)
**Khuyến nghị Firebase Storage** (đã dùng cho ảnh lớp học), KHÔNG nhúng data-URL:
- Cache theo hash(directive+style): ảnh sinh 1 lần, mọi lần xuất/lần mở sau dùng lại → tiết kiệm tiền.
- Giữ giáo án/Firestore nhẹ (data-URL ảnh raster ~vài trăm KB/ảnh sẽ phình doc).
- Lúc xuất Word/PDF: tải bytes từ Storage (theo tham chiếu đã cache) rồi nhúng như PNG hiện tại.

### 11.4. Model Imagen (#2) — giá vào `aiPricing.ts`
Dùng Imagen qua `@google/genai` (khóa chung như `generate-simulation`, hoặc khóa GV nếu BYOK). Thêm dòng giá/ảnh cho Imagen vào bảng giá để sao kê quy ra tiền.

### 11.5. Rút gọn mẫu (#6) — TÁCH thành task riêng
`BuiltinFormat = 'default' | 'cv5512' | 'claude' | 'toan'` → giữ **`toan` + `cv5512`**, bỏ `claude` + `default`.
⚠ `default` là mẫu "adaptive/phân hóa" — có thể còn dùng ở hệ adaptive lesson/PPCT queue; **phải rà blast-radius trước khi xóa** (không xóa mù). Làm ở task riêng, không trộn với task ảnh.

## 12. TÌNH TRẠNG NHÁNH — PHẢI XỬ LÝ TRƯỚC KHI CODE ẢNH
- Nhánh `feat/toan-final-template` đang **sau `origin/main` 249 commit**; toàn bộ hệ billing/ví + nhiều tính năng (sổ điểm, SSM, tự chấm…) nằm trên `main`, **không có trên nhánh này**.
- Việc mẫu Ban Toán (Must/Should/Could + MINH CHỨNG + cổng nội dung + ảnh/CDTC) tôi làm phiên này đang **mắc kẹt trên nhánh cũ**.
- ⇒ **Thứ tự đúng**: (a) đưa việc Ban Toán của nhánh này **hòa vào `main`** (rà xem `main` đã đổi generator Toán chưa để tránh xung đột/trùng); (b) **rồi mới** xây tính năng ảnh raster + rút gọn mẫu **trên nền `main`** (nơi có billing). KHÔNG xây tiếp trên nhánh 249-commit-cũ.
