# TODO - 28/10/2026: Batch2 HOÀN THÀNH — 10/10 bài Tuần 11 V8.8 (R1–R7 + Task 9–11 chốt đợt)

Plan: [2026-10-26-week11-batch2-v88.md](../docs/superpowers/plans/2026-10-26-week11-batch2-v88.md) — Gate D duyệt 28/10: `gate-d-12-11-79.md` (thầy chốt 4 đề xuất: S0–S10 = 1-4-2-5-2-1-8-2-7-4-4 phút; 3 BLOCKER sửa số; `category` AI-error "Lỗi đại số"; kind `practice` + timeline key `gateD1279`).

## Pha A (xong 28/10)

- [x] A1 - xác minh PPCT `tds-g12-79` (week 11, periodNo 79, title "Tiết 2: Luyện tập", Thống kê g12).
- [x] A2 - tải giáo án gốc → `tasks/giaoan-goc-12-11-79.md` (Firestore lessonPlans/315100a6-dfab-40ef-9d03-aa13df0d5f78, 31 187 ký tự). Vướng: tab dashboard gốc đã đóng → `tasks/tmp-open-lib-12-79.cjs` (tạo tab mới + click sidebar "Thư viện").
- [x] A3 - soạn `tasks/gate-d-12-11-79.md` — phát hiện 3 BLOCKER số liệu (vinh danh 29,5/84,75/75 + σx 9,21 không khớp chữa chung; PM2.5 45/8,12/15,46 không khớp bảng; Σ = 20980 sai → x = 8 sai) — đã tự kiểm bằng tay.
- [x] A4 - thầy duyệt Gate D 79 g12 (28/10).

## Pha B

- [x] B1 - spec `12-11-79` (kind/lessonType `practice`, formulas×4, examples×2 = chữa chung 13,75/81/9 + PM2.5, exercises×6 = PHT TB/Khá + y=ax+b + ẩn số x=9 + PM2.5 A/B, quick×3 = B/B/C, mistakes×4, boardKnowledge, timelineKey `gateD1279`) + aiError `ai-error-12-11-79` (category "Lỗi đại số", bẫy làm tròn x̄ sớm, proof khuếch đại 2ε·x̄, plain Unicode) + `source.files` thêm `tasks/giaoan-goc-12-11-79.md` → fingerprint `a83ce82df4c7448f19419c37a341a9989e4cbe3c02da4db46ae0c2d96f9e242b` (file hash 79g12 = `ff8ad32e…`).
- [x] B2 - `'12-11-79'` vào `INTERACTIVE_SOURCE_KEYS` (10 mã — ĐỦ LOẠT).
- [x] B3 - entry thứ 7 vào `W11BATCH2` (g12, period 79, title "Các số đặc trưng đo mức độ phân tán").
- [x] B4 - mảng exact-keys 9→10 mã + tên test 9→10; +2 test R7 (timeline `gateD1279` + binding phase 79 g12).
- [x] B1b - `TIMELINE_BY_KEY` thêm `gateD1279` (lessonAdapter.ts).
- [x] B5 - vitest v4: **27 file / 299 PASS** (baseline R6 294, +5); `npm run build` 0 TS error (~1m37s).
- [x] B6 - commit `a5b090d` (11 files) → push feat+main (`c94c12b..a5b090d`, exit 0) → deploy success 2 Vercel → **republish "Tạo và xuất bản 58 bài"**: hàng "Lớp 12 · Tuần 11 · Tiết 79" xuất hiện (`tmp-r7-publish.json`).
- [x] B8 - QA A–F ĐẠT trên Production, phiên `3jpow388uY6B6aCx0EH7`: bands 12/12 khớp Gate D; AI-error chặng 5 ("AI"+"176,7", không lộ proof); route choice thẻ S → PHT Mức TB (taskAppeared); nháp giữ reload + tự rejoin không PIN; exit trống chặn + gửi trọn + "Tiến độ gửi · 1 HS"; think 63 reads, 11 windows decreasing+locked; Sau disabled stage 12; tvButtons=[]; no-spoiler 0/6.
- [x] B9 - append `tasks/qa-w11-batch2-acceptance.md` mục R7 + TỔNG KẾT LOẠT 7/7 (untracked) + báo thầy.

## Task 9–11 (chốt đợt — 28/10)

- [x] Task 9 - QA 2 bài batch1: `10-11-79` (g10, 7W288E, phiên `8DIcKxBIDeFTlyVivIMV`) + `11-11-75` (g11, R6RCFC, phiên `3f6l2fI1RriYA1ZWfnJe`) — A–F ĐẠT + CasioKeyGuide ẨN (bằng chứng dump 0 lần).
- [x] Task 10 - hồi quy bài 12 `12-11-80` (g12, AD4GKT, phiên `2vuuqC9VtmVhVGihSyD6`) — ĐẠT + CasioKeyGuide HIỆN đủ 4 bước (σx = 0,89443 nguyên trạng); g12VarianceNumbers + casioGuide test 17/17.
- [x] Task 11 Step 1/1b - báo cáo 10 mục QA + cổng chốt `expect(W11BATCH2).toHaveLength(7)` — vitest v4 **300/300 PASS**.
- [x] Task 11 Step 2 - chốt: mọi mục ĐẠT, đợt batch2 hoàn thành (0 sự cố).
- [x] Task 11 Step 3 - HANDOFF cuối đợt (10/10 bài V8.8; registry 10 key).
- [x] Task 11 Step 4 - commit + push tài liệu.
- [x] Thầy xác nhận đồng ý chốt đợt (28/10) — batch2 đóng, không còn mục CHỜ.
- [x] Việc 2 - nhãn Tuần 11 · Tiết 75–80 cho 10 bài nguồn trên thư viện (override client, QA 10/10 ✓).
- [x] Việc 1 (phương án B, thầy chọn) - server strip + chấm không ghi điểm: `studentAdaptiveLibraryOpen`/`studentAdaptiveLibrarySubmit` (`gradeLibraryAssessment`); route `/adaptive-library/:libraryLessonId`; auto đăng nhập ẩn danh; QA ĐẠT (mở bài strip + nộp diagnostic scored:false). Lưu ý: quickCheck nhúng Dewey giữ hành vi luồng công khai nguyên trạng.
- [x] Việc 3 - giao 10 bài tự học Tuần 11 cho 3 lớp (g10 2, g11 4, g12 4 — 10/10 → 200; QA portal g12 hiện đúng 4 bài).
- [x] Thầy xác nhận đồng ý kết hợp 2 loại bài (28/10) — đợt đóng.
## 29/10 — 2 chức năng mới (addendum)
- [ ] Hoàn tất QA nhóm xoay tua (đang dở — Edge WS fetch failed, retry).
- [ ] Chức năng 1: Hand Raise + Câu hỏi ẩn danh + Pulse (spec-hand-raise.md) — audit → P0 → test.
- [ ] Chức năng 2: Mobile/Desktop Parity theo 4 bước (spec-parity.md) — áp Math Diagram Standard cho hình.
- [x] Quy tắc kiểm thử mở rộng (test component + TDZ check) đã ghi HANDOFF sau lỗi TDZ participantUid.
- [x] QA live nhóm xoaytua chốt: R1 VERIFIED live (session Dypueu4PNboPdTOqQGon); R2 unit 6/6 PASS (live cần 2 HS — NOT_RUN).
- [x] Fix 2 lỗi tìm thấy khi QA: listener groupProgress 403 chết vĩnh viễn; R2 gắn sai màn hình (TeacherLiveView không render) → tách TvSlowGroups.

## GĐ1 — Bộ đếm token (làm trước: mỗi ngày trễ là mất dữ liệu)
- [ ] `api/_ai-usage.ts`: `recordAiUsage({uid,email,role,classId,ownerTeacherId,feature,model,inputTokens,outputTokens,cachedTokens})`
      → collection `aiUsage` (chỉ máy chủ ghi; rules chặn client). Lỗi ghi KHÔNG làm hỏng lượt chấm.
- [ ] Gắn vào 3 chỗ gọi key chung, lấy số từ `usageMetadata` (Gemini) / `usage` (gateway). Lượt HS nộp → tính cho GV chủ lớp.
- [ ] Test: ghi đúng số token, thiếu usage vẫn không vỡ; rules chặn client đọc/ghi `aiUsage`.

## GĐ2 — Trang quản trị (chỉ congapro60@gmail.com, email Google đã xác minh, kiểm ở MÁY CHỦ)
- [ ] Người dùng: email, vai trò, ngày tạo, lần đăng nhập cuối (Auth listUsers).
- [ ] Lớp theo giáo viên: sĩ số, số bài giao, số bài nộp/đã chấm AI (đọc-only).
- [ ] Token & tiền theo người/lớp/tháng: USD theo bảng giá chính thức (ghi nguồn + ngày), quy VND theo tỷ giá (sửa được, ghi ngày).
      Có cả dòng của chủ dự án. Quá khứ trước GĐ1: dòng "ƯỚC TÍNH" = số bài đã chấm × token TB đo được.
