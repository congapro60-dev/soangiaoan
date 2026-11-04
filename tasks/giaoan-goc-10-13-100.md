# KẾ HOẠCH DẠY HỌC — Biểu thức tọa độ và độ dài vectơ (Toán 10 · Tuần 13 · Tiết 100)

| Lớp | 10 | Tên bài học | Biểu thức tọa độ và độ dài vectơ | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-13-100.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Nắm vững công thức tọa độ của vectơ AB = (xB - xA; yB - yA) và độ dài |u| = √(x² + y²).
- **Should (Trọng tâm – Thông hiểu):** Tính đúng tọa độ trung điểm I của đoạn thẳng và tọa độ trọng tâm G của tam giác.
- **Could (Nâng cao – Vận dụng):** Tính khoảng cách giữa hai điểm trong mặt phẳng và ứng dụng kiểm tra tính chất tam giác.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Xác định khoảng cách di chuyển của tàu cứu hộ biển:**
- Tàu cứu hộ xuất phát từ trạm hải đăng $A(2; 3)$ đi cứu nạn tàu cá gặp sự cố tại vị trí $B(8; 11)$ (đơn vị: hải lý).
- Vectơ độ dời: $\vec{AB} = (x_B - x_A; y_B - y_A) = (8 - 2; 11 - 3) = (6; 8)$.
- Khoảng cách cứu hộ (độ dài đoạn thẳng $AB$):
  $$AB = |\vec{AB}| = \sqrt{6^2 + 8^2} = \sqrt{36 + 64} = \sqrt{100} = 10 \text{ hải lý}.$$
- Trạm tiếp tế nổi đặt tại trung điểm $I$ của hành trình:
  $$x_I = \dfrac{2 + 8}{2} = 5; \quad y_I = \dfrac{3 + 11}{2} = 7 \implies I(5; 7).$$

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Tàu đi từ A(2; 3) đến B(8; 11). Vectơ độ dời là AB = (6; 8).
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Quãng đường ngắn nhất từ trạm A đến vị trí B là bao nhiêu hải lý?*
  - (A) 10 hải lý
  - (B) 14 hải lý (6 + 8)
  - (C) 48 hải lý
  - **Correct: (A)** — Độ dài vectơ |AB| = √(6² + 8²) = √100 = 10 hải lý theo định lý Pythagore.
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao quãng đường không phải là 6 + 8 = 14?
  2. `[SO SÁNH]` Tọa độ trung điểm I của AB tính như thế nào?
- **TeacherCue (lớp yếu):** Vẽ tam giác vuông với hai cạnh góc vuông là độ lệch hoành độ (6) và độ lệch tung độ (8).
- **LookFor:** HS áp dụng đúng căn bậc hai của tổng bình phương.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Nắm vững công thức tọa độ của vectơ AB = (xB - xA; yB - yA) và độ dài |u| = √(x² + y²).
- **Should:** Tính đúng tọa độ trung điểm I của đoạn thẳng và tọa độ trọng tâm G của tam giác.
- **Could:** Tính khoảng cách giữa hai điểm trong mặt phẳng và ứng dụng kiểm tra tính chất tam giác.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Công thức tính độ dài vectơ u = (x; y) xuất phát từ định lý hình học nào quen thuộc?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Tọa độ vectơ qua 2 điểm: $\vec{AB} = (x_B - x_A; y_B - y_A)$ (ngọn trừ gốc).
- **Bước 2:** Độ dài vectơ: $|\vec u| = \sqrt{x^2 + y^2}$; Khoảng cách: $AB = \sqrt{(x_B - x_A)^2 + (y_B - y_A)^2}$.
- **Bước 3:** Tọa độ trung điểm: $x_I = \dfrac{x_A + x_B}{2}, y_I = \dfrac{y_A + y_B}{2}$.
- **Bước 4:** Tọa độ trọng tâm $\Delta ABC$: $x_G = \dfrac{x_A + x_B + x_C}{3}, y_G = \dfrac{y_A + y_B + y_C}{3}$.
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Khi nào khoảng cách AB = 0?
  2. `[PHÁT HIỆN]` Vectơ đơn vị có độ dài bằng bao nhiêu?
