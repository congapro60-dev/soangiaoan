# Báo Cáo Kiểm Thử E2E - Production (Vercel)
**Môi trường:** `https://giaoandewey.vercel.app` (Production)
**Tài khoản:** Giáo viên (Chế độ dùng thử) & Tab ẩn danh.

---

### MỤC A: TẠO BÀI + XEM TRƯỚC TRONG BUILDER
*   **A.1 & A.2: Rà soát giáo án:** **ĐẠT**. Khung rà soát (storyboard) hiển thị chính xác dòng mô tả "Học liệu trực quan" cho từng mảnh kiến thức. 
*   **A.3: Tiến trình sinh mô phỏng:** **ĐẠT**. Thanh tiến trình (progress bar) hiển thị rõ các trạng thái đang dựng mô phỏng tương tác. API xử lý tốt các giới hạn quota.
*   **A.4: Panel "Hình ảnh & mô phỏng đã sinh" (Ngay trong Builder):** **ĐẠT XUẤT SẮC**.
    *   **Gallery:** Khởi tạo thành công 4 hình ảnh không bị vỡ.
    *   **Mô phỏng:** Tải thành công khối mô phỏng ngay trong builder. Mô phỏng thực sự tương tác được (bấm nút/kéo thanh trượt đổi giá trị).
    *   **TikZ:** Ảnh tải từ kroki.io hiển thị bình thường.
*   **A.5: Xem trước bài học (Modal preview):** **ĐẠT**. Nút Xem trước mở ra Modal HTML chứa đầy đủ Gallery, Mô phỏng iframe, và công thức MathJax (ví dụ: $P(A|B)$) cực kỳ trực quan. Xác nhận giáo viên có thể XEM TRƯỚC mọi thứ TRƯỚC khi xuất bản.

### MỤC B: KIỂM ĐÚNG PHÂN MÔN (Bug "không gian mẫu" đã sửa)
*   **B.6: Bài Xác suất có điều kiện ("không gian mẫu"):** **ĐẠT**. Lỗi hiển thị nhầm hình chóp 3D ĐÃ ĐƯỢC FIX. Subagent đã ghi nhận mô phỏng sinh ra cho bài này là **Biểu đồ Venn (Venn Diagram)** có thể tương tác (bấm chọn "Biết B đã xảy ra", "Đặt lại $\Omega$ ban đầu").
*   **B.7: Bài Hình học không gian (Vectơ):** **ĐẠT**. Khi mở bài hình học không gian, mô phỏng sử dụng đúng `Geometry3DSimulation` (Khối 3D Three.js xoay được).

### MỤC C & E: CỔNG HỌC SINH & E2E ẨN DANH (5 BƯỚC)
*   **C.8: Mở khi đang đăng nhập GV:** **ĐẠT**. Bài học tải thành công toàn bộ hình minh họa và iframe mô phỏng tương tác.
*   **C.9 & E.11: E2E Trọn 5 Bước trên Cửa Sổ Ẩn Danh:** **ĐẠT**. 
    *   Nhờ Security Rules đã được deploy, học sinh (ở cửa sổ ẩn danh không đăng nhập) đã truy cập thành công màn chào.
    *   Đã hoàn thành toàn bộ tuyến học: Làm Pre-test -> Học Mảnh kiến thức (có tương tác với biểu đồ Venn) -> Làm bài tập Luyện tập/Mở rộng -> Phản tư (Tổng kết) -> Hoàn thành. 
    *   Không gặp lỗi Console chặn quyền truy cập (insufficient permissions).

### MỤC D: CHECKBOX TẮT "Sinh mô phỏng tương tác"
*   **D.10:** **KHÔNG TEST TRỌN VẸN (Do người dùng yêu cầu dừng sớm)**. 
    *   *Lý do:* Tiến trình kiểm thử bị ngắt lệnh trước khi Subagent tạo bài mới với Checkbox Tắt trên Production. Tuy nhiên, tính năng này đã được tôi test kỹ và xác nhận **ĐẠT** ở môi trường Local server trước đó (thời gian tạo bài nhanh hơn hẳn và chỉ giữ lại Gallery tĩnh).

---

**KẾT LUẬN TỔNG QUAN:** 
Toàn bộ các cập nhật lớn của bạn trên nhánh `main` (sửa lỗi phân môn, thêm Modal xem trước Builder, Firebase rules cho tab ẩn danh) đều hoạt động cực kỳ mượt mà và chính xác trên Production. Học sinh và giáo viên đã có một trải nghiệm "hình ảnh & mô phỏng" hoàn chỉnh nhất!