- [ ] Xuất bảng kê (CSV) từng người để thu tiền.
- [ ] Chuẩn bị lớp cho các cô: xem lớp đã có; tạo lớp mới từ danh sách file Drive — BỎ QUA lớp đã tồn tại.

## GĐ3 — Sổ điểm (HS xem, báo cáo PH dùng chung) — kế hoạch chi tiết 2026-09-24
Quyết định: 1 document `scoreBooks/{classId}` (≤ vài chục HS, xa trần 1MB), CHỈ máy chủ đọc/ghi (rules mặc định chặn →
KHÔNG phải phát hành lại firestore.rules). HS đọc qua action `studentScoreBook` (lọc đúng dòng của mình theo studentLinks,
như `studentSubmissions`). BTVN KHÔNG chép vào sổ — lấy thẳng từ bài đã duyệt (một nguồn sự thật).
- [x] `src/lib/classroom/scoreBook.ts` (thuần): kiểu dữ liệu, kiểm điểm HS1 (0–10, ≤2 số lẻ), làm sạch điểm thi,
      `studentScoreView`. BTVN dùng thẳng `officialActivities` (không cần hàm riêng). Test 6.
- [x] `examService.fetchClassExamScores(sheet, roster)`: đọc file điểm 1 lần cho cả lớp, khớp Mã HS.
- [x] `api/_score-book.ts`: `teacherScoreBook`, `saveHs1Column`, `deleteHs1Column`, `saveExamScores`, `studentScoreBook`. Test 5.
- [x] GV: tab "Sổ điểm" trong lớp — đồng bộ MOET/TDS, bảng nhập/sửa/xoá cột điểm hệ số 1.
- [x] HS: mục "Bảng điểm của em" (BTVN, thi định kì MOET, điểm quý TDS, hệ số 1).
- [x] Báo cáo PH (màn hình + PDF) đọc điểm thi + HS1 từ sổ điểm.
- [x] Nghiệm thu: 180 file/2.080 test, lint, lint:api, build; production `a423c72`.

### Review GĐ3 (production 24/09)
- 11Columbus: đồng bộ 26/26 em khớp Mã HS (Khảo sát đầu năm). 12LoTrinh1: 8/8, có Tuấn Nam (3.6) sau chuyển lớp.
- Cột HS1 thử: ô "11" bị tô đỏ + chặn lưu; sửa 9 lưu được, TB đúng; bản phụ huynh hiện MOET + HS1; mở lại cột điền sẵn điểm; xoá cột sạch trên máy chủ.
- 10Olinda: 18/19 — sửa Mã HS tạm `10OLINDA-19` của Bảo Khánh thành GB0120040234 (theo Sheet) rồi đồng bộ lại → 7. Trần Hữu Bảo Nam: ô KSĐN trên Sheet trống.
- CHƯA: cổng học sinh chưa thử bằng phiên HS thật (đăng nhập HS sẽ đá phiên GV) — dựa test API.

## Cần chủ dự án chốt trước GĐ2
- Tính tiền cho ai khi HỌC SINH nộp bài được chấm: giáo viên chủ lớp (đề xuất).
- Tỷ giá: Vietcombank bán ra ngày chốt (đề xuất), sửa tay được.

# Kế hoạch 2026-09-24 (tiếp): khoá AI riêng + trần chi tiêu + hoá đơn tháng
Chủ dự án chốt: nhóm (chủ dự án + Hạnh, Vân, Hồng) dùng thẳng khoá chung; GV khác dùng khoá Gemini riêng, hết/không có
khoá → AI dừng, bài HS nằm chờ + báo khi đăng nhập; bất kỳ lúc nào GV có thể đồng ý dùng khoá chung và bị tính tiền.
Khoá cất vùng chỉ máy chủ. Trần tiền/tháng TUỲ CHỌN với mọi GV (chạm trần → AI dừng, GV nâng trần là chạy tiếp).
Hoá đơn TỰ PHÁT HÀNH ngày 1 (lập khi có người mở lần đầu sau khi hết tháng), xem trong app + tải PDF, kèm minh chứng từng lượt.
- [x] `aiKeyPolicy.ts` (thuần) + test; `_ai-keys.ts`; chọn khoá trong `callGeminiVision`/mô phỏng/cổng GLM; 402 AI_KEY_REQUIRED.
- [x] Bài HS bị chặn → `aiBlocked` giữ trạng thái cũ; bảng kê bỏ lượt khoá riêng (`keySource`).
- [x] Bộ đếm chi tiêu tháng `aiSpend/{uid}_{YYYY-MM}` + trần `monthlyCapVnd` (lý do chặn `cap_reached`).
- [x] ĐỔI MÔ HÌNH (chủ dự án chốt 09-24): trả trước qua ví SePay, trừ dần từng lượt; sao kê tháng thay hoá đơn trả sau
      (đầu kỳ + nạp + điều chỉnh − trừ, minh chứng từng lượt, tỷ giá lưu trên từng lượt); mã giảm giá 10–100%.
- [x] Giao diện GV: tab "Chi phí AI" (ví + QR, mã giảm giá, trần, khoá riêng, đồng ý, chấm lại bài chờ, sao kê + PDF),
      hộp chọn khi bị chặn (tự thử lại), banner khi có bài chờ / ví cạn.
- [x] Quản trị mục 6–10: công tắc + nhóm, tài khoản nhận tiền + webhook, mã giảm giá, ví + điều chỉnh, giao dịch chưa khớp, sao kê.
- [x] Test + lint + build (186 file / 2.121 test).
- [x] QA production 25/09: tab Chi phí AI + Quản trị mục 1–10 chạy; lưu nhóm (Hạnh, Hồng, 3 tài khoản của Vân);
      mã THANG10 100% 25/09–31/10 gán 5 tài khoản; BẬT tính phí; "Chấm cả lớp" của chủ dự án qua cổng bình thường.
- [x] Mục 7 làm lại theo ý chủ dự án: nhiều tài khoản nhận tiền + ảnh QR tự tải, chọn tài khoản đang dùng.
- [x] Sửa: khoá riêng luôn chạy trước kể cả người trong nhóm (trước đây bị bỏ qua → trừ ví oan).
- [ ] Chủ dự án tự làm: thêm tài khoản nhận tiền (mục 7), webhook SePay + biến Vercel `SEPAY_WEBHOOK_KEY` — xong trước 01/11.

# Kế hoạch 2026-09-29: báo cáo PH theo kì (tháng / GK1 / CK1 / GK2 / CK2 / cả năm)
Chủ dự án chốt: chọn tay "từ ngày … đến ngày …" mỗi lần xuất; điểm thi định kì hiện TẤT CẢ cột (không phân kì →
không tính ĐTB môn TT22); nhận xét GV = AI soạn nháp, GV sửa, lưu lại; xuất từng em + cả lớp (ZIP).
- [x] `reportPeriod.ts` (thuần): loại báo cáo, khoảng mặc định (chỉ để điền sẵn), lọc bài giao/bài nộp/HS1 theo khoảng,
      chuỗi điểm theo tháng, so sánh (tháng trước / nửa đầu–nửa sau / HK1–HK2) + test.
- [x] Bản in: tiêu đề + khoảng thời gian, khối so sánh, biểu đồ theo tháng (kì/năm), mục "Nhận xét của giáo viên".
- [x] Máy chủ: `draftParentComment` (AI, tính cho GV chủ lớp) + lưu/đọc nhận xét `parentReportNotes` (chỉ qua API).
- [x] Giao diện từng em (chọn loại + khoảng, AI soạn nháp, sửa, lưu, tải PDF) + xuất cả lớp ZIP ở tab Báo cáo.
- [x] Test + lint + build + QA production.
# Kế hoạch 2026-11-02 — QA P092

MỤC TIÊU: Giáo án Toán 10 tuần 12 tiết 92 đúng PPCT, mục tiêu gọn theo MUST/SHOULD/COULD, Word layout đã kiểm.

- [x] Đối chiếu PPCT, backup và nguồn SBT/SGK.
- [x] Sửa mục tiêu, nội dung lặp, lỗi điều kiện vectơ và cột ghi bảng.
- [x] Render Word 23 trang, xem đủ 23 trang, đối chiếu pixel.
- [x] Promote candidate; xác nhận production hash và lưu báo cáo.

Kết quả: production SHA-256 `3858DEB699AF99245982EC8629C0701AC8C3C16BBFC90425B01B51A2326A3B11`; backup giữ hash cũ. Toàn bộ audit 959 tệp còn dang dở; số tổng cần reconcile từ P076.

# Kế hoạch 2026-11-02 — P078/P079 QA hoàn tất

MỤC TIÊU: P078/P079 ôn đúng nội dung đã học, mục tiêu MUST/SHOULD/COULD rõ và DOCX đã kiểm.

