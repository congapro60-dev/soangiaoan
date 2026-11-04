# KẾ HOẠCH DẠY HỌC — Biểu diễn miền nghiệm của hệ bất phương trình (Toán 10 · Tuần 6 · Tiết 39)

| Lớp | 10 | Tên bài học | Biểu diễn miền nghiệm của hệ bất phương trình | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-6-39.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Vẽ ba đường biên, xác định phần giao và chỉ ra các đỉnh của miền nghiệm.
- **Should (Trọng tâm – Thông hiểu):** Kiểm tra từng đỉnh bằng cả ba điều kiện; loại điểm ngoài miền bằng phép thay cụ thể.
- **Could (Nâng cao – Vận dụng):** Thiết kế hệ có miền cho trước; phản biện hình vẽ thiếu một điều kiện.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Lớp chuẩn bị gian hàng hội trường trong tối đa 6 giờ, chia cho trang trí ($x$ giờ) và nấu ăn ($y$ giờ).**

$$\begin{cases} x + y \le 6 & \text{(tổng thời gian)} \\ x \ge 1 & \text{(phải trang trí ít nhất 1 giờ)} \\ y \ge 0 \end{cases}$$

- **Ba đường biên:** $x + y = 6$; $x = 1$; $y = 0$.
- **Miền nghiệm:** tam giác với $A(1; 0)$; $B(6; 0)$; $C(1; 5)$ (vì $1 + 5 = 6$).
- **Kiểm chứng tay:** $A$: $1 + 0 = 1 \le 6$ ✓, $x = 1 \ge 1$ ✓. $B$: $6 \le 6$ ✓. $C$: $1 + 5 = 6 \le 6$ ✓.
- **Điểm ngoài miền:** $(0; 3)$ vi phạm $x \ge 1$; $(5; 3)$ vi phạm $x + y \le 6$ ($8 > 6$).

**Bẫy của bài:** tô phần giao của hai điều kiện mà quên điều kiện thứ ba; nhầm hợp với giao.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Tổng thời gian ≤ 6 giờ; trang trí x giờ (ít nhất 1 giờ); nấu ăn y giờ (không âm).
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Điểm (0; 3) có nằm trong miền nghiệm của hệ không?*
  - (A) Có, vì 0 + 3 = 3 ≤ 6
  - (B) Không, vì x = 0 vi phạm x ≥ 1
  - (C) Có, vì y = 3 ≥ 0
  - **Correct: (B)** — Phải thỏa đồng thời mọi điều kiện; (0;3) vi phạm x ≥ 1 dù thỏa hai điều kiện còn lại.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao phải lấy giao chứ không lấy hợp?
  2. `[SO SÁNH]` Điểm (5;3) sai ở điều kiện nào?
- **TeacherCue (lớp yếu):** Vẽ ba nửa mặt phẳng ba màu khác nhau; phần tô đậm là chỗ ba màu chồng nhau.
- **LookFor:** HS kiểm đủ ba điều kiện trước khi kết luận.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Vẽ ba đường biên, xác định phần giao và chỉ ra các đỉnh của miền nghiệm.
- **Should:** Kiểm tra từng đỉnh bằng cả ba điều kiện; loại điểm ngoài miền bằng phép thay cụ thể.
- **Could:** Thiết kế hệ có miền cho trước; phản biện hình vẽ thiếu một điều kiện.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Khi nhiều ràng buộc cùng lúc, phần còn lại trên mặt phẳng là gì và vì sao phải lấy giao?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Vẽ từng đường biên: $x + y = 6$ qua $(6;0)$, $(0;6)$; $x = 1$; $y = 0$.
- **Bước 2:** Xác định nửa mặt phẳng của từng điều kiện bằng điểm thử.
- **Bước 3:** Lấy phần giao — tam giác $A(1;0)$, $B(6;0)$, $C(1;5)$.
- **Bước 4:** Kiểm từng đỉnh bằng cả ba điều kiện trước khi kết luận.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao đỉnh $C$ có tọa độ $(1;5)$?
  2. `[PHÁT HIỆN]` Nếu bỏ $x \ge 1$ thì miền thay đổi thế nào?
