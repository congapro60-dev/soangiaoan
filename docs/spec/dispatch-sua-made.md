# Decision Pack · worker — Nâng "Sửa mã đề & đáp án": file + AI giải + tự báo chấm lại theo mã (22/10, chủ dự án duyệt)

Repo: worktree này (branch `feat/sua-ma-de`, base = origin/main). **KHÔNG tạo nhánh mới, KHÔNG `git switch`, KHÔNG commit/push** — chỉ sửa file + chạy cổng; supervisor commit sau.

## Bối cảnh
- Luồng GIAO bài (PeriodicTestSection / AssignmentFormModal) đã đầy đủ: thả file đề Word/PDF/ảnh, tách theo "Mã đề…", AI giải đề từng mã, AI rút đáp án từ file đáp án, AI đề xuất HDC.
- Màn **SỬA** sau khi giao (`ExamVariantsEditor.tsx`) bị gọt cụt: chỉ gõ tay đáp án each mã — không thả file, không AI.
- Màn đó nằm trong `AssignmentPanel.tsx` (đối chiếu đoạn "KIỂM TRA ĐỊNH KÌ — CÁC MÃ ĐỀ", nút "Chấm lại (n)" của mỗi lớp, `currentSummary.regradable`).
- Hành vi hiện có phải GIỮ: nút "Chấm lại" chỉ chấm lại bài **đã chấm bằng AI**, bỏ qua bài thầy sửa tay; chỉ bài cùng mã mới tính lại.
- Quy tắc sản phẩm chốt 22/10: lưu xong KHÔNG tự chấm lại im lặng — nếu thầy chưa đồng ý thì hỏi 1 click; cách hỏi mới: **theo mã**, không chấm tỤc toàn bộ.

## Việc A — nâng Editor dùng đúng bộ máy luồng Giao bài
1. Đọc trước: `examVariants.ts` (splitVariantSources, codeFromFileName, pageCodes, cấm đề- đáp án), `PeriodicTestSection.tsx`, `AssignmentFormModal.tsx` (cách gọi AI giải: `gradingApi.ts` — "AI giải đề" ~ dòng 203, "AI đề xuất HDC" ~ dòng 350), `fileUtils` (đọc docx/pdf/ảnh), `ExamVariantsEditor.test.tsx`.
2. Thêm vào `ExamVariantsEditor`:
   - Thả file đề / file đáp án (kéo-thả + chọn) → `splitVariantSources` cho ra đề + tư liệu đáp án theo mã (đề dạng ảnh sẽ phải đưa mã theo tên file; giữ warning có sẵn cho file chỉ đọc được ảnh).
   - Nút "Để AI giải đề" (toàn bộ mã chưa có đáp án + từng mã "Giải lại").
   - Nút "Để AI đề xuất IHDC" cho hướng dẫn chấm (nếu luồng Giao bài đã dùng cùng shape dữ liệu).
   - Cả 2 nút TÁI DỤNG đúng endpoint/action hiện có của luồng Giao bài. **Nếu phát hiện cần endpoint chưa tồn tại mà phải thêm file `api/` mới → DỪNG, ghi blocked vào HANDOFF, không tự thêm api.**
3. Giữ +++ UI để thu gọn: mỗi mã vẫn hiện "n câu có đáp án", validate "mã chưa có đáp án" như cũ.

## Việc B′ — web tự nhận biết mã nào đổi để gợi ý chấm lại (yêu cầu chủ dự án 22/10)
- Khi Lưu: so SHA/text cắt khoảng trắng từng mã giữa `(assignment.examVariants)` cũ và bản mới → phát hiện per mã: **đáp án tăng/đổi/giảm, mã thêm, mã bỏ**.
- Đọc bài nộp của bài giao: nhóm theo `examVariant`/mã (chỉ bài **đã chấm bằng AI**) → số bài per mã.
- Sau Lưu hiện đúng bảng:
  | mã | thay đổi | số bài đã chấm | nút |
  | 101 | đổi 2 câu đáp án | 9 bài | [Chấm lại mã 101] |
  | 102 | không đổi | 9 | — |
  | 103 | mã mới | 0 chưa nộp | — |
  Bài thầy sửa tay giữ nguyên; chốt dòng nhắc ngắn: "X bài AI sẽ chấm lại theo mã đã chọn".
- Chấm lại per mã: tái sử dụng đường "Chấm lại" hiện có trong `AssignmentPanel` (mode `quick` bằng mặc định như nút bulk hiện dùng). Không đổi api/chip logic; nếu re-session cần callback thì thêm prop từ `AssignmentPanel` xuống, không vi phạm "không thêm api file".
- Nếu mã bị bỏ mà còn bài đã chấm theo mã đó → cảnh báo đậm số bài đó, KHÔNG tự xóa bài.

## Cổng bắt buộc xanh
`npm run test` (toàn bộ bị nhớ phải xanh, kể cả test hiện có), `npm run lint`, `npm run build` (exit 0). R虞 thêm/update test: `ExamVariantsEditor.test.tsx` — (1) diff per mã đúng khi đổi/put thêm/put bỏ; (2) bảng gợi ý chỉ cách listing bài đã chấm bằng AI; (3) chạy AI thiếu endpoint thì lỗi sạch.

## Rrang giới hạn cứng
- KHÔNG thêm file `api/` mới (Vercel đang 11/12 function). KHÔNG sửa `api/_assistant-confirmations.ts`.
- KHÔNG đổi hành vi nút "Chấm lại (n)" hiện có — chỉ BỔ SUNG gợi ý sau Lưu per mã.
- KHÔNG tự chấm lại tự động; KHÔNG ghi dữ liệu production; KHÔNG chạy `npm run dev` để VERIFY — chỉ unit test + build.
- `npm ci` trước nếu node_modules chưa có. Sửa file giữ thu gọn, không refactor ngoài phạm vi.

## Trả lại
- JSON: {A: done/blocked + chi tiết}, {B′: done/blocked + chi tiết}, {diff-per-mã: hoạt động thế nào}, {đã sửa file nào}, {cổng: kết quả}.
- Cập nhật `HANDOFF.md` mục "Nâng Sửa mã đề & đáp án" với Evidence Pack (mỗi cổng 1 dòng).
