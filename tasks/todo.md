# P0 — Khôi phục nội dung câu hỏi từ PDF/Word/ảnh trong báo cáo (2026-08-28)

# Live Lesson V4 Service Pilot — 2026-08-28

## Scope

- [x] Study `liveLessonService`, singleton Firebase wiring, current `firestore.rules`, rules-test shapes, and emulator config.
- [x] Add only permitted local pilot wiring: auth emulator in `firebase.json`, `vitest.pilot.config.ts`, `test:pilot` script.
- [x] Create `test/pilot/liveLessonServicePilot.test.ts` driving the real service against Firestore/Auth emulators, with REST bypass seeding.
- [x] Create `qa_artifacts/live-lesson-v4/service-pilot-report.md` with checks and run instructions.
- [x] Run `npm run test:pilot` and capture output; do not use browser, deploy, push, or production data.

## Review

- [x] `npm run test:pilot` PASS: 1 file, 1 test.
- [x] All service allow-path operations logged PASS; deny-path `permission-denied` checks logged PASS.
- [x] No production wiring/rules/service/API/V4 contract files edited.

## Constraints

- Do not edit `src/lib/firebase.ts`, `src/services/liveLessonService.ts`, `firestore.rules`, `api/`, or V4 contract files.
- Only local emulator; no real student data.
- Deny-path evaluator traces are acceptable; all allow-path operations must succeed.

---

# Đẩy giáo án lên Drive + chọn bài theo PPCT — 2026-08-11

- [x] TDD parser nhãn `Phần/Tự luận` và dòng chi tiết neo ngay dưới câu được chọn.
- [x] TDD reader PDF chữ, PDF scan, ảnh và Word có ảnh; OCR chỉ chạy khi thiếu chữ.
- [x] Nối reader lazy vào báo cáo giáo viên, cache trong phiên, không ghi bài nộp/điểm.
- [x] Chạy focused/full test, lint, lint:api, build, diff check và QA read-only.
- [ ] Chờ lệnh riêng mới push/deploy.

Plan: `docs/superpowers/plans/2026-08-28-class-report-question-source-ocr.md`.

## Review/verification — khôi phục nội dung câu hỏi từ nguồn gốc

- Đã sửa trong branch `codex/class-report-collaboration`; chưa push `main`, chưa deploy.
- Thống kê theo câu nay chèn dòng chi tiết ngay sau câu được chọn trong cùng bảng; hover/focus/click vẫn giữ, click có thể ghim và có nút đóng.
- Khi catalog thiếu, chỉ lúc giáo viên mở câu mới tải nguồn đề `http(s)` ở chế độ read-only; ưu tiên `sourceText`/chữ PDF-Word, sau đó đọc ảnh scan/ảnh nhúng DOCX và gọi Vision OCR một lần cho các câu còn thiếu. Kết quả chỉ nằm trong snapshot bộ nhớ hiện tại và có cache/retry; không ghi Firestore, Storage, bài nộp, điểm hoặc nhận xét.
- Parser giữ ngữ cảnh `Phần II/III`, nhận alias `Tự luận – Bài 1`/`Bài 1 (TL)`, hỗ trợ tiêu đề Markdown do OCR trả về; nội dung/đáp án đi qua `NhanXetMarkdown` + KaTeX.
- Guard an toàn: URL chỉ `http(s)`, tối đa 8 nguồn/6 ảnh, file tối đa 20 MB, nguồn treo bị ngắt sau 20 giây; cảnh báo không làm mất số liệu hoặc liên kết đề gốc.
- Focused cuối: **4 files / 50 tests PASS**; full Vitest sau thay đổi timeout: **103 files / 1.370 tests PASS**.
- `lint`, `lint:api`, `npm run build` và `git diff --check`: PASS. Build vẫn hiện cảnh báo chunk lớn/dynamic import vốn có; chunk entry hiện khoảng 1,45 MB, không phải lỗi build và không liên quan dữ liệu lớp.
- Local browser smoke: trang landing tải được, không có console error/warning; chưa có authenticated E2E cho màn hình báo cáo và không dùng dữ liệu thật của lớp 11 Columbus.

# P0 — Báo cáo thủ công và cộng tác giáo viên (2026-08-27)

- [x] Duyệt spec và tạo worktree sạch từ `origin/main`.
- [x] Nút **Tạo báo cáo** tính lại báo cáo với 0 hoặc nhiều lượt nộp, giữ snapshot khi lỗi.
- [x] Membership giáo viên: mời bằng email, co-owner, chuyển quyền, rời/xóa thành viên.
- [x] Nối quyền server-side cho lớp/bài giao/lượt nộp/báo cáo; giữ nguyên namespace dữ liệu cũ.
- [x] Đổi tên lớp, học sinh, bài giao; sửa điểm/nhận xét có history và yêu cầu duyệt lại.
- [x] Hỗ trợ nhất quán bài nộp ảnh và bài online; không lộ đáp án cho học sinh.
- [x] Chạy focused/full tests, lint, lint:api, build và diff check.
- [ ] QA bằng phiên đăng nhập thật/Ox Alpha: Chrome connector không khả dụng; Ox Alpha đã lỗi provider hai lần, chưa có verdict PASS.
- [ ] Chưa push/deploy cho tới khi có lệnh tích hợp riêng.

