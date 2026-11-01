# Payload check chéo — Phát hành HKII (commit 4f7bc78)

## Mục tiêu
Kiểm chứng độc lập trạng thái phát hành Học kỳ II trong repo này (branch `codex/universal-content-release`, commit `4f7bc78`):
1. Catalogue `content/hkii-2026-catalogue.json` chứa đúng 404 bài học HKII và 6 đề thi.
2. Tổng số tasks trên toàn bộ bài học HKII = 5.882.
3. Số câu hỏi trùng lặp (prompt trùng sau trim, đếm theo instance lặp trong cùng bài) = 0.
4. Số task có prompt chứa từ khóa hình học 3D (`tứ diện`, `hình chóp`, `lăng trụ`, `hình hộp`) nhưng thiếu trường `solidKey` = 0.
5. Test E2E `tests/hkii-e2e-gameplay.test.mjs` chạy PASS.

## Ràng buộc cấm (BẮT BUỘC)
- KHÔNG sửa bất kỳ file code/nội dung nào.
- KHÔNG chạy `git commit`, `git push`, KHÔNG ghi Firestore hay dịch vụ ngoài.
- Chỉ ĐỌC file và chạy lệnh verify.

## Lệnh tự verify (gợi ý, chạy bằng Node)
- Đọc `content/hkii-2026-catalogue.json`, với mỗi lesson bóc `data` (base64 → gunzip → JSON) rồi đếm tasks, đếm prompt trùng, đếm thiếu solidKey.
- `node --test tests/hkii-e2e-gameplay.test.mjs`

## Format trả lời bắt buộc
Với từng mục 1–5: `PASS` hoặc `FAIL` + bằng chứng (số liệu đếm được hoặc dòng output lệnh). Cuối cùng: verdict tổng thể `PASS`/`FAIL` + rủi ro nếu có.
