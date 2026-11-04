# KẾ HOẠCH DẠY HỌC — Các số đặc trưng đo mức độ phân tán (Toán 10 · Tuần 12 · Tiết 90)

| Lớp | 10 | Tên bài học | Các số đặc trưng đo mức độ phân tán | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 12 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-12-90.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu khái niệm khoảng biến thiên R, khoảng tứ phân vị ΔQ, phương sai s² và độ lệch chuẩn s.
- **Should (Trọng tâm – Thông hiểu):** Tính đúng R, ΔQ, s², s từ mẫu số liệu nhỏ; nhận biết giá trị bất thường qua hàng rào [Q1 - 1,5ΔQ; Q3 + 1,5ΔQ].
- **Could (Nâng cao – Vận dụng):** So sánh mức độ phân tán giữa hai mẫu có cùng số trung bình; giải thích ý nghĩa trong kiểm soát chất lượng.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Kiểm tra đường kính chi tiết máy (đơn vị: mm) của hai máy dập A và B (mỗi máy đo 10 sản phẩm):**
- Máy A: $19{,}8; 19{,}9; 20{,}0; 20{,}0; 20{,}0; 20{,}0; 20{,}1; 20{,}1; 20{,}1; 20{,}0$ mm $\implies \bar x_A = 20{,}0$ mm.
  - $R_A = 20{,}1 - 19{,}8 = 0{,}3$ mm; $s_A^2 = 0{,}008 \implies s_A \approx 0{,}089$ mm.
- Máy B: $19{,}0; 19{,}5; 19{,}8; 20{,}0; 20{,}0; 20{,}0; 20{,}2; 20{,}5; 20{,}5; 20{,}5$ mm $\implies \bar x_B = 20{,}0$ mm.
  - $R_B = 20{,}5 - 19{,}0 = 1{,}5$ mm; $s_B^2 = 0{,}228 \implies s_B \approx 0{,}477$ mm.
- **Quy tắc hàng rào tìm giá trị ngoại lai:**
  - Khoảng tứ phân vị $\Delta_Q = Q_3 - Q_1$.
  - Giá trị bất thường là giá trị nằm ngoài đoạn $[Q_1 - 1{,}5\Delta_Q; Q_3 + 1{,}5\Delta_Q]$.
- **Kết luận:** $\bar x_A = \bar x_B = 20{,}0$ mm nhưng $s_A < s_B$ ($0{,}089 < 0{,}477$) nên máy A gia công chính xác và ổn định hơn máy B.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Máy A và B đều sản xuất bulong đường kính trung bình 20,0 mm. Máy A có s = 0,089 mm; máy B có s = 0,477 mm.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Máy nào sản xuất ra các sản phẩm có độ đồng đều cao hơn?*
  - (A) Máy A (độ lệch chuẩn nhỏ hơn)
  - (B) Máy B (độ lệch chuẩn lớn hơn)
  - (C) Hai máy như nhau
  - **Correct: (A)** — Độ lệch chuẩn s đo mức độ phân tán quanh số trung bình; s càng nhỏ thì các số liệu càng tập trung, độ đồng đều càng cao.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao số trung bình không đủ để đánh giá chất lượng của hai máy?
  2. `[SO SÁNH]` Nếu máy B có 1 sản phẩm hỏng nặng 25 mm thì R và s thay đổi ra sao?
- **TeacherCue (lớp yếu):** Vẽ sơ đồ phân bố điểm quanh trục 20,0 mm: máy A bó hẹp, máy B tản mát.
- **LookFor:** HS hiểu s tỉ lệ nghịch với độ đồng đều.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu khái niệm khoảng biến thiên R, khoảng tứ phân vị ΔQ, phương sai s² và độ lệch chuẩn s.
- **Should:** Tính đúng R, ΔQ, s², s từ mẫu số liệu nhỏ; nhận biết giá trị bất thường qua hàng rào [Q1 - 1,5ΔQ; Q3 + 1,5ΔQ].
- **Could:** So sánh mức độ phân tán giữa hai mẫu có cùng số trung bình; giải thích ý nghĩa trong kiểm soát chất lượng.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khoảng biến thiên R và khoảng tứ phân vị ΔQ khác nhau như thế nào khi mẫu có giá trị bất thường?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Khoảng biến thiên: $R = x_{\max} - x_{\min}$. Dễ tính nhưng rất nhạy cảm với ngoại lai.
- **Bước 2:** Khoảng tứ phân vị: $\Delta_Q = Q_3 - Q_1$. Đo mức phân tán của 50% số liệu ở giữa; bền vững trước ngoại lai.
- **Bước 3:** Phương sai: $s^2 = \dfrac{1}{n}\sum (x_i - \bar x)^2 = \dfrac{1}{n}\sum x_i^2 - (\bar x)^2$.
- **Bước 4:** Độ lệch chuẩn: $s = \sqrt{s^2} \ge 0$. Cùng đơn vị đo với dữ liệu gốc.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao khi tính độ phân tán người ta lấy bình phương $(x_i - \bar x)^2$?
  2. `[PHÁT HIỆN]` Khi nào thì $s^2 = 0$?
