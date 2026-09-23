# Điểm thi định kì (MOET + TDS) vào báo cáo phụ huynh

## Bối cảnh (đã xác minh trên Drive thật)
- Mỗi lớp 1 Google Sheet (vd `26-27-10Olinda`) trong folder GV giữ. Khớp **Mã HS** (cột 0) = studentCode app.
- Tab **MOET**: điểm định kì thang 10 — header `Điểm T9 KSĐN`, `Điểm T10 ĐGGHKI`, `Điểm T12 ĐGCHKI`, `Điểm T3 ĐGGHKII`, `Điểm T5 ĐGCHKII`. Xen cột "Phân loại điểm" (công thức) + kế hoạch hành động NỘI BỘ → KHÔNG lấy.
- Tab **TDS**: `Điểm Quý 1..4` + cột kế tiếp `Điểm chữ` (A/B/C, công thức).
- Header ở dòng 3; dòng 4 là số cột; dữ liệu từ dòng 5.

## Quyết định
- Nguồn: đọc 2 tab MOET/TDS từ **`class.sheetSync.spreadsheetId`** (file lớp đã nối BTVN). Lớp chưa nối → ẩn mục.
- Google Sheets API `values:batchGet` `UNFORMATTED_VALUE`, quyền Google của GV (như BTVN). Không xin thêm quyền.
- User-initiated: nút "Tải điểm thi định kì" (tránh popup OAuth bất ngờ). Token cache ~55' nên thường tức thì.
- Hiển thị: mục riêng "Điểm thi định kì" — MOET (thang 10, mini-bar) + TDS (quý + điểm chữ). Chỉ mốc đã có điểm.
- An toàn PH: chỉ lấy cột điểm; bỏ công thức/kế hoạch nội bộ.

## Việc
- [x] `sheetsApi.ts`: `readSheetValues` (values:batchGet, UNFORMATTED) — build OK.
- [x] `examScores.ts` (thuần): types + `parseStudentExamScores` — 6 test pass.
- [x] `examScores.test.ts`: fixture giống Drive thật — pass.
- [x] `examService.ts`: `fetchStudentExamScores` đọc MOET+TDS (bỏ tab thiếu).
- [x] `parentReportPrintDoc.ts`: input `exams?`, mục "Điểm thi định kì" + CSS — test + preview OK.
- [x] `StudentReport.tsx`: lấy `sheetSync` lớp, nút "Tải điểm thi", state, render, truyền PDF — lint+build OK.
- [x] Preview PDF có mục điểm thi (screenshot). QA thật (đọc Sheet + auth) làm trên production sau deploy.

## Review
Xong lõi + UI + PDF, nghiệm thu preview. Còn 1 giả định cần QA production: `class.sheetSync.spreadsheetId` chính là file điểm lớp (có tab MOET/TDS). Nếu không, thêm link điểm riêng.
