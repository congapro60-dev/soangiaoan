# KẾ HOẠCH DẠY HỌC — Biểu thức tọa độ của tích vô hướng (Toán 12 · Tuần 6 · Tiết 39)

| Lớp | 12 | Tên bài học | Biểu thức tọa độ của tích vô hướng | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 6 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-12-6-39.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Tính tích vô hướng theo tọa độ và nhận biết điều kiện vuông góc.
- **Should (Trọng tâm – Thông hiểu):** Tính góc giữa hai vectơ qua cosin và xử lý bài toán tìm tham số vuông góc.
- **Could (Nâng cao – Vận dụng):** Mô hình hóa kiểm tra vuông góc trong không gian thực tế; phản biện kết luận góc.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Tình huống: Hai hướng vận chuyển trong kho: $\vec a = (1; 2; 3)$ và $\vec b = (2; -1; 1)$.**

- **Tích vô hướng:** $\vec a \cdot \vec b = 1\cdot2 + 2\cdot(-1) + 3\cdot1 = 2 - 2 + 3 = 3$.
- **Độ dài:** $|\vec a| = \sqrt{1+4+9} = \sqrt{14}$; $|\vec b| = \sqrt{4+1+1} = \sqrt6$.
- **Góc:** $\cos(\vec a, \vec b) = \dfrac{3}{\sqrt{14}\cdot\sqrt6} = \dfrac{3}{2\sqrt{21}} = \dfrac{\sqrt{21}}{14} \approx 0{,}327$ → góc $\approx 70{,}9^\circ$.
- **Kiểm chứng tay:** $\sqrt{14} \approx 3{,}742$; $\sqrt6 \approx 2{,}449$; tích $\approx 9{,}165$; $3/9{,}165 \approx 0{,}327$ ✓.
- **Vuông góc khi nào:** $\vec a \cdot \vec b = 0$. Ví dụ $\vec b' = (2; 1; m)$ vuông góc $\vec a$ khi $2 + 2 + 3m = 0 \Leftrightarrow m = -\tfrac43$.

**Bẫy của bài:** quên cộng cả ba tích; nhầm tích vô hướng với tích độ dài; kết luận vuông góc khi tích gần 0.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** a = (1;2;3), b = (2;−1;1). Cần biết góc giữa hai hướng.
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *$\vec a \cdot \vec b$ bằng bao nhiêu?*
  - (A) 3
  - (B) 6
  - (C) −3
  - **Correct: (A)** — 1·2 + 2·(−1) + 3·1 = 2 − 2 + 3 = 3.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Hai hướng có vuông góc không?
  2. `[SO SÁNH]` Nếu tích bằng 0 thì góc bằng bao nhiêu?
- **TeacherCue (lớp yếu):** Viết công thức tổng quát a·b = a₁b₁ + a₂b₂ + a₃b₃ rồi thay số.
- **LookFor:** HS cộng đủ ba số hạng.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Tính tích vô hướng theo tọa độ và nhận biết điều kiện vuông góc.
- **Should:** Tính góc giữa hai vectơ qua cosin và xử lý bài toán tìm tham số vuông góc.
- **Could:** Mô hình hóa kiểm tra vuông góc trong không gian thực tế; phản biện kết luận góc.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vì sao một con số (tích vô hướng) lại cho biết góc giữa hai vectơ?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Tích vô hướng theo tọa độ: $\vec a\cdot\vec b = a_1b_1 + a_2b_2 + a_3b_3$.
- **Bước 2:** Độ dài: $|\vec a| = \sqrt{\vec a\cdot\vec a}$.
- **Bước 3:** Góc: $\cos\alpha = \dfrac{\vec a\cdot\vec b}{|\vec a||\vec b|}$; vuông góc ⇔ $\vec a\cdot\vec b = 0$.
- **Bước 4:** Kiểm: nếu $\vec a\cdot\vec b > 0$ thì góc nhọn; $< 0$ thì góc tù.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Vì sao tích vô hướng dương cho góc nhọn?
  2. `[PHÁT HIỆN]` Với b′ = (2;1;m), m bằng bao nhiêu để vuông góc?
- **TeacherCue (lớp yếu):** Khung 4 công thức; nhắc: "vuông góc ⇔ tích = 0".
- **Chốt:** Tích vô hướng mã hóa góc: dấu cho biết nhọn/tù, độ lớn cho biết mức độ.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI tính: "a·b = 1·2 + 2·1 + 3·1 = 7 với a = (1; 2; 3), b = (2; −1; 1). Suy ra góc giữa hai vectơ là góc nhọn lớn (khoảng 40°).""
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI tính $\vec a\cdot\vec b = 1\cdot2 + 2\cdot1 + 3\cdot1 = 7$ (dùng b₂ = 1 thay vì −1).
  2. Bằng chứng: b₂ = −1 nên tích là 2 − 2 + 3 = 3, không phải 7.
  3. Sửa: Đọc lại tọa độ và thay đúng dấu.
