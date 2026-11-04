# KẾ HOẠCH DẠY HỌC — Diện tích hình thang cong và tích phân (Toán 12 · Tuần 13 · Tiết 92)

| Lớp | 12 | Tên bài học | Diện tích hình thang cong và tích phân | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-13-92.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu bài toán thực tế dẫn đến khái niệm tích phân: tính diện tích hình thang cong bằng phương pháp tổng Riemann xấp xỉ.
- **Should (Trọng tâm – Thông hiểu):** Nắm được giới hạn của tổng diện tích các hình chữ nhật nhỏ khi số khoảng chia tiến ra vô cực.
- **Could (Nâng cao – Vận dụng):** Mô tả ý nghĩa hình học của tích phân xác định ∫_a^b f(x) dx là diện tích phần mặt phẳng giới hạn bởi đồ thị hàm số.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Mô hình tính diện tích thửa ruộng ven sông theo đường cong parabol:**
- Bờ sông uốn lượn theo hàm số: $y = f(x) = x^2$ từ bờ cọc $x = 0$ đến $x = 1$ (đơn vị: 10 mét).
- Cần tính diện tích hình thang cong giới hạn bởi đồ thị $y = x^2$, trục hoành $Ox$, và đường thẳng $x = 1$.
- **Phương pháp chia nhỏ của Archimedes - Riemann:**
  - Chia đoạn $[0; 1]$ thành $n$ đoạn bằng nhau, mỗi đoạn có độ rộng $\Delta x = \dfrac{1}{n}$.
  - Các điểm chia: $x_k = \dfrac{k}{n}$ ($k = 0, 1, \dots, n$).
  - Dựng các hình chữ nhật có đáy $\Delta x$ và chiều cao $f(x_k) = \left(\dfrac{k}{n}\right)^2$.
- Tổng diện tích $n$ hình chữ nhật (tổng Riemann trên):
  $$S_n = \sum_{k=1}^n f(x_k) \Delta x = \sum_{k=1}^n \left(\dfrac{k}{n}\right)^2 \cdot \dfrac{1}{n} = \dfrac{1}{n^3} \sum_{k=1}^n k^2 = \dfrac{1}{n^3} \cdot \dfrac{n(n+1)(2n+1)}{6}.$$
- Rút gọn: $S_n = \dfrac{2n^3 + 3n^2 + n}{6n^3} = \dfrac{1}{3} + \dfrac{1}{2n} + \dfrac{1}{6n^2}$.
- **Cho số khoảng chia $n \to +\infty$:**
  $$S = \lim_{n \to +\infty} S_n = \lim_{n \to +\infty} \left(\dfrac{1}{3} + \dfrac{1}{2n} + \dfrac{1}{6n^2}\right) = \dfrac{1}{3} \approx 0{,}333 \text{ (33,3 m}^2\text{)}.$$
- Con số $1/3$ này chính là **tích phân xác định** $\int_0^1 x^2 dx = \dfrac{1}{3}$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Chia đoạn [0; 1] thành n phần nhỏ. Khi n tăng từ 10 lên 100 rồi 1000, tổng diện tích xấp xỉ tiến dần về một số cố định.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Khi số khoảng chia n tiến ra vô cực, diện tích chính xác của thửa ruộng bằng bao nhiêu?*
  - (A) 1/3 (đơn vị diện tích)
  - (B) 1/2
  - (C) Không xác định vì chia vô hạn
  - **Correct: (A)** — Giới hạn của tổng diện tích khi n -> +∞ là lim (1/3 + 1/2n + 1/6n²) = 1/3.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Nếu tính bằng tổng Riemann dưới thì giới hạn có ra cùng 1/3 không?
  2. `[SO SÁNH]` Diện tích tam giác thẳng có đáy 1, cao 1 là 1/2, tại sao parabol lại ra 1/3?
- **TeacherCue (lớp yếu):** Vẽ đồ thị parabol y = x² và các cột hình chữ nhật bậc thang ngày càng mảnh mịn.
- **LookFor:** HS thấy tổng diện tích bậc thang tiến về diện tích hình cong.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu bài toán thực tế dẫn đến khái niệm tích phân: tính diện tích hình thang cong bằng phương pháp tổng Riemann xấp xỉ.
- **Should:** Nắm được giới hạn của tổng diện tích các hình chữ nhật nhỏ khi số khoảng chia tiến ra vô cực.
- **Could:** Mô tả ý nghĩa hình học của tích phân xác định ∫_a^b f(x) dx là diện tích phần mặt phẳng giới hạn bởi đồ thị hàm số.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Tại sao việc chia nhỏ hình thang cong thành hàng nghìn hình chữ nhật hẹp lại cho ta diện tích chính xác tuyệt đối khi lấy giới hạn?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Khái niệm hình thang cong: Hình phẳng giới hạn bởi đồ thị hàm số liên tục $y = f(x) \ge 0$, trục hoành $y = 0$, và hai đường thẳng $x = a, x = b$.
- **Bước 2:** Tổng tích phân Riemann: $S_n = \sum_{k=1}^n f(\xi_k) \Delta x_k$ (tổng diện tích các cột chữ nhật).
- **Bước 3:** Định nghĩa tích phân: Giới hạn hữu hạn của tổng Riemann khi đường kính phân hoạch tiến về 0: $I = \lim_{\max \Delta x_k \to 0} S_n = \int_a^b f(x) dx$.
- **Bước 4:** Ý nghĩa hình học: Khi $f(x) \ge 0$, $\int_a^b f(x) dx$ biểu thị đúng diện tích $S$ của hình thang cong.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Nếu đồ thị f(x) nằm phía dưới trục hoành (f(x) < 0) thì tích phân mang dấu gì?
  2. `[PHÁT HIỆN]` Tại sao ký hiệu tích phân ∫ lại có hình chữ S kéo dài?
