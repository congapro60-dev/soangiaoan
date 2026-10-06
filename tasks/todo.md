# Kế hoạch 2026-10-06: Báo cáo PH — khối "Bản đồ theo bài SGK"

Chủ dự án duyệt bản mẫu: mỗi bài SGK một thẻ màu, "Ưu tiên ôn trước", chú thích mỗi mức một dòng;
dễ nhìn trên điện thoại, iPad, laptop; xuống dòng theo cụm nghĩa.

## Sự thật đã kiểm
- Mỗi YCCĐ đã có nhãn `sgk` ("Bài 2", "Bài 3–4", "Chương V") → gom theo bài không cần dữ liệu mới.
- Thầy cô sửa mức / ghi chú / bỏ dòng YCCĐ trước khi lưu → khối theo bài phải tính TỪ CÁC DÒNG đã soát.
- Dòng chỉ lưu `evidence` + `percent`: một câu ghép vào 2 YCCĐ cùng bài sẽ bị đếm 2 lần → lưu thêm danh sách câu.
- Báo cáo công bố lưu nguyên `printInput` (giới hạn 300k ký tự) → trường mới đi theo, cổng PH dựng lại được.
- Kiểm 3 khổ bản hiện tại: "50–79%" bị cắt ở dấu gạch (iPad/laptop), "“Chưa đạt”" bị tách (điện thoại).

## Làm
- [x] `parentRequirements.ts`: dòng YCCĐ thêm `questions` (mã câu + điểm); sinh ở `aggregateRequirementLines`,
      giữ ở `sanitizeRequirementLines`; hàm thuần `buildLessonMap` (gom theo bài, đếm câu không trùng, bài cũ thiếu
      `questions` thì ước lượng thận trọng) + thứ tự ưu tiên ôn.
- [x] `parentReportPrintDoc.ts`: khối bản đồ ngay dưới đoạn tổng quan (bản web + PDF); có bản đồ thì bỏ thẻ
      "Điểm mạnh / Cần chú ý" trùng nội dung; sửa 2 chỗ ngắt dòng; thẻ không bị cắt khi sang trang PDF.
- [x] Màn soát của giáo viên: xem trước khối theo bài ngay trên danh sách YCCĐ.
- [x] Test thuần + test bản in; kiểm 3 khổ (390 / 820 / 1366) + PDF 780 bằng trình duyệt thật.
- [x] test + lint + lint:api + build; commit, đẩy nhánh.

## Kết quả (06/10)
- Mức của bài tính từ điểm các câu (giống mức từng dòng), KHÔNG theo mức thầy cô đổi tay ở từng dòng —
  để con số "Đạt x%" luôn khớp chú thích. Thầy cô chỉnh bản đồ bằng cách bỏ dòng ghép sai (xem trước ngay trên màn soát).
- Báo cáo đã lưu trước hôm nay: bản đồ vẫn hiện, chỉ tỉ lệ (không in số câu vì có thể đếm trùng).
- Có bản đồ thì bỏ "Tóm tắt nhanh" (trùng nội dung); gợi ý ở nhà trỏ sang "Bản đồ theo bài SGK".
- Kiểm bằng trình duyệt thật: 390 / 820 / 1366 px + PDF xuất thật (html2canvas): không tràn ngang, mọi nhãn/chip
  một dòng, thẻ không bị cắt khi sang trang. Sửa luôn "Mã HS" bị tách dòng ở đầu báo cáo, "50–79%" bị cắt ở dấu gạch.
- Dữ liệu chương trình: YCCĐ lớp 12 Bài 16 mang tên chủ đề "Phương trình đường thẳng trong không gian" (trùng Bài 15)
  — tên bài theo chủ đề CT, chưa có bảng tên bài SGK.

## Sau (chờ duyệt thiết kế)
- [ ] Bài định kì: đánh dấu riêng, không cộng vào điểm TB BTVN; điểm Sheet là chính thức; đối chiếu lệch → cờ soát.
- [ ] Mã đề: khối 12 có 4–8 mã, khối khác 1–4; mã do người ra đề làm sẵn → thiết kế đẩy lên một lần cho tiện.

# Kế hoạch 2026-10-01: Sửa chấm sai từng câu (BTVN)

Chủ dự án chốt: bài đã duyệt GIỮ đã duyệt khi sửa đáp án cả lớp; Đúng/Sai theo thang THPT
(đúng 1 ý 0,1 · 2 ý 0,25 · 3 ý 0,5 · 4 ý trọn điểm câu).

## Sự thật đã kiểm
- "Sửa điểm" cũ chỉ sửa điểm tổng; bảng từng câu chỉ xem → em thấy bảng câu mâu thuẫn điểm tổng.
- `grade.score` là điểm AI tự cộng, KHÔNG luôn bằng tổng điểm các câu (có bài AI quy đổi thang).
- Chấm lại (nhanh/kĩ) ghi đè toàn bộ kết quả câu, kể cả chỗ GV đã sửa.

## Làm
- [x] `src/lib/classroom/questionRescore.ts` (thuần): nhận dạng trắc nghiệm / Đúng-Sai (1 ý hoặc cả câu) / trả lời ngắn,
      chấm lại không cần AI; tính lại điểm tổng (bằng tổng câu, hoặc cộng phần chênh theo tỉ lệ khi AI quy đổi thang);
      áp đáp án đã sửa; giữ câu GV đã sửa khi AI chấm lại. Test đủ ca.
