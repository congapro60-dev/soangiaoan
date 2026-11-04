# R2 QA progress — bài `11-11-76` (g11) — Production giaoandewey.vercel.app

> Phiên bắt đầu 27/10. Commit đã push main: `7ba0641`. Lớp QA g11: `class-1787188523562` · mã `R6RCFC` · HS Đặng Tuệ Minh PIN 2750.
> Quy tắc: sau MỖI bước append kết quả vào file này + lưu PNG/JSON `tasks/tmp-r2-qa-*`.

## B7

- [x] A1 — tạo phiên OK: `ifiIss4eMDDapvdM67Ga` · links lưu `tmp-r2-qa-session.json` (student joinCode=R6RCFC ✓, classId g11 ✓). Presenter GV mở được: Chặng 1/12 · Kế hoạch 0–3′ · timer 3:00 · CHỜ VÀO TIẾT. Ảnh a1-created + a1-presenter. Lưu ý: dialog chỉ có 2 link (tv-control + student); link TV display dựng bằng mode=tv từ tvControl
- [x] A2 — TV page + HS Đặng Tuệ Minh 2750 join OK: TV render Chặng 1/12 (không nút điều khiển); HS context riêng `student-1787188523562-0`, 11Columbus, SẴN SÀNG + language picker. Ảnh a2-tv/a2-login/a2-joined, JSON a2-join

- [x] Edge debug 9222 khởi động (Edg/156, webSocketDebuggerUrl OK)
- [x] Xác nhận deploy `7ba0641` — /adaptive-lessons hiển thị "53 gói bài học phân hoá" + nút "Tạo và xuất bản 53 bài" (R1 là 52) → bundle chứa cả 11-11-76
- [x] step1 — GV đăng nhập ✓, ảnh `tmp-r2-qa-b7-step1.png`, JSON step1
- [x] step2 — bấm "Tạo và xuất bản 53 bài" ✓; hàng mới "Lớp 11 · Tuần 11 · Tiết 76 · Đã xuất bản · 09:13:28 27/10" (title "— Tiết 2" — dư đuôi theo thiết kế, 11-11-75 là Tiết 1 cùng khối). Ảnh step2-published + step2-tab, JSON step2
- [x] step3 — lessonId từ URL detail: `adaptive-v4-11-11-76-24YyULmWgBOM6HZCfJ56RN5tiet2`; fingerprint builder ff7e800a… (pipeline tự tính, khác recipe snapshot 0d8b3e38… — chỉ ghi nhận). Ảnh step3-detail, JSON step3 (dump nông 1595 ký tự — checks false vì spec nằm sâu trong bước 3 builder)
- [x] Check PA-β / PA-d / CasioKeyGuide trên Production:
  - **PA-β ĐẠT (mức spec builder Bước 2/3)**: PHT1 2,15 "Đáp án PHT số 1 mức TH — tự tính" + 2,24 "mức VD — tự tính" (step5e field 12–16); PHT2 2,2 "Đáp án PHT số 2 — tự tính" (field 18–19 Bước 2 + field 24–25 Bước 4 Exit Ticket); bảng Internet 158/3,95 chỉ ở worked example Bước 3, KHÔNG dán nhãn PHT1 (step5d nhanPHT1=false, step5e internet395=false ở Bước 2/4) — tách biệt sạch
  - **PA-d nửa ĐẠT**: "73k = 365" vắng mặt toàn bộ builder + live; **nửa KHÔNG KIỂM ĐƯỢC**: đích mới "không nhỏ hơn 152…k nhỏ nhất" không xuất hiện trong builder Bước 2/3/4 lẫn live (pipeline V4 không chuyển Ý 3 vào UI — cùng nhóm khác biệt bố cục với Phiếu số 3/lương công ty A)
  - **Casio ẨN ĐẠT**: false ở mọi bước builder (step5c/d/e) + mọi view live (hs/tv/gv)
  - Bằng chứng: `tmp-r2-qa-b7-step5c/d/e.json` (12 fields Bước 3 + 23 fields Bước 2 + 10 fields Bước 4), ảnh step5d; live = dump trong `tmp-r2-qa-c-log.json`

## B8