## Review/verification — báo cáo thủ công và cộng tác giáo viên

- Đang triển khai trong branch `codex/class-report-collaboration`.
- Spec: `docs/superpowers/specs/2026-08-27-class-report-collaboration-design.md`.
- Plan: `docs/superpowers/plans/2026-08-27-class-report-collaboration-plan.md`.
- Tạo báo cáo: có thể ép tính lại cho bài chưa có lượt nộp; lỗi nguồn không thay snapshot đang hiển thị; hỗ trợ dữ liệu bài ảnh và bài online.
- Cộng tác: quyền được kiểm tra ở API Admin; mời co-owner, chuyển quyền sau khi chấp nhận, rời lớp, xóa thành viên; bảo vệ chủ gốc và không xóa dữ liệu bài nộp.
- Đổi tên: giữ nguyên `classId`/namespace và lưu `previousNames` để ghép bài online legacy sau khi đổi tên; đổi tên học sinh/bài giao không tạo ID mới.
- Chấm: co-owner đi qua cùng cổng AI/manual/duyệt/xóa điểm; sửa tay lưu history và buộc duyệt lại; AI regrade lỗi không làm mất điểm cũ.
- Bằng chứng tự động cuối: focused `4 files / 40 tests` pass; full `100 files / 1,344 tests` pass; `lint` pass; `lint:api` pass; `npm run build` pass; `git diff --check` pass.
- QA trình duyệt: local app tải được và không có console error ở smoke unauthenticated; Chrome connector báo `Browser is not available: chrome`, nên chưa thể xác nhận luồng đăng nhập thật/production.
- Ox Alpha Free/OpenCode: model `opencode/x-preview-f-free` đã được gọi nhưng provider trả lỗi `Unexpected server error` ở refs `err_81d184c4` và `err_a6cfdca1`; không dùng làm verdict PASS.

# P0 — Tương thích công thức cũ trong nhận xét chấm (2026-08-25)

- [x] Tái hiện lỗi dữ liệu cũ mất dấu `\\` ở `in/subset/cap` trong màn hình nhận xét.
- [x] Viết test đỏ/xanh cho chuỗi hình học cũ và kiểm tra không đổi câu thường.
- [x] Khôi phục toán tử dạng chữ có điều kiện trong module math duy nhất; không sửa dữ liệu/điểm đã lưu.
- [x] Targeted 27/27, full Vitest 85 files/1,208 tests, `lint`, `lint:api`, `build`, `git diff --check` và Ox Alpha Free QA PASS.
- [ ] Push/deploy sau khi có lệnh tích hợp riêng.

## Review/verification — tương thích công thức cũ

- Chuỗi `D in SA, SA subset (SAB) => D in (SAB)` được chuyển thành vùng KaTeX an toàn ở lớp hiển thị.
- Câu thường như `Học sinh in bài rồi.`, `Fill in the blanks.` và `Please log in now.` giữ nguyên; `repairMathString` không đổi dữ liệu nguồn cũ.
- Chỉ thay đổi `src/lib/adaptive/mathText.ts` và test của module; không chạm Firestore, Storage, submission, grade hay production.

# P0 — Bộ lọc lịch sử lượt nộp giáo viên (2026-08-25)

- [x] Chốt spec: mặc định chỉ lượt mới nhất; lịch sử vẫn giữ nguyên và mở được khi cần.
- [x] Test đỏ/xanh cho projection `latest`/`all`.
- [x] Code bộ lọc và giới hạn “Chọn lượt đang hiển thị” theo đúng projection.
- [ ] Chạy full test, lint, lint:api, build, QA độc lập và push `origin/main`.

# P0 — Báo cáo tổng hợp theo từng bài giao (2026-08-25)

- [x] Duyệt spec và mô hình hóa số liệu latest/official, phân bố điểm, câu hỏi, lỗi, chủ đề và khuyến nghị.
- [x] Code báo cáo read-only cho bài nộp ảnh/AI và đề online; thêm CSV tổng hợp và nối vào màn hình lớp học.
- [x] Siết privacy/identity: không xuất dữ liệu riêng; không gán dòng đầu khi trùng tên; thang điểm online lấy từ cấu hình đề.
- [x] Focused 23/23, full Vitest 85 files/1.207 tests, lint, lint:api, build, diff check và Ox Alpha Free QA PASS.
- [x] Merge vào `main` và push `origin/main` ở `c50e09a`; HTTP smoke production trả 200; không thao tác dữ liệu lớp 11 Columbus.
- [ ] Xác nhận Vercel deployment của `c50e09a` ở trạng thái Ready/Production khi có CLI hoặc dashboard khả dụng.

# P0 — Công thức nhận xét và chẩn đoán nộp trùng (2026-08-25)

