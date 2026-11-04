# KẾ HOẠCH DẠY HỌC — Giới hạn của dãy số (Toán 11 · Tuần 12 · Tiết 84)

| Lớp | 11 | Tên bài học | Giới hạn của dãy số | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-12-84.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu định nghĩa giới hạn hữu hạn của dãy số lim u_n = a và lim u_n = 0.
- **Should (Trọng tâm – Thông hiểu):** Biết các giới hạn cơ bản lim (1/n^k) = 0, lim q^n = 0 (|q| < 1), lim c = c.
- **Could (Nâng cao – Vận dụng):** Chứng minh một dãy số có giới hạn 0 bằng định nghĩa; áp dụng vào quá trình suy giảm thực tế.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Quá trình phân rã nồng độ thuốc trong máu sau khi tiêm:**
- Ban đầu nồng độ là $C_0 = 100$ mg/L. Sau mỗi giờ $n$, nồng độ còn lại giảm theo quy luật:
  $$u_n = \dfrac{100}{n} \quad (\text{mg/L}, n = 1, 2, 3, \dots).$$
- Khảo sát các giá trị khi $n$ tăng:
  - $n = 1 \implies u_1 = 100$ mg/L.
  - $n = 10 \implies u_{10} = 10$ mg/L.
  - $n = 1\,000 \implies u_{1000} = 0{,}1$ mg/L.
  - $n = 1\,000\,000 \implies u_n = 0{,}0001$ mg/L.
- **Nhận xét trực quan:** Khi $n$ tăng vô hạn ($n \to +\infty$), khoảng cách $|u_n - 0|$ có thể nhỏ hơn bất kỳ số dương bé tùy ý nào.
- Ký hiệu: $\lim_{n \to +\infty} u_n = 0$ hay $\lim \dfrac{100}{n} = 0$.
- **Định nghĩa tổng quát:** Dãy số $(u_n)$ có giới hạn là $a$ (kí hiệu $\lim u_n = a$) nếu $\lim (u_n - a) = 0$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Dãy nồng độ u_n = 100/n (mg/L). Khi thời gian n tăng lên hàng triệu giờ, u_n tiến dần về giá trị nào?
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Giới hạn của dãy số u_n khi n tiến ra vô cực là bao nhiêu?*
  - (A) Bằng 0 (lim u_n = 0)
  - (B) Bằng 1
  - (C) Không xác định
  - **Correct: (A)** — Khi n càng lớn, 100/n càng gần 0 và có thể nhỏ hơn bất kỳ số dương nào tùy ý, nên lim(100/n) = 0.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Giá trị u_n có bao giờ thực sự bằng 0 với n hữu hạn không?
  2. `[SO SÁNH]` Dãy v_n = (-1/2)^n có giới hạn bằng bao nhiêu khi n tăng?
- **TeacherCue (lớp yếu):** Vẽ đồ thị các điểm (n; 100/n) tiệm cận dần về trục hoành nhưng không cắt trục.
- **LookFor:** HS hiểu giới hạn là xu thế tiệm cận, không phải phép gán bằng ở bước hữu hạn.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu định nghĩa giới hạn hữu hạn của dãy số lim u_n = a và lim u_n = 0.
- **Should:** Biết các giới hạn cơ bản lim (1/n^k) = 0, lim q^n = 0 (|q| < 1), lim c = c.
- **Could:** Chứng minh một dãy số có giới hạn 0 bằng định nghĩa; áp dụng vào quá trình suy giảm thực tế.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khẳng định "khi n rất lớn thì 1/n bằng 0" đúng hay sai? Cần phát biểu chuẩn xác như thế nào?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Định nghĩa: $\lim u_n = 0 \iff |u_n|$ có thể nhỏ hơn mọi số dương bé tùy ý kể từ một số hạng nào đó trở đi.
- **Bước 2:** Định nghĩa tổng quát: $\lim u_n = a \iff \lim (u_n - a) = 0$.
- **Bước 3:** Giới hạn cơ bản 1: $\lim \dfrac{1}{n} = 0$; tổng quát $\lim \dfrac{1}{n^k} = 0$ ($k \in \mathbb{Z}^+$).
- **Bước 4:** Giới hạn cơ bản 2: $\lim q^n = 0$ nếu $|q| < 1$; $\lim c = c$ ($c$ là hằng số).
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Tại sao dãy (1,5)^n không có giới hạn bằng 0?
  2. `[PHÁT HIỆN]` Dãy số u_n = (-1)^n có giới hạn không?
