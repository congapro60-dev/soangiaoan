# Nộp hộ — HS gửi bài Zalo hộ bạn cùng lớp (2026-10-27)

## Đã chốt với chủ dự án
- HS xác định "nộp hộ ai" bằng **gõ tên bạn** (bot tìm trong lớp; trùng tên thì liệt kê chọn số).
- KHÔNG dùng PIN của bạn (biết PIN = đăng nhập luôn vai bạn — lỗ hổng).
- GV thấy trên web: field `assistBy` + badge "HS nộp hộ" ở cột Lưu ý của danh sách bài nộp.
- Chỉ HS (role student) nộp hộ; chỉ bạn CÙNG LỚP; chỉ bài được giao cho bạn đó và bạn đó CHƯA nộp.
- Quota 5 bài/em/ngày trừ của EM ĐƯỢC NỘP HỘ; tin chấm xong gửi về máy người nộp hộ;
  em được nộp hộ xem điểm qua bot của em (mục 2).

## Thiết kế luồng
1. HS nhắn `nộp hộ` → bot hỏi tên → HS gõ tên → khớp 1 bạn: liệt kê bài chờ CỦA BẠN ĐÓ
   → `nộp hộ <số>` mở phiên assist → gửi ảnh → `xong` như thường.
2. Trùng tên: bot liệt kê đánh số → `chọn <số>`.
3. Trạng thái luồng (pre-session) lưu ngay doc `assistantPhotoSessions` (botId_userId):
   `assistState: 'name'|'pick'|'list'` + `targetCandidates` + `targetStudentId/Name`.
   Phiên assist mở hẳn thì có `assist: { targetStudentId, targetName }`.
4. `finishPhotoSession`: mọi kiểm tra/quota/submission dùng target; `submittedBy.studentId` =
   NGƯỜI GỬI THẬT; thêm `assistBy: { studentId, name, via: 'zalo_bot' }`.

## Checklist
- [x] 1. `_assistant-ph-hs-photo.ts`: parse `nộp hộ [n]` / `chọn n`; pre-session + assist target;
      openPhotoSession nhận assist; photoReceivedReply/finishPhotoSession dùng target + assistBy;
      tin nhắn kèm tên bạn; photoListReply thêm dòng hướng dẫn nộp hộ.
- [x] 2. `_assistant-zalo-bot.ts`: route các kind mới cho HS + hook `assistFreeTextReply` (tên tự do).
- [x] 3. `_assistant-ph-hs-menu.ts`: mục 8 nhắc cú pháp nộp hộ.
- [x] 4. `types.ts`: `SubmissionDoc.assistBy`; projection teacher `_classroom-teacher.ts` đổ `assistBy`.
- [x] 5. `AssignmentPanel.tsx`: badge "HS nộp hộ" cột Lưu ý (title kèm tên bạn nộp hộ).
- [x] 6. Test: photo (assist đầy đủ + self regression) + zalo-bot dispatch. Bắt thêm lỗi 0-match tên.
- [x] 7. Gate: vitest 2 file 106/106 → full suite 4684/4688 (4 fail cũ v832) → tsc 2 config → build.
- [x] 8. Commit `b7f13fc` + deploy preview (Ready) + alias `zalo-test`; cập nhật doc trạng thái.
- [x] 9. QA fix A1–A3 (27/10): A1 dời check nộp trùng + quota vào transaction; A2 chặn `nộp hộ` đè
      phiên thường đang có ảnh; A3 wording "nhắn 2" dẫn nhầm người nộp hộ. Photo tests 39/39
      (34 cũ + 5 mới), bot 72/72, tsc 0 lỗi 2 config, build pass.
- [x] 10. Commit bản staged A1–A3: `2989e1b`; gate gốc 111/111, tsc 2 config exit 0.
- [x] 11. Review độc lập đúng `preview/zalo-live-test`: phát hiện phiên cũ nộp trùng sau graded/error,
      race thay phiên/nhận ảnh/xong và callback tên cũ làm kẹt phiên mới. Sửa transaction + mã phiên;
      câu chặn trùng dẫn rõ `tài khoản của <Tên>`; thêm 10 regression tests.
- [x] 12. Gate test cuối: 121/121 (photo 49 + bot 72).
- [x] 13. Chốt sửa A1–A3 trong một commit bổ sung, chỉ 4 file thuộc scope.
- Gate sau commit: chạy lại 2 file Vitest + tsc 2 config; kết quả báo cuối phiên. Build kiểm bổ sung.
- [x] 14. Deploy preview lại (URL `spai-assistant-ph-ih1b1dsvc-...`) + alias `zalo-test` — bản chứa fix Codex `4c568b7`; webhook 401 không secret (chuẩn). Phiên QA không push/deploy.

## Ngoài phạm vi
- PH nộp thay; thông báo chủ động cho em được nộp hộ (Zalo OA không chủ động nhắn được);
  giới hạn "ai được phép nộp hộ ai" thêm (chỉ cần GV duyệt là chốt chặn).