- [x] Chốt PPCT “Tiết tự chọn”; chọn nội dung Toán đã học.
- [x] Sửa mục tiêu, nội dung bảng, phân hóa và đáp án.
- [x] Render Word; xem trực tiếp đủ 10 trang và chạy kiểm cấu trúc, toán.
- [x] Promote V10; xác minh hash production, giữ backup và lưu báo cáo.

Kết quả: P078 SHA-256 F8BEB20566F51491B4D0E32C8A080DCFF7BFD80F81F4448F018376A4F140A0D3; P079 SHA-256 1DFF75CC509A1DB1A835581E2750EA3DF3E26A32284F7E6A3099918993F6F4C6. Word 16.0, mỗi file 5 trang; cấu trúc 23 bảng, timeline P0–P40 liền mạch, không hàng bị tách; 3 mục tiêu/bài khớp cột ghi bảng; phép tính độc lập đạt. Backup V9 và backup nguồn ban đầu còn nguyên. Chi tiết tại qa_artifacts/P078_P079_review_20261102/QA_REPORT.md.

Phạm vi hoàn tất: 2/2 giáo án trong đợt này. Audit toàn bộ 959 TDS và chốt tên 3 giáo án dự án G10 tuần 7 chưa hoàn tất.

# Kế hoạch 2026-09-30: Báo cáo PH — "Điểm mạnh & cần rèn" theo YÊU CẦU CẦN ĐẠT
# Kế hoạch 2026-11-02 — P093 đã QA và promotion

MỤC TIÊU: P093 đúng PPCT, mục tiêu ngắn MUST/SHOULD/COULD và Word production đã kiểm.

- [x] Xác nhận P093 với PPCT, yêu cầu cần đạt và SGK/SBT.
- [x] Sửa nội dung, điều kiện vectơ-không, mục tiêu và ghi bảng.
- [x] Chạy verifier, render Word và soi đủ 6 trang.
- [x] Backup, promote và đối chiếu render production 6/6 trang.
- [x] Ghi nhận WARN: LibreOffice lệch pagination và lỗi glyph vectơ; Word 16.0 là renderer mục tiêu.

Production SHA-256 `780E7C5078BC0229F29B9B2E1FF15E2BA4E03B96C80D4EDC9165406995E347F6`; backup giữ hash cũ. Chi tiết: `qa_artifacts/P093_review_20261102/P093_QA_REPORT_20261102.md`.

Phạm vi kho còn mở: chưa hoàn tất audit 959 giáo án; chưa chốt denominator và ba tên giáo án project G10 tuần 7. Xem `tasks/tds_g10_g12_completion_plan.md`.

# Kế hoạch 2026-11-02 — P094 G10 tuần 12

MỤC TIÊU: P094 bám slot tự chọn PPCT, bài tập riêng có đáp án và DOCX Word đã QA.

- [x] Xác nhận record tds-g10-92, tuần 12, tiết 94.
- [x] Đọc nguồn 47 bảng/201 đoạn; phát hiện hồ sơ lớp giả định, prompt và bài tập trống.
- [x] Chọn nội dung đã học theo quyết định người dùng; giữ tên “Tiết tự chọn”.
- [x] Soạn từ mẫu Ban Toán, dựng candidate và verifier.
- [x] QA toán/OOXML, render Word, xem đủ trang.
- [x] Backup, promote, render production và lưu báo cáo.
Kết quả P094: Word 16.0 render 5 trang, xem 5/5 trang; candidate/production ảnh khớp 5/5. Production SHA-256 A377B083CA7E7A2BE6A110A6CD2AB8E8BE9BBDA7A27536BA18F707175D59863F; backup FA81AF7257950C7044A04D9B30749985CA5693E72DD5DC69C55C1A04C899882C. Báo cáo: qa_artifacts/P094_P095_review_20261102/P094_QA_REPORT_20261102.md.

# Kế hoạch 2026-11-02 — P095 G10 tuần 12

MỤC TIÊU: Giáo án P095 bám SBT, mục tiêu “Em có thể…” ngắn, DOCX đúng mẫu và đã kiểm từng trang.

- [x] Xác minh PPCT, nguồn SBT, backup và mẫu Ban Toán.
- [x] Giải độc lập Ví dụ 6; thiết kế hoạt động riêng cho bài.
- [x] Dựng candidate; verifier toán/OOXML PASS.
- [x] Render Word; sửa ngắt trang HĐ2 và xem đủ 6 trang.
- [x] Promote sau QA; kiểm Word production và lưu hash/báo cáo.

P095 production SHA-256 `EF761239156706D86B1F72198515293E359BAB4BDC78768FD43B07EFD6DB6367`; backup `5DE9191E3950D45C9913B73412CCF14823782CE74D61E38A6714B729AB506366`. Word 16.0: 6 trang, xem 6/6, ảnh production khớp candidate 6/6. Báo cáo: `qa_artifacts/P094_P095_review_20261102/P095_QA_REPORT_20261102.md`.


# Kế hoạch 2026-11-02 — P096/P097 Word QA

MỤC TIÊU: P096 và P097 có nội dung đạt chuẩn, Word layout đã xem đủ trang, production có hash/bằng chứng.

- [x] Kiểm chứng P096 promotion, nội dung, hash và render.
- [x] Xem đủ P096 6 trang; pixel-compare production 6/6.
- [x] Sửa page flow P097 bằng thay đổi duy nhất, giữ nguyên nội dung.
- [x] Promote P097 V5; xem đủ 6 trang và pixel-compare production 6/6.
- [x] Lưu report, backup, logs và cập nhật checkpoint.

Kết quả: P096/P097 batch hoàn tất. Báo cáo: `qa_artifacts/P096_review_20261102/P096_QA_REPORT_20261102.md` và `qa_artifacts/P097_review_20261102/P097_QA_REPORT_20261102.md`. Tổng audit 959 chưa hoàn tất; kế tiếp G10 tuần 13 tiết 98.


# Kế hoạch 2026-11-03 — P099 Word QA

MỤC TIÊU: P099 đúng PPCT, mục tiêu gọn “Em có thể…”, nội dung và layout Word đã kiểm.

- [x] Xác nhận PPCT, Unit Plan, YCCĐ, SGK/SBT.
- [x] Sửa nội dung lặp/lạc bài, giả định lớp, cột ghi bảng.
- [x] Kiểm toán độc lập 8 phép tính; timeline 40 phút; 23 bảng/40 đoạn.
- [x] Render Word 16.0; xem 5/5 trang candidate, đối chiếu production 5/5.
- [x] Backup, promote, xác minh SHA-256 và lưu báo cáo/checkpoint.

Kết quả: production SHA-256 `0D607582EC22F2B80E99DD87E9834C5DCAB834294642DD86580B60F7CD8A0D44`; backup `F6D59ABD66831D7798BF8798038A2707DFBB0BAB63657CE8D83DBFE3747B1809`. Report `qa_artifacts/P099_review_20261103/P099_QA_REPORT_20261103.md`. Audit tổng 959 còn dở, số lịch sử cần reconcile; tiếp theo P100.

# Kế hoạch 2026-11-03 — P100 Word QA

MỤC TIÊU: P100 đúng PPCT, dạy độ dài vectơ từ SGK/SBT, mục tiêu gọn và DOCX Word đạt QA.

- [x] Xác minh PPCT, Unit Plan, YCCĐ, SGK/SBT và lỗi phạm vi nguồn.
- [x] Lưu backup nguồn SHA-256 `734A295447FC1BE68F458F248F6B13D5BEE5C31E3B430DDA4A66E0F3C5456B43`.
- [x] Dựng candidate theo mẫu Ban Toán, đúng tên PPCT và ba mục tiêu “Em có thể…”.
- [x] Kiểm toán 13 phép tính/OOXML; 23 bảng, 40 đoạn, ZIP hợp lệ.
- [x] Render 5 trang ở 160 dpi; xem đủ 5/5, production khớp 5/5.
- [x] Word 16.0 mở candidate/production, phân trang 5 trang; export PDF bị treo.
- [x] Promote theo tên PPCT; lưu backup, hash và báo cáo QA.

Kết quả: P100 production SHA-256 `5E2649578B39E0F0D45896793CCFF35B7404565AC4C222112D43E150A8CE0EBA`; nguồn/backup/archive SHA-256 `734A295447FC1BE68F458F248F6B13D5BEE5C31E3B430DDA4A66E0F3C5456B43`. LibreOffice visual render 5/5 pages; Word 16.0 pagination 5 pages, PDF export hung. Report: `qa_artifacts/P100_review_20261103/P100_QA_REPORT_20261103.md`.

Audit sâu 959 tệp và reconcile bộ đếm lịch sử vẫn đang mở. Ba tên project G10 tuần 7 đã PASS checker; xem `qa_artifacts/g10_w07_project_titles_qa_20261031.md`. Kế tiếp theo PPCT là G10 tuần 13, tiết 101.

# Kế hoạch 2026-11-03 — P102 Word QA

