# KẾ HOẠCH DẠY HỌC — Hệ bất phương trình bậc nhất hai ẩn (Toán 10 · Tuần 5 · Tiết 33)

| Lớp | 10 | Tên bài học | Hệ bất phương trình bậc nhất hai ẩn | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 5 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-5-33.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Xác định miền nghiệm của hệ là phần giao và kiểm tra một điểm có thuộc miền hay không.
- **Should (Trọng tâm – Thông hiểu):** Tìm các đỉnh của miền nghiệm bằng cách giải từng cặp đường biên rồi lọc theo điều kiện.
- **Could (Nâng cao – Vận dụng):** Tìm phương án nguyên tối ưu theo một tiêu chí (nhiều bánh nhất / nhiều nước nhất) và phản biện kết luận "thỏa 3/4 điều kiện là nghiệm".

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Xe bánh mì phải thỏa đồng thời ngân sách và yêu cầu mở hàng.**

$$\begin{cases} 3x + 2y \le 30 & \text{(ngân sách 150 nghìn)} \\ x \ge 4 & \text{(ít nhất 4 bánh)} \\ y \ge 2 & \text{(ít nhất 2 nước)} \end{cases}$$

- **Miền nghiệm = phần giao** của ba nửa mặt phẳng.
- **Ba đỉnh:** $A(4; 2)$; $B(4; 9)$ vì $3\cdot4 + 2\cdot9 = 30$; $C\left(\tfrac{26}{3}; 2\right)$ vì $3x + 2\cdot2 = 30 \Rightarrow x = \tfrac{26}{3} \approx 8{,}67$.
- **Kiểm chứng tay:** $B(4;9)$: $12 + 18 = 30$ đúng biên; $C$: $26 + 4 = 30$ đúng biên; $A$: $12 + 4 = 16 < 30$ nằm trong.
- **Nghiệm nguyên:** $y = 2$ cho $3x \le 26 \Rightarrow x \le 8$; nên các cặp nguyên nhiều bánh nhất là $(8; 2)$ — kiểm $24 + 4 = 28 \le 30$.

**Bẫy của bài:** chỉ lấy miền của bất phương trình "mạnh nhất" và bỏ các điều kiện còn lại.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Xe bánh mì: ngân sách 3x + 2y ≤ 30, phải có ít nhất 4 bánh (x ≥ 4) và ít nhất 2 nước (y ≥ 2).
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Nghiệm của hệ bất phương trình là gì?*
  - (A) Hợp các miền nghiệm thành phần
  - (B) Phần giao các miền nghiệm thành phần
  - (C) Miền của bất phương trình có hệ số lớn nhất
  - **Correct: (B)** — Nghiệm hệ phải thỏa đồng thời mọi bất phương trình, nên là giao của các miền.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Điểm (0; 0) có thuộc miền hệ không? Vì sao?
  2. `[SO SÁNH]` Hợp và giao khác nhau thế nào trong bài này?
- **TeacherCue (lớp yếu):** Vẽ ba nửa mặt phẳng bằng ba màu, phần tô đậm là chỗ ba màu chồng lên nhau.
- **LookFor:** HS nói được "thỏa đồng thời" và chỉ vào phần chồng màu.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Xác định miền nghiệm của hệ là phần giao và kiểm tra một điểm có thuộc miền hay không.
- **Should:** Tìm các đỉnh của miền nghiệm bằng cách giải từng cặp đường biên rồi lọc theo điều kiện.
- **Could:** Tìm phương án nguyên tối ưu theo một tiêu chí (nhiều bánh nhất / nhiều nước nhất) và phản biện kết luận "thỏa 3/4 điều kiện là nghiệm".
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khi nhiều điều kiện phải thỏa cùng lúc, miền phương án còn lại là gì?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Vẽ ba đường biên: $3x + 2y = 30$; $x = 4$; $y = 2$.
- **Bước 2:** Xác định nửa mặt phẳng cho từng điều kiện bằng điểm thử (ví dụ $O(0;0)$).
- **Bước 3:** Lấy phần giao — với bài này là tam giác $A(4;2)$, $B(4;9)$, $C\left(\tfrac{26}{3};2\right)$.
- **Bước 4:** Kiểm tra đỉnh bằng cách thay vào cả ba điều kiện; lọc nghiệm nguyên nếu bài yêu cầu số lượng.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao đỉnh $B$ có $x = 4$ và $y = 9$?
  2. `[PHÁT HIỆN]` Điểm $(5; 1)$ có thuộc miền không?