- **TeacherCue:** Cho HS viết lại tọa độ b theo hàng trước khi nhân.
- **LookFor:** HS kiểm dấu từng tọa độ.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "viết ba số hạng rồi cộng."
  - **S:** "tính cos và kiểm dấu để xác định góc nhọn/tù."
  - **C:** "giải bài tham số vuông góc."

- **Luồng M (Must) — hint: viết ba số hạng rồi cộng.**
1. Nêu công thức tích vô hướng theo tọa độ.
   - **Đáp án:** a·b = a₁b₁ + a₂b₂ + a₃b₃.
2. Khi nào hai vectơ vuông góc?
   - **Đáp án:** Khi tích vô hướng của chúng bằng 0.

- **Luồng S (Should) — hint: tính cos và kiểm dấu để xác định góc nhọn/tù.**
1. Tính a·b với a = (1; 2; 3), b = (2; −1; 1).
   - **Đáp án:** 2 − 2 + 3 = 3.
2. Tính cos góc giữa a = (1;2;3) và b = (2;−1;1).
   - **Đáp án:** cos α = 3/(√14·√6) = √21/14 ≈ 0,327.

- **Luồng C (Could) — hint: giải bài tham số vuông góc.**
1. Tìm m để (1; 2; 3) vuông góc với (2; m; 1).
   - **Đáp án:** 2 + 2m + 3 = 0 ⇒ m = −5/2.
2. Cho a = (1; 1; 0), b = (1; 0; 1). Tính góc giữa hai vectơ.
   - **Đáp án:** a·b = 1; |a| = |b| = √2 ⇒ cos α = 1/2 ⇒ α = 60°.

- **LookFor:** HS M đúng tích; HS S đúng góc; HS C tìm đúng m.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho $\vec a = (1; 2; 3)$, $\vec b = (2; 1; m)$. Tìm $m$ để $\vec a \perp \vec b$. → $\vec a\cdot\vec b = 2 + 2 + 3m = 0 \Leftrightarrow m = -\tfrac43$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "a·b = a₁b₁ + a₂b₂ + a₃b₃" → **Đúng**
  - "Vuông góc ⇔ tích vô hướng bằng 0" → **Đúng**
  - "Tích vô hướng âm ⇒ góc nhọn" → **Sai — góc tù**
- **TeacherCue:** Chấm chéo theo ba công thức.

- **Câu 1:** Vì sao góc nhọn cho tích vô hướng dương? → Vì a·b = |a||b|cos α và cos α > 0 khi α < 90°.
- **Câu 2:** Tích vô hướng bằng 0 nghĩa là gì về hình học? → Hai vectơ vuông góc (hoặc một vectơ bằng 0).
- **Chốt nhanh:** Tích theo tọa độ — độ dài — cos — vuông góc khi tích bằng 0.

- Hai hướng a và b lệch nhau khoảng 70,9° — không vuông góc, cần điều chỉnh giá kệ.
- Muốn vuông góc, chọn b′ = (2;1;−4/3) — kiểm tích bằng 0.
- Dùng tích vô hướng để kiểm nhanh thay vì đo góc trực tiếp.
- **TeacherCue:** Hỏi: "Nếu tích vô hướng rất nhỏ nhưng khác 0 thì sao?" → góc gần 90° nhưng chưa vuông.

- **Exit Ticket (4 mục):**
  1. Nêu công thức tích vô hướng và cos góc.
  2. Nêu 1 bẫy (bỏ sót tọa độ; nhầm dấu).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Cho a = (1;2;3), b = (2;−1;1): tính a·b và cos góc.
- **TeacherCue (lớp yếu):** Mở lại ba công thức ở S3.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Nêu công thức tích vô hướng theo tọa độ.
   - **Đáp án:** a·b = a₁b₁ + a₂b₂ + a₃b₃.
2. `[NB]` Khi nào hai vectơ vuông góc?
   - **Đáp án:** Khi tích vô hướng của chúng bằng 0.
3. `[TH]` Tính a·b với a = (1; 2; 3), b = (2; −1; 1).
   - **Đáp án:** 2 − 2 + 3 = 3.
4. `[TH]` Tính cos góc giữa a = (1;2;3) và b = (2;−1;1).
   - **Đáp án:** cos α = 3/(√14·√6) = √21/14 ≈ 0,327.
5. `[VD]` Tìm m để (1; 2; 3) vuông góc với (2; m; 1).
   - **Đáp án:** 2 + 2m + 3 = 0 ⇒ m = −5/2.
6. `[VD]` Cho a = (1; 1; 0), b = (1; 0; 1). Tính góc giữa hai vectơ.
   - **Đáp án:** a·b = 1; |a| = |b| = √2 ⇒ cos α = 1/2 ⇒ α = 60°.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Bỏ sót một tọa độ khi tính tổng.
- Nhầm dấu tọa độ âm.
- Kết luận vuông góc khi tích chỉ nhỏ nhưng khác 0.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
