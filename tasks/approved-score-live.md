# Điểm đã duyệt lên sổ và cập nhật trực tiếp

Ngày: 2026-10-26. Base: origin/main 3616442. Nhánh riêng, không đụng WIP checkout cũ.
Quyết định người dùng: “Bạn nào đã duyệt thì cứ cho lên sổ… GV… sửa điểm thì trên sổ tự đổi… real-time”. Cho phép triển khai theo yêu cầu này; không commit/push/deploy, không sửa dữ liệu thật.

## Phạm vi và nghiệm thu
- Bài kiểm tra định kì đã duyệt (GV/AI/timeout) tự ghép theo `periodicTest.sheetLabel`, dùng tên bài khi không có nhãn; không ghép bài thường chỉ vì tên gần giống. Liên kết thủ công hiện có ưu tiên.
- Điểm thi chưa duyệt không lên sổ định kì. Mỗi học sinh lấy lượt đã duyệt mới nhất; điểm 0 hợp lệ.
- Sửa bài đã duyệt bởi GV giữ duyệt, nguồn teacher; bài chưa duyệt vẫn chờ duyệt. History/concurrency/evidence giữ nguyên.
- Điểm bài đã duyệt thay điểm Sheet/điểm cũ; sửa tay trong sổ hoặc xác nhận giấy mới hơn điểm bài vẫn được giữ. Sau khi GV sửa bài mới hơn, sổ theo điểm mới.
- Sổ GV và bảng điểm HS nhận thông báo từ Firestore qua stream API đã xác thực; không mở rules đọc trực tiếp. Mất kết nối giữ bản cuối, tự nối lại; huỷ listener khi rời màn/đổi phiên. Workspace HS giữ lịch làm mới hiện có.
- Google Sheet vẫn đồng bộ có xem trước; không tự ghi ra hệ thống ngoài.

## Rủi ro và cách kiểm
Rủi ro trung bình: chọn nhầm mốc thi, điểm chưa duyệt lộ qua bảng điểm, response cũ đè thay đổi mới, listener không được dọn. Kiểm server authorization, scope từng HS, thứ tự nguồn điểm/timestamp, vòng đời stream, test regression + typecheck API/UI + build.
Giải pháp tối thiểu: tính điểm từ nguồn hiện hành khi đọc, không sao chép điểm vào ô cố định, không migration.

## Công việc
- [ ] T1: Test đỏ cho tự ghép điểm đã duyệt, giữ duyệt khi GV sửa, nguồn điểm cập nhật.
- [ ] T2: Triển khai logic tính điểm và sửa tay, giữ kiểm quyền/lịch sử.
- [ ] T3: Stream cập nhật GV/HS, test lifecycle/reconnect/authorization.
- [ ] T4: Kiểm diff, test liên quan, lint, lint:api, build; review độc lập.
- [ ] T5 (user bổ sung): nhập trực tiếp ô HS1/MOET, một nút Lưu, giữ nháp khi realtime, chỉ lưu ô đổi, phát hiện xung đột cùng ô.
- [ ] T6 (user cho phép ghi app): tạo đúng một cột `Điểm bài hướng nghiệp`, HS1, đọc H4:H29 tab `Gốc-10Columbus`, sheet id 0 trong file 11Columbus; ghép mã/tên duy nhất đủ 26, đọc lại sau lưu. Không sửa file nguồn.

## Điều phối
Não: phiên hiện tại. Không Astra. Quota sống: Claude native tuần 0%; Codex phiên 9%, tuần 54%; Antigravity consumer không tự dùng. Route writer/reviewer chọn sau canary text, không gửi dữ liệu HS.
Review: pending. Gate: pending.

## Checks
| Yêu cầu | Kiểm | Kết quả |
|---|---|---|
| Tự ghép + chỉ điểm duyệt + không che sửa mới | scoreBook + API score-book regression | unresolved |
| GV sửa bài giữ duyệt/hồ sơ | manualGrade + API lifecycle regression | unresolved |
| Cập nhật trực tiếp, dọn listener, cô lập HS | stream API/client tests | unresolved |
| Không lỗi TS/build | lint / lint:api / build | unresolved |
| Review khác hãng | review packet | unresolved |
