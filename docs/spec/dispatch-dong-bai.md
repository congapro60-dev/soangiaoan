# Decision Pack · Đóng bài 3 output — nhánh Discover (22/10)

Bạn đứng trong worktree `spai-dong-bai`, nhánh `feat/dong-bai-3-output` (base = tip nhánh `feat/discover-t3b-t4`, gồm T1–T6: `adaptiveAssignments` server-only, submit máy chủ tại `api/_adaptive-submit.ts`/`api/classroom.ts`, panel GV thống kê, rules T6 đã deploy).

## Mục tiêu
Khi GV bấm "Đóng bài" cho 1 adaptive assignment, hệ sinh ĐỦ 3 artifact theo nguyên vọng gốc của chủ dự án:

1. **TV summary ẩn danh** — bản tổng kết chiếu máy chiếu/TV: chỉ số LỚP (tỉ lệ đúng từng mục tiêu, nhóm lỗi sai phổ biến), KHÔNG tên/biết HS nào.
2. **Feedback từng HS** — nhận xét cá nhân từng em dựa trên attempt thật (objectiveScores, misconception, số lần nộp): nêu lỗi sai, hướng sửa cách nghĩ. KHÔNG hé lộ đáp án/lời giải (bất biến sản phẩm: lời giải chỉ tạo 1 lần, retry không xem lại lời giải).
3. **BTVN phân hóa** — bài tập về nhà theo lỗi sai từng em, **chọn từ các câu CÓ SẴN trong bài học đó** (chọn theo objective/misconception khớp). ⛔ KHÔNG cho LLM tự sinh câu hỏi/đáp án mới — đúng bẫy "LLM runtime cấm tự sinh đáp án/homework". AI (nếu dùng) chỉ viết phần giải thích/chỉ dẫn, không ra đề.

## Ràng buộc cứng
- KHÔNG thêm file `api/` mới (Vercel 11/12 function). Chỉ sửa/giãn file api hiện hữu (`api/classroom.ts`, `api/_adaptive-submit.ts`, helper có sẵn).
- Đọc dữ liệu: re-use đường teacher đã đọc được theo rules T6 (adaptiveAssignments mà GV đọc được); artifact lưu BÊN TRONG doc `adaptiveAssignments` (field/sub-doc, server ghi bằng Admin SDK) → KHÔNG đổi rules, KHÔNG collection mới.
- HS nhận feedback/BTVN qua đường response payload của API học sinh hiện có (mở rộng action trả bài/portal), HS KHÔNG đọc assignment doc trực tiếp.
- UI GV: trong panel thống kê lớp (Discover) — nút "Đóng bài" → 3 tab/khung: Summary (anonymized, chữ to cho TV), Feedback từng HS, BTVN từng HS. UI HS: trong portal bài đã hoàn thành.
- Style khớp code hiện hữu (components/features/adaptive-*, services/adaptive*), TypeScript strict, không dependency mới.
- RU into: thống kê hiện có (23 mục tiêu/2 lỗi sai) là NGUỒN INPUT, không viết lại engine chấm.

## Test/verify (bắt buộc trước khi báo done)
- `npm run build` xanh 0 lỗi TS.
- Unit test mới: hàm chọn BTVN (đủ objective chưa đạt → chọn câu khớp, không sinh mới), hàm ẩn danh summary (không có field tên/mã HS nào lọt), hàm feedback (không chứa đáp án — assert không chuỗi "Đáp án"/answer text).
- Emulator rules test không bị fail (không đổi rules).

## Ghi sổ
- Cập nhật `docs/spec/discover-self-study-v2.ledger.md` (mục mới "T8 đóng bài 3 output") + commit phép ghi.
- KHÔNG push/deploy. KHÔNG merge. KHÔNG đụng 8 bài đã chấm cũ.
