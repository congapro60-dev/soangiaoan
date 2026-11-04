# KẾ HOẠCH DẠY HỌC — Biểu thức tọa độ và phép toán vectơ (Toán 12 · Tuần 5 · Tiết 31)

| Lớp | 12 | Tên bài học | Biểu thức tọa độ và phép toán vectơ | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 5 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-5-31.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Thực hiện cộng, trừ, nhân vô hướng vectơ và tính độ dài.
- **Should (Trọng tâm – Thông hiểu):** Tính biểu thức tổ hợp (ví dụ $2\vec a - \vec b$) và vectơ đơn vị.
- **Could (Nâng cao – Vận dụng):** Tìm vectơ $\vec x$ thỏa phương trình vectơ; mô hình hóa dịch chuyển trong kho.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Hai vectơ dịch chuyển trong kho: $\vec a = (1; -2; 3)$ và $\vec b = (2; 1; -1)$.**

| Phép toán | Kết quả |
|---|---|
| $\vec a + \vec b$ | $(3; -1; 2)$ |
| $\vec a - \vec b$ | $(-1; -3; 4)$ |
| $2\vec a$ | $(2; -4; 6)$ |
| $2\vec a - \vec b$ | $(0; -5; 7)$ |
| $\lvert\vec a\rvert$ | $\sqrt{1+4+9} = \sqrt{14} \approx 3{,}74$ |
| $\lvert\vec b\rvert$ | $\sqrt{4+1+1} = \sqrt6 \approx 2{,}45$ |

- **Kiểm chứng tay:** $\vec a + \vec b = (1+2; -2+1; 3-1) = (3; -1; 2)$ ✓; $2\vec a - \vec b = (2; -4; 6) - (2; 1, -1) = (0; -5; 7)$ ✓.
- **Vectơ đơn vị của $\vec a$:** $\dfrac{1}{\sqrt{14}}(1; -2; 3) \approx (0{,}27; -0{,}53; 0{,}80)$.