- **TeacherCue (lớp yếu):** Bảng đối chiếu 4 số đo: công thức và ý nghĩa thực tế.
- **Chốt:** R và s nhạy cảm với ngoại lai; ΔQ bền vững; s cùng đơn vị với x giúp đối chiếu trực quan.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Phương sai của mẫu số liệu là s² = 0,16 nên độ lệch chuẩn s = ±0,4."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: vì phương sai s² = 0,25 nên độ lệch chuẩn s = ±0,5 mm.
  2. Bằng chứng: Theo định nghĩa, độ lệch chuẩn s = √(s²) là căn bậc hai số học của phương sai, luôn không âm.
  3. Sửa: Chỉ nhận giá trị không âm: s = √0,25 = 0,5 mm; độ lệch không thể mang giá trị âm.
- **TeacherCue:** Nhắc lại: s đo độ tản mát khoảng cách, độ dài hình học không bao giờ âm.
- **LookFor:** HS chỉ ra s = 0,5 mm và giải thích căn bậc hai số học.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "R = max - min; s = căn của s²; luôn lấy giá trị dương."
  - **S:** "tìm Q1, Q3 rồi lấy ΔQ = Q3 - Q1; dùng công thức s² = (1/n)Σ xi² - x̄² để tính nhanh."
  - **C:** "tính ngưỡng [Q1 - 1,5ΔQ; Q3 + 1,5ΔQ] để chỉ ra giá trị bất thường."

- **Luồng M (Must) — hint: R = max - min; s = căn của s²; luôn lấy giá trị dương.**
1. Mẫu số liệu có giá trị nhỏ nhất là 12, giá trị lớn nhất là 45. Tính khoảng biến thiên R.
   - **Đáp án:** R = 45 - 12 = 33.
2. Phương sai của một mẫu số liệu bằng 16. Tính độ lệch chuẩn s.
   - **Đáp án:** s = √16 = 4.

- **Luồng S (Should) — hint: tìm Q1, Q3 rồi lấy ΔQ = Q3 - Q1; dùng công thức s² = (1/n)Σ xi² - x̄² để tính nhanh.**
1. Tìm khoảng tứ phân vị ΔQ của mẫu: 3, 6, 8, 12, 15, 18, 20.
   - **Đáp án:** n = 7. Q2 = 12. Q1 = 6, Q3 = 18 -> ΔQ = 18 - 6 = 12.
2. Tính phương sai s² của mẫu số liệu: 1, 2, 3, 4, 5.
   - **Đáp án:** x̄ = 3. s² = [(1-3)² + (2-3)² + (3-3)² + (4-3)² + (5-3)²]/5 = (4+1+0+1+4)/5 = 10/5 = 2.

- **Luồng C (Could) — hint: tính ngưỡng [Q1 - 1,5ΔQ; Q3 + 1,5ΔQ] để chỉ ra giá trị bất thường.**
1. Cho mẫu số liệu có Q1 = 10, Q3 = 20. Hỏi giá trị x = 38 có phải là giá trị bất thường không?
   - **Đáp án:** ΔQ = 20 - 10 = 10. Ngưỡng trên: Q3 + 1,5ΔQ = 20 + 1,5·10 = 35. Vì 38 > 35 nên 38 là giá trị bất thường.
2. Hai xạ thủ An và Bình có cùng điểm trung bình 9 điểm nhưng phương sai lần lượt là sA² = 0,4 và sB² = 1,6. Xạ thủ nào có phong độ thi đấu ổn định hơn?
   - **Đáp án:** sA = √0,4 ≈ 0,63; sB = √1,6 ≈ 1,26. Vì sA < sB nên xạ thủ An có phong độ ổn định hơn xạ thủ Bình.