- **TeacherCue (lớp yếu):** Bảng đối chiếu 4 công thức tọa độ nền tảng.
- **Chốt:** Tọa độ điểm ngọn trừ tọa độ điểm gốc ra tọa độ vectơ; độ dài bằng căn tổng bình phương tọa độ.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Cho hai điểm A(2; 7) và B(6; 1). Tọa độ vectơ AB là AB = (2 - 6; 7 - 1) = (-4; 6)."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Cho A(1; 4) và B(5; 1). AI tính tọa độ vectơ AB = (1 - 5; 4 - 1) = (-4; 3).
  2. Bằng chứng: Tọa độ vectơ AB phải lấy tọa độ điểm ngọn B trừ tọa độ điểm gốc A. AI đã lấy ngược A trừ B.
  3. Sửa: Công thức chuẩn: AB = (xB - xA; yB - yA) = (5 - 1; 1 - 4) = (4; -3).
- **TeacherCue:** Nhắc khẩu quyết: \"Vectơ lấy Ngọn trừ Gốc, không lấy Gốc trừ Ngọn\".
- **LookFor:** HS chỉ ra sai thứ tự ngọn - gốc.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "áp dụng đúng thứ tự B trừ A; tính độ dài bằng căn(x² + y²)."
  - **S:** "nhớ chia 2 cho trung điểm và chia 3 cho trọng tâm tam giác."
  - **C:** "dùng công thức khoảng cách để chứng minh tam giác vuông cân hoặc tam giác đều."

- **Luồng M (Must) — hint: áp dụng đúng thứ tự B trừ A; tính độ dài bằng căn(x² + y²).**
1. Cho A(3; 5) và B(1; 2). Tìm tọa độ vectơ AB.
   - **Đáp án:** AB = (1 - 3; 2 - 5) = (-2; -3).
2. Tính độ dài của vectơ u = (6; -8).
   - **Đáp án:** |u| = √(6² + (-8)²) = √(36 + 64) = √100 = 10.

- **Luồng S (Should) — hint: nhớ chia 2 cho trung điểm và chia 3 cho trọng tâm tam giác.**
1. Cho hai điểm M(2; -3) và N(4; 5). Tìm tọa độ trung điểm I của MN.
   - **Đáp án:** xI = (2 + 4)/2 = 3; yI = (-3 + 5)/2 = 1. Vậy I(3; 1).
2. Tính khoảng cách giữa hai điểm P(1; 1) và Q(4; 5).
   - **Đáp án:** PQ = √[(4 - 1)² + (5 - 1)²] = √(3² + 4²) = 5.

- **Luồng C (Could) — hint: dùng công thức khoảng cách để chứng minh tam giác vuông cân hoặc tam giác đều.**
1. Cho A(1; 1), B(3; 2), C(m + 4; m). Tìm m để tam giác ABC vuông tại A.
   - **Đáp án:** AB = (2; 1), AC = (m + 3; m - 1). Tam giác vuông tại A <=> AB ⊥ AC <=> 2(m + 3) + 1(m - 1) = 0 <=> 3m + 5 = 0 <=> m = -5/3.
2. Cho A(-1; 2), B(3; 4), C(1; 6). Chứng minh tam giác ABC là tam giác cân tại B và tính diện tích.
   - **Đáp án:** BA = (-4; -2) -> BA² = 20. BC = (-2; 2) -> BC² = 8? AC = (2; 4) -> AC² = 20. Ta có BA² = AC² = 20 -> tam giác ABC cân tại A. BC = √8 = 2√2. Đường cao h = √(20 - 2) = 3√2. Diện tích S = (1/2) · 2√2 · 3√2 = 6.

