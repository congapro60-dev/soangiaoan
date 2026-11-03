# Payload check chéo — Nâng cấp HKII chuẩn bài học tương tác (commit nội dung `1d65ff4`, HEAD `9fbbe35`)

## Mục tiêu
Kiểm chứng độc lập trạng thái mới của repo này (branch `codex/universal-content-release`, HEAD `9fbbe35`; nội dung chính nằm ở commit `1d65ff4` "feat(content): storyline linked to interactive lesson Bai 14, 3-4 tier data-anchored hints, stats dataset visuals, glue fixes"):

1. Catalogue `content/hkii-2026-catalogue.json` chứa đúng 404 bài học HKII và 6 đề thi; tổng tasks toàn bộ bài học HKII = 5.882.
2. Số prompt trùng lặp (sau trim, đếm instance lặp trong cùng bài) trên toàn catalogue HKII = 0.
3. Số task có prompt chứa từ khóa 3D (`tứ diện`, `hình chóp`, `lăng trụ`, `hình hộp`) nhưng thiếu `solidKey` = 0. BẮT BUỘC so khớp case-insensitive (regex `/i`).
4. Lỗi dính chữ (glue) trong prompt: sau khi bỏ nội dung `$...$` (LaTeX) và đổi `d_1`/`d_{1}` thành `d`, số prompt còn khớp `[\p{L}]{2,}\d|\d[\p{L}]{2,}` (Unicode) = 0.
5. Hint: mọi task HKII đều có ≥1 hint; phân bố số tầng — kỳ vọng 3.257 task × 4 tầng và 2.187 task × 3 tầng (task không hint chỉ chấp nhận nếu type là reflection/suy ngẫm, phải nêu số đếm được).
6. Hint tầng 1 (H1) gắn dữ kiện: 3.779 hint H1 bắt đầu "Chép lại dữ kiện trước khi làm:"; hint không được chứa đáp án (validator `ERR_SCAFFOLD_PENALTY_FORBIDDEN` đã chặn lúc build — xác nhận build chạy sạch).
7. Visual: đúng 30 task HKII có `task.visual` với `kind === 'dataset-table'`, mỗi visual có `title`, `headers` 3 cột, 12 dòng dữ liệu A/B (dataset 12 phiên cổ phiếu Bài 14) — không có visual rỗng/sai shape.
8. Storyline: đúng 30 task prompt chứa cụm "bài học tương tác Bài 14"; các prompt này nằm trong các bài game thống kê G10 (`r23-g10-discover-r336`, `r23-g10-discover-r337` và bài mean) — số liệu trong prompt phải khớp dataset `STOCK_A = [0,2,-1,1,0,2,-2,1,0,2,1,0]`, `STOCK_B = [-1,12,-2,-1,2,-1,3,-3,-1,1,-2,-1]` (điểm phần trăm, 12 phiên).
9. Build: `npm --prefix "<repo>" run build` chạy thành công, 0 error TypeScript.
10. Test E2E: `node --test tests/hkii-e2e-gameplay.test.mjs tests/week13-e2e-gameplay.test.mjs tests/week14-e2e-gameplay.test.mjs tests/week15-e2e-gameplay.test.mjs tests/week16-e2e-gameplay.test.mjs tests/week17-week18-e2e-gameplay.test.mjs` — kỳ vọng 7/7 PASS.

## Ràng buộc cấm (BẮT BUỘC)
- KHÔNG sửa bất kỳ file code/nội dung nào.
- KHÔNG chạy `git commit`, `git push`, KHÔNG ghi Firestore hay dịch vụ ngoài.
- Chỉ ĐỌC file và chạy lệnh verify.

## Lệnh tự verify (gợi ý, chạy bằng Node)
- Đọc `content/hkii-2026-catalogue.json`, với mỗi lesson bóc `data` (base64 → gunzip → JSON) rồi đếm tasks/hints/visual/storyline theo các mục trên.
- Lệnh build và test như mục 9, 10 (cwd = repo gốc).

## Format trả lời bắt buộc
Với từng mục 1–10: `PASS` hoặc `FAIL` + bằng chứng (số liệu đếm được hoặc dòng output lệnh). Cuối cùng: verdict tổng thể `PASS`/`FAIL` + rủi ro nếu có.
