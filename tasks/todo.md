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
- [ ] `src/lib/classroom/scoreBook.ts` (thuần): kiểu dữ liệu, kiểm điểm HS1 (0–10, ≤2 số lẻ), làm sạch điểm thi,
      `studentScoreView`, `homeworkMarks` (BTVN đã duyệt quy thang 10). Test.
- [ ] `examService.fetchClassExamScores(sheet, roster)`: đọc file điểm 1 lần cho cả lớp, khớp Mã HS.
- [ ] `api/_score-book.ts`: `teacherScoreBook`, `saveHs1Column`, `deleteHs1Column`, `saveExamScores` (GV thuộc lớp,
      studentId phải có trong danh sách lớp), `studentScoreBook` (HS). Định tuyến trong `api/classroom.ts`. Test.
- [ ] GV: tab "Sổ điểm" trong lớp — đồng bộ MOET/TDS từ file điểm lớp, bảng nhập/sửa/xoá cột điểm hệ số 1.
- [ ] HS: mục "Bảng điểm của em" (BTVN, thi định kì MOET, điểm quý TDS, hệ số 1).
- [ ] Báo cáo PH (màn hình + PDF) đọc điểm thi + HS1 từ sổ điểm, bỏ đọc Sheet riêng lẻ từng em.
- [ ] Nghiệm thu: test + lint + build; chạy thật trên production với lớp của chủ dự án.

## Cần chủ dự án chốt trước GĐ2
- Tính tiền cho ai khi HỌC SINH nộp bài được chấm: giáo viên chủ lớp (đề xuất).
- Tỷ giá: Vietcombank bán ra ngày chốt (đề xuất), sửa tay được.
