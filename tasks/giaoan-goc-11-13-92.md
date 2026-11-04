# KẾ HOẠCH DẠY HỌC — Giới hạn hữu hạn của hàm số tại một điểm (Toán 11 · Tuần 13 · Tiết 92)

| Lớp | 11 | Tên bài học | Giới hạn hữu hạn của hàm số tại một điểm | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-13-92.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu định nghĩa giới hạn của hàm số tại một điểm lim_{x -> x0} f(x) = L qua ngôn ngữ dãy số.
- **Should (Trọng tâm – Thông hiểu):** Nắm vững các phép toán trên giới hạn hàm số; thành thạo phương pháp thay số trực tiếp và khử dạng 0/0 cơ bản bằng phân tích nhân tử.
- **Could (Nâng cao – Vận dụng):** Khử dạng vô định 0/0 có chứa căn thức bằng nhân liên hợp; áp dụng định lý kẹp cho hàm số.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Mô hình tính vận tốc tức thời của ô tô chuyển động:**
- Ô tô chuyển động theo phương trình quãng đường: $s(t) = 5t^2$ (mét, $t$ tính bằng giây).
- Vận tốc trung bình trong khoảng thời gian từ $t_0 = 2$ đến $t$ là:
  $$v_{tb} = \dfrac{s(t) - s(2)}{t - 2} = \dfrac{5t^2 - 20}{t - 2} = \dfrac{5(t^2 - 4)}{t - 2}.$$
- Khi $t = 2$, biểu thức có dạng vô định $\dfrac{0}{0}$ (không có nghĩa số học).
- Với mọi $t e 2$, ta rút gọn được:
  $$v_{tb} = \dfrac{5(t - 2)(t + 2)}{t - 2} = 5(t + 2).$$
- Cho $t$ tiến dần sát tới $2$ ($t \to 2$):
  $$v(2) = \lim_{t \to 2} v_{tb} = \lim_{t \to 2} 5(t + 2) = 5(2 + 2) = 20 \text{ m/s (72 km/h)}.$$
- **Định nghĩa tổng quát:** $\lim_{x \to x_0} f(x) = L$ nếu với mọi dãy số $(x_n)$ thuộc tập xác định ($x_n e x_0$) mà $x_n \to x_0$ thì $f(x_n) \to L$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Biểu thức vận tốc v(t) = 5(t² - 4)/(t - 2). Khi t tiến rất sát 2 nhưng không bằng 2.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Vận tốc tức thời của ô tô tại thời điểm t = 2 giây là bao nhiêu?*
  - (A) 20 m/s
  - (B) 0 m/s
  - (C) Không xác định vì mẫu bằng 0
  - **Correct: (A)** — Với t ≠ 2 thì 5(t² - 4)/(t - 2) = 5(t + 2). Khi t -> 2 thì 5(t + 2) -> 5(2 + 2) = 20 m/s.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Giới hạn lim_{x -> x0} f(x) có phụ thuộc vào việc f(x0) có xác định hay không?
  2. `[SO SÁNH]` Phép khử nhân tử chung (t - 2) dựa trên điều kiện gì của t?
- **TeacherCue (lớp yếu):** Vẽ đồ thị hàm số y = 5(x + 2) bị khoét một điểm rỗng tại x = 2.
- **LookFor:** HS hiểu x tiến tới x0 nghĩa là x KHÁC x0.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu định nghĩa giới hạn của hàm số tại một điểm lim_{x -> x0} f(x) = L qua ngôn ngữ dãy số.
- **Should:** Nắm vững các phép toán trên giới hạn hàm số; thành thạo phương pháp thay số trực tiếp và khử dạng 0/0 cơ bản bằng phân tích nhân tử.
- **Could:** Khử dạng vô định 0/0 có chứa căn thức bằng nhân liên hợp; áp dụng định lý kẹp cho hàm số.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Tại sao khi tính lim_{x -> 2} (x² - 4)/(x - 2) ta không thể chỉ đơn giản thay x = 2 vào hàm số?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Bước 1: Thay trực tiếp $x = x_0$ vào hàm số $f(x)$.
- **Bước 2:** Trường hợp 1 (Xác định): Nếu ra số hữu hạn $L$ thì $\lim_{x \to x_0} f(x) = L$.
- **Bước 3:** Trường hợp 2 (Dạng vô định $0/0$): Phân tích tử và mẫu thành nhân tử chứa $(x - x_0)$ rồi triệt tiêu.
- **Bước 4:** Trường hợp 3 (Căn thức $0/0$): Nhân lượng liên hợp để xuất hiện nhân tử $(x - x_0)$ rồi rút gọn.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Khi thay x0 vào mà mẫu bằng 0 còn tử khác 0 thì giới hạn ra gì?
  2. `[PHÁT HIỆN]` Tại sao đa thức x² - 4 luôn phân tích được thành (x - 2)(x + 2)?
