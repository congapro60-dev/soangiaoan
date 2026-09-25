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
- [ ] QA production với công tắc TẮT (không đổi gì với người dùng hiện tại); chủ dự án tự cài webhook SePay + biến Vercel.