- [x] Test đỏ rồi xanh: công thức ở `Bài làm của em` và `Đáp án / mốc cần đạt` đi qua KaTeX.
- [x] Sửa renderer, chạy targeted test xanh.
- [x] Kiểm chứng một lần chọn nhiều ảnh chỉ tạo một lượt nộp; phân biệt với nộp lại/bổ sung ảnh.
- [x] Không tái hiện race/double-submit; giữ nguyên guard UI và không thêm dedupe có thể làm mất nộp bổ sung hợp lệ.
- [x] Chạy full test/lint/build/diff check và Ox Alpha QA; chưa push/deploy khi chưa có lệnh riêng.

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
- [x] Chạy full test/build/diff check và Ox Alpha Free audit trên diff kết hợp trước gate deploy.
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
- [x] Full unit/rules/lint/build đã xanh; Ox Alpha/OpenCode được gọi đúng model và audit cuối đạt PASS.
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

- Targeted lifecycle/hardening: 5 files / 37 tests pass; full unit: 82 files / 1,129 tests pass; rules: 7 files / 242 tests pass; `lint`, `lint:api`, `build`, `git diff --check` pass.
- Invariant đã kiểm: sửa tay lưu history và buộc duyệt lại; xóa điểm không đụng submission/ảnh/file/Storage; AI lỗi giữ grade cũ; history client-deny; ownership và trạng thái `grading` bị chặn.
- Ox Alpha Free/OpenCode: model `opencode/x-preview-f-free` được xác nhận là “Ox Alpha Free (Unlimited)”; audit cuối đạt PASS trên 7/7 hạng mục.

## Hardening sau review — trước merge/deploy (2026-08-25)

- [x] Thêm claim token + transaction finalize: worker AI cũ không thể ghi đè sau stale recovery/manual edit/delete.
- [x] History dùng khóa revision ổn định; history và submission grade hiện hành commit cùng transaction.
- [x] Khóa chéo lớp/học sinh/bài giao cho thao tác sửa/xóa điểm; chặn học sinh chấm đè kết quả đã duyệt.
- [x] Chặn xóa cả bài và khóa sửa/duyệt/chấm lại trên UI trong lúc `grading`; sau xóa reload lại dữ liệu server.
- [x] Đưa duyệt/bỏ duyệt điểm qua server transaction, đồng bộ profile/evidence và chặn approve khi `grading`; bulk approve chỉ nhận lượt `graded`.
- [x] Test hồi quy hardening: `30 tests` targeted pass; full unit `82 files / 1,129 tests`, rules `7 files / 242 tests`, `lint`, `lint:api`, `build`, `git diff --check` và Ox Alpha Free audit đều đạt; production mới chỉ QA read-only, chưa claim authenticated E2E.
## Trạng thái kiểm soát

`READY_FOR_CONTROLLED_SCALE` — chưa phải `READY_FOR_MASS_PRODUCTION`.

Các report kiểm chứng: `qa/reports/content_gates_regression_post_regen_pilot.json`, `qa/reports/regression_post_regen_pilot.json`, `qa/reports/batch01_regen4_v3_verifier_final.json`.

Các artifact hỗ trợ: `temp/tds_staging/batch_2026-08-20_regen4_v3/visual_results.json`, `qa/reference/batch01_regen4_v3_lesson_content_maps.json`, và 4 DOCX trong thư mục staging tương ứng.


## Lô F — Regen5 pilot sau false negative P060 — 2026-08-20

- [x] Audit false negative: gate Activity–Phiếu–Teacher Key trước đó chưa chứng minh mismatch thực sự.
- [x] Cài `triangle_symbol_consistency_pass` với quy ước `a↔A`, `b↔B`, `c↔C` và các góc xen giữa.
- [x] Cài `given_quantity_reassigned=0`, kiểm đồng bộ Activity–Phiếu–Teacher Key và `geometry_recomputation_pass`.
- [x] Sửa generator/rule P060: `b=9`, `c=12`, `A=90°`, `a=15`, `S=54`; đồng bộ activity, GHI BẢNG, Phiếu HS, Teacher Key, map và geometry contract.
- [x] Sửa generator/rule P056: `5,33` chỉ còn trong lời giải sai có bước sai cụ thể; chốt `n∈N`, `n_max=5`.
- [x] Chỉ regenerate P056/P060; giữ nguyên P055/P057.
- [x] Render exact regen5 và visual QA 100%: P055 8 trang, P056 8 trang, P057 7 trang, P060 8 trang; không clipping/overlap/leakage.
- [x] Content-gate regression: `negative_fixtures_all_expected=true`, `positive_fixtures_all_pass=true`, `regen5_all_pass=true`, `overall_pass=true`.
- [x] Regression 19 case: `negative_fixture_all_expected=true`, `gold_locked_all_pass=true`, `all_test_cases_pass=true`.
- [x] Tạo báo cáo `qa/reports/batch01_regen5_pilot_handoff_2026-08-20.md`.
- [x] Không promotion, không chạy Batch 02, không sửa GOLD_LOCKED, không move/delete artifact.
- [ ] Chờ người dùng duyệt regen5 pilot.


