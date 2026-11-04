# KẾ HOẠCH DẠY HỌC — Giới hạn vô cực của dãy số (Toán 11 · Tuần 13 · Tiết 90)

| Lớp | 11 | Tên bài học | Giới hạn vô cực của dãy số | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-13-90.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu định nghĩa dãy số dần tới vô cực lim un = +∞ hoặc -∞; các giới hạn mẫu lim n^k = +∞, lim q^n = +∞ (q > 1).
- **Should (Trọng tâm – Thông hiểu):** Thành thạo quy tắc tìm giới hạn của tích và thương khi có yếu tố vô cực; đặt lũy thừa bậc cao nhất ra ngoài làm nhân tử chung.
- **Could (Nâng cao – Vận dụng):** Chứng minh giới hạn vô cực bằng bất đẳng thức; phân biệt các dạng vô định ∞ - ∞ và ∞/∞.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Mô hình tăng trưởng số lượng tế bào nấm men theo thời gian:**
- Ban đầu có 1 tế bào, sau mỗi chu kỳ $n$ giờ số lượng tế bào phân chia theo cấp số nhân:
  $$u_n = 2^n \quad (n = 1, 2, 3, \dots).$$
- Khảo sát các giá trị khi $n$ tăng:
  - $n = 10 \implies u_{10} = 1024$ tế bào.
  - $n = 20 \implies u_{20} = 1\,048\,576$ tế bào (vượt 1 triệu).
  - $n = 30 \implies u_{30} = 1\,073\,741\,824$ tế bào (vượt 1 tỷ).
- **Nhận xét trực quan:** Số hạng $u_n$ có thể lớn hơn bất kỳ số dương lớn tùy ý nào kể từ một số hạng nào đó trở đi.
- Ký hiệu: $\lim_{n \to +\infty} u_n = +\infty$ hay $\lim 2^n = +\infty$.
- **Định nghĩa tổng quát:** Dãy số $(u_n)$ có giới hạn là $+\infty$ nếu $u_n$ lớn hơn mọi số dương lớn tùy ý kể từ một số hạng nào đó trở đi.
- Quy tắc đa thức: $\lim (a_k n^k + \dots + a_0) = \lim n^k (a_k + \dots) = \text{dấu}(a_k) \cdot (+\infty)$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Dãy số u_n = 2^n tăng trưởng theo từng giờ. Sau 30 giờ số tế bào vượt 1 tỷ.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Giới hạn của dãy u_n khi n tiến ra vô cực là gì?*
  - (A) Tiến ra dương vô cực (+∞)
  - (B) Bằng 1 tỷ
  - (C) Không xác định
  - **Correct: (A)** — Vì cơ số q = 2 > 1 nên 2^n tăng không bị chặn, lớn hơn mọi số dương M tùy ý, lim 2^n = +∞.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Dãy v_n = -n³ có giới hạn bằng bao nhiêu?
  2. `[SO SÁNH]` Giới hạn +∞ và không có giới hạn khác nhau như thế nào?
- **TeacherCue (lớp yếu):** Vẽ đồ thị hàm số mũ 2^n vọt thẳng đứng lên phía trên.
- **LookFor:** HS phân biệt dãy phân kỳ ra vô cực và dãy dao động.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu định nghĩa dãy số dần tới vô cực lim un = +∞ hoặc -∞; các giới hạn mẫu lim n^k = +∞, lim q^n = +∞ (q > 1).
- **Should:** Thành thạo quy tắc tìm giới hạn của tích và thương khi có yếu tố vô cực; đặt lũy thừa bậc cao nhất ra ngoài làm nhân tử chung.
- **Could:** Chứng minh giới hạn vô cực bằng bất đẳng thức; phân biệt các dạng vô định ∞ - ∞ và ∞/∞.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khi n tiến ra vô cực, đa thức P(n) có giới hạn được quyết định hoàn toàn bởi số hạng nào?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Giới hạn cơ bản 1: $\lim n^k = +\infty$ với mọi $k$ nguyên dương ($k \ge 1$).
- **Bước 2:** Giới hạn cơ bản 2: $\lim q^n = +\infty$ khi $q > 1$.
- **Bước 3:** Quy tắc nhân tử chung: Rút lũy thừa bậc cao nhất của $n$ ra ngoài: $\lim P(n) = \lim n^k [a_k + P_{k-1}(n)/n^k]$.
- **Bước 4:** Quy tắc thương $u_n / v_n$: Nếu $\lim u_n = a > 0$ và $\lim v_n = 0$ với $v_n > 0$ thì $\lim (u_n / v_n) = +\infty$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Giới hạn của -5n² khi n -> +∞ bằng gì?
  2. `[PHÁT HIỆN]` Khi nào thương của hai dãy tiến về 0 ra vô cực?
