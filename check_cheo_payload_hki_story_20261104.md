# Payload check chéo — Storyline Bài 14 mở rộng HKI (commit nội dung `b9dec2a`, HEAD mới nhất)

## Mục tiêu
Kiểm chứng độc lập đợt nâng cấp storyline Bài 14 cho HKI (branch `codex/universal-content-release`, commit `b9dec2a` "feat(content): HKI stats concepts linked to Bai 14 stock dataset with visuals"):

1. Catalogue `content/hki-2026-catalogue.json`: 403 bài + 6 đề, tổng 5.350 task; 0 prompt trùng (sau trim, trong cùng bài); 0 task khớp từ khóa 3D (`tứ diện|hình chóp|lăng trụ|hình hộp`, case-insensitive) thiếu `solidKey`; 0 lỗi dính chữ (bỏ `$...$`, đổi `d_1`→`d`, regex Unicode `[\p{L}]{2,}\d|\d[\p{L}]{2,}`).
2. Đếm task prompt chứa "bài học tương tác Bài 14" = 140; số task có `task.visual` = 140; mọi visual `kind:"dataset-table"`, 3 cột, 12 dòng, dữ liệu cột A/B khớp đúng `STOCK_A = [0,2,-1,1,0,2,-2,1,0,2,1,0]`, `STOCK_B = [-1,12,-2,-1,2,-1,3,-3,-1,1,-2,-1]` theo từng phiên.
3. Với task meanMedian (prompt "năm phiên từ phiên X đến phiên Y của cổ phiếu Z"): bóc cửa sổ 5 số từ dataset, kiểm (a) dãy số trong prompt khớp slice; (b) trung bình trong lời giải = tổng/5; (c) trung vị = phần tử giữa sau sắp xếp; (bump "tăng thêm N": trung bình tăng đúng N/5).
4. Với task quartileMode/spread ("tám phiên"): kiểm Q1=(s[1]+s[2])/2, Q2=(s[3]+s[4])/2, Q3=(s[5]+s[6])/2 trên mẫu sắp tăng; IQR=Q3−Q1; khoảng biến thiên=max−min; mốt (nếu có) là giá trị tần số cao nhất; hàng rào Q1−1,5IQR / Q3+1,5IQR và danh sách ngoại lệ (nếu nêu) đúng.
5. Với task variance (hai dãy A và B): kiểm phương sai mỗi dãy = trung bình tổng bình phương độ lệch chia 4; so sánh "cổ phiếu nào phân tán hơn" khớp dấu so sánh hai phương sai.
6. `node --test tests/hki-content.test.mjs tests/hki-package.test.mjs` — kỳ vọng 5/5 PASS; `npm --prefix "<repo>" run build` exit 0.

## Ràng buộc cấm (BẮT BUỘC)
- KHÔNG sửa bất kỳ file code/nội dung nào. KHÔNG `git commit`/`git push`, KHÔNG ghi dịch vụ ngoài. Chỉ ĐỌC + chạy lệnh verify.

## Format trả lời bắt buộc
Mục 1–6: `PASS`/`FAIL` + bằng chứng đếm được (kèm 2–3 ví dụ số liệu đã đối chiếu). Cuối: verdict tổng thể + rủi ro.