- **TeacherCue (lớp yếu):** Khung: "vẽ biên → lấy giao → thử đỉnh". Nhắc đỉnh = giao hai biên, phải kiểm điều kiện còn lại.
- **Chốt:** Miền nghiệm hệ là phần giao; mọi điểm trong miền phải thỏa đồng thời mọi điều kiện.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI vẽ miền nghiệm của hệ x + y ≤ 6, x ≥ 1, y ≥ 0 bằng cách lấy giao của x + y ≤ 6 và y ≥ 0, rồi kết luận: "Miền nghiệm là tam giác (0;0), (6;0), (0;6). Điều kiện x ≥ 1 chỉ là ghi chú nên không ảnh hưởng hình vẽ.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI chỉ tô phần giao của x + y ≤ 6 và y ≥ 0, bỏ điều kiện x ≥ 1.
  2. Bằng chứng: Điểm (0; 2) nằm trong vùng AI tô nhưng vi phạm x ≥ 1.
  3. Sửa: Cắt thêm nửa mặt phẳng x ≥ 1: miền đúng là tam giác (1;0), (6;0), (1;5).
- **TeacherCue:** Cho HS yếu thay (0;2) vào hệ để thấy mâu thuẫn ngay.
- **LookFor:** HS chỉ ra điều kiện bị bỏ và vùng bị tô thừa.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "vẽ biên rồi tô phần chồng nhau."
  - **S:** "tìm đỉnh bằng giao hai biên, kiểm điều kiện còn lại."
  - **C:** "tự đặt hệ có miền tam giác và nhờ bạn kiểm."

- **Luồng M (Must) — hint: vẽ biên rồi tô phần chồng nhau.**
1. Sau khi vẽ các nửa mặt phẳng, thao tác cuối cùng để được miền nghiệm hệ là gì?
   - **Đáp án:** Lấy phần giao của các nửa mặt phẳng, rồi kiểm tra lại các đỉnh/điểm đại diện.
2. Điểm (2; 1) có thỏa hệ x ≥ 1, y ≥ 0, x + y ≤ 4 không?
   - **Đáp án:** Có: 2 ≥ 1, 1 ≥ 0, 2 + 1 = 3 ≤ 4.

- **Luồng S (Should) — hint: tìm đỉnh bằng giao hai biên, kiểm điều kiện còn lại.**
1. Tìm các đỉnh miền nghiệm của hệ x ≥ 0, y ≥ 0, x + y ≤ 3.
   - **Đáp án:** Tam giác với đỉnh (0;0), (3;0), (0;3).
2. Điểm (0; 2) có thuộc miền nghiệm của hệ x ≥ 1, y ≥ 0, x + y ≤ 6 không?
   - **Đáp án:** Không: 0 ≥ 1 sai, dù 2 ≥ 0 và 0 + 2 = 2 ≤ 6 đúng.

- **Luồng C (Could) — hint: tự đặt hệ có miền tam giác và nhờ bạn kiểm.**
1. Nêu một điểm chắc chắn không thuộc miền và chỉ rõ điều kiện nào bị vi phạm.
   - **Đáp án:** Ví dụ (5; 3) với hệ x + y ≤ 6, x ≥ 1, y ≥ 0: 5 + 3 = 8 > 6 nên vi phạm điều kiện tổng thời gian (dù x ≥ 1 và y ≥ 0 đúng).
2. Một hình vẽ chỉ tô giao của hai điều kiện và quên điều kiện thứ ba. Hãy phản biện.
   - **Đáp án:** Chọn một điểm trong vùng tô nhưng vi phạm điều kiện thứ ba; ví dụ với hệ x + y ≤ 6, x ≥ 1, y ≥ 0, điểm (0;2) nằm trong giao của hai điều kiện sau nhưng vi phạm x ≥ 1 — nên vùng tô phải cắt bớt.

