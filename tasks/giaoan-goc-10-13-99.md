# KẾ HOẠCH DẠY HỌC — Tọa độ của vectơ và các phép toán (Toán 10 · Tuần 13 · Tiết 99)

| Lớp | 10 | Tên bài học | Tọa độ của vectơ và các phép toán | Môn học | Toán |
|---|---|---|---|---|---|
| Giáo viên | .......... | Tuần học | 13 | Năm học | 2025–2026 |

> **Chuẩn V8.8 Master Teacher:** trục dữ liệu thực nghiệm xuyên suốt, câu hỏi phân tầng có hint, teacherCue cho lớp yếu, AI Error trong ngữ cảnh, Exit Ticket cô đọng.
> Soạn lại 2026-11-04 · khớp Gate D `tasks/gate-d-10-13-99.md`.

---

## I. MỤC TIÊU BÀI HỌC

### 1. Mục tiêu học tập phân hoá (M / S / C)
- **Must (Cơ bản – Nhận biết):** Hiểu định nghĩa tọa độ của vectơ đối với hệ trục Oxy qua hai vectơ đơn vị i và j.
- **Should (Trọng tâm – Thông hiểu):** Thực hiện thành thạo các phép toán cộng, trừ vectơ, nhân vectơ với số theo tọa độ.
- **Could (Nâng cao – Vận dụng):** Xác định điều kiện hai vectơ cùng phương theo tọa độ; tìm tọa độ điểm thỏa mãn điều kiện hình học.

### 2. Năng lực & phẩm chất
- Tư duy và lập luận toán học; giải quyết vấn đề toán học; giao tiếp toán học; mô hình hóa toán học.
- Trung thực khi kiểm chứng số liệu, hợp tác khi thảo luận nhóm, cẩn thận khi trình bày.

---

## II. TRỤC DỮ LIỆU THỰC NGHIỆM XUYÊN SUỐT

**Màn hình hiển thị radar kiểm soát không lưu sân bay Nội Bài:**
- Gốc tọa độ $O(0; 0)$ tại đài kiểm soát không lưu; trục $Ox$ hướng Đông, $Oy$ hướng Bắc.
- Vectơ đơn vị $\vec i = (1; 0)$ (1 km về hướng Đông), $\vec j = (0; 1)$ (1 km về hướng Bắc).
- Một máy bay đang ở vị trí có vectơ vị trí:
  $$\vec u = 30\vec i + 40\vec j \implies \vec u = (30; 40).$$
- Máy bay bay thêm một vectơ dịch chuyển $\vec v = -10\vec i + 20\vec j = (-10; 20)$.
- Vị trí mới của máy bay:
  $$\vec w = \vec u + \vec v = (30 - 10)\vec i + (40 + 20)\vec j = 20\vec i + 60\vec j = (20; 60).$$
- **Quy tắc đại số hóa:** Cộng trừ vectơ bằng cách cộng trừ các tọa độ tương ứng: $(x_1 \pm x_2; y_1 \pm y_2)$.

---

## III. THIẾT BỊ VÀ HỌC LIỆU
- Máy chiếu/TV thông minh trình chiếu bài giảng tương tác V8.8.
- Thiết bị cá nhân của học sinh kết nối SmartPlan AI Live.
- Phiếu học tập phân hoá 3 luồng (Mã M, S, C) kèm hint.
- Bảng con dùng kiểm tra nhanh và đánh giá thường xuyên.

---

## IV. TIẾN TRÌNH DẠY HỌC (40 PHÚT)

### 1. Hoạt động 1 — Khởi động & đặt vấn đề
- **Tình huống:** Máy bay ban đầu ở u = (30; 40), dịch chuyển theo v = (-10; 20).
- **Câu hỏi tương tác (máy HS) — có 3 lựa chọn:**
  - *Tọa độ vị trí mới w = u + v của máy bay là bao nhiêu?*
  - (A) w = (20; 60)
  - (B) w = (40; 60)
  - (C) w = (20; 20)
  - **Correct: (A)** — Cộng hoành độ với hoành độ (30 - 10 = 20), tung độ với tung độ (40 + 20 = 60).