- **TeacherCue (lớp yếu):** Chữ S kéo dài tượng trưng cho "Summa" (Tổng) trong tiếng Latinh.
- **Chốt:** Tích phân xác định là giới hạn của tổng diện tích vô số hình chữ nhật vô cùng hẹp.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Tính diện tích hình phẳng giới hạn bởi đồ thị y = x³ và trục hoành trên đoạn [-1; 1]: AI tính S = ∫_{-1}^1 x³ dx = 0."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Đồ thị hàm số y = f(x) nằm dưới trục hoành từ a đến b. AI kết luận: Diện tích hình phẳng bằng ∫_a^b f(x) dx.
  2. Bằng chứng: Diện tích hình học thực tế luôn luôn là một số dương. Khi f(x) < 0 thì tích phân mang dấu âm, do đó diện tích phải bằng -∫_a^b f(x) dx hoặc ∫_a^b |f(x)| dx.
  3. Sửa: Công thức diện tích hình phẳng chuẩn tổng quát: S = ∫_a^b |f(x)| dx. Với f(x) ≤ 0 thì S = -∫_a^b f(x) dx.
- **TeacherCue:** Nhắc lại: Tích phân có thể âm, nhưng diện tích hình học không bao giờ âm.
- **LookFor:** HS phân biệt giá trị đại số của tích phân và diện tích hình học.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "hình thang cong có 4 biên: y = f(x), y = 0, x = a, x = b; diện tích bằng tích phân khi f(x) ≥ 0."
  - **S:** "nhớ công thức tổng bình phương: 1² + 2² + ... + n² = n(n+1)(2n+1)/6."
  - **C:** "chia đoạn không đều và chứng minh giới hạn độc lập với cách chọn điểm mẫu ξk."

- **Luồng M (Must) — hint: hình thang cong có 4 biên: y = f(x), y = 0, x = a, x = b; diện tích bằng tích phân khi f(x) ≥ 0.**
1. Tích phân ∫_2^2 (x² + 5) dx có giá trị bằng bao nhiêu?
   - **Đáp án:** Bằng 0 (hai cận bằng nhau).
2. Trong ký hiệu ∫_1^3 f(x) dx, số 1 gọi là gì và số 3 gọi là gì?
   - **Đáp án:** Số 1 là cận dưới, số 3 là cận trên.

- **Luồng S (Should) — hint: nhớ công thức tổng bình phương: 1² + 2² + ... + n² = n(n+1)(2n+1)/6.**
1. Tính I = ∫_0^5 3 dx bằng ý nghĩa hình học.
   - **Đáp án:** Miền phẳng là hình chữ nhật đáy rộng 5, cao 3. Diện tích = 3 · 5 = 15. Vậy I = 15.
2. Nếu hàm số f(x) liên tục và f(x) ≤ 0 trên [a; b] thì mối liên hệ giữa diện tích hình phẳng S và tích phân ∫_a^b f(x) dx là gì?
   - **Đáp án:** S = - ∫_a^b f(x) dx (diện tích bằng số đối của tích phân).

- **Luồng C (Could) — hint: chia đoạn không đều và chứng minh giới hạn độc lập với cách chọn điểm mẫu ξk.**
1. Tính diện tích hình phẳng giới hạn bởi nửa trên đường tròn y = √(9 - x²) và trục hoành trên đoạn [-3; 3].
   - **Đáp án:** Đây là diện tích của nửa hình tròn bán kính R = 3: S = (1/2) π R² = (1/2) π · 9 = 9π/2.
2. Cho hàm số f(x) = x khi 0 ≤ x ≤ 1 và f(x) = 2 - x khi 1 < x ≤ 2. Tính ∫_0^2 f(x) dx bằng hình học.
   - **Đáp án:** Đồ thị tạo thành tam giác cân có đáy trên trục Ox từ 0 đến 2 (độ dài 2) và đỉnh tại (1; 1) có chiều cao h = 1. Diện tích S = (1/2) · 2 · 1 = 1. Vậy tích phân bằng 1.