## Lô G — Promotion staging Week56 G11–G12 sau duyệt — 2026-08-20

- [x] Kiểm tra AGENTS, thư mục production đích và danh sách canonical IDs cần thay.
- [x] Đối chiếu SHA-256 staging với production candidate; tạo backup có timestamp, không xóa file cũ.
- [x] Thay có kiểm soát chỉ các file Tuần 5–6 Khối 11–12; không chạm Khối 10.
- [x] Hậu kiểm số lượng, SHA-256, tên file, backup và ghi biên bản promotion; không thay file ngoài scope.
- [ ] Chờ xác nhận cuối từ người dùng sau khi gửi biên bản.

Trạng thái: promotion đã hoàn tất và hậu kiểm PASS; backup vẫn được giữ nguyên, không xóa file cũ.

---

## Lô H — Soạn lại 32 giáo án G11–G12 Tuần 5–6 theo mẫu Ban Toán — 2026-08-22

- [x] Đọc `docs/KE_HOACH_FIX_G11_G12_W5_W6.md` và đối chiếu mẫu Ban Toán Khối 10 Tuần 5–6.
- [x] Tạo staging mới, backup 32 file cũ, không sửa `src/`/PPCT JSON.
- [x] Soạn lại đủ 32 DOCX theo bố cục Ban Toán, có Phiếu 1–2 và Teacher Key.
- [x] QA XML/CIS: 32/32 PASS; QA theo tuần: 4/4 PASS.
- [x] Render trực quan: 32/32 DOCX, 276 trang PNG, kiểm tra contact sheet và trang đại diện.
- [x] Ghi đè đúng 32 file đích; checksum staging–đích khớp 32/32.
- [x] `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run build` PASS; chỉ còn cảnh báo chunk/import vốn có.

Backup bản cũ: `C:\Users\ADMIN\AppData\Local\Temp\smartplan-ban-toan-backup-20260822-084004`.

## V3 Live Lesson Firestore realtime — baseline 2026-08-25

- [x] Worktree riêng: `codex/g10-p31-firestore`.
- [x] `npm run lint`: PASS.
- [x] `npm run lint:api`: PASS.
- [x] `npm run build`: PASS; chỉ còn cảnh báo Vite chunk/dynamic import đã có từ trước.
- [x] Full Vitest baseline: 64 test files, 1013 tests passed.
- [ ] Baseline còn 1 test timeout có sẵn ngoài phạm vi V3: `api/__tests__/ai-gateway-handler.test.ts` — SSE raw `[DONE]` sentinel timeout ở 5 giây.
- [x] `npm install` trong worktree bị treo; đã dừng an toàn và dùng junction tới dependency tree đã có ở checkout chính. Bản cài dở được giữ ngoài workspace tại `C:\Users\ADMIN\AppData\Local\Temp\smart-lesson-plan-ai-node_modules-incomplete-20260825`.

## Task 8 — Close-session progress bridge — 2026-08-25

- [x] Sửa bridge theo response contract canonical thực tế: route P16 là response server-confirmed, exit-ticket là `responseType: text`; validate definition và từng response; xử lý toàn bộ submissions; timestamp retry lấy từ session closed/updated timestamp.
- [x] Nối close flow vào action của `/api/adaptive-progress` để server xác minh token, session closed, teacher ownership, class ownership, `studentLinks` và roster trước khi ghi từng record ready.
- [x] Tạo/reuse profileRecord server-side hợp lệ, không bịa objective mastery; chỉ ghi khi lesson đã published/portal-enabled; UI phân biệt eligible/saved/failed/incomplete.
- [x] Viết hướng dẫn vận hành tiếng Việt tại `docs/features/08-live-lesson-realtime.md`, gồm route, laptop/TV/Vcast/thiết bị HS, launch/close, troubleshooting và fallback V2.
- [x] Focused live/API/route verification 42/42 pass; full Vitest 76 files/1110 tests pass; `lint`, `lint:api`, `build` pass. Build chỉ còn warning chunk/import vốn có.
- [x] Rules: chạy trực tiếp Vitest Rules suite trên Firestore Emulator đang chạy đúng worktree — 8 files/260 tests pass. Wrapper `npm run test:rules` không dùng được vì nó cố khởi động thêm emulator trên cổng 8080.
- [x] Không deploy/push; commit riêng sau khi các gate trên có evidence.

### Task 8 review evidence — 2026-08-25

- Focused route/API set: 4 files / 42 tests PASS: live definition, progress bridge, adaptive-progress API, StudentLiveView.
- Full Vitest: 76 files / 1110 tests PASS.
- `npm run lint` và `npm run lint:api`: PASS.
- `npm run build`: PASS; Vite chỉ cảnh báo module externalized/chunk >500KB và index chunk hiện có.
- Rules direct run: 8 files / 260 tests PASS trên emulator PID 18096 đã chạy với đúng `firestore.rules`; wrapper `npm run test:rules` bị chặn do cố bind lại cổng 8080.
- Server mapping evidence: roster doc ID được dùng để kiểm link, adaptive ID là `${teacherUid}_${normalizeStudentCode(roster.code)}`; route lấy từ response server hoặc trusted profile, thiếu cả hai trả `incomplete`.