- **Câu hỏi thảo luận tiếp:**
  1. `[PHÁT HIỆN]` Vì sao tọa độ của vectơ giúp tính toán dễ hơn dựng hình học?
  2. `[SO SÁNH]` Tọa độ của vectơ đối -u là gì?
- **TeacherCue (lớp yếu):** Vẽ hệ trục tọa độ Oxy, biểu diễn u, v và vectơ tổng w.
- **LookFor:** HS cộng từng tọa độ tương ứng.

### 2. Hoạt động 2 — Xác định mục tiêu M/S/C
- **Must:** Hiểu định nghĩa tọa độ của vectơ đối với hệ trục Oxy qua hai vectơ đơn vị i và j.
- **Should:** Thực hiện thành thạo các phép toán cộng, trừ vectơ, nhân vectơ với số theo tọa độ.
- **Could:** Xác định điều kiện hai vectơ cùng phương theo tọa độ; tìm tọa độ điểm thỏa mãn điều kiện hình học.
- **Student:** chọn mức cam kết trên máy (chỉ để GV điều nhịp, không xếp loại).
- **Câu hỏi trọng tâm treo suốt tiết:** "Vectơ u = x·i + y·j có tọa độ là gì? Khi hai vectơ bằng nhau thì tọa độ của chúng quan hệ thế nào?"

### 3. Hoạt động 3 — Hình thành kiến thức
- **Bước 1:** Định nghĩa: $\vec u = (x; y) \iff \vec u = x\vec i + y\vec j$.
- **Bước 2:** Cộng, trừ: $\vec u \pm \vec v = (x_1 \pm x_2; y_1 \pm y_2)$.
- **Bước 3:** Nhân với số: $k\vec u = (kx; ky)$.
- **Bước 4:** Hai vectơ cùng phương: $\vec u$ cùng phương $\vec v \iff \exists k: x_1 = kx_2$ và $y_1 = ky_2$ (hoặc $x_1 y_2 - x_2 y_1 = 0$).
- **Câu hỏi dẫn (máy HS):**
  1. `[SUY LUẬN]` Khi nào hai vectơ bằng nhau theo tọa độ?
  2. `[PHÁT HIỆN]` Vectơ 0 có tọa độ là gì?
- **TeacherCue (lớp yếu):** Bảng đối chiếu giữa phép toán hình học và phép toán tọa độ.
- **Chốt:** Tọa độ hóa biến các bài toán dựng hình phức tạp thành các phép cộng trừ nhân chia số học đơn giản.

### 4. Hoạt động 4 — Phát hiện lỗi sai AI (AI Error of the Week)
- **Lời giải AI (chiếu màn hình):** "AI viết: Cho vectơ u = 4j - 3i. Do đó tọa độ của vectơ u là u = (4; -3)."
- **Nhiệm vụ HS:**
  1. Bắt lỗi: AI giải: Cho u = (2; 3) và v = (4; -1). AI tính tích vô hướng bằng cách nhân từng tọa độ: u · v = (2·4; 3·(-1)) = (8; -3).
  2. Bằng chứng: Tích hai vectơ không phải là một vectơ mà là một số (tích vô hướng) hoặc ở bài này là chưa học tích vô hướng. Phép toán giữa hai vectơ không có phép "nhân cặp tọa độ" ra một cặp tọa độ mới.
  3. Sửa: Phép toán tọa độ cơ bản chỉ có cộng u + v = (6; 2), trừ u - v = (-2; 4) và nhân với số k·u = (2k; 3k). Không có phép nhân tọa độ ra tọa độ (8; -3).
- **TeacherCue:** Nhắc lại: chỉ có nhân vectơ với một SỐ THỰC, không có nhân hai tọa độ.
- **LookFor:** HS chỉ ra sai lầm nhân hai cặp tọa độ.

