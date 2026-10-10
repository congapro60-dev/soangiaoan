# Hướng dẫn tổ chức kiểm tra bằng game

**Dành cho giáo viên · cập nhật 10/10/2026.** Dùng đường dẫn bản đã phát hành; `localhost:5173` chỉ dùng thử trên máy đang chạy app. Kiểm tra đề và đáp án trước khi cho lớp làm bài. Các tùy chọn mới chỉ có sau khi bản nâng cấp được phát hành.

## Trước giờ kiểm tra

1. Đăng nhập trang **`/exams`**, chọn **“＋ Tạo bài kiểm tra từ file đề”**, tải PDF hoặc Word `.docx` lên. Ưu tiên Word khi cần đảo phương án/ý hoặc tạo nháp đổi số: công thức OMML và hình được đọc riêng. PDF giữ nguyên đề dưới dạng ảnh, phù hợp đảo thứ tự câu/nhiều mã. Rà lại hình và công thức trước tạo phòng.
2. Ở **“Kiểm tra lại đề”**, kiểm tên bài, thời gian, số câu, loại câu và tổng điểm. Xem từng ảnh; dùng **“Thêm phía trên / Bớt phía trên / Thêm phía dưới / Bớt phía dưới”** nếu vùng cắt thiếu hoặc thừa. Chọn **“Bỏ”** chỉ khi câu bị nhận nhầm. Chọn học sinh thấy **“Điểm số”** hay **“Chỉ thấy ‘đã nộp’”**; kiểm tùy chọn cho vào muộn.
3. Mở **“Dán đáp án cho nhanh”**, dán đáp án đã đối chiếu, bấm **“Điền đáp án”**. Mỗi tiêu đề phần đứng riêng một dòng; số câu tính trong từng loại. Hai mẫu sau chỉ minh họa cú pháp, **không phải đáp án đề thi thật**:

   **Mẫu 1 — nhập gọn:**
   ```text
   PHẦN I
   1.C 2.B 3.A 4.D
   PHẦN II
   Câu 1: Đ Đ S Đ
   Câu 2: S Đ Đ S
   ```

   **Mẫu 2 — nhập từng câu, từng ý:**
   ```text
   PHẦN I
   Câu 1: C
   Câu 2: B
   PHẦN II
   1: a-Đ b-S c-Đ d-S
   ```
   Có thể dùng **“Tải file hướng dẫn chấm (Word/PDF)”**. App hiện bảng rà soát: đáp án, lời giải, thang chấm, cảnh báo. Sửa rồi **“Áp dụng hướng dẫn chấm”**, sau đó mới tạo/lưu phòng. PDF text dễ vỡ công thức: cắt ảnh lời giải để giữ nguyên công thức/hình. Đối chiếu lại số câu được điền và cảnh báo. Tự luận dùng lời giải mẫu/thang chấm, giáo viên chấm sau.
4. Bấm **“Tạo phòng kiểm tra”**. Trong phòng, chọn **“Mở phòng cho học sinh vào”**, dùng **“Chép mã”** hoặc **“Chép link cho học sinh”**. Học sinh vào **`/exam?code=MÃ_PHÒNG`**, nhập đúng họ tên, **“Chọn linh vật đồng hành”**, bấm **“Vào phòng”**, chờ giáo viên.

## Trong và sau giờ kiểm tra