- **TeacherCue (lớp yếu):** Khung 3 bước: "vẽ biên → lấy giao → thử đỉnh". Nhắc: đỉnh là giao của hai đường biên, phải kiểm với đường thứ ba.
- **Chốt:** Miền nghiệm hệ là phần giao; đỉnh là giao điểm các đường biên nằm trong miền.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI kết luận: "Miền nghiệm của hệ là toàn bộ nửa mặt phẳng phía dưới đường 3x + 2y = 30, vì đây là điều kiện chặt nhất. Các điều kiện x ≥ 4 và y ≥ 2 chỉ là ghi chú thêm nên không làm thay đổi miền nghiệm.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI chỉ lấy miền của 3x + 2y ≤ 30 và bỏ hai điều kiện x ≥ 4, y ≥ 2.
  2. Bằng chứng: Điểm (0; 0) nằm trong miền AI vẽ nhưng vi phạm cả x ≥ 4 và y ≥ 2.
  3. Sửa: Phải cắt thêm bởi x ≥ 4 và y ≥ 2; miền đúng là tam giác (4;2), (4;9), (26/3;2).
- **TeacherCue:** Cho HS yếu thay (0;0) vào hệ để thấy mâu thuẫn ngay.
- **LookFor:** HS chỉ ra điều kiện bị bỏ sót và vùng bị tô thừa.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "vẽ từng biên rồi tô phần chồng lên nhau."
  - **S:** "giải từng cặp đường biên để tìm đỉnh, lọc theo điều kiện còn lại."
  - **C:** "tối ưu theo tiêu chí trên các đỉnh, nhớ điều kiện nguyên."

- **Luồng M (Must) — hint: vẽ từng biên rồi tô phần chồng lên nhau.**
1. Miền nghiệm của hệ bất phương trình được tạo bởi phép toán tập hợp nào?
   - **Đáp án:** Phép giao của các miền nghiệm thành phần.
2. Điểm (1; 1) có thỏa hệ x ≥ 0, y ≥ 0, x + y ≤ 3 không?
   - **Đáp án:** Có: 1 ≥ 0, 1 ≥ 0, 1 + 1 = 2 ≤ 3 — cả ba điều kiện đúng.

- **Luồng S (Should) — hint: giải từng cặp đường biên để tìm đỉnh, lọc theo điều kiện còn lại.**
1. Tìm miền nghiệm của hệ x ≥ 0, y ≥ 0, x + y ≤ 2.
   - **Đáp án:** Tam giác với các đỉnh (0; 0), (2; 0), (0; 2) — giới hạn bởi hai trục tọa độ và đường x + y = 2.
2. Điểm (2; 3) có thuộc miền nghiệm của hệ x + y ≤ 4, x ≥ 0, y ≥ 0 không?
   - **Đáp án:** Không: 2 + 3 = 5 > 4 nên vi phạm điều kiện đầu.

- **Luồng C (Could) — hint: tối ưu theo tiêu chí trên các đỉnh, nhớ điều kiện nguyên.**
1. Tìm các đỉnh miền nghiệm của hệ x + y ≤ 5, x + 2y ≤ 6, x ≥ 0, y ≥ 0.
   - **Đáp án:** Các đỉnh: (0; 0); (5; 0); (4; 1) (giao x + y = 5 với x + 2y = 6); (0; 3). Kiểm cả bốn điểm đều thỏa mọi điều kiện.
2. Phản biện nhận định: "Một điểm thỏa ba trong bốn bất phương trình là nghiệm của hệ".
   - **Đáp án:** Sai. Nghiệm hệ phải thỏa đồng thời cả bốn. Ví dụ điểm (5; 1) thỏa x ≥ 0, y ≥ 0, x + y ≤ 6 nhưng vi phạm x + 2y ≤ 6 (5 + 2 = 7 > 6) nên không là nghiệm.