**Bẫy của bài:** trừ sai dấu; nhân vô hướng vào chỉ một tọa độ; tính độ dài quên bình phương.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** a = (1; −2; 3), b = (2; 1; −1). Cần tính tổng và hiệu.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *$\vec a + \vec b$ bằng bao nhiêu?*
  - (A) (3; −1; 2)
  - (B) (−1; −3; 4)
  - (C) (2; −2; −3)
  - **Correct: (A)** — Cộng theo từng tọa độ: (1+2; −2+1; 3+(−1)) = (3; −1; 2).
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` $\vec a - \vec b$ bằng bao nhiêu?
  2. `[SO SÁNH]` Độ dài của a và b khác nhau thế nào?
- **TeacherCue (lớp yếu):** Nhấn: mỗi phép toán làm độc lập trên ba tọa độ, không trộn lẫn.
- **LookFor:** HS cộng/trừ đúng theo từng thành phần.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Thực hiện cộng, trừ, nhân vô hướng vectơ và tính độ dài.
- **Should:** Tính biểu thức tổ hợp (ví dụ $2\vec a - \vec b$) và vectơ đơn vị.
- **Could:** Tìm vectơ $\vec x$ thỏa phương trình vectơ; mô hình hóa dịch chuyển trong kho.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao mọi phép toán vectơ đều thực hiện được theo từng tọa độ độc lập?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Cộng/trừ: $(a_1 \pm b_1; a_2 \pm b_2; a_3 \pm b_3)$.
- **Bước 2:** Nhân vô hướng: $k\vec a = (ka_1; ka_2; ka_3)$ — nhân vào cả ba tọa độ.
- **Bước 3:** Độ dài: $|\vec a| = \sqrt{a_1^2 + a_2^2 + a_3^2}$.
- **Bước 4:** Vectơ đơn vị: $\dfrac{\vec a}{|\vec a|}$ — cùng hướng, độ dài 1.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao vectơ đơn vị có độ dài 1?
  2. `[PHÁT HIỆN]` $3\vec a - 2\vec b$ bằng bao nhiêu?
- **TeacherCue (lớp yếu):** Khung 4 phép toán; HS ghi công thức kèm ví dụ số.
- **Chốt:** Vectơ tính theo từng tọa độ; độ dài là căn tổng bình phương.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI tính: "2a − b với a = (1; −2; 3), b = (2; 1; −1): 2a = (2; −4; 6); trừ b được (2 − 2; −4 − 1; 6 − 1) = (0; −5; 5).""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI tính $2\vec a - \vec b = (2; -4; 6) - (2; 1; -1) = (0; -3; 5)$.
  2. Bằng chứng: Sai ở tọa độ thứ hai và thứ ba: $-4 - 1 = -5$; $6 - (-1) = 7$. Kết quả đúng $(0; -5; 7)$.
  3. Sửa: Trừ đúng dấu từng tọa độ.
- **TeacherCue:** Cho HS viết phép trừ thành cộng số đối để tránh sai dấu.
- **LookFor:** HS kiểm lại từng tọa độ riêng.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "làm từng tọa độ một, viết dọc để tránh lẫn."
  - **S:** "kiểm bằng cách thay lại: (2a − b) + b phải bằng 2a."
  - **C:** "giải phương trình vectơ tìm x."

- **Luồng M (Must) — hint: làm từng tọa độ một, viết dọc để tránh lẫn.**
1. Nêu công thức cộng hai vectơ theo tọa độ.
   - **Đáp án:** a + b = (a₁ + b₁; a₂ + b₂; a₃ + b₃).
2. Nêu công thức độ dài vectơ a = (a₁; a₂; a₃).
   - **Đáp án:** |a| = √(a₁² + a₂² + a₃²).

- **Luồng S (Should) — hint: kiểm bằng cách thay lại: (2a − b) + b phải bằng 2a.**
1. Cho a = (1; −2; 3), b = (2; 1; −1). Tính a + b và a − b.
   - **Đáp án:** a + b = (3; −1; 2); a − b = (−1; −3; 4).
2. Tính |a| với a = (1; −2; 3).
   - **Đáp án:** √14 ≈ 3,74.

- **Luồng C (Could) — hint: giải phương trình vectơ tìm x.**
1. Tìm x biết a + x = b với a = (1; −2; 3), b = (2; 1; −1).
   - **Đáp án:** x = b − a = (1; 3; −4).
2. Tìm vectơ đơn vị cùng hướng với a = (1; −2; 3).
   - **Đáp án:** a/|a| = (1; −2; 3)/√14 ≈ (0,27; −0,53; 0,80).

- **LookFor:** HS M đúng phép tính; HS S có phép kiểm; HS C giải được phương trình.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho $\vec a = (1; -2; 3)$, $\vec b = (2; 1; -1)$. Tìm $\vec x$ sao cho $\vec a + \vec x = \vec b$. → $\vec x = \vec b - \vec a = (2-1; 1-(-2); -1-3) = (1; 3; -4)$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "2a nhân 2 vào tọa độ đầu" → **Sai — nhân cả ba**
  - "|a| = √14" → **Đúng**
  - "a − b = (−1; −3; 4)" → **Đúng**
- **TeacherCue:** Chấm chéo, kiểm bằng phép thay ngược.

- **Câu 1:** Vì sao nhân vô hướng phải nhân cả ba tọa độ? → Vì vectơ có ba thành phần; nhân chỉ một thành phần sẽ đổi hướng vectơ, không còn là phép nhân vô hướng.
- **Câu 2:** Vectơ đơn vị có độ dài bao nhiêu? → Bằng 1, vì chia vectơ cho độ dài của chính nó.
- **Chốt nhanh:** Từng tọa độ — đúng dấu — kiểm ngược.

- Dịch chuyển từ kệ A tới kệ B: vectơ AB = B − A.
- Độ dài vectơ = quãng đường thẳng giữa hai kệ.
- Vectơ đơn vị cho biết hướng đi — dùng cho robot vận chuyển.
- **TeacherCue:** Hỏi: "Nếu robot đi theo vectơ đơn vị nhân 0,5 m mỗi bước thì cần bao nhiêu bước?"

- **Exit Ticket (4 mục):**
  1. Nêu công thức cộng, trừ, nhân vô hướng vectơ.
  2. Nêu 1 bẫy (sai dấu; nhân một tọa độ).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Cho a = (1;−2;3), b = (2;1;−1): tính a + b và |a|.
- **TeacherCue (lớp yếu):** Mở lại bảng phép toán ở mục II.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu công thức cộng hai vectơ theo tọa độ.
   - **Đáp án:** a + b = (a₁ + b₁; a₂ + b₂; a₃ + b₃).
2. `[NB]` Nêu công thức độ dài vectơ a = (a₁; a₂; a₃).
   - **Đáp án:** |a| = √(a₁² + a₂² + a₃²).
3. `[TH]` Cho a = (1; −2; 3), b = (2; 1; −1). Tính a + b và a − b.
   - **Đáp án:** a + b = (3; −1; 2); a − b = (−1; −3; 4).
4. `[TH]` Tính |a| với a = (1; −2; 3).
   - **Đáp án:** √14 ≈ 3,74.
5. `[VD]` Tìm x biết a + x = b với a = (1; −2; 3), b = (2; 1; −1).
   - **Đáp án:** x = b − a = (1; 3; −4).
6. `[VD]` Tìm vectơ đơn vị cùng hướng với a = (1; −2; 3).
   - **Đáp án:** a/|a| = (1; −2; 3)/√14 ≈ (0,27; −0,53; 0,80).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Trừ sai dấu tọa độ.
- Nhân vô hướng chỉ vào một tọa độ.
- Tính độ dài mà quên bình phương.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
