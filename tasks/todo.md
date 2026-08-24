# Classroom learning loop — 2026-08-24

## P0 follow-up — camera upload queue cho 11 Columbus

- [x] Bổ sung addendum queue vào spec đã duyệt.
- [x] Viết test đỏ cho append nhiều lần, cap số file và remove theo index.
- [x] Code queue UI: preview/count, chụp thêm, xóa, submit một lần, giữ queue khi lỗi.
- [x] Chạy targeted/full test, rules, lint, build và diff check; chưa push/deploy.
- [ ] Authenticated browser E2E với tài khoản học sinh 11 Columbus trước gate deploy.

## P0 follow-up — giáo viên chọn/xóa lượt nộp cũ

- [x] Bổ sung addendum vào spec: checkbox mọi lượt; bulk delete mọi lượt đã chọn; Chấm AI/Duyệt chỉ lượt mới nhất.
- [x] Viết test đỏ cho phạm vi selection xóa bao gồm lượt cũ nhưng selection chấm/duyệt vẫn chỉ hiện hành.
- [x] Mở khóa checkbox lượt cũ, đổi select-all theo toàn bộ lượt, và bulk delete đúng các `submissionId` đã chọn.
- [x] Xác nhận bằng bulk delete chỉ xóa lượt thành công; lượt lỗi còn lại để thử lại.
- [ ] Chạy full test/build/diff check và Ox Alpha Free audit trên diff kết hợp trước gate deploy.
- [ ] Authenticated browser E2E xác nhận tick/xóa lượt cũ trong tài khoản giáo viên trước khi deploy.

## P0 follow-up — bổ sung ảnh sau khi đã chấm

- [x] Bổ sung addendum vào spec và viết implementation plan cho revision `supplementOf`.
- [x] Test đỏ rồi xanh: server ghép file cũ + mới đúng thứ tự, kiểm tra quyền parent, bài đóng, URL ngoài và Storage shared-reference khi xóa.
- [x] Code server action tạo revision an toàn; mở rộng rules đúng field; grade revision bằng toàn bộ evidence.
- [x] Code UI `Bổ sung ảnh và chấm lại`, giữ parent/queue, retry và lựa chọn tự chấm/gửi giáo viên.
- [x] Full unit/rules/lint/build/diff check; Ox Alpha Free đã được gọi nhưng lượt audit combined cuối bị provider network error nên không dùng verdict PASS giả định.
- [ ] Authenticated browser E2E: bài đã chấm → bổ sung ảnh → chấm lại toàn bộ → refresh thấy revision mới.

## P0 follow-up — vòng đời kết quả chấm an toàn dữ liệu

- [x] Duyệt thiết kế: xóa kết quả chấm nhưng giữ submission/Storage; sửa tay phải duyệt lại; AI regrade non-destructive.
- [x] Viết spec/implementation plan: `docs/superpowers/specs/2026-08-24-grade-result-lifecycle.md`, `docs/superpowers/plans/2026-08-24-grade-result-lifecycle.md`.
- [x] Viết test hồi quy cho history, sửa tay, xóa điểm, payload không hợp lệ và AI regrade thất bại.
- [x] Code server actions/UI; không thêm Vercel Function, không migration production.
- [x] Full unit/rules/lint/build đã xanh; Ox Alpha/OpenCode được gọi đúng model nhưng provider trả `Endpoint is unavailable`, nên chưa có verdict PASS.
- [ ] Merge `codex/classroom-ai-detailed-grading` vào `main`, push/deploy sau khi QA đạt.

## Phạm vi đã duyệt

- [x] Profile evidence tương thích ngược: không xóa topic chưa được đánh giá, phân biệt cùng assignment nộp lại, ghi nhận strengths.
- [x] Practice set/attempt: học sinh trả lời được, lưu được, chấm được, không nhận solution trước.
- [x] Student assignment projection không lộ đáp án/hướng dẫn chấm.
- [x] Recovery submission kẹt `grading`.
- [x] QA độc lập bằng Ox Alpha và preflight/test/rules/build.

## Ràng buộc production

- Assignment 11 Columbus đang hoạt động; không reset/xóa/migrate phá hủy.
- Không thêm Vercel Serverless Function.
- Không push `main` hoặc deploy nếu chưa có lệnh riêng.

## Ghi chú thực thi

- Mọi thay đổi production code phải có test đỏ trước.
- Nếu test/rules fail, dừng để chẩn đoán root cause, không chồng patch.

## Review/verification

- Profile evidence: hỗ trợ dữ liệu legacy và `evidenceRefs`, thay thế đúng khi học sinh nộp lại cùng assignment, xóa theo `submissionId`, ghi nhận `strengths` và practice evidence idempotent.
- Practice: private answer key, public hint-only projection, canonical question IDs/scores, quota reservation transaction, attempt lock/idempotency và không trả solution trước khi chấm.
- Privacy/rules: student assignments/submissions đi qua server projection; raw assignment/submission và practice collections bị chặn theo rules; projection không chứa answer key, rubric, instructions, teacher notes.
- Recovery: stale `grading` query không bị giới hạn batch, có composite index, kiểm tra transaction lần cuối trước khi reset.
- Verification hiện tại: targeted supplement/delete `17 tests` pass; full unit `74 files / 1,088 tests` pass; rules `7 files / 240 tests` pass; `lint` pass; `lint:api` pass; `npm run build` pass; `git diff --check` pass (chỉ cảnh báo LF/CRLF). Browser local tải `/lop` tới màn nhập mã lớp, không có console error; chưa chạy authenticated E2E vì chưa có xác nhận action-time để nhập PIN học sinh. Ox Alpha Free focused audit cuối kết thúc `Provider finish_reason: network_error`; không có verdict combined hợp lệ.
- Giới hạn còn lại: practice quota được reserve trước AI nên lần gọi AI thất bại vẫn tiêu quota; leak detection là heuristic chống lộ trực tiếp, chưa chứng minh semantic equivalence; chưa authenticated E2E/production và chưa push/deploy.

## Review/verification — vòng đời kết quả chấm (2026-08-25)

- Targeted lifecycle: 3 files / 9 tests pass; full unit: 82 files / 1,122 tests pass; rules: 7 files / 242 tests pass; `lint`, `lint:api`, `build`, `git diff --check` pass.
- Invariant đã kiểm: sửa tay lưu history và buộc duyệt lại; xóa điểm không đụng submission/ảnh/file/Storage; AI lỗi giữ grade cũ; history client-deny; ownership và trạng thái `grading` bị chặn.
- Ox Alpha Free/OpenCode: model `opencode/x-preview-f-free` được xác nhận là “Ox Alpha Free (Unlimited)”, nhưng lượt audit cuối trả `Upstream request failed: Endpoint is unavailable`; không dùng làm PASS.

## Hardening sau review — trước merge/deploy (2026-08-25)

- [x] Thêm claim token + transaction finalize: worker AI cũ không thể ghi đè sau stale recovery/manual edit/delete.
- [x] History dùng khóa revision ổn định; history và submission grade hiện hành commit cùng transaction.
- [x] Khóa chéo lớp/học sinh/bài giao cho thao tác sửa/xóa điểm; chặn học sinh chấm đè kết quả đã duyệt.
- [x] Chặn xóa cả bài và khóa sửa/duyệt/chấm lại trên UI trong lúc `grading`; sau xóa reload lại dữ liệu server.
- [x] Test hồi quy hardening: `30 tests` targeted pass; full lint/test/rules/build và review Ox Alpha còn chờ.