- **LookFor:** HS M nêu đúng phép giao; HS S tìm đủ đỉnh; HS C chọn được phương án tối ưu có lý do.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tìm các đỉnh miền nghiệm của hệ x + y ≤ 5, x + 2y ≤ 6, x ≥ 0, y ≥ 0. → Giao các biên: (0;0); (5;0); (4;1) (do x + y = 5 và x + 2y = 6); (0;3). Kiểm cả 4 điểm đều thỏa mọi điều kiện.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Điểm thỏa 3 trong 4 bất phương trình là nghiệm hệ" → **Sai**
  - "Miền nghiệm hệ là giao các miền thành phần" → **Đúng**
  - "Đỉnh miền hệ luôn là giao của đúng hai đường biên" → **Đúng**
- **TeacherCue:** Mời 2 HS lên bảng giải cặp phương trình tìm đỉnh (4;1).

- **Câu 1:** Vì sao không thể chỉ lấy miền của 3x + 2y ≤ 30 làm miền nghiệm hệ? → Vì còn hai điều kiện x ≥ 4 và y ≥ 2; điểm (0;0) thuộc miền của bất phương trình đầu nhưng vi phạm cả hai điều kiện còn lại.
- **Câu 2:** Đỉnh (4; 9) được xác định từ giao của hai đường nào? → x = 4 và 3x + 2y = 30 (thay x = 4 được 12 + 2y = 30 ⇒ y = 9).
- **Chốt nhanh:** Đồng thời = giao; đỉnh = giao hai biên + kiểm biên còn lại.

- Muốn nhiều bánh nhất: $(8; 2)$ — 24 + 4 = 28 ≤ 30 (dư 5 nghìn).
- Muốn nhiều nước nhất: $(4; 9)$ — 12 + 18 = 30 (đúng ngân sách).
- Muốn cân bằng: $(6; 6)$ — 18 + 12 = 30; kiểm x ≥ 4, y ≥ 2 đều đúng.
- **TeacherCue:** Hỏi: "Ba phương án trên đều nằm trong miền — chọn cái nào là quyết định kinh doanh, không phải toán."

- **Exit Ticket (4 mục):**
  1. Miền nghiệm của hệ được xác định bằng phép toán nào?
  2. Nêu 1 bẫy (bỏ điều kiện; nhầm hợp với giao).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Nêu ba đỉnh miền nghiệm của hệ xe bánh mì.
- **TeacherCue (lớp yếu):** Mở lại hình tam giác ở S3 và danh sách đỉnh.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Miền nghiệm của hệ bất phương trình được tạo bởi phép toán tập hợp nào?
   - **Đáp án:** Phép giao của các miền nghiệm thành phần.
2. `[NB]` Điểm (1; 1) có thỏa hệ x ≥ 0, y ≥ 0, x + y ≤ 3 không?
   - **Đáp án:** Có: 1 ≥ 0, 1 ≥ 0, 1 + 1 = 2 ≤ 3 — cả ba điều kiện đúng.
3. `[TH]` Tìm miền nghiệm của hệ x ≥ 0, y ≥ 0, x + y ≤ 2.
   - **Đáp án:** Tam giác với các đỉnh (0; 0), (2; 0), (0; 2) — giới hạn bởi hai trục tọa độ và đường x + y = 2.
4. `[TH]` Điểm (2; 3) có thuộc miền nghiệm của hệ x + y ≤ 4, x ≥ 0, y ≥ 0 không?
   - **Đáp án:** Không: 2 + 3 = 5 > 4 nên vi phạm điều kiện đầu.
5. `[VD]` Tìm các đỉnh miền nghiệm của hệ x + y ≤ 5, x + 2y ≤ 6, x ≥ 0, y ≥ 0.
   - **Đáp án:** Các đỉnh: (0; 0); (5; 0); (4; 1) (giao x + y = 5 với x + 2y = 6); (0; 3). Kiểm cả bốn điểm đều thỏa mọi điều kiện.
6. `[VD]` Phản biện nhận định: "Một điểm thỏa ba trong bốn bất phương trình là nghiệm của hệ".
   - **Đáp án:** Sai. Nghiệm hệ phải thỏa đồng thời cả bốn. Ví dụ điểm (5; 1) thỏa x ≥ 0, y ≥ 0, x + y ≤ 6 nhưng vi phạm x + 2y ≤ 6 (5 + 2 = 7 > 6) nên không là nghiệm.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Chỉ lấy miền của một bất phương trình mạnh nhất, bỏ các điều kiện còn lại.
- Nhầm hợp với giao khi xác định miền nghiệm hệ.
- Tìm đỉnh bằng giao hai đường biên nhưng quên kiểm điều kiện còn lại.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
