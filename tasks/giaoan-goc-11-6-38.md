# KẾ HOẠCH DẠY HỌC — Dãy số (Toán 11 · Tuần 6 · Tiết 38)

| Lớp | 11 | Tên bài học | Dãy số | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-11-6-38.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Nhận biết dãy số, viết số hạng tổng quát và tính số hạng thứ $k$.
- **Should (Trọng tâm – Thông hiểu):** Chuyển đổi giữa ba cách cho dãy (công thức, truy hồi, liệt kê) và tính tổng đơn giản.
- **Could (Nâng cao – Vận dụng):** Mô hình hóa một quy luật thực tế thành dãy; phản biện cách cho dãy thiếu xác định.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Hội trường xếp ghế theo hàng — hàng 1 có 7 ghế, mỗi hàng sau thêm 2 ghế.**

- **Cách 1 — công thức tổng quát:** $u_n = 2n + 5$ (ghế của hàng $n$).
  - $u_1 = 7$; $u_2 = 9$; $u_3 = 11$; $u_5 = 15$; $u_{10} = 25$.
- **Cách 2 — công thức truy hồi:** $u_1 = 7$; $u_{n+1} = u_n + 2$.
- **Cách 3 — liệt kê:** $7, 9, 11, 13, \ldots$
- **Kiểm chứng tay:** $u_5 = 2\cdot5 + 5 = 15$ ✓; $u_{10} = 25$ ✓; tổng 10 hàng $= \dfrac{(7+25)\cdot10}{2} = 160$ ghế.
- **Dãy khác:** số người đăng ký giảm dần $v_n = \dfrac{100}{n}$ → $100; 50; 33{,}3; 25; \ldots$

**Bẫy của bài:** nhầm "số hạng thứ $n$" với "giá trị $n$"; quên rằng dãy là hàm số xác định trên $\mathbb{N}^*$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Hàng 1 có 7 ghế, mỗi hàng sau thêm 2 ghế.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Số ghế ở hàng thứ 5 là bao nhiêu?*
  - (A) 13
  - (B) 15
  - (C) 17
  - **Correct: (B)** — u_n = 2n + 5 ⇒ u5 = 15. Có thể kiểm bằng liệt kê: 7, 9, 11, 13, 15.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Viết công thức truy hồi cho dãy này?
  2. `[SO SÁNH]` Cách công thức và cách truy hồi khác nhau ở đâu?
- **TeacherCue (lớp yếu):** Cho HS đếm ghế bằng tay 5 hàng trước, rồi so với công thức.
- **LookFor:** HS phân biệt số hạng thứ n với giá trị n.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Nhận biết dãy số, viết số hạng tổng quát và tính số hạng thứ $k$.
- **Should:** Chuyển đổi giữa ba cách cho dãy (công thức, truy hồi, liệt kê) và tính tổng đơn giản.
- **Could:** Mô hình hóa một quy luật thực tế thành dãy; phản biện cách cho dãy thiếu xác định.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Có bao nhiêu cách mô tả một quy luật lặp lại bằng toán học?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Công thức số hạng tổng quát: $u_n = 2n + 5$ — tính trực tiếp số hạng bất kỳ.
- **Bước 2:** Công thức truy hồi: $u_1 = 7$, $u_{n+1} = u_n + 2$ — tính lần lượt từ số hạng trước.
- **Bước 3:** Liệt kê: chỉ dùng được khi dãy hữu hạn hoặc có quy luật rõ.
- **Bước 4:** Dãy số là hàm số trên $\mathbb{N}^*$: $u: \mathbb{N}^* \to \mathbb{R}$, $n \mapsto u_n$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao dãy số được coi là hàm số?
  2. `[PHÁT HIỆN]` Với $u_1 = 2$, $u_{n+1} = 3u_n - 1$, tính $u_3$?
- **TeacherCue (lớp yếu):** Bảng 3 cột: công thức — truy hồi — liệt kê, cùng một dãy.
- **Chốt:** Một quy luật, ba cách mô tả; chọn cách nào tùy câu hỏi cần trả lời.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI tính: "Dãy u_n = 2n + 5. Số hạng thứ 5: u_5 = 2·(5 + 5) = 20.""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI tính $u_5$ của $u_n = 2n + 5$ bằng cách thay $n = 5$ vào $u_n$ rồi lấy $u_5 = 2\cdot10 + 5 = 25$.
  2. Bằng chứng: Nhầm: $n = 5$ nên $u_5 = 2\cdot5 + 5 = 15$.
  3. Sửa: $u_5 = 15$; $u_{10} = 25$.
- **TeacherCue:** Cho HS viết rõ "n = 5 thay vào biểu thức" trước khi tính.
- **LookFor:** HS thay đúng vị trí.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "thay n vào công thức, tính từng bước."
  - **S:** "chuyển đổi giữa công thức và truy hồi."
  - **C:** "mô hình hóa quy luật thực tế thành dãy và tính tổng."

- **Luồng M (Must) — hint: thay n vào công thức, tính từng bước.**
1. Nêu định nghĩa dãy số và tập xác định của nó.
   - **Đáp án:** Dãy số là hàm số xác định trên ℕ*: u: ℕ* → ℝ, n ↦ u_n.