MỤC TIÊU: Giáo án G10 tuần 13 tiết 102 bám PPCT, chọn nội dung đã học, mục tiêu gọn và Word đã kiểm.

- [x] Xác nhận PPCT: tiết tự chọn, tuần 13, tiết 102.
- [x] Chốt chuẩn mục tiêu “Em có thể…” theo MUST/SHOULD/COULD.
- [x] Dựng candidate từ mẫu P79, rà nội dung và phép tính.
- [x] Render Word, xem đủ trang, đối chiếu production.
- [x] Promote sau QA, lưu backup/hash/báo cáo, cập nhật kiểm kê.

Kết quả: Word 16.0 candidate/production 5 trang; xem 5/5, pixel SHA khớp 5/5. Verifier PASS: 23 bảng, 40 đoạn, 13 phép tính, 40 phút, 3 mục tiêu “Em có thể…”. Production SHA-256 `53B60634FF32BC2E2AF5EDB2DD07085D2AB35EDF7E18538AF480ED6A6AF3F8C8`; backup `961F5305C575D978B9CF8FD8B0600B5DCEC73B7EDA2733DC89726131C7935F05`. Report: `qa_artifacts/P102_review_20261103/P102_QA_REPORT_20261103.md`.

# Kế hoạch 2026-11-03 — tiếp tục QA P034 và audit TDS

MỤC TIÊU: P034 khớp PPCT, đủ bằng chứng QA; tiếp tục audit sâu 959 giáo án.

- [x] Xác minh PPCT và backup P034.
- [x] Sửa tên, mục tiêu, ngắt trang HĐ1.
- [x] Kiểm 16 phép tính, 40 phút, OOXML.
- [x] Render LibreOffice, xem đủ candidate 5/5 trang.
- [x] Promote tên canonical, giữ file cũ và backup.
- [x] Render production, đối chiếu ảnh 5/5.
- [~] Word PDF export treo; chưa có đối chiếu render Word.
- [~] Reconcile tiến độ; audit sâu 959 file còn dở.

P034 production SHA-256 `BF1B5C9A0D665BD3EE165D80690026206906E791CFDAB7C56AFB323C5F535FBC`; backup SHA-256 `B13132729E2A9F672B72C85B9B6261ABC0555977FCF5ADD58C1EB9CD4696B0B4`. Report: `qa_artifacts/P034_review_20261103/P034_QA_REPORT_20261103.md`.

# Kế hoạch 2026-11-03 — P103 G10 tuần 13

MỤC TIÊU: Giáo án P103 dùng bài toán đã học, giữ tên PPCT, có mục tiêu “Em có thể…” và DOCX đã QA.

- [x] Xác nhận PPCT `tds-g10-101`, tuần 13, tiết 103; giữ “Tiết tự chọn”.
- [x] Người dùng chọn nội dung đã học; dùng mô hình hệ bất phương trình từ SBT.
- [x] Đối chiếu bài toán xưởng may với SBT tr. 59; dựng candidate theo mẫu P79.
- [x] Kiểm độc lập phép tính, mục tiêu và cột ghi bảng; bỏ ghi chú rút kinh nghiệm khỏi bảng.
- [x] Render Word 16; xem đủ 5 trang; đối chiếu ảnh candidate/production 5/5.
- [x] Giữ backup nguồn, promote candidate, xác minh hash và lưu báo cáo.

Kết quả: Production SHA-256 `D8B6A5510A5154189290920C409DC5E434A0E8FD73064CCA245B3232AD1CB8C5`; backup `7ECE94D354390F392EEFA62C21E82EB43E9CE66C773ECCACAA1C7C8D9FFE5561`. Word 16 render 5 trang, đã xem 5/5; candidate/production pixel SHA khớp 5/5. Verifier `qa_artifacts/P103_review_20261103/verify_p103_final.py`; report `qa_artifacts/P103_review_20261103/P103_QA_REPORT_20261103.md`.

Tổng audit sâu 959 giáo án vẫn mở; lịch sử P076–P103 chưa reconcile.

# Kế hoạch 2026-11-03 — P104 G10 tuần 14

MỤC TIÊU: P104 đúng nội dung tiết “Luyện tập 2”, mục tiêu gọn và DOCX đã kiểm đủ trang.

- [x] Đối chiếu PPCT, Unit Plan, SGK/SBT.
- [x] Soạn lại mục tiêu MUST/SHOULD/COULD; sửa verifier.
- [x] Kiểm nội dung, 11 phép tính, cấu trúc OOXML.
- [x] Render Word 16; xem candidate 5/5 và so ảnh production 5/5.
- [x] Sao lưu nguồn, promote tên PPCT, xác minh hash và lưu báo cáo.

Kết quả: PASS. Production/candidate SHA-256 `F3C6682BE34A4BEAA919794FE63B71987DC7D360404A60D23463415C355AF0E9`; backup nguồn `AF9AFD098883AA72268A91DC089C13CB75418A87441B40BCB5F2D2526A21847D`. Verifier `qa_artifacts/P104_review_20261103/verify_p104_final.py`; report `qa_artifacts/P104_review_20261103/P104_QA_REPORT_20261103.md`. Word 16: candidate 5 trang, production 5 trang, ảnh khớp 5/5.

Tổng audit sâu 959 giáo án và reconcile P076–P103 vẫn mở; P104 chưa được cộng vào tổng reconcile.

# Kế hoạch 2026-11-03 — P105 QA và audit TDS

MỤC TIÊU: P105 đúng PPCT, mục tiêu ngắn “Em có thể…”, không lỗi glyph, có bằng chứng Word và LibreOffice.

- [x] Đối chiếu PPCT, Unit Plan, YCCĐ, SGK/SBT.
- [x] Sửa ký hiệu chồng trong cột ghi bảng; giữ nội dung đúng bài.
- [x] Kiểm độc lập 9 phép tính, timeline 40 phút, 23 bảng/40 đoạn, OOXML.
- [x] Render candidate/production Word 16 và LibreOffice; xem 10/10 trang production/candidate.
- [x] Sao lưu nguồn, promote canonical filename, đối chiếu hash 10/10.
- [x] Lưu report, verifier và checkpoint.
- [~] Tiếp tục audit nội dung/layout từng tệp; reconcile lịch sử trước khi chốt tổng 959.

P105 production/candidate SHA-256 `704219B0A206FC61A6582EA0CDD77357ECC7A708CDD12E35E2EAC58345E56B31`; backup `3A53D9DEDF59D7B5456E13FE51923F77D57E7DF59063C3FDB36275FF86005F1F`. Report `qa_artifacts/P105_review_20261103/P105_QA_REPORT_20261103.md`; verifier `qa_artifacts/P105_review_20261103/P105_final_verification.json`. Tổng audit 959 chưa hoàn tất; kế tiếp P106.

# Kế hoạch 2026-11-03 — P106 QA và sửa

MỤC TIÊU: P106 đúng PPCT, nội dung sâu theo bài, mục tiêu “Em có thể…”, DOCX Word kiểm đủ trang.

- [x] Đối chiếu PPCT, Unit Plan, YCCĐ, SGK/SBT.
- [x] Thay nội dung lạc đề/giả định; viết lại mục tiêu và cột ghi bảng.
- [x] Kiểm 10 phép tính verifier, timeline 40 phút, 23 bảng/40 đoạn, OOXML.
- [x] Render Word 16; xem đủ 5 trang candidate/production, ảnh khớp 5/5.
- [x] Backup, promote tên theo PPCT, xác minh hash và lưu report/log.
- [~] Tiếp tục audit từng giáo án; reconcile tiến độ toàn bộ 959.

P106 production/candidate SHA-256 `2D6CEF0710AC8D25D1A104E8B38D9BA2B7085197474DA24907C0F0D658C4C866`; backup nguồn `9FDAE3A4DBBD1A7F0C96E57BCCA92C04C13B3117797FD1EA8F800EDE915C5D1A`. Report `qa_artifacts/P106_review_20261103/P106_QA_REPORT_20261103.md`; verifier `qa_artifacts/P106_review_20261103/verify_p106_final.py`; kết quả `qa_artifacts/P106_review_20261103/P106_final_verification.json`. Tổng audit 959 vẫn mở; P106 là 1 tệp đã audit, không đại diện PASS toàn bộ.

# Kế hoạch 2026-11-03 — P107 QA, sửa và promotion

MỤC TIÊU: P107 đúng PPCT, mục tiêu “Em có thể…”, không trang trắng và Word đã đối chiếu đủ trang.

- [x] Đối chiếu PPCT, Unit Plan, YCCĐ, SGK/SBT.
- [x] Kiểm 16 phép tính, 40 phút, 23 bảng/40 đoạn, OOXML.
- [x] Bỏ ngắt trang gây trang trắng; Word xem đủ candidate 5/5 trang.
- [x] Backup, promote canonical filename, render production và đối chiếu pixel 5/5.
- [x] Lưu báo cáo, verifier, hash và checkpoint.
- [~] Tiếp tục soạn/QA theo PPCT; reconcile audit sâu toàn bộ 959.