- **TeacherCue (lớp yếu):** Bảng quy tắc dấu khi nhân và chia với vô cực.
- **Chốt:** Rút lũy thừa bậc cao nhất ra ngoài để cô lập phần tiến ra vô cực và phần tiến về hằng số.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Tính lim (2n² - 3n³). Ta có lim 2n² = +∞ và lim 3n³ = +∞ nên lim (2n² - 3n³) = +∞ - (+∞) = 0."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Tính lim (n² - n³): AI viết lim n² = +∞ và lim n³ = +∞ nên lim (n² - n³) = +∞ - (+∞) = 0.
  2. Bằng chứng: Dạng ∞ - ∞ là một dạng vô định, không được thực hiện phép trừ đại số như hai số hữu hạn. Bậc cao nhất n³ sẽ chi phối toàn bộ biểu thức.
  3. Sửa: Phải rút n³ ra ngoài: n² - n³ = n³ (1/n - 1). Vì lim n³ = +∞ và lim (1/n - 1) = -1 < 0 nên giới hạn bằng -∞.
- **TeacherCue:** Nhắc lại: vô cực không phải là một số, không có phép tính ∞ - ∞ = 0.
- **LookFor:** HS nhận diện dạng vô định và rút lũy thừa cao nhất.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "rút lũy thừa bậc cao nhất của n ra ngoài ngoặc; tính giới hạn của từng thừa số."
  - **S:** "áp dụng quy tắc xét dấu: tích của (+∞) với số âm ra (-∞); tích với số dương ra (+∞)."
  - **C:** "nhân lượng liên hợp để khử dạng vô định ∞ - ∞ đối với biểu thức chứa căn thức."

- **Luồng M (Must) — hint: rút lũy thừa bậc cao nhất của n ra ngoài ngoặc; tính giới hạn của từng thừa số.**
1. Tính lim (n⁴).
   - **Đáp án:** lim n⁴ = +∞ theo công thức cơ bản lim n^k = +∞ với k = 4.
2. Dãy u_n = (1,5)^n có giới hạn bằng bao nhiêu?
   - **Đáp án:** Bằng +∞ vì cơ số q = 1,5 > 1.

- **Luồng S (Should) — hint: áp dụng quy tắc xét dấu: tích của (+∞) với số âm ra (-∞); tích với số dương ra (+∞).**
1. Tính giới hạn: lim (-4n³ + 2n² + 1).
   - **Đáp án:** Rút n³: lim n³ (-4 + 2/n + 1/n³) = (+∞) · (-4) = -∞.
2. Tính giới hạn: lim [(2n + 1) / (1/n)].
   - **Đáp án:** Biểu thức bằng 2n² + n. Khi n -> +∞ giới hạn bằng +∞.

- **Luồng C (Could) — hint: nhân lượng liên hợp để khử dạng vô định ∞ - ∞ đối với biểu thức chứa căn thức.**
1. Tính giới hạn: lim [√(n² + 4n) - n].
   - **Đáp án:** Dạng ∞ - ∞. Nhân liên hợp: lim [4n / (√(n² + 4n) + n)] = lim [4 / (√(1 + 4/n) + 1)] = 4 / (1 + 1) = 2.
2. Tìm a để giới hạn lim (an² + 2n) / (3n - 1) = -∞.
   - **Đáp án:** Chia bậc cao nhất: để giới hạn bằng -∞ thì bậc tử phải lớn hơn bậc mẫu và dấu của a phải âm. Vì bậc tử là 2 > bậc mẫu là 1 nên ta cần a < 0.

