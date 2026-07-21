# Prompt cho Cowork — Sửa key relay Vercel + Test live tính năng tạo Slide

> Copy toàn bộ phần dưới đây gửi cho Cowork. Việc này Claude Code KHÔNG tự làm được
> vì cần đăng nhập Vercel dashboard và thao tác với API key (chính sách không cho
> AI tự nhập credentials).

---

## BỐI CẢNH (đọc trước khi làm)

Web SmartPlan AI (https://giaoandewey.vercel.app, repo github.com/congapro60-dev/soangiaoan)
vừa deploy bản mới (commit `a1bbf55`) có **cổng chất lượng slide tự động**: sau khi AI sinh
slide, hệ thống tự chấm (tiêu đề dài, quá nhiều bullet, mật độ chữ cao...) và tự gọi AI sửa
1 lượt trước khi cho tải PPTX.

**Vấn đề đang chặn người dùng**: endpoint `/api/gemini-relay` trên production trả
`500 {"error":"All fallback providers exhausted"}` — nghĩa là TOÀN BỘ key AI dự phòng
phía server đã hết quota hoặc bị thu hồi. Giáo viên không nhập key cá nhân hiện
**không dùng được bất kỳ tính năng AI nào**.

Relay đọc 3 biến môi trường này (file `api/gemini-relay.ts`):

| Biến | Vai trò | Định dạng |
|---|---|---|
| `GEMINI_FALLBACK_KEY` | Key Gemini chính (thử đầu tiên) | 1 key |
| `GROK_FALLBACK_KEY` | Key xAI Grok (dự phòng 2) | 1 key |
| `DEEPSEEK_FALLBACK_KEYS` | Pool key DeepSeek (dự phòng 3) | nhiều key, phân cách dấu phẩy |

## VIỆC 1 — Thay key trong Vercel (bắt buộc, làm trước)

1. Mở https://vercel.com, đăng nhập tài khoản chủ project (congapro60@gmail.com).
2. Vào project **soangiaoan** (domain giaoandewey.vercel.app) → **Settings → Environment Variables**.
3. Lấy key Gemini mới: https://aistudio.google.com/apikey (Google account nào còn quota free tier đều được). Cập nhật giá trị `GEMINI_FALLBACK_KEY`.
4. (Tuỳ chọn nhưng nên làm) Cập nhật luôn `DEEPSEEK_FALLBACK_KEYS` (lấy tại https://platform.deepseek.com) và `GROK_FALLBACK_KEY` (https://console.x.ai) nếu có.
5. Sau khi lưu env: vào tab **Deployments** → nút ⋯ ở deployment mới nhất → **Redeploy** (env mới chỉ có hiệu lực sau redeploy).
6. **Nghiệm thu Việc 1**: chạy lệnh sau (hoặc dán URL vào trình duyệt qua công cụ tương đương):
   ```
   curl -X POST "https://giaoandewey.vercel.app/api/gemini-relay" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Tra loi dung 1 tu: OK","model":"gemini-2.5-flash"}'
   ```
   Đạt khi: HTTP 200 và body có `{"text":"OK..."}`. Chưa đạt nếu vẫn 500.

## VIỆC 2 — Test live tính năng tạo Slide với model thật (sau khi Việc 1 đạt)

Mục tiêu: xác nhận chuỗi "văn bản thô → AI sinh slide → cổng chất lượng tự sửa → tải PPTX"
chạy tốt với MODEL THẬT trên production (phần này trước đó chỉ mới test bằng response giả lập).

1. Mở https://giaoandewey.vercel.app, đăng nhập (hoặc "Xem chế độ demo").
2. Vào tab **Soạn giáo án** → nút **"Tạo Slide nhanh từ Văn bản thô"**.
3. Dán đoạn giáo án mẫu này vào ô văn bản:
   ```
   GIÁO ÁN: TỈ LỆ THỨC — Môn: Toán 7, 45 phút.
   I. MỤC TIÊU: Phát biểu định nghĩa tỉ lệ thức; nêu tính chất tích trung tỉ = tích ngoại tỉ; vận dụng tìm số hạng chưa biết.
   II. KHỞI ĐỘNG (5p): GV cho ví dụ 2/4 = 3/6, hỏi HS quan hệ giữa hai phân số.
   III. HÌNH THÀNH KIẾN THỨC (20p): Định nghĩa a/b = c/d; tính chất a.d = b.c; ví dụ 3/4 = 9/12 vì 3.12 = 4.9 = 36; chứng minh nhân hai vế với b.d.
   IV. LUYỆN TẬP (12p): Bài 1 tìm x biết x/3 = 8/12 (x = 2); Bài 2 lập tỉ lệ thức từ 2, 4, 3, 6.
   V. VẬN DỤNG (8p): Chia 15 cái kẹo theo tỉ lệ 2:3 (An 6, Bình 9).
   VI. SƠ KẾT & BTVN: Bài 5, 6 trang 26 SGK.
   ```
4. Bấm **"Bắt đầu tạo Slide"** và quan sát toast:
   - Nếu AI sinh slide có lỗi bố cục, sẽ thấy toast "**Đang tự rà soát & tinh chỉnh bố cục N slide...**" rồi "**Đã tinh chỉnh bố cục slide theo chuẩn thiết kế.**" — đó là cổng chất lượng đang hoạt động. (Không thấy toast này cũng KHÔNG phải lỗi — nghĩa là bản nháp AI đã đạt chuẩn ngay.)
5. Khi bảng preview slide hiện ra, bấm **"Tải file PPTX"**, mở file bằng PowerPoint và kiểm:
   - [ ] File mở được, không báo "needs repair".
   - [ ] MỌI tiêu đề slide nằm gọn 1 dòng trong thanh xanh, không tràn/không wrap.
   - [ ] Không slide nào quá 6 bullet; không bullet nào là cả đoạn văn dài.
   - [ ] Nội dung Toán đúng (định nghĩa, tính chất, đáp án x = 2, An 6 – Bình 9).
   - [ ] Có speaker notes ở phần Notes của từng slide.
6. **Báo cáo lại**: chụp màn hình vài slide + ghi rõ đạt/không đạt từng mục kiểm ở bước 5,
   và có/không thấy toast "tinh chỉnh bố cục" ở bước 4.

## Việc 3 (tuỳ chọn) — Kiểm tra free-router pool từ browser thật

Trong app, Cài đặt → chọn nhà cung cấp "free-router" rồi thử tạo 1 nội dung bất kỳ.
Ghi lại Console (F12): nếu các node MiniMax/Conduit báo "Connection error" thì pool này
bị CORS chặn từ browser — báo lại để dev quyết định giữ hay bỏ pool phía client.
