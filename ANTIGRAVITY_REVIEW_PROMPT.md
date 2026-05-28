# Prompt cho Antigravity kiểm tra sau khi merge lên `main`

Bạn hãy kiểm tra giúp tôi dự án `soangiaoan` / `smart-lesson-plan-ai` sau commit mới nhất trên nhánh `main`.

## Bối cảnh thay đổi

Tôi vừa cập nhật luồng tạo bài học phân hoá/thích ứng từ giáo án nguồn, trọng tâm là file:

- `src/lib/adaptive/adaptiveFromLessonPlan.ts`
- `src/lib/adaptive/types.ts`
- `src/lib/adaptive/personalizationEngine.ts`
- `src/pages/AdaptiveStudentPortalPage.tsx`
- tài liệu/kịch bản phụ: `e2e_testing_guide.md`, `check_gemini_models.mjs`

Mục tiêu chính:

1. AI sinh nội dung bài học phân hoá bằng JSON có cấu trúc thay vì chỉ parse markdown/regex.
2. JSON phải có nội dung Toán thật: mục tiêu, khởi động, pre-test 5 câu, các mảnh kiến thức, 3 tuyến Foundation/Standard/Challenge, quick check, exit ticket, ví dụ mẫu và mô phỏng HTML tương tác.
3. Nếu JSON AI bị lỗi parse hoặc không đạt chuẩn, hệ thống không crash mà fallback về bộ dựng cũ và ghi cảnh báo qua `generationSource` / `generationWarnings`.
4. Khôi phục export `buildAdaptiveReviewPrompt` để TypeScript không lỗi import.
5. Luồng học sinh cần tiếp tục đọc được dữ liệu bài học, phân tuyến, remediate/support/enrichment mà không vỡ UI.

## Việc cần kiểm tra kỹ

### 1. Kiểm tra build/typecheck

Chạy:

```bash
npm install
npm run lint
npm run build
```

Nếu lỗi, hãy xác định file/dòng lỗi và đề xuất patch tối thiểu.

### 2. Review logic tạo bài học thích ứng

Đọc kỹ `src/lib/adaptive/adaptiveFromLessonPlan.ts`, đặc biệt các phần:

- `parseAdaptiveContentJson`
- `repairJsonString`
- `validateAdaptiveContentJson`
- `buildFallbackLessonWithWarnings`
- `buildAdaptiveLessonFromContentJson`
- `buildAdaptiveContentPrompt`
- `buildAdaptiveReviewPrompt`

Hãy kiểm tra:

- Có trường hợp nào JSON hợp lệ nhưng bị validator chặn quá gắt không?
- Có trường hợp JSON xấu lọt qua gây bài học rỗng/placeholder không?
- Regex chặn meta leak có vô tình chặn nội dung hợp lệ không?
- `repairJsonString` có làm hỏng LaTeX/HTML trong JSON không?
- Fallback có bị đệ quy hoặc mất dữ liệu quan trọng không?
- `generationSource` / `generationWarnings` đã khớp type chưa?

### 3. Kiểm tra luồng UI giáo viên

Trên giao diện giáo viên, thử tạo bài học từ giáo án thật, ưu tiên bài `Ba đường conic · Lớp 10` nếu có dữ liệu sẵn.

Luồng kỳ vọng:

1. Chọn giáo án nguồn.
2. Bấm AI rà soát giáo án.
3. Duyệt bản thiết kế.
4. Hệ thống gọi bước sinh JSON nội dung.
5. Xuất bản bài học.
6. Nếu AI JSON đạt chuẩn: bài học có `generationSource: ai_json`.
7. Nếu AI JSON lỗi: bài học vẫn tạo được, có `generationSource: regex_fallback` và `generationWarnings` hiển thị/ghi nhận được.

Hãy chú ý các lỗi thường gặp:

- treo loading vô hạn;
- lỗi JSON parse;
- lỗi do LaTeX backslash;
- mô phỏng HTML không render;
- quick check/pre-test thiếu đáp án;
- nội dung học sinh bị lẫn từ UI/UX như `bố cục 7:3`, `Socratic`, `schema`, `Vở Ghi Chép`.

### 4. Kiểm tra cổng học sinh

Mở bài đã xuất bản ở cổng học sinh:

- Pre-test đủ câu, có đáp án và explanation.
- Sau pre-test có phân tuyến hợp lý.
- Mỗi mảnh kiến thức có nội dung theo 3 tuyến.
- Quick check hoạt động.
- Remediation/support/enrichment không lỗi.
- Exit ticket hoạt động.
- Mô phỏng `htmlMiniApp` chạy trong sandbox, không phá layout.

### 5. Kiểm tra E2E nếu có thể

Nếu repo có `run_test.js` và Chrome debug đã sẵn sàng, chạy:

```bash
node run_test.js
```

Nếu cần kiểm tra model Gemini, có thể chạy:

```bash
node check_gemini_models.mjs
```

Lưu ý: `check_gemini_models.mjs` cần biến môi trường `GEMINI_API_KEY`; nếu không có key thì script chỉ in `NO_KEY`.

## Kết quả mong muốn từ bạn

Vui lòng trả lại báo cáo theo cấu trúc:

```markdown
# Antigravity Review Report

## Kết luận nhanh
- Pass/Fail:
- Rủi ro lớn nhất:

## Đã kiểm tra
- [ ] Typecheck
- [ ] Build
- [ ] Luồng giáo viên
- [ ] Luồng học sinh
- [ ] E2E/script phụ

## Lỗi phát hiện
| Mức độ | File | Mô tả | Cách sửa đề xuất |
|---|---|---|---|

## Nhận xét về kiến trúc
- Điểm tốt:
- Điểm rủi ro:
- Đề xuất tối ưu tiếp theo:

## Patch đề xuất nếu có
```diff
...
```
```

Ưu tiên phát hiện lỗi thực tế có thể làm hỏng production, không cần refactor lớn nếu không bắt buộc.