## Task 9 — Seed bài pilot vào danh sách Bài học phân hoá — 2026-08-26

- [x] Xác định root cause: gói runtime `g10_w5_p31_bpt_tiet1` chỉ nằm trong source, chưa có document `adaptiveLessons` cho tài khoản giáo viên.
- [x] Viết test đỏ/xanh cho bản `AdaptiveLesson` pilot đúng mã `tds-g10-30-pilot`, tiêu đề, lớp 10, 40 phút, nội dung BPT và trạng thái published.
- [x] Thêm nút `Cài bài demo G10 P31` ngay trong trang Quản lý bài học phân hoá; sau khi lưu, bài xuất hiện như một dòng bài bình thường.
- [x] Sửa API tiến trình để tìm document theo `lessonId` trước, vẫn tương thích document legacy theo UID giáo viên.
- [x] Targeted 14/14, full Vitest 97 files/1307 tests, rules 8 files/264 tests, lint, lint:api và build PASS; chỉ còn cảnh báo Vite vốn có.
- [x] Commit `c6eec47` và bản sửa type `069da51`; deployment cuối `dpl_AMePBtDn2e6HuRyaDgXaQ23TxEuW` báo `READY` và đã alias vào `https://giaoandewey.vercel.app`.
- [x] Authenticated browser smoke test: nút hiện ngay trong trang `Bài học phân hoá`; bấm cài thành công, bài `Bất phương trình bậc nhất hai ẩn — Tiết 1` / `tds-g10-30-pilot` xuất hiện ở dòng đầu với các thao tác `Mở bài`, `Xem cổng`, `Mở tiết trực tiếp`, `Xóa`.

## Task 10 — Sửa quyền tạo phiên pilot theo contract — 2026-08-26

- [x] Tái lập lỗi production bằng ca test đúng bộ `allowedStepIds` canonical của G10 P31: 9 bước, có THINK và `route`; test đỏ trước khi sửa.
- [x] Sửa `firestore.rules` tối thiểu: giới hạn 9 bước và giữ `THINK`/`route` trong allowlist; không mở thêm field/quyền khác.
- [x] Rules Emulator xanh: 8 file / 299 test trên nhánh tích hợp.
- [x] Chạy full unit, lint, build và kiểm tra diff.
- [x] Deploy Firestore Rules lên `smartplan-ai-14200`, xác minh release production và smoke test tạo phiên.

## Task 11 — Ổn định listener thống kê TV — 2026-08-26

- [x] Production smoke phát hiện TV báo lỗi stats ngay ở `lobby` dù phiên tạo thành công.
- [x] TDD: test UI và Rules đỏ trước khi sửa; nguyên nhân là TV subscribe khi `showStats=false` và Rules chặn document stats chưa tồn tại.
- [x] Sửa tối thiểu: TV chỉ subscribe khi `showStats=true`; Rules cho phép đọc document stats còn thiếu nhưng vẫn kiểm tra đầy đủ document khi đã tồn tại.
- [x] Targeted UI test 4/4 và Rules 8 file / 266 test PASS.
- [x] Chạy full unit, lint, build và kiểm tra diff.
- [x] Deploy Vercel frontend + Firestore Rules và smoke test lại TV/HS.

## Task 12 — Ổn định timestamp sau điều khiển phiên — 2026-08-26

- [x] Production smoke tái lập lỗi: bật thống kê làm UI báo `updatedAt must be a Firestore Timestamp or finite number`.
- [x] TDD đỏ/xanh: service test kiểm tra cache có `updatedAt:null` và snapshot server đã xác nhận timestamp.
- [x] Sau `updateDoc`/đóng phiên, đọc lại snapshot bằng `getDocFromServer` trước khi chuẩn hoá và ghi public state.
- [x] Listener bỏ qua snapshot cục bộ đang `hasPendingWrites=true`, chờ bản server đã có timestamp trước khi chuẩn hoá.
- [x] Retry có điều kiện khi snapshot server vẫn chưa materialize `updatedAt`; không retry các lỗi dữ liệu khác.
- [x] TDD targeted service 16/16 PASS; full unit riêng 97 file / 1.309 test, `lint`, `lint:api`, `build` PASS; chỉ còn cảnh báo Vite vốn có. Full run song song từng có 1 ca SSE timeout do tranh chấp tài nguyên, đã loại trừ bằng run riêng.
- [x] Deploy bản sửa cuối lên Vercel `dpl_DAWLo3R3yuNom98BnDXgqUoNks3u` (`READY`, alias `giaoandewey.vercel.app`); release lại `firestore.rules` thành công và smoke GV → TV → HS không còn lỗi quyền/timestamp.

