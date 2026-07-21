# Prompt cho Cowork — Key relay (chỉ cho cổng học sinh) + Test live tạo Slide

> Copy toàn bộ phần dưới đây gửi cho Cowork. Claude Code không tự làm được vì cần
> đăng nhập Vercel và thao tác API key (chính sách không cho AI tự nhập credentials).

---

## BỐI CẢNH (cập nhật 2026-07-21 — CHÍNH SÁCH KEY ĐÃ ĐỔI)

Chủ dự án đã quyết định: **giáo viên phải dùng API key của riêng mình** — app không còn
key dự phòng cho giáo viên nữa. Cụ thể (branch `feat/require-own-api-key`):

- Đã XÓA "Router Free" (kho key chia sẻ) khỏi Cài đặt và toàn bộ fallback relay phía giáo viên.
- Giáo viên chưa nhập key sẽ thấy thông báo: "Chưa có API key... vào Cài đặt, dán key của riêng bạn".
- Endpoint `/api/gemini-relay` **VẪN GIỮ** nhưng giờ CHỈ phục vụ **cổng học sinh**
  (2 tính năng: chấm ảnh bài làm học sinh + cá nhân hóa lộ trình PA3 — học sinh không thể có key riêng).

Relay hiện trả `500 {"error":"All fallback providers exhausted"}` → 2 tính năng học sinh
nói trên đang CHẾT. Relay đọc 3 biến env (file `api/gemini-relay.ts`):

| Biến | Vai trò | Định dạng |
|---|---|---|
| `GEMINI_FALLBACK_KEY` | Key Gemini (thử đầu tiên) | 1 key |
| `GROK_FALLBACK_KEY` | Key xAI Grok (dự phòng 2) | 1 key |
| `DEEPSEEK_FALLBACK_KEYS` | Pool DeepSeek (dự phòng 3) | nhiều key, phân cách dấu phẩy |

## VIỆC 1 — Thay key relay trong Vercel (phục vụ CỔNG HỌC SINH)

1. Mở https://vercel.com, đăng nhập tài khoản chủ project (congapro60@gmail.com).
2. Project **soangiaoan** (domain giaoandewey.vercel.app) → **Settings → Environment Variables**.
3. Lấy key Gemini mới tại https://aistudio.google.com/apikey → cập nhật `GEMINI_FALLBACK_KEY`.
   (Nên dùng một Google account RIÊNG cho học sinh để quota tách khỏi key cá nhân của giáo viên.)
4. (Tuỳ chọn) Cập nhật `DEEPSEEK_FALLBACK_KEYS` (https://platform.deepseek.com) và
   `GROK_FALLBACK_KEY` (https://console.x.ai).
5. Deployments → ⋯ → **Redeploy** (env chỉ có hiệu lực sau redeploy).
6. **Nghiệm thu**:
   ```
   curl -X POST "https://giaoandewey.vercel.app/api/gemini-relay" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Tra loi dung 1 tu: OK","model":"gemini-2.5-flash"}'
   ```
   Đạt khi HTTP 200 và body có `{"text":"OK..."}`.

## VIỆC 2 — Test live tạo Slide với model thật (dùng key CÁ NHÂN)

Mục tiêu: xác nhận chuỗi "văn bản thô → AI sinh slide → cổng chất lượng tự sửa → tải PPTX"
với MODEL THẬT (trước đó chỉ mới verify bằng response giả lập).

1. Mở https://giaoandewey.vercel.app, đăng nhập tài khoản giáo viên.
2. **Cài đặt → tab Gemini → dán API key cá nhân** (lấy tại aistudio.google.com/apikey nếu chưa có).
   Lưu ý: KHÔNG còn tab "Router Free" nữa — đó là thay đổi chủ đích, không phải lỗi.
3. Tab **Soạn giáo án** → **"Tạo Slide nhanh từ Văn bản thô"**, dán:
   ```
   GIÁO ÁN: TỈ LỆ THỨC — Môn: Toán 7, 45 phút.
   I. MỤC TIÊU: Phát biểu định nghĩa tỉ lệ thức; nêu tính chất tích trung tỉ = tích ngoại tỉ; vận dụng tìm số hạng chưa biết.
   II. KHỞI ĐỘNG (5p): GV cho ví dụ 2/4 = 3/6, hỏi HS quan hệ giữa hai phân số.
   III. HÌNH THÀNH KIẾN THỨC (20p): Định nghĩa a/b = c/d; tính chất a.d = b.c; ví dụ 3/4 = 9/12 vì 3.12 = 4.9 = 36; chứng minh nhân hai vế với b.d.
   IV. LUYỆN TẬP (12p): Bài 1 tìm x biết x/3 = 8/12 (x = 2); Bài 2 lập tỉ lệ thức từ 2, 4, 3, 6.
   V. VẬN DỤNG (8p): Chia 15 cái kẹo theo tỉ lệ 2:3 (An 6, Bình 9).
   VI. SƠ KẾT & BTVN: Bài 5, 6 trang 26 SGK.
   ```
4. Bấm **"Bắt đầu tạo Slide"**, quan sát toast: nếu thấy "**Đang tự rà soát & tinh chỉnh bố cục
   N slide...**" → cổng chất lượng đang hoạt động (không thấy cũng không phải lỗi — nghĩa là
   bản nháp AI đạt chuẩn ngay).
5. Bấm **"Tải file PPTX"**, mở bằng PowerPoint, kiểm:
   - [ ] File mở được, không báo "needs repair".
   - [ ] MỌI tiêu đề slide nằm gọn 1 dòng trong thanh xanh (title dài sẽ tự co font).
   - [ ] Không slide nào quá 6 bullet; không bullet nào là cả đoạn văn dài.
   - [ ] Nội dung Toán đúng (x = 2; An 6 – Bình 9).
   - [ ] Có speaker notes ở phần Notes.
6. **Test thông báo thiếu key**: đăng xuất/dùng tài khoản chưa có key → thử tạo nội dung AI
   → phải thấy thông báo "Chưa có API key..." rõ ràng (KHÔNG được im lặng hay lỗi khó hiểu).
7. **Báo cáo**: chụp màn hình + đạt/không đạt từng mục.

## VIỆC 3 — Test cổng học sinh (sau Việc 1 đạt)

1. Mở một bài học phân hóa đã bật cổng (link/QR học sinh), làm bài với vai học sinh.
2. Kiểm 2 tính năng dùng relay: nộp ảnh bài làm để AI nhận xét, và lộ trình cá nhân hóa
   sau bài chẩn đoán. Cả hai phải chạy (không lỗi console `Personalization relay error`).