P107 production/candidate SHA-256 `8E475B0576B14AB36B4978D1E9688E3F84A710C588FC1A04FC2FDF7DFDED7E18`; backup trước promotion `245BFA8B33451C34F7FC5AC52C848A6AE40447B830DF33E02A80F64296B6D936`. Report `qa_artifacts/P107_review_20261103/P107_QA_REPORT_20261103.md`; verifier `qa_artifacts/P107_review_20261103/verify_p107_final.py`; kết quả `qa_artifacts/P107_review_20261103/P107_final_verification.json`. Word 16 candidate/production 5 trang; đã xem candidate 5/5; pixel SHA khớp 5/5. Toàn bộ 959 chưa hoàn tất; P107 là 1 tệp, không đại diện PASS toàn kho.

Quyết định đã chốt cho P078–P079: tự chọn nội dung đã học; giữ tên tiết theo PPCT.
G10 tuần 7, tên 3 project P052–P054: checker chạy lại PASS; nội dung/layout riêng các file P052/P053 vẫn cần hoàn thiện QA.

# Kế hoạch 2026-11-03 — P108 QA hoàn tất

MỤC TIÊU: P108 đúng PPCT, mục tiêu “Em có thể…”, nội dung riêng bài và Word 16 đối chiếu đủ trang.

- [x] Đối chiếu PPCT, Unit Plan, YCCĐ, SGK/SBT tr. 220–222.
- [x] Viết lại từ mẫu Ban Toán; mục tiêu MUST/SHOULD/COULD gọn.
- [x] Kiểm 11 phép tính/đẳng thức, 40 phút, OOXML.
- [x] Word 16: candidate 5/5, production 5/5; pixel hash khớp 5/5.
- [x] Lưu backup, promote canonical filename, xác minh SHA-256.
- [x] Ghi report, verifier và bằng chứng.
- [~] Tiếp tục QA từng giáo án; audit sâu toàn kho 959 chưa kết thúc, tổng lịch sử chưa reconcile.

P108 production SHA-256 `867ACE0C4BC4FA02B98C902A9CE07F28201183C266361FC5C1DAC4171E7F45A8`; backup `CE6094B006E5CCF7987BD963474C129234BA58EEA277C516B88791ABA594114F`. Report `qa_artifacts/P108_review_20261103/P108_QA_REPORT_20261103.md`; verifier `qa_artifacts/P108_review_20261103/verify_p108_final.py`; kết quả `qa_artifacts/P108_review_20261103/P108_final_verification.json`. Kế tiếp P109.

# Kế hoạch 2026-11-03 — P109 QA hoàn tất

MỤC TIÊU: P109 đúng PPCT; mục tiêu ngắn; hàng cuối bảng BTVN có lề; Word 16 đã soi đủ trang.

- [x] Đối chiếu PPCT, Unit Plan, YCCĐ, SGK/SBT.
- [x] Rút gọn ba mục tiêu MUST/SHOULD/COULD; sửa lề hàng cuối bảng.
- [x] Kiểm 9 phép tính, timeline 40 phút, 23 bảng/40 đoạn và OOXML.
- [x] Word 16: candidate/production 5 trang; xem 10/10; hash ảnh khớp 5/5.
- [x] Lưu backup, bản production trước chỉnh, archive nguồn cũ, verifier và report.
- [~] Audit sâu toàn kho 959 chưa kết thúc; tiếp tục P110.

P109 production SHA-256 `DDB71627E002013034E13BA68041B640B458401325FBF73B51C207854727911F`; backup/archive nguồn `A33F758D2B6F0157905489877BAC0083A5F7C5F23E255FA6DE495B883221231D`. Report `qa_artifacts/P109_review_20261103/P109_QA_REPORT_20261103.md`; verifier `qa_artifacts/P109_review_20261103/verify_p109_final.py`; result `qa_artifacts/P109_review_20261103/P109_final_verification.json`. P109 là một tệp đã audit sâu, không đại diện PASS toàn kho.


# Kế hoạch 2026-11-03 — Tiếp tục audit TDS từ P110

MỤC TIÊU: P110–P112 có hồ sơ QA Word; tiến độ audit sâu 959 được ghi trung thực.

- [x] Sửa, promote và verify lại P110 sau lỗi vectơ AO.
- [x] Verify lại P111: 20 phép tính, 5/5 trang, hash production khớp.
- [x] Sửa, promote và verify P112; Word 16 xem đủ 5/5 trang.
- [~] Đối soát hồ sơ P076 trở đi; không cộng trùng vào 959.
- [x] Chạy lại checker tên project G10 tuần 7; tên PASS.
- [~] QA nội dung/layout riêng P052/P053; chưa sign-off.

P112 production SHA-256 `D955978A99C35A01E474BBE3265501E3514C6653BD70D3657E8D60678AE279CC`; backup `58AB980D402CD7B8655604C38B4211753550FE9A9514BB2F8AC3FD6FF1F9A6EE`. Report `qa_artifacts/P112_review_20261103/P112_QA_REPORT_20261103.md`; verifier `qa_artifacts/P112_review_20261103/verify_p112_final.py`; result `qa_artifacts/P112_review_20261103/P112_final_verification.json`.

## 2026-11-03 — P113 QA hoàn tất

- [x] Đối chiếu PPCT, Unit Plan, YCCĐ, SGK/SBT; render và review nguồn 18 trang.
- [x] Viết lại mục tiêu MUST/SHOULD/COULD ngắn; từng câu mở đầu “Em có thể…”.
- [x] Sửa trang trắng BTVN và header tiếp nối HĐ1; kiểm 10 phép toán, 40 phút, OOXML.
- [x] Word 16: candidate/production 5 trang; xem candidate 5/5, ảnh production khớp 5/5.
- [x] Backup, promote tên PPCT, xác minh hash; lưu verifier và report.
- [~] Audit sâu toàn bộ 959 chưa hoàn tất; không cộng P113 vào tổng cho tới khi reconcile lịch sử từ P076.

P113 production/candidate SHA-256 `AF6AD6D4D8FF3212C19A72048FB107D80F8C97C86A3318C8FB5E89AD28DE049F`; backup `F637DA4CF7F0D5DECB2C4925800868A28F00E5A157AA055B5D97BDFAF0400B63`. Report `qa_artifacts/P113_review_20261103/P113_QA_REPORT_20261103.md`; verifier `qa_artifacts/P113_review_20261103/verify_p113_final.py`; result `qa_artifacts/P113_review_20261103/P113_final_verification.json`. Tiếp theo P114.

# Kế hoạch 2026-11-03 — P114 QA và sửa

MỤC TIÊU: P114 đúng PPCT, mục tiêu “Em có thể…”, bảng rõ khi qua trang và DOCX Word đã kiểm đủ.

- [x] Đối chiếu PPCT, Unit Plan, YCCĐ, SGK/SBT; kiểm candidate và nguồn.
- [x] Render Word 16; soi đủ 5 trang; xác nhận lỗi đậm toàn câu.
- [x] Khôi phục đậm nhãn, lặp tiêu đề bảng HĐ1 ở trang nối; dựng lại candidate.
- [x] Render lại; soi 5/5 trang; kiểm hình thức, nội dung, toán và OOXML.
- [x] Backup, promote; xác minh production hash.
- [x] Lưu report, verifier, log và bằng chứng P114.
- [~] Tiếp tục audit từng file; reconcile tổng lũy kế 959.

P114 production/candidate SHA-256 `408B6AA5138C181A55FBB9567C190984375178AFDBBF348E8CFE9FD10EEA921E`; backup nguồn trước sửa `4FAC9D28488E38D4CFBC829F8DA6469B3F8B4A0380423D53A826E02460845768`. QA report `qa_artifacts/P114_review_20261103/P114_QA_REPORT_20261103.md`; verifier `qa_artifacts/P114_review_20261103/verify_p114_final.py`; kết quả `qa_artifacts/P114_review_20261103/P114_final_verification.json`. Word 16: candidate/production 5 trang, 5/5 trang đã soi, ảnh pixel khớp 5/5; 13/13 phép kiểm Toán, 40 phút, OOXML PASS. P114 là một tệp đã audit sâu; tổng audit 959 chưa hoàn thành/reconcile. Quyết định tiết tự chọn G10 tuần 10 được ghi trong `qa_artifacts/P078_P079_review_20261102/QA_REPORT.md`; tiếp theo P115.

## 2026-11-03/04 — P116 Toán 10, tuần 15, tiết 116

MỤC TIÊU: Sửa P116 đúng PPCT, ôn riêng Chương I–II, QA đủ nội dung và Word.