5. Kiểm danh sách ở thẻ **“Học sinh (…)”**; đủ người và đủ đáp án thì bấm **“▶ Bắt đầu tính giờ (…)”**. Đồng hồ chung tính theo máy chủ; linh vật khóa khi bắt đầu.
6. Theo dõi **Tiến độ / Rời trang / Trạng thái**. Nút **“+5 phút”** gia hạn cả phòng đang chạy. Học sinh dùng **“Bảng câu”**, **“Câu trước / Câu sau”**, **“⚑ Xem lại”**, phóng to ảnh và **“Bản đồ hành trình”**. Mỗi câu trả lời tự lưu; bản đồ không quyết định điểm, không có gợi ý hoặc xúc xắc trong chế độ này. Tự luận: chụp/tải ảnh bài làm hoặc gõ nội dung.
7. Học sinh bấm **“Nộp bài”** rồi xác nhận; hết giờ app gửi bài tự động. Khi cần đóng cả phòng, bấm **“Kết thúc”** và xác nhận: bài chưa nộp được chốt ngay.
8. Mở **“Chấm tự luận”**, chọn học sinh, đọc bài cạnh lời giải/thang chấm, nhập điểm và nhận xét rồi **“Lưu điểm và nhận xét”**. Vào **“Kết quả”**, chọn **“Làm mới”**, xem bảng điểm/câu sai nhiều theo mã đề; tải CSV có cột mã đề. Học sinh nộp sớm chỉ thấy tổng điểm nếu được phép; chưa xem lời giải/đúng sai từng câu. **“Lời giải cho học sinh”** chọn mở khi phòng kết thúc hoặc không mở. Khi mở, học sinh chọn bất kỳ trạm, thấy bài của mình, đáp án, lời giải, điểm và nhận xét; xem lại trên cùng trình duyệt giữ mã phiên.

## Xem lại và dọn phòng

- Hộ chiếu sau nộp có **PIN xem lại** nếu giáo viên cho xem lời giải. Học sinh ghi riêng PIN, mã phòng và đúng tên; không chia sẻ PIN. Trên máy khác, vào `/exam`, chọn **“Xem lại trên thiết bị khác bằng PIN”**. Phòng phải kết thúc; phiên PIN chỉ xem bài, không sửa/nộp. Thử sai nhiều lần cần chờ 15 phút. Giáo viên cấp lại quyền thiết bị thì PIN/phiên xem cũ bị thu hồi.
- Hành trình sau thi dùng cùng bản đồ 3D/2D; chọn trạm để xem lại, mọi câu vẫn mở bằng lưới. Trạm không đổi điểm. Máy yếu hoặc bản đồ lỗi thì dùng lưới câu.
- **“Xóa phòng”** chỉ dùng sau khi kết thúc hoặc với phòng chưa chạy. Xác nhận ghi tên phòng và số bài học sinh; xóa cả bài làm, điểm, ảnh và phiên xem lại. Lưu CSV/hồ sơ cần giữ trước khi xóa. Nếu số bài thay đổi trong lúc xác nhận, app từ chối; rà lại rồi mới xóa.

## Chọn mức chống nhìn bài

| Tùy chọn | Tác dụng | Lưu ý |
|---|---|---|
| Đảo câu trong từng phần | Mỗi em có thứ tự câu riêng; không đảo các phần | Tự luận nhiều ý vẫn là một khối. Vào lại giữ thứ tự. |
| Nhiều mã đề | Tải mã 101/102/... hoặc nhân bản; mỗi mã có đề/HDC riêng | Gán xen kẽ, ngẫu nhiên hoặc giáo viên phân trước bắt đầu. Kiểm số câu và tổng điểm tương đương. |
| Đảo phương án và ý đúng/sai | Đổi vị trí nội dung A–D/a–d, chấm theo câu gốc | Chỉ bật khi nội dung tách riêng được. Câu dùng “Cả A và B”, “ý a/câu trên” mặc định không đảo; rà trước khi đổi. |
| Đổi số liệu với AI hỗ trợ | Tạo nháp mã mới trước giờ thi | AI phải được cấu hình; giáo viên xác nhận gửi đề, duyệt từng câu/đáp án/lời giải. Chưa duyệt không dùng cho học sinh. |

Chọn **“Xem như học sinh”** để kiểm nội dung, công thức và thứ tự. Giáo viên chấm/CSV dùng câu gốc; học sinh thấy số thứ tự của phiên mình. Mã đề chỉ hiện cho học sinh khi bật **“Hiện mã đề”**, hữu ích khi đối chiếu đề giấy. Việc đảo không đổi điểm, không khóa câu, không bắt trả lời đúng mới đi tiếp.

**Giới hạn cần biết:** trộn câu/phương án giảm nhìn bài trực tiếp, không thay thế coi kiểm tra. Ảnh PDF không thể đổi chữ bên trong; câu chưa tách phương án chắc chắn sẽ không đảo. Nháp AI có ba trạng thái: máy kiểm số ở dạng được hỗ trợ, cần giáo viên xem, không đổi được. Câu có hình phụ thuộc dữ kiện/câu chứng minh mặc định không đổi. Không coi lời giải AI hoặc nhãn “máy kiểm” là nghiệm thu đề.