- **LookFor:** HS M rút đúng nhân tử; HS S xét đúng dấu; HS C nhân liên hợp thành thạo.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tính giới hạn: $\lim (-2n^3 + 5n - 1)$. → Rút $n^3$: $\lim n^3 (-2 + 5/n^2 - 1/n^3)$. Vì $\lim n^3 = +\infty$ và $\lim (-2 + 5/n^2 - 1/n^3) = -2 < 0$ nên giới hạn bằng $-\infty$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - \"lim n^k = +∞ với mọi số nguyên dương k\" → **Đúng**
  - \"∞ - ∞ luôn luôn bằng 0\" → **Sai — đây là dạng vô định**
  - \"Nếu lim un = +∞ và lim vn = -2 thì lim (un · vn) = -∞\" → **Đúng**
- **TeacherCue:** Đổi phiếu chấm chéo, chú ý dấu âm của hệ số cao nhất -2.

- **Câu 1:** Có phải mọi dãy số tăng đều tiến ra dương vô cực không? → Không, dãy tăng nhưng bị chặn trên thì tiến về một số hữu hạn (ví dụ u_n = 1 - 1/n tiến về 1).
- **Câu 2:** Dãy (-2)^n có giới hạn bằng +∞ không? → Không, dãy đan dấu (-2, 4, -8, 16,...) dao động không có giới hạn.
- **Chốt nhanh:** Bậc cao nhất chi phối; rút n^k ra ngoài; xét dấu thừa số hằng số; ∞ - ∞ phải khử vô định.

- Thời gian chạy của thuật toán khi dữ liệu đầu vào n tăng vô hạn được đo bằng giới hạn vô cực: O(n), O(n²), O(2^n).
- Thuật toán có độ phức tạp lũy thừa O(2^n) bị xem là không khả thi vì thời gian chạy tiến ra vô cực quá nhanh.
- Tối ưu hóa mã nguồn là tìm cách kéo giảm bậc của n khi n tiến ra vô cực.
- **TeacherCue:** Hỏi: \"Tại sao các lập trình viên luôn tránh dùng thuật toán có thời gian chạy O(2^n)?\"

- **Exit Ticket (4 mục):**
  1. Nêu định nghĩa lim un = +∞ và các giới hạn mẫu.
  2. Nêu 1 bẫy (lấy ∞ - ∞ = 0 mà không rút nhân tử chung).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tính lim (4n² - n) khi n tiến ra vô cực.
- **TeacherCue (lớp yếu):** Nhìn lại đồ thị tăng trưởng nấm men mở đầu.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tính lim (n⁴).
   - **Đáp án:** lim n⁴ = +∞ theo công thức cơ bản lim n^k = +∞ với k = 4.
2. `[NB]` Dãy u_n = (1,5)^n có giới hạn bằng bao nhiêu?
   - **Đáp án:** Bằng +∞ vì cơ số q = 1,5 > 1.
3. `[TH]` Tính giới hạn: lim (-4n³ + 2n² + 1).
   - **Đáp án:** Rút n³: lim n³ (-4 + 2/n + 1/n³) = (+∞) · (-4) = -∞.
4. `[TH]` Tính giới hạn: lim [(2n + 1) / (1/n)].
   - **Đáp án:** Biểu thức bằng 2n² + n. Khi n -> +∞ giới hạn bằng +∞.
5. `[VD]` Tính giới hạn: lim [√(n² + 4n) - n].
   - **Đáp án:** Dạng ∞ - ∞. Nhân liên hợp: lim [4n / (√(n² + 4n) + n)] = lim [4 / (√(1 + 4/n) + 1)] = 4 / (1 + 1) = 2.
6. `[VD]` Tìm a để giới hạn lim (an² + 2n) / (3n - 1) = -∞.
   - **Đáp án:** Chia bậc cao nhất: để giới hạn bằng -∞ thì bậc tử phải lớn hơn bậc mẫu và dấu của a phải âm. Vì bậc tử là 2 > bậc mẫu là 1 nên ta cần a < 0.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Xem vô cực như một con số và thực hiện phép trừ ∞ - ∞ = 0.
- Quên xét dấu của hệ số khi nhân với +∞ dẫn đến sai dấu kết quả.
- Nhầm dãy dao động (-q)^n với dãy hội tụ hoặc phân kỳ ra vô cực.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