- [x] Hộp "Sửa điểm": bảng từng câu sửa được (Em làm / Đáp án / Điểm), câu khách quan tự chấm lại, tổng tự cộng.
- [x] Máy chủ `saveSubmissionGrade` nhận `questionResults` (kiểm khớp câu, kẹp điểm), đánh dấu `teacherEdited`.
- [x] "Sửa đáp án câu này cho cả lớp": lưu `answerKeyFixes` trên bài giao, chấm lại tất định câu đó ở mọi bài đã chấm,
      câu tự luận → gắn cờ cần soát; bài đã duyệt giữ duyệt + đồng bộ lại hồ sơ; có lịch sử.
- [x] AI chấm (lần sau/bài nộp muộn): prompt nhận đáp án đã sửa + áp lại tất định; giữ câu GV đã sửa.
- [x] Prompt phòng ngừa: ô tô bị tẩy/gạch là huỷ, không chắc → needsTeacherReview; định dạng chuẩn
      trắc nghiệm "C", Đúng/Sai "a) Đ; b) S; c) Đ; d) S", trả lời ngắn chỉ ghi số; thang THPT cho Đúng/Sai.
- [ ] Test + lint + lint:api + build; HANDOFF; đẩy main; tự QA trên web thật.
- [ ] (Sau) "AI chấm lại câu này" kèm lời dặn của GV cho câu tự luận.

# Kế hoạch 2026-09-30: Báo cáo PH — "Điểm mạnh & cần rèn" theo YÊU CẦU CẦN ĐẠT

Chủ dự án: rút gọn, viết chính xác bằng ngôn ngữ Toán học (gia sư/cố vấn đọc là biết con kém/tốt ở đâu);
số dòng phụ thuộc YCCĐ; tra CT GDPT 2018 + SGK Kết nối tri thức + LO TDS.

## Sự thật đã kiểm
- CT GDPT 2018 (TT 32) rút chữ được; SGK KNTT là PDF scan — ô "Kiến thức, kĩ năng" ≈ YCCĐ của CT chia theo bài.
- LO TDS khối 10 (19 LO, mức chủ đề) lấy từ file mẫu điểm SSM user đã gửi — thô hơn YCCĐ, để dành gắn sau.
- Hiện tại danh sách lấy từ `profile.topics` (chữ tự do AI ghi mỗi lần chấm) → trùng ý, lẫn tầng, ~26 dòng.
- Bằng chứng thật có sẵn: `grade.questionResults` (từng câu: status/score/errorType/explanation).

## Làm (xong 01/10 — QA Codex PASS; còn: YCCĐ lớp 11, 12)
- [x] `src/lib/curriculum/yccdToan.ts` — YCCĐ lớp 10 (75 mục, lời CT; mục phép toán vectơ tách theo bài SGK). Lớp 11, 12 sau.
- [x] Facts gửi AI: bài đã duyệt trong kì → từng câu (token b1q2, % điểm, loại lỗi, giải thích ngắn).
- [x] AI (chung một lượt với nhận xét) trả JSON: nhận xét + ghép câu→YCCĐ + ghi chú lỗi/điểm mạnh bằng thuật ngữ.
      Máy chủ kiểm id YCCĐ/token, TỰ TÍNH mức từ điểm các câu làm căn cứ (≥80% vững, ≥50% đang hình thành, còn lại chưa đạt).
- [x] Lưu cùng nhận xét (`parentReportNotes`), GV sửa mức/ghi chú/xoá dòng; xuất cả lớp dùng bản đã lưu.
- [x] PDF: mục "Kết quả theo yêu cầu cần đạt" nhóm theo chủ đề; chưa có bản AI → danh sách cũ gộp trùng, tối đa 6.
- [x] Test + build + nghiệm thu trên web thật (Bảo Khánh, 10Olinda, tháng 9).

# Kế hoạch 2026-09-23: Quản trị + đếm token/chi phí + sổ điểm

Chủ dự án chốt: (1) làm trang quản trị cho tài khoản congapro60@gmail.com, (2) sổ điểm đủ (đồng bộ điểm thi + nhập điểm HS1),
(3) rà soát + chuẩn bị lớp cho cô Vân/Hạnh/Hồng qua trang quản trị, KHÔNG ghi đè dữ liệu có sẵn (cô Hạnh).

## Sự thật đã kiểm (không đoán)
- Chưa có ghi token ở đâu cả. Gọi AI bằng KEY CHUNG của chủ dự án (tốn tiền chủ): `_grading-core.ts` (chấm BTVN,
  GRADING_GEMINI_API_KEY/GEMINI_API_KEY), `generate-simulation.ts` (GEMINI_API_KEY), `_ai-gateway-core.ts` (AI_GATEWAY_API_KEY, GLM 5.2).
  Soạn giáo án/tạo đề chạy ở trình duyệt bằng key riêng người dùng → người dùng tự trả.
- Lịch sử đăng nhập có sẵn trong Firebase Auth (metadata createdAt/lastSignIn) → đọc bằng Admin SDK phía máy chủ.
- Không có trang quản trị nào; giới hạn 12 Vercel Function → thêm action vào endpoint có sẵn.

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