### 5. Hoạt động 5 — Luyện tập phân hoá 3 luồng kèm hint
- GV hướng dẫn HS chọn phiếu M / S / C trên thiết bị và đọc kỹ hint trước khi làm.
- **Hint từng luồng (không lộ đáp án):**
  - **M:** "áp dụng công thức hoành cộng hoành, tung cộng tung; nhân số k vào cả x và y."
  - **S:** "dùng điều kiện cùng phương: x1/x2 = y1/y2 (với mẫu khác 0)."
  - **C:** "thiết lập hệ phương trình hai ẩn để tìm tọa độ điểm hoặc phân tích vectơ."

- **Luồng M (Must) — hint: áp dụng công thức hoành cộng hoành, tung cộng tung; nhân số k vào cả x và y.**
1. Biết u = 3i - 4j. Tìm tọa độ của vectơ u.
   - **Đáp án:** u = (3; -4).
2. Cho a = (1; 2) và b = (3; -1). Tính tọa độ của a + b.
   - **Đáp án:** a + b = (1 + 3; 2 + (-1)) = (4; 1).

- **Luồng S (Should) — hint: dùng điều kiện cùng phương: x1/x2 = y1/y2 (với mẫu khác 0).**
1. Cho u = (2; -5). Tìm tọa độ của vectơ -3u.
   - **Đáp án:** -3u = (-3·2; -3·(-5)) = (-6; 15).
2. Hai vectơ a = (x; 4) và b = (3; 6) cùng phương khi x bằng bao nhiêu?
   - **Đáp án:** x/3 = 4/6 = 2/3 <=> x = 2.

- **Luồng C (Could) — hint: thiết lập hệ phương trình hai ẩn để tìm tọa độ điểm hoặc phân tích vectơ.**
1. Cho 3 vectơ a = (1; 2), b = (-3; 1), c = (5; 4). Phân tích vectơ c theo a và b: c = ma + nb.
   - **Đáp án:** Ta có hệ: m - 3n = 5 và 2m + n = 4. Giải hệ: từ pt2 có n = 4 - 2m thay vào pt1: m - 3(4 - 2m) = 5 <=> 7m = 17 <=> m = 17/7; n = -6/7. Vậy c = (17/7)a - (6/7)b.
2. Cho A(1; 2), B(3; 5), C(-1; 4). Tìm tọa độ điểm D sao cho ABCD là hình bình hành.
   - **Đáp án:** ABCD là HBH <=> AB = DC. AB = (3-1; 5-2) = (2; 3). Gọi D(xD; yD) -> DC = (-1 - xD; 4 - yD). Do đó: -1 - xD = 2 => xD = -3; 4 - yD = 3 => yD = 1. Vậy D(-3; 1).

- **LookFor:** HS M tính đúng cộng trừ; HS S kiểm tra cùng phương; HS C giải được hệ.

### 6. Hoạt động 6 — Đánh giá thường xuyên & chốt bài
- **ĐGTX (máy HS):** Cho $\vec a = (1; -2)$ và $\vec b = (3; 4)$. Tìm tọa độ của vectơ $\vec u = 2\vec a - \vec b$. → $2\vec a = (2; -4) \implies \vec u = (2 - 3; -4 - 4) = (-1; -8)$.
- **Câu hỏi bảng con (Đúng/Sai):**
  - "Vectơ u = (x; y) tương đương u = x·i + y·j" → **Đúng**
  - "Hai vectơ bằng nhau khi và chỉ khi hoành độ bằng nhau và tung độ bằng nhau" → **Đúng**
  - "k·(x; y) = (kx; y)" → **Sai — phải nhân k vào cả tung độ: (kx; ky)**
- **TeacherCue:** Đổi phiếu chấm chéo, kiểm tra kỹ dấu trừ: -4 - 4 = -8.

- **Câu 1:** Vectơ có tọa độ (0; 0) là vectơ gì? → Là vectơ không (vectơ 0).
- **Câu 2:** Nếu u = (1; 2) thì 0·u có tọa độ là bao nhiêu? → Bằng (0; 0).
- **Chốt nhanh:** u = (x; y) <=> u = xi + yj; cộng trừ theo từng tọa độ; nhân k vào cả x và y; x1/x2 = y1/y2 -> cùng phương.

