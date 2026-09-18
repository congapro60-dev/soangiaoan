# P31: hoàn thiện tiết học và luồng GV–TV–HS

## Căn cứ và phạm vi

- Người dùng đã bỏ giới hạn không QA/không agent và yêu cầu làm kỹ cả nội dung lẫn luồng sử dụng.
- PPCT `src/data/ppct/tds-g10.json`: `tds-g10-30`, periodNo 31, tiết 1 BPT bậc nhất hai ẩn; periodNo 32 mới biểu diễn miền nghiệm. Không dùng vẽ nửa mặt phẳng làm mục tiêu của tiết 31.
- Mẫu Ban Toán: khởi động 0–5, mục tiêu 5–8, HĐ1/HĐ2, quick check/mở rộng 32–38, sơ kết 38–40, BTVN phân hóa. Một câu hỏi định hướng cho cả bài.
- Ban đầu hai bảng trắng, TV tình huống/chờ, HS chưa cần đăng nhập hoặc ghi chép. GV dẫn lớp; ứng dụng hỗ trợ chứ không làm HS chỉ tập trung vào máy.
- Chỉ sửa P31 canonical và ranh giới runtime liên quan. Bảo toàn 47 gói adapter. Không tự ghi dữ liệu thật, push/deploy/reseed trong đợt phát triển này.

## Chuẩn nghiệm thu

1. Mọi nhiệm vụ đúng phạm vi tiết, có dữ kiện, câu hỏi, sản phẩm, đáp án/tiêu chí riêng cho GV và cách phản hồi khi HS sai.
2. Phủ đủ 2400 giây gồm suy nghĩ, thao tác, nói/viết, chuyển nhóm; không thêm thời gian vô hình.
3. HS hình thành mục tiêu trước khi GV công bố mục tiêu chung. Nội dung đáp án chỉ xuất hiện lúc GV chốt, không nằm sẵn trên màn HS.
4. Chọn tuyến có nghĩa; có đề để làm, gợi ý có giới hạn; post-check chung kiểm tra cá nhân. Không suy năng lực từ ngôn ngữ hoặc số lượt gửi.
5. Đọc/viết nháp theo session+uid+step; không xóa/gửi nhầm khi đổi cue; không mất/ghi đè lựa chọn loại lỗi khi gửi giải thích.
6. Đúng ba chế độ runtime và một TV-control owner-only; clock giữ qua pause/resume; thống kê khớp cue, ẩn ngay khi tắt; nhóm và dữ liệu riêng không rò lên TV.
7. Gói tải xuống phản ánh cùng nguồn nội dung, có bản GV với đáp án và bản TV/HS công khai; không gọi bản HTML dựng khác là screenshot runtime.
8. Trải nghiệm toàn bộ trình tự trên lớp giả lập: GV, TV công khai, TV điều khiển, 3 HS độc lập; viewport TV 1920×1080 và 1280×720, HS mobile/tablet. Có screenshot và bằng chứng thực hiện nút/gửi/lưu, không chỉ DOM count.

## Trình tự

- [x] Đọc PPCT, mẫu giáo án, trạng thái Git và nguồn thiết kế.
- [x] Chạy baseline lint và full unit: lint PASS; 1953 PASS, 6 FAIL (transaction mock và fixture ngôn ngữ).
- [ ] Chốt kịch bản/ma trận nhiệm vụ–minh chứng–can thiệp và plan review độc lập.
- [ ] Sửa nội dung canonical, đáp án GV, lựa chọn và nguồn trình chiếu chung; giữ tương thích hoặc cảnh báo phiên cũ cần mở mới.
- [ ] Sửa vòng lặp/đồng bộ/gợi ý/nháp và thêm regression tests thực sự.
- [ ] Tạo harness emulator + API local có cơ chế chặn production; E2E ba vai độc lập.
- [ ] Hoàn thiện hình thức từng màn qua screenshot thực tế, bài tập trực quan ngân sách và sơ đồ phép kiểm.
- [ ] Full lint/lint:api/unit/build, Rules/pilot; cross-review; ghi ma trận lỗi và hạn chế còn lại.

## Chặng học dự kiến

| Phút | Việc chính | Minh chứng |
|---|---|---|
| 0–5 | Dự đoán cách mua với 150 nghìn, giải thích cách kiểm tra, đặt câu hỏi chung | Cặp đôi nói/ghi câu hỏi |
| 5–8 | Mục tiêu cá nhân → GV tổng hợp | Mục tiêu HS, tiêu chí bảng phụ |
| 8–16 | HĐ1: từ điều kiện đến BPT; nhận diện bậc nhất; kiểm tra cặp số | Lựa chọn dấu + tính/thay số trong vở |
| 16–19 | THINK–VERIFY: phát hiện suy luận sai của lời giải AI | Loại lỗi + phép tính + kết luận |
| 19–27 | HĐ2: chọn cách tiếp cận, chuyển nhóm, giải nhiệm vụ cùng tiêu chí | Sản phẩm nhóm và kết luận của từng em |
| 27–32 | Post-check độc lập với dữ kiện mới | Câu trả lời cá nhân |
| 32–38 | Quick check, phản hồi, sửa lỗi, mở rộng cho em sẵn sàng | Lượt đầu/sửa, lời giải thích |
| 38–40 | So mục tiêu với bằng chứng, exit ticket, giao BTVN | Điều đạt/chưa đạt + bước tiếp theo |

## Trạng thái engine/review

Hai reviewer Codex bị quota: INCONCLUSIVE, không phải approve. Desk health trả OK nhưng dispatch plan bị chặn vì thiếu model thỏa tools/vision. CLI attach thất bại Session not found. Đang hỏi chủ sở hữu cho phép sửa trực tiếp trong phiên theo ngoại lệ của opencode-first. Chưa thực hiện bản sửa ứng dụng mới.
