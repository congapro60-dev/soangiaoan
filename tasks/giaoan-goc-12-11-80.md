# KẾ HOẠCH DẠY HỌC — Phương sai và độ lệch chuẩn (Toán 12 · Tuần 11 · Tiết 80)

| Lớp | 12 | Tên bài học | Phương sai và độ lệch chuẩn | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 11 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-11-80.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu ý nghĩa phương sai và độ lệch chuẩn; tính s² và s từ bảng số liệu ghép nhóm nhỏ.
- **Should (Trọng tâm – Thông hiểu):** Sử dụng thành thạo công thức rút gọn s² = x̄² - (x̄)²; phân biệt ý nghĩa trực quan của s so với s².
- **Could (Nâng cao – Vận dụng):** So sánh độ ổn định giữa hai tập dữ liệu cùng số trung bình; phản biện lỗi viết s = ±√(s²).

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Đánh giá độ ổn định kết quả 20 phát bắn của hai xạ thủ An và Bình.**

| Nhóm điểm | Giá trị đại diện $c_i$ | Tần số An $n_i$ | Tần số Bình $n_i'$ |
|---|:---:|:---:|:---:|
| $[6; 8)$ | $7$ | $2$ | $7$ |
| $[8; 10)$ | $9$ | $16$ | $6$ |
| $[10; 12)$ | $11$ | $2$ | $7$ |
| **Tổng** | — | **$n = 20$** | **$n = 20$** |

- **Điểm trung bình:**
  - $\bar x_A = (2\cdot7 + 16\cdot9 + 2\cdot11)/20 = 180/20 = 9{,}0$ điểm.
  - $\bar x_B = (7\cdot7 + 6\cdot9 + 7\cdot11)/20 = 180/20 = 9{,}0$ điểm.
- **Phương sai và độ lệch chuẩn:**
  - Xạ thủ An: $s_A^2 = [2(7-9)^2 + 16(9-9)^2 + 2(11-9)^2]/20 = 16/20 = 0{,}8$ $\implies s_A = \sqrt{0{,}8} \approx 0{,}89$ điểm.
  - Xạ thủ Bình: $s_B^2 = [7(7-9)^2 + 6(9-9)^2 + 7(11-9)^2]/20 = 56/20 = 2{,}8$ $\implies s_B = \sqrt{2{,}8} \approx 1{,}67$ điểm.
- **Kết luận:** $\bar x_A = \bar x_B = 9{,}0$ nhưng $s_A < s_B$ ($0{,}89 < 1{,}67$) nên xạ thủ An có phong độ ổn định hơn hẳn xạ thủ Bình.

**Bẫy của bài:** viết $s = \pm\sqrt{s^2}$; quên nhân tần số $n_i$ khi tính tổng bình phương độ lệch; làm tròn số trung bình quá sớm.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Hai xạ thủ An và Bình đều bắn 20 phát, cùng đạt điểm trung bình 9,0. An có 16 phát ở mức 9 điểm; Bình chia đều 7 phát 7 điểm và 7 phát 11 điểm.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Theo em, xạ thủ nào có phong độ thi đấu ổn định hơn?*
  - (A) Xạ thủ An (điểm tập trung quanh 9)
  - (B) Xạ thủ Bình (nhiều điểm cao 11)
  - (C) Hai xạ thủ ổn định như nhau
  - **Correct: (A)** — An có 16/20 phát bắn rơi vào điểm 9, độ phân tán quanh số trung bình nhỏ hơn hẳn.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Cùng điểm trung bình vì sao độ ổn định lại khác nhau?
  2. `[SO SÁNH]` Số đo nào lượng hoá được độ phân tán này?
- **TeacherCue (lớp yếu):** Nhắc lại: số trung bình chỉ đo xu thế trung tâm; muốn biết mức độ phân tán cần phương sai và độ lệch chuẩn.
- **LookFor:** HS nhận ra độ chụm quanh giá trị trung tâm.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu ý nghĩa phương sai và độ lệch chuẩn; tính s² và s từ bảng số liệu ghép nhóm nhỏ.
- **Should:** Sử dụng thành thạo công thức rút gọn s² = x̄² - (x̄)²; phân biệt ý nghĩa trực quan của s so với s².
- **Could:** So sánh độ ổn định giữa hai tập dữ liệu cùng số trung bình; phản biện lỗi viết s = ±√(s²).
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao độ lệch chuẩn s = √(s²) không bao giờ nhận giá trị âm?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Bước 1: Tính số trung bình $\bar x = \dfrac{1}{n}\sum n_i c_i$.
- **Bước 2:** Bước 2: Phương sai theo định nghĩa $s^2 = \dfrac{1}{n}\sum n_i (c_i - \bar x)^2$.
- **Bước 3:** Bước 3: Công thức rút gọn $s^2 = \dfrac{1}{n}\sum n_i c_i^2 - \bar x^2$.
- **Bước 4:** Bước 4: Độ lệch chuẩn $s = \sqrt{s^2} \ge 0$ (luôn lấy căn bậc hai số học).
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao phải bình phương $(c_i - \bar x)$?
  2. `[PHÁT HIỆN]` Vì sao $s$ cùng đơn vị với dữ liệu gốc còn $s^2$ thì không?