- [x] Kiểm nguồn P116, chốt hash và lỗi.
- [x] Đối chiếu PPCT, Unit Plan, YCCĐ, SGK/SBT.
- [x] Dựng candidate theo mẫu Ban Toán; mục tiêu MUST/SHOULD/COULD “Em có thể…”.
- [x] Kiểm phép tập hợp, 4 đỉnh/lợi nhuận, cấu trúc DOCX và timeline 40 phút.
- [x] Word 16: candidate 5/5 trang, production 5/5; xem đủ và ảnh khớp 5/5.
- [x] Backup, promote, xác minh hash, lưu report và verifier.

Candidate/production SHA-256 975A6D78C9CD23F3D75C5D7C0057EB6F99AC668EFB243D848C4876BDC336B0B6; backup 811AF922350C47BB2C8E3DEB44D6EB0F5D81ABFE94E396134C1E5FA04FF31B8D. Report qa_artifacts/P116_review_20261103/P116_QA_REPORT_20261104.md; final verifier qa_artifacts/P116_review_20261103/verify_p116_final.py; result qa_artifacts/P116_review_20261103/P116_final_verification.json. P116 là một file QA sâu; audit/reconcile toàn kho 959 vẫn chưa xong.

# Kế hoạch 2026-11-04 — P117 Toán 10 tuần 15

MỤC TIÊU: P117 đúng PPCT, mục tiêu “Em có thể…”, dữ kiện và cột ghi bảng khớp nhau, DOCX đã QA.

- [x] Chốt slot `tds-g10-115`, tuần 15, tiết 117; tên “Ôn tập cuối HK1”.
- [x] Backup nguồn; đối chiếu SBT tr. 134, 229; kiểm 19 trang nguồn.
- [x] Sửa câu kiểm tra nhanh thiếu tọa độ; đồng bộ dữ kiện và đáp án bảng.
- [x] Word 16 render candidate 5 trang; soi đủ 5/5 trang.
- [x] Promote; Word 16 render production; pixel hash khớp 5/5.
- [x] Lưu verifier, kết quả, log sửa và report.
- [~] Tiếp tục audit từng giáo án từ P118; đối soát lũy kế trước khi chốt 959.

P117 candidate/production SHA-256 `D9A4F78AB9CFC5207AE53DB3FFB1B4C9DB0C42D5EEF5969094F2F7ABA30D9496`; backup ngay trước sửa `9CB25BE8B66CB55515DE821C99D35E6C0EBE0103FA1DB799D88BCD92D7FC321F`; backup nguồn đầu tiên `A82A3A1CB9BEB833CD76A5671816BD241978EFDB6F3E423982BB137C00A3DCF2`. Report `qa_artifacts/P117_review_20261104/P117_QA_REPORT_20261104.md`; verifier `qa_artifacts/P117_review_20261104/verify_p117_final.py`; kết quả `qa_artifacts/P117_review_20261104/P117_final_verification.json`. P117 là 1 hồ sơ audit sâu; audit toàn kho 959 chưa hoàn tất/đối soát.

# Checkpoint 2026-11-04 — G10 projects + TDS deep audit

MỤC TIÊU: chốt 3 giáo án dự án G10 tuần 7, audit DOCX TDS theo từng file, sửa lỗi có bằng chứng.

- [x] P118 QA Word, promote, verifier PASS.
- [~] P52–P54: production nguyên trạng; mạch nội dung đang chờ lựa chọn; source map/spec mâu thuẫn.
- [~] P119 G10 tuần 15: bắt đầu audit sâu độc lập.
- [ ] Cập nhật lũy kế 959; không tính structural audit là deep QA.
- [ ] Báo cáo kết quả, lỗi/sửa, hash, render/log/verifier và việc còn chờ.

Bằng chứng gần nhất: `qa_artifacts/P118_review_20261104/P118_QA_REPORT_20261104.md`.
P52–P54 candidate cũ chỉ staging; không promote khi chưa chọn mạch. Render Word 16 cho candidate cũ: P52 24 trang, P53 23, P54 24.

## P119 — QA hoàn tất, toàn kho tiếp tục

- [x] Đối chiếu PPCT `tds-g10-117`, tuần 15, tiết 119 và SGK bài 4.23 tr. 70.
- [x] Sửa mục tiêu M/S/C ngắn, đều mở đầu “Em có thể…” và tăng dần.
- [x] Kiểm phép tính, biến thể, timeline 40 phút, 23 bảng/39 đoạn/OMML.
- [x] Word 16: candidate 5 trang, soi đủ 5/5; production 5 trang, ảnh trùng 5/5.
- [x] Backup, promote, xác minh SHA-256; report, verifier, JSON và log đã lưu.
- [~] Tiếp tục P052–P054 theo khuyến nghị đã quá hạn; audit sâu 959 chưa hoàn tất/đối soát.

P119 production SHA-256 `9913A60845CBF8D603FE651CC87DCD12514352C554A670C6EBAC8C8AD38DD4C9`; backup `C7B4FD058B10F3A0B212A0EAE5029FE07C0570E5224DB7E6C8DC51D53EE97743`. Report `qa_artifacts/P119_review_20261104/P119_QA_REPORT_20261104.md`; verifier `qa_artifacts/P119_review_20261104/verify_p119_final.py`; result `qa_artifacts/P119_review_20261104/P119_final_verification.json`.

## P120 — QA sâu hoàn tất (2026-11-04)

MỤC TIÊU: P120 đúng PPCT, mục tiêu “Em có thể…”, nội dung toán và DOCX đã kiểm đủ.

- [x] Đối chiếu slot `tds-g10-118`, tuần 16, tiết 120; chốt phạm vi Chương I.
- [x] Kiểm MUST/SHOULD/COULD: 3/3 câu ngắn mở đầu “Em có thể…”.
- [x] Kiểm nội dung, timeline 40 phút, 22 bảng, 40 đoạn, 17 công thức OMML.
- [x] Sửa cột thời gian HĐ2; `P17–P24` và `P24–P31` nằm một dòng.
- [x] Gắn tiêu đề HĐ2 với bảng kế tiếp; backup v7, promote candidate v12, xác minh SHA-256.
- [x] Word 16: candidate/production 5 trang; xem đủ 5/5, ảnh khớp 5/5.
- [x] Lưu report, verifier, JSON, render logs và backup.
- [~] Audit sâu 959 tệp chưa hoàn tất/đối soát; P052–P054 chưa sign-off.

Candidate/production SHA-256 `79DFCCF609FFD728DC75A8D9D5EEBB19AD7B9B8F9211E4655937F2CF5D694FFC`; backup ngay trước promotion cuối `6E58F1947E7F8F770E0C9582D7D6A27F6CC05D6507DEAB3C96B4CE204EC0B73F`; backup nguồn `B9F22E01F30754BDBB79F891CFCE47DCC37E7EDAA14B45CE3851B56D040CBB75`. Report `qa_artifacts/P120_review_20261104/P120_QA_REPORT_20261104.md`; verifier `qa_artifacts/P120_review_20261104/verify_p120_final.py`; result `qa_artifacts/P120_review_20261104/P120_final_verification.json`.

P120 là 1 file audit sâu; không xác nhận toàn kho. Tiếp theo: P052–P054, rồi P121 và đối soát 959.

# Kế hoạch 2026-11-04 — 959 DOCX TDS + projects G10 tuần 7

MỤC TIÊU: Chốt 3 tên dự án, audit nội dung và Word cho đủ 959 DOCX canonical, sửa lỗi đã xác nhận và lập báo cáo bằng chứng.

- [x] Chốt tên dự án P052–P054; chọn nội dung đã học cho P078–P079.
- [x] Kiểm kê 959 canonical + 1 file không số tiết + 2 CIS; lập SHA-256 baseline.
- [~] Sửa candidate P052–P054 và P121; QA theo mẫu Ban Toán, MUST/SHOULD/COULD “Em có thể…”.
- [~] Audit từng file theo batch: P118–P120 PASS; P121 FAIL; P122–P127 đang review độc lập.
- [ ] QA candidate bằng render_docx.py, soi mọi trang; sửa lỗi thật, backup và promote sau PASS.
- [ ] Đối soát đủ 959, ghi số lỗi/file sửa/hash/log, báo cáo 4/4.

Checkpoint: `qa_artifacts/tds_deep_audit_checkpoint_20261104.md`. Inventory/hash: `qa_artifacts/tds_inventory_20261104.json`, `qa_artifacts/tds_inventory_20261104_sha256.json`.

- Inventory note: 959 canonical files = 956 distinct named slots; P052–P054 each have separate elective and _project DOCX, both audited independently. qa_artifacts/tds_inventory_slot_duplicates_20261104.json.

TDS ledger snapshot (2026-11-04): 959 canonical records: 3 PASS (P118–P120), 1 source FAIL (P121), 3 repair-in-progress (P052–P054), 6 audit-in-progress (P122–P127), 946 not-started in this new ledger. Historical reports remain unreconciled and are not added to this snapshot. Ledger: `qa_artifacts/tds_deep_audit_ledger_20261104.json`; SHA-256 `D8FD6A45859943E3004C36036D6252B0748A702CD4E6BBBE3B2B4832710D30EA`.