2. Với u_n = 2n + 5, tính u1 và u5.
   - **Đáp án:** u1 = 7; u5 = 15.

- **Luồng S (Should) — hint: chuyển đổi giữa công thức và truy hồi.**
1. Cho u1 = 2, u_{n+1} = 3u_n − 1. Tính u2, u3, u4.
   - **Đáp án:** u2 = 5; u3 = 14; u4 = 41.
2. Cho u_n = n² − 1. Tính u10.
   - **Đáp án:** u10 = 100 − 1 = 99.

- **Luồng C (Could) — hint: mô hình hóa quy luật thực tế thành dãy và tính tổng.**
1. Viết công thức truy hồi cho dãy u_n = 2n + 5.
   - **Đáp án:** u1 = 7 và u_{n+1} = u_n + 2 (vì u_{n+1} − u_n = 2(n+1) + 5 − (2n+5) = 2).
2. Một bãi đỗ xe có 12 chỗ ở hàng đầu, mỗi hàng sau nhiều hơn 4 chỗ. Viết dãy số và tính số chỗ hàng thứ 8.
   - **Đáp án:** u_n = 4n + 8 (vì u1 = 12). u8 = 4·8 + 8 = 40 chỗ. Kiểm: 12; 16; 20; 24; 28; 32; 36; 40.

- **LookFor:** HS M tính đúng; HS S chuyển đổi được; HS C mô hình đúng.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho $u_1 = 2$, $u_{n+1} = 3u_n - 1$. Tính $u_2, u_3, u_4$. → $u_2 = 3\cdot2 - 1 = 5$; $u_3 = 3\cdot5 - 1 = 14$; $u_4 = 3\cdot14 - 1 = 41$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "u_n = 2n + 5 thì u_5 = 15" → **Đúng**
  - "Dãy số là hàm số trên ℕ*" → **Đúng**
  - "Công thức truy hồi cho phép tính trực tiếp u_100" → **Sai — phải tính lần lượt**
- **TeacherCue:** Chiếu 2 bài, kiểm từng bước truy hồi.

- **Câu 1:** Vì sao dãy số được coi là hàm số? → Vì mỗi số nguyên dương n ứng với đúng một giá trị u_n, đúng định nghĩa hàm số trên ℕ*.
- **Câu 2:** Công thức truy hồi khác công thức tổng quát ở đâu? → Truy hồi tính số hạng sau từ số hạng trước (phải tính lần lượt); tổng quát tính trực tiếp từ n.
- **Chốt nhanh:** Công thức — truy hồi — liệt kê; thay đúng vị trí n.

- 10 hàng: tổng = (7 + 25)·10/2 = 160 ghế.
- 20 hàng: u20 = 45, tổng = (7 + 45)·20/2 = 520 ghế.
- Nếu mỗi hàng thêm 3 ghế: u_n = 3n + 4 → u20 = 64, tổng = (7 + 64)·20/2 = 710 ghế.
- **TeacherCue:** Hỏi: "Nếu hội trường cần 600 chỗ thì cần bao nhiêu hàng?" → giải bất phương trình với tổng.

- **Exit Ticket (4 mục):**
  1. Nêu ba cách cho một dãy số.
  2. Nêu 1 bẫy (thay sai vị trí n; nhầm truy hồi với công thức).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Với u_n = 2n + 5, tính u_5 và u_10.
- **TeacherCue (lớp yếu):** Mở lại ba cách cho dãy ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu định nghĩa dãy số và tập xác định của nó.
   - **Đáp án:** Dãy số là hàm số xác định trên ℕ*: u: ℕ* → ℝ, n ↦ u_n.
2. `[NB]` Với u_n = 2n + 5, tính u1 và u5.
   - **Đáp án:** u1 = 7; u5 = 15.
3. `[TH]` Cho u1 = 2, u_{n+1} = 3u_n − 1. Tính u2, u3, u4.
   - **Đáp án:** u2 = 5; u3 = 14; u4 = 41.
4. `[TH]` Cho u_n = n² − 1. Tính u10.
   - **Đáp án:** u10 = 100 − 1 = 99.
5. `[VD]` Viết công thức truy hồi cho dãy u_n = 2n + 5.
   - **Đáp án:** u1 = 7 và u_{n+1} = u_n + 2 (vì u_{n+1} − u_n = 2(n+1) + 5 − (2n+5) = 2).
6. `[VD]` Một bãi đỗ xe có 12 chỗ ở hàng đầu, mỗi hàng sau nhiều hơn 4 chỗ. Viết dãy số và tính số chỗ hàng thứ 8.
   - **Đáp án:** u_n = 4n + 8 (vì u1 = 12). u8 = 4·8 + 8 = 40 chỗ. Kiểm: 12; 16; 20; 24; 28; 32; 36; 40.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Thay sai vị trí n khi tính số hạng.
- Nhầm công thức truy hồi với công thức tổng quát.
- Quên tập xác định ℕ*.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
