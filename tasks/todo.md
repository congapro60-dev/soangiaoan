# Lesson upgrade and Toán quality

- [x] Install/verify LibreOffice renderer for local layout QA
- [x] Add standards audit and layout-preserving DOCX supplement patcher
- [x] Integrate audit/revision actions into Nâng cấp giáo án
- [x] Add Toán generation validator and single repair pass
- [x] Ensure Toán export selects the dedicated KHDH renderer (đã sẵn: builtinFormat==='toan' → styleProfile 'toan')
- [x] Run automated and visual QA; record results

## Kết quả

**Module mới (thuần, có test):**
- `src/lib/lessonUpgrade/mathStandards.ts` — audit chuẩn Toán deterministic (13 tiêu chí; +4 tiêu chí mục C cho tiết luyện tập). 16 test.
- `src/utils/docxLessonRevision.ts` — chèn "NỘI DUNG ĐÃ BỔ SUNG" vào .docx gốc TRƯỚC sectPr cấp body, giữ nguyên layout. 8 test.
- `src/lib/toanLessonQuality.ts` — cổng chất lượng + brief sửa 1 lượt cho giáo án Toán. 5 test.

**Tích hợp:**
- `useLessonUpgrade` — giữ byte .docx gốc (≤20MB), chạy audit khi upload, hàm `downloadRevisedDocx` (docx → giữ layout; pdf/ảnh → xuất Word báo cáo).
- `LessonUpgradeTab` — panel checklist đạt/chưa đạt + nút tải bản đã bổ sung.
- `useLessonCreator` — sau khi sinh giáo án Toán: validate → nếu thiếu tiêu chí high thì gọi AI sửa đúng phần thiếu 1 lượt.

**QA:**
- `npm run lint`: 0 lỗi TS. `npm run test`: 162/162 pass (25 file). `npm run build`: OK, index chunk 965KB (<1MB).
- Render thực tế KHDH_v13 (LibreOffice → PDF): 37 trang gốc GIỮ NGUYÊN pixel-perfect; +1 trang (38) là báo cáo rà soát định dạng sạch. Audit bắt đúng lỗi BTVN trống + placeholder "điền nội dung" còn sót.

## Hạn chế đã biết
- Audit chạy trên toàn văn bản: file nhiều tiết (như KHDH_v13 có 3 tiết) chỉ nhận diện 1 loại tiết → mục C có thể chưa bật cho tiết luyện tập lồng trong file đa tiết. Đây là tầng bằng chứng cấu trúc bổ trợ, không thay thế phân tích AI.
- PDF chỉ phân tích/tạo Word mới, không sửa giữ layout (theo thiết kế đã duyệt).
