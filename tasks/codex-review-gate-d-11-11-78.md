# [REVIEW ĐỘC LẬP] Gate D `11-11-78` — Hai mặt phẳng song song — Tiết 2 (V8.8, Tuần 11 batch2)

> Người mời review: thầy (qua AI soạn bài). Codex review **chỉ đọc**, trả verdict — KHÔNG sửa file, KHÔNG commit.

## 1. Ngữ cảnh (đọc 2 phút là đủ)

- **Dự án**: SmartPlan AI — web app trợ giảng cho GV Việt Nam (React + TS + Vite + Tailwind v4 + Firebase). Nhánh làm việc: `feat/nop-bai-da-cham` (worktree `nop-bai-da-cham`).
- **Công việc đang chạy**: plan `docs/superpowers/plans/2026-10-26-week11-batch2-v88.md` — chuyển 7 bài Tuần 11 thành bài tương tác V8.8 (vòng R1–R7). R1 (`10-11-80`) và R2 (`11-11-76`) đã duyệt + xuất bản. Hiện **R3 = `11-11-78`**, đang ở **Gate D** = chốt bản thiết kế storyboard 12 chặng trước khi soạn spec (Pha B).
- **Đối tượng review**: `tasks/gate-d-11-11-78.md` (212 dòng) — vừa soạn xong, CHỜ DUYỆT.
- **Quy trình đã chốt của batch**: làm XONG HẲN vòng trước (QA đạt) mới sang vòng sau; Gate D mỗi bài phải được duyệt trước khi soạn spec. Nên verdict của bạn là chốt chặn trước khi thầy duyệt chính thức.

## 2. File cần đọc (theo thứ tự)

1. `tasks/gate-d-11-11-78.md` — đối tượng review (mục 0 ánh xạ · mục 1 storyboard · mục 2 AI-error · mục 3 bảng số · mục 4 khác biệt · mục 5 điểm chú ý · mục 6 kiểm nhanh).
2. `tasks/giaoan-goc-11-11-78.md` — giáo án gốc (nguồn sự thật; do dòng bảng dài, nên đọc bản làm phẳng `tasks/tmp-giaoan-78-flat.md` — cùng nội dung, tách `<br/>`).
3. `tasks/gate-d-11-11-76.md` — khuôn chuẩn ĐÃ DUYỆT (R2) — đối chiếu cấu trúc và mức độ "sát gốc".
4. `docs/superpowers/plans/2026-10-26-week11-batch2-v88.md` — plan batch2 (quy tắc vòng, ghi chú riêng bài 78: hình học không gian cần mô tả hình bằng lời; kind trong spec phải khớp Gate D).
5. Tùy chọn spot-check bằng chứng runtime trong bảng phân quyền: `src/lib/liveLesson/v4/lessonAdapter.ts`, `runtimeDefinition.ts`, `offlinePack.ts` (evidence giữ nguyên từ R1/R2 đã duyệt — chỉ cần spot-check nếu nghi ngờ).

## 3. Phạm vi review — 8 checkpoint

1. **Cấu trúc**: mục 0–6 đủ và đúng khuôn bài 76; header có đủ key/PPCT/nguồn/quyết định kế thừa.
2. **Timeline**: 11 chặng hoạt động cộng dồn kín 0–2400s (S0–S10), không hổng không chồng lấn; chặng 12 "Sau" disabled. Kiểm lại phép cộng từng dải.
3. **Ánh xạ gốc → chặng**: đối chiếu từng hoạt động giáo án gốc theo dải phút P0–P40 — không sót hoạt động nào, không nhét sai chỗ. Đặc biệt: [PHẢN BIỆN] HĐ 2.1 tách thành S4 (S3 phải không còn nhắc); HĐ 3.2 + HĐ 4.1 ghép S9; BTVN nguyên văn ở chặng 12.
4. **AI-error (mục 2)**: đủ 7 trường nội dung; `category` thuộc enum 4 giá trị; đúng kịch bản [PHẢN BIỆN] của giáo án; mode micro; KHÔNG tái dùng bẫy của 10-11-80 ("bạn An" chia k vs n) và 11-11-76 ("bạn Nam" bỏ tần số).
5. **No-spoiler + phân quyền**: đề PHT phần B/C và 3 câu kiểm nhanh lên máy HS phải dạng đề trần; đáp án chỉ nằm ở V4/panel GV/`exercises[].answer`. Đối chiếu bảng phân quyền với runtime thật — kiểm thử định xem có dòng nào đáp án lọt ra TV/student không.
6. **Bảng số mục 3**: 17/17 dòng — tự kiểm lại bằng tay từng phép tính (B'C'=7,5; A'C'=12; A'B'=3; B'C'=6; k²=4/9; QR/BD=1/3; x=9; MN∥CD; v.v.). Đây là bảng chống "số giáo án sai" — phải chui được.
7. **Quyết định tiền lệ áp đúng**: CasioKeyGuide TẮT; giáo án ghi "Tuần 12" → Gate D theo app tuần 11; đáp án PHT dùng nguyên bản (CÓ trong giáo án mục III — khác bài 76 phải tự tính); S4 KHÔNG có ngưỡng ĐGTX % (khác 76 có 85%).
8. **Rủi ro đặc thù hình học**: 3 hình TikZ + hình Burj Khalifa được mô tả bằng lời — đánh giá mô tả có giữ đủ nội dung sư phạm không (điểm mút A,B,C/A',B',C'/B'',C''; đường phụ d″).

## 4. Ba câu hỏi mở (trả lời trực diện)

1. **Mục 5 #7** — Hệ quả ghi bảng gốc viết "Hai mặt phẳng song song chắn trên **hai mặt phẳng song song khác** những đoạn thẳng song song và bằng nhau". File phán đoán lệch chữ từ "**hai đường thẳng song song** khác" (SGK tr. 96–97) và tạm trích nguyên văn + đánh dấu. Bạn đồng ý phân định này không, hay nên xử lý khác?
2. **S9 nén 8' gốc còn 3'** (HĐ 3.2: 3 câu trắc nghiệm + vinh danh + chốt đáp án PHT; rồi HĐ 4.1 Burj Khalifa) — có quá tải cho một chặng 180s không? Nếu có, đề xuất cắt/giãn chặng nào (lưu ràng buộc tổng 2400s bất diệt)?
3. **S5 "Giao PHT số 1" 60s** với cấu trúc 1 phiếu 4 phần (A KWLI / B Nhiệm vụ 1 / C Nhiệm vụ 2 / D exit ticket) — handoff có rõ ràng, HS có hiểu mình nhận gì không?

## 5. Định dạng đầu ra mong muốn

```
VERDICT: ĐẠT | CẦN SỬA
Findings:
- [BLOCKER] ... (file:dòng — vì sao — đề xuất sửa)
- [NÊN SỬA] ...
- [GHI CHÚ] ...
Trả lời 3 câu hỏi mở: 1) ... 2) ... 3) ...
```

Không cần khen; chỉ liệt kê vấn đề có bằng chứng (trích dòng file). Nếu mọi checkpoint đạt thì nói thẳng ĐẠT và dừng.
