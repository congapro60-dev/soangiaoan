# Đẩy giáo án lên Drive + chọn bài theo PPCT — 2026-08-11

Hai việc trong một phiên. Railway trial hết hạn làm chết chức năng đẩy Drive; đồng thời owner
muốn soạn giáo án bằng cách chọn bài thẳng từ phân phối chương trình.

## Lô A — Đẩy giáo án lên Google Drive (xong)

Bỏ hẳn đường qua bot Railway. Trình duyệt xin quyền Drive qua chính Firebase Google login rồi
upload thẳng lên Drive API: không thêm Vercel function, không giữ secret ở đâu.

- [x] `src/lib/googleDrive.ts`: xin access token + các phép Drive REST → verify: build sạch.
- [x] `src/services/pushLessonToDrive.ts` thay `pushLessonToBot.ts`, giữ `/api/export-lesson`.
- [x] Ô "Thư mục đích" trong hộp thoại đẩy; đẩy xong app nhớ thư mục theo cặp chương trình + lớp.
- [x] Cài đặt: mục "Bot API" → mục "Google Drive" với 6 ô thư mục → verify: dán link Drive tự rút ra ID.
- [x] Chặn phiên ẩn danh trước khi mở popup, tránh đổi phiên làm mất dữ liệu người dùng.

## Lô B — Chọn bài theo PPCT (xong)

- [x] `scripts/build-ppct.mjs`: đọc cả hai nguồn, gộp theo **bài** chứ không theo tiết
      → 684 bài TDS (khối 6–12) + 324 bài MOET (khối 10–12).
- [x] `scripts/build-unitplan.mjs`: rút tổng quan học phần I từ 3 file .docx THPT.
- [x] `src/data/ppct/index.ts` + `src/data/unitplan/index.ts`: nạp theo khối, Vite tách chunk riêng.
- [x] `PpctPickerModal`: chọn nguồn → khối → tuần → bài, có ô tìm kiếm.
- [x] Nối vào nhánh "Lấy từ PPCT" sẵn có trong `LessonControls`, điền tên bài + lớp + tuần + yêu cầu.
- [x] Ô tick kèm tổng quan unit plan, mặc định tắt, hiện rõ danh sách chương để giáo viên tự quyết.
- [x] `src/data/ppct/ppct.test.ts`: 26 phép kiểm canh dữ liệu sinh ra.

## Lỗi tự bắt được trong lô B

Phép kiểm "số tiết không lặp" bắt được 12 bài khối 11 cùng mang số tiết **0**: ô số tiết trống bị
`Number('')` biến thành 0. Sửa ở gốc trong `build-ppct.mjs`. Sau khi sửa, số bài khối 11 từ 117
xuống 107 vì các bài trước đó bị cắt vụn nay gộp đúng.

## Quyết định thiết kế, kèm lý do

- **Đơn vị là bài, không phải tiết.** Ô "Yêu cầu cần đạt" trong PDF MOET là ô gộp trải nhiều tiết;
  cắt theo tiết thì 11–17% số hàng đứt giữa câu và trôi sang tiết bên cạnh.
- **Không tự đoán bài nào thuộc unit plan nào.** Đo thử cách khớp theo từ khoá tên chương: chỉ
  trúng 34–53% ở học kỳ I mà khớp nhầm 19–26% bài học kỳ II. Bỏ, để giáo viên tự tick.
- **PPCT chỉ là tư liệu.** Owner chốt ngày 2026-08-11: không được đổi bố cục mẫu giáo án. Yêu cầu
  gửi cho AI có sẵn câu ràng buộc giữ nguyên các mục của mẫu đã chọn.

## Nghiệm thu

- `npm run lint` sạch, `npm test` **724/724** xanh, `npm run build` xong.
- Chạy thật trên dev server: chọn bài MOET lớp 11 → app điền Lớp 11, Tuần 30, dán nguyên văn yêu
  cầu cần đạt. Bật ô unit plan → yêu cầu tăng từ 323 lên 4.584 ký tự, có đủ câu ràng buộc bố cục.
- Dữ liệu tách chunk riêng theo khối, 12–48 KB mỗi khối, không phình bundle chính.

## Còn lại — chỉ owner làm được

1. Google Cloud Console (project Firebase): bật **Google Drive API**, thêm scope
   `https://www.googleapis.com/auth/drive`, thêm mình vào Test users.
2. Đăng nhập bằng Google thật (không phải chế độ demo) rồi thử đẩy một giáo án lên Drive.
3. Unit plan học kỳ II: chờ bản mới. Unit plan THCS (Toán 6–9) là PDF vỡ dấu tiếng Việt khi rút
   chữ, cần bản .docx hoặc chấp nhận thêm bước chuẩn hoá.
4. Chưa commit, chưa push. HANDOFF.md cập nhật khi chốt push.
