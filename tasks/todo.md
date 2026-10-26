# Việc 4 — HS chụp bài gửi bot Zalo tự chấm (2026-10-26)

## Đã chốt với chủ dự án
- Gói 1+2+3 test Zalo thật OK → làm tiếp.
- Luồng: HS chọn BÀI GIAO trước, rồi gửi ảnh (chấm có đề + đáp án).
- Model chấm: Gemini pool chủ dự án — tái dùng đúng `gradeOneSubmission` của luồng web (điểm/nhận xét/lịch sử khớp 100% web).
- Hạn mức: 5 bài/em/ngày + 100 bài/lớp/ngày (quota có sẵn `_grading-core.ts`).

## Kiến trúc
- Webhook nhận thêm event `message.image.received` (Zalo URL tạm thời) → tải về → đẩy Firebase Storage
  `accepted-homework/<classId>/<studentId>/...` + download token → URL đúng format web.
- Phiên chọn bài: Firestore `assistantPhotoSessions` (doc id botId_userId, hết hạn 10 phút, tối đa 3 ảnh).
- Chấm: `chayNgam` → `gradeOneSubmission(mode 'quick')` → xong gửi tin điểm qua Zalo.
- KHÔNG tạo serverless function mới (giới hạn 12, đang 11) — mọi thứ trong webhook + file `_` + config.

## Checklist
- [x] 1. `grade-homework.ts`: export `gradeOneSubmission` + `gradeContextFor`; thêm 2 tham số optional
      `budgetMs`/`marginMs` (web không truyền → hành vi nguyên vẹn).
- [x] 2. Tách `sendStyled`/`sendTyping`/`escMd` sang `_assistant-zalo-send.ts` (photo module cần gửi tin,
      tránh import cycle).
- [x] 3. `_assistant-ph-hs-photo.ts` (MỚI): lệnh `8`/`chấm <n>`/`xong`, phiên ảnh, tải ảnh Zalo → Storage,
      tạo submission, quota, chấm nền, báo kết quả qua Zalo.
- [x] 4. `_assistant-zalo-bot.ts`: nhận `message.image.received` (guard như tin text) + route lệnh chấm cho HS.
- [x] 5. `_assistant-ph-hs-menu.ts`: mục 8 (chỉ HS), parseMenuChoice nhận 8, câu từ cho PH.
- [x] 6. `vercel.json`: `api/assistant.ts` maxDuration 90 (chấm quick chạy trong waitUntil).
- [x] 7. Test `assistant-ph-hs-photo.test.ts` + cập nhật test menu/bot; `tsc` 0 lỗi; toàn bộ test xanh
      (4661 test: 4657 pass, 4 fail CŨ v832 hash mismatch — không liên quan việc 4).
- [x] 8. Cập nhật doc trạng thái + commit.

## An toàn
- Chỉ role student đã liên kết; bài phải thuộc đúng lớp+GV của em, không exam/online/khóa nộp.
- Ảnh ≤10MB, mime jpg/png/webp; KHÔNG log SĐT/nội dung ảnh.
- Quota trừ ngay như web (`bumpQuota` sau khi bắt chấm), câu từ chối y hệt web.
- Bài đang chờ chấm → từ chối nộp trùng; ảnh tải lỗi → HS gửi lại.
- Bài GV đã chấm tay / đã khóa: qua bot KHÔNG hỗ trợ (web làm).

## Ngoài phạm vi (lần sau)
- PH nộp thay HS; bài thi online; OMR dò bóng qua bot; bổ sung ảnh bài đã có điểm.
