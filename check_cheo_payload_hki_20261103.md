# Payload check chéo — Nâng cấp HKI chuẩn V88 (HEAD mới nhất, commit nội dung `196ccc0`)

## Mục tiêu
Kiểm chứng độc lập trạng thái Học kỳ I trong repo này (branch `codex/universal-content-release`, HEAD mới nhất; nội dung chính ở commit `196ccc0` "feat(content): HKI 3-4 tier data-anchored hints for all branches (G11+G12)"):

1. Catalogue `content/hki-2026-catalogue.json` chứa 403 bài học HKI và 6 đề thi; tổng tasks toàn bộ bài học HKI = 5.350.
2. Số prompt trùng lặp (sau trim, đếm instance lặp trong cùng bài) = 0.
3. Số task có prompt chứa từ khóa 3D (`tứ diện`, `hình chóp`, `lăng trụ`, `hình hộp`) nhưng thiếu `solidKey` = 0. BẮT BUỘC so khớp case-insensitive.
4. Lỗi dính chữ: sau khi bỏ nội dung `$...$` và đổi `d_1`/`d_{1}` thành `d`, số prompt khớp `[\p{L}]{2,}\d|\d[\p{L}]{2,}` (Unicode) = 0.
5. Phân bố tầng hint HKI: 3.140 task × 4 tầng, 1.722 task × 3 tầng, 488 task × 1 tầng (270 `type:"reflection"` + 218 `type:"open"`) — mọi task đều ≥1 hint.
6. Hint tầng 1 data-anchor: 3.346 hint H1 bắt đầu "Chép lại dữ kiện trước khi làm:"; build chạy sạch (validator không báo `ERR_SCAFFOLD_PENALTY_FORBIDDEN`).
7. Test `node --test tests/hki-content.test.mjs tests/hki-package.test.mjs` — kỳ vọng 5/5 PASS.
8. Build: `npm --prefix "<repo>" run build` exit 0, 0 error TypeScript.

## Ràng buộc cấm (BẮT BUỘC)
- KHÔNG sửa bất kỳ file code/nội dung nào.
- KHÔNG chạy `git commit`, `git push`, KHÔNG ghi Firestore hay dịch vụ ngoài.
- Chỉ ĐỌC file và chạy lệnh verify.

## Lệnh tự verify (gợi ý)
- Đọc `content/hki-2026-catalogue.json`, mỗi lesson bóc `data` (base64 → gunzip → JSON) rồi đếm theo các mục trên.
- Lệnh test/build như mục 7, 8 (cwd = repo gốc).

## Format trả lời bắt buộc
Với từng mục 1–8: `PASS`/`FAIL` + bằng chứng (số liệu đếm được hoặc dòng output). Cuối: verdict tổng thể `PASS`/`FAIL` + rủi ro.