- **TeacherCue (lớp yếu):** Khung 4 bước; nhấn mạnh s ≥ 0 và công thức rút gọn nhanh hơn khi tính tay.
- **Chốt:** Phương sai bình phương độ lệch; độ lệch chuẩn đưa về cùng đơn vị; s càng nhỏ dữ liệu càng đồng đều.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: s² = 9 nên độ lệch chuẩn s = ±3."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: s² = 9 nên độ lệch chuẩn s = ±3.
  2. Bằng chứng: Theo định nghĩa, độ lệch chuẩn s = √(s²) là căn bậc hai số học của một số không âm, nên s ≥ 0.
  3. Sửa: s = √9 = 3 (chỉ nhận giá trị không âm); khoảng cách và độ phân tán không thể mang giá trị âm.
- **TeacherCue:** Cho HS nhắc lại định nghĩa căn bậc hai số học ở lớp 9: √a ≥ 0.
- **LookFor:** HS chỉ ra căn bậc hai số học luôn không âm.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "tính x̄ trước, rồi dùng công thức rút gọn s² = (1/n)Σ n_i c_i² - x̄²; lấy căn ra s."
  - **S:** "lập bảng cột phụ c_i, c_i², n_i c_i, n_i c_i²; kiểm tra tổng tần số n."
  - **C:** "so sánh hai mẫu: mẫu nào có s nhỏ hơn thì đồng đều hơn; giải thích ý nghĩa thực tế."

- **Luồng M (Must) — hint: tính x̄ trước, rồi dùng công thức rút gọn s² = (1/n)Σ n_i c_i² - x̄²; lấy căn ra s.**
1. Cho mẫu ghép nhóm có $n = 10$, $\sum n_i c_i^2 = 250$ và $\bar x = 4$. Tính $s^2$ và $s$.
   - **Đáp án:** $s^2 = 250/10 - 4^2 = 25 - 16 = 9$; $s = 3$.
2. Độ lệch chuẩn $s$ có thể nhận giá trị âm không?
   - **Đáp án:** Không, vì $s = \sqrt{s^2}$ là căn bậc hai số học nên luôn không âm.

- **Luồng S (Should) — hint: lập bảng cột phụ c_i, c_i², n_i c_i, n_i c_i²; kiểm tra tổng tần số n.**
1. Vì sao khi đã có $s^2$ người ta còn tính thêm $s$?
   - **Đáp án:** Vì $s^2$ có đơn vị là bình phương đơn vị dữ liệu (ví dụ điểm²), còn $s$ cùng đơn vị với dữ liệu gốc nên so sánh trực quan được.
2. Bảng có ba nhóm với tần số 2; 16; 2 và giá trị đại diện 7; 9; 11. Tính số trung bình.
   - **Đáp án:** $\bar x = (2\cdot7 + 16\cdot9 + 2\cdot11)/20 = (14 + 144 + 22)/20 = 180/20 = 9$.

- **Luồng C (Could) — hint: so sánh hai mẫu: mẫu nào có s nhỏ hơn thì đồng đều hơn; giải thích ý nghĩa thực tế.**
1. Máy đo độ ẩm được kiểm định: nếu độ lệch chuẩn của mẫu đo lớn hơn $0,15$ thì đưa máy đi sửa. Em là kỹ thuật viên, dựa vào đâu để quyết định?
   - **Đáp án:** Phải tính $s$ từ mẫu 20 lần đo rồi so với ngưỡng $0,15$: nếu $s > 0,15$ thì máy không ổn định, cần sửa; quyết định dựa trên số liệu chứ không cảm tính.
2. Chứng minh hai công thức phương sai tương đương.
   - **Đáp án:** Khai triển $(c_i - \bar x)^2 = c_i^2 - 2\bar x c_i + \bar x^2$; lấy tổng có trọng số rồi chia $n$ và dùng $\sum n_i c_i = n\bar x$ ta được $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar x^2$.

