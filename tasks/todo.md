# Plan — Update generator Ban Toán trong app theo "yêu cầu mới"

> Nguồn yêu cầu: folder `các yêu cầu về Toán cần đạt/` + phiên Codex `01a0745a` (6 lỗi chuyên gia CIS).
> Quyết định user: chuyển hẳn **Must/Should/Could + "Tôi có thể…"** và thêm **bảng MINH CHỨNG HQT/CIS + Danielson 1a–1f**.

## Scope
- CHỈ sửa app `src/` (đường generate + xuất Word school-form).
- KHÔNG đụng 48 DOCX `giao an manus tao/`, PPCT, Drive, không commit/push khi chưa được yêu cầu.
- Làm trên feature branch hiện tại (`feat/toan-final-template`).

## A. Đổi mục tiêu → Must / Should / Could + "Tôi có thể…"
- [ ] `src/prompts/toanFormats.ts` (TOAN_COMMON_FORMAT §2, dòng ~37-44): bảng mục tiêu 3 hàng nhãn `Must (Cơ bản)` / `Should (Trọng tâm)` / `Could (Nâng cao)`; mỗi ô bắt đầu `Tôi có thể…` + thẻ Bloom; giữ ĐÚNG 3 mục tiêu; cập nhật comment hợp đồng (dòng ~8-12).
  - verify: câu "Tôi có thể…" + 3 nhãn Must/Should/Could xuất hiện trong prompt.
- [ ] `src/utils/toanStyleRules.ts` `matchToanObjectiveRowFill` (60-66): nhận `^must/^should/^could` (giữ tương thích cũ `co ban/trong tam/nang cao`). Map màu Must→D9EAD3, Should→FCE5CD, Could→FFF2CC.
  - verify: unit test tô đúng 3 màu cho nhãn mới.
- [ ] `src/lib/toanSchoolForm/parseToanLesson.ts` (dòng ~253): bổ sung `must|should|could` vào regex nhận bảng mục tiêu (nội dung "Must (Cơ bản)" vẫn chứa "cơ bản" nên vẫn parse; thêm để chắc). `mucTieu[].muc` giữ nguyên chuỗi nhãn.

## B. Thêm bảng MINH CHỨNG HQT/CIS + Danielson 1a–1f
- [ ] `src/prompts/toanFormats.ts`: thêm spec khối "MINH CHỨNG HQT / CIS" (đặt sau I. THÔNG TIN CHUNG, trước II. TIẾN TRÌNH) — bảng 3 cột `Minh chứng | HS làm gì → GV thu được gì → mục đích sư phạm | Vị trí` + **6 dòng Danielson 1a–1f**; mở rộng nhãn CIS: `[KIỂM ĐỊNH AI] [TỰ ĐỊNH HƯỚNG] [PHẢN TƯ] [TRẢI NGHIỆM]`.
- [ ] `src/prompts/toanFormats.ts` (TOAN_ADDITIONAL_REQUIREMENTS, dòng ~297): gỡ "Danielson" khỏi câu cấm — GIỮ cấm Dewey/WALT-WILF, CHO PHÉP khung Danielson/CIS mới.
- [ ] `src/lib/toanSchoolForm/cisEvidence.ts`: thêm 4 nhãn + màu (`kiemDinhAi`, `tuDinhHuong`, `phanTu`, `traiNghiem`); giữ 4 nhãn cũ.
- [ ] `src/lib/toanSchoolForm/parseToanLesson.ts`: thêm SECTION `minhChung` (regex `minh\s*chứng|hqt|cis`); parse bảng → `model.minhChung: {nhan,noiDung,viTri}[]`; thêm field vào `ToanLessonModel`.
- [ ] `src/lib/toanSchoolForm/buildSchoolFormDocx.ts`: render bảng MINH CHỨNG (band + table 3 cột) chèn giữa THÔNG TIN CHUNG và TIẾN TRÌNH; tô màu nhãn bằng `detectCisColor`; hàng Danielson in đậm.
- [ ] `src/lib/toanSchoolForm/buildSchoolFormHtml.ts`: mirror bảng MINH CHỨNG cho đường HTML→PDF (giữ đồng bộ 2 đường xuất).
- [ ] `src/utils/toanStyleRules.ts`: thêm banner matcher `minh chung|hqt|cis`.

## C. Nội dung "chán" → cụ thể (prompt-only)
- [ ] `src/prompts/toanFormats.ts` TOAN_ADDITIONAL_REQUIREMENTS: cấm câu mục tiêu/nhiệm vụ khuôn generic ("tạo sản phẩm cốt lõi tối thiểu", "nhiệm vụ chuẩn", "trường hợp mở rộng"…); buộc mọi mục tiêu/bài tập bám nội dung Toán thật của tiết; củng cố luật nguồn SBT/SGK/"GV tự thiết kế"; luật hình theo VAI TRÒ (không định mức mỗi tiết 1 hình, không tái dùng 1 hình cho nhiều bài).