- **LookFor:** HS M tính đúng R; HS S tính đúng ΔQ và s; HS C kiểm tra được ngoại lai.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho mẫu số liệu: 4, 6, 8. Tính số trung bình x̄, phương sai s² và độ lệch chuẩn s. → x̄ = (4+6+8)/3 = 6; s² = [(4-6)² + (6-6)² + (8-6)²]/3 = (4+0+4)/3 = 8/3 ≈ 2,67; s = √(8/3) ≈ 1,63.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Khoảng biến thiên R không bị ảnh hưởng bởi giá trị ngoại lai" → **Sai — R rất nhạy cảm với ngoại lai**
  - "Phương sai s² và độ lệch chuẩn s luôn không âm" → **Đúng**
  - "Độ lệch chuẩn càng lớn thì dữ liệu càng đồng đều" → **Sai — s càng lớn thì dữ liệu càng phân tán**
- **TeacherCue:** Đổi phiếu chấm chéo, chú ý phân số 8/3.

- **Câu 1:** Có thể có mẫu số liệu mà phương sai s² < 0 không? → Không, phương sai là trung bình của các bình phương nên luôn luôn s² ≥ 0.
- **Câu 2:** Nếu tất cả các số liệu trong mẫu bằng nhau thì độ lệch chuẩn bằng bao nhiêu? → Khi tất cả số liệu bằng nhau thì xi = x̄ với mọi i, do đó s = 0.
- **Chốt nhanh:** R = max - min; ΔQ = Q3 - Q1; s = √(s²) ≥ 0; s nhỏ -> dữ liệu đồng đều.

- Trong chuẩn 6-Sigma của công nghiệp sản xuất, độ lệch chuẩn s phải cực nhỏ.
- Sản phẩm lệch quá 3s so với chuẩn bị coi là phế phẩm tự động.
- Quản lý chất lượng hiện đại tập trung kéo giảm s thay vì chỉ điều chỉnh x̄.
- **TeacherCue:** Hỏi: "Tại sao các hãng xe hơi kiểm tra chất lượng linh kiện bằng độ lệch chuẩn s?"

- **Exit Ticket (4 mục):**
  1. Nêu công thức khoảng biến thiên R và khoảng tứ phân vị ΔQ.
  2. Nêu 1 bẫy (viết s = ±√(s²); nhầm đơn vị của phương sai và độ lệch chuẩn).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Mẫu có s = 0 có ý nghĩa gì về các số liệu trong mẫu?
- **TeacherCue (lớp yếu):** Nhìn lại tình huống 2 máy dập mở đầu.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Mẫu số liệu có giá trị nhỏ nhất là 12, giá trị lớn nhất là 45. Tính khoảng biến thiên R.
   - **Đáp án:** R = 45 - 12 = 33.
2. `[NB]` Phương sai của một mẫu số liệu bằng 16. Tính độ lệch chuẩn s.
   - **Đáp án:** s = √16 = 4.
3. `[TH]` Tìm khoảng tứ phân vị ΔQ của mẫu: 3, 6, 8, 12, 15, 18, 20.
   - **Đáp án:** n = 7. Q2 = 12. Q1 = 6, Q3 = 18 -> ΔQ = 18 - 6 = 12.
4. `[TH]` Tính phương sai s² của mẫu số liệu: 1, 2, 3, 4, 5.
   - **Đáp án:** x̄ = 3. s² = [(1-3)² + (2-3)² + (3-3)² + (4-3)² + (5-3)²]/5 = (4+1+0+1+4)/5 = 10/5 = 2.
5. `[VD]` Cho mẫu số liệu có Q1 = 10, Q3 = 20. Hỏi giá trị x = 38 có phải là giá trị bất thường không?
   - **Đáp án:** ΔQ = 20 - 10 = 10. Ngưỡng trên: Q3 + 1,5ΔQ = 20 + 1,5·10 = 35. Vì 38 > 35 nên 38 là giá trị bất thường.
6. `[VD]` Hai xạ thủ An và Bình có cùng điểm trung bình 9 điểm nhưng phương sai lần lượt là sA² = 0,4 và sB² = 1,6. Xạ thủ nào có phong độ thi đấu ổn định hơn?
   - **Đáp án:** sA = √0,4 ≈ 0,63; sB = √1,6 ≈ 1,26. Vì sA < sB nên xạ thủ An có phong độ ổn định hơn xạ thủ Bình.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Tính độ lệch chuẩn viết kết quả nhận hai giá trị ±.
- Quên chia cho n khi tính phương sai s².
- Nhầm khoảng tứ phân vị ΔQ = Q3 - Q1 với Q2.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