Thứ tự ngẫu nhiên có thể trùng giữa hai em, nhất là phần có ít câu. Với PDF, số câu in trong ảnh vẫn là số đề gốc; dùng số ở thanh/lưới câu của app khi di chuyển.

### Viết HDC để app đọc đúng

- Mỗi phần có tiêu đề rõ: **PHẦN I. Trắc nghiệm**, **PHẦN II. Đúng/Sai**, **PHẦN III. Trả lời ngắn**, **PHẦN IV. Tự luận**.
- MC dùng bảng hàng số câu/hàng đáp án hoặc `Câu 1: C`. TF bảng a/b/c/d hoặc `Câu 1: Đ Đ S Đ`.
- Trả lời ngắn: `Câu 1: 2`; có thể dùng bảng kết quả đúng. Đơn vị/ghi chú giữ trong lời giải; ô đáp số chỉ số/cụm từ cần chấm.
- Lời giải chia bằng **Câu N/Bài N** trong đúng phần. Biểu điểm rõ từng bước; nút cộng điểm nhanh chỉ dùng khi dòng bước có điểm, chẳng hạn `Lập luận đúng (0,25đ)`.
- Cảnh báo diễn đạt mơ hồ giữ lại cho giáo viên. Ví dụ bài quỹ học bổng trong HDC mẫu phân biệt **9 năm trôi qua** với **cuối năm thứ 10**; giáo viên đọc hướng dẫn chấm trước cho điểm.

## Năm tình huống thường gặp

| Tình huống | Cách xử lý |
|---|---|
| PDF cắt lệch, Word có hình không đọc được | Chỉnh vùng cắt hoặc dùng PDF giữ nguyên hình; không tạo phòng khi hình bắt buộc chưa đầy đủ. PDF scan chưa có OCR thì dùng PDF có lớp chữ hoặc đề giấy. |
| Còn câu chưa có đáp án | Rà số thứ tự, để tiêu đề phần riêng dòng; dùng nút chọn đáp án hoặc sửa ở **“Đề và đáp án”**, bấm **“Lưu thay đổi”**. Hoàn tất trước bắt đầu. |
| Tên đã có trên thiết bị khác | Học sinh dùng lại thiết bị và tên cũ; nếu đổi máy, giáo viên bấm **“Cho vào lại”** sau kiểm đúng người. Thiết bị cũ mất quyền. |
| “Chưa lưu được, đang thử lại” | Giữ trang mở, khôi phục mạng, chờ **“✓ Đã lưu”**. Nếu đã hết giờ mà vẫn chưa gửi, báo giáo viên; không coi nháp trên máy là bài đã nộp. |
| Học sinh nộp nhầm quá sớm | Khi phòng còn chạy, giáo viên bấm **“Mở lại bài”**. Phòng đã kết thúc không mở lại bằng nút này. |

## Thẻ sáu dòng đọc cho học sinh

1. Em mở link cô/thầy gửi, nhập mã phòng và đúng họ tên.
2. Em chọn linh vật, bấm “Vào phòng”, chờ cô/thầy bắt đầu.
3. Em dùng “Bảng câu” để chọn câu; đánh dấu “Xem lại” khi cần.
4. Với tự luận, em chụp ảnh rõ đủ bài hoặc gõ lời giải; theo dõi “Đã lưu”.
5. Em giữ trang mở; mất mạng hoặc đổi thiết bị phải báo cô/thầy.
6. Em bấm “Nộp bài”, kiểm lại rồi xác nhận; đợi hiện “Em đã nộp bài”.

---

Căn cứ giao diện: `components/exam/ExamImport.tsx`, `ExamTeacher.tsx`, `ExamPlay.tsx`, `client.ts`; cú pháp đáp án: `lib/exam/answer-key.js`. Đây là hướng dẫn nhanh Markdown, chưa dàn trang A4 để xác nhận đúng một trang in.
