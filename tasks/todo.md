# Đẩy giáo án lên Drive + chọn bài theo PPCT — 2026-08-11

## Lô mới — Vercel AI Gateway GLM 5.2 — 2026-08-22

- [x] Chốt design server-side: `AI_GATEWAY_API_KEY`, Firebase ID token, model cố định `zai/glm-5.2`, text/stream only.
- [x] Tạo worktree riêng `codex/add-vercel-glm-gateway` để bảo vệ thay đổi chưa commit trên branch đang mở.
- [x] Viết test contract và quan sát RED trước khi triển khai.
- [x] Tạo API route `/api/ai-gateway` và client bridge cho JSON/SSE.
- [x] Thêm provider GLM 5.2 vào Cài đặt, giữ Gemini làm mặc định.
- [x] Chạy full test, lint, build và kiểm tra diff/secret safety.
- [ ] Owner thêm `AI_GATEWAY_API_KEY` vào Vercel Environment Variables rồi smoke test Production/Preview.

### Review — Vercel AI Gateway GLM 5.2

- [x] Targeted tests: 4 files, 12 tests passed.
- [x] Full Vitest suite: 63 files, 969 tests passed.
- [x] `npm run lint` passed.
- [x] `npm run build` passed; only existing Vite chunk/dynamic-import warnings remain.
- [x] Repository scan found no real gateway secret; only the variable name and test placeholders are present.
- [ ] Live Vercel smoke test pending owner configuration of `AI_GATEWAY_API_KEY`.

Hai việc trong một phiên. Railway trial hết hạn làm chết chức năng đẩy Drive; đồng thời owner
muốn soạn giáo án bằng cách chọn bài thẳng từ phân phối chương trình.

## Lô A — Đẩy giáo án lên Google Drive (xong)

Bỏ hẳn đường qua bot Railway. Trình duyệt xin quyền Drive qua chính Firebase Google login rồi
upload thẳng lên Drive API: không thêm Vercel function, không giữ secret ở đâu.

- [x] `src/lib/googleDrive.ts`: xin access token + các phép Drive REST → verify: build sạch.
- [x] `src/services/pushLessonToDrive.ts` thay `pushLessonToBot.ts`, giữ `/api/export-lesson`.
- [x] Ô "Thư mục đích" trong hộp thoại đẩy; đẩy xong app nhớ thư mục theo cặp chương trình + lớp.
- [x] Cài đặt: mục "Bot API" → mục "Google Drive" với 6 ô thư mục → verify: dán link Drive tự rút ra ID.
- [x] Chặn phiên ẩn danh trước khi mở popup, tránh đổi phiên làm mất dữ liệu người dùng.

## Lô B — Chọn bài theo PPCT (xong)

- [x] `scripts/build-ppct.mjs`: đọc cả hai nguồn, gộp theo **bài** chứ không theo tiết
      → 684 bài TDS (khối 6–12) + 324 bài MOET (khối 10–12).
- [x] `scripts/build-unitplan.mjs`: rút tổng quan học phần I từ 3 file .docx THPT.
- [x] `src/data/ppct/index.ts` + `src/data/unitplan/index.ts`: nạp theo khối, Vite tách chunk riêng.
- [x] `PpctPickerModal`: chọn nguồn → khối → tuần → bài, có ô tìm kiếm.
- [x] Nối vào nhánh "Lấy từ PPCT" sẵn có trong `LessonControls`, điền tên bài + lớp + tuần + yêu cầu.
- [x] Ô tick kèm tổng quan unit plan, mặc định tắt, hiện rõ danh sách chương để giáo viên tự quyết.
- [x] `src/data/ppct/ppct.test.ts`: 26 phép kiểm canh dữ liệu sinh ra.

## Lỗi tự bắt được trong lô B

Phép kiểm "số tiết không lặp" bắt được 12 bài khối 11 cùng mang số tiết **0**: ô số tiết trống bị
`Number('')` biến thành 0. Sửa ở gốc trong `build-ppct.mjs`. Sau khi sửa, số bài khối 11 từ 117
xuống 107 vì các bài trước đó bị cắt vụn nay gộp đúng.

## Quyết định thiết kế, kèm lý do

- **Đơn vị là bài, không phải tiết.** Ô "Yêu cầu cần đạt" trong PDF MOET là ô gộp trải nhiều tiết;
  cắt theo tiết thì 11–17% số hàng đứt giữa câu và trôi sang tiết bên cạnh.
- **Không tự đoán bài nào thuộc unit plan nào.** Đo thử cách khớp theo từ khoá tên chương: chỉ
  trúng 34–53% ở học kỳ I mà khớp nhầm 19–26% bài học kỳ II. Bỏ, để giáo viên tự tick.
- **PPCT chỉ là tư liệu.** Owner chốt ngày 2026-08-11: không được đổi bố cục mẫu giáo án. Yêu cầu
  gửi cho AI có sẵn câu ràng buộc giữ nguyên các mục của mẫu đã chọn.

## Nghiệm thu

- `npm run lint` sạch, `npm test` **724/724** xanh, `npm run build` xong.
- Chạy thật trên dev server: chọn bài MOET lớp 11 → app điền Lớp 11, Tuần 30, dán nguyên văn yêu
  cầu cần đạt. Bật ô unit plan → yêu cầu tăng từ 323 lên 4.584 ký tự, có đủ câu ràng buộc bố cục.