## 2026-11-04 — Reconciled historical DOCX QA

MỤC TIÊU: Audit đủ 959 DOCX, sửa lỗi đã xác nhận, chốt ba project G10 tuần 7 và lưu bằng chứng.

- [x] Baseline 959 DOCX, inventory SHA-256 đối chiếu.
- [x] Reconcile P078–P079: 2 PASS; nội dung ôn phần đã học theo xác nhận người dùng.
- [x] Reconcile P092–P099, P101–P117: thêm 25 PASS; report hash khớp baseline và ghi render/soi đủ trang.
- [x] P034/P100: nguồn khớp baseline; mọi trang render LibreOffice đã xem, Word 16 mở và báo đúng số trang; cảnh báo Word PDF export treo được ghi rõ.
- [~] P087/P121: lỗi xác nhận chưa khép; P087 thiếu căn cứ chủ đề, P121 candidate đang sửa.
- [~] P052–P054: candidate-only; mạch 180.000 → B(6)=780.000 → ngưỡng 1.000.000 cần render/review chéo.
- [~] P122–P133: 12 tệp đã render; đang chờ soi từng trang và report, chưa tính PASS.
- [ ] Còn 910 file chưa bắt đầu; tiếp tục theo batch, không nhận report lịch sử nếu hash không khớp.

Ledger: qa_artifacts/tds_deep_audit_ledger_20261104.json; SHA-256 hiện tại 476FC8CCEBDB40B871AB1098A5FFBD8D519C603DFAA035C0CF3EE4A5D71DB41B. Checkpoint chi tiết: qa_artifacts/tds_deep_audit_checkpoint_20261104.md.
## 2026-11-04 — Current reconciliation snapshot

- Ledger: 32 PASS, 2 FAIL, 3 repair-in-progress, 12 audit-in-progress, 910 not started; 927/959 not yet PASS.
- P034/P100 counted PASS with explicit Word PDF export warning; no Word-export visual claim.
- Current ledger SHA-256: 476FC8CCEBDB40B871AB1098A5FFBD8D519C603DFAA035C0CF3EE4A5D71DB41B.
## P121 guided v6 — verified promotion 2026-11-04T11:50:32.579836+07:00

- [x] P121 rebuilt from mathematical/learning analysis; candidate main 6/6 and appendix 2/2 Word 16 pages individually inspected.
- [x] Backup and promotion verified; production main 6/6 image hashes match candidate. Independent verifier checks 3,721 rational points, boundary cases, timeline and OOXML.
- [x] Source SHA-256 D237C642C48CA13CB0FB361839F9BD277B6C58C255F3E8C6FFDC63764E308084; production 8E21F58CC346E3C6B7AD03E20C75384A7417104192657653DEBA0A42E1560F47.
- [~] Projects P052–P054 need final layout correction (board header and Word table width), full re-render before promotion. P122 next; P116 unchanged.
- [ ] Reconcile and finish remaining canonical files. PROGRESS global remains 2/4; not a 959 PASS claim.

Current ledger: {'not_started': 910, 'pass': 33, 'fail_repair_in_progress': 3, 'fail': 1, 'in_progress': 12}; 926/959 not yet PASS. Ledger SHA-256 D1EF53151528CF3CF8A454ABB078CDC11794F57AD9E289C63FCA3164B358840C; prior snapshot backup `tds_ledger_before_P121_guided_v6.json` SHA-256 476FC8CCEBDB40B871AB1098A5FFBD8D519C603DFAA035C0CF3EE4A5D71DB41B. Report: qa_artifacts/P121_review_20261104/P121_guided_QA_REPORT_20261104.md.

## Project P052–P054 — verified promotion 2026-11-04T12:11:38.194593+07:00

- [x] Giữ ba identity `_project`; PPCT elective được giữ nguyên, hash 3/3 không đổi.
- [x] Ba candidate Word 16: xem riêng 15/15 trang; production hash ảnh khớp 15/15; verifier PRODUCTION_PASS.
- [x] Backup, diff, hash và report tại `qa_artifacts/g10_w07_project_final_review_20261104/PROJECT_QA_REPORT_20261104.md`.
- [~] Tiếp QA sâu P122; không làm lại P116.
- [ ] Hoàn tất và reconcile 959. PROGRESS toàn mục tiêu 2/4.

Ledger hiện tại: {'not_started': 910, 'pass': 36, 'fail': 1, 'in_progress': 12}; chưa PASS 923/959. SHA-256 `6755E3DF3A41D9827DA65FBA8D74BF0291BCA22662D11BB21760345B9D6FB211`. Backup ledger trước sửa: `tds_ledger_before_project_final_20261104.json`.

## P122 v2 — promotion đã kiểm chứng 2026-11-04T12:29:01.367836+07:00

- [x] PPCT/YCCĐ/SGK/SBT, 23 bảng, mục tiêu ngắn, timeline 40 phút, Toán độc lập PASS.
- [x] Candidate Word 16 xem riêng 5+2 trang; production render lại, ảnh khớp 7/7.
- [x] Backup/hash/diff/verifier: `qa_artifacts/P122_review_20261104/P122_QA_REPORT_20261104.md`; `P122_final_verification_v2.json` PRODUCTION_PASS.
- [~] Tiếp P123. Không làm lại P116; P052–P054 đã chốt riêng `_project`.
- [ ] Reconcile và QA đủ 959; PROGRESS toàn mục tiêu 2/4.

Ledger hiện tại: {'not_started': 910, 'pass': 37, 'fail': 1, 'in_progress': 11}; chưa PASS 922/959. SHA-256 `C42106385E9340C603C21FC9D3BA41824CFA6A9286FBDA42B571C88E37609C1B`. Backup `tds_ledger_before_P122_v2.json`.

## P123 v3 — promotion đã kiểm chứng 2026-11-04T12:46:57.491316+07:00

- [x] PPCT/YCCĐ/SGK/SBT, mục tiêu ngắn, 23 bảng và timeline 40 phút PASS.
- [x] Toán độc lập: 2.056 tam giác cạnh nguyên; kiểm tọa độ, cận và bài góc tù.
- [x] Word 16: candidate xem riêng 5+2 trang; production ảnh khớp 7/7, verifier PRODUCTION_PASS.
- [x] Backup/hash/diff/report: `qa_artifacts/P123_review_20261104/P123_QA_REPORT_20261104.md`.
- [~] Tiếp P124; không làm lại P116, P052–P054 đã chốt riêng `_project`.
- [ ] Hoàn tất/reconcile 959. PROGRESS toàn mục tiêu 2/4.

Ledger: {'not_started': 910, 'pass': 38, 'fail': 1, 'in_progress': 10}; chưa PASS 921/959. SHA-256 `65B4AE57BD0842B2FE29117AEC4CB26C2F50F74FB5A6C40C516CAC4436CACE3C`. Backup `tds_ledger_before_P123_v3.json`.

## P124 v1 — promotion đã kiểm chứng 2026-11-04T12:58:32.466381+07:00

- [x] PPCT/YCCĐ/SGK/SBT, mục tiêu “Em có thể…”, nội dung bảng và timeline 40 phút PASS.
- [x] Toán độc lập: 12.888 tam giác tọa độ và 6.561 tứ giác lưới; lưu giả thiết không thẳng hàng.
- [x] Word16 candidate 5+2 trang được xem riêng; production ảnh khớp 7/7; verifier PRODUCTION_PASS.
- [x] Backup/hash/diff/report: `qa_artifacts/P124_review_20261104/P124_QA_REPORT_20261104.md`.
- [~] P125 tiếp theo; P116 không làm lại.
- [ ] Reconcile/audit đủ 959; PROGRESS toàn mục tiêu 2/4.

Ledger {'not_started': 910, 'pass': 39, 'fail': 1, 'in_progress': 9}, chưa PASS 920/959; SHA-256 `FB9245353A724B7A0355E41EFDD495E9A05085148FA04D4C0E1942AE3CFFC4A4`. Backup `tds_ledger_before_P124_v1.json`.


## P125 — production verification 2026-11-04

- [x] Verifier `PRODUCTION_PASS`: OOXML, timeline 40 phút, YCCĐ và 65 ca vector.
- [x] Word 16 candidate/production: xem đủ 5/5 trang chính + 1/1 phụ lục; ảnh khớp 6/6.
- [x] Report, hash, diff, promotion manifest và ledger backup ghi tại `qa_artifacts/P125_review_20261104/`.
- [~] Ledger mới: 40 PASS, 1 FAIL, 8 in progress, 910 not started; 919/959 chưa PASS. SHA-256 `4C0ADC393E0139B2519142906C71260763A7FF0741A553B5323C34A00BCF1CD6`.
- [ ] Tiếp QA sâu P126; không làm lại P116.


## P117 — deep re-audit 2026-11-04