- **TeacherCue (lớp yếu):** Bảng các giới hạn 0 quen thuộc: 1/n, 1/n², 1/√n, (0,5)^n.
- **Chốt:** Khi n tiến ra vô cực: phân số có mẫu tăng vô hạn thì tiến về 0; lũy thừa cơ số tuyệt đối nhỏ hơn 1 tiến về 0.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Dãy số u_n = (4/3)^n có dạng lũy thừa q^n nên lim (4/3)^n = 0."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Tính lim (1,2)^n: AI viết vì 1,2 là số dương nên lim (1,2)^n = 0 theo quy tắc q^n tiến về 0.
  2. Bằng chứng: Quy tắc lim q^n = 0 chỉ đúng khi |q| < 1. Ở đây q = 1,2 > 1 nên (1,2)^n tăng vô hạn khi n tăng.
  3. Sửa: q = 1,2 > 1 nên dãy số (1,2)^n không có giới hạn hữu hạn (dãy tiến ra +∞).
- **TeacherCue:** Yêu cầu HS tính thử vài giá trị: 1,2^1 = 1,2; 1,2^10 ≈ 6,19; 1,2^50 ≈ 9100 để thấy tăng nhanh.
- **LookFor:** HS chỉ ra điều kiện bắt buộc |q| < 1.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "áp dụng trực tiếp các giới hạn mẫu: lim 1/n^k = 0; lim q^n = 0 (|q| < 1); lim c = c."
  - **S:** "tách dãy u_n thành hiệu với số a: chứng minh lim(u_n - a) = 0."
  - **C:** "dùng bất đẳng thức kẹp để tìm giới hạn các dãy có dấu đan xen như (-1)^n / n."

- **Luồng M (Must) — hint: áp dụng trực tiếp các giới hạn mẫu: lim 1/n^k = 0; lim q^n = 0 (|q| < 1); lim c = c.**
1. Tính lim (1/n³).
   - **Đáp án:** lim (1/n³) = 0 theo công thức cơ bản lim(1/n^k) = 0 với k = 3.
2. Dãy số u_n = (0,99)^n có giới hạn bằng bao nhiêu khi n tiến ra vô cực?
   - **Đáp án:** Bằng 0 vì |0,99| < 1.

- **Luồng S (Should) — hint: tách dãy u_n thành hiệu với số a: chứng minh lim(u_n - a) = 0.**
1. Chứng minh rằng dãy số u_n = (3n - 1)/(n + 2) có giới hạn bằng 3 khi n -> +∞.
   - **Đáp án:** u_n - 3 = (3n - 1 - 3n - 6)/(n + 2) = -7/(n + 2). Vì |-7/(n+2)| < 7/n -> 0 nên lim(u_n - 3) = 0 -> lim u_n = 3.
2. Tìm giới hạn của dãy số u_n = 5 - (1/2)^n + 2/n.
   - **Đáp án:** lim u_n = lim 5 - lim(1/2)^n + 2·lim(1/n) = 5 - 0 + 0 = 5.

- **Luồng C (Could) — hint: dùng bất đẳng thức kẹp để tìm giới hạn các dãy có dấu đan xen như (-1)^n / n.**
1. Cho dãy u_n = cos(n) / n. Chứng minh lim u_n = 0.
   - **Đáp án:** Ta có |cos n| ≤ 1 với mọi n nên 0 ≤ |u_n| ≤ 1/n. Vì lim 0 = lim(1/n) = 0 nên theo định lý kẹp, lim u_n = 0.
2. Một chất phóng xạ có chu kỳ bán rã 1 ngày. Khối lượng còn lại sau n ngày là m_n = m0 · (1/2)^n. Hỏi khi n -> +∞ thì khối lượng chất phóng xạ tiến về đâu?
   - **Đáp án:** lim m_n = m0 · lim(1/2)^n = m0 · 0 = 0. Sau thời gian rất dài chất phóng xạ phân rã gần như hoàn toàn.

