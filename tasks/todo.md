# Classroom learning loop — 2026-08-24

## Phạm vi đã duyệt

- [ ] Profile evidence tương thích ngược: không xóa topic chưa được đánh giá, phân biệt cùng assignment nộp lại, ghi nhận strengths.
- [ ] Practice set/attempt: học sinh trả lời được, lưu được, chấm được, không nhận solution trước.
- [ ] Student assignment projection không lộ đáp án/hướng dẫn chấm.
- [ ] Recovery submission kẹt `grading`.
- [ ] QA độc lập bằng Ox Alpha và preflight/test/rules/build.

## Ràng buộc production

- Assignment 11 Columbus đang hoạt động; không reset/xóa/migrate phá hủy.
- Không thêm Vercel Serverless Function.
- Không push `main` hoặc deploy nếu chưa có lệnh riêng.

## Ghi chú thực thi

- Mọi thay đổi production code phải có test đỏ trước.
- Nếu test/rules fail, dừng để chẩn đoán root cause, không chồng patch.