- **LookFor:** HS M tính đúng s; HS S lập đúng bảng phụ; HS C so sánh và kết luận chính xác.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho mẫu ghép nhóm có $n = 10$, $\sum n_i c_i^2 = 250$ và $\bar x = 4$. Tính $s^2$ và $s$. → $s^2 = 250/10 - 4^2 = 25 - 16 = 9$; $s = \sqrt{9} = 3$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Độ lệch chuẩn s có thể nhận giá trị âm" → **Sai — s luôn ≥ 0**
  - "Công thức rút gọn: s² = (1/n)Σ n_i c_i² - x̄²" → **Đúng**
  - "Hai mẫu cùng trung bình thì độ lệch chuẩn phải bằng nhau" → **Sai — có thể khác nhau hoàn toàn**
- **TeacherCue:** Đổi phiếu chấm chéo, chú ý không ghi s = ±3.

- **Câu 1:** Tính nhanh $s^2$ khi $n = 10$, $\sum n_i c_i^2 = 250$, $\bar x = 4$. → $s^2 = 25 - 16 = 9$, suy ra $s = 3$ (không phải $\pm3$).
- **Câu 2:** Một bài giải ghi $s^2 = 9$ rồi kết luận $s = \pm 3$. Bài đó sai ở đâu? → Sai vì $s = \sqrt{s^2}$ là căn bậc hai số học nên chỉ nhận giá trị không âm; kết luận đúng là $s = 3$.
- **Chốt nhanh:** s² = (1/n)Σ n_i c_i² - x̄²; s = √(s²) ≥ 0; s nhỏ ⟹ dữ liệu đồng đều.

- An có s = 0,89 điểm; Bình có s = 1,67 điểm — An ổn định gần gấp đôi Bình.
- Trong thi đấu đỉnh cao, sự ổn định quyết định thành tích chung cuộc.
- Khuyến nghị Ban huấn luyện: chọn An đi thi đấu chính thức; Bình cần rèn thêm tâm lý vững vàng.
- **TeacherCue:** Hỏi: "Nếu đi thi đấu loại trực tiếp, HLV nên chọn ai và tại sao?"

- **Exit Ticket (4 mục):**
  1. Nêu công thức tính phương sai và độ lệch chuẩn của mẫu ghép nhóm.
  2. Nêu 1 bẫy (viết s = ±3; quên nhân tần số n_i).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Hai xạ thủ An và Bình: ai bắn ổn định hơn và số đo nào chứng minh?
- **TeacherCue (lớp yếu):** Mở lại bảng so sánh An và Bình ở mục II.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Cho mẫu ghép nhóm có $n = 10$, $\sum n_i c_i^2 = 250$ và $\bar x = 4$. Tính $s^2$ và $s$.
   - **Đáp án:** $s^2 = 250/10 - 4^2 = 25 - 16 = 9$; $s = 3$.
2. `[NB]` Độ lệch chuẩn $s$ có thể nhận giá trị âm không?
   - **Đáp án:** Không, vì $s = \sqrt{s^2}$ là căn bậc hai số học nên luôn không âm.
3. `[TH]` Vì sao khi đã có $s^2$ người ta còn tính thêm $s$?
   - **Đáp án:** Vì $s^2$ có đơn vị là bình phương đơn vị dữ liệu (ví dụ điểm²), còn $s$ cùng đơn vị với dữ liệu gốc nên so sánh trực quan được.
4. `[TH]` Bảng có ba nhóm với tần số 2; 16; 2 và giá trị đại diện 7; 9; 11. Tính số trung bình.
   - **Đáp án:** $\bar x = (2\cdot7 + 16\cdot9 + 2\cdot11)/20 = (14 + 144 + 22)/20 = 180/20 = 9$.
5. `[VD]` Máy đo độ ẩm được kiểm định: nếu độ lệch chuẩn của mẫu đo lớn hơn $0,15$ thì đưa máy đi sửa. Em là kỹ thuật viên, dựa vào đâu để quyết định?
   - **Đáp án:** Phải tính $s$ từ mẫu 20 lần đo rồi so với ngưỡng $0,15$: nếu $s > 0,15$ thì máy không ổn định, cần sửa; quyết định dựa trên số liệu chứ không cảm tính.
6. `[VD]` Chứng minh hai công thức phương sai tương đương.
   - **Đáp án:** Khai triển $(c_i - \bar x)^2 = c_i^2 - 2\bar x c_i + \bar x^2$; lấy tổng có trọng số rồi chia $n$ và dùng $\sum n_i c_i = n\bar x$ ta được $s^2 = \frac{1}{n}\sum n_i c_i^2 - \bar x^2$.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Quên nhân tần số $n_i$ khi tính tổng bình phương độ lệch.
- Viết $s = \pm\sqrt{s^2}$ thay vì $s = \sqrt{s^2} \ge 0$.
- Làm tròn số trung bình quá sớm khiến sai số tích luỹ ở bước bình phương.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