- **TeacherCue (lớp yếu):** Sơ đồ cây thuật toán tính giới hạn tại một điểm.
- **Chốt:** Thay số trước; nếu gặp 0/0 thì phân tích nhân tử hoặc nhân liên hợp để triệt tiêu (x - x0).

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Tính lim_{x -> 1} (x² - 1)/(x - 1). Thay x = 1 vào hàm số ta được 0/0. Vì phép chia cho 0 không xác định nên giới hạn không tồn tại."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Tính lim_{x -> 3} (x² - 9)/(x - 3). AI thay x = 3 được 0/0 và kết luận giới hạn không tồn tại vì phép chia cho 0 không xác định.
  2. Bằng chứng: Dạng 0/0 là dạng vô định, không phải là kết luận vô nghiệm hay không tồn tại. x tiến tới 3 chứ x không bao giờ bằng 3.
  3. Sửa: Phải khử dạng vô định: (x² - 9)/(x - 3) = (x - 3)(x + 3)/(x - 3) = x + 3. Khi x -> 3 giới hạn bằng 3 + 3 = 6.
- **TeacherCue:** Nhấn mạnh: \"0/0 là tín hiệu bắt đầu khử vô định, không phải là kết quả cuối cùng\".
- **LookFor:** HS nhận ra phải triệt tiêu nhân tử (x - 3).

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "thay x = x0 vào trước; nếu mẫu khác 0 thì tính luôn giá trị."
  - **S:** "dùng hằng đẳng thức hoặc bấm máy tìm nghiệm để tách tử thành a(x - x0)(x - x1)."
  - **C:** "nhân liên hợp cho phần căn thức: (√A - B)(√A + B) = A - B²."

- **Luồng M (Must) — hint: thay x = x0 vào trước; nếu mẫu khác 0 thì tính luôn giá trị.**
1. Tính lim_{x -> -1} (2x + 5).
   - **Đáp án:** Thay x = -1: 2(-1) + 5 = 3.
2. Biểu thức (x² - 1) khi x tiến về 1 triệt tiêu nhân tử nào?
   - **Đáp án:** Triệt tiêu nhân tử (x - 1) vì x² - 1 = (x - 1)(x + 1).

- **Luồng S (Should) — hint: dùng hằng đẳng thức hoặc bấm máy tìm nghiệm để tách tử thành a(x - x0)(x - x1).**
1. Tính lim_{x -> 4} (x² - 16)/(x - 4).
   - **Đáp án:** lim_{x -> 4} (x - 4)(x + 4)/(x - 4) = lim_{x -> 4} (x + 4) = 4 + 4 = 8.
2. Tính lim_{x -> 1} (x³ - 1)/(x - 1).
   - **Đáp án:** x³ - 1 = (x - 1)(x² + x + 1). Giới hạn = lim_{x -> 1} (x² + x + 1) = 1 + 1 + 1 = 3.

- **Luồng C (Could) — hint: nhân liên hợp cho phần căn thức: (√A - B)(√A + B) = A - B².**
1. Tính giới hạn: lim_{x -> 0} [√(x + 4) - 2] / x.
   - **Đáp án:** Dạng 0/0. Nhân liên hợp: lim_{x -> 0} (x + 4 - 4) / [x(√(x + 4) + 2)] = lim_{x -> 0} x / [x(√(x + 4) + 2)] = lim_{x -> 0} 1 / [√(x + 4) + 2] = 1 / (2 + 2) = 1/4.
2. Tìm m để giới hạn lim_{x -> 2} (x² - mx + 2)/(x - 2) là một số hữu hạn.
   - **Đáp án:** Để giới hạn hữu hạn thì x = 2 phải là nghiệm của tử số: 2² - m·2 + 2 = 0 <=> 6 - 2m = 0 <=> m = 3. Khi m = 3 thì tử là x² - 3x + 2 = (x - 2)(x - 1), giới hạn = 2 - 1 = 1.