- Mọi nhân vật trong game 2D di chuyển bằng cách cập nhật vectơ vị trí: `pos += vel * dt`.
- Vận tốc `vel` là vectơ 2D (vx, vy), phép cộng vectơ điều khiển mượt mà đường đi.
- Khái niệm vectơ tọa độ là nền tảng của mọi thư viện đồ họa máy tính.
- **TeacherCue:** Hỏi: "Khi nhấn phím mũi tên chéo (vừa lên vừa phải), nhân vật game di chuyển theo vectơ nào?"

- **Exit Ticket (4 mục):**
  1. Nêu định nghĩa tọa độ của vectơ u đối với hệ trục Oxy.
  2. Nêu 1 bẫy (chỉ nhân k vào hoành độ mà quên nhân vào tung độ).
  3. Tự đánh giá M / S / C.
  4. **Chốt ngữ cảnh:** Tìm tọa độ của vectơ u = 5j - 2i.
- **TeacherCue (lớp yếu):** Nhìn lại vị trí radar máy bay mở đầu.

---

## V. HỆ THỐNG BÀI TẬP PHÂN HOÁ (M / S / C)

1. `[NB]` Biết u = 3i - 4j. Tìm tọa độ của vectơ u.
   - **Đáp án:** u = (3; -4).
2. `[NB]` Cho a = (1; 2) và b = (3; -1). Tính tọa độ của a + b.
   - **Đáp án:** a + b = (1 + 3; 2 + (-1)) = (4; 1).
3. `[TH]` Cho u = (2; -5). Tìm tọa độ của vectơ -3u.
   - **Đáp án:** -3u = (-3·2; -3·(-5)) = (-6; 15).
4. `[TH]` Hai vectơ a = (x; 4) và b = (3; 6) cùng phương khi x bằng bao nhiêu?
   - **Đáp án:** x/3 = 4/6 = 2/3 <=> x = 2.
5. `[VD]` Cho 3 vectơ a = (1; 2), b = (-3; 1), c = (5; 4). Phân tích vectơ c theo a và b: c = ma + nb.
   - **Đáp án:** Ta có hệ: m - 3n = 5 và 2m + n = 4. Giải hệ: từ pt2 có n = 4 - 2m thay vào pt1: m - 3(4 - 2m) = 5 <=> 7m = 17 <=> m = 17/7; n = -6/7. Vậy c = (17/7)a - (6/7)b.
6. `[VD]` Cho A(1; 2), B(3; 5), C(-1; 4). Tìm tọa độ điểm D sao cho ABCD là hình bình hành.
   - **Đáp án:** ABCD là HBH <=> AB = DC. AB = (3-1; 5-2) = (2; 3). Gọi D(xD; yD) -> DC = (-1 - xD; 4 - yD). Do đó: -1 - xD = 2 => xD = -3; 4 - yD = 3 => yD = 1. Vậy D(-3; 1).

---

## VI. LỖI THƯỜNG GẶP & CÁCH XỬ LÝ

- Ghi nhầm thứ tự i và j: viết u = 3j - 2i thành u = (3; -2) thay vì (-2; 3).
- Chỉ nhân hệ số k vào hoành độ mà quên nhân vào tung độ.
- Lấy tọa độ điểm trừ nhầm: tính AB bằng A trừ B thay vì B trừ A.

---

## VII. KIỂM NHANH TRƯỚC KHI NỘP

- [ ] Câu hỏi tương tác S1 có 3 lựa chọn và đáp án đúng duy nhất.
- [ ] Mỗi luồng M/S/C có hint riêng, không lộ đáp án.
- [ ] TeacherCue xuất hiện ở S1, S3, S4, S10.
- [ ] Số liệu trong bài đã kiểm chứng tay (xem mục II).
- [ ] Exit Ticket 4 mục, chốt lại ngữ cảnh thực nghiệm.