## Task 13 — Three-portal UX: mobile GV, fit-to-screen TV, class-context HS — 2026-08-26

- [x] Student link carries the selected class context; student selects a roster name and enters only PIN; creation is blocked when the class has no join code.
- [x] Teacher portal is mobile-first with the current cue and sticky previous/pause/next controls.
- [x] TV portal fits the public screen and five pilot metrics into one viewport without scroll.
- [x] Run focused/full tests, lint, API lint, build, diff check, browser smoke, independent reviews, then release evidence.

### Task 13 implementation evidence — 2026-08-26

- Focused live suite: 5 files / 29 tests PASS after the three-portal changes.
- Full Vitest: 98 files / 1322 tests PASS.
- `npm run lint`: PASS; `npm run lint:api`: PASS.
- `npm run build`: PASS; Vite only reported existing chunk/dynamic-import warnings.
- `git diff --check`: PASS.
- Local browser route smoke reached the live route but could not read the historical session because Firestore returned `Missing or insufficient permissions`; no visual PASS is claimed from that route.
- Vercel deployment `dpl_5PwBUAn4bsV2rEeVvumZEQnC7mjg` is `READY / Production` at `https://giaoandewey.vercel.app`; HTTP smoke `/` and a live route both returned 200.

## Task 14 — Report request storm + classroom/grading/student QA — 2026-08-27

- [x] Xác định production gọi lặp `/api/classroom`; không phải AI sinh báo cáo chậm.
- [ ] TDD lỗi dependency không ổn định và request treo.
- [ ] Sửa tối thiểu, không migration/ghi/xóa dữ liệu lớp.
- [ ] QA lớp học, giao/nộp bài, chấm điểm và giao diện học sinh theo rủi ro.
- [ ] Review độc lập, full gates, push main, production smoke chỉ đọc.
- [ ] Báo cáo lỗi còn lại và đề xuất nâng cấp.

## Task 15 — Khuyến nghị dạy học có bằng chứng — 2026-08-27

- [x] Tách nhãn trung tính như "Không có" khỏi thống kê lỗi và khuyến nghị.
- [x] TDD khuyến nghị phải nêu dữ liệu, ưu tiên, hành động trên lớp, thời lượng và cách kiểm tra lại.
- [x] Sinh khuyến nghị theo điểm lớp, độ phủ nộp bài, câu/chủ đề/lỗi yếu; không suy diễn khi thiếu bằng chứng.
- [x] Hiển thị bản tiếng Việt giáo dục rõ ràng, đọc được trên màn hình báo cáo.
- [x] Chạy focused test, lint, lint:api, build và rà soát diff.

## Task 16 — Ma trận tiến độ học sinh theo bài giao — 2026-08-27

- [x] Tái sử dụng snapshot báo cáo đã tải; không gọi thêm API và không sửa dữ liệu.
- [x] Hiển thị ma trận học sinh × bài giao: thiếu/nộp/chờ chấm/đã duyệt, điểm và số lượt nộp.
- [x] Có tổng hợp theo từng học sinh: số bài đã nộp, tỷ lệ hoàn thành, điểm trung bình chính thức.
- [x] Có lọc/tìm kiếm và bảng cuộn ngang để dùng được khi lớp nhiều học sinh/bài.
- [x] TDD model ma trận, build kiểm tra UI và chạy các gate trước khi bàn giao.

## Task 17 — Xem nội dung câu hỏi và ảnh bài nộp — 2026-08-27

- [x] Trong báo cáo, di chuột/bấm vào số câu để mở nội dung câu hỏi thật; không suy đoán khi nguồn không có cấu trúc.
- [x] Với đề online và đề upload có chữ, hiển thị nội dung qua renderer công thức chuẩn; với ảnh scan, cho mở đề gốc.
- [x] Thay việc mở từng ảnh bài nộp bằng một trình xem ảnh có Trước/Sau, số thứ tự và phím tắt.

### Review/verification — các nâng cấp báo cáo và xem ảnh

- Focused: 4 file test / 37 test pass (`questionCatalog`, `classReportModel`, `classProgressModel`, `ClassAssignmentReport`).
- `npm run lint`: PASS; `npm run lint:api`: PASS; `npm run build`: PASS.
- `git diff --check`: PASS; build chỉ còn cảnh báo Vite chunk/dynamic import vốn có.
- Chưa chạy authenticated browser E2E; chờ người dùng tự QA sau deployment.

## Live Lesson V4 Task 3 — Language/glossary privacy — 2026-08-27