- **LookFor:** HS M thay số đúng; HS S tách nhân tử thành thạo; HS C nhân liên hợp chuẩn.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tính giới hạn: $\lim_{x \to 1} \dfrac{x^2 + 2x - 3}{x - 1}$. → Thay $x = 1$ ra dạng $0/0$. Tách tử: $x^2 + 2x - 3 = (x - 1)(x + 3)$. Giới hạn $= \lim_{x \to 1} (x + 3) = 1 + 3 = 4$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - \"lim_{x -> x0} c = c với c là hằng số\" → **Đúng**
  - \"Nếu f(x0) không xác định thì lim_{x -> x0} f(x) chắc chắn không tồn tại\" → **Sai — ví dụ (x²-4)/(x-2) tại x=2**
  - \"Dạng 0/0 khử bằng cách triệt tiêu nhân tử (x - x0)\" → **Đúng**
- **TeacherCue:** Đổi phiếu chấm chéo, chú ý tách tử thành (x - 1)(x + 3).

- **Câu 1:** Nếu hàm số f(x) liên tục tại x0 thì lim_{x -> x0} f(x) bằng gì? → Bằng chính f(x0).
- **Câu 2:** Có bao giờ giới hạn tại một điểm ra vô cực không? → Có, ví dụ lim_{x -> 0} (1/x²) = +∞.
- **Chốt nhanh:** Thay số trực tiếp -> Gặp 0/0 thì tách (x - x0) hoặc nhân liên hợp -> Rút gọn rồi thay lại.

- Giới hạn tỉ số Δy/Δx khi Δx -> 0 chính là định nghĩa đạo hàm - công cụ quyền lực nhất giải tích.
- Cảm biến gia tốc trong điện thoại thông minh (xoay màn hình, đếm bước chân) đo đạo hàm vận tốc tức thời.
- Mọi thuật toán vật lý trong phần mềm mô phỏng đều dựa trên giới hạn tỉ số vi phân này.
- **TeacherCue:** Hỏi: \"Làm sao điện thoại biết được ta vừa lắc nhẹ hay vung mạnh tay?\"

- **Exit Ticket (4 mục):**
  1. Nêu các bước tính giới hạn hàm số tại một điểm.
  2. Nêu 1 bẫy (thấy 0/0 vội kết luận giới hạn không tồn tại).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tính lim_{x -> 2} (x - 2)/(x² - 4).
- **TeacherCue (lớp yếu):** Nhìn lại đồ thị vận tốc tức thời của ô tô.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tính lim_{x -> -1} (2x + 5).
   - **Đáp án:** Thay x = -1: 2(-1) + 5 = 3.
2. `[NB]` Biểu thức (x² - 1) khi x tiến về 1 triệt tiêu nhân tử nào?
   - **Đáp án:** Triệt tiêu nhân tử (x - 1) vì x² - 1 = (x - 1)(x + 1).
3. `[TH]` Tính lim_{x -> 4} (x² - 16)/(x - 4).
   - **Đáp án:** lim_{x -> 4} (x - 4)(x + 4)/(x - 4) = lim_{x -> 4} (x + 4) = 4 + 4 = 8.
4. `[TH]` Tính lim_{x -> 1} (x³ - 1)/(x - 1).
   - **Đáp án:** x³ - 1 = (x - 1)(x² + x + 1). Giới hạn = lim_{x -> 1} (x² + x + 1) = 1 + 1 + 1 = 3.
5. `[VD]` Tính giới hạn: lim_{x -> 0} [√(x + 4) - 2] / x.
   - **Đáp án:** Dạng 0/0. Nhân liên hợp: lim_{x -> 0} (x + 4 - 4) / [x(√(x + 4) + 2)] = lim_{x -> 0} x / [x(√(x + 4) + 2)] = lim_{x -> 0} 1 / [√(x + 4) + 2] = 1 / (2 + 2) = 1/4.
6. `[VD]` Tìm m để giới hạn lim_{x -> 2} (x² - mx + 2)/(x - 2) là một số hữu hạn.
   - **Đáp án:** Để giới hạn hữu hạn thì x = 2 phải là nghiệm của tử số: 2² - m·2 + 2 = 0 <=> 6 - 2m = 0 <=> m = 3. Khi m = 3 thì tử là x² - 3x + 2 = (x - 2)(x - 1), giới hạn = 2 - 1 = 1.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Vội vã kết luận giới hạn không tồn tại khi thấy dạng 0/0.
- Rút gọn sai dấu khi phân tích tam thức bậc hai.
- Quên chia lại lượng liên hợp ở mẫu.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