- [x] Đọc lại 5/5 trang Word 16, chạy lại verifier; xác nhận phép tính, mục tiêu, PPCT, OOXML, hash production.
- [x] Không phát hiện lỗi mới; không sửa production. Ghi `P117_independent_reaudit_20261104.log`.
- [~] Audit lũy kế hiện 40 PASS, 1 FAIL, 8 in progress, 910 not started; ledger SHA-256 `C97CEC5B4AEA25D76E8545228457C881B131F3B3AFA82B995D38DB828A25A5BC`.
- [ ] Tiếp tục với P126; P116 không làm lại.


## P126 — verified production 2026-11-04

- [x] Sửa nội dung chung chung thành bài miền nghiệm; giữ tên PPCT “Tiết tự chọn”.
- [x] QA candidate: Toán, YCCĐ, OOXML, 40 phút; bắt và sửa lỗi đáp án homework trước promote.
- [x] Word16 xem đủ 5+1 trang; production render khớp candidate 6/6; `PRODUCTION_PASS`.
- [x] Backup, diff, hash, verifier và report: `qa_artifacts/P126_review_20261104/`.
- [~] Ledger: 41 PASS, 1 FAIL, 7 in progress, 910 not started; 918/959 chưa PASS. SHA-256 `CF88B79A986EEC14E0310E57A34464A7A2B783F22367DC43CA0DFEC59323F5AF`.
- [ ] Tiếp P127; không làm lại P116.


## P127 v2 — verified production 2026-11-04

- [x] Chọn mạch tối ưu hàm tuyến tính đã học; giữ tên PPCT “Tiết tự chọn”.
- [x] Toán phân số/OOXML/timeline 40 phút PASS; mục tiêu ngắn “Em có thể…”.
- [x] Word16 candidate xem riêng 5+1 trang; production ảnh khớp 6/6; PRODUCTION_PASS.
- [x] Backup, diff, logs, report: `qa_artifacts/P127_review_20261104/`.
- [x] Sửa ledger P125: hash hiện hành khớp production; baseline giữ riêng.
- [~] Ledger 42 PASS, 1 FAIL, 6 in progress, 910 not started; chưa PASS 917/959; SHA-256 `D81A9DDD2A2E6B4E80909155F2982804C55D162E5BCEA2AC436E6A80728431DC`.
- [ ] Tiếp P128; P116 không làm lại. PROGRESS toàn mục tiêu 2/4.


## P126 v4 — correction verified 2026-11-04T13:54:10+07:00

- [x] Sửa hệ trục dự phòng thành −1 đến 7 để chứa giao điểm (0;6).
- [x] Sửa câu khởi động so (3;0) với (4;0); không gọi hai điểm này cùng trên bờ.
- [x] Đồng bộ vị trí minh chứng ĐGTX/kiểm sai theo timeline thực.
- [x] Xem riêng đủ 5+1 trang Word16; verifier candidate/production PASS, ảnh production khớp 6/6.
- [x] Backup v3 tại `promotion_backup_v4/`; diff `P126_v3_to_v4.diff`; verifier/log phiên bản v4.
- [~] Ledger giữ 42 PASS, 1 FAIL, 6 in progress, 910 not started; 917/959 chưa PASS. SHA-256 `3A8AAA83960962E50B778451DA981906346719A501B0AE13B6881E51B042BA02`.
- [ ] Tiếp P128; không làm lại P116. PROGRESS toàn mục tiêu 2/4.

Production chính `63B52EB1C5BB69A94012EB2BD93841E95978E06DE0CF6BFEDB041B2ECF4052B1`; phụ lục `7BE255EDDF879D6AFF6AF34573861A5AE628DACDD9D9FE2EEED4D892BA965EED`.


## P128 — verified production 2026-11-04T14:03:25+07:00

- [x] Sửa bốn nhóm lỗi: mục tiêu dài, header lẻ, quá tải timeline, nội dung bảng lặp.
- [x] PPCT/YCCĐ/SGK/SBT, 964 kiểm độc lập, OOXML và timeline40 phút PASS.
- [x] Word16 xem riêng5+1 trang; production ảnh khớp6/6, PRODUCTION_PASS.
- [x] Report/hash/diff/backup/verifier: `qa_artifacts/P128_review_20261104/`.
- [~] Ledger43 PASS,1 FAIL,5 in progress,910 not started; chưa PASS916/959; SHA-256 `45B70DAE227434997EE6F184457C7FD17AB7F005BC7C97FD5FBA443397C99376`.
- [ ] Tiếp P129; không làm lại P116. PROGRESS toàn mục tiêu2/4.


## P129 v2 — verified production 2026-11-04T14:10:55+07:00

- [x] Sửa tập điểm tối ưu G: cạnh(4;2)–(0;6), loại(6;0) ngoài miền.
- [x] Phân biệt điểm không thuộc hệ với hệ vô nghiệm; chứng minh max nguyên và đủ phương án.
- [x] Toán/OOXML/timeline PASS; Word16 xem5+1 trang, production ảnh khớp6/6.
- [x] Backup/diff/hash/report/verifier: `qa_artifacts/P129_review_20261104/`.
- [~] Ledger44 PASS,1 FAIL,4 in progress,910 not started;915/959 chưa PASS; SHA-256 `8CC22C298B9132853A1C62DEEFF70E82E2B56A6DB6F4C31B9D4A210565160760`.
- [ ] Tiếp P130; P116 không làm lại; P052–P054 đã giữ riêng `_project`. PROGRESS toàn mục tiêu2/4.


## P130 v2 — verified production 2026-11-04T14:27:11+07:00

- [x] Sửa4 nhóm lỗi: header lẻ, mục tiêu sai dạng, timeline14/7 phút, bảng chung chung.
- [x] Giữ Toán đúng nguồn; xác minh toàn bộ phương án nguyên11/8/14,4 đỉnh chính xác, OOXML/timeline40 phút.
- [x] Word16 xem riêng5+1 trang candidate; production ảnh khớp6/6; PRODUCTION_PASS.
- [x] Backup/diff/hash/log/verifier/report tại `qa_artifacts/P130_review_20261104/`.
- [x] Reconcile959 canonical hash/đường dẫn;962 ZIP/XML;3 tệp ngoài959 khớp inventory gốc;0 thiếu/không rõ/drift/XML lỗi. Không đồng nhất QA nội dung.
- [~] Ledger45 PASS,1 FAIL,3 in progress,910 not started;914/959 chưa PASS; SHA-256 `31B3FB2BF514F146AD7272B62EC73CB2C907A1ED4B3312426829CEBED6B12891`.
- [ ] Tiếp P131; không làm lại P116. P052–P054 giữ riêng `_project`; P078–P079 giữ tên PPCT. PROGRESS toàn mục tiêu2/4.

## TDS audit — P131

- [x] Candidate v4 aligned to PPCT/YCCĐ/Unit Plan/SGK/SBT; corrected cosine coefficient and refined objectives/board notes.
- [x] Word16 candidate and production inspected 5/5 pages; production image hashes match 5/5.
- [x] Backup, diff, verifier, logs, report, and 959/962 structural reconcile saved in qa_artifacts/P131_review_20261104/ and qa_artifacts/tds_deep_audit_20261104/.
- [~] Deep ledger: 46 pass, 1 fail (P087), 2 in progress (P132–P133), 910 not started; 913/959 not deep PASS. Ledger SHA-256 AC43DF2142566B1C5A19ECECD58E02566F3FFEABF5260089974E07F336E3BF50.
- [ ] Continue P132 then P133; resolve P087 elective-topic ambiguity and audit remaining TDS. Do not claim 959 content PASS.

## Checkpoint 2026-11-04 — P133 complete

- [x] P133 corrected, promoted in place, Word16 candidate/production 5/5 pages inspected; image hashes match 5/5.
- [x] P133 backup, source diff, candidate and production verifier, Word16 logs/manifests, QA report saved in `qa_artifacts/P133_review_20261104/`.
- [x] 959 canonical / 962 actual DOCX structurally reconciled; 17,062 XML/rels parsed; 0 missing, unexpected, hash drift, ZIP/XML errors.
- [x] P052–P054 project filenames/identity remain separately verified in `qa_artifacts/g10_w07_project_final_review_20261104/PROJECT_QA_REPORT_20261104.md`; P116/P117 not repeated.
- [~] Deep content/visual ledger: 48 PASS, 1 FAIL (P087), 910 not started; 911 not yet deep PASS. Structural reconciliation is not content QA.
- [ ] Continue with the next not-started lesson P134; later resolve P087 and inspect the remaining ledger entries individually.

Ledger SHA-256: `F43AFD76E5B3915A2DDD77E80CD9FEE7F038FD66E5EBD9398A7E6BD18436B806`. Structural reconcile: `qa_artifacts/tds_deep_audit_20261104/inventory_reconcile_959_post_P133_v1.json`. Package check: `qa_artifacts/tds_current_ledger_package_verification_20261104.json`.