- **LookFor:** HS M nêu đúng phép giao; HS S tìm đủ đỉnh; HS C thiết kế hệ hợp lệ.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Tìm các đỉnh của miền nghiệm x ≥ 0, y ≥ 0, x + y ≤ 3. → Tam giác với các đỉnh (0;0), (3;0), (0;3); mỗi đỉnh thỏa cả ba điều kiện.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Điểm thỏa 2/3 điều kiện là nghiệm hệ" → **Sai**
  - "Miền nghiệm hệ là giao các miền" → **Đúng**
  - "Đỉnh là giao hai đường biên" → **Đúng**
- **TeacherCue:** Chiếu 2 hình của HS, cùng kiểm đỉnh.

- **Câu 1:** Vì sao miền nghiệm hệ là giao mà không phải hợp? → Vì nghiệm hệ phải thỏa đồng thời mọi bất phương trình; hợp sẽ chứa cả điểm chỉ thỏa một điều kiện.
- **Câu 2:** Đỉnh (1; 5) được xác định từ giao hai đường nào? → x = 1 và x + y = 6 (thay x = 1 được y = 5).
- **Chốt nhanh:** Đồng thời = giao; đỉnh phải kiểm đủ điều kiện.

- Ưu tiên nấu ăn: $(1; 5)$ — 1 giờ trang trí, 5 giờ nấu, đúng 6 giờ.
- Cân bằng: $(3; 3)$ — 6 giờ, thỏa mọi điều kiện.
- Ưu tiên trang trí: $(6; 0)$ — 6 giờ trang trí, không nấu.
- **TeacherCue:** Hỏi: "Ba phương án trên đều trong miền — chọn cái nào là quyết định của lớp, không phải của toán."

- **Exit Ticket (4 mục):**
  1. Miền nghiệm hệ xác định bằng phép giao hay hợp?
  2. Nêu 1 bẫy (bỏ điều kiện; nhầm hợp với giao).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Nêu ba đỉnh miền nghiệm của hệ x + y ≤ 6, x ≥ 1, y ≥ 0.
- **TeacherCue (lớp yếu):** Mở lại tam giác ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Sau khi vẽ các nửa mặt phẳng, thao tác cuối cùng để được miền nghiệm hệ là gì?
   - **Đáp án:** Lấy phần giao của các nửa mặt phẳng, rồi kiểm tra lại các đỉnh/điểm đại diện.
2. `[NB]` Điểm (2; 1) có thỏa hệ x ≥ 1, y ≥ 0, x + y ≤ 4 không?
   - **Đáp án:** Có: 2 ≥ 1, 1 ≥ 0, 2 + 1 = 3 ≤ 4.
3. `[TH]` Tìm các đỉnh miền nghiệm của hệ x ≥ 0, y ≥ 0, x + y ≤ 3.
   - **Đáp án:** Tam giác với đỉnh (0;0), (3;0), (0;3).
4. `[TH]` Điểm (0; 2) có thuộc miền nghiệm của hệ x ≥ 1, y ≥ 0, x + y ≤ 6 không?
   - **Đáp án:** Không: 0 ≥ 1 sai, dù 2 ≥ 0 và 0 + 2 = 2 ≤ 6 đúng.
5. `[VD]` Nêu một điểm chắc chắn không thuộc miền và chỉ rõ điều kiện nào bị vi phạm.
   - **Đáp án:** Ví dụ (5; 3) với hệ x + y ≤ 6, x ≥ 1, y ≥ 0: 5 + 3 = 8 > 6 nên vi phạm điều kiện tổng thời gian (dù x ≥ 1 và y ≥ 0 đúng).
6. `[VD]` Một hình vẽ chỉ tô giao của hai điều kiện và quên điều kiện thứ ba. Hãy phản biện.
   - **Đáp án:** Chọn một điểm trong vùng tô nhưng vi phạm điều kiện thứ ba; ví dụ với hệ x + y ≤ 6, x ≥ 1, y ≥ 0, điểm (0;2) nằm trong giao của hai điều kiện sau nhưng vi phạm x ≥ 1 — nên vùng tô phải cắt bớt.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Chỉ tô giao của một vài điều kiện, bỏ điều kiện còn lại.
- Nhầm hợp với giao.
- Kết luận đỉnh mà không kiểm điều kiện thứ ba.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