- **LookFor:** HS M nhận diện đúng giới hạn cơ bản; HS S chứng minh được lim=a; HS C dùng được kẹp.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tính các giới hạn sau: (a) $\lim \dfrac{5}{n^2}$; (b) $\lim \left(-\dfrac{1}{3}\right)^n$; (c) $\lim 7$. → (a) $5 \cdot 0 = 0$; (b) $= 0$ vì $|-1/3| = 1/3 < 1$; (c) $= 7$ (hằng số).
- **Câu hỏi bảng con (Đúng/Sai):**
  - "lim q^n = 0 với mọi số thực q" → **Sai — chỉ đúng khi |q| < 1**
  - "lim (1/n) = 0" → **Đúng**
  - "Nếu lim u_n = a thì kể từ một số hạng nào đó u_n phải đúng bằng a" → **Sai — chỉ cần tiến sát a**
- **TeacherCue:** Đổi phiếu chấm chéo, chú ý điều kiện cơ số |q| < 1.

- **Câu 1:** Dãy số u_n = 2^n có giới hạn bằng 0 không? Vì sao? → Không, vì cơ số q = 2 > 1 nên các số hạng tăng vô hạn (2, 4, 8, 16,...), không tiến về 0.
- **Câu 2:** Nếu lim u_n = 0 thì lim |u_n| bằng bao nhiêu? → Bằng 0 vì ||u_n| - 0| = |u_n| -> 0.
- **Chốt nhanh:** lim 1/n^k = 0; lim q^n = 0 khi |q| < 1; lim c = c; lim(u_n - a) = 0 -> lim u_n = a.

- Các thuật toán tối ưu hóa Gradient Descent trong AI lặp vô hạn bước để tiệm cận nghiệm tối ưu.
- Sai số giữa nghiệm gần đúng và nghiệm thực tế tuân theo dãy có giới hạn 0.
- Khái niệm giới hạn mở đường cho đạo hàm, tích phân và toàn bộ toán học giải tích hiện đại.
- **TeacherCue:** Hỏi: "Tại sao máy tính chỉ tính được số hữu hạn nhưng lại giải được bài toán liên tục?"

- **Exit Ticket (4 mục):**
  1. Nêu định nghĩa lim u_n = 0 và các giới hạn cơ bản.
  2. Nêu 1 bẫy (áp dụng lim q^n = 0 cho q ≥ 1; nhầm lim với giá trị số hạng).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Dãy u_n = 3 + 1/n có giới hạn bằng bao nhiêu khi n tiến ra vô cực?
- **TeacherCue (lớp yếu):** Nhìn lại đồ thị nồng độ thuốc mở đầu.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Tính lim (1/n³).
   - **Đáp án:** lim (1/n³) = 0 theo công thức cơ bản lim(1/n^k) = 0 với k = 3.
2. `[NB]` Dãy số u_n = (0,99)^n có giới hạn bằng bao nhiêu khi n tiến ra vô cực?
   - **Đáp án:** Bằng 0 vì |0,99| < 1.
3. `[TH]` Chứng minh rằng dãy số u_n = (3n - 1)/(n + 2) có giới hạn bằng 3 khi n -> +∞.
   - **Đáp án:** u_n - 3 = (3n - 1 - 3n - 6)/(n + 2) = -7/(n + 2). Vì |-7/(n+2)| < 7/n -> 0 nên lim(u_n - 3) = 0 -> lim u_n = 3.
4. `[TH]` Tìm giới hạn của dãy số u_n = 5 - (1/2)^n + 2/n.
   - **Đáp án:** lim u_n = lim 5 - lim(1/2)^n + 2·lim(1/n) = 5 - 0 + 0 = 5.
5. `[VD]` Cho dãy u_n = cos(n) / n. Chứng minh lim u_n = 0.
   - **Đáp án:** Ta có |cos n| ≤ 1 với mọi n nên 0 ≤ |u_n| ≤ 1/n. Vì lim 0 = lim(1/n) = 0 nên theo định lý kẹp, lim u_n = 0.
6. `[VD]` Một chất phóng xạ có chu kỳ bán rã 1 ngày. Khối lượng còn lại sau n ngày là m_n = m0 · (1/2)^n. Hỏi khi n -> +∞ thì khối lượng chất phóng xạ tiến về đâu?
   - **Đáp án:** lim m_n = m0 · lim(1/2)^n = m0 · 0 = 0. Sau thời gian rất dài chất phóng xạ phân rã gần như hoàn toàn.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Cho rằng lim q^n = 0 với mọi q mà quên điều kiện |q| < 1.
- Nhầm lẫn giữa giới hạn bằng 0 với số hạng bằng 0.
- Áp dụng quy tắc cộng giới hạn khi các dãy thành phần chưa có giới hạn hữu hạn.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