- [x] Đọc Task 3 plan, design sections 6/6.2/6.3/11.3, V4 contract/package và pattern test thuần hiện có.
- [x] Viết test trước cho `languageSupport` và `glossary`: enum giới hạn, preference hợp lệ được reuse, default `vi_anchor`, draft/retired không ra student runtime, ký hiệu Toán giữ nguyên.
- [x] Cài `src/lib/liveLesson/v4/languageSupport.ts` và `glossary.ts` thuần, không gọi AI và không suy ngôn ngữ thành năng lực.
- [x] Thêm helper/test thuần cho `StudentLiveView`: first-run choice, chip đổi ngôn ngữ, popup glossary, trạng thái offline `Đã lưu trên máy`.
- [x] Sửa `liveLessonService` chỉ gửi/lưu `languagePreference` enum size-limited; không gửi support plan/PIN/private data.
- [x] Thêm helper/test thuần cho `TeacherLiveView`: summary nhu cầu riêng tư aggregate, không nhãn công khai năng lực/ngôn ngữ.
- [x] Nghiệm thu: chạy full liveLesson suite theo lệnh user và `npm run lint`.

### Review — Live Lesson V4 Task 3

- RED đã quan sát trước implementation: 5 file test mới/sửa fail vì thiếu module/export đúng kỳ vọng.
- Focused Task 3 tests: 5 files / 21 tests PASS.
- Full requested liveLesson suite: 12 files / 95 tests PASS.
- `npm run lint`: PASS (`tsc --noEmit`).
- Không sửa `firestore.rules`, `TvLiveView`, v4 contract/package Task 1/2 hoặc deploy/push.

## Live Lesson V4 Task 10 — deterministic multi-client E2E — 2026-08-28

- [x] Create pure anonymous fixture `test/fixtures/g10-p31-v4-anonymous.json` with 3 scripted students and no real names.
- [x] Create `test/e2e-v4-live-lesson.mjs` using only relative imports into this worktree and real V4 lib functions.
- [x] Assert 9 required checks: teacher projection, TV public projection, student projection, language/glossary/evidence neutrality, grouping approval, post-check integrity, offline queue, TV privacy, timeline integrity/timing budget.
- [x] Create QA docs under `qa_artifacts/live-lesson-v4/` with coverage table and manifest.
- [x] Verify `npx tsx test/e2e-v4-live-lesson.mjs` exits 0 and prints each PASS line.
- [x] Verify `npm run build` still passes; do not modify contract, `firestore.rules`, or `api/`.

## V4 final local QA checkpoint — 2026-08-29/30

- [x] Fix `closeLiveLessonSession`: do not write the public projection after closing revokes public Rules access.
- [x] Add guarded dev-only emulator wiring; production path remains unchanged when `VITE_USE_EMULATOR` is off.
- [ ] Browser wiring/service smoke against Auth/Firestore Emulator is PASS; three-viewport teacher/TV/student flow is not claimed.
- [x] Rules suite: 8 files / 299 tests PASS; deny-path evaluator traces remain explicitly documented, no zero-trace claim.
- [x] Regression: response `languagePreference` can be updated after an existing response, while the validator still rejects unsupported/private fields.
- [x] Full unit suite: 133 files / 1635 tests PASS.
- [x] Service pilot: 13/13 checks PASS; deterministic V4 E2E: 9/9 checks PASS.
- [x] `lint`, `lint:api`, and `build` PASS.
- [x] Write `qa_artifacts/live-lesson-v4/browser-pilot-report.md` with evidence and limits.
- [ ] Real teacher-authenticated staging smoke and Vercel deployment/HTTP smoke remain pending; push to `main` is a separate release gate.

### Integration QA — 2026-08-30

- [x] Reconciled V4 commits onto `origin/main` in isolated worktree `codex/v4-main-integration`.
- [x] Fixed integration compile regressions, restored the THINK prerequisite, made missing public stats reads safe, and aligned the TV fixture with canonical screen `S8A`.
- [x] `npm run lint`, `npm run lint:api`, `npm run test`, `npm run test:rules`, `npm run test:pilot`, and `npm run build` pass on the integration worktree.
- [ ] Real teacher account, production/Vercel HTTP smoke, and human three-viewport classroom flow are still user-facing QA gates.

## V4 all Ban Toán W5–W6 — 48 lesson packages — 2026-08-30

Đặc tả: `docs/superpowers/specs/2026-08-30-live-lesson-v4-all-ban-toan-design.md`
Kế hoạch: `docs/superpowers/plans/2026-08-30-live-lesson-v4-all-ban-toan-plan.md`

- [ ] Chụp snapshot/provenance từ `LESSON_SPECS` hiện hành; không dùng `lesson-data.json` stale.
- [ ] Tạo adapter `LessonSpec → LiveLessonV4Contract`, đúng 2400 giây, formation/practice/elective-practice.
- [ ] Sinh registry/runtime artifact cho đủ 48 bài, giữ compatibility P31.
- [ ] Tích hợp lookup exact vào chức năng `Bài học phân hoá`, không match title mơ hồ.
- [ ] Giữ `languagePreference` là lựa chọn HS; glossary vi/en/ja/ko/zh và privacy allowlist.
- [ ] Tạo evidence/group proposal/post-check/offline cho từng gói; grouping phải chờ GV duyệt.
- [ ] Chạy focused tests → review độc lập → full lint/lint:api/test/build; chưa commit/push/deploy.
- [ ] Viết `tasks/session_v4_all_lesson_packages.md` sau khi kết thúc phiên.