## D. Cập nhật test đang khóa format cũ
- [ ] `src/prompts/toanFormats.test.ts`: đổi assert `| Cơ bản |`→`Must (Cơ bản)`… (30-33); sửa assert cấm-Danielson (175) → còn cấm Dewey/WALT nhưng KHÔNG cấm Danielson; thêm assert có khối MINH CHỨNG + Danielson 1a-1f; giữ assert "2 BỘ CÂU HỎI GỢI Ý PHÂN HÓA" (147).
- [ ] `src/utils/renderWordCore.toan.test.ts` (19-23,61,64): fixture mục tiêu → Must/Should/Could; cập nhật assert màu.
- [ ] `src/lib/toanSchoolForm/parseToanLesson.test.ts` (18-22,70-71): fixture + `mucTieu[0].muc` nhãn mới; thêm test parse bảng MINH CHỨNG.
- [ ] `src/lib/toanSchoolForm/buildSchoolFormDocx.test.ts` (13): fixture nhãn mới; thêm assert render MINH CHỨNG/Danielson.
- [ ] Thêm test cho `matchToanObjectiveRowFill` (must/should/could) và `cisEvidence` (4 nhãn mới).

## E. Verify (bắt buộc trước khi báo done)
- [ ] `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run build` → 0 lỗi TS.
- [ ] `npm --prefix "C:\Users\ADMIN\Downloads\smart-lesson-plan-ai" run test` (hoặc scoped các file toan/schoolForm) → pass.
- [ ] Sinh thử 1 KHDH mẫu (kien_thuc + luyen_tap) → xuất DOCX → mở kiểm: mục tiêu Must/Should/Could, có bảng MINH CHỨNG+Danielson, Polya 2 lộ trình (luyện tập) còn nguyên.

## Ghi chú / giả định
- Giữ NHÃN CIS inline trong tiến trình (bổ sung, không bỏ) — mẫu vàng có cả hai.
- Đường `renderWordCore` generic sẽ render bảng MINH CHỨNG kiểu thường (không style riêng); đường school-form `buildSchoolFormDocx` mới style đầy đủ — chấp nhận, ghi lại limitation.
- Cập nhật `tasks/lessons.md` nếu phát sinh bug/pattern mới.

## Review (hoàn thành 2026-09-19)
- A. Mục tiêu → Must/Should/Could + "Tôi có thể…": `toanFormats.ts` (bảng + comment), `toanStyleRules.ts` (`matchToanObjectiveRowFill` nhận nhãn mới, giữ tương thích cũ), `parseToanLesson.ts` (regex). ✓
- B. Bảng MINH CHỨNG HQT/CIS + Danielson 1a–1f: prompt spec + gỡ "Danielson" khỏi câu cấm (`toanFormats.ts`); +4 nhãn/màu (`cisEvidence.ts`); model field + parse section `minhChung` (`parseToanLesson.ts`); render docx (`buildSchoolFormDocx.ts`) + html (`buildSchoolFormHtml.ts`); banner matcher (`toanStyleRules.ts`). ✓
- C. Chống nội dung khuôn: 3 luật mới trong `TOAN_ADDITIONAL_REQUIREMENTS` (cấm câu generic, nguồn bài tập, hình theo vai trò). ✓
- D. Test: cập nhật `toanFormats.test.ts`, `parseToanLesson.test.ts`, `buildSchoolFormDocx.test.ts`, `renderWordCore.toan.test.ts`, `schoolFormLayout.invariants.test.ts`; thêm `cisEvidence.test.ts` + test `matchToanObjectiveRowFill`. ✓
- E. Verify: `npm run build` PASS (0 lỗi TS); vitest các file toan/schoolForm 112/112 PASS; render DOCX→PDF→PNG mẫu BPT: layout đúng (Must/Should/Could, bảng MINH CHỨNG tô màu nhãn, cột Nội dung đánh số, OMML). ✓
- Giữ nguyên: Polya 2 lộ trình (luyện tập), bảng 3 cột, P0–P40, nhãn câu hỏi, nhãn CIS inline.
- Chưa làm: đường `renderWordCore` generic không style riêng bảng MINH CHỨNG (chỉ school-form style đủ) — chấp nhận theo plan. Chưa commit/push (chờ yêu cầu).

## Bổ sung — Cổng chất lượng NỘI DUNG (2026-09-19)
- Thêm 4 check vào `mathStandards.ts` (vào vòng audit `validateToanLesson`→AI tự sửa):
  - `no-generic-objective` (high) — bắt câu khuôn ("tạo sản phẩm cốt lõi tối thiểu", "nhiệm vụ chuẩn", "trường hợp mở rộng", "cần đa dạng hơn").
  - `cis-evidence-table` (high) — bắt buộc có bảng MINH CHỨNG + đủ 6 dòng Danielson 1a–1f.
  - `exercise-source` (medium, whitelist repair) — bài tập phải ghi nguồn SGK/SBT/GV tự thiết kế.
  - `cdtc-integration` (medium, whitelist repair) — có CDTC hoặc ghi rõ "Không phải tiết trọng tâm" (đổi tên từ global-citizenship để tránh trùng id với generalStandards).
- `toanLessonQuality.ts`: +2 id vào `REPAIRABLE_MEDIUM_IDS` (2 high tự vào theo severity).
- `toanFormats.ts`: thêm luật **VĂN PHONG TỰ NHIÊN NHƯ NGƯỜI SOẠN** (chống văn AI máy móc/sáo rỗng).
- Test: +8 case trong `mathStandards.test.ts`, cập nhật fixture `toanLessonQuality.test.ts`, +1 assert `toanFormats.test.ts`.
- Verify: full suite **1046/1046 pass**; `npm run build` PASS.