- Dữ liệu tách chunk riêng theo khối, 12–48 KB mỗi khối, không phình bundle chính.

## Còn lại — chỉ owner làm được

1. Google Cloud Console (project Firebase): bật **Google Drive API**, thêm scope
   `https://www.googleapis.com/auth/drive`, thêm mình vào Test users.
2. Đăng nhập bằng Google thật (không phải chế độ demo) rồi thử đẩy một giáo án lên Drive.
3. Unit plan học kỳ II: chờ bản mới. Unit plan THCS (Toán 6–9) là PDF vỡ dấu tiếng Việt khi rút
   chữ, cần bản .docx hoặc chấp nhận thêm bước chuẩn hoá.
4. Chưa commit, chưa push. HANDOFF.md cập nhật khi chốt push.


## Lô C — TDS production pipeline trước batch — 2026-08-19

- [x] Timeline parser chỉ nhận interval P0–P40 trong heading thời lượng/cột Thời gian thực; không nhận period ID P47/P52 hay handoff P52→P53.
- [x] Verifier dùng chung chạy PASS trên P47, P50, P52, P53, P54; report: `qa/reports/gold_locked_after_leak_map_fix.json`.
- [x] Metadata Môn học được giữ theo policy source: P47/P50 dùng giá trị nguồn; P52–P54 giữ `subject_source_value=""` và display fallback `TDS` vì PPCT source field rỗng.
- [x] Manifest `GOLD_LOCKED`, `GOLD_ALLOWLIST`, `NEGATIVE_FAIL_EXAMPLES` có provenance: `qa/reference/tds_reference_corpus.json`.
- [x] Cài production gates fail-closed: source grounding, progression, mathematical core, provenance, percentages, placeholder, repetition, leakage, timeline, metadata, raw LaTeX, malformed math, visual clipping/overlap.
- [x] Tạo cấu trúc `qa/tools`, `qa/reports`, `qa/logs`, `qa/archive`, staging ngoài thư mục bàn giao.
- [x] Regression 10 negative fixtures + 5 GOLD_LOCKED đạt 15/15: `qa/reports/regression_15_cases.json`; chưa chạy batch toàn năm.
- [x] Đối chiếu checksum/visual manifest pilot trước archive; cleanup mới chỉ dry-run, không xóa hoặc move artifact.
- [x] Báo cáo bàn giao hoàn tất và dừng chờ người dùng duyệt trước batch 8–10 tiết.


## Lô D — Batch 01 shadow/staging sau P54 — 2026-08-20

- [x] Chốt scope PPCT liên tiếp P55–P64; P61–P62 là NEEDS_SOURCE vì PPCT/Unit Plan chỉ ghi TC.
- [x] Tạo maps và manifest riêng trong `qa/reference/`; không thêm vào `GOLD_LOCKED`.
- [x] Sinh tối đa 8 DOCX đủ source trong `temp/tds_staging/batch_2026-08-20/`; không ghi vào `giao an manus tao/`.
- [x] Render exact từng DOCX bằng renderer thống nhất; đối chiếu SHA-256 DOCX–visual manifest.
- [x] Chạy verifier generic và batch-level QA; phân loại mọi fail, không sửa DOCX tự động sau QA.
- [x] Promotion chỉ dry-run; synthetic E2E smoke chỉ dùng candidate giả trong `temp/`.
- [x] Chưa promote, chưa move/delete, chưa bàn giao batch vào production; dừng chờ review.

### Review section — Lô D đã hoàn tất, chờ duyệt production

Batch-level QA đạt `true`: 8/8 verifier PASS, visual exact PASS, 8/8 SHA match, 7–8 trang/tiết, production untouched, GOLD_LOCKED unchanged và promotion dry-run PASS trong thư mục tạm. P61–P62 vẫn HOLD với `NEEDS_SOURCE`. Chưa promotion production, chưa move/delete và chưa đưa DOCX vào thư mục bàn giao. Artifact chính: `qa/reports/batch01_handoff_2026-08-20.md` và `qa/reports/batch01_handoff_2026-08-20.json`.


## Lô E — Regen-v3 pilot sau review nội dung Toán — 2026-08-20

- [x] Sửa generator/rule cho P055, P056, P057, P060; không sửa trực tiếp DOCX.
- [x] Regenerate 4 tiết vào staging `temp/tds_staging/batch_2026-08-20_regen4_v3/`.
- [x] Bổ sung và kiểm regression độc lập cho `math_recomputation`, `answer_consistency`, `geometry_completeness`, `semantic_plausibility`.
- [x] Regression 19 case sau patch: 14 negative fixture + 5 GOLD_LOCKED, tất cả PASS.
- [x] Final verifier regen-v3: 4/4 `overall_pass=true`, visual exact PASS, SHA-256 khớp.
- [x] Tạo report bàn giao pilot `qa/reports/batch01_regen4_v3_handoff_2026-08-20.md`.
- [x] Dừng trước Batch 02; không promotion production, không move/delete artifact, không sửa GOLD_LOCKED.
- [ ] Chờ người dùng duyệt regen-v3 pilot trước khi chạy Batch 02.
- [ ] Không tăng quy mô vượt 40–50 tiết/batch trước khi Batch 02 đạt điều kiện 0 lỗi Toán nghiêm trọng.

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
