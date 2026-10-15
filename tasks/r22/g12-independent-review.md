# R22 - Review độc lập học liệu lớp 12

Ngày: 2026-10-15. Phạm vi chỉ đọc: `scripts/content/build-hki-g12.mjs`, gói sinh, PPCT Discover, Unit Plan, hai bộ đề/đáp án. Không sửa source hoặc sinh lại gói. Không gọi model bên ngoài; đây là review độc lập theo tác giả, không phải review khác hãng. Không chạy full build, không push/deploy.

## Findings

### [P2] Mất backslash ở ký hiệu vô cực trong phương án và đề thi

- Nguồn: `scripts/content/build-hki-g12.mjs:62`.
- Hai distractor của `monoRule` dùng template literal thường với một backslash `\infty`. JavaScript loại backslash trước `i`; output trở thành `$(-infty;-1)$` hoặc `$(1;+infty)$`.
- Tái hiện từ gói đã sinh: `entries[1].pkg.tasks[0].inputSchema.options[1].label` bằng `$(-infty;-1)$`. Có 180 trường chuỗi chứa từ `infty` thiếu backslash trong gói lớp 12; một phần là prompt mở đã ghép lại phương án.
- Đề bị ảnh hưởng: `tasks/r22/g12-exams/g12-midterm.txt:23`, `tasks/r22/g12-exams/g12-final.txt:11`. Đây là ký hiệu toán sai trên nội dung HS đọc, không chỉ lỗi nguồn nội bộ.
- KaTeX vẫn parse chuỗi này thành chữ cái, nên validator xanh không bắt được. Dùng `T`/`String.raw` hoặc escape đúng ở nguồn, sinh lại gói và đề; kiểm không còn `(?<!\\)\binfty\b` trong math.

### [P2] Chỉ số tiếng Việt chưa bọc text gây lỗi KaTeX trong gợi ý tứ phân vị

- Nguồn: `scripts/content/build-hki-g12.mjs:247`.
- Gợi ý H4 chứa `$L=10,F_{trước}=4,f=8,h=4$`. `katex.renderToString(...,{throwOnError:true,strict:'error'})` báo `unicodeTextInMathMode` tại ký tự `ư`; validator hiện cũng phát cảnh báo `No character metrics for 'ớ' in style 'Main-Regular' and mode 'text'`.
- Tái hiện từ gói: `entries[75].pkg.hints[15].text`. Một công thức khác biệt bị lỗi, được dùng lại nhiều gói; kết quả kiểm toàn bộ 1.571 công thức khác biệt là 1 lỗi strict.
- Nên dùng chỉ số `F_0` đã được định nghĩa trong phần chốt, hoặc diễn giải “tần số trước nhóm” ngoài math. Sinh lại gợi ý/gói; kiểm strict render không lỗi và không còn warning.

## Bằng chứng đã kiểm

- Đối soát 137/137 dòng PPCT: 133 gói học, bốn tiết thi thuộc hai đề 80 phút; không thiếu/trùng. Đọc riêng mapping 66 tiết core; các mốc tiệm cận trong ô tiêu đề tọa độ được giữ đúng theo chi tiết PPCT.
- 17 tiết game đều có ít nhất hai trọng tâm; mọi trọng tâm thuộc tuần trước, không lấy nội dung tương lai. Tiết 121/129 giữ ô nguồn trống và `ownerOverride.confirmed_by='owner'`, không giả có nội dung nguồn.
- Hash và `validateLessonPackage` của 133 gói đều đạt. 1.491 task kín, 439 task mở; task mở không có checker/answerKey, giữ rubric chờ GV. Không diễn giải nộp bài là đạt mục tiêu.
- Thực thi riêng phần khai báo 45 template, không chạy đoạn ghi file: 120 seed mỗi template, tổng 5.400 lượt. Đối chiếu độc lập 2.520 trường hợp số theo công thức: cực trị, GTLN đoạn đóng, vectơ, tích vô hướng, độ dài, khoảng biến thiên/tứ phân vị, nguyên hàm có điều kiện, tích phân, diện tích và thể tích. Không sai số đáp án phát hiện.
- Rà tay các template lựa chọn/mở còn lại: dấu đạo hàm, điểm đạo hàm bằng không không cực trị, khoảng mở, tiệm cận/hàm khảo sát, tọa độ, phương sai và công thức nguyên hàm. Bản tứ phân vị đã sửa cho nhóm có tần số 4,8,8: `Q1=L+9h/8`, `Q3=L+19h/8`, khoảng tứ phân vị `5h/4`; khớp nội suy.
- Hai file TXT đề thi nhập qua `parseExamLines`: 12 câu, đúng sáu trắc nghiệm/bốn trả lời ngắn/hai tự luận, 10 điểm, 80 phút. JSON qua `normalizeExamInput`. Đáp án/tiêu chí GV được tách khỏi file đề HS.
- Phần khảo sát yêu cầu vẽ trên vở, có bảng biến thiên/điểm/tiệm cận và tiêu chí chấm; không tuyên bố đã có biểu đồ số tương tác. Luồng GV có mở đầu độc lập, dẫn dắt/chốt, kiểm tra lại trước mở rộng, exit riêng và dự phòng.

## Kết luận

Kết luận vòng review ban đầu: chưa duyệt vì hai lỗi hiển thị Toán trên.

Cập nhật sau sửa15/10: hai lỗi đã được sửa đúng nguồn và tái sinh gói/đề. `node tasks/r22/g12-review-check.mjs` đạt133hash/validator,1579côngthức strictKaTeX,0mẫu sai; checksum mục tiêu/đáp án/rubric/thời lượng/điểm/lời giải giữ nguyên. SHA256output7dea1023351e61753152dff25ae24bb9c4ac52d43f8d5a7c05742ff7f368dfe2. Không còn hai finding này; catalogue và browser là gate riêng.

Giới hạn: đây là review source/học liệu và parser, chưa phải browser QA, bài dạy thử hoặc phê duyệt chuyên môn của GV. Nhiều câu là biến thể cùng cấu trúc; số lượng template/test không chứng minh độ phủ mọi dạng bài SGK.