- **LookFor:** HS M nhận diện đúng 4 biên; HS S tính đúng giới hạn 1/3; HS C hiểu ý nghĩa Riemann.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho hàm số $y = 2x$ liên tục trên $[0; 3]$. Dùng hình học thuần túy (diện tích tam giác) tính $\int_0^3 2x dx$. → Hình thang cong là tam giác vuông có cạnh đáy $b = 3$ và chiều cao $h = 2 \cdot 3 = 6$. Diện tích: $S = (1/2) \cdot 3 \cdot 6 = 9$. Vậy $\int_0^3 2x dx = 9$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Ký hiệu tích phân ∫ xuất phát từ chữ S (Summa)" → **Đúng**
  - "Tích phân của hàm số f(x) liên tục luôn bằng diện tích hình phẳng" → **Sai — chỉ đúng khi f(x) ≥ 0**
  - "Tích phân ∫_a^a f(x) dx luôn luôn bằng 0" → **Đúng**
- **TeacherCue:** Đổi phiếu chấm chéo, kiểm tra kết quả diện tích tam giác vuông bằng 9.

- **Câu 1:** Tích phân xác định có phụ thuộc vào ký hiệu biến lấy tích phân không? → Không, ∫_a^b f(x) dx = ∫_a^b f(t) dt = ∫_a^b f(u) du (chỉ phụ thuộc vào hàm f và hai cận a, b).
- **Câu 2:** Có bao giờ diện tích của một hình phẳng bị giới hạn lại là một số âm không? → Không bao giờ, diện tích hình học luôn luôn không âm.
- **Chốt nhanh:** Chia nhỏ hình thang cong -> Lấy tổng Riemann -> Giới hạn n -> ∞ ra tích phân; f ≥ 0 thì S = ∫ f.

- Bồn chứa dầu ngầm công nghiệp có đáy cong theo phương trình elip, không thể đo bằng thước cuộn thông thường.
- Cảm biến laser chia bề mặt thành hàng triệu vi phân diện tích rồi tính tích phân thể tích tức thời.
- Quản lý kho xăng dầu toàn quốc dựa trên các thuật toán tích phân Riemann nhúng trong vi mạch.
- **TeacherCue:** Hỏi: "Làm thế nào cây xăng biết chính xác bồn chứa dưới lòng đất còn bao nhiêu lít xăng?"

- **Exit Ticket (4 mục):**
  1. Nêu ý nghĩa hình học của tích phân ∫_a^b f(x) dx khi f(x) ≥ 0.
  2. Nêu 1 bẫy (nhầm tích phân âm với diện tích hình học).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Hình thang cong giới hạn bởi y = x, y = 0, x = 0, x = 2 có diện tích bằng bao nhiêu?
- **TeacherCue (lớp yếu):** Nhìn lại hình ảnh chia nhỏ mảnh ruộng ven sông.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tích phân ∫_2^2 (x² + 5) dx có giá trị bằng bao nhiêu?
   - **Đáp án:** Bằng 0 (hai cận bằng nhau).
2. `[NB]` Trong ký hiệu ∫_1^3 f(x) dx, số 1 gọi là gì và số 3 gọi là gì?
   - **Đáp án:** Số 1 là cận dưới, số 3 là cận trên.
3. `[TH]` Tính I = ∫_0^5 3 dx bằng ý nghĩa hình học.
   - **Đáp án:** Miền phẳng là hình chữ nhật đáy rộng 5, cao 3. Diện tích = 3 · 5 = 15. Vậy I = 15.
4. `[TH]` Nếu hàm số f(x) liên tục và f(x) ≤ 0 trên [a; b] thì mối liên hệ giữa diện tích hình phẳng S và tích phân ∫_a^b f(x) dx là gì?
   - **Đáp án:** S = - ∫_a^b f(x) dx (diện tích bằng số đối của tích phân).
5. `[VD]` Tính diện tích hình phẳng giới hạn bởi nửa trên đường tròn y = √(9 - x²) và trục hoành trên đoạn [-3; 3].
   - **Đáp án:** Đây là diện tích của nửa hình tròn bán kính R = 3: S = (1/2) π R² = (1/2) π · 9 = 9π/2.
6. `[VD]` Cho hàm số f(x) = x khi 0 ≤ x ≤ 1 và f(x) = 2 - x khi 1 < x ≤ 2. Tính ∫_0^2 f(x) dx bằng hình học.
   - **Đáp án:** Đồ thị tạo thành tam giác cân có đáy trên trục Ox từ 0 đến 2 (độ dài 2) và đỉnh tại (1; 1) có chiều cao h = 1. Diện tích S = (1/2) · 2 · 1 = 1. Vậy tích phân bằng 1.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Cho rằng tích phân luôn luôn bằng diện tích (quên điều kiện f(x) ≥ 0).
- Đổi chỗ hai cận mà không đổi dấu tích phân.
- Nhầm lẫn giữa tích phân bất định (nguyên hàm ra hàm số + C) và tích phân xác định (ra một số cụ thể).

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