- **LookFor:** HS M tính đúng AB; HS S tính đúng I, G; HS C chứng minh hình học.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho tam giác ABC có A(1; 2), B(3; 0), C(5; 4). Tìm tọa độ trọng tâm G của tam giác ABC. → $x_G = (1 + 3 + 5)/3 = 3$; $y_G = (2 + 0 + 4)/3 = 2$. Vậy $G(3; 2)$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - \"Tọa độ vectơ AB lấy A trừ B\" → **Sai — phải lấy B trừ A (ngọn trừ gốc)**
  - \"Độ dài vectơ u = (x; y) là √(x² + y²)\" → **Đúng**
  - \"Trọng tâm tam giác chia 3, trung điểm chia 2\" → **Đúng**
- **TeacherCue:** Đổi phiếu chấm chéo, kiểm tra chia 3 cho trọng tâm.

- **Câu 1:** Vectơ u = (-5; 0) có độ dài bằng bao nhiêu? → |u| = √((-5)² + 0²) = √25 = 5 (độ dài luôn không âm).
- **Câu 2:** Nếu A trùng B thì vectơ AB có tọa độ là gì? → Là (0; 0).
- **Chốt nhanh:** AB = B - A; |u| = √(x² + y²); Trung điểm chia 2; Trọng tâm chia 3.

- Bản đồ số phẳng UTM chuyển kinh vĩ độ thành tọa độ Descartes (x, y) đơn vị mét.
- Khoảng cách Euclidean giữa hai vị trí tính tức thì qua biểu thức √(Δx² + Δy²).
- Thuật toán tìm tài xế Grab/Be gần nhất quét bán kính khoảng cách theo công thức này.
- **TeacherCue:** Hỏi: \"Ứng dụng bản đồ trên điện thoại đo khoảng cách theo đường chim bay như thế nào?\"

- **Exit Ticket (4 mục):**
  1. Nêu công thức tọa độ vectơ AB và độ dài |AB|.
  2. Nêu 1 bẫy (lấy gốc trừ ngọn khi tìm tọa độ vectơ).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Cho u = (-3; 4), tính độ dài của u.
- **TeacherCue (lớp yếu):** Nhìn lại tọa độ trạm hải đăng và tàu cá.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Cho A(3; 5) và B(1; 2). Tìm tọa độ vectơ AB.
   - **Đáp án:** AB = (1 - 3; 2 - 5) = (-2; -3).
2. `[NB]` Tính độ dài của vectơ u = (6; -8).
   - **Đáp án:** |u| = √(6² + (-8)²) = √(36 + 64) = √100 = 10.
3. `[TH]` Cho hai điểm M(2; -3) và N(4; 5). Tìm tọa độ trung điểm I của MN.
   - **Đáp án:** xI = (2 + 4)/2 = 3; yI = (-3 + 5)/2 = 1. Vậy I(3; 1).
4. `[TH]` Tính khoảng cách giữa hai điểm P(1; 1) và Q(4; 5).
   - **Đáp án:** PQ = √[(4 - 1)² + (5 - 1)²] = √(3² + 4²) = 5.
5. `[VD]` Cho A(1; 1), B(3; 2), C(m + 4; m). Tìm m để tam giác ABC vuông tại A.
   - **Đáp án:** AB = (2; 1), AC = (m + 3; m - 1). Tam giác vuông tại A <=> AB ⊥ AC <=> 2(m + 3) + 1(m - 1) = 0 <=> 3m + 5 = 0 <=> m = -5/3.
6. `[VD]` Cho A(-1; 2), B(3; 4), C(1; 6). Chứng minh tam giác ABC là tam giác cân tại B và tính diện tích.
   - **Đáp án:** BA = (-4; -2) -> BA² = 20. BC = (-2; 2) -> BC² = 8? AC = (2; 4) -> AC² = 20. Ta có BA² = AC² = 20 -> tam giác ABC cân tại A. BC = √8 = 2√2. Đường cao h = √(20 - 2) = 3√2. Diện tích S = (1/2) · 2√2 · 3√2 = 6.

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Lấy gốc trừ ngọn khi tính tọa độ vectơ AB.
- Quên dấu ngoặc vuông khi bình phương số âm dẫn đến tính sai căn bậc hai.
- Nhầm công thức trung điểm (cộng chia 2) thành trừ.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