## V4 three-portal QA continuation — 2026-08-31

- [x] Tái lập và sửa blocker Rules: checkpoint V4 canonical được allowlist đúng, vẫn giới hạn 9 bước.
- [x] Tái lập và sửa race listener HS sau anonymous sign-in: public projection không bị revoke chỉ vì auth state đổi.
- [x] Tái lập và sửa raw LaTeX trên TV/HS bằng renderer KaTeX dùng chung; thêm test chuẩn hóa công thức.
- [x] Browser pilot local dùng dữ liệu giả: GV điều khiển `P00 → P03 → P05 → P08 → P16 → P19 → P20 → P27`; TV và HS nhận realtime; HS gửi choice/text/post-check; TV chỉ hiện thống kê aggregate.
- [x] Visual QA TV/HS: công thức render đúng, TV không tràn khung ở viewport 1280×720; TV không hiện tên HS hoặc text phản hồi cá nhân.
- [x] Gates sau patch: `npm run lint`, `npm run lint:api`, `npm run test`, `npm run test:rules`, `npm run build` đều PASS.
- [ ] Chưa có real teacher-authenticated staging, Vercel/production HTTP smoke hoặc deployment; không được gọi là release production.

## V4 sequential publication — 2026-08-31

- [x] Thêm strict audit đối chiếu source/assessment/route/AI Error/40 phút/glossary trước publish.
- [x] Publish tuần tự một bài mỗi lần, skip bài đã published, chặn khác owner/foreign identity, tiếp tục và báo lỗi từng bài.
- [x] Thêm nút `Xuất bản tuần tự 48 bài`, progress `n/48` và thống kê published/skipped/audit fail/error trong Bài học phân hóa.
- [x] Emulator local: REST xác nhận 48/48 V4 document `published`, 48 source key duy nhất, tất cả 40 phút.
- [ ] Chưa publish Firestore production; cần deploy code trước rồi mới chạy nút trên tài khoản thật.

## Release QA: title/delete/self-study — 2026-08-31

- [x] Tiêu đề draft V4 dùng tên bài + `— Tiết N`, không dùng chuỗi kỹ thuật khó tìm.
- [x] Nút xóa giữ xác nhận rõ ràng, có nhãn truy cập và chỉ cập nhật danh sách sau khi Firestore xóa thành công.
- [x] Browser QA cổng tự học bằng dữ liệu tổng hợp: nhập thông tin → diagnostic → bài học → scaffold → 3 gói M/S/C → vận dụng → tổng kết → lưu tiến trình.
- [x] Phát hiện và sửa gói `Vận dụng` placeholder: converter dùng trực tiếp route task V4 khi lesson chưa có `practiceSet`.
- [x] Phát hiện và sửa công thức kết luận dài tràn ngang: tách các dòng công thức và giới hạn vùng MathJax trong card/vở ghi.
- [x] Chạy lại toàn bộ gate và push `main` thành công (`0a1f381`).

## V4 list UX — one real lesson list — 2026-08-31

- [x] Bỏ lưới catalog `G/W/P` khỏi màn hình chính; giữ catalog dưới dạng tóm tắt.
- [x] Đổi thao tác chính thành `Tạo và xuất bản 48 bài`, xử lý tuần tự và cập nhật bảng bài thật ngay sau từng bài.
- [x] Hiển thị metadata lớp/tuần/tiết dưới tên bài; giữ đủ Mở bài, Xem cổng, Mở tiết trực tiếp, Xóa.
- [x] Xóa state/handler/import chỉ phục vụ nút cài 48 nháp (`handleSeedV4Packages`, `seedingV4`, `v4SeedMessage`, `Plus`, `buildBanToanV4AdaptiveLessonDraft`, `getBanToanV4PackageMetadata`, `banToanV4Metadata`).
- [x] Viết test thuần: `shouldShowLiveLessonAction` cho pilot/V4/legacy, `getDeleteLessonConfirmation`, `resolveAdaptiveBuilderUrl`, `resolveAdaptivePortalUrl`.
- [x] Focused test: 2 files / 32 tests PASS; `lint` PASS.
- [x] Demo P31 `tds-g10-30-pilot` được nhận diện là source `10-5-31`, nâng cấp tại chỗ, không tạo bản sao; runtime launcher dùng V4 khi có identity nguồn.
- [x] QA pure state: published V4 formation/practice/elective và legacy P31 đều có runtime live; draft/archived bị chặn.
- [x] Gỡ catalog grid, giữ một bảng lesson thật và một nút `Tạo và xuất bản 48 bài`; focused 4 files / 49 tests PASS.
- [x] Full unit 145 files / 1.731 tests, Rules 8 files / 301 tests, service pilot 13/13, build và lint PASS sau thay đổi.
- [ ] QA browser production sau deploy: xuất bản 48 document thật, kiểm 48 logic lesson/47 document mới + demo P31, không duplicate.
- [ ] Chạy gate cuối, commit và push `main`.
